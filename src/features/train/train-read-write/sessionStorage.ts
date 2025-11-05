// src/features/train/train-read-write/sessionStorage.ts
// Storage utilities for training session persistence

const STORAGE_KEY_TRAIN_RW_SESSION = 'wordly_train_rw_session';

export type TrainingSession = {
  fileName: string; // File name being trained
  currentWordIndex: number; // Index of current word being shown
  completedWords: number[]; // Array of completed word indices
  mode: 'vi-en' | 'en-vi'; // Training mode
  score: number; // Number of correct answers
  mistakes: number; // Total mistakes count
  timestamp: number; // When session was saved
};

/**
 * Save training session to localStorage
 */
export const saveTrainingSession = (session: TrainingSession): void => {
  try {
    localStorage.setItem(STORAGE_KEY_TRAIN_RW_SESSION, JSON.stringify(session));
  } catch (err) {
    console.error('Failed to save training session:', err);
  }
};

/**
 * Load training session from localStorage
 */
export const loadTrainingSession = (): TrainingSession | null => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_TRAIN_RW_SESSION);
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
    localStorage.removeItem(STORAGE_KEY_TRAIN_RW_SESSION);
  } catch (err) {
    console.error('Failed to clear training session:', err);
  }
};

/**
 * Check if saved session matches current file
 */
export const isSessionForFile = (session: TrainingSession | null, fileName: string | null): boolean => {
  if (!session || !fileName) return false;
  return session.fileName === fileName;
};

