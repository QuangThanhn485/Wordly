import { useMemo } from 'react';
import {
  loadTrainingHistory,
  type TrainingHistoryEntry,
} from '@/features/train/utils/trainingHistory';
import {
  dayKey,
  getMostRecentDayKey,
  groupEntriesByDay,
} from '../utils/historyCalendar';

const dateFromKey = (key: string): Date => {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
};

/** Loads the history log once and exposes it grouped by day for the calendar. */
export const useTrainingHistory = () => {
  const entries = useMemo(() => loadTrainingHistory(), []);
  const byDay = useMemo(() => groupEntriesByDay(entries), [entries]);
  const todayKey = dayKey(Date.now());
  const anchorKey = useMemo(
    () => getMostRecentDayKey(entries) ?? todayKey,
    [entries, todayKey],
  );

  return {
    entries,
    byDay,
    todayKey,
    hasData: entries.length > 0,
    anchorDate: dateFromKey(anchorKey),
  };
};

export type { TrainingHistoryEntry };
