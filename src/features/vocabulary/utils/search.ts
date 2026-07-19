// Vocabulary search utilities.
//
// Design goals (see docs/KIEN_TRUC_DU_LIEU.md for the data model):
// - Folders and topics are searched from the in-memory catalog/tree only, so a
//   name search never reads a single topic word record.
// - Vocabulary search only scans topics inside the requested folder scope and
//   reuses already loaded topic data. The heavy per-word work (Unicode folding)
//   is done once per query, not once per keystroke.
// - Vietnamese diacritics are handled with an optional, length-preserving fold
//   so accent-insensitive matches still map back to the original text for
//   highlighting.

import type { FolderNode, TopicItem, VocabItem } from '../types';

export type SearchScopes = {
  folders: boolean;
  topics: boolean;
  vocab: boolean;
};

export type SearchOptions = {
  caseSensitive: boolean;
  diacriticSensitive: boolean;
};

/** A folder or topic node together with its full id path from the tree root. */
export type ScopeEntry = {
  node: FolderNode | TopicItem;
  path: string[];
};

export type FolderSearchResult = {
  kind: 'folder';
  id: string;
  label: string;
  path: string[];
};

export type TopicSearchResult = {
  kind: 'topic';
  id: string;
  label: string;
  path: string[];
};

export type VocabSearchResult = {
  kind: 'vocab';
  topicId: string;
  topicPath: string[];
  item: VocabItem;
  /** Which field produced the match (word wins over meaning). */
  field: 'word' | 'meaning';
};

// Unicode combining diacritical marks (U+0300–U+036F) left behind by NFD.
const COMBINING_MARKS = new RegExp('[\\u0300-\\u036f]', 'g');

/**
 * Strip Vietnamese (and general Latin) diacritics without changing string
 * length for the common case. Each precomposed Vietnamese vowel decomposes to a
 * single base letter plus combining marks; removing the marks keeps a 1:1 char
 * mapping, which is what lets {@link getHighlightRange} map back to the source.
 * `đ`/`Đ` are not decomposable in Unicode, so they are replaced explicitly.
 */
export const foldDiacritics = (input: string): string =>
  input
    .normalize('NFD')
    .replace(COMBINING_MARKS, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');

export type Normalizer = (value: string) => string;

/**
 * Build a single normalizer for the chosen options. Created once per search and
 * reused for every candidate string.
 */
export const makeNormalizer = (options: SearchOptions): Normalizer => {
  const { caseSensitive, diacriticSensitive } = options;
  if (caseSensitive && diacriticSensitive) {
    return (value) => value;
  }
  return (value) => {
    let result = value;
    if (!diacriticSensitive) result = foldDiacritics(result);
    if (!caseSensitive) result = result.toLowerCase();
    return result;
  };
};

/**
 * Collect every descendant folder and topic of `scope` with its full id path.
 * O(number of nodes in the subtree); reads no word records.
 */
export const collectScopeEntries = (
  scope: FolderNode,
  scopePath: string[],
): { folders: ScopeEntry[]; topics: ScopeEntry[] } => {
  const folders: ScopeEntry[] = [];
  const topics: ScopeEntry[] = [];

  const visit = (node: FolderNode, path: string[]): void => {
    for (const child of node.children) {
      const childPath = [...path, child.id];
      if (child.kind === 'folder') {
        folders.push({ node: child, path: childPath });
        visit(child, childPath);
      } else {
        topics.push({ node: child, path: childPath });
      }
    }
  };

  visit(scope, scopePath);
  return { folders, topics };
};

/** True when `haystack` (already raw) contains the normalized query. */
export const matchesLabel = (
  label: string,
  normalizedQuery: string,
  normalize: Normalizer,
): boolean => normalize(label).includes(normalizedQuery);

export const searchFolders = (
  entries: ScopeEntry[],
  normalizedQuery: string,
  normalize: Normalizer,
): FolderSearchResult[] =>
  entries
    .filter((entry) => matchesLabel(entry.node.label, normalizedQuery, normalize))
    .map((entry) => ({
      kind: 'folder',
      id: entry.node.id,
      label: entry.node.label,
      path: entry.path,
    }));

export const searchTopics = (
  entries: ScopeEntry[],
  normalizedQuery: string,
  normalize: Normalizer,
): TopicSearchResult[] =>
  entries
    .filter((entry) => matchesLabel(entry.node.label, normalizedQuery, normalize))
    .map((entry) => ({
      kind: 'topic',
      id: entry.node.id,
      label: entry.node.label,
      path: entry.path,
    }));

/** Which vocabulary field(s) a search should look at. */
export type VocabTarget = 'word' | 'meaning' | 'both';

/**
 * Scan one topic's words for matches. `target` selects the English word field,
 * the Vietnamese meaning field, or both. When both are scanned, `word` takes
 * priority so a single item never produces two rows.
 */
export const searchTopicVocab = (
  items: VocabItem[],
  topicId: string,
  topicPath: string[],
  normalizedQuery: string,
  normalize: Normalizer,
  target: VocabTarget = 'both',
): VocabSearchResult[] => {
  const checkWord = target !== 'meaning';
  const checkMeaning = target !== 'word';
  const results: VocabSearchResult[] = [];
  for (const item of items) {
    if (checkWord && normalize(item.word).includes(normalizedQuery)) {
      results.push({ kind: 'vocab', topicId, topicPath, item, field: 'word' });
    } else if (
      checkMeaning &&
      item.vnMeaning &&
      normalize(item.vnMeaning).includes(normalizedQuery)
    ) {
      results.push({ kind: 'vocab', topicId, topicPath, item, field: 'meaning' });
    }
  }
  return results;
};

/**
 * Find the [start, end) range of the match inside the ORIGINAL string so the UI
 * can highlight it. Returns null when the fold changed the string length (rare,
 * non-Vietnamese input), in which case the caller should skip highlighting
 * rather than highlight the wrong characters.
 */
export const getHighlightRange = (
  value: string,
  normalizedQuery: string,
  normalize: Normalizer,
): [number, number] | null => {
  if (!normalizedQuery) return null;
  const folded = normalize(value);
  if (folded.length !== value.length) return null;
  const index = folded.indexOf(normalizedQuery);
  if (index < 0) return null;
  return [index, index + normalizedQuery.length];
};
