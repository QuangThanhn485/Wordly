import type { TrainingHistoryEntry } from '@/features/train/utils/trainingHistory';
import {
  dayKey,
  distinctModes,
  groupEntriesByDay,
  getMostRecentDayKey,
  summarizeDay,
} from './historyCalendar';

const entry = (
  overrides: Partial<TrainingHistoryEntry> & { completedAt: number },
): TrainingHistoryEntry => ({
  id: `id_${overrides.completedAt}`,
  mode: 'read-write',
  kind: 'new',
  modes: [],
  topicId: 't1',
  topicLabel: 'Topic 1',
  words: 10,
  mistakes: 2,
  wrongWords: 1,
  ...overrides,
});

describe('dayKey', () => {
  it('produces a local YYYY-MM-DD key', () => {
    const date = new Date(2026, 6, 5, 23, 30); // 5 Jul 2026 local
    expect(dayKey(date)).toBe('2026-07-05');
    expect(dayKey(date.getTime())).toBe('2026-07-05');
  });
});

describe('groupEntriesByDay', () => {
  it('buckets entries by local day and sorts each day ascending', () => {
    const a = entry({ completedAt: new Date(2026, 6, 5, 9).getTime() });
    const b = entry({ completedAt: new Date(2026, 6, 5, 20).getTime() });
    const c = entry({ completedAt: new Date(2026, 6, 6, 8).getTime() });
    const map = groupEntriesByDay([b, c, a]);
    expect(Array.from(map.keys()).sort()).toEqual(['2026-07-05', '2026-07-06']);
    expect(map.get('2026-07-05')!.map((e) => e.completedAt)).toEqual([
      a.completedAt,
      b.completedAt,
    ]);
  });
});

describe('getMostRecentDayKey', () => {
  it('returns null with no entries and the latest day otherwise', () => {
    expect(getMostRecentDayKey([])).toBeNull();
    const older = entry({ completedAt: new Date(2026, 6, 1).getTime() });
    const newer = entry({ completedAt: new Date(2026, 6, 9).getTime() });
    expect(getMostRecentDayKey([older, newer])).toBe('2026-07-09');
  });
});

describe('distinctModes + summarizeDay', () => {
  const entries = [
    entry({ completedAt: 1, mode: 'read-write', words: 10, mistakes: 2, topicId: 't1' }),
    entry({ completedAt: 2, mode: 'flashcards-reading', words: 8, mistakes: 0, topicId: 't1' }),
    entry({ completedAt: 3, mode: 'read-write', words: 6, mistakes: 1, topicId: 't2' }),
  ];

  it('lists distinct modes in first-seen order', () => {
    expect(distinctModes(entries)).toEqual(['read-write', 'flashcards-reading']);
  });

  it('aggregates a day summary', () => {
    expect(summarizeDay(entries)).toEqual({
      sessions: 3,
      words: 24,
      mistakes: 3,
      topics: 2,
      modes: ['read-write', 'flashcards-reading'],
    });
  });
});
