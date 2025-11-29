import { useCallback, useEffect, useState } from 'react';
import { fetchTracauDetail, type TracauResponse } from '../utils/tracauApi';

export const useTracauDetail = (word: string | null, enabled = true) => {
  const [data, setData] = useState<TracauResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!word || !enabled) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetchTracauDetail(word);
      setData(res);
    } catch (err) {
      setError('Không tải được dữ liệu từ điển.');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [word, enabled]);

  useEffect(() => {
    if (!word || !enabled) {
      setData(null);
      setError(null);
      setLoading(false);
      return;
    }
    void load();
  }, [word, enabled, load]);

  return {
    data,
    loading,
    error,
    retry: load,
  };
};
