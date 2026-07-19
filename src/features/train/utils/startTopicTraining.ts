// Seed all four training-mode sessions for a topic and return the URL of the
// first mode. Used by every "start training" entry point (vocabulary page,
// history, review tasks) so a fresh run always begins from a clean state.
import { saveTrainingSession as saveReadingSession } from '@/features/train/train-start/sessionStorage';
import { saveTrainingSession as saveListeningSession } from '@/features/train/train-listen/sessionStorage';
import { saveTrainingSession as saveReadWriteSession } from '@/features/train/train-read-write/sessionStorage';
import { saveTrainingSession as saveListenWriteSession } from '@/features/train/train-listen-write/sessionStorage';
import { createTrainingSearchParams } from './topicSession';

export type SeedTrainingOptions = {
  /** Real topic behind a virtual training set (mistakes/history/tasks target). */
  sourceTopicId?: string;
  sourceTopicLabel?: string;
  /** e.g. 'review-task' for scheduled subset reviews. */
  trainingSource?: string;
};

export const seedTopicTrainingSessions = (
  topicId: string,
  topicLabel: string,
  options?: SeedTrainingOptions,
): string => {
  const baseSession = {
    topicId,
    topicLabel,
    timestamp: Date.now(),
    ...(options?.sourceTopicId ? { sourceTopicId: options.sourceTopicId } : {}),
    ...(options?.sourceTopicLabel
      ? { sourceTopicLabel: options.sourceTopicLabel }
      : {}),
    ...(options?.trainingSource
      ? { trainingSource: options.trainingSource }
      : {}),
  };
  saveReadingSession({
    ...baseSession,
    score: 0,
    mistakes: 0,
    flipped: {},
    targetIdx: 0,
    language: 'vi',
  });
  saveListeningSession({
    ...baseSession,
    score: 0,
    mistakes: 0,
    flipped: {},
    targetIdx: 0,
    language: 'en',
    hasStarted: false,
  });
  saveReadWriteSession({
    ...baseSession,
    currentWordIndex: 0,
    completedWords: [],
    mode: 'vi-en',
    score: 0,
    mistakes: 0,
  });
  saveListenWriteSession({
    ...baseSession,
    currentWordIndex: 0,
    completedWords: [],
    mode: 'vi-en',
    score: 0,
    mistakes: 0,
    hasStarted: false,
  });
  const params = createTrainingSearchParams({
    topicId,
    sourceTopicId: options?.sourceTopicId,
    trainingSource: options?.trainingSource,
  });
  return `/train/flashcards-reading?${params.toString()}`;
};
