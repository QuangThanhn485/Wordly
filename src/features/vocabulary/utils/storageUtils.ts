import type { FolderNode, TopicItem, VocabItem } from '../types';

export const VOCAB_TOPIC_STORAGE_PREFIX = 'wordly_vocab_topic:';
export const VOCAB_TOPIC_INDEX_KEY = 'wordly_vocab_topic_index';
export const VOCAB_TOPIC_COUNTS_KEY = 'wordly_vocab_topic_counts';
export const VOCAB_TREE_STORAGE_KEY = 'wordly_tree';

const VOCAB_SCHEMA_VERSION_KEY = 'wordly_vocab_schema_version';
const VOCAB_SCHEMA_VERSION = '2';
const LEGACY_VOCAB_MAP_KEY = 'wordly_vocab_map';
const LEGACY_VOCAB_PREFIX = 'wordly_vocab_file:';
const TRAINING_VOCABULARY_SET_PREFIX = 'wordly_training_topic:';
const LEGACY_VOCAB_INDEX_KEY = 'wordly_vocab_index';
const LEGACY_VOCAB_COUNTS_KEY = 'wordly_vocab_counts';
const LEGACY_TRAINING_TOPIC_PREFIX = '__top_mistakes__';

type UnknownRecord = Record<string, unknown>;
type LegacyTopicReferenceMap = Record<string, string[]>;

let migrationRunning = false;
let migrationChecked = false;

const parseJson = <T,>(value: string | null, fallback: T): T => {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
};

const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isVocabArray = (value: unknown): value is VocabItem[] => Array.isArray(value);

const createMigrationId = (): string =>
  `topic_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

export const normalizeLegacyTopicLabel = (value: unknown): string => {
  const label = typeof value === 'string' ? value.trim() : '';
  return (label.replace(/\.txt$/i, '').trim() || 'Topic').normalize('NFC');
};

const makeUniqueLabel = (label: string, usedLabels: Set<string>): string => {
  const base = label.trim().normalize('NFC') || 'Topic';
  let candidate = base;
  let suffix = 1;
  while (usedLabels.has(candidate.toLocaleLowerCase('vi'))) {
    candidate = `${base} (${suffix})`;
    suffix += 1;
  }
  usedLabels.add(candidate.toLocaleLowerCase('vi'));
  return candidate;
};

const readLegacyVocabulary = (): Record<string, VocabItem[]> => {
  const result: Record<string, VocabItem[]> = {};
  const oldMap = parseJson<Record<string, unknown>>(
    localStorage.getItem(LEGACY_VOCAB_MAP_KEY),
    {},
  );

  Object.entries(oldMap).forEach(([reference, value]) => {
    if (isVocabArray(value)) result[reference] = value;
  });

  const legacyIndex = parseJson<string[]>(
    localStorage.getItem(LEGACY_VOCAB_INDEX_KEY),
    [],
  );
  const references = new Set(legacyIndex);

  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (key?.startsWith(LEGACY_VOCAB_PREFIX)) {
      references.add(key.slice(LEGACY_VOCAB_PREFIX.length));
    }
  }

  references.forEach((reference) => {
    const stored = parseJson<unknown>(
      localStorage.getItem(`${LEGACY_VOCAB_PREFIX}${reference}`),
      null,
    );
    if (isVocabArray(stored)) result[reference] = stored;
  });

  return result;
};

const normalizeStoredTree = (
  rawTree: unknown,
  legacyVocabulary: Record<string, VocabItem[]>,
): {
  tree: FolderNode;
  legacyReferencesByTopicId: LegacyTopicReferenceMap;
  consumedLegacyReferences: Set<string>;
  changed: boolean;
} => {
  const legacyReferencesByTopicId: LegacyTopicReferenceMap = {};
  const consumedLegacyReferences = new Set<string>();
  const usedIds = new Set<string>();
  let changed = false;

  const uniqueId = (value: unknown): string => {
    const preferred = typeof value === 'string' && value.trim() ? value : createMigrationId();
    if (!usedIds.has(preferred)) {
      usedIds.add(preferred);
      return preferred;
    }
    changed = true;
    let replacement = createMigrationId();
    while (usedIds.has(replacement)) replacement = createMigrationId();
    usedIds.add(replacement);
    return replacement;
  };

  const normalizeTopic = (
    rawNode: UnknownRecord,
    usedLabels: Set<string>,
  ): TopicItem => {
    const legacy = rawNode.kind === 'file';
    const id = uniqueId(rawNode.id);
    const rawLabel = legacy ? rawNode.name : rawNode.label;
    const normalizedLabel = legacy
      ? normalizeLegacyTopicLabel(rawLabel)
      : (typeof rawLabel === 'string' ? rawLabel.trim().normalize('NFC') : 'Topic');
    const label = makeUniqueLabel(normalizedLabel || 'Topic', usedLabels);

    if (legacy || rawNode.kind !== 'topic' || rawNode.label !== label || rawNode.id !== id) {
      changed = true;
    }

    const references = new Set<string>();
    if (typeof rawNode.name === 'string' && rawNode.name.trim()) {
      references.add(rawNode.name.trim());
    }
    if (legacy) {
      references.add(label);
      references.add(`${label}.txt`);
    }

    legacyReferencesByTopicId[id] = Array.from(references);
    references.forEach((reference) => {
      if (legacyVocabulary[reference]) consumedLegacyReferences.add(reference);
    });

    return { kind: 'topic', id, label };
  };

  const normalizeFolder = (rawNode: UnknownRecord): FolderNode => {
    const id = uniqueId(rawNode.id);
    const label =
      typeof rawNode.label === 'string' && rawNode.label.trim()
        ? rawNode.label.trim().normalize('NFC')
        : 'Root';
    const rawChildren = Array.isArray(rawNode.children) ? rawNode.children : [];
    const usedLabels = new Set<string>();
    const children: Array<FolderNode | TopicItem> = [];

    rawChildren.forEach((rawChild) => {
      if (!isRecord(rawChild)) {
        changed = true;
        return;
      }
      if (rawChild.kind === 'folder') {
        const child = normalizeFolder(rawChild);
        child.label = makeUniqueLabel(child.label, usedLabels);
        children.push(child);
        return;
      }
      if (rawChild.kind === 'topic' || rawChild.kind === 'file') {
        children.push(normalizeTopic(rawChild, usedLabels));
        return;
      }
      changed = true;
    });

    if (
      rawNode.kind !== 'folder' ||
      rawNode.id !== id ||
      rawNode.label !== label ||
      rawChildren.length !== children.length
    ) {
      changed = true;
    }

    return { kind: 'folder', id, label, children };
  };

  const root = isRecord(rawTree) && rawTree.kind === 'folder'
    ? normalizeFolder(rawTree)
    : normalizeFolder({ kind: 'folder', id: createMigrationId(), label: 'Root', children: [] });

  const rootUsedLabels = new Set(
    root.children.map((child) => child.label.toLocaleLowerCase('vi')),
  );

  Object.keys(legacyVocabulary).forEach((reference) => {
    if (
      consumedLegacyReferences.has(reference) ||
      reference.startsWith(LEGACY_TRAINING_TOPIC_PREFIX)
    ) {
      return;
    }

    const id = uniqueId(undefined);
    const label = makeUniqueLabel(normalizeLegacyTopicLabel(reference), rootUsedLabels);
    root.children.push({ kind: 'topic', id, label });
    legacyReferencesByTopicId[id] = [reference];
    consumedLegacyReferences.add(reference);
    changed = true;
  });

  return {
    tree: root,
    legacyReferencesByTopicId,
    consumedLegacyReferences,
    changed,
  };
};

const getTopicIdsFromTree = (node: FolderNode | TopicItem): string[] => {
  if (node.kind === 'topic') return [node.id];
  return node.children.flatMap(getTopicIdsFromTree);
};

const verifyStoredValue = (key: string, expected: string): void => {
  if (localStorage.getItem(key) !== expected) {
    throw new Error(`Failed to verify migrated vocabulary data at "${key}"`);
  }
};

const cleanupMigratedLegacyData = (consumedReferences: Set<string>): void => {
  consumedReferences.forEach((reference) => {
    localStorage.removeItem(`${LEGACY_VOCAB_PREFIX}${reference}`);
  });

  const oldMap = parseJson<Record<string, unknown>>(
    localStorage.getItem(LEGACY_VOCAB_MAP_KEY),
    {},
  );
  consumedReferences.forEach((reference) => delete oldMap[reference]);
  if (Object.keys(oldMap).length > 0) {
    localStorage.setItem(LEGACY_VOCAB_MAP_KEY, JSON.stringify(oldMap));
  } else {
    localStorage.removeItem(LEGACY_VOCAB_MAP_KEY);
  }

  const remainingIndex = parseJson<string[]>(
    localStorage.getItem(LEGACY_VOCAB_INDEX_KEY),
    [],
  ).filter((reference) => !consumedReferences.has(reference));
  if (remainingIndex.length > 0) {
    localStorage.setItem(LEGACY_VOCAB_INDEX_KEY, JSON.stringify(remainingIndex));
  } else {
    localStorage.removeItem(LEGACY_VOCAB_INDEX_KEY);
  }

  const remainingCounts = parseJson<Record<string, number>>(
    localStorage.getItem(LEGACY_VOCAB_COUNTS_KEY),
    {},
  );
  consumedReferences.forEach((reference) => delete remainingCounts[reference]);
  if (Object.keys(remainingCounts).length > 0) {
    localStorage.setItem(LEGACY_VOCAB_COUNTS_KEY, JSON.stringify(remainingCounts));
  } else {
    localStorage.removeItem(LEGACY_VOCAB_COUNTS_KEY);
  }
};

export const ensureVocabularyTopicMigration = (): void => {
  if (migrationRunning || migrationChecked) return;
  migrationRunning = true;

  try {
    const rawTree = parseJson<unknown>(
      localStorage.getItem(VOCAB_TREE_STORAGE_KEY),
      null,
    );
    const legacyVocabulary = readLegacyVocabulary();
    const hasLegacyTreeNodes = JSON.stringify(rawTree).includes('"kind":"file"');
    const hasLegacyVocabulary = Object.keys(legacyVocabulary).some(
      (reference) => !reference.startsWith(LEGACY_TRAINING_TOPIC_PREFIX),
    );
    const hasCanonicalIndex = localStorage.getItem(VOCAB_TOPIC_INDEX_KEY) !== null;
    const hasUsableTree = isRecord(rawTree) && rawTree.kind === 'folder';
    const isCurrentSchema =
      localStorage.getItem(VOCAB_SCHEMA_VERSION_KEY) === VOCAB_SCHEMA_VERSION;

    if (
      isCurrentSchema &&
      hasUsableTree &&
      hasCanonicalIndex &&
      !hasLegacyTreeNodes &&
      !hasLegacyVocabulary
    ) {
      migrationChecked = true;
      return;
    }

    if (!rawTree && !hasLegacyVocabulary && !hasCanonicalIndex) {
      migrationChecked = true;
      return;
    }

    const normalized = normalizeStoredTree(rawTree, legacyVocabulary);
    const topicIds = getTopicIdsFromTree(normalized.tree);
    const counts: Record<string, number> = {};
    const writes: Array<{ key: string; value: string }> = [];

    topicIds.forEach((topicId) => {
      const canonicalKey = `${VOCAB_TOPIC_STORAGE_PREFIX}${topicId}`;
      const canonicalData = parseJson<unknown>(localStorage.getItem(canonicalKey), null);
      let vocabulary: VocabItem[] | null = isVocabArray(canonicalData)
        ? canonicalData
        : null;

      if (!vocabulary) {
        const references = normalized.legacyReferencesByTopicId[topicId] || [];
        const legacyReference = references.find((reference) => legacyVocabulary[reference]);
        vocabulary = legacyReference ? legacyVocabulary[legacyReference] : [];
      }

      const serialized = JSON.stringify(vocabulary);
      writes.push({ key: canonicalKey, value: serialized });
      counts[topicId] = vocabulary.length;
    });

    const canonicalIndex = parseJson<string[]>(
      localStorage.getItem(VOCAB_TOPIC_INDEX_KEY),
      [],
    );
    canonicalIndex.forEach((topicId) => {
      const key = `${VOCAB_TOPIC_STORAGE_PREFIX}${topicId}`;
      if (!topicIds.includes(topicId) && localStorage.getItem(key) !== null) {
        topicIds.push(topicId);
        const value = localStorage.getItem(key) || '[]';
        counts[topicId] = isVocabArray(parseJson<unknown>(value, null))
          ? (parseJson<VocabItem[]>(value, [])).length
          : 0;
      }
    });

    writes.forEach(({ key, value }) => {
      localStorage.setItem(key, value);
      verifyStoredValue(key, value);
    });

    const indexValue = JSON.stringify(topicIds);
    const countsValue = JSON.stringify(counts);
    const treeValue = JSON.stringify(normalized.tree);
    localStorage.setItem(VOCAB_TOPIC_INDEX_KEY, indexValue);
    localStorage.setItem(VOCAB_TOPIC_COUNTS_KEY, countsValue);
    localStorage.setItem(VOCAB_TREE_STORAGE_KEY, treeValue);
    localStorage.setItem(VOCAB_SCHEMA_VERSION_KEY, VOCAB_SCHEMA_VERSION);
    verifyStoredValue(VOCAB_TOPIC_INDEX_KEY, indexValue);
    verifyStoredValue(VOCAB_TOPIC_COUNTS_KEY, countsValue);
    verifyStoredValue(VOCAB_TREE_STORAGE_KEY, treeValue);
    verifyStoredValue(VOCAB_SCHEMA_VERSION_KEY, VOCAB_SCHEMA_VERSION);

    if (hasLegacyTreeNodes || hasLegacyVocabulary || normalized.changed) {
      cleanupMigratedLegacyData(normalized.consumedLegacyReferences);
    }
    migrationChecked = true;
  } catch (error) {
    console.error('Failed to migrate vocabulary topics. Legacy data was kept:', error);
  } finally {
    migrationRunning = false;
  }
};

export const getVocabularyTopicIndex = (): string[] => {
  ensureVocabularyTopicMigration();
  return parseJson<string[]>(localStorage.getItem(VOCAB_TOPIC_INDEX_KEY), []);
};

const updateVocabularyTopicIndex = (topicIds: string[]): void => {
  localStorage.setItem(
    VOCAB_TOPIC_INDEX_KEY,
    JSON.stringify(Array.from(new Set(topicIds))),
  );
};

const addToVocabularyTopicIndex = (topicId: string): void => {
  const topicIds = getVocabularyTopicIndex();
  if (!topicIds.includes(topicId)) updateVocabularyTopicIndex([...topicIds, topicId]);
};

const removeFromVocabularyTopicIndex = (topicId: string): void => {
  updateVocabularyTopicIndex(
    getVocabularyTopicIndex().filter((candidate) => candidate !== topicId),
  );
};

export const loadVocabularyTopic = (topicId: string): VocabItem[] | null => {
  ensureVocabularyTopicMigration();
  try {
    const stored =
      localStorage.getItem(`${VOCAB_TOPIC_STORAGE_PREFIX}${topicId}`) ||
      localStorage.getItem(`${TRAINING_VOCABULARY_SET_PREFIX}${topicId}`);
    return stored ? parseJson<VocabItem[] | null>(stored, null) : null;
  } catch (error) {
    console.error(`Failed to load vocabulary topic "${topicId}":`, error);
    return null;
  }
};

export const saveTrainingVocabularySet = (
  topicId: string,
  vocabulary: VocabItem[],
): void => {
  localStorage.setItem(
    `${TRAINING_VOCABULARY_SET_PREFIX}${topicId}`,
    JSON.stringify(vocabulary),
  );
};

export const saveVocabularyTopic = (topicId: string, vocabulary: VocabItem[]): void => {
  ensureVocabularyTopicMigration();
  try {
    localStorage.setItem(
      `${VOCAB_TOPIC_STORAGE_PREFIX}${topicId}`,
      JSON.stringify(vocabulary),
    );
    addToVocabularyTopicIndex(topicId);
    updateVocabularyTopicCount(topicId, vocabulary.length);
  } catch (error) {
    console.error(`Failed to save vocabulary topic "${topicId}":`, error);
    throw error;
  }
};

export const deleteVocabularyTopic = (topicId: string): void => {
  ensureVocabularyTopicMigration();
  try {
    localStorage.removeItem(`${VOCAB_TOPIC_STORAGE_PREFIX}${topicId}`);
    removeFromVocabularyTopicIndex(topicId);
    removeVocabularyTopicCount(topicId);
  } catch (error) {
    console.error(`Failed to delete vocabulary topic "${topicId}":`, error);
    throw error;
  }
};

export const loadVocabularyTopics = (): Record<string, VocabItem[]> | null => {
  ensureVocabularyTopicMigration();
  const result: Record<string, VocabItem[]> = {};
  getVocabularyTopicIndex().forEach((topicId) => {
    const vocabulary = loadVocabularyTopic(topicId);
    if (vocabulary) result[topicId] = vocabulary;
  });
  return Object.keys(result).length > 0 ? result : null;
};

export const saveVocabularyTopics = (
  vocabularyByTopicId: Record<string, VocabItem[]>,
): void => {
  const topicIds = Object.keys(vocabularyByTopicId);
  topicIds.forEach((topicId) => {
    saveVocabularyTopic(topicId, vocabularyByTopicId[topicId]);
  });
  updateVocabularyTopicIndex(topicIds);
};

export const clearVocabularyTopics = (): number => {
  const topicIds = getVocabularyTopicIndex();
  const keysToRemove: string[] = [];
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (
      key?.startsWith(VOCAB_TOPIC_STORAGE_PREFIX) ||
      key?.startsWith(TRAINING_VOCABULARY_SET_PREFIX) ||
      key?.startsWith(LEGACY_VOCAB_PREFIX)
    ) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach((key) => localStorage.removeItem(key));
  localStorage.removeItem(VOCAB_TOPIC_INDEX_KEY);
  localStorage.removeItem(VOCAB_TOPIC_COUNTS_KEY);
  localStorage.removeItem(VOCAB_TREE_STORAGE_KEY);
  localStorage.removeItem(VOCAB_SCHEMA_VERSION_KEY);
  localStorage.removeItem(LEGACY_VOCAB_MAP_KEY);
  localStorage.removeItem(LEGACY_VOCAB_INDEX_KEY);
  localStorage.removeItem(LEGACY_VOCAB_COUNTS_KEY);
  return topicIds.length;
};

export const saveTreeToStorage = (tree: FolderNode): void => {
  try {
    localStorage.setItem(VOCAB_TREE_STORAGE_KEY, JSON.stringify(tree));
  } catch (error) {
    console.error('Failed to save vocabulary tree:', error);
    throw error;
  }
};

export const loadTreeFromStorage = (): FolderNode | null => {
  ensureVocabularyTopicMigration();
  const stored = localStorage.getItem(VOCAB_TREE_STORAGE_KEY);
  return stored ? parseJson<FolderNode | null>(stored, null) : null;
};

export const loadVocabularyTopicCounts = (): Record<string, number> => {
  ensureVocabularyTopicMigration();
  return parseJson<Record<string, number>>(
    localStorage.getItem(VOCAB_TOPIC_COUNTS_KEY),
    {},
  );
};

export const saveVocabularyTopicCounts = (counts: Record<string, number>): void => {
  const serialized = JSON.stringify(counts);
  if (localStorage.getItem(VOCAB_TOPIC_COUNTS_KEY) !== serialized) {
    localStorage.setItem(VOCAB_TOPIC_COUNTS_KEY, serialized);
  }
};

export const updateVocabularyTopicCount = (topicId: string, count: number): void => {
  const counts = loadVocabularyTopicCounts();
  counts[topicId] = count;
  saveVocabularyTopicCounts(counts);
};

export const removeVocabularyTopicCount = (topicId: string): void => {
  const counts = loadVocabularyTopicCounts();
  delete counts[topicId];
  saveVocabularyTopicCounts(counts);
};

export const syncAllVocabularyTopicCounts = (): void => {
  const counts: Record<string, number> = {};
  getVocabularyTopicIndex().forEach((topicId) => {
    counts[topicId] = loadVocabularyTopic(topicId)?.length || 0;
  });
  saveVocabularyTopicCounts(counts);
};

const findTopic = (
  node: FolderNode | TopicItem,
  predicate: (topic: TopicItem) => boolean,
): TopicItem | null => {
  if (node.kind === 'topic') return predicate(node) ? node : null;
  for (const child of node.children) {
    const result = findTopic(child, predicate);
    if (result) return result;
  }
  return null;
};

const hashReference = (value: string): string => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
};

export const resolveTopicId = (reference: string | null | undefined): string | null => {
  if (!reference) return null;
  ensureVocabularyTopicMigration();
  const topicIds = getVocabularyTopicIndex();
  if (topicIds.includes(reference)) return reference;
  if (localStorage.getItem(`${TRAINING_VOCABULARY_SET_PREFIX}${reference}`)) {
    return reference;
  }

  const tree = loadTreeFromStorage();
  const normalizedReference = normalizeLegacyTopicLabel(reference).toLocaleLowerCase('vi');
  const topicId = tree
    ? findTopic(
      tree,
      (topic) => topic.label.toLocaleLowerCase('vi') === normalizedReference,
    )?.id
    : null;
  if (topicId) return topicId;

  const legacyKey = `${LEGACY_VOCAB_PREFIX}${reference}`;
  const legacyVocabulary = parseJson<unknown>(localStorage.getItem(legacyKey), null);
  if (isVocabArray(legacyVocabulary)) {
    const transientTopicId = `legacy_${hashReference(reference)}`;
    if (reference.startsWith(LEGACY_TRAINING_TOPIC_PREFIX)) {
      saveTrainingVocabularySet(transientTopicId, legacyVocabulary);
    } else {
      saveVocabularyTopic(transientTopicId, legacyVocabulary);
    }
    return transientTopicId;
  }

  return null;
};

export const getTopicLabel = (topicId: string | null | undefined): string => {
  if (!topicId) return '';
  const tree = loadTreeFromStorage();
  return tree ? findTopic(tree, (topic) => topic.id === topicId)?.label || '' : '';
};

export const getTopicIdFromSearchParams = (
  searchParams: URLSearchParams,
  canonicalKey = 'topic',
  legacyKey = 'file',
): string | null =>
  resolveTopicId(searchParams.get(canonicalKey) || searchParams.get(legacyKey));
