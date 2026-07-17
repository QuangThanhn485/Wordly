const LABAN_URL = 'https://dict.laban.vn/ajax/autocomplete';
const TRACAU_URL = 'https://api.tracau.vn/WBBcwnwQpV89';
const UPSTREAM_TIMEOUT_MS = 4_000;
const MAX_QUERY_LENGTH = 100;

type DictionarySource = 'laban' | 'tracau';

type UpstreamConfig = {
  url: URL;
  cacheControl: string;
};

type FunctionRequest = {
  method?: string;
  url?: string;
  headers: Record<string, string | string[] | undefined>;
};

type FunctionResponse = {
  status: (statusCode: number) => FunctionResponse;
  setHeader: (name: string, value: string) => void;
  send: (body: string) => unknown;
};

const errorResponse = (message: string, status: number) =>
  Response.json(
    { error: message },
    {
      status,
      headers: {
        'Cache-Control': 'no-store',
      },
    },
  );

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

const handleDictionaryRequest = async (request: Request): Promise<Response> => {
  const config = buildUpstreamConfig(new URL(request.url));
  if (!config) {
    return errorResponse('Invalid dictionary request.', 400);
  }

  try {
    const payload = await fetchUpstream(config.url);
    return Response.json(payload, {
      headers: {
        'Cache-Control': config.cacheControl,
        'Content-Type': 'application/json; charset=utf-8',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    console.error('Dictionary upstream request failed:', error);
    return errorResponse('Dictionary service is temporarily unavailable.', 502);
  }
};

const firstHeaderValue = (value: string | string[] | undefined): string | undefined =>
  Array.isArray(value) ? value[0] : value;

const toWebRequest = (request: FunctionRequest): Request => {
  const protocol = firstHeaderValue(request.headers['x-forwarded-proto']) ?? 'https';
  const host =
    firstHeaderValue(request.headers['x-forwarded-host']) ??
    firstHeaderValue(request.headers.host) ??
    'localhost';
  const url = new URL(request.url ?? '/', `${protocol}://${host}`);
  return new Request(url, { method: 'GET' });
};

export default async function handler(
  request: FunctionRequest,
  response: FunctionResponse,
): Promise<unknown> {
  if (request.method !== 'GET') {
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('Allow', 'GET');
    return response.status(405).send(JSON.stringify({ error: 'Method not allowed.' }));
  }

  const webResponse = await handleDictionaryRequest(toWebRequest(request));
  webResponse.headers.forEach((value, name) => {
    response.setHeader(name, value);
  });

  return response.status(webResponse.status).send(await webResponse.text());
}
