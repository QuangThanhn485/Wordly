// src/features/train/train-start/hooks.ts
import { useEffect, useState } from 'react';
import { getWords } from './api';

export const useTrainWords = () => {
  const [words, setWords] = useState<string[]>([]);
  const [isLoading, setLoading] = useState(true);

  useEffect(() => {
    getWords().then((data) => {
      setWords(data);
      setLoading(false);
    });
  }, []);

  return { words, isLoading };
};
