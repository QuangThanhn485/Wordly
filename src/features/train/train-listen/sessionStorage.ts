// src/features/train/train-listen/sessionStorage.ts
// Storage utilities for training session persistence
import {
  normalizeSessionTopicReference,
  type TopicSessionReference,
} from '../utils/topicSession';

const STORAGE_KEY_TRAIN_SESSION = 'wordly_train_listen_session';

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
 * Save training session to localStorage
 */
export const saveTrainingSession = (session: TrainingSession): void => {
  try {
    localStorage.setItem(STORAGE_KEY_TRAIN_SESSION, JSON.stringify(session));
  } catch (err) {
    console.error('Failed to save training session:', err);
  }
};

/**
 * Load training session from localStorage
 */
export const loadTrainingSession = (): TrainingSession | null => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_TRAIN_SESSION);
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    const normalized = normalizeSessionTopicReference(parsed) as TrainingSession | null;
    if (normalized && JSON.stringify(normalized) !== stored) {
      localStorage.setItem(STORAGE_KEY_TRAIN_SESSION, JSON.stringify(normalized));
    }
    return normalized;
  } catch (err) {
    console.error('Failed to load training session:', err);
    return null;
  }
};

/**
 * Clear training session from localStorage
 */
export const clearTrainingSession = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEY_TRAIN_SESSION);
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

