import {
  getTopicLabel,
  normalizeLegacyTopicLabel,
  resolveTopicId,
} from '@/features/vocabulary/utils/storageUtils';

const STORAGE_KEY_MISTAKES_STATS = 'wordly_mistakes_stats';

export type MistakeRecord = {
  word: string;
  viMeaning: string;
  topicId: string;
  topicLabel: string;
  trainingMode: string;
  mistakeCount: number;
  lastMistakeTime: number;
};

export type MistakesStats = Record<string, MistakeRecord>;

type LegacyMistakeRecord = Partial<MistakeRecord> & {
  fileName?: string;
};

export const loadMistakesStats = (): MistakesStats => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_MISTAKES_STATS);
    if (!stored) return {};
    const rawStats = JSON.parse(stored) as Record<string, LegacyMistakeRecord>;
    const normalized: MistakesStats = {};
    let changed = false;

    Object.values(rawStats).forEach((record) => {
      if (
        !record ||
        typeof record.word !== 'string' ||
        typeof record.trainingMode !== 'string'
      ) {
        changed = true;
        return;
      }

      const legacyReference = record.topicId || record.fileName;
      const topicId = resolveTopicId(legacyReference) || legacyReference;
      if (!topicId) {
        changed = true;
        return;
      }

      const currentTopicLabel = getTopicLabel(topicId);
      const topicLabel =
        currentTopicLabel ||
        record.topicLabel ||
        normalizeLegacyTopicLabel(legacyReference);
      const normalizedRecord: MistakeRecord = {
        word: record.word,
        viMeaning: record.viMeaning || '',
        topicId,
        topicLabel,
        trainingMode: record.trainingMode,
        mistakeCount:
          typeof record.mistakeCount === 'number' ? record.mistakeCount : 0,
        lastMistakeTime:
          typeof record.lastMistakeTime === 'number'
            ? record.lastMistakeTime
            : Date.now(),
      };
      const key = `${topicId}:${record.word}:${record.trainingMode}`;
      const existing = normalized[key];
      if (existing) {
        existing.mistakeCount += normalizedRecord.mistakeCount;
        existing.lastMistakeTime = Math.max(
          existing.lastMistakeTime,
          normalizedRecord.lastMistakeTime,
        );
      } else {
        normalized[key] = normalizedRecord;
      }
      if (
        record.fileName ||
        record.topicId !== topicId ||
        record.topicLabel !== topicLabel
      ) {
        changed = true;
      }
    });

    if (changed) saveMistakesStats(normalized);
    return normalized;
  } catch (error) {
    console.error('Failed to load mistake statistics:', error);
    return {};
  }
};

export const saveMistakesStats = (stats: MistakesStats): void => {
  try {
    localStorage.setItem(STORAGE_KEY_MISTAKES_STATS, JSON.stringify(stats));
  } catch (error) {
    console.error('Failed to save mistake statistics:', error);
  }
};

export const recordMistakes = (
  mistakes: Array<{ word: string; viMeaning: string; count: number }>,
  topicId: string,
  trainingMode: string,
): void => {
  const stats = loadMistakesStats();
  const topicLabel = getTopicLabel(topicId) || topicId;

  mistakes.forEach(({ word, viMeaning, count }) => {
    const key = `${topicId}:${word}:${trainingMode}`;
    const existing = stats[key];

    if (existing) {
      existing.mistakeCount += count;
      existing.lastMistakeTime = Date.now();
      existing.topicLabel = topicLabel;
    } else {
      stats[key] = {
        word,
        viMeaning,
        topicId,
        topicLabel,
        trainingMode,
        mistakeCount: count,
        lastMistakeTime: Date.now(),
      };
    }
  });

  saveMistakesStats(stats);
};

export const getWordMistakeStats = (
  topicId: string,
  word: string,
  trainingMode: string,
): MistakeRecord | null => {
  const stats = loadMistakesStats();
  return stats[`${topicId}:${word}:${trainingMode}`] || null;
};
