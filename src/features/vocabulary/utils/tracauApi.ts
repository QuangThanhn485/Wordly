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

export const fetchTracauDetail = async (word: string): Promise<TracauResponse> => {
  const encoded = encodeURIComponent(word.trim());
  const res = await fetch(`${TRACAU_BASE_URL}/s/${encoded}/vi`, { method: 'GET' });

  if (!res.ok) {
    throw new Error(`Failed to fetch Tracau detail for "${word}"`);
  }

  return res.json();
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
