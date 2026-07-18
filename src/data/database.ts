export const DATABASE_SCHEMA_VERSION = 3 as const;
export const DATABASE_NAMESPACE = `wordly:v${DATABASE_SCHEMA_VERSION}`;

export const DATABASE_KEYS = {
  meta: `${DATABASE_NAMESPACE}:system:meta`,
  vocabularyCatalog: `${DATABASE_NAMESPACE}:vocabulary:catalog`,
  vocabularyTopicPrefix: `${DATABASE_NAMESPACE}:vocabulary:topic:`,
  trainingSets: `${DATABASE_NAMESPACE}:training:sets`,
  trainingSessions: `${DATABASE_NAMESPACE}:training:sessions`,
  mistakes: `${DATABASE_NAMESPACE}:learning:mistakes`,
  preferences: `${DATABASE_NAMESPACE}:preferences`,
  backupMetadata: `${DATABASE_NAMESPACE}:system:backup`,
} as const;

export type DatabaseRecord<T> = {
  schemaVersion: typeof DATABASE_SCHEMA_VERSION;
  revision: number;
  updatedAt: number;
  data: T;
};

export type DatabaseMeta = {
  databaseId: string;
  createdAt: number;
};

export type DatabaseBackup = {
  format: 'wordly-key-value-backup';
  schemaVersion: typeof DATABASE_SCHEMA_VERSION;
  exportedAt: number;
  records: Record<string, DatabaseRecord<unknown>>;
};

const LEGACY_EXACT_KEYS = new Set([
  'themeMode',
  'vocabulary_view_mode',
]);

const LEGACY_PREFIXES = [
  'wordly_',
];

let initialized = false;
const recordCache = new Map<
  string,
  { serialized: string; record: DatabaseRecord<unknown> }
>();

const createId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `db_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isDatabaseRecord = (value: unknown): value is DatabaseRecord<unknown> =>
  isRecord(value) &&
  value.schemaVersion === DATABASE_SCHEMA_VERSION &&
  typeof value.revision === 'number' &&
  Number.isInteger(value.revision) &&
  value.revision > 0 &&
  typeof value.updatedAt === 'number' &&
  Number.isFinite(value.updatedAt) &&
  Object.prototype.hasOwnProperty.call(value, 'data');

const isVocabularyItem = (value: unknown): boolean =>
  isRecord(value) &&
  typeof value.id === 'string' &&
  value.id.length > 0 &&
  typeof value.word === 'string' &&
  value.word.trim().length > 0 &&
  typeof value.type === 'string' &&
  typeof value.vnMeaning === 'string' &&
  typeof value.pronunciation === 'string' &&
  typeof value.createdAt === 'number' &&
  typeof value.updatedAt === 'number';

const isVocabularyCatalog = (value: unknown): boolean => {
  if (
    !isRecord(value) ||
    value.catalogVersion !== 1 ||
    typeof value.rootId !== 'string' ||
    !isRecord(value.nodesById)
  ) {
    return false;
  }

  const nodes = value.nodesById;
  const root = nodes[value.rootId];
  if (!isRecord(root) || root.kind !== 'folder' || root.parentId !== null) {
    return false;
  }

  for (const [id, node] of Object.entries(nodes)) {
    if (
      !isRecord(node) ||
      node.id !== id ||
      (node.kind !== 'folder' && node.kind !== 'topic') ||
      typeof node.label !== 'string' ||
      node.label.trim().length === 0 ||
      (node.parentId !== null && typeof node.parentId !== 'string') ||
      typeof node.createdAt !== 'number' ||
      typeof node.updatedAt !== 'number'
    ) {
      return false;
    }
    if (
      node.kind === 'folder' &&
      (
        !Array.isArray(node.childIds) ||
        node.childIds.some((childId) => typeof childId !== 'string') ||
        new Set(node.childIds).size !== node.childIds.length
      )
    ) {
      return false;
    }
    if (
      node.kind === 'topic' &&
      (
        typeof node.wordCount !== 'number' ||
        !Number.isInteger(node.wordCount) ||
        node.wordCount < 0
      )
    ) {
      return false;
    }
  }

  const visited = new Set<string>();
  const visit = (id: string, expectedParentId: string | null): boolean => {
    if (visited.has(id)) return false;
    const node = nodes[id];
    if (!isRecord(node) || node.parentId !== expectedParentId) return false;
    visited.add(id);
    if (node.kind !== 'folder') return true;
    return (node.childIds as string[]).every((childId) =>
      visit(childId, id),
    );
  };

  return visit(value.rootId, null) && visited.size === Object.keys(nodes).length;
};

const isValidRecordData = (key: string, data: unknown): boolean => {
  if (key === DATABASE_KEYS.meta) {
    return (
      isRecord(data) &&
      typeof data.databaseId === 'string' &&
      typeof data.createdAt === 'number'
    );
  }
  if (key === DATABASE_KEYS.vocabularyCatalog) {
    return isVocabularyCatalog(data);
  }
  if (key.startsWith(DATABASE_KEYS.vocabularyTopicPrefix)) {
    if (
      !isRecord(data) ||
      typeof data.topicId !== 'string' ||
      !Array.isArray(data.items) ||
      !data.items.every(isVocabularyItem) ||
      typeof data.createdAt !== 'number' ||
      typeof data.updatedAt !== 'number'
    ) {
      return false;
    }
    const encodedTopicId = key.slice(DATABASE_KEYS.vocabularyTopicPrefix.length);
    try {
      return decodeURIComponent(encodedTopicId) === data.topicId;
    } catch {
      return false;
    }
  }
  if (key === DATABASE_KEYS.trainingSets) {
    return (
      isRecord(data) &&
      Object.entries(data).every(([topicId, set]) =>
        isRecord(set) &&
        set.topicId === topicId &&
        Array.isArray(set.items) &&
        set.items.every(isVocabularyItem) &&
        typeof set.createdAt === 'number' &&
        typeof set.updatedAt === 'number',
      )
    );
  }
  if (key === DATABASE_KEYS.trainingSessions) {
    return (
      isRecord(data) &&
      Object.values(data).every((session) => isRecord(session))
    );
  }
  if (key === DATABASE_KEYS.mistakes) {
    return (
      isRecord(data) &&
      Object.values(data).every((mistake) =>
        isRecord(mistake) &&
        typeof mistake.wordId === 'string' &&
        typeof mistake.word === 'string' &&
        typeof mistake.viMeaning === 'string' &&
        typeof mistake.topicId === 'string' &&
        typeof mistake.topicLabel === 'string' &&
        typeof mistake.trainingMode === 'string' &&
        typeof mistake.mistakeCount === 'number' &&
        typeof mistake.lastMistakeTime === 'number',
      )
    );
  }
  if (key === DATABASE_KEYS.preferences) {
    return (
      isRecord(data) &&
      (data.themeMode === 'light' || data.themeMode === 'dark') &&
      (
        data.vocabularyViewMode === 'tree' ||
        data.vocabularyViewMode === 'grid'
      ) &&
      (
        data.language === undefined ||
        data.language === null ||
        data.language === 'vi' ||
        data.language === 'en'
      ) &&
      isRecord(data.flashcards) &&
      typeof data.flashcards.removeCorrectCards === 'boolean' &&
      (
        data.writeTraining === undefined ||
        (
          isRecord(data.writeTraining) &&
          typeof data.writeTraining.answerReviewDurationMs === 'number' &&
          Number.isInteger(data.writeTraining.answerReviewDurationMs) &&
          data.writeTraining.answerReviewDurationMs >= 1000 &&
          data.writeTraining.answerReviewDurationMs <= 10000 &&
          (
            data.writeTraining.disableAutoAdvance === undefined ||
            typeof data.writeTraining.disableAutoAdvance === 'boolean'
          )
        )
      )
    );
  }
  if (key === DATABASE_KEYS.backupMetadata) {
    return (
      isRecord(data) &&
      (
        data.lastBackupAt === null ||
        typeof data.lastBackupAt === 'number'
      )
    );
  }
  return false;
};

const parseRecord = (serialized: string | null): DatabaseRecord<unknown> | null => {
  if (!serialized) return null;
  try {
    const parsed = JSON.parse(serialized);
    return isDatabaseRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

const readRawRecord = (key: string): DatabaseRecord<unknown> | null => {
  const serialized = localStorage.getItem(key);
  if (!serialized) {
    recordCache.delete(key);
    return null;
  }
  const cached = recordCache.get(key);
  if (cached?.serialized === serialized) return cached.record;
  const record = parseRecord(serialized);
  if (record) {
    recordCache.set(key, { serialized, record });
  } else {
    recordCache.delete(key);
  }
  return record;
};

const listRawDatabaseKeys = (): string[] => {
  const keys: string[] = [];
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (key?.startsWith(`${DATABASE_NAMESPACE}:`)) keys.push(key);
  }
  return keys.sort();
};

const writeRawRecord = <T,>(
  key: string,
  data: T,
  previousRevision = 0,
  updatedAt = Date.now(),
): DatabaseRecord<T> => {
  const record: DatabaseRecord<T> = {
    schemaVersion: DATABASE_SCHEMA_VERSION,
    revision: previousRevision + 1,
    updatedAt,
    data,
  };
  const serialized = JSON.stringify(record);
  localStorage.setItem(key, serialized);
  if (localStorage.getItem(key) !== serialized) {
    throw new Error(`Khong the xac minh du lieu da ghi tai khoa "${key}".`);
  }
  recordCache.set(key, {
    serialized,
    record: record as DatabaseRecord<unknown>,
  });
  return record;
};

const removeLegacyData = (): void => {
  const keysToRemove: string[] = [];
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (
      key &&
      !key.startsWith(`${DATABASE_NAMESPACE}:`) &&
      (
        LEGACY_EXACT_KEYS.has(key) ||
        LEGACY_PREFIXES.some((prefix) => key.startsWith(prefix))
      )
    ) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach((key) => localStorage.removeItem(key));
};

export const initializeDatabase = (): void => {
  if (initialized) return;

  const existingMeta = readRawRecord(DATABASE_KEYS.meta);
  if (!existingMeta || !isValidRecordData(DATABASE_KEYS.meta, existingMeta.data)) {
    removeLegacyData();
    const now = Date.now();
    writeRawRecord<DatabaseMeta>(
      DATABASE_KEYS.meta,
      { databaseId: createId(), createdAt: now },
      existingMeta?.revision ?? 0,
      now,
    );
  }
  initialized = true;
};

export const readDatabaseRecord = <T,>(key: string): DatabaseRecord<T> | null => {
  initializeDatabase();
  const record = readRawRecord(key);
  if (record && !isValidRecordData(key, record.data)) {
    throw new Error(`Du lieu tai khoa "${key}" khong dung schema v3.`);
  }
  return record as DatabaseRecord<T> | null;
};

export const readDatabaseValue = <T,>(key: string, fallback: T): T =>
  readDatabaseRecord<T>(key)?.data ?? fallback;

export const writeDatabaseValue = <T,>(key: string, data: T): DatabaseRecord<T> => {
  initializeDatabase();
  if (!isValidRecordData(key, data)) {
    throw new Error(`Tu choi ghi payload khong hop le vao khoa "${key}".`);
  }
  const previous = readRawRecord(key);
  return writeRawRecord(key, data, previous?.revision ?? 0);
};

export const removeDatabaseValue = (key: string): boolean => {
  initializeDatabase();
  const existed = localStorage.getItem(key) !== null;
  localStorage.removeItem(key);
  recordCache.delete(key);
  return existed;
};

export const listDatabaseKeys = (): string[] => {
  initializeDatabase();
  return listRawDatabaseKeys();
};

export const getDatabaseUsageBytes = (): number => {
  initializeDatabase();
  return listRawDatabaseKeys().reduce((total, key) => {
    const value = localStorage.getItem(key) || '';
    return total + (key.length + value.length) * 2;
  }, 0);
};

export const createDatabaseBackup = (exportedAt = Date.now()): DatabaseBackup => {
  initializeDatabase();
  const records: Record<string, DatabaseRecord<unknown>> = {};
  listRawDatabaseKeys().forEach((key) => {
    const record = readRawRecord(key);
    if (!record || !isValidRecordData(key, record.data)) {
      throw new Error(
        `Khong the backup vi khoa "${key}" khong dung schema v3.`,
      );
    }
    records[key] = record;
  });
  const backup: DatabaseBackup = {
    format: 'wordly-key-value-backup',
    schemaVersion: DATABASE_SCHEMA_VERSION,
    exportedAt,
    records,
  };
  return validateBackup(backup);
};

const validateBackup = (backup: unknown): DatabaseBackup => {
  if (
    !isRecord(backup) ||
    backup.format !== 'wordly-key-value-backup' ||
    backup.schemaVersion !== DATABASE_SCHEMA_VERSION ||
    typeof backup.exportedAt !== 'number' ||
    !isRecord(backup.records)
  ) {
    throw new Error('File backup khong dung dinh dang Wordly schema v3.');
  }

  const records: Record<string, DatabaseRecord<unknown>> = {};
  Object.entries(backup.records).forEach(([key, value]) => {
    if (
      !key.startsWith(`${DATABASE_NAMESPACE}:`) ||
      !isDatabaseRecord(value) ||
      !isValidRecordData(key, value.data)
    ) {
      throw new Error(`Record backup khong hop le: "${key}".`);
    }
    records[key] = value;
  });

  if (!records[DATABASE_KEYS.meta]) {
    throw new Error('File backup thieu metadata cua database.');
  }

  const catalogRecord = records[DATABASE_KEYS.vocabularyCatalog];
  if (catalogRecord && isRecord(catalogRecord.data)) {
    const nodes = catalogRecord.data.nodesById as Record<string, unknown>;
    for (const [key, record] of Object.entries(records)) {
      if (!key.startsWith(DATABASE_KEYS.vocabularyTopicPrefix)) continue;
      const topicData = record.data as Record<string, unknown>;
      const topicId = topicData.topicId as string;
      const topicNode = nodes[topicId];
      if (
        !isRecord(topicNode) ||
        topicNode.kind !== 'topic' ||
        topicNode.wordCount !== (topicData.items as unknown[]).length
      ) {
        throw new Error(
          `Topic "${topicId}" khong khop voi vocabulary catalog.`,
        );
      }
    }
    for (const node of Object.values(nodes)) {
      if (!isRecord(node) || node.kind !== 'topic' || node.wordCount === 0) {
        continue;
      }
      const topicKey =
        `${DATABASE_KEYS.vocabularyTopicPrefix}${encodeURIComponent(node.id as string)}`;
      if (!records[topicKey]) {
        throw new Error(
          `Catalog khai bao topic "${node.id}" co du lieu nhung thieu record.`,
        );
      }
    }
  } else if (
    Object.keys(records).some((key) =>
      key.startsWith(DATABASE_KEYS.vocabularyTopicPrefix),
    )
  ) {
    throw new Error('File backup co topic nhung thieu vocabulary catalog.');
  }

  return {
    format: 'wordly-key-value-backup',
    schemaVersion: DATABASE_SCHEMA_VERSION,
    exportedAt: backup.exportedAt,
    records,
  };
};

export const restoreDatabaseBackup = (input: unknown): DatabaseBackup => {
  initializeDatabase();
  const backup = validateBackup(input);
  const previousValues = new Map<string, string>();
  listRawDatabaseKeys().forEach((key) => {
    const value = localStorage.getItem(key);
    if (value !== null) previousValues.set(key, value);
  });

  try {
    listRawDatabaseKeys().forEach((key) => localStorage.removeItem(key));
    recordCache.clear();
    Object.entries(backup.records).forEach(([key, record]) => {
      const serialized = JSON.stringify(record);
      localStorage.setItem(key, serialized);
      if (localStorage.getItem(key) !== serialized) {
        throw new Error(`Khong the xac minh record khoi phuc "${key}".`);
      }
    });
    initialized = false;
    initializeDatabase();
    return backup;
  } catch (error) {
    listRawDatabaseKeys().forEach((key) => localStorage.removeItem(key));
    recordCache.clear();
    previousValues.forEach((value, key) => localStorage.setItem(key, value));
    initialized = false;
    initializeDatabase();
    throw error;
  }
};

export const clearDatabase = (
  options: { preserveBackupMetadata?: boolean } = {},
): number => {
  initializeDatabase();
  const preservedBackup = options.preserveBackupMetadata
    ? localStorage.getItem(DATABASE_KEYS.backupMetadata)
    : null;
  const keys = listRawDatabaseKeys();
  keys.forEach((key) => localStorage.removeItem(key));
  recordCache.clear();
  initialized = false;
  initializeDatabase();
  if (preservedBackup) {
    localStorage.setItem(DATABASE_KEYS.backupMetadata, preservedBackup);
  }
  return keys.filter((key) => key !== DATABASE_KEYS.meta).length;
};

export const __resetDatabaseForTests = (): void => {
  initialized = false;
  recordCache.clear();
};
