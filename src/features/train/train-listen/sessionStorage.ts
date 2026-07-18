// src/features/train/train-listen/sessionStorage.ts
// Storage utilities for training session persistence
import {
  normalizeSessionTopicReference,
  type TopicSessionReference,
} from '../utils/topicSession';
import {
  clearTrainingSessionValue,
  loadTrainingSessionValue,
  saveTrainingSessionValue,
} from '@/data';

export type TrainingSession = TopicSessionReference & {
  score: number;
  mistakes: number;
  flipped: Record<number, boolean>; // Index -> true if flipped
  targetIdx: number;
  language: 'vi' | 'en';
  timestamp: number; // When session was saved
  hasStarted: boolean; // Whether user has clicked start button
};

/**
 * Save the listening flashcard session.
 */
export const saveTrainingSession = (session: TrainingSession): void => {
  try {
    saveTrainingSessionValue('flashcardsListening', session);
  } catch (err) {
    console.error('Failed to save training session:', err);
  }
};

/**
 * Load the listening flashcard session.
 */
export const loadTrainingSession = (): TrainingSession | null => {
  try {
    const parsed = loadTrainingSessionValue<TrainingSession>('flashcardsListening');
    if (!parsed) return null;
    const normalized = normalizeSessionTopicReference(parsed) as TrainingSession | null;
    if (normalized && JSON.stringify(normalized) !== JSON.stringify(parsed)) {
      saveTrainingSessionValue('flashcardsListening', normalized);
    }
    return normalized;
  } catch (err) {
    console.error('Failed to load training session:', err);
    return null;
  }
};

/**
 * Clear the listening flashcard session.
 */
export const clearTrainingSession = (): void => {
  try {
    clearTrainingSessionValue('flashcardsListening');
  } catch (err) {
    console.error('Failed to clear training session:', err);
  }
};

/**
 * Check if the saved session matches the current topic.
 */
export const isSessionForTopic = (
  session: TrainingSession | null,
  topicId: string | null,
  trainingSource?: string | null
): boolean => {
  if (!session || !topicId) return false;
  if (session.topicId !== topicId) return false;
  if (trainingSource && session.trainingSource && session.trainingSource !== trainingSource) return false;
  return true;
};

