// Spaced-repetition review tasks.
//
// A topic gets a per-topic schedule: an anchor day plus a cycle of intervals
// (default 1, 7, 30, 90 days — editable per topic). Creating a schedule
// materialises the whole task chain up front so the calendar can show future
// load. A task is completed BY THE SYSTEM only: after training in all four
// modes at ≤ 10% mistakes each while the task is active (due that day).
// The anchor trains the FULL topic; review stages default to the top-40%
// most-mistaken subset (see reviewTraining.ts) — subset runs carry the
// `review-task` source and never complete an anchor. Training the full topic
// instead is always allowed and also completes review stages. Users may
// toggle new ↔ skipped, never done.
//
// Daily upkeep (sweepExpiredTasks): an anchor left un-done past its day is
// removed — its whole un-started plan with it — so the user can re-plan;
// a review stage left un-done past its day auto-skips.
//
// Stored under `wordly:v3:learning:tasks` (see docs/KIEN_TRUC_DU_LIEU.md).
import {
  DATABASE_KEYS,
  readDatabaseValue,
  removeDatabaseValue,
  writeDatabaseValue,
} from '@/data';
import { addDaysToKey, dayKeyOf } from './taskDates';

export type TaskStatus = 'new' | 'done' | 'skipped';
export type TaskKind = 'new' | 'review';

export type TaskModeResult = {
  mistakes: number;
  words: number;
  at: number;
};

export type ReviewTask = {
  id: string;
  topicId: string;
  topicLabel: string;
  dueDate: string; // local YYYY-MM-DD
  kind: TaskKind;
  stageIndex: number; // 0 = anchor day, 1..n = interval stages
  status: TaskStatus;
  createdAt: number;
  completedAt?: number;
  /** Best run per training mode recorded while the task was active. */
  modeResults?: Record<string, TaskModeResult>;
};

export type TopicSchedule = {
  topicId: string;
  topicLabel: string;
  anchorDate: string; // local YYYY-MM-DD
  intervals: number[]; // days after the anchor, ascending
  createdAt: number;
  updatedAt: number;
};

export type TasksData = {
  schedules: Record<string, TopicSchedule>;
  tasks: ReviewTask[];
};

/** Default spaced-repetition cycle, in days after the anchor day. */
export const DEFAULT_REVIEW_INTERVALS = [1, 7, 30, 90];

/** trainingSource marking a scheduled review-subset run (top-40% words). */
export const REVIEW_TASK_SOURCE = 'review-task';

/** The four modes that must each pass for a task to complete. */
export const TASK_REQUIRED_MODES = [
  'flashcards-reading',
  'flashcards-listening',
  'read-write',
  'listen-write',
] as const;

const EMPTY: TasksData = { schedules: {}, tasks: [] };

const createId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `task_${crypto.randomUUID()}`;
  }
  return `task_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
};

/** Current topic labels from the vocabulary catalog (read without importing
 * the vocabulary feature, to keep the module graph acyclic). */
const readCatalogTopicLabels = (): Record<string, string> => {
  try {
    const catalog = readDatabaseValue<{
      nodesById?: Record<string, { kind?: string; label?: string }>;
    }>(DATABASE_KEYS.vocabularyCatalog, {});
    const labels: Record<string, string> = {};
    const nodes = catalog.nodesById ?? {};
    for (const id of Object.keys(nodes)) {
      const node = nodes[id];
      if (node && node.kind === 'topic' && typeof node.label === 'string') {
        labels[id] = node.label;
      }
    }
    return labels;
  } catch {
    return {};
  }
};

export const loadTasksData = (): TasksData => {
  try {
    const data = readDatabaseValue<TasksData>(DATABASE_KEYS.learningTasks, EMPTY);
    const schedules = data.schedules ?? {};
    const tasks = Array.isArray(data.tasks) ? data.tasks : [];
    if (tasks.length === 0 && Object.keys(schedules).length === 0) {
      return { schedules: {}, tasks: [] };
    }
    // Overlay current catalog labels so renamed topics show their new name.
    const labels = readCatalogTopicLabels();
    return {
      schedules: Object.keys(schedules).reduce<TasksData['schedules']>(
        (next, topicId) => {
          const schedule = schedules[topicId];
          const label = labels[topicId];
          next[topicId] =
            label && label !== schedule.topicLabel
              ? { ...schedule, topicLabel: label }
              : schedule;
          return next;
        },
        {},
      ),
      tasks: tasks.map((task) => {
        const label = labels[task.topicId];
        return label && label !== task.topicLabel
          ? { ...task, topicLabel: label }
          : task;
      }),
    };
  } catch (error) {
    console.error('Failed to load review tasks:', error);
    return { schedules: {}, tasks: [] };
  }
};

const saveTasksData = (data: TasksData): void => {
  if (Object.keys(data.schedules).length === 0 && data.tasks.length === 0) {
    removeDatabaseValue(DATABASE_KEYS.learningTasks);
  } else {
    writeDatabaseValue<TasksData>(DATABASE_KEYS.learningTasks, data);
  }
};

export const loadReviewTasks = (): ReviewTask[] => loadTasksData().tasks;

/**
 * Daily upkeep, safe to call repeatedly (writes only when something changed):
 * - An anchor ("new-learn") day left un-done past its date is removed; when
 *   the topic has no completed work at all, its whole plan (schedule + tasks)
 *   goes with it so the user can schedule something else.
 * - A review stage left un-done past its date auto-flips to `skipped`.
 * Returns whether anything was written.
 */
export const sweepExpiredTasks = (
  today: string = dayKeyOf(Date.now()),
): boolean => {
  try {
    const data = loadTasksData();
    if (data.tasks.length === 0) return false;

    let changed = false;
    const expiredAnchorTopics = new Set<string>();
    let tasks: ReviewTask[] = [];
    for (const task of data.tasks) {
      const expired = task.dueDate < today && task.status !== 'done';
      if (expired && task.stageIndex === 0) {
        // Rule: an un-done new-learn day leaves the calendar the next day.
        expiredAnchorTopics.add(task.topicId);
        changed = true;
        continue;
      }
      if (expired && task.status === 'new') {
        // Rule: an un-done review day auto-skips the next day.
        tasks.push({ ...task, status: 'skipped' });
        changed = true;
        continue;
      }
      tasks.push(task);
    }

    const schedules = { ...data.schedules };
    expiredAnchorTopics.forEach((topicId) => {
      // Nothing achieved yet → free the whole plan for re-scheduling.
      const hasDone = tasks.some(
        (task) => task.topicId === topicId && task.status === 'done',
      );
      if (hasDone) return;
      delete schedules[topicId];
      tasks = tasks.filter((task) => task.topicId !== topicId);
    });

    if (changed) saveTasksData({ schedules, tasks });
    return changed;
  } catch (error) {
    console.error('Failed to sweep expired tasks:', error);
    return false;
  }
};

/** Subtle per-topic badge state for the vocabulary tree. */
export type TopicScheduleDisplayState = 'scheduled' | 'learned';

/**
 * For every topic: `learned` once its new-learn anchor is done (whether or not
 * the review cycle finished), otherwise `scheduled` while a schedule exists.
 */
export const getTopicScheduleStates = (): Record<string, TopicScheduleDisplayState> => {
  sweepExpiredTasks();
  const data = loadTasksData();
  const states: Record<string, TopicScheduleDisplayState> = {};
  for (const topicId of Object.keys(data.schedules)) {
    states[topicId] = 'scheduled';
  }
  for (const task of data.tasks) {
    if (task.status === 'done' && task.stageIndex === 0) {
      states[task.topicId] = 'learned';
    }
  }
  return states;
};

export const getTopicSchedule = (topicId: string): TopicSchedule | null =>
  loadTasksData().schedules[topicId] ?? null;

/**
 * Normalise a user-edited interval list: positive integers, deduplicated,
 * ascending. Returns null when nothing valid remains.
 */
export const normalizeIntervals = (input: number[]): number[] | null => {
  const cleaned = Array.from(
    new Set(
      input.filter((value) => Number.isInteger(value) && value > 0),
    ),
  ).sort((a, b) => a - b);
  return cleaned.length > 0 ? cleaned : null;
};

/**
 * How far a topic's schedule may still be changed:
 * - `none`: no schedule exists.
 * - `free`: nothing completed yet — reschedule or delete at will.
 * - `cycle-only`: the "new-learn" anchor is done — the schedule can no longer
 *   be deleted, only its review cycle edited.
 * - `locked`: at least one review stage is done — no edits, no delete.
 */
export type ScheduleEditState = 'none' | 'free' | 'cycle-only' | 'locked';

export const getScheduleEditState = (topicId: string): ScheduleEditState => {
  const data = loadTasksData();
  if (!data.schedules[topicId]) return 'none';
  let anchorDone = false;
  let reviewDone = false;
  for (const task of data.tasks) {
    if (task.topicId !== topicId || task.status !== 'done') continue;
    if (task.stageIndex === 0) anchorDone = true;
    else reviewDone = true;
  }
  if (reviewDone) return 'locked';
  if (anchorDone) return 'cycle-only';
  return 'free';
};

/** The projected task dates for an anchor + interval cycle (anchor first). */
export const projectScheduleDates = (
  anchorDate: string,
  intervals: number[],
): string[] => [anchorDate, ...intervals.map((days) => addDaysToKey(anchorDate, days))];

export type ScheduleTopicReviewInput = {
  topicId: string;
  anchorDate: string; // local YYYY-MM-DD
  intervals?: number[];
  topicLabel?: string;
  now?: number;
};

/**
 * Create (or replace) the schedule for a topic and materialise its task chain.
 * The anchor day is always a "new-learn" (học mới) task; interval stages are
 * reviews. Only allowed while nothing is done yet (`none`/`free`); planned
 * (pending/skipped) tasks are replaced, done ones are kept as history.
 * Returns null when the schedule is protected by completed work.
 */
export const scheduleTopicReview = (
  input: ScheduleTopicReviewInput,
): { created: number; dates: string[] } | null => {
  try {
    const state = getScheduleEditState(input.topicId);
    if (state === 'cycle-only' || state === 'locked') return null;

    const now = input.now ?? Date.now();
    const intervals =
      normalizeIntervals(input.intervals ?? DEFAULT_REVIEW_INTERVALS) ??
      DEFAULT_REVIEW_INTERVALS;
    const topicLabel = input.topicLabel || input.topicId;

    const data = loadTasksData();
    const keptTasks = data.tasks.filter(
      (task) => task.topicId !== input.topicId || task.status === 'done',
    );
    // Never resurrect a day the system already marked done for this topic
    // (possible with legacy data that has done tasks but no schedule).
    const doneDates = new Set(
      keptTasks
        .filter((task) => task.topicId === input.topicId)
        .map((task) => task.dueDate),
    );

    const dates = projectScheduleDates(input.anchorDate, intervals);
    const newTasks: ReviewTask[] = [];
    dates.forEach((dueDate, stageIndex) => {
      if (doneDates.has(dueDate)) return;
      newTasks.push({
        id: createId(),
        topicId: input.topicId,
        topicLabel,
        dueDate,
        kind: stageIndex === 0 ? 'new' : 'review',
        stageIndex,
        status: 'new',
        createdAt: now,
      });
    });

    saveTasksData({
      schedules: {
        ...data.schedules,
        [input.topicId]: {
          topicId: input.topicId,
          topicLabel,
          anchorDate: input.anchorDate,
          intervals,
          createdAt: data.schedules[input.topicId]?.createdAt ?? now,
          updatedAt: now,
        },
      },
      tasks: [...keptTasks, ...newTasks],
    });

    return { created: newTasks.length, dates };
  } catch (error) {
    console.error('Failed to schedule topic review:', error);
    return null;
  }
};

/**
 * Edit only the review cycle of an existing schedule, keeping the anchor day.
 * Allowed while `free` or `cycle-only` (a completed anchor stays untouched);
 * pending review stages are regenerated from the anchor with the new cycle.
 * Returns null when the schedule is locked or missing.
 */
export const updateScheduleIntervals = (
  topicId: string,
  intervalsInput: number[],
): { created: number; dates: string[] } | null => {
  try {
    const state = getScheduleEditState(topicId);
    if (state !== 'free' && state !== 'cycle-only') return null;

    const data = loadTasksData();
    const schedule = data.schedules[topicId];
    if (!schedule) return null;
    const intervals = normalizeIntervals(intervalsInput) ?? DEFAULT_REVIEW_INTERVALS;
    const now = Date.now();

    const keptTasks = data.tasks.filter(
      (task) => task.topicId !== topicId || task.status === 'done',
    );
    // Days already completed for this topic (incl. the anchor) stay untouched.
    const doneDates = new Set(
      keptTasks
        .filter((task) => task.topicId === topicId)
        .map((task) => task.dueDate),
    );

    const dates = projectScheduleDates(schedule.anchorDate, intervals);
    const newTasks: ReviewTask[] = [];
    dates.forEach((dueDate, stageIndex) => {
      if (doneDates.has(dueDate)) return;
      newTasks.push({
        id: createId(),
        topicId,
        topicLabel: schedule.topicLabel,
        dueDate,
        kind: stageIndex === 0 ? 'new' : 'review',
        stageIndex,
        status: 'new',
        createdAt: now,
      });
    });

    saveTasksData({
      schedules: {
        ...data.schedules,
        [topicId]: { ...schedule, intervals, updatedAt: now },
      },
      tasks: [...keptTasks, ...newTasks],
    });

    return { created: newTasks.length, dates };
  } catch (error) {
    console.error('Failed to update review cycle:', error);
    return null;
  }
};

/**
 * Remove a topic's schedule and its planned tasks. Only allowed while `free`:
 * once the new-learn anchor (or any review) is done, the schedule is protected.
 */
export const removeTopicSchedule = (topicId: string): boolean => {
  try {
    if (getScheduleEditState(topicId) !== 'free') return false;
    const data = loadTasksData();
    const nextSchedules = { ...data.schedules };
    delete nextSchedules[topicId];
    const nextTasks = data.tasks.filter(
      (task) => task.topicId !== topicId || task.status === 'done',
    );
    saveTasksData({ schedules: nextSchedules, tasks: nextTasks });
    return true;
  } catch (error) {
    console.error('Failed to remove review schedule:', error);
    return false;
  }
};

/**
 * Cascade cleanup when a vocabulary topic is deleted: its schedule and EVERY
 * task (done included) go with it — tasks for a topic that no longer exists
 * would otherwise clutter the calendar forever and could never complete.
 */
export const purgeTopicTasks = (topicId: string): void => {
  try {
    const data = loadTasksData();
    const hasSchedule = Boolean(data.schedules[topicId]);
    const hasTasks = data.tasks.some((task) => task.topicId === topicId);
    if (!hasSchedule && !hasTasks) return;
    const nextSchedules = { ...data.schedules };
    delete nextSchedules[topicId];
    saveTasksData({
      schedules: nextSchedules,
      tasks: data.tasks.filter((task) => task.topicId !== topicId),
    });
  } catch (error) {
    console.error('Failed to purge review tasks:', error);
  }
};

/** Cascade cleanup when the whole vocabulary library is cleared. */
export const purgeAllTasks = (): void => {
  removeDatabaseValue(DATABASE_KEYS.learningTasks);
};

/**
 * User status toggle. Only new ↔ skipped is allowed; `done` is system-owned
 * and can be neither set nor cleared here.
 */
export const setReviewTaskStatus = (
  taskId: string,
  status: 'new' | 'skipped',
): boolean => {
  try {
    const data = loadTasksData();
    const index = data.tasks.findIndex((task) => task.id === taskId);
    if (index < 0) return false;
    const task = data.tasks[index];
    if (task.status === 'done' || task.status === status) return false;
    const nextTasks = [...data.tasks];
    nextTasks[index] = { ...task, status };
    saveTasksData({ ...data, tasks: nextTasks });
    return true;
  } catch (error) {
    console.error('Failed to update task status:', error);
    return false;
  }
};

/** Mistake rate ≤ 10%, computed with integer math to avoid float edges. */
export const isPassingResult = (result: TaskModeResult): boolean =>
  result.words > 0 && result.mistakes * 10 <= result.words;

export type TrainingRunForTasks = {
  topicId: string;
  mode: string;
  words: number;
  mistakes: number;
  completedAt?: number;
  trainingSource?: string;
};

/**
 * Attribute a completed training run to the topic's active task (earliest
 * pending task due that day, after the daily sweep). Keeps the best result per
 * mode and flips the task to `done` once all four modes pass at ≤ 10%.
 * Eligibility by source:
 * - no source (full-topic run): counts for anchors AND review stages;
 * - `review-task` (scheduled top-40% subset): counts for review stages only —
 *   a subset run can never complete a full-set "new-learn" anchor;
 * - anything else (e.g. ad-hoc `top-mistakes` review): never counts.
 */
export const applyTrainingRunToTasks = (run: TrainingRunForTasks): void => {
  try {
    if (!run.topicId) return;
    if (run.trainingSource && run.trainingSource !== REVIEW_TASK_SOURCE) return;
    const isSubsetRun = run.trainingSource === REVIEW_TASK_SOURCE;
    const words = Math.max(0, Math.round(run.words));
    if (words <= 0) return;
    const mistakes = Math.max(0, Math.round(run.mistakes));
    const completedAt = run.completedAt ?? Date.now();
    const today = dayKeyOf(completedAt);

    // Expired plans must not absorb today's run.
    sweepExpiredTasks(today);

    const data = loadTasksData();
    let activeIndex = -1;
    for (let index = 0; index < data.tasks.length; index += 1) {
      const task = data.tasks[index];
      if (task.topicId !== run.topicId || task.status !== 'new') continue;
      if (task.dueDate > today) continue;
      if (isSubsetRun && task.stageIndex === 0) continue;
      if (activeIndex < 0 || task.dueDate < data.tasks[activeIndex].dueDate) {
        activeIndex = index;
      }
    }
    if (activeIndex < 0) return;

    const task = data.tasks[activeIndex];
    const previous = task.modeResults?.[run.mode];
    const previousRate = previous
      ? previous.mistakes / Math.max(previous.words, 1)
      : Number.POSITIVE_INFINITY;
    const nextRate = mistakes / words;
    const modeResults = { ...task.modeResults };
    if (!previous || nextRate < previousRate) {
      modeResults[run.mode] = { mistakes, words, at: completedAt };
    }

    const allPass = TASK_REQUIRED_MODES.every((mode) => {
      const result = modeResults[mode];
      return Boolean(result) && isPassingResult(result);
    });

    const nextTasks = [...data.tasks];
    nextTasks[activeIndex] = {
      ...task,
      modeResults,
      ...(allPass ? { status: 'done' as const, completedAt } : {}),
    };
    saveTasksData({ ...data, tasks: nextTasks });
  } catch (error) {
    console.error('Failed to apply training run to tasks:', error);
  }
};

/** Group tasks by due day for calendar rendering. */
export const groupTasksByDay = (
  tasks: ReviewTask[],
): Map<string, ReviewTask[]> => {
  const map = new Map<string, ReviewTask[]>();
  for (const task of tasks) {
    const bucket = map.get(task.dueDate);
    if (bucket) bucket.push(task);
    else map.set(task.dueDate, [task]);
  }
  map.forEach((bucket) =>
    bucket.sort((a, b) => a.topicLabel.localeCompare(b.topicLabel, 'vi')),
  );
  return map;
};

export type DayTaskCounts = {
  pendingNew: number;
  pendingReview: number;
  done: number;
  skipped: number;
};

export const countDayTasks = (tasks: ReviewTask[]): DayTaskCounts => {
  const counts: DayTaskCounts = { pendingNew: 0, pendingReview: 0, done: 0, skipped: 0 };
  for (const task of tasks) {
    if (task.status === 'done') counts.done += 1;
    else if (task.status === 'skipped') counts.skipped += 1;
    else if (task.kind === 'new') counts.pendingNew += 1;
    else counts.pendingReview += 1;
  }
  return counts;
};
