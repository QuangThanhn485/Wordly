// src/features/train/train-listen-write/sessionStorage.ts
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
  currentWordIndex: number; // Index of current word being shown
  completedWords: number[]; // Array of completed word indices
  mode: 'vi-en' | 'en-vi'; // Training mode
  score: number; // Number of correct answers
  mistakes: number; // Total mistakes count
  timestamp: number; // When session was saved
  hasStarted?: boolean; // Whether user has clicked start button for current word
};

/**
 * Save the listen-write session.
 */
export const saveTrainingSession = (session: TrainingSession): void => {
  try {
    saveTrainingSessionValue('listenWrite', session);
  } catch (err) {
    console.error('Failed to save training session:', err);
  }
};

/**
 * Load the listen-write session.
 */
export const loadTrainingSession = (): TrainingSession | null => {
  try {
    const parsed = loadTrainingSessionValue<TrainingSession>('listenWrite');
    if (!parsed) return null;
    const normalized = normalizeSessionTopicReference(parsed) as TrainingSession | null;
    if (normalized && JSON.stringify(normalized) !== JSON.stringify(parsed)) {
      saveTrainingSessionValue('listenWrite', normalized);
    }
    return normalized;
  } catch (err) {
    console.error('Failed to load training session:', err);
    return null;
  }
};

/**
 * Clear the listen-write session.
 */
export const clearTrainingSession = (): void => {
  try {
    clearTrainingSessionValue('listenWrite');
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

