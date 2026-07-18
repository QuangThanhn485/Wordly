// src/features/train/train-read-write/api.ts
import { loadVocabularyTopic } from '@/features/vocabulary/utils/storageUtils';

export type TrainWordItem = {
  id: string;
  en: string; // English word
  vi: string; // Vietnamese meaning
  type?: string;
  pronunciation?: string;
};

export const getWords = async (topicId?: string): Promise<TrainWordItem[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      if (topicId) {
        // Load the vocabulary payload for the selected topic.
        const vocab = loadVocabularyTopic(topicId);
        if (vocab && vocab.length > 0) {
          // Map vocab items to train word items
          const words = vocab.map((item, index) => ({
            id: item.id || `${topicId}:${index}`,
            en: item.word,
            vi: item.vnMeaning || item.word, // Fallback to word if vnMeaning is empty
            type: item.type,
            pronunciation: item.pronunciation,
          }));
          resolve(words);
          return;
        }
      }
      // Return no words when the topic is missing or empty.
      resolve([]);
    }, 100);
  });
};

