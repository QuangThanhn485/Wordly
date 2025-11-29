// src/features/train/train-listen/sessionStorage.ts
// Storage utilities for training session persistence

const STORAGE_KEY_TRAIN_SESSION = 'wordly_train_listen_session';

export type TrainingSession = {
  fileName: string; // File name being trained
  sourceFileName?: string; // Original vocab file (for derived training sets)
  trainingSource?: string; // e.g. 'top-mistakes'
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
    return JSON.parse(stored);
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
 * Check if saved session matches current file
 */
export const isSessionForFile = (
  session: TrainingSession | null,
  fileName: string | null,
  trainingSource?: string | null
): boolean => {
  if (!session || !fileName) return false;
  if (session.fileName !== fileName) return false;
  if (trainingSource && session.trainingSource && session.trainingSource !== trainingSource) return false;
  return true;
};

