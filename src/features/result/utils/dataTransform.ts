// src/features/result/utils/dataTransform.ts
import { type MistakeRecord, type MistakesStats } from '@/features/train/train-read-write/mistakesStorage';

export type ProcessedMistake = {
  word: string;
  viMeaning: string;
  fileName: string;
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

export type MistakesByFile = {
  fileName: string;
  mistakes: ProcessedMistake[]; // Các từ có lỗi trong file này
  totalMistakes: number; // Tổng số lỗi trong file này
  totalWords: number; // Tổng số từ có lỗi trong file này
  mistakesByMode: Record<string, number>; // Số lỗi theo từng mode trong file này
};

export type OverviewStats = {
  totalWords: number; // Tổng số từ đã sai
  totalMistakes: number; // Tổng số lần sai
  mostMistakenWord: { word: string; count: number } | null; // Từ sai nhiều nhất
  mistakesByMode: Record<string, number>; // Số lỗi theo từng training mode
  mistakesByFile: Record<string, number>; // Số lỗi theo từng file
};

/**
 * Transform raw mistakes stats into processed format grouped by word
 */
export const processMistakesData = (stats: MistakesStats): ProcessedMistake[] => {
  const wordMap = new Map<string, ProcessedMistake>();

  Object.values(stats).forEach((record: MistakeRecord) => {
    const key = `${record.fileName}:${record.word}`;
    
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
        fileName: record.fileName,
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
      mistakesByFile: {},
    };
  }

  let totalMistakes = 0;
  let mostMistakenWord: { word: string; count: number } | null = null;
  const mistakesByMode: Record<string, number> = {};
  const mistakesByFile: Record<string, number> = {};

  processedMistakes.forEach((mistake) => {
    totalMistakes += mistake.totalMistakes;

    // Track mistakes by mode
    Object.entries(mistake.mistakesByMode).forEach(([mode, count]) => {
      mistakesByMode[mode] = (mistakesByMode[mode] || 0) + count;
    });

    // Track mistakes by file
    mistakesByFile[mistake.fileName] = 
      (mistakesByFile[mistake.fileName] || 0) + mistake.totalMistakes;

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
    mistakesByFile,
  };
};

/**
 * Get training mode display name
 */
export const getTrainingModeLabel = (mode: string): string => {
  const labels: Record<string, string> = {
    'flashcards-reading': 'Flashcards Đọc',
    'flashcards-listening': 'Flashcards Nghe',
    'read-write': 'Đọc-Viết',
    'listen-write': 'Nghe-Viết',
  };
  return labels[mode] || mode;
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

  if (days > 0) return `${days} ngày trước`;
  if (hours > 0) return `${hours} giờ trước`;
  if (minutes > 0) return `${minutes} phút trước`;
  return 'Vừa xong';
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
      const key = `${mistake.fileName}:${mistake.word}`;
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
 * Group mistakes by file name
 */
export const groupMistakesByFile = (
  processedMistakes: ProcessedMistake[]
): MistakesByFile[] => {
  const fileMap = new Map<string, ProcessedMistake[]>();

  // Group mistakes by file
  processedMistakes.forEach((mistake) => {
    if (!fileMap.has(mistake.fileName)) {
      fileMap.set(mistake.fileName, []);
    }
    fileMap.get(mistake.fileName)!.push(mistake);
  });

  // Convert to array and calculate stats
  const result: MistakesByFile[] = Array.from(fileMap.entries()).map(([fileName, mistakes]) => {
    const totalMistakes = mistakes.reduce((sum, m) => sum + m.totalMistakes, 0);
    
    // Calculate mistakes by mode for this file
    const mistakesByMode: Record<string, number> = {};
    mistakes.forEach((mistake) => {
      Object.entries(mistake.mistakesByMode).forEach(([mode, count]) => {
        mistakesByMode[mode] = (mistakesByMode[mode] || 0) + count;
      });
    });

    return {
      fileName,
      mistakes,
      totalMistakes,
      totalWords: mistakes.length,
      mistakesByMode,
    };
  });

  // Sort by total mistakes (descending)
  return result.sort((a, b) => b.totalMistakes - a.totalMistakes);
};

