// src/features/train/train-start/api.ts
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
      // Fallback to default data if no file or file is empty
      resolve([
        { en: 'apple', vi: 'quả táo' },
        { en: 'banana', vi: 'quả chuối' },
        { en: 'orange', vi: 'quả cam' },
        { en: 'cat', vi: 'con mèo' },
        { en: 'dog', vi: 'con chó' },
        { en: 'book', vi: 'cuốn sách' },
      ]);
    }, 100); // Reduced delay for better UX
  });
};
