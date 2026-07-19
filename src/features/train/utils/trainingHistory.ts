// Training history log.
//
// One entry per (vocabulary topic, local day): repeating a topic on the same day
// updates that single entry rather than adding rows. Each entry is marked as
// `new` (first day the topic was ever trained) or `review` (trained on an earlier
// day). See docs/KIEN_TRUC_DU_LIEU.md — stored under `wordly:v3:learning:history`.
import {
  DATABASE_KEYS,
  readDatabaseValue,
  removeDatabaseValue,
  writeDatabaseValue,
} from '@/data';
import { getTopicLabel } from '@/features/vocabulary/utils/storageUtils';
import type { TrainingMode } from './trainingModes';

export type TrainingHistoryKind = 'new' | 'review';

export type TrainingHistoryEntry = {
  id: string;
  completedAt: number; // latest run of the day; the day is derived from this.
  topicId: string;
  topicLabel: string;
  kind: TrainingHistoryKind;
  modes: string[]; // modes practised that day for this topic
  words: number; // topic size
  mistakes: number; // total wrong attempts that day
  wrongWords: number; // distinct words missed that day
  trainingSource?: string; // e.g. 'top-mistakes'
  /** @deprecated kept so pre-existing records still validate. */
  mode?: string;
};

type TrainingHistoryData = {
  entries: TrainingHistoryEntry[];
};

// Keep the log bounded; drop the oldest entries beyond this many.
const MAX_ENTRIES = 2000;

const pad2 = (value: number): string => String(value).padStart(2, '0');
const localDayKey = (ts: number): string => {
  const d = new Date(ts);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
};

const createId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `hist_${crypto.randomUUID()}`;
  }
  return `hist_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
};

// Fill in kind/modes for entries written before those fields existed.
const normalizeEntry = (entry: TrainingHistoryEntry): TrainingHistoryEntry => ({
  ...entry,
  kind: entry.kind === 'review' ? 'review' : 'new',
  modes:
    Array.isArray(entry.modes) && entry.modes.length > 0
      ? entry.modes
      : entry.mode
        ? [entry.mode]
        : [],
});

export const loadTrainingHistory = (): TrainingHistoryEntry[] => {
  try {
    const data = readDatabaseValue<TrainingHistoryData>(
      DATABASE_KEYS.trainingHistory,
      { entries: [] },
    );
    return Array.isArray(data.entries) ? data.entries.map(normalizeEntry) : [];
  } catch (error) {
    console.error('Failed to load training history:', error);
    return [];
  }
};

const save = (entries: TrainingHistoryEntry[]): void => {
  writeDatabaseValue<TrainingHistoryData>(DATABASE_KEYS.trainingHistory, {
    entries: entries.slice(-MAX_ENTRIES),
  });
};

export type RecordTrainingRunInput = {
  topicId: string;
  mode: TrainingMode | string;
  words: number;
  mistakes: number;
  wrongWords: number;
  topicLabel?: string;
  trainingSource?: string;
  completedAt?: number;
};

/**
 * Record a completed run. The first run of a topic on a given day creates the
 * day's entry (marked new/review); later runs that day merge into it.
 */
export const recordTrainingRun = (input: RecordTrainingRunInput): void => {
  try {
    if (!input.topicId) return;
    const completedAt = input.completedAt ?? Date.now();
    const todayKey = localDayKey(completedAt);
    const label = input.topicLabel || getTopicLabel(input.topicId) || input.topicId;
    const words = Math.max(0, Math.round(input.words));
    const mistakes = Math.max(0, Math.round(input.mistakes));
    const wrongWords = Math.max(0, Math.round(input.wrongWords));

    const entries = loadTrainingHistory();

    const todayIndex = entries.findIndex(
      (entry) =>
        entry.topicId === input.topicId &&
        localDayKey(entry.completedAt) === todayKey,
    );

    if (todayIndex >= 0) {
      const existing = entries[todayIndex];
      const modes = existing.modes.includes(input.mode)
        ? existing.modes
        : [...existing.modes, input.mode];
      entries[todayIndex] = {
        ...existing,
        completedAt: Math.max(existing.completedAt, completedAt),
        topicLabel: label,
        modes,
        words: Math.max(existing.words, words),
        mistakes: existing.mistakes + mistakes,
        wrongWords: Math.max(existing.wrongWords, wrongWords),
      };
      save(entries);
      return;
    }

    const hasPriorDay = entries.some(
      (entry) =>
        entry.topicId === input.topicId &&
        localDayKey(entry.completedAt) < todayKey,
    );

    const entry: TrainingHistoryEntry = {
      id: createId(),
      completedAt,
      topicId: input.topicId,
      topicLabel: label,
      kind: hasPriorDay ? 'review' : 'new',
      modes: [input.mode],
      words,
      mistakes,
      wrongWords,
      ...(input.trainingSource ? { trainingSource: input.trainingSource } : {}),
    };
    save([...entries, entry]);
  } catch (error) {
    console.error('Failed to record training run:', error);
  }
};

export const clearTrainingHistory = (): void => {
  removeDatabaseValue(DATABASE_KEYS.trainingHistory);
};
