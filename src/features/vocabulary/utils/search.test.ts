import type { FolderNode, VocabItem } from '../types';
import {
  collectScopeEntries,
  foldDiacritics,
  getHighlightRange,
  makeNormalizer,
  searchFolders,
  searchTopicVocab,
  searchTopics,
} from './search';

describe('foldDiacritics', () => {
  it('strips Vietnamese diacritics while preserving length', () => {
    expect(foldDiacritics('học')).toBe('hoc');
    expect(foldDiacritics('Tiếng Việt')).toBe('Tieng Viet');
    expect(foldDiacritics('đường')).toBe('duong');
    expect(foldDiacritics('ĐÔNG')).toBe('DONG');
    expect(foldDiacritics('học').length).toBe('học'.length);
  });
});

describe('makeNormalizer', () => {
  it('is case- and diacritic-insensitive by default', () => {
    const normalize = makeNormalizer({ caseSensitive: false, diacriticSensitive: false });
    expect(normalize('Học Tập')).toBe('hoc tap');
  });

  it('keeps case when caseSensitive is on', () => {
    const normalize = makeNormalizer({ caseSensitive: true, diacriticSensitive: false });
    expect(normalize('Học')).toBe('Hoc');
  });

  it('keeps diacritics when diacriticSensitive is on', () => {
    const normalize = makeNormalizer({ caseSensitive: false, diacriticSensitive: true });
    expect(normalize('Học')).toBe('học');
  });
});

const makeItem = (word: string, vnMeaning: string): VocabItem => ({
  id: `id_${word}`,
  word,
  type: 'noun',
  vnMeaning,
  pronunciation: '',
});

describe('searchTopicVocab', () => {
  const items = [
    makeItem('study', 'học tập'),
    makeItem('house', 'ngôi nhà'),
    makeItem('learn', 'học hỏi'),
  ];

  it('matches Vietnamese meaning typed without diacritics', () => {
    const normalize = makeNormalizer({ caseSensitive: false, diacriticSensitive: false });
    const results = searchTopicVocab(items, 't1', ['root', 't1'], 'hoc', normalize);
    expect(results.map((r) => r.item.word).sort()).toEqual(['learn', 'study']);
    expect(results.every((r) => r.field === 'meaning')).toBe(true);
  });

  it('matches English word and prefers the word field', () => {
    const normalize = makeNormalizer({ caseSensitive: false, diacriticSensitive: false });
    const results = searchTopicVocab(items, 't1', ['root', 't1'], 'house', normalize);
    expect(results).toHaveLength(1);
    expect(results[0].field).toBe('word');
  });

  it('respects diacritic-sensitive matching', () => {
    const normalize = makeNormalizer({ caseSensitive: false, diacriticSensitive: true });
    expect(
      searchTopicVocab(items, 't1', ['root', 't1'], 'hoc', normalize),
    ).toHaveLength(0);
    expect(
      searchTopicVocab(items, 't1', ['root', 't1'], 'học', normalize),
    ).toHaveLength(2);
  });

  it('targets only the English word field when asked', () => {
    const normalize = makeNormalizer({ caseSensitive: false, diacriticSensitive: false });
    // "hoc" only appears in Vietnamese meanings, so a word-only search finds nothing.
    expect(
      searchTopicVocab(items, 't1', ['root', 't1'], 'hoc', normalize, 'word'),
    ).toHaveLength(0);
    expect(
      searchTopicVocab(items, 't1', ['root', 't1'], 'stud', normalize, 'word'),
    ).toHaveLength(1);
  });

  it('targets only the Vietnamese meaning field when asked', () => {
    const normalize = makeNormalizer({ caseSensitive: false, diacriticSensitive: false });
    // "house" is an English word; a meaning-only search must not match it.
    expect(
      searchTopicVocab(items, 't1', ['root', 't1'], 'house', normalize, 'meaning'),
    ).toHaveLength(0);
    const meaningHits = searchTopicVocab(items, 't1', ['root', 't1'], 'nha', normalize, 'meaning');
    expect(meaningHits).toHaveLength(1);
    expect(meaningHits[0].field).toBe('meaning');
  });
});

describe('collectScopeEntries + label search', () => {
  const tree: FolderNode = {
    kind: 'folder',
    id: 'root',
    label: 'Root',
    children: [
      {
        kind: 'folder',
        id: 'f1',
        label: 'Động vật',
        children: [
          { kind: 'topic', id: 't1', label: 'Thú cưng' },
          { kind: 'topic', id: 't2', label: 'Chim chóc' },
        ],
      },
      { kind: 'topic', id: 't3', label: 'Đồ ăn' },
    ],
  };

  it('collects every descendant folder and topic with full paths', () => {
    const { folders, topics } = collectScopeEntries(tree, ['root']);
    expect(folders.map((f) => f.node.id)).toEqual(['f1']);
    expect(topics.map((t) => t.node.id).sort()).toEqual(['t1', 't2', 't3']);
    expect(topics.find((t) => t.node.id === 't1')?.path).toEqual(['root', 'f1', 't1']);
  });

  it('finds folders and topics accent-insensitively', () => {
    const normalize = makeNormalizer({ caseSensitive: false, diacriticSensitive: false });
    const { folders, topics } = collectScopeEntries(tree, ['root']);
    expect(searchFolders(folders, 'dong', normalize).map((f) => f.id)).toEqual(['f1']);
    expect(searchTopics(topics, 'do an', normalize).map((t) => t.id)).toEqual(['t3']);
  });
});

describe('getHighlightRange', () => {
  it('maps an accent-insensitive match back onto the original text', () => {
    const normalize = makeNormalizer({ caseSensitive: false, diacriticSensitive: false });
    const range = getHighlightRange('Học tập', 'tap', normalize);
    expect(range).not.toBeNull();
    const [start, end] = range!;
    expect('Học tập'.slice(start, end)).toBe('tập');
  });

  it('returns null when nothing matches', () => {
    const normalize = makeNormalizer({ caseSensitive: false, diacriticSensitive: false });
    expect(getHighlightRange('house', 'xyz', normalize)).toBeNull();
  });
});
