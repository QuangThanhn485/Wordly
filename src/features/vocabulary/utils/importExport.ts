import type { FolderNode, TopicItem, VocabItem } from '../types';
import { ensureUniqueName, getAllTopicIds } from './treeUtils';
import { normalizeLegacyTopicLabel } from './storageUtils';

export const VOCABULARY_TOPIC_EXPORT_FORMAT =
  'wordly-vocabulary-topic' as const;
export const VOCABULARY_FOLDER_EXPORT_FORMAT =
  'wordly-vocabulary-folder' as const;
export const VOCABULARY_EXPORT_VERSION = '3.0' as const;

export type VocabularyTopicExport = {
  format: typeof VOCABULARY_TOPIC_EXPORT_FORMAT;
  topic: {
    id: string;
    label: string;
  };
  vocabulary: VocabItem[];
  exportDate: string;
  version: typeof VOCABULARY_EXPORT_VERSION;
};

export type VocabularyFolderExport = {
  format: typeof VOCABULARY_FOLDER_EXPORT_FORMAT;
  folderStructure: FolderNode;
  vocabularyData: Record<string, VocabItem[]>;
  exportDate: string;
  version: typeof VOCABULARY_EXPORT_VERSION;
};

export type ParsedVocabularyTopicImport = {
  label: string;
  vocabulary: VocabItem[];
};

export type ParsedVocabularyFolderImport = {
  folder: FolderNode;
  vocabularyByTopicId: Record<string, VocabItem[]>;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const cloneFolderNode = (node: FolderNode): FolderNode => ({
  kind: 'folder',
  id: node.id,
  label: node.label,
  children: node.children.map((child) =>
    child.kind === 'folder'
      ? cloneFolderNode(child)
      : {
        kind: 'topic',
        id: child.id,
        label: child.label,
      }),
});

const cloneVocabulary = (items: VocabItem[]): VocabItem[] =>
  items.map((item) => ({ ...item }));

const parseVocabulary = (
  input: unknown,
  context: string,
): VocabItem[] => {
  if (!Array.isArray(input)) {
    throw new Error(`${context} must be an array.`);
  }

  return input.map((rawItem, index) => {
    if (!isRecord(rawItem)) {
      throw new Error(`${context}[${index}] is not a valid object.`);
    }

    const word =
      typeof rawItem.word === 'string' ? rawItem.word.trim() : '';
    if (!word) {
      throw new Error(`${context}[${index}] is missing the word.`);
    }

    const item: VocabItem = {
      word,
      type: typeof rawItem.type === 'string' ? rawItem.type.trim() : '',
      vnMeaning:
        typeof rawItem.vnMeaning === 'string'
          ? rawItem.vnMeaning.trim()
          : '',
      pronunciation:
        typeof rawItem.pronunciation === 'string'
          ? rawItem.pronunciation.trim()
          : '',
    };

    if (typeof rawItem.id === 'string' && rawItem.id.trim()) {
      item.id = rawItem.id;
    }
    if (
      typeof rawItem.createdAt === 'number' &&
      Number.isFinite(rawItem.createdAt)
    ) {
      item.createdAt = rawItem.createdAt;
    }
    if (
      typeof rawItem.updatedAt === 'number' &&
      Number.isFinite(rawItem.updatedAt)
    ) {
      item.updatedAt = rawItem.updatedAt;
    }

    return item;
  });
};

const getExportDate = (exportedAt: Date | number): string => {
  const date =
    exportedAt instanceof Date ? exportedAt : new Date(exportedAt);
  if (!Number.isFinite(date.getTime())) {
    throw new Error('Invalid vocabulary export timestamp.');
  }
  return date.toISOString();
};

export const createVocabularyTopicExport = (
  topic: TopicItem,
  vocabulary: VocabItem[],
  exportedAt: Date | number = new Date(),
): VocabularyTopicExport => ({
  format: VOCABULARY_TOPIC_EXPORT_FORMAT,
  topic: {
    id: topic.id,
    label: topic.label.normalize('NFC'),
  },
  vocabulary: cloneVocabulary(vocabulary),
  exportDate: getExportDate(exportedAt),
  version: VOCABULARY_EXPORT_VERSION,
});

export const parseVocabularyTopicImport = (
  input: unknown,
  fallbackLabel: string,
): ParsedVocabularyTopicImport => {
  if (!isRecord(input)) {
    throw new Error('Invalid vocabulary topic file.');
  }
  if (
    input.format !== undefined &&
    input.format !== VOCABULARY_TOPIC_EXPORT_FORMAT
  ) {
    throw new Error('The selected file is not a vocabulary topic export.');
  }

  const topic = isRecord(input.topic) ? input.topic : null;
  const rawLabel =
    topic?.label ??
    input.topicLabel ??
    input.fileName ??
    fallbackLabel;

  return {
    label: normalizeLegacyTopicLabel(rawLabel),
    vocabulary: parseVocabulary(input.vocabulary, 'vocabulary'),
  };
};

export const createVocabularyFolderExport = (
  folder: FolderNode,
  vocabularyByTopicId: Record<string, VocabItem[]>,
  exportedAt: Date | number = new Date(),
): VocabularyFolderExport => {
  const vocabularyData: Record<string, VocabItem[]> = {};
  getAllTopicIds(folder).forEach((topicId) => {
    vocabularyData[topicId] = cloneVocabulary(
      vocabularyByTopicId[topicId] ?? [],
    );
  });

  return {
    format: VOCABULARY_FOLDER_EXPORT_FORMAT,
    folderStructure: cloneFolderNode(folder),
    vocabularyData,
    exportDate: getExportDate(exportedAt),
    version: VOCABULARY_EXPORT_VERSION,
  };
};

export const parseVocabularyFolderImport = (
  input: unknown,
  createId: () => string,
  defaults: { folder: string; topic: string },
): ParsedVocabularyFolderImport => {
  if (!isRecord(input)) {
    throw new Error('Invalid vocabulary folder file.');
  }
  if (
    input.format !== undefined &&
    input.format !== VOCABULARY_FOLDER_EXPORT_FORMAT
  ) {
    throw new Error('The selected file is not a vocabulary folder export.');
  }
  if (!isRecord(input.folderStructure) || !isRecord(input.vocabularyData)) {
    throw new Error('Vocabulary folder structure is incomplete.');
  }

  const strictCurrentFormat =
    input.format === VOCABULARY_FOLDER_EXPORT_FORMAT;
  const sourceVocabulary = input.vocabularyData;
  const allocatedIds = new Set<string>();
  const topicSources = new Map<string, string[]>();

  const allocateId = (): string => {
    let id = createId();
    let attempts = 0;
    while (!id || allocatedIds.has(id)) {
      id = createId();
      attempts += 1;
      if (attempts > 100) {
        throw new Error('Unable to allocate a unique vocabulary node ID.');
      }
    }
    allocatedIds.add(id);
    return id;
  };

  const normalizeNode = (
    rawNode: Record<string, unknown>,
  ): FolderNode | TopicItem => {
    if (rawNode.kind === 'folder') {
      if (
        rawNode.children !== undefined &&
        !Array.isArray(rawNode.children)
      ) {
        throw new Error('A vocabulary folder has invalid children.');
      }

      const siblings: Array<FolderNode | TopicItem> = [];
      const children = (rawNode.children ?? []).map((rawChild) => {
        if (!isRecord(rawChild)) {
          throw new Error('A vocabulary folder contains an invalid node.');
        }
        const child = normalizeNode(rawChild);
        child.label = ensureUniqueName(
          siblings,
          child.label,
          child.kind === 'folder',
        );
        siblings.push(child);
        return child;
      });

      const label =
        typeof rawNode.label === 'string' && rawNode.label.trim()
          ? rawNode.label.trim().normalize('NFC')
          : defaults.folder;
      return {
        kind: 'folder',
        id: allocateId(),
        label,
        children,
      };
    }

    if (rawNode.kind !== 'topic' && rawNode.kind !== 'file') {
      throw new Error('Unsupported vocabulary tree node.');
    }

    const id = allocateId();
    const rawLabel =
      rawNode.kind === 'file' ? rawNode.name : rawNode.label;
    const label =
      rawNode.kind === 'file'
        ? normalizeLegacyTopicLabel(rawLabel)
        : (
          typeof rawLabel === 'string' && rawLabel.trim()
            ? rawLabel.trim().normalize('NFC')
            : defaults.topic
        );
    const sourceReferences = [
      rawNode.id,
      rawNode.name,
      rawNode.label,
    ].filter(
      (value): value is string =>
        typeof value === 'string' && value.length > 0,
    );
    topicSources.set(id, sourceReferences);
    return { kind: 'topic', id, label };
  };

  const folder = normalizeNode(input.folderStructure);
  if (folder.kind !== 'folder') {
    throw new Error('The vocabulary import root must be a folder.');
  }

  const vocabularyByTopicId: Record<string, VocabItem[]> = {};
  topicSources.forEach((references, topicId) => {
    const sourceKey = references.find((reference) =>
      Object.prototype.hasOwnProperty.call(sourceVocabulary, reference),
    );
    if (!sourceKey) {
      if (strictCurrentFormat) {
        throw new Error(
          `Vocabulary data is missing for topic "${references[0] || topicId}".`,
        );
      }
      vocabularyByTopicId[topicId] = [];
      return;
    }
    vocabularyByTopicId[topicId] = parseVocabulary(
      sourceVocabulary[sourceKey],
      `vocabularyData.${sourceKey}`,
    );
  });

  return { folder, vocabularyByTopicId };
};
