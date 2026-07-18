import {
  selectPronunciationAudio,
  type EnglishAccent,
} from '../src/utils/pronunciationSource';

const DICTIONARY_API_URL = 'https://api.dictionaryapi.dev/api/v2/entries/en';
const UPSTREAM_TIMEOUT_MS = 3_000;
const MAX_WORD_LENGTH = 64;
const MAX_PHONETIC_LENGTH = 100;
const MAX_PART_OF_SPEECH_LENGTH = 32;

const jsonResponse = (
  payload: unknown,
  status: number,
  cacheControl: string,
  extraHeaders: Record<string, string> = {},
) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Cache-Control': cacheControl,
      'Content-Type': 'application/json; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
      'X-Wordly-Pronunciation-Proxy': '1',
      ...extraHeaders,
    },
  });

const errorResponse = (
  message: string,
  status: number,
  cacheControl = 'no-store',
) => jsonResponse({ error: message }, status, cacheControl);

const readOptionalQuery = (
  url: URL,
  key: string,
  maxLength: number,
): string | undefined => {
  const value = url.searchParams.get(key)?.trim();
  if (!value || value.length > maxLength) return undefined;
  return value;
};

const readWord = (url: URL): string | null => {
  const word = url.searchParams
    .get('word')
    ?.trim()
    .replace(/’/g, "'")
    .toLocaleLowerCase('en');

  if (
    !word ||
    word.length > MAX_WORD_LENGTH ||
    !/^[a-z]+(?:['-][a-z]+)*$/.test(word)
  ) {
    return null;
  }
  return word;
};

const fetchDictionaryEntry = async (word: string): Promise<unknown | null> => {
  let lastError: unknown = null;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

    try {
      const response = await fetch(
        `${DICTIONARY_API_URL}/${encodeURIComponent(word)}`,
        {
          headers: {
            Accept: 'application/json',
            'User-Agent': 'Wordly-Pronunciation-Proxy/1.0',
          },
          redirect: 'follow',
          signal: controller.signal,
        },
      );

      if (response.status === 404) return null;
      if (!response.ok) {
        const retryable = response.status === 429 || response.status >= 500;
        if (!retryable) {
          throw new Error(
            `Pronunciation upstream rejected status ${response.status}`,
          );
        }
        lastError = new Error(
          `Pronunciation upstream temporarily failed with status ${response.status}`,
        );
        continue;
      }

      return await response.json();
    } catch (error) {
      lastError = error;
    } finally {
      clearTimeout(timeout);
    }
  }

  throw lastError ?? new Error('Pronunciation upstream did not respond');
};

const handlePronunciationRequest = async (requestUrl: URL): Promise<Response> => {
  if (requestUrl.searchParams.get('source') === 'health') {
    return jsonResponse(
      { ok: true, service: 'pronunciation-proxy' },
      200,
      'no-store',
    );
  }

  const word = readWord(requestUrl);
  if (!word) {
    return errorResponse('Invalid English word.', 400);
  }

  const accent: EnglishAccent =
    requestUrl.searchParams.get('accent') === 'uk' ? 'uk' : 'us';
  const phonetic = readOptionalQuery(
    requestUrl,
    'phonetic',
    MAX_PHONETIC_LENGTH,
  );
  const partOfSpeech = readOptionalQuery(
    requestUrl,
    'partOfSpeech',
    MAX_PART_OF_SPEECH_LENGTH,
  );

  try {
    const payload = await fetchDictionaryEntry(word);
    const source = payload
      ? selectPronunciationAudio(payload, {
          accent,
          phonetic,
          partOfSpeech,
        })
      : null;

    if (!source) {
      return errorResponse(
        'No matching recorded pronunciation was found.',
        404,
        'public, max-age=86400, s-maxage=604800, stale-while-revalidate=2592000',
      );
    }

    return new Response(null, {
      status: 307,
      headers: {
        'Cache-Control':
          'public, max-age=86400, s-maxage=2592000, stale-while-revalidate=7776000',
        'CDN-Cache-Control':
          'public, max-age=2592000, stale-while-revalidate=7776000',
        Location: source.url,
        'X-Content-Type-Options': 'nosniff',
        'X-Wordly-Pronunciation-Accent': source.accent ?? 'unknown',
        'X-Wordly-Pronunciation-Proxy': '1',
      },
    });
  } catch (error) {
    console.error('Pronunciation upstream request failed:', error);
    return errorResponse(
      'Pronunciation service is temporarily unavailable.',
      502,
    );
  }
};

export default {
  async fetch(request: Request): Promise<Response> {
    try {
      if (request.method !== 'GET') {
        return errorResponse('Method not allowed.', 405, 'no-store');
      }
      return await handlePronunciationRequest(new URL(request.url));
    } catch (error) {
      console.error('Unhandled pronunciation function error:', error);
      return errorResponse('Pronunciation function failed.', 500);
    }
  },
};
