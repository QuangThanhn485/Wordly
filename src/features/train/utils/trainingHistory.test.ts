import { __resetDatabaseForTests } from '@/data';
import { loadTrainingHistory, recordTrainingRun } from './trainingHistory';

const DAY1 = new Date(2026, 6, 5, 9, 0).getTime();
const DAY1_LATER = new Date(2026, 6, 5, 20, 0).getTime();
const DAY2 = new Date(2026, 6, 6, 9, 0).getTime();

describe('recordTrainingRun', () => {
  beforeEach(() => {
    localStorage.clear();
    __resetDatabaseForTests();
  });

  it('marks the first day of a topic as "new"', () => {
    recordTrainingRun({ topicId: 't1', mode: 'read-write', words: 10, mistakes: 2, wrongWords: 1, completedAt: DAY1 });
    const history = loadTrainingHistory();
    expect(history).toHaveLength(1);
    expect(history[0].kind).toBe('new');
    expect(history[0].modes).toEqual(['read-write']);
  });

  it('merges same-day repeats of a topic into one record', () => {
    recordTrainingRun({ topicId: 't1', mode: 'read-write', words: 10, mistakes: 2, wrongWords: 1, completedAt: DAY1 });
    recordTrainingRun({ topicId: 't1', mode: 'flashcards-reading', words: 10, mistakes: 3, wrongWords: 2, completedAt: DAY1_LATER });
    const history = loadTrainingHistory();
    expect(history).toHaveLength(1);
    expect(history[0].kind).toBe('new');
    expect([...history[0].modes].sort()).toEqual(['flashcards-reading', 'read-write']);
    expect(history[0].mistakes).toBe(5); // summed across the day
    expect(history[0].completedAt).toBe(DAY1_LATER); // latest run of the day
  });

  it('marks a later day of the same topic as "review"', () => {
    recordTrainingRun({ topicId: 't1', mode: 'read-write', words: 10, mistakes: 0, wrongWords: 0, completedAt: DAY1 });
    recordTrainingRun({ topicId: 't1', mode: 'read-write', words: 10, mistakes: 1, wrongWords: 1, completedAt: DAY2 });
    const history = loadTrainingHistory().sort((a, b) => a.completedAt - b.completedAt);
    expect(history).toHaveLength(2);
    expect(history[0].kind).toBe('new');
    expect(history[1].kind).toBe('review');
  });

  it('tracks topics independently', () => {
    recordTrainingRun({ topicId: 't1', mode: 'read-write', words: 10, mistakes: 0, wrongWords: 0, completedAt: DAY1 });
    recordTrainingRun({ topicId: 't2', mode: 'read-write', words: 5, mistakes: 0, wrongWords: 0, completedAt: DAY1 });
    const history = loadTrainingHistory();
    expect(history).toHaveLength(2);
    expect(history.every((entry) => entry.kind === 'new')).toBe(true);
  });
});
