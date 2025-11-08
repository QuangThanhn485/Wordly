// src/features/train/train-listen-write/api.ts
import { loadVocabFile } from '@/features/vocabulary/utils/storageUtils';
import type { VocabItem } from '@/features/vocabulary/types';

export type TrainWordItem = {
  en: string; // English word
  vi: string; // Vietnamese meaning
};

export const getWords = async (fileName?: string): Promise<TrainWordItem[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      if (fileName) {
        // Load from vocabulary file
        const vocab = loadVocabFile(fileName);
        if (vocab && vocab.length > 0) {
          // Map vocab items to train word items
          const words = vocab.map(item => ({
            en: item.word,
            vi: item.vnMeaning || item.word, // Fallback to word if vnMeaning is empty
          }));
          resolve(words);
          return;
        }
      }
      // Return empty array if no file or file is empty
      resolve([]);
    }, 100);
  });
};

