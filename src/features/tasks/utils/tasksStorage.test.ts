import { __resetDatabaseForTests, DATABASE_KEYS, writeDatabaseValue } from '@/data';
import { deleteVocabularyTopic } from '@/features/vocabulary/utils/storageUtils';
import { recordTrainingRun } from '@/features/train/utils/trainingHistory';
import {
  applyTrainingRunToTasks,
  DEFAULT_REVIEW_INTERVALS,
  getScheduleEditState,
  getTopicSchedule,
  loadReviewTasks,
  normalizeIntervals,
  projectScheduleDates,
  removeTopicSchedule,
  scheduleTopicReview,
  setReviewTaskStatus,
  sweepExpiredTasks,
  updateScheduleIntervals,
} from './tasksStorage';

const D = (day: number, hour = 9) => new Date(2026, 6, day, hour).getTime(); // July 2026

const run = (over: Partial<Parameters<typeof applyTrainingRunToTasks>[0]> = {}) => ({
  topicId: 't1',
  mode: 'read-write',
  words: 20,
  mistakes: 0,
  completedAt: D(5),
  ...over,
});

const passAllModes = (topicId: string, completedAt: number, mistakes = 0) => {
  for (const mode of ['flashcards-reading', 'flashcards-listening', 'read-write', 'listen-write']) {
    applyTrainingRunToTasks(run({ topicId, mode, mistakes, completedAt }));
  }
};

describe('review tasks', () => {
  beforeEach(() => {
    localStorage.clear();
    __resetDatabaseForTests();
  });

  it('normalizes interval lists', () => {
    expect(normalizeIntervals([3, 1, 3, 0, -2, 7.5, 7])).toEqual([1, 3, 7]);
    expect(normalizeIntervals([])).toBeNull();
  });

  it('creates the anchor + default interval chain with correct dates', () => {
    const result = scheduleTopicReview({ topicId: 't1', anchorDate: '2026-07-05', topicLabel: 'Topic 1' });
    expect(result).not.toBeNull();
    expect(DEFAULT_REVIEW_INTERVALS).toEqual([1, 7, 30, 90]);
    expect(result!.created).toBe(1 + DEFAULT_REVIEW_INTERVALS.length);
    expect(result!.dates).toEqual(['2026-07-05', '2026-07-06', '2026-07-12', '2026-08-04', '2026-10-03']);
    const tasks = loadReviewTasks();
    expect(tasks).toHaveLength(5);
    expect(tasks[0].kind).toBe('new');
    expect(tasks.slice(1).every((task) => task.kind === 'review')).toBe(true);
    expect(getTopicSchedule('t1')?.intervals).toEqual(DEFAULT_REVIEW_INTERVALS);
  });

  it('always makes the anchor a new-learn task, even for previously trained topics', () => {
    recordTrainingRun({ topicId: 't1', mode: 'read-write', words: 10, mistakes: 0, wrongWords: 0, completedAt: D(1) });
    scheduleTopicReview({ topicId: 't1', anchorDate: '2026-07-05', topicLabel: 'Topic 1' });
    expect(loadReviewTasks()[0].kind).toBe('new');
  });

  it('replaces planned tasks on reschedule while nothing is done yet', () => {
    scheduleTopicReview({ topicId: 't1', anchorDate: '2026-07-05', intervals: [2, 5], topicLabel: 'Topic 1' });
    expect(loadReviewTasks().map((t) => t.dueDate)).toEqual(['2026-07-05', '2026-07-07', '2026-07-10']);

    const result = scheduleTopicReview({ topicId: 't1', anchorDate: '2026-07-20', intervals: [1], topicLabel: 'Topic 1' });
    expect(result).not.toBeNull();
    expect(loadReviewTasks().map((t) => t.dueDate)).toEqual(['2026-07-20', '2026-07-21']);
  });

  it('locks rescheduling and deletion once the new-learn anchor is done, allowing cycle edits only', () => {
    scheduleTopicReview({ topicId: 't1', anchorDate: '2026-07-05', intervals: [2, 5], topicLabel: 'Topic 1' });
    passAllModes('t1', D(5)); // completes the anchor
    expect(getScheduleEditState('t1')).toBe('cycle-only');

    // Reschedule + delete are refused
    expect(scheduleTopicReview({ topicId: 't1', anchorDate: '2026-07-20', topicLabel: 'Topic 1' })).toBeNull();
    expect(removeTopicSchedule('t1')).toBe(false);
    expect(getTopicSchedule('t1')).not.toBeNull();

    // Cycle edit works: done anchor is kept, review stages regenerate from it
    const result = updateScheduleIntervals('t1', [1, 4]);
    expect(result).not.toBeNull();
    const tasks = loadReviewTasks();
    const doneAnchor = tasks.find((t) => t.stageIndex === 0);
    expect(doneAnchor?.status).toBe('done');
    expect(tasks.filter((t) => t.status === 'new').map((t) => t.dueDate)).toEqual(['2026-07-06', '2026-07-09']);
    expect(getTopicSchedule('t1')?.intervals).toEqual([1, 4]);
  });

  it('locks everything once any review stage is done', () => {
    scheduleTopicReview({ topicId: 't1', anchorDate: '2026-07-01', intervals: [2], topicLabel: 'Topic 1' });
    passAllModes('t1', D(1)); // anchor done
    passAllModes('t1', D(3)); // review stage done
    expect(getScheduleEditState('t1')).toBe('locked');
    expect(scheduleTopicReview({ topicId: 't1', anchorDate: '2026-07-20', topicLabel: 'Topic 1' })).toBeNull();
    expect(updateScheduleIntervals('t1', [1])).toBeNull();
    expect(removeTopicSchedule('t1')).toBe(false);
    expect(loadReviewTasks().filter((t) => t.status === 'done')).toHaveLength(2);
  });

  it('completes a task only when all 4 modes pass at ≤10% mistakes', () => {
    scheduleTopicReview({ topicId: 't1', anchorDate: '2026-07-05', intervals: [3], topicLabel: 'Topic 1' });

    // 3 passing modes → still pending
    for (const mode of ['flashcards-reading', 'flashcards-listening', 'read-write']) {
      applyTrainingRunToTasks(run({ mode, words: 20, mistakes: 2 })); // 10% → pass
    }
    expect(loadReviewTasks()[0].status).toBe('new');

    // 4th mode fails (>10%) → still pending
    applyTrainingRunToTasks(run({ mode: 'listen-write', words: 20, mistakes: 3 }));
    expect(loadReviewTasks()[0].status).toBe('new');

    // retry 4th mode passing → done (best result per mode is kept)
    applyTrainingRunToTasks(run({ mode: 'listen-write', words: 20, mistakes: 1, completedAt: D(5, 20) }));
    const task = loadReviewTasks()[0];
    expect(task.status).toBe('done');
    expect(task.completedAt).toBe(D(5, 20));
  });

  it('attributes runs to the task due that day and ignores future ones', () => {
    scheduleTopicReview({ topicId: 't1', anchorDate: '2026-07-01', intervals: [2, 10], topicLabel: 'Topic 1' });
    passAllModes('t1', D(1)); // anchor done on its own day
    passAllModes('t1', D(3)); // review due 3 Jul done on its day; 11 Jul untouched
    const byDue = new Map(loadReviewTasks().map((t) => [t.dueDate, t.status]));
    expect(byDue.get('2026-07-01')).toBe('done');
    expect(byDue.get('2026-07-03')).toBe('done');
    expect(byDue.get('2026-07-11')).toBe('new');
  });

  it('deletes an un-done new-learn plan the next day so the user can re-plan', () => {
    scheduleTopicReview({ topicId: 't1', anchorDate: '2026-07-05', intervals: [1, 3], topicLabel: 'Topic 1' });
    expect(sweepExpiredTasks('2026-07-06')).toBe(true);
    expect(loadReviewTasks()).toHaveLength(0);
    expect(getTopicSchedule('t1')).toBeNull();
    // Idempotent: second sweep writes nothing.
    expect(sweepExpiredTasks('2026-07-06')).toBe(false);
  });

  it('auto-skips an un-done review stage the next day, keeping the rest of the chain', () => {
    scheduleTopicReview({ topicId: 't1', anchorDate: '2026-07-05', intervals: [1, 3], topicLabel: 'Topic 1' });
    passAllModes('t1', D(5)); // anchor done on its day
    expect(sweepExpiredTasks('2026-07-07')).toBe(true); // review of 6 Jul expired
    const byDue = new Map(loadReviewTasks().map((t) => [t.dueDate, t.status]));
    expect(byDue.get('2026-07-05')).toBe('done');
    expect(byDue.get('2026-07-06')).toBe('skipped');
    expect(byDue.get('2026-07-08')).toBe('new');
    expect(getTopicSchedule('t1')).not.toBeNull();
  });

  it('expired plans cannot absorb a later run (sweep runs before attribution)', () => {
    scheduleTopicReview({ topicId: 't1', anchorDate: '2026-07-01', intervals: [2], topicLabel: 'Topic 1' });
    // Nothing was done on 1 Jul; training on 4 Jul must not resurrect the plan.
    passAllModes('t1', D(4));
    expect(loadReviewTasks()).toHaveLength(0);
    expect(getTopicSchedule('t1')).toBeNull();
  });

  it('full-topic runs also complete review stages (learner may review the whole set)', () => {
    scheduleTopicReview({ topicId: 't1', anchorDate: '2026-07-05', intervals: [1], topicLabel: 'Topic 1' });
    passAllModes('t1', D(5)); // anchor done with full-set runs
    passAllModes('t1', D(6)); // FULL-set runs on the review day instead of the 40% subset
    expect(loadReviewTasks().find((t) => t.stageIndex === 1)?.status).toBe('done');
  });

  it('review-subset runs complete review stages but never the new-learn anchor', () => {
    scheduleTopicReview({ topicId: 't1', anchorDate: '2026-07-05', intervals: [1], topicLabel: 'Topic 1' });
    const modes = ['flashcards-reading', 'flashcards-listening', 'read-write', 'listen-write'];

    // Subset runs on the anchor day must not complete the full-set anchor.
    for (const mode of modes) {
      applyTrainingRunToTasks({ topicId: 't1', mode, words: 4, mistakes: 0, completedAt: D(5), trainingSource: 'review-task' });
    }
    expect(loadReviewTasks().find((t) => t.stageIndex === 0)?.status).toBe('new');

    passAllModes('t1', D(5)); // full-topic runs complete the anchor
    expect(loadReviewTasks().find((t) => t.stageIndex === 0)?.status).toBe('done');

    // Subset runs on the review day complete the review stage.
    for (const mode of modes) {
      applyTrainingRunToTasks({ topicId: 't1', mode, words: 4, mistakes: 0, completedAt: D(6), trainingSource: 'review-task' });
    }
    expect(loadReviewTasks().find((t) => t.stageIndex === 1)?.status).toBe('done');
  });

  it('ignores top-mistakes subset runs and skipped tasks', () => {
    scheduleTopicReview({ topicId: 't1', anchorDate: '2026-07-05', intervals: [1], topicLabel: 'Topic 1' });
    passAllModes('t1', D(5), 0);
    let tasks = loadReviewTasks();
    expect(tasks.find((t) => t.stageIndex === 0)?.status).toBe('done');

    const pending = tasks.find((t) => t.stageIndex === 1)!;
    expect(setReviewTaskStatus(pending.id, 'skipped')).toBe(true);
    applyTrainingRunToTasks(run({ completedAt: D(6), trainingSource: 'top-mistakes' }));
    passAllModes('t1', D(6));
    tasks = loadReviewTasks();
    // skipped task never received attribution
    expect(tasks.find((t) => t.stageIndex === 1)?.status).toBe('skipped');
  });

  it('lets users toggle new ↔ skipped but never touch done', () => {
    scheduleTopicReview({ topicId: 't1', anchorDate: '2026-07-05', intervals: [1], topicLabel: 'Topic 1' });
    const [anchor, next] = loadReviewTasks();
    expect(setReviewTaskStatus(next.id, 'skipped')).toBe(true);
    expect(setReviewTaskStatus(next.id, 'new')).toBe(true);

    passAllModes('t1', D(5));
    const done = loadReviewTasks().find((t) => t.id === anchor.id)!;
    expect(done.status).toBe('done');
    expect(setReviewTaskStatus(done.id, 'skipped')).toBe(false);
    expect(loadReviewTasks().find((t) => t.id === anchor.id)?.status).toBe('done');
  });

  it('removes a schedule with its planned tasks while nothing is done', () => {
    scheduleTopicReview({ topicId: 't1', anchorDate: '2026-07-05', intervals: [1, 3], topicLabel: 'Topic 1' });
    expect(removeTopicSchedule('t1')).toBe(true);
    expect(loadReviewTasks()).toHaveLength(0);
    expect(getTopicSchedule('t1')).toBeNull();
  });

  it('projects schedule dates across month boundaries', () => {
    expect(projectScheduleDates('2026-07-30', [1, 3])).toEqual(['2026-07-30', '2026-07-31', '2026-08-02']);
  });

  it('purges the schedule and every task (done included) when the topic is deleted', () => {
    scheduleTopicReview({ topicId: 't1', anchorDate: '2026-07-05', intervals: [1, 3], topicLabel: 'Topic 1' });
    passAllModes('t1', D(5)); // anchor done → schedule normally protected
    scheduleTopicReview({ topicId: 't2', anchorDate: '2026-07-06', intervals: [1], topicLabel: 'Topic 2' });

    deleteVocabularyTopic('t1');

    expect(getTopicSchedule('t1')).toBeNull();
    expect(loadReviewTasks().every((task) => task.topicId === 't2')).toBe(true);
    expect(getTopicSchedule('t2')).not.toBeNull();
  });

  it('shows the current catalog label after a topic rename', () => {
    scheduleTopicReview({ topicId: 't1', anchorDate: '2026-07-05', intervals: [1], topicLabel: 'Old name' });
    // Simulate the rename flow: catalog now carries the new label.
    writeDatabaseValue(DATABASE_KEYS.vocabularyCatalog, {
      catalogVersion: 1,
      rootId: 'root',
      nodesById: {
        root: { kind: 'folder', id: 'root', label: 'Root', parentId: null, childIds: ['t1'], createdAt: 1, updatedAt: 1 },
        t1: { kind: 'topic', id: 't1', label: 'New name', parentId: 'root', wordCount: 0, createdAt: 1, updatedAt: 1 },
      },
    });
    expect(loadReviewTasks().every((task) => task.topicLabel === 'New name')).toBe(true);
    expect(getTopicSchedule('t1')?.topicLabel).toBe('New name');
  });
});
