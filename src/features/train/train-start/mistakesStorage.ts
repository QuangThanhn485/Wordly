import {
  getTopicLabel,
  normalizeLegacyTopicLabel,
  resolveTopicId,
} from '@/features/vocabulary/utils/storageUtils';
import {
  DATABASE_KEYS,
  readDatabaseValue,
  removeDatabaseValue,
  writeDatabaseValue,
} from '@/data';

export type MistakeRecord = {
  wordId: string;
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
    const rawStats = readDatabaseValue<Record<string, LegacyMistakeRecord>>(
      DATABASE_KEYS.mistakes,
      {},
    );
    const normalized: MistakesStats = {};
    let changed = false;

    Object.values(rawStats).forEach((record) => {
      if (
        !record ||
        typeof record.wordId !== 'string' ||
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
        wordId: record.wordId,
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
      const key = `${topicId}:${record.wordId}:${record.trainingMode}`;
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
    if (Object.keys(stats).length === 0) {
      removeDatabaseValue(DATABASE_KEYS.mistakes);
    } else {
      writeDatabaseValue(DATABASE_KEYS.mistakes, stats);
    }
  } catch (error) {
    console.error('Failed to save mistake statistics:', error);
  }
};

export const recordMistakes = (
  mistakes: Array<{
    wordId: string;
    word: string;
    viMeaning: string;
    count: number;
  }>,
  topicId: string,
  trainingMode: string,
): void => {
  const stats = loadMistakesStats();
  const topicLabel = getTopicLabel(topicId) || topicId;

  mistakes.forEach(({ wordId, word, viMeaning, count }) => {
    const key = `${topicId}:${wordId}:${trainingMode}`;
    const existing = stats[key];

    if (existing) {
      existing.mistakeCount += count;
      existing.lastMistakeTime = Date.now();
      existing.topicLabel = topicLabel;
    } else {
      stats[key] = {
        wordId,
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
  wordId: string,
  trainingMode: string,
): MistakeRecord | null => {
  const stats = loadMistakesStats();
  return stats[`${topicId}:${wordId}:${trainingMode}`] || null;
};
