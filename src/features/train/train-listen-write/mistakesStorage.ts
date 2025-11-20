// src/features/train/train-listen-write/mistakesStorage.ts
// Storage utilities for tracking mistakes statistics (cumulative)
// Uses the same storage key as other training modes

import { trackedSetItem } from '@/utils/storageTracker';

const STORAGE_KEY_MISTAKES_STATS = 'wordly_mistakes_stats';

export type MistakeRecord = {
  word: string; // English word
  viMeaning: string; // Vietnamese meaning
  fileName: string; // File containing the word
  trainingMode: string; // Training mode (e.g., 'listen-write')
  mistakeCount: number; // Cumulative mistake count for this word in this mode
  lastMistakeTime: number; // Timestamp of last mistake
};

export type MistakesStats = Record<string, MistakeRecord>; // key: `${fileName}:${word}:${trainingMode}`

/**
 * Get mistake statistics from localStorage
 */
export const loadMistakesStats = (): MistakesStats => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_MISTAKES_STATS);
    return stored ? JSON.parse(stored) : {};
  } catch (err) {
    console.error('Failed to load mistakes stats:', err);
    return {};
  }
};

/**
 * Save mistake statistics to localStorage
 */
export const saveMistakesStats = (stats: MistakesStats): void => {
  try {
    trackedSetItem(STORAGE_KEY_MISTAKES_STATS, JSON.stringify(stats));
  } catch (err) {
    console.error('Failed to save mistakes stats:', err);
  }
};

/**
 * Record mistakes from a training session
 * @param mistakes List of mistakes with word info and count for current session
 * @param fileName File name being trained
 * @param trainingMode Training mode identifier
 */
export const recordMistakes = (
  mistakes: Array<{ word: string; viMeaning: string; count: number }>,
  fileName: string,
  trainingMode: string
): void => {
  const stats = loadMistakesStats();

  mistakes.forEach(({ word, viMeaning, count }) => {
    const key = `${fileName}:${word}:${trainingMode}`;
    const existing = stats[key];

    if (existing) {
      // Update existing record (cumulative)
      existing.mistakeCount += count;
      existing.lastMistakeTime = Date.now();
    } else {
      // Create new record
      stats[key] = {
        word,
        viMeaning,
        fileName,
        trainingMode,
        mistakeCount: count,
        lastMistakeTime: Date.now(),
      };
    }
  });

  saveMistakesStats(stats);
};

/**
 * Get mistake statistics for a specific word in a specific file and mode
 */
export const getWordMistakeStats = (
  fileName: string,
  word: string,
  trainingMode: string
): MistakeRecord | null => {
  const stats = loadMistakesStats();
  const key = `${fileName}:${word}:${trainingMode}`;
  return stats[key] || null;
};

