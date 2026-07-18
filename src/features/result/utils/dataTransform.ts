// src/features/result/utils/dataTransform.ts
import i18n from '@/i18n';
import { type MistakeRecord, type MistakesStats } from '@/features/train/train-read-write/mistakesStorage';

export type ProcessedMistake = {
  word: string;
  viMeaning: string;
  topicId: string;
  topicLabel: string;
  totalMistakes: number; // Tổng số lỗi qua tất cả training modes
  lastMistakeTime: number; // Thời gian sai gần nhất
  mistakesByMode: Record<string, number>; // Số lỗi theo từng mode
  allModes: string[]; // Tất cả các modes mà từ này đã sai
};

export type MistakesByMode = {
  mode: string;
  label: string;
  mistakes: ProcessedMistake[]; // Chỉ các từ có lỗi trong mode này
  totalMistakes: number; // Tổng số lỗi trong mode này
  totalWords: number; // Tổng số từ có lỗi trong mode này
};

export type MistakesByTopic = {
  topicId: string;
  topicLabel: string;
  mistakes: ProcessedMistake[]; // Các từ có lỗi trong chủ đề này
  totalMistakes: number; // Tổng số lỗi trong chủ đề này
  totalWords: number; // Tổng số từ có lỗi trong chủ đề này
  mistakesByMode: Record<string, number>; // Số lỗi theo từng mode trong chủ đề này
};

export type OverviewStats = {
  totalWords: number; // Tổng số từ đã sai
  totalMistakes: number; // Tổng số lần sai
  mostMistakenWord: { word: string; count: number } | null; // Từ sai nhiều nhất
  mistakesByMode: Record<string, number>; // Số lỗi theo từng training mode
  mistakesByTopic: Record<string, number>; // Số lỗi theo từng chủ đề
};

/**
 * Transform raw mistakes stats into processed format grouped by word
 */
export const processMistakesData = (stats: MistakesStats): ProcessedMistake[] => {
  const wordMap = new Map<string, ProcessedMistake>();

  Object.values(stats).forEach((record: MistakeRecord) => {
    const key = `${record.topicId}:${record.word}`;
    
    if (wordMap.has(key)) {
      const existing = wordMap.get(key)!;
      existing.totalMistakes += record.mistakeCount;
      existing.mistakesByMode[record.trainingMode] = 
        (existing.mistakesByMode[record.trainingMode] || 0) + record.mistakeCount;
      
      // Update last mistake time if this is more recent
      if (record.lastMistakeTime > existing.lastMistakeTime) {
        existing.lastMistakeTime = record.lastMistakeTime;
      }
      
      // Add mode if not already in list
      if (!existing.allModes.includes(record.trainingMode)) {
        existing.allModes.push(record.trainingMode);
      }
    } else {
      wordMap.set(key, {
        word: record.word,
        viMeaning: record.viMeaning,
        topicId: record.topicId,
        topicLabel: record.topicLabel,
        totalMistakes: record.mistakeCount,
        lastMistakeTime: record.lastMistakeTime,
        mistakesByMode: {
          [record.trainingMode]: record.mistakeCount,
        },
        allModes: [record.trainingMode],
      });
    }
  });

  return Array.from(wordMap.values());
};

/**
 * Calculate overview statistics
 */
export const calculateOverviewStats = (processedMistakes: ProcessedMistake[]): OverviewStats => {
  if (processedMistakes.length === 0) {
    return {
      totalWords: 0,
      totalMistakes: 0,
      mostMistakenWord: null,
      mistakesByMode: {},
      mistakesByTopic: {},
    };
  }

  let totalMistakes = 0;
  let mostMistakenWord: { word: string; count: number } | null = null;
  const mistakesByMode: Record<string, number> = {};
  const mistakesByTopic: Record<string, number> = {};

  processedMistakes.forEach((mistake) => {
    totalMistakes += mistake.totalMistakes;

    // Track mistakes by mode
    Object.entries(mistake.mistakesByMode).forEach(([mode, count]) => {
      mistakesByMode[mode] = (mistakesByMode[mode] || 0) + count;
    });

    // Track mistakes by topic
    mistakesByTopic[mistake.topicId] =
      (mistakesByTopic[mistake.topicId] || 0) + mistake.totalMistakes;

    // Track most mistaken word
    if (!mostMistakenWord || mistake.totalMistakes > mostMistakenWord.count) {
      mostMistakenWord = {
        word: mistake.word,
        count: mistake.totalMistakes,
      };
    }
  });

  return {
    totalWords: processedMistakes.length,
    totalMistakes,
    mostMistakenWord,
    mistakesByMode,
    mistakesByTopic,
  };
};

/**
 * Get training mode display name
 */
export const getTrainingModeLabel = (mode: string): string => {
  const modeKey = {
    'flashcards-reading': 'flashcardsReading',
    'flashcards-listening': 'flashcardsListening',
    'read-write': 'readWrite',
    'listen-write': 'listenWrite',
  } as const;

  const key = modeKey[mode as keyof typeof modeKey];
  return key ? i18n.t(`result:modes.${key}`) : mode;
};

/**
 * Get training mode icon (Material-UI icon name)
 */
export const getTrainingModeIcon = (mode: string): string => {
  const icons: Record<string, string> = {
    'flashcards-reading': 'AutoStories',
    'flashcards-listening': 'Headphones',
    'read-write': 'Edit',
    'listen-write': 'KeyboardVoice',
  };
  return icons[mode] || 'Help';
};

/**
 * Format time ago
 */
export const formatTimeAgo = (timestamp: number): string => {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return i18n.t('common:time.daysAgo', { count: days });
  if (hours > 0) return i18n.t('common:time.hoursAgo', { count: hours });
  if (minutes > 0) return i18n.t('common:time.minutesAgo', { count: minutes });
  return i18n.t('common:time.justNow');
};

/**
 * Get mistake severity level
 */
export const getMistakeSeverity = (count: number): 'low' | 'medium' | 'high' => {
  if (count >= 5) return 'high';
  if (count >= 2) return 'medium';
  return 'low';
};

/**
 * Group mistakes by training mode
 */
export const groupMistakesByMode = (
  processedMistakes: ProcessedMistake[]
): MistakesByMode[] => {
  const modeMap = new Map<string, ProcessedMistake[]>();

  // Group mistakes by mode
  processedMistakes.forEach((mistake) => {
    mistake.allModes.forEach((mode) => {
      if (!modeMap.has(mode)) {
        modeMap.set(mode, []);
      }
      modeMap.get(mode)!.push(mistake);
    });
  });

  // Convert to array and calculate stats
  const result: MistakesByMode[] = Array.from(modeMap.entries()).map(([mode, mistakes]) => {
    // Remove duplicates (same word can appear in multiple modes)
    const uniqueMistakes = new Map<string, ProcessedMistake>();
    mistakes.forEach((mistake) => {
      const key = `${mistake.topicId}:${mistake.word}`;
      if (!uniqueMistakes.has(key)) {
        uniqueMistakes.set(key, mistake);
      }
    });

    const uniqueMistakesArray = Array.from(uniqueMistakes.values());
    const totalMistakes = uniqueMistakesArray.reduce(
      (sum, m) => sum + (m.mistakesByMode[mode] || 0),
      0
    );

    return {
      mode,
      label: getTrainingModeLabel(mode),
      mistakes: uniqueMistakesArray,
      totalMistakes,
      totalWords: uniqueMistakesArray.length,
    };
  });

  // Sort by total mistakes (descending)
  return result.sort((a, b) => b.totalMistakes - a.totalMistakes);
};

/**
 * Group mistakes by topic
 */
export const groupMistakesByTopic = (
  processedMistakes: ProcessedMistake[]
): MistakesByTopic[] => {
  const topicMap = new Map<string, ProcessedMistake[]>();

  // Group mistakes by topic
  processedMistakes.forEach((mistake) => {
    if (!topicMap.has(mistake.topicId)) {
      topicMap.set(mistake.topicId, []);
    }
    topicMap.get(mistake.topicId)!.push(mistake);
  });

  // Convert to array and calculate stats
  const result: MistakesByTopic[] = Array.from(topicMap.entries()).map(([topicId, mistakes]) => {
    const totalMistakes = mistakes.reduce((sum, m) => sum + m.totalMistakes, 0);
    
    // Calculate mistakes by mode for this topic
    const mistakesByMode: Record<string, number> = {};
    mistakes.forEach((mistake) => {
      Object.entries(mistake.mistakesByMode).forEach(([mode, count]) => {
        mistakesByMode[mode] = (mistakesByMode[mode] || 0) + count;
      });
    });

    return {
      topicId,
      topicLabel: mistakes[0]?.topicLabel || topicId,
      mistakes,
      totalMistakes,
      totalWords: mistakes.length,
      mistakesByMode,
    };
  });

  // Sort by total mistakes (descending)
  return result.sort((a, b) => b.totalMistakes - a.totalMistakes);
};
