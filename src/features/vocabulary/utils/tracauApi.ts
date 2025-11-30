import type { VocabItem } from '../types';

export type TracauSentence = {
  _id: string;
  fields: {
    en: string;
    vi: string;
  };
};

export type TracauEntry = {
  fields: {
    fulltext: string;
  };
};

export type TracauResponse = {
  language?: string;
  sentences?: TracauSentence[];
  suggestions?: unknown[];
  tratu?: TracauEntry[];
};

const TRACAU_BASE_URL = 'https://api.tracau.vn/WBBcwnwQpV89';

// Proxy fallbacks to bypass CORS in production environments
const PROXIES: Array<(url: string) => string> = [
  (url) => url, // direct
  (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  (url) => `https://thingproxy.freeboard.io/fetch/${url}`,
  (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  (url) => `https://yacdn.org/proxy/${url}`,
  (url) => `https://proxy.cors.sh/${url}`,
  (url) => `https://cors.isomorphic-git.org/${url}`,
  (url) => `https://jsonp.afeld.me/?url=${encodeURIComponent(url)}`,
];

const buildTracauUrl = (word: string) => {
  const encoded = encodeURIComponent(word.trim());
  return `${TRACAU_BASE_URL}/s/${encoded}/vi`;
};

export const fetchTracauDetail = async (word: string): Promise<TracauResponse> => {
  const url = buildTracauUrl(word);

  let lastError: unknown = null;
  for (const proxify of PROXIES) {
    const targetUrl = proxify(url);
    try {
      const res = await fetch(targetUrl, {
        method: 'GET',
        headers: {
          Accept: 'application/json,text/plain,*/*',
          'X-Requested-With': 'XMLHttpRequest',
        },
        cache: 'no-store',
        mode: 'cors',
      });
      if (!res.ok) {
        throw new Error(`Failed with status ${res.status}`);
      }
      return await res.json();
    } catch (err) {
      lastError = err;
      // try next proxy
    }
  }

  throw lastError ?? new Error(`Failed to fetch Tracau detail for "${word}"`);
};

/**
 * Minimal sanitizer for Tracau HTML payload:
 * - strips script/style/iframe/object/embed tags
 * - removes inline event handlers to avoid execution
 */
export const sanitizeTracauHtml = (html?: string): string => {
  if (!html) return '';

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    doc.querySelectorAll('script, style, iframe, object, embed, svg').forEach((el) => el.remove());
    doc.body.querySelectorAll('*').forEach((el) => {
      Array.from(el.attributes).forEach((attr) => {
        if (attr.name.toLowerCase().startsWith('on')) {
          el.removeAttribute(attr.name);
        }
      });
    });

    return doc.body.innerHTML;
  } catch (err) {
    console.warn('Failed to sanitize Tracau HTML', err);
    return html;
  }
};

export type VocabDetailItem = VocabItem;
