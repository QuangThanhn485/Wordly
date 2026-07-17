type LabanInputLanguage = 'en' | 'vi';

const DICTIONARY_PROXY_PATH = '/api/dictionary';
const LABAN_DIRECT_URL = 'https://dict.laban.vn/ajax/autocomplete';

const fetchJson = async <T>(url: string, signal?: AbortSignal): Promise<T> => {
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json,text/plain,*/*',
    },
    mode: 'cors',
    signal,
  });

  if (!response.ok) {
    throw new Error(`Dictionary request failed with status ${response.status}`);
  }

  return await response.json() as T;
};

export const fetchLabanAutocomplete = async <T>(
  query: string,
  inputLanguage: LabanInputLanguage,
  signal?: AbortSignal,
): Promise<T> => {
  const type = inputLanguage === 'en' ? '1' : '2';
  const params = new URLSearchParams({
    type,
    site: 'dictionary',
    query,
  });

  if (process.env.NODE_ENV === 'production') {
    params.set('source', 'laban');
    params.delete('site');
    return fetchJson<T>(`${DICTIONARY_PROXY_PATH}?${params.toString()}`, signal);
  }

  return fetchJson<T>(`${LABAN_DIRECT_URL}?${params.toString()}`, signal);
};

export const buildTracauRequestUrls = (word: string): string[] => {
  const encodedWord = encodeURIComponent(word.trim());

  if (process.env.NODE_ENV === 'production') {
    const params = new URLSearchParams({
      source: 'tracau',
      word: word.trim(),
    });
    return [`${DICTIONARY_PROXY_PATH}?${params.toString()}`];
  }

  const directUrl = `https://api.tracau.vn/WBBcwnwQpV89/s/${encodedWord}/vi`;
  return [
    directUrl,
    `https://api.allorigins.win/raw?url=${encodeURIComponent(directUrl)}`,
  ];
};
