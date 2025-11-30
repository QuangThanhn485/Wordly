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
const CORS_PROXY = 'https://cors.isomorphic-git.org/';

const buildTracauUrl = (word: string) => {
  const encoded = encodeURIComponent(word.trim());
  return `${TRACAU_BASE_URL}/s/${encoded}/vi`;
};

export const fetchTracauDetail = async (word: string): Promise<TracauResponse> => {
  const url = buildTracauUrl(word);

  const tryFetch = async (targetUrl: string) => {
    const res = await fetch(targetUrl, { method: 'GET', mode: 'cors' });
    if (!res.ok) {
      throw new Error(`Failed to fetch Tracau detail for "${word}"`);
    }
    return res.json();
  };

  try {
    return await tryFetch(url);
  } catch (err) {
    // Fallback via public CORS proxy for environments blocking direct calls
    return await tryFetch(`${CORS_PROXY}${url}`);
  }
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
