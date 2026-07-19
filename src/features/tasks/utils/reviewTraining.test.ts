import { __resetDatabaseForTests } from '@/data';
import { saveVocabularyTopic } from '@/features/vocabulary/utils/storageUtils';
import { recordMistakes } from '@/features/train/train-start/mistakesStorage';
import { buildReviewSubset, REVIEW_SUBSET_RATIO } from './reviewTraining';

const words = Array.from({ length: 10 }, (_, i) => ({
  id: `w${i}`,
  word: `word${i}`,
  type: 'noun',
  vnMeaning: `nghia ${i}`,
  pronunciation: '',
}));

describe('buildReviewSubset', () => {
  beforeEach(() => {
    localStorage.clear();
    __resetDatabaseForTests();
  });

  it('picks ceil(40%) of the topic, most-mistaken words first', () => {
    saveVocabularyTopic('t1', words);
    recordMistakes([{ wordId: 'w3', word: 'word3', viMeaning: '', count: 5 }], 't1', 'read-write');
    recordMistakes([{ wordId: 'w7', word: 'word7', viMeaning: '', count: 2 }], 't1', 'listen-write');

    const subset = buildReviewSubset('t1');
    expect(REVIEW_SUBSET_RATIO).toBe(0.4);
    expect(subset).toHaveLength(Math.ceil(10 * REVIEW_SUBSET_RATIO)); // 4
    // Mistaken words lead; the rest fills deterministically in topic order.
    expect(subset.map((w) => w.id)).toEqual(['w3', 'w7', 'w0', 'w1']);
  });

  it('sums mistakes across training modes when ranking', () => {
    saveVocabularyTopic('t1', words);
    recordMistakes([{ wordId: 'w5', word: 'word5', viMeaning: '', count: 1 }], 't1', 'read-write');
    recordMistakes([{ wordId: 'w5', word: 'word5', viMeaning: '', count: 2 }], 't1', 'listen-write');
    recordMistakes([{ wordId: 'w2', word: 'word2', viMeaning: '', count: 2 }], 't1', 'read-write');

    const subset = buildReviewSubset('t1');
    expect(subset.slice(0, 2).map((w) => w.id)).toEqual(['w5', 'w2']); // 3 > 2
  });

  it('is deterministic with no mistakes and never empty for a non-empty topic', () => {
    saveVocabularyTopic('t1', words.slice(0, 2));
    expect(buildReviewSubset('t1').map((w) => w.id)).toEqual(['w0']); // ceil(2*0.4)=1
    expect(buildReviewSubset('missing')).toEqual([]);
  });
});
