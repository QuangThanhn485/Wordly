// src/features/train/train-listen-write/hooks.ts
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getWords, type TrainWordItem } from './api';

export const useTrainWords = () => {
  const [searchParams] = useSearchParams();
  const fileName = searchParams.get('file');
  const [words, setWords] = useState<TrainWordItem[]>([]);
  const [isLoading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getWords(fileName || undefined).then((data) => {
      setWords(data);
      setLoading(false);
    });
  }, [fileName]);

  return { words, isLoading };
};

