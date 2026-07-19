// Scheduled review-stage training: instead of the whole topic, a review task
// trains only the top-40% most-mistaken words (ranked from the mistake
// statistics) to keep the spaced-repetition cycle light. The subset is stored
// as a virtual training set; sessions carry the real topic as sourceTopicId
// and the `review-task` source so mistakes, history and task completion all
// land on the real topic (see applyTrainingRunToTasks eligibility rules).
import { loadMistakesStats } from '@/features/train/train-start/mistakesStorage';
import { seedTopicTrainingSessions } from '@/features/train/utils/startTopicTraining';
import {
  loadVocabularyTopic,
  saveTrainingVocabularySet,
} from '@/features/vocabulary/utils/storageUtils';
import type { VocabItem } from '@/features/vocabulary/types';
import { REVIEW_TASK_SOURCE } from './tasksStorage';

/** Share of the topic carried into each review stage. */
export const REVIEW_SUBSET_RATIO = 0.4;

const REVIEW_SET_PREFIX = '__review_task__';

const hashString = (value: string): string => {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
};

/**
 * The topic's review subset: ceil(40%) of its words (at least one), the
 * most-mistaken first (total mistakes across modes, then most recent mistake,
 * then original order — fully deterministic even with no mistakes recorded).
 */
export const buildReviewSubset = (topicId: string): VocabItem[] => {
  const words = loadVocabularyTopic(topicId) ?? [];
  if (words.length === 0) return [];

  const totals = new Map<string, { count: number; last: number }>();
  Object.values(loadMistakesStats()).forEach((record) => {
    if (record.topicId !== topicId) return;
    const entry = totals.get(record.wordId) ?? { count: 0, last: 0 };
    entry.count += record.mistakeCount;
    entry.last = Math.max(entry.last, record.lastMistakeTime);
    totals.set(record.wordId, entry);
  });

  const take = Math.max(1, Math.ceil(words.length * REVIEW_SUBSET_RATIO));
  return words
    .map((word, index) => {
      const entry = word.id ? totals.get(word.id) : undefined;
      return { word, index, count: entry?.count ?? 0, last: entry?.last ?? 0 };
    })
    .sort((a, b) => b.count - a.count || b.last - a.last || a.index - b.index)
    .slice(0, take)
    .map((entry) => entry.word);
};

/**
 * Materialise the subset as a virtual training set, seed all four sessions
 * for it and return the training URL. Null when the topic has no words.
 */
export const startReviewTraining = (
  topicId: string,
  topicLabel: string,
): string | null => {
  const subset = buildReviewSubset(topicId);
  if (subset.length === 0) return null;
  const setId = `${REVIEW_SET_PREFIX}${hashString(topicId)}`;
  saveTrainingVocabularySet(setId, subset);
  return seedTopicTrainingSessions(setId, topicLabel, {
    sourceTopicId: topicId,
    sourceTopicLabel: topicLabel,
    trainingSource: REVIEW_TASK_SOURCE,
  });
};
