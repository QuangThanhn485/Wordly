const LABAN_URL = 'https://dict.laban.vn/ajax/autocomplete';
const TRACAU_URL = 'https://api.tracau.vn/WBBcwnwQpV89';
const UPSTREAM_TIMEOUT_MS = 4_000;
const MAX_QUERY_LENGTH = 100;

type DictionarySource = 'laban' | 'tracau';

type UpstreamConfig = {
  url: URL;
  cacheControl: string;
};

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
      'X-Wordly-Dictionary-Proxy': '1',
      ...extraHeaders,
    },
  });

const errorResponse = (message: string, status: number) =>
  jsonResponse({ error: message }, status, 'no-store');

const readQuery = (url: URL, key: string): string | null => {
  const value = url.searchParams.get(key)?.trim();
  if (!value || value.length > MAX_QUERY_LENGTH) return null;
  return value;
};

const buildUpstreamConfig = (requestUrl: URL): UpstreamConfig | null => {
  const source = requestUrl.searchParams.get('source') as DictionarySource | null;

  if (source === 'laban') {
    const query = readQuery(requestUrl, 'query');
    const type = requestUrl.searchParams.get('type');
    if (!query || (type !== '1' && type !== '2')) return null;

    const url = new URL(LABAN_URL);
    url.searchParams.set('type', type);
    url.searchParams.set('site', 'dictionary');
    url.searchParams.set('query', query);

    return {
      url,
      cacheControl: 'public, s-maxage=3600, stale-while-revalidate=86400',
    };
  }

  if (source === 'tracau') {
    const word = readQuery(requestUrl, 'word');
    if (!word) return null;

    return {
      url: new URL(`${TRACAU_URL}/s/${encodeURIComponent(word)}/vi`),
      cacheControl: 'public, s-maxage=604800, stale-while-revalidate=2592000',
    };
  }

  return null;
};

const fetchUpstream = async (url: URL): Promise<unknown> => {
  let lastError: unknown = null;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        headers: {
          Accept: 'application/json,text/plain;q=0.9,*/*;q=0.8',
          'User-Agent': 'Wordly-Dictionary-Proxy/1.0',
        },
        redirect: 'follow',
        signal: controller.signal,
      });

      if (!response.ok) {
        const retryable = response.status === 429 || response.status >= 500;
        if (!retryable) {
          throw new Error(`Upstream rejected the request with status ${response.status}`);
        }
        lastError = new Error(`Upstream temporarily failed with status ${response.status}`);
        continue;
      }

      const body = await response.text();
      return JSON.parse(body);
    } catch (error) {
      lastError = error;
    } finally {
      clearTimeout(timeout);
    }
  }

  throw lastError ?? new Error('Dictionary upstream did not respond');
};

const handleDictionaryRequest = async (requestUrl: URL): Promise<Response> => {
  if (requestUrl.searchParams.get('source') === 'health') {
    return jsonResponse({ ok: true, service: 'dictionary-proxy' }, 200, 'no-store');
  }

  const config = buildUpstreamConfig(requestUrl);
  if (!config) {
    return errorResponse('Invalid dictionary request.', 400);
  }

  try {
    const payload = await fetchUpstream(config.url);
    return jsonResponse(payload, 200, config.cacheControl);
  } catch (error) {
    console.error('Dictionary upstream request failed:', error);
    return errorResponse('Dictionary service is temporarily unavailable.', 502);
  }
};

export default {
  async fetch(request: Request): Promise<Response> {
    try {
      if (request.method !== 'GET') {
        return jsonResponse(
          { error: 'Method not allowed.' },
          405,
          'no-store',
          { Allow: 'GET' },
        );
      }

      return await handleDictionaryRequest(new URL(request.url));
    } catch (error) {
      console.error('Unhandled dictionary function error:', error);
      return errorResponse('Dictionary function failed.', 500);
    }
  },
};
