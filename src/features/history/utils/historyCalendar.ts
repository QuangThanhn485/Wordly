// Pure calendar helpers for the training-history screen. No storage or React
// here so the month math stays trivially testable.
import type { TrainingHistoryEntry } from '@/features/train/utils/trainingHistory';

const pad2 = (value: number): string => String(value).padStart(2, '0');

/** Local (not UTC) YYYY-MM-DD key so a run lands on the user's own day. */
export const dayKey = (input: number | Date): string => {
  const date = input instanceof Date ? input : new Date(input);
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
};

/** Group history entries by local day, each day's entries sorted by time asc. */
export const groupEntriesByDay = (
  entries: TrainingHistoryEntry[],
): Map<string, TrainingHistoryEntry[]> => {
  const map = new Map<string, TrainingHistoryEntry[]>();
  for (const entry of entries) {
    const key = dayKey(entry.completedAt);
    const bucket = map.get(key);
    if (bucket) bucket.push(entry);
    else map.set(key, [entry]);
  }
  map.forEach((bucket) => bucket.sort((a, b) => a.completedAt - b.completedAt));
  return map;
};

/** Day key of the most recent run, or null when there is no history. */
export const getMostRecentDayKey = (
  entries: TrainingHistoryEntry[],
): string | null => {
  if (entries.length === 0) return null;
  let latest = entries[0].completedAt;
  for (const entry of entries) {
    if (entry.completedAt > latest) latest = entry.completedAt;
  }
  return dayKey(latest);
};

/** Distinct training modes for a day, in first-seen order. */
export const distinctModes = (entries: TrainingHistoryEntry[]): string[] => {
  const seen = new Set<string>();
  const order: string[] = [];
  for (const entry of entries) {
    const modes =
      entry.modes && entry.modes.length > 0
        ? entry.modes
        : entry.mode
          ? [entry.mode]
          : [];
    for (const mode of modes) {
      if (!seen.has(mode)) {
        seen.add(mode);
        order.push(mode);
      }
    }
  }
  return order;
};

export type DaySummary = {
  sessions: number;
  words: number;
  mistakes: number;
  topics: number;
  modes: string[];
};

export const summarizeDay = (entries: TrainingHistoryEntry[]): DaySummary => ({
  sessions: entries.length,
  words: entries.reduce((sum, entry) => sum + entry.words, 0),
  mistakes: entries.reduce((sum, entry) => sum + entry.mistakes, 0),
  topics: new Set(entries.map((entry) => entry.topicId)).size,
  modes: distinctModes(entries),
});
