import {
  DATABASE_KEYS,
  initializeDatabase,
  listDatabaseKeys,
  readDatabaseValue,
  removeDatabaseValue,
  writeDatabaseValue,
} from '@/data';
import type { FolderNode, TopicItem, VocabItem } from '../types';

export const VOCABULARY_CATALOG_SCHEMA_VERSION = 1 as const;

type CatalogBaseNode = {
  id: string;
  label: string;
  parentId: string | null;
  createdAt: number;
  updatedAt: number;
};

export type CatalogFolder = CatalogBaseNode & {
  kind: 'folder';
  childIds: string[];
};

export type CatalogTopic = CatalogBaseNode & {
  kind: 'topic';
  wordCount: number;
};

export type VocabularyCatalog = {
  catalogVersion: typeof VOCABULARY_CATALOG_SCHEMA_VERSION;
  rootId: string;
  nodesById: Record<string, CatalogFolder | CatalogTopic>;
};

export type VocabularyTopicData = {
  topicId: string;
  items: VocabItem[];
  createdAt: number;
  updatedAt: number;
};

type TrainingVocabularySet = {
  topicId: string;
  items: VocabItem[];
  createdAt: number;
  updatedAt: number;
};

type TrainingVocabularySets = Record<string, TrainingVocabularySet>;

const createEntityId = (prefix: string): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
};

const topicStorageKey = (topicId: string): string =>
  `${DATABASE_KEYS.vocabularyTopicPrefix}${encodeURIComponent(topicId)}`;

const normalizeLabel = (value: unknown, fallback: string): string => {
  const label = typeof value === 'string' ? value.trim().normalize('NFC') : '';
  return label || fallback;
};

export const normalizeLegacyTopicLabel = (value: unknown): string =>
  normalizeLabel(
    typeof value === 'string' ? value.replace(/\.txt$/i, '') : value,
    'Topic',
  );

const isCatalog = (value: unknown): value is VocabularyCatalog => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const candidate = value as Partial<VocabularyCatalog>;
  return (
    candidate.catalogVersion === VOCABULARY_CATALOG_SCHEMA_VERSION &&
    typeof candidate.rootId === 'string' &&
    Boolean(candidate.nodesById) &&
    typeof candidate.nodesById === 'object' &&
    !Array.isArray(candidate.nodesById)
  );
};

const readCatalog = (): VocabularyCatalog | null => {
  const catalog = readDatabaseValue<unknown>(
    DATABASE_KEYS.vocabularyCatalog,
    null,
  );
  return isCatalog(catalog) ? catalog : null;
};

const treeToCatalog = (
  tree: FolderNode,
  previous: VocabularyCatalog | null,
): VocabularyCatalog => {
  const now = Date.now();
  const nodesById: VocabularyCatalog['nodesById'] = {};
  const visited = new Set<string>();

  const visit = (
    node: FolderNode | TopicItem,
    parentId: string | null,
  ): void => {
    if (visited.has(node.id)) {
      throw new Error(`Duplicate vocabulary node id: "${node.id}".`);
    }
    visited.add(node.id);

    const oldNode = previous?.nodesById[node.id];
    const label = normalizeLabel(
      node.label,
      node.kind === 'folder' ? 'Folder' : 'Topic',
    );
    const base = {
      id: node.id,
      label,
      parentId,
      createdAt: oldNode?.createdAt ?? now,
      updatedAt:
        oldNode &&
        oldNode.label === label &&
        oldNode.parentId === parentId
          ? oldNode.updatedAt
          : now,
    };

    if (node.kind === 'topic') {
      const topicData = oldNode?.kind === 'topic'
        ? null
        : readDatabaseValue<VocabularyTopicData | null>(
          topicStorageKey(node.id),
          null,
        );
      nodesById[node.id] = {
        ...base,
        kind: 'topic',
        createdAt: topicData?.createdAt ?? base.createdAt,
        wordCount:
          oldNode?.kind === 'topic'
            ? oldNode.wordCount
            : topicData?.items.length ?? 0,
      };
      return;
    }

    nodesById[node.id] = {
      ...base,
      kind: 'folder',
      childIds: node.children.map((child) => child.id),
    };
    node.children.forEach((child) => visit(child, node.id));
  };

  visit(tree, null);
  return {
    catalogVersion: VOCABULARY_CATALOG_SCHEMA_VERSION,
    rootId: tree.id,
    nodesById,
  };
};

const catalogToTree = (catalog: VocabularyCatalog): FolderNode | null => {
  const visiting = new Set<string>();

  const build = (nodeId: string): FolderNode | TopicItem | null => {
    const node = catalog.nodesById[nodeId];
    if (!node || visiting.has(nodeId)) return null;
    if (node.kind === 'topic') {
      return { kind: 'topic', id: node.id, label: node.label };
    }

    visiting.add(nodeId);
    const children = node.childIds
      .map(build)
      .filter((child): child is FolderNode | TopicItem => Boolean(child));
    visiting.delete(nodeId);
    return {
      kind: 'folder',
      id: node.id,
      label: node.label,
      children,
    };
  };

  const root = build(catalog.rootId);
  return root?.kind === 'folder' ? root : null;
};

export const normalizeVocabularyItems = (
  input: unknown,
  timestamp = Date.now(),
  previousItems: VocabItem[] = [],
): VocabItem[] => {
  if (!Array.isArray(input)) return [];

  const usedIds = new Set<string>();
  const previousById = new Map(
    previousItems
      .filter((item): item is VocabItem & { id: string } => Boolean(item.id))
      .map((item) => [item.id, item]),
  );
  return input.flatMap((raw): VocabItem[] => {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return [];
    const candidate = raw as Partial<VocabItem>;
    const word = typeof candidate.word === 'string' ? candidate.word.trim() : '';
    if (!word) return [];

    let id =
      typeof candidate.id === 'string' && candidate.id.trim()
        ? candidate.id
        : createEntityId('word');
    while (usedIds.has(id)) id = createEntityId('word');
    usedIds.add(id);
    const previous = previousById.get(id);
    const type = typeof candidate.type === 'string' ? candidate.type.trim() : '';
    const vnMeaning =
      typeof candidate.vnMeaning === 'string'
        ? candidate.vnMeaning.trim()
        : '';
    const pronunciation =
      typeof candidate.pronunciation === 'string'
        ? candidate.pronunciation.trim()
        : '';
    const unchanged =
      previous &&
      previous.word === word &&
      previous.type === type &&
      previous.vnMeaning === vnMeaning &&
      previous.pronunciation === pronunciation;

    return [{
      id,
      word,
      type,
      vnMeaning,
      pronunciation,
      createdAt:
        typeof previous?.createdAt === 'number'
          ? previous.createdAt
          : typeof candidate.createdAt === 'number'
            ? candidate.createdAt
          : timestamp,
      updatedAt:
        unchanged && typeof previous.updatedAt === 'number'
          ? previous.updatedAt
          : timestamp,
    }];
  });
};

const updateCatalogTopicCount = (topicId: string, wordCount: number): void => {
  const catalog = readCatalog();
  const node = catalog?.nodesById[topicId];
  if (!catalog || node?.kind !== 'topic' || node.wordCount === wordCount) return;
  writeDatabaseValue<VocabularyCatalog>(DATABASE_KEYS.vocabularyCatalog, {
    ...catalog,
    nodesById: {
      ...catalog.nodesById,
      [topicId]: {
        ...node,
        wordCount,
        updatedAt: Date.now(),
      },
    },
  });
};

export const ensureVocabularyTopicMigration = (): void => {
  initializeDatabase();
};

export const getVocabularyTopicIndex = (): string[] => {
  const catalog = readCatalog();
  if (!catalog) return [];
  return Object.values(catalog.nodesById)
    .filter((node): node is CatalogTopic => node.kind === 'topic')
    .map((topic) => topic.id);
};

export const loadVocabularyTopic = (topicId: string): VocabItem[] | null => {
  try {
    const stored = readDatabaseValue<VocabularyTopicData | null>(
      topicStorageKey(topicId),
      null,
    );
    if (stored?.topicId === topicId) {
      const items = normalizeVocabularyItems(stored.items, stored.createdAt);
      updateCatalogTopicCount(topicId, items.length);
      return items;
    }

    const trainingSets = readDatabaseValue<TrainingVocabularySets>(
      DATABASE_KEYS.trainingSets,
      {},
    );
    const trainingSet = trainingSets[topicId];
    return trainingSet
      ? normalizeVocabularyItems(trainingSet.items, trainingSet.createdAt)
      : null;
  } catch (error) {
    console.error(`Failed to load vocabulary topic "${topicId}":`, error);
    return null;
  }
};

export const saveTrainingVocabularySet = (
  topicId: string,
  vocabulary: VocabItem[],
): void => {
  const now = Date.now();
  const current = readDatabaseValue<TrainingVocabularySets>(
    DATABASE_KEYS.trainingSets,
    {},
  );
  const previous = current[topicId];
  writeDatabaseValue<TrainingVocabularySets>(DATABASE_KEYS.trainingSets, {
    ...current,
    [topicId]: {
      topicId,
      items: normalizeVocabularyItems(
        vocabulary,
        now,
        previous?.items ?? [],
      ),
      createdAt: previous?.createdAt ?? now,
      updatedAt: now,
    },
  });
};

export const saveVocabularyTopic = (
  topicId: string,
  vocabulary: VocabItem[],
): void => {
  const now = Date.now();
  const key = topicStorageKey(topicId);
  const previous = readDatabaseValue<VocabularyTopicData | null>(key, null);
  const items = normalizeVocabularyItems(
    vocabulary,
    now,
    previous?.items ?? [],
  );
  writeDatabaseValue<VocabularyTopicData>(key, {
    topicId,
    items,
    createdAt: previous?.createdAt ?? now,
    updatedAt: now,
  });
  updateCatalogTopicCount(topicId, items.length);
};

export const deleteVocabularyTopic = (topicId: string): void => {
  removeDatabaseValue(topicStorageKey(topicId));
  updateCatalogTopicCount(topicId, 0);
};

export const loadVocabularyTopics = (): Record<string, VocabItem[]> | null => {
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
  Object.entries(vocabularyByTopicId).forEach(([topicId, vocabulary]) => {
    saveVocabularyTopic(topicId, vocabulary);
  });
};

export const clearVocabularyTopics = (): number => {
  const topicIds = getVocabularyTopicIndex();
  listDatabaseKeys()
    .filter((key) => key.startsWith(DATABASE_KEYS.vocabularyTopicPrefix))
    .forEach(removeDatabaseValue);
  removeDatabaseValue(DATABASE_KEYS.vocabularyCatalog);
  removeDatabaseValue(DATABASE_KEYS.trainingSets);
  return topicIds.length;
};

export const saveTreeToStorage = (tree: FolderNode): void => {
  const catalog = treeToCatalog(tree, readCatalog());
  writeDatabaseValue(DATABASE_KEYS.vocabularyCatalog, catalog);
};

export const loadTreeFromStorage = (): FolderNode | null => {
  const catalog = readCatalog();
  return catalog ? catalogToTree(catalog) : null;
};

export const loadVocabularyTopicCounts = (): Record<string, number> => {
  const catalog = readCatalog();
  if (!catalog) return {};
  const counts: Record<string, number> = {};
  Object.values(catalog.nodesById).forEach((node) => {
    if (node.kind === 'topic') counts[node.id] = node.wordCount;
  });
  return counts;
};

export const saveVocabularyTopicCounts = (
  counts: Record<string, number>,
): void => {
  const catalog = readCatalog();
  if (!catalog) return;
  let changed = false;
  const nodesById = { ...catalog.nodesById };
  Object.values(nodesById).forEach((node) => {
    if (
      node.kind === 'topic' &&
      typeof counts[node.id] === 'number' &&
      node.wordCount !== counts[node.id]
    ) {
      nodesById[node.id] = {
        ...node,
        wordCount: counts[node.id],
        updatedAt: Date.now(),
      };
      changed = true;
    }
  });
  if (changed) {
    writeDatabaseValue<VocabularyCatalog>(
      DATABASE_KEYS.vocabularyCatalog,
      { ...catalog, nodesById },
    );
  }
};

export const updateVocabularyTopicCount = (
  topicId: string,
  count: number,
): void => {
  updateCatalogTopicCount(topicId, count);
};

export const removeVocabularyTopicCount = (topicId: string): void => {
  updateCatalogTopicCount(topicId, 0);
};

export const syncAllVocabularyTopicCounts = (): void => {
  const counts: Record<string, number> = {};
  getVocabularyTopicIndex().forEach((topicId) => {
    counts[topicId] = loadVocabularyTopic(topicId)?.length || 0;
  });
  saveVocabularyTopicCounts(counts);
};

export const resolveTopicId = (
  reference: string | null | undefined,
): string | null => {
  if (!reference) return null;
  const catalog = readCatalog();
  if (catalog?.nodesById[reference]?.kind === 'topic') return reference;

  const trainingSets = readDatabaseValue<TrainingVocabularySets>(
    DATABASE_KEYS.trainingSets,
    {},
  );
  if (trainingSets[reference]) return reference;

  const normalizedReference =
    normalizeLegacyTopicLabel(reference).toLocaleLowerCase('vi');
  const topic = catalog
    ? Object.values(catalog.nodesById).find(
      (node): node is CatalogTopic =>
        node.kind === 'topic' &&
        node.label.toLocaleLowerCase('vi') === normalizedReference,
    )
    : null;
  return topic?.id ?? null;
};

export const getTopicLabel = (
  topicId: string | null | undefined,
): string => {
  if (!topicId) return '';
  const node = readCatalog()?.nodesById[topicId];
  return node?.kind === 'topic' ? node.label : '';
};

export const getTopicIdFromSearchParams = (
  searchParams: URLSearchParams,
  canonicalKey = 'topic',
  legacyKey = 'file',
): string | null =>
  resolveTopicId(searchParams.get(canonicalKey) || searchParams.get(legacyKey));
