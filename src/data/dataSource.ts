import {
  DATABASE_KEYS,
  DATABASE_NAMESPACE,
  addDatabaseMutationListener,
  createDatabaseBackup,
  hasValidLocalDatabase,
  readDatabaseRecord,
  restoreDatabaseBackup,
  validateDatabaseBackup,
  type DatabaseBackup,
  type DatabaseMutation,
} from './database';

export type DataSourceMode = 'localStorage' | 'upstash';

export type UpstashConfig = {
  url: string;
  token: string;
};

export type DataSourceConfig = {
  mode: DataSourceMode;
  upstash?: UpstashConfig;
  updatedAt: number;
};

export type CloudManifest = {
  schemaVersion: 1;
  project: 'wordly';
  databaseNamespace: typeof DATABASE_NAMESPACE;
  revision: number;
  updatedAt: number;
  keyCount: number;
  checksum: string;
};

type CloudSnapshot = {
  format: 'wordly-cloud-snapshot';
  snapshotVersion: 1;
  manifest: CloudManifest;
  backup: DatabaseBackup;
};

export type StorageComparison = {
  local: CloudManifest;
  remote: CloudManifest | null;
  localValid: boolean;
  remoteHasData: boolean;
  relation: 'same' | 'local-newer' | 'remote-newer' | 'diverged' | 'remote-empty';
};

export type CloudSyncRuntime = {
  status: 'idle' | 'checking' | 'syncing' | 'synced' | 'error';
  dirty: boolean;
  lastSyncedAt: number | null;
  error: string | null;
};

type LocalSyncMeta = {
  revision: number;
  updatedAt: number;
  dirty: boolean;
  baseRemoteRevision: number | null;
  lastSyncedChecksum: string | null;
  lastSyncedAt: number | null;
};

export const DATA_SOURCE_CONFIG_KEY = 'wordly:client:data-source:v1';
export const DATA_SOURCE_META_KEY = 'wordly:client:cloud-meta:v1';
export const REMOTE_KEY_PREFIX = 'wordly:storage:v1:';
export const REMOTE_SNAPSHOT_KEY = `${REMOTE_KEY_PREFIX}snapshot`;
export const CLOUD_SYNC_EVENT = 'wordly-cloud-sync';

const UPLOAD_DEBOUNCE_MS = 2200;
const UPLOAD_BACKOFF_BASE_MS = 10_000;
const UPLOAD_BACKOFF_MAX_MS = 120_000;
const DEFAULT_LOCAL_META: LocalSyncMeta = {
  revision: 0,
  updatedAt: 0,
  dirty: false,
  baseRemoteRevision: null,
  lastSyncedChecksum: null,
  lastSyncedAt: null,
};

let suppressMutationTracking = 0;
let writeThroughEnabled = false;
let uploadTimer: number | null = null;
let uploadPromise: Promise<CloudManifest | null> | null = null;
let uploadAgain = false;
let uploadFailureCount = 0;
let nextAutomaticUploadAt = 0;
let runtime: CloudSyncRuntime = {
  status: 'idle',
  dirty: false,
  lastSyncedAt: null,
  error: null,
};

const isBrowser = (): boolean =>
  typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

export class CloudStorageError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message);
    this.name = 'CloudStorageError';
    this.cause = options?.cause;
  }
}

const safeParse = <T,>(raw: string | null, fallback: T): T => {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

const stripInputValue = (input: string): string => {
  let value = input.trim();
  const assignment = value.match(/^[A-Za-z_][A-Za-z0-9_]*\s*=\s*(.+)$/s);
  if (assignment) value = assignment[1].trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }
  return value.trim();
};

const extractEnvValue = (input: string, envName: string): string | undefined => {
  const escapedName = envName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = input.match(
    new RegExp(`${escapedName}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s\\r\\n]+))`),
  );
  return match?.[1] ?? match?.[2] ?? match?.[3];
};

export const sanitizeUpstashConfig = (config: UpstashConfig): UpstashConfig => ({
  url: stripInputValue(config.url).replace(/\/+$/, ''),
  token: stripInputValue(config.token),
});

export const parseUpstashConfigInput = (
  urlInput: string,
  tokenInput: string,
): UpstashConfig => {
  const combined = `${urlInput}\n${tokenInput}`;
  return sanitizeUpstashConfig({
    url: extractEnvValue(combined, 'UPSTASH_REDIS_REST_URL') ?? urlInput,
    token: extractEnvValue(combined, 'UPSTASH_REDIS_REST_TOKEN') ?? tokenInput,
  });
};

const validateUpstashConfig = (config: UpstashConfig): UpstashConfig => {
  const sanitized = sanitizeUpstashConfig(config);
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(sanitized.url);
  } catch (error) {
    throw new CloudStorageError('REST URL Upstash khong hop le.', { cause: error });
  }
  if (parsedUrl.protocol !== 'https:') {
    throw new CloudStorageError('REST URL Upstash phai bat dau bang https://.');
  }
  if (!sanitized.token) {
    throw new CloudStorageError('REST token Upstash khong duoc de trong.');
  }
  return sanitized;
};

const assertRemoteKey = (key: string): void => {
  if (!key.startsWith(REMOTE_KEY_PREFIX)) {
    throw new CloudStorageError(`Tu choi thao tac Redis ngoai namespace "${REMOTE_KEY_PREFIX}".`);
  }
};

const createRedis = async (config: UpstashConfig) => {
  const { Redis } = await import('@upstash/redis/cloudflare');
  const sanitized = validateUpstashConfig(config);
  return new Redis({
    url: sanitized.url,
    token: sanitized.token,
    automaticDeserialization: false,
    enableTelemetry: false,
    keepAlive: false,
    readYourWrites: true,
  });
};

const redisGet = async (
  redis: Awaited<ReturnType<typeof createRedis>>,
  key: string,
): Promise<unknown> => {
  assertRemoteKey(key);
  return redis.get(key);
};

const COMPARE_AND_SET_SCRIPT = `
local current = redis.call('GET', KEYS[1])
if ARGV[1] == '__EMPTY__' then
  if current then return 0 end
else
  if not current then return 0 end
  local ok, snapshot = pcall(cjson.decode, current)
  if not ok or type(snapshot) ~= 'table' or type(snapshot.manifest) ~= 'table' then
    return 0
  end
  if snapshot.format ~= 'wordly-cloud-snapshot' or snapshot.manifest.project ~= 'wordly' then
    return 0
  end
  if tonumber(ARGV[1]) ~= snapshot.manifest.revision then return 0 end
end
redis.call('SET', KEYS[1], ARGV[2])
return 1
`;

const redisCompareAndSet = async (
  redis: Awaited<ReturnType<typeof createRedis>>,
  key: string,
  expectedRevision: number | null,
  value: string,
): Promise<boolean> => {
  assertRemoteKey(key);
  const result = await redis.eval<[string, string], number>(
    COMPARE_AND_SET_SCRIPT,
    [key],
    [expectedRevision === null ? '__EMPTY__' : String(expectedRevision), value],
  );
  return Number(result) === 1;
};

const stableStringify = (value: unknown): string => {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
    .join(',')}}`;
};

const checksumRecords = (records: DatabaseBackup['records']): string => {
  const input = stableStringify(records);
  let first = 2166136261;
  let second = 5381;
  for (let index = 0; index < input.length; index += 1) {
    const code = input.charCodeAt(index);
    first ^= code;
    first = Math.imul(first, 16777619);
    second = Math.imul(second, 33) ^ code;
  }
  return `${(first >>> 0).toString(16).padStart(8, '0')}${(second >>> 0)
    .toString(16)
    .padStart(8, '0')}`;
};

const nextRevision = (previous = 0): number => {
  const now = Date.now();
  return now > previous ? now : previous + 1;
};

const getLocalMeta = (): LocalSyncMeta => {
  if (!isBrowser()) return DEFAULT_LOCAL_META;
  const parsed = safeParse<Partial<LocalSyncMeta>>(
    localStorage.getItem(DATA_SOURCE_META_KEY),
    {},
  );
  return {
    revision:
      typeof parsed.revision === 'number' && Number.isFinite(parsed.revision) && parsed.revision >= 0
        ? parsed.revision
        : 0,
    updatedAt:
      typeof parsed.updatedAt === 'number' && Number.isFinite(parsed.updatedAt) && parsed.updatedAt >= 0
        ? parsed.updatedAt
        : 0,
    dirty: parsed.dirty === true,
    baseRemoteRevision:
      typeof parsed.baseRemoteRevision === 'number' && Number.isFinite(parsed.baseRemoteRevision)
        ? parsed.baseRemoteRevision
        : null,
    lastSyncedChecksum:
      typeof parsed.lastSyncedChecksum === 'string' ? parsed.lastSyncedChecksum : null,
    lastSyncedAt:
      typeof parsed.lastSyncedAt === 'number' && Number.isFinite(parsed.lastSyncedAt)
        ? parsed.lastSyncedAt
        : null,
  };
};

const setLocalMeta = (meta: LocalSyncMeta): void => {
  if (!isBrowser()) return;
  localStorage.setItem(DATA_SOURCE_META_KEY, JSON.stringify(meta));
  runtime = {
    ...runtime,
    dirty: meta.dirty,
    lastSyncedAt: meta.lastSyncedAt,
  };
};

const dispatchSyncEvent = (): void => {
  if (!isBrowser()) return;
  window.dispatchEvent(new CustomEvent(CLOUD_SYNC_EVENT));
};

const setRuntime = (next: Partial<CloudSyncRuntime>): void => {
  runtime = { ...runtime, ...next };
  dispatchSyncEvent();
};

const resetUploadBackoff = (): void => {
  uploadFailureCount = 0;
  nextAutomaticUploadAt = 0;
};

const increaseUploadBackoff = (): void => {
  uploadFailureCount += 1;
  nextAutomaticUploadAt = Date.now() + Math.min(
    UPLOAD_BACKOFF_MAX_MS,
    UPLOAD_BACKOFF_BASE_MS * (2 ** Math.min(uploadFailureCount - 1, 4)),
  );
};

export const getCloudSyncRuntime = (): CloudSyncRuntime => ({ ...runtime });

export const addCloudSyncListener = (listener: () => void): (() => void) => {
  if (!isBrowser()) return () => undefined;
  window.addEventListener(CLOUD_SYNC_EVENT, listener);
  return () => window.removeEventListener(CLOUD_SYNC_EVENT, listener);
};

export const getDataSourceConfig = (): DataSourceConfig => {
  if (!isBrowser()) return { mode: 'localStorage', updatedAt: 0 };
  const parsed = safeParse<DataSourceConfig | null>(
    localStorage.getItem(DATA_SOURCE_CONFIG_KEY),
    null,
  );
  if (
    !parsed ||
    (parsed.mode !== 'localStorage' && parsed.mode !== 'upstash')
  ) {
    return { mode: 'localStorage', updatedAt: 0 };
  }
  const validUpstash =
    parsed.upstash &&
    typeof parsed.upstash.url === 'string' &&
    typeof parsed.upstash.token === 'string'
      ? sanitizeUpstashConfig(parsed.upstash)
      : undefined;
  return {
    mode: parsed.mode,
    updatedAt:
      typeof parsed.updatedAt === 'number' && Number.isFinite(parsed.updatedAt)
        ? parsed.updatedAt
        : 0,
    upstash: validUpstash,
  };
};

export const saveDataSourceConfig = (config: DataSourceConfig): void => {
  if (!isBrowser()) return;
  const next: DataSourceConfig = {
    ...config,
    upstash: config.upstash ? validateUpstashConfig(config.upstash) : undefined,
  };
  localStorage.setItem(DATA_SOURCE_CONFIG_KEY, JSON.stringify(next));
  dispatchSyncEvent();
};

export const setDataSourceMode = (
  mode: DataSourceMode,
  upstash?: UpstashConfig,
): DataSourceConfig => {
  const current = getDataSourceConfig();
  const next: DataSourceConfig = {
    mode,
    upstash: upstash ? validateUpstashConfig(upstash) : current.upstash,
    updatedAt: Date.now(),
  };
  saveDataSourceConfig(next);
  return next;
};

const buildLocalSnapshot = (): CloudSnapshot => {
  const now = Date.now();
  const completeBackup = createDatabaseBackup(now);
  const cloudRecords = { ...completeBackup.records };
  delete cloudRecords[DATABASE_KEYS.trainingSessions];
  const backup: DatabaseBackup = {
    ...completeBackup,
    records: cloudRecords,
  };
  let meta = getLocalMeta();
  if (meta.revision === 0) {
    const latestRecordUpdate = Math.max(
      0,
      ...Object.values(backup.records).map((record) => record.updatedAt),
    );
    meta = {
      ...meta,
      revision: latestRecordUpdate || now,
      updatedAt: latestRecordUpdate || now,
      dirty: true,
    };
    setLocalMeta(meta);
  }
  const checksum = checksumRecords(backup.records);
  return {
    format: 'wordly-cloud-snapshot',
    snapshotVersion: 1,
    manifest: {
      schemaVersion: 1,
      project: 'wordly',
      databaseNamespace: DATABASE_NAMESPACE,
      revision: meta.revision,
      updatedAt: meta.updatedAt,
      keyCount: Object.keys(backup.records).length,
      checksum,
    },
    backup,
  };
};

const parseCloudSnapshot = (raw: unknown): CloudSnapshot | null => {
  let value = raw;
  if (typeof raw === 'string') {
    try {
      value = JSON.parse(raw);
    } catch (error) {
      throw new CloudStorageError('Snapshot Wordly tren Redis khong phai JSON hop le.', {
        cause: error,
      });
    }
  }
  if (value === null || value === undefined) return null;
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new CloudStorageError('Snapshot Wordly tren Redis khong dung dinh dang.');
  }
  const candidate = value as Partial<CloudSnapshot>;
  const manifest = candidate.manifest;
  if (
    candidate.format !== 'wordly-cloud-snapshot' ||
    candidate.snapshotVersion !== 1 ||
    !manifest ||
    manifest.schemaVersion !== 1 ||
    manifest.project !== 'wordly' ||
    manifest.databaseNamespace !== DATABASE_NAMESPACE ||
    typeof manifest.revision !== 'number' ||
    !Number.isFinite(manifest.revision) ||
    manifest.revision <= 0 ||
    typeof manifest.updatedAt !== 'number' ||
    !Number.isFinite(manifest.updatedAt) ||
    manifest.updatedAt <= 0 ||
    typeof manifest.keyCount !== 'number' ||
    !Number.isInteger(manifest.keyCount) ||
    manifest.keyCount < 1 ||
    typeof manifest.checksum !== 'string'
  ) {
    throw new CloudStorageError('Snapshot Redis khong thuoc Wordly schema hien tai.');
  }
  const backup = validateDatabaseBackup(candidate.backup);
  if (backup.records[DATABASE_KEYS.trainingSessions]) {
    throw new CloudStorageError(
      'Snapshot Redis chua training session tam thoi va khong dung chinh sach cloud cua Wordly.',
    );
  }
  const keyCount = Object.keys(backup.records).length;
  const checksum = checksumRecords(backup.records);
  if (manifest.keyCount !== keyCount || manifest.checksum !== checksum) {
    throw new CloudStorageError(
      'Snapshot Redis khong khop checksum. Du lieu local chua bi thay doi.',
    );
  }
  return {
    format: 'wordly-cloud-snapshot',
    snapshotVersion: 1,
    manifest,
    backup,
  };
};

const readRemoteSnapshot = async (config: UpstashConfig): Promise<CloudSnapshot | null> => {
  const redis = await createRedis(config);
  return parseCloudSnapshot(await redisGet(redis, REMOTE_SNAPSHOT_KEY));
};

export const getRemoteManifest = async (
  config: UpstashConfig,
): Promise<CloudManifest | null> => (await readRemoteSnapshot(config))?.manifest ?? null;

export const compareLocalAndRemote = async (
  config: UpstashConfig,
): Promise<StorageComparison> => {
  setRuntime({ status: 'checking', error: null });
  try {
    const localDatabaseWasValid = hasValidLocalDatabase();
    let localSnapshot: CloudSnapshot | null = null;
    let localSnapshotError: unknown = null;
    try {
      localSnapshot = buildLocalSnapshot();
    } catch (error) {
      localSnapshotError = error;
    }
    const localRevisionAtRead = getLocalMeta().revision;
    const remoteSnapshot = await readRemoteSnapshot(config);
    if (localSnapshot && getLocalMeta().revision !== localRevisionAtRead) {
      localSnapshot = buildLocalSnapshot();
    }
    const remote = remoteSnapshot?.manifest ?? null;
    if (!localSnapshot) {
      if (!remote) {
        throw localSnapshotError instanceof Error
          ? localSnapshotError
          : new CloudStorageError('Du lieu local khong hop le va Redis khong co snapshot de khoi phuc.');
      }
      const meta = getLocalMeta();
      const local: CloudManifest = {
        schemaVersion: 1,
        project: 'wordly',
        databaseNamespace: DATABASE_NAMESPACE,
        revision: meta.revision,
        updatedAt: meta.updatedAt,
        keyCount: 0,
        checksum: 'invalid-local',
      };
      return {
        local,
        remote,
        localValid: false,
        remoteHasData: true,
        relation: 'remote-newer',
      };
    }
    const local = localSnapshot.manifest;
    if (!remote) {
      return {
        local,
        remote: null,
        localValid: true,
        remoteHasData: false,
        relation: 'remote-empty',
      };
    }
    if (!localDatabaseWasValid) {
      return { local, remote, localValid: false, remoteHasData: true, relation: 'remote-newer' };
    }
    if (local.checksum === remote.checksum && local.keyCount === remote.keyCount) {
      const syncedAt = Date.now();
      setLocalMeta({
        revision: remote.revision,
        updatedAt: remote.updatedAt,
        dirty: false,
        baseRemoteRevision: remote.revision,
        lastSyncedChecksum: remote.checksum,
        lastSyncedAt: syncedAt,
      });
      setRuntime({ status: 'synced', dirty: false, lastSyncedAt: syncedAt, error: null });
      resetUploadBackoff();
      return { local, remote, localValid: true, remoteHasData: true, relation: 'same' };
    }
    const meta = getLocalMeta();
    let relation: StorageComparison['relation'];
    if (meta.lastSyncedChecksum) {
      const localChanged = local.checksum !== meta.lastSyncedChecksum;
      const remoteChanged = remote.checksum !== meta.lastSyncedChecksum;
      relation = localChanged
        ? remoteChanged
          ? 'diverged'
          : 'local-newer'
        : 'remote-newer';
    } else {
      relation = meta.dirty
        ? remote.revision === meta.baseRemoteRevision
          ? 'local-newer'
          : 'diverged'
        : 'remote-newer';
    }
    return { local, remote, localValid: true, remoteHasData: true, relation };
  } finally {
    if (runtime.status === 'checking') setRuntime({ status: 'idle' });
  }
};

export const uploadLocalToUpstash = async (
  config: UpstashConfig,
  options: { force?: boolean; expectedRemoteRevision?: number | null } = {},
): Promise<CloudManifest> => {
  setRuntime({ status: 'syncing', error: null });
  try {
    const redis = await createRedis(config);
    const localSnapshot = buildLocalSnapshot();
    const localMeta = getLocalMeta();
    const finishUpload = (manifest: CloudManifest): CloudManifest => {
      const syncedAt = Date.now();
      const latestMeta = getLocalMeta();
      const changedWhileUploading = latestMeta.revision !== localMeta.revision;
      setLocalMeta(changedWhileUploading
        ? {
            ...latestMeta,
            dirty: true,
            baseRemoteRevision: manifest.revision,
            lastSyncedChecksum: manifest.checksum,
            lastSyncedAt: syncedAt,
          }
        : {
            revision: manifest.revision,
            updatedAt: manifest.updatedAt,
            dirty: false,
            baseRemoteRevision: manifest.revision,
            lastSyncedChecksum: manifest.checksum,
            lastSyncedAt: syncedAt,
          });
      setRuntime({
        status: changedWhileUploading ? 'idle' : 'synced',
        dirty: changedWhileUploading,
        lastSyncedAt: syncedAt,
        error: null,
      });
      dispatchSyncEvent();
      resetUploadBackoff();
      if (changedWhileUploading && writeThroughEnabled) scheduleCloudUpload();
      return manifest;
    };

    let remoteSnapshot: CloudSnapshot | null = null;
    const hasExpectedRemoteRevision = Object.prototype.hasOwnProperty.call(
      options,
      'expectedRemoteRevision',
    );
    if (options.force) {
      if (!hasExpectedRemoteRevision) {
        remoteSnapshot = parseCloudSnapshot(await redisGet(redis, REMOTE_SNAPSHOT_KEY));
        if (
          remoteSnapshot &&
          remoteSnapshot.manifest.checksum === localSnapshot.manifest.checksum &&
          remoteSnapshot.manifest.keyCount === localSnapshot.manifest.keyCount
        ) {
          return finishUpload(remoteSnapshot.manifest);
        }
      }
    }

    const expectedRevision = options.force
      ? hasExpectedRemoteRevision
        ? options.expectedRemoteRevision ?? null
        : remoteSnapshot?.manifest.revision ?? null
      : localMeta.baseRemoteRevision;
    const updatedAt = Date.now();
    const revision = nextRevision(Math.max(
      localSnapshot.manifest.revision,
      expectedRevision ?? 0,
    ));
    const snapshot: CloudSnapshot = {
      ...localSnapshot,
      manifest: {
        ...localSnapshot.manifest,
        revision,
        updatedAt,
      },
      backup: {
        ...localSnapshot.backup,
        exportedAt: updatedAt,
      },
    };
    const payload = JSON.stringify(snapshot);
    const saved = await redisCompareAndSet(
      redis,
      REMOTE_SNAPSHOT_KEY,
      expectedRevision,
      payload,
    );
    if (!saved) {
      remoteSnapshot = parseCloudSnapshot(await redisGet(redis, REMOTE_SNAPSHOT_KEY));
      if (
        remoteSnapshot &&
        remoteSnapshot.manifest.checksum === localSnapshot.manifest.checksum &&
        remoteSnapshot.manifest.keyCount === localSnapshot.manifest.keyCount
      ) {
        return finishUpload(remoteSnapshot.manifest);
      }
      throw new CloudStorageError(
        'Redis da thay doi tu mot phien khac. Tu choi tu dong ghi de de bao ve du lieu.',
      );
    }

    return finishUpload(snapshot.manifest);
  } catch (error) {
    increaseUploadBackoff();
    const message = getStorageErrorMessage(error, 'Khong the tai du lieu len Upstash Redis.');
    setRuntime({ status: 'error', error: message, dirty: getLocalMeta().dirty });
    throw error instanceof CloudStorageError
      ? error
      : new CloudStorageError(message, { cause: error });
  }
};

export const downloadUpstashToLocal = async (
  config: UpstashConfig,
  options: { expectedLocalRevision?: number } = {},
): Promise<CloudManifest | null> => {
  setRuntime({ status: 'syncing', error: null });
  try {
    const localRevisionAtStart = getLocalMeta().revision;
    if (
      options.expectedLocalRevision !== undefined &&
      localRevisionAtStart !== options.expectedLocalRevision
    ) {
      throw new CloudStorageError(
        'Du lieu local da thay doi sau lan kiem tra gan nhat. Hay kiem tra lai truoc khi tai Redis ve.',
      );
    }
    const trainingSession = readDatabaseRecord<unknown>(DATABASE_KEYS.trainingSessions);
    const snapshot = await readRemoteSnapshot(config);
    if (!snapshot) {
      setRuntime({ status: 'idle' });
      return null;
    }
    const currentTrainingSession = readDatabaseRecord<unknown>(DATABASE_KEYS.trainingSessions);
    if (
      getLocalMeta().revision !== localRevisionAtStart ||
      (currentTrainingSession?.revision ?? null) !== (trainingSession?.revision ?? null)
    ) {
      throw new CloudStorageError(
        'Du lieu local da thay doi trong luc tai Redis. Da huy khoi phuc de tranh ghi de du lieu moi.',
      );
    }
    suppressMutationTracking += 1;
    try {
      restoreDatabaseBackup(trainingSession
        ? {
            ...snapshot.backup,
            records: {
              ...snapshot.backup.records,
              [DATABASE_KEYS.trainingSessions]: trainingSession,
            },
          }
        : snapshot.backup);
    } finally {
      suppressMutationTracking -= 1;
    }
    const syncedAt = Date.now();
    setLocalMeta({
      revision: snapshot.manifest.revision,
      updatedAt: snapshot.manifest.updatedAt,
      dirty: false,
      baseRemoteRevision: snapshot.manifest.revision,
      lastSyncedChecksum: snapshot.manifest.checksum,
      lastSyncedAt: syncedAt,
    });
    setRuntime({ status: 'synced', dirty: false, lastSyncedAt: syncedAt, error: null });
    dispatchSyncEvent();
    resetUploadBackoff();
    return snapshot.manifest;
  } catch (error) {
    const message = getStorageErrorMessage(error, 'Khong the tai du lieu tu Upstash Redis.');
    setRuntime({ status: 'error', error: message });
    throw error instanceof CloudStorageError
      ? error
      : new CloudStorageError(message, { cause: error });
  }
};

const markLocalMutation = (mutation: DatabaseMutation): void => {
  if (suppressMutationTracking > 0) return;
  if (
    mutation.keys.length > 0 &&
    mutation.keys.every((key) => key === DATABASE_KEYS.trainingSessions)
  ) {
    return;
  }
  const current = getLocalMeta();
  const now = Date.now();
  setLocalMeta({
    ...current,
    revision: nextRevision(current.revision),
    updatedAt: now,
    dirty: true,
  });
  setRuntime({ status: 'idle', dirty: true, error: null });
  dispatchSyncEvent();

  if (writeThroughEnabled) scheduleCloudUpload();
};

addDatabaseMutationListener(markLocalMutation);

const scheduleCloudUpload = (): void => {
  if (!isBrowser()) return;
  const config = getDataSourceConfig();
  if (config.mode !== 'upstash' || !config.upstash) return;
  if (uploadTimer !== null) window.clearTimeout(uploadTimer);
  const delay = Math.max(
    UPLOAD_DEBOUNCE_MS,
    nextAutomaticUploadAt - Date.now(),
  );
  uploadTimer = window.setTimeout(() => {
    uploadTimer = null;
    void flushPendingCloudSync().catch(() => undefined);
  }, delay);
};

export const startCloudWriteThrough = (): void => {
  writeThroughEnabled = true;
};

export const stopCloudWriteThrough = (): void => {
  writeThroughEnabled = false;
  if (isBrowser() && uploadTimer !== null) window.clearTimeout(uploadTimer);
  uploadTimer = null;
};

export const flushPendingCloudSync = async (): Promise<CloudManifest | null> => {
  if (isBrowser() && uploadTimer !== null) window.clearTimeout(uploadTimer);
  uploadTimer = null;
  const config = getDataSourceConfig();
  if (config.mode !== 'upstash' || !config.upstash || !getLocalMeta().dirty) return null;

  if (uploadPromise) {
    uploadAgain = true;
    return uploadPromise;
  }

  uploadPromise = uploadLocalToUpstash(config.upstash);
  try {
    return await uploadPromise;
  } finally {
    uploadPromise = null;
    if (uploadAgain) {
      uploadAgain = false;
      scheduleCloudUpload();
    }
  }
};

export const getStorageErrorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof CloudStorageError) return error.message;
  const rawMessage = error instanceof Error ? error.message : String(error);
  const message = rawMessage.replace(/command was: .+$/i, '').trim();
  const normalized = message.toLowerCase();
  if (normalized.includes('unauthorized') || normalized.includes('wrongpass')) {
    return 'REST token Upstash khong hop le hoac khong con quyen truy cap.';
  }
  if (
    normalized.includes('failed to fetch') ||
    normalized.includes('networkerror') ||
    normalized.includes('load failed')
  ) {
    return 'Khong the goi Upstash Redis. Hay kiem tra mang, proxy hoac ad-blocker.';
  }
  if (normalized.includes('max request size')) {
    return 'Snapshot Wordly vuot gioi han request cua Upstash Redis.';
  }
  if (normalized.includes('max daily request limit') || normalized.includes('rate limit')) {
    return 'Upstash Redis dang gioi han luot request. Hay thu lai sau.';
  }
  return fallback;
};

export const __resetDataSourceForTests = (): void => {
  stopCloudWriteThrough();
  suppressMutationTracking = 0;
  uploadPromise = null;
  uploadAgain = false;
  resetUploadBackoff();
  runtime = {
    status: 'idle',
    dirty: false,
    lastSyncedAt: null,
    error: null,
  };
};
