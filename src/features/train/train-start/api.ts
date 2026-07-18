// src/features/train/train-start/api.ts
import { loadVocabularyTopic } from '@/features/vocabulary/utils/storageUtils';

export type TrainWordItem = {
  en: string; // English word
  vi: string; // Vietnamese meaning
};

export const getWords = async (topicId?: string): Promise<TrainWordItem[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      if (topicId) {
        // Load the vocabulary payload for the selected topic.
        const vocab = loadVocabularyTopic(topicId);
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
      // Do not fall back to static words when the topic is missing or empty.
      resolve([]);
    }, 100); // Reduced delay for better UX
  });
};
