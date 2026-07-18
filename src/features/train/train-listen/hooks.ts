// src/features/train/train-listen/hooks.ts
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getWords, type TrainWordItem } from './api';
import { getTrainingTopicParams } from '../utils/topicSession';

export const useTrainWords = () => {
  const [searchParams] = useSearchParams();
  const { topicId } = getTrainingTopicParams(searchParams);
  const [words, setWords] = useState<TrainWordItem[]>([]);
  const [isLoading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getWords(topicId || undefined).then((data) => {
      setWords(data);
      setLoading(false);
    });
  }, [topicId]);

  return { words, isLoading };
};

