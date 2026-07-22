import {
  __resetDataSourceForTests,
  DATA_SOURCE_CONFIG_KEY,
  DATA_SOURCE_META_KEY,
  REMOTE_SNAPSHOT_KEY,
  compareLocalAndRemote,
  downloadUpstashToLocal,
  flushPendingCloudSync,
  getCloudSyncRuntime,
  parseUpstashConfigInput,
  setDataSourceMode,
  startCloudWriteThrough,
  uploadLocalToUpstash,
} from './dataSource';
import {
  __resetDatabaseForTests,
  DATABASE_KEYS,
  initializeDatabase,
  readDatabaseValue,
  removeDatabaseValue,
  writeDatabaseValue,
} from './database';
import { loadTrainingSessionValue, saveTrainingSessionValue } from './appStorage';

const mockRedis = {
  store: new Map<string, string>(),
  getCalls: [] as string[],
  setCalls: [] as string[],
  evalCalls: [] as string[],
  onGet: null as null | (() => void),
  onEval: null as null | (() => void),
  failEvalBeforeWrite: false,
  failEvalAfterWrite: false,
};

jest.mock('@upstash/redis/cloudflare', () => ({
  Redis: class Redis {
    async ping() {
      return 'PONG';
    }

    async get(key: string) {
      mockRedis.getCalls.push(key);
      const onGet = mockRedis.onGet;
      mockRedis.onGet = null;
      onGet?.();
      return mockRedis.store.get(key) ?? null;
    }

    async set(key: string, value: unknown) {
      mockRedis.setCalls.push(key);
      mockRedis.store.set(
        key,
        typeof value === 'string' ? value : JSON.stringify(value),
      );
      return 'OK';
    }

    async eval(_script: string, keys: string[], args: string[]) {
      const [key] = keys;
      const [expectedRevision, value] = args;
      mockRedis.evalCalls.push(key);
      const onEval = mockRedis.onEval;
      mockRedis.onEval = null;
      onEval?.();
      const current = mockRedis.store.get(key);
      const currentRevision = current
        ? JSON.parse(current).manifest?.revision
        : null;
      const matches = expectedRevision === '__EMPTY__'
        ? current === undefined
        : currentRevision === Number(expectedRevision);
      if (!matches) return 0;
      if (mockRedis.failEvalBeforeWrite) {
        mockRedis.failEvalBeforeWrite = false;
        throw new Error('Failed to fetch');
      }
      mockRedis.store.set(key, value);
      if (mockRedis.failEvalAfterWrite) {
        mockRedis.failEvalAfterWrite = false;
        throw new Error('Failed to fetch');
      }
      return 1;
    }
  },
}));

const TEST_UPSTASH = {
  url: 'https://example.upstash.io',
  token: 'token-value',
};

const validPreferences = {
  themeMode: 'light' as const,
  vocabularyViewMode: 'tree' as const,
  language: 'vi' as const,
  pronunciation: { source: 'device' as const, accent: 'us' as const },
  flashcards: { removeCorrectCards: false },
  writeTraining: { answerReviewDurationMs: 3000, disableAutoAdvance: false },
};

describe('Wordly Upstash data source', () => {
  beforeEach(() => {
    localStorage.clear();
    mockRedis.store.clear();
    mockRedis.getCalls = [];
    mockRedis.setCalls = [];
    mockRedis.evalCalls = [];
    mockRedis.onGet = null;
    mockRedis.onEval = null;
    mockRedis.failEvalBeforeWrite = false;
    mockRedis.failEvalAfterWrite = false;
    __resetDatabaseForTests();
    __resetDataSourceForTests();
    initializeDatabase();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('accepts raw and .env style Upstash credentials', () => {
    expect(
      parseUpstashConfigInput(
        'UPSTASH_REDIS_REST_URL="https://example.upstash.io/"',
        'UPSTASH_REDIS_REST_TOKEN="token-value"',
      ),
    ).toEqual(TEST_UPSTASH);
  });

  it('stores every Wordly record in one namespaced Redis snapshot', async () => {
    writeDatabaseValue(DATABASE_KEYS.preferences, validPreferences);

    const manifest = await uploadLocalToUpstash(TEST_UPSTASH, { force: true });

    expect(manifest.keyCount).toBe(2);
    expect(Array.from(mockRedis.store.keys())).toEqual([REMOTE_SNAPSHOT_KEY]);
    expect(mockRedis.setCalls).toHaveLength(0);
    expect(mockRedis.evalCalls).toEqual([REMOTE_SNAPSHOT_KEY]);
    expect(REMOTE_SNAPSHOT_KEY.startsWith('wordly:storage:v1:')).toBe(true);
  });

  it('keeps pure localStorage usage completely offline', async () => {
    jest.useFakeTimers();
    setDataSourceMode('localStorage', TEST_UPSTASH);
    startCloudWriteThrough();
    mockRedis.getCalls = [];
    mockRedis.evalCalls = [];

    writeDatabaseValue(DATABASE_KEYS.preferences, validPreferences);
    writeDatabaseValue(DATABASE_KEYS.preferences, {
      ...validPreferences,
      themeMode: 'dark',
    });
    jest.advanceTimersByTime(5000);
    await Promise.resolve();

    expect(mockRedis.getCalls).toHaveLength(0);
    expect(mockRedis.evalCalls).toHaveLength(0);
  });

  it('uploads local changes after using localStorage for a long time', async () => {
    writeDatabaseValue(DATABASE_KEYS.preferences, validPreferences);
    await uploadLocalToUpstash(TEST_UPSTASH, {
      force: true,
      expectedRemoteRevision: null,
    });
    setDataSourceMode('localStorage', TEST_UPSTASH);

    writeDatabaseValue(DATABASE_KEYS.preferences, {
      ...validPreferences,
      themeMode: 'dark',
    });
    writeDatabaseValue(DATABASE_KEYS.preferences, {
      ...validPreferences,
      themeMode: 'dark',
      vocabularyViewMode: 'grid',
    });

    const comparison = await compareLocalAndRemote(TEST_UPSTASH);
    expect(comparison.relation).toBe('local-newer');

    mockRedis.getCalls = [];
    mockRedis.evalCalls = [];
    await uploadLocalToUpstash(TEST_UPSTASH);

    expect(mockRedis.getCalls).toHaveLength(0);
    expect(mockRedis.evalCalls).toEqual([REMOTE_SNAPSHOT_KEY]);
    expect(mockRedis.store.get(REMOTE_SNAPSHOT_KEY)).toContain('"themeMode":"dark"');
    expect(mockRedis.store.get(REMOTE_SNAPSHOT_KEY)).toContain('"vocabularyViewMode":"grid"');
  });

  it('keeps data intact through a local-cloud-local-cloud cycle', async () => {
    setDataSourceMode('localStorage', TEST_UPSTASH);
    writeDatabaseValue(DATABASE_KEYS.preferences, validPreferences);
    const emptyComparison = await compareLocalAndRemote(TEST_UPSTASH);
    expect(emptyComparison.relation).toBe('remote-empty');
    await uploadLocalToUpstash(TEST_UPSTASH, {
      force: true,
      expectedRemoteRevision: null,
    });

    setDataSourceMode('upstash', TEST_UPSTASH);
    startCloudWriteThrough();
    mockRedis.getCalls = [];
    mockRedis.evalCalls = [];
    writeDatabaseValue(DATABASE_KEYS.preferences, {
      ...validPreferences,
      themeMode: 'dark',
    });
    await flushPendingCloudSync();

    setDataSourceMode('localStorage', TEST_UPSTASH);
    writeDatabaseValue(DATABASE_KEYS.preferences, {
      ...validPreferences,
      themeMode: 'dark',
      vocabularyViewMode: 'grid',
    });
    expect(mockRedis.evalCalls).toHaveLength(1);

    const localNewer = await compareLocalAndRemote(TEST_UPSTASH);
    expect(localNewer.relation).toBe('local-newer');
    await uploadLocalToUpstash(TEST_UPSTASH);
    setDataSourceMode('upstash', TEST_UPSTASH);

    expect(readDatabaseValue(DATABASE_KEYS.preferences, validPreferences)).toMatchObject({
      themeMode: 'dark',
      vocabularyViewMode: 'grid',
    });
    expect(mockRedis.getCalls).toHaveLength(1);
    expect(mockRedis.evalCalls).toHaveLength(2);
  });

  it('rejects a corrupted cloud snapshot without changing local data', async () => {
    writeDatabaseValue(DATABASE_KEYS.preferences, validPreferences);
    await uploadLocalToUpstash(TEST_UPSTASH, { force: true });
    const snapshot = JSON.parse(mockRedis.store.get(REMOTE_SNAPSHOT_KEY) || '{}');
    snapshot.manifest.checksum = 'corrupted';
    mockRedis.store.set(REMOTE_SNAPSHOT_KEY, JSON.stringify(snapshot));

    writeDatabaseValue(DATABASE_KEYS.preferences, {
      ...validPreferences,
      themeMode: 'dark',
    });

    await expect(downloadUpstashToLocal(TEST_UPSTASH)).rejects.toThrow(/checksum/i);
    expect(
      readDatabaseValue(DATABASE_KEYS.preferences, validPreferences).themeMode,
    ).toBe('dark');
  });

  it('refuses an automatic overwrite after Redis changed in another session', async () => {
    writeDatabaseValue(DATABASE_KEYS.preferences, validPreferences);
    await uploadLocalToUpstash(TEST_UPSTASH, { force: true });
    const firstRemote = mockRedis.store.get(REMOTE_SNAPSHOT_KEY) || '';

    writeDatabaseValue(DATABASE_KEYS.preferences, {
      ...validPreferences,
      themeMode: 'dark',
    });
    await uploadLocalToUpstash(TEST_UPSTASH, { force: true });
    const otherSessionRemote = mockRedis.store.get(REMOTE_SNAPSHOT_KEY) || '';

    mockRedis.store.set(REMOTE_SNAPSHOT_KEY, firstRemote);
    await downloadUpstashToLocal(TEST_UPSTASH);
    writeDatabaseValue(DATABASE_KEYS.preferences, {
      ...validPreferences,
      vocabularyViewMode: 'grid',
    });
    mockRedis.store.set(REMOTE_SNAPSHOT_KEY, otherSessionRemote);

    const comparison = await compareLocalAndRemote(TEST_UPSTASH);
    expect(comparison.relation).toBe('diverged');
    await expect(uploadLocalToUpstash(TEST_UPSTASH)).rejects.toThrow(/phien khac/i);
    expect(mockRedis.store.get(REMOTE_SNAPSHOT_KEY)).toBe(otherSessionRemote);
  });

  it('treats Redis as authoritative when the clean local cache differs', async () => {
    writeDatabaseValue(DATABASE_KEYS.preferences, validPreferences);
    await uploadLocalToUpstash(TEST_UPSTASH, { force: true });
    const firstRemote = mockRedis.store.get(REMOTE_SNAPSHOT_KEY) || '';

    writeDatabaseValue(DATABASE_KEYS.preferences, {
      ...validPreferences,
      themeMode: 'dark',
    });
    await uploadLocalToUpstash(TEST_UPSTASH, { force: true });
    const newerRemote = mockRedis.store.get(REMOTE_SNAPSHOT_KEY) || '';

    mockRedis.store.set(REMOTE_SNAPSHOT_KEY, firstRemote);
    await downloadUpstashToLocal(TEST_UPSTASH);
    mockRedis.store.set(REMOTE_SNAPSHOT_KEY, newerRemote);

    const comparison = await compareLocalAndRemote(TEST_UPSTASH);

    expect(comparison.relation).toBe('remote-newer');
    expect(mockRedis.store.get(REMOTE_SNAPSHOT_KEY)).toBe(newerRemote);
  });

  it('recovers an unmarked local change by comparing the last synced checksum', async () => {
    writeDatabaseValue(DATABASE_KEYS.preferences, validPreferences);
    await uploadLocalToUpstash(TEST_UPSTASH, { force: true });

    writeDatabaseValue(DATABASE_KEYS.preferences, {
      ...validPreferences,
      themeMode: 'dark',
    });
    const meta = JSON.parse(localStorage.getItem(DATA_SOURCE_META_KEY) || '{}');
    localStorage.setItem(DATA_SOURCE_META_KEY, JSON.stringify({ ...meta, dirty: false }));

    const comparison = await compareLocalAndRemote(TEST_UPSTASH);

    expect(comparison.relation).toBe('local-newer');
  });

  it('does not mark a local mutation as synced when it happens during comparison', async () => {
    writeDatabaseValue(DATABASE_KEYS.preferences, validPreferences);
    await uploadLocalToUpstash(TEST_UPSTASH, { force: true });
    mockRedis.onGet = () => {
      writeDatabaseValue(DATABASE_KEYS.preferences, {
        ...validPreferences,
        themeMode: 'dark',
      });
    };

    const comparison = await compareLocalAndRemote(TEST_UPSTASH);

    expect(comparison.relation).toBe('local-newer');
    expect(getCloudSyncRuntime().dirty).toBe(true);
  });

  it('uses Redis when the configured local database cache is missing', async () => {
    writeDatabaseValue(DATABASE_KEYS.preferences, validPreferences);
    await uploadLocalToUpstash(TEST_UPSTASH, { force: true });
    setDataSourceMode('upstash', TEST_UPSTASH);

    Array.from({ length: localStorage.length }, (_, index) => localStorage.key(index))
      .filter((key): key is string => Boolean(key?.startsWith('wordly:v3:')))
      .forEach((key) => localStorage.removeItem(key));
    __resetDatabaseForTests();

    const comparison = await compareLocalAndRemote(TEST_UPSTASH);

    expect(comparison.relation).toBe('remote-newer');
    expect(comparison.localValid).toBe(false);
    expect(comparison.remoteHasData).toBe(true);
  });

  it('recovers from a corrupted local record only when Redis is valid', async () => {
    writeDatabaseValue(DATABASE_KEYS.preferences, validPreferences);
    await uploadLocalToUpstash(TEST_UPSTASH, { force: true });
    const validRemote = mockRedis.store.get(REMOTE_SNAPSHOT_KEY);
    localStorage.setItem(DATABASE_KEYS.preferences, '{broken-json');
    __resetDatabaseForTests();

    const comparison = await compareLocalAndRemote(TEST_UPSTASH);

    expect(comparison.localValid).toBe(false);
    expect(comparison.relation).toBe('remote-newer');
    expect(mockRedis.store.get(REMOTE_SNAPSHOT_KEY)).toBe(validRemote);

    await downloadUpstashToLocal(TEST_UPSTASH, {
      expectedLocalRevision: comparison.local.revision,
    });
    expect(readDatabaseValue(DATABASE_KEYS.preferences, validPreferences)).toEqual(
      validPreferences,
    );
  });

  it('does not upload a corrupted local database when Redis is empty', async () => {
    writeDatabaseValue(DATABASE_KEYS.preferences, validPreferences);
    localStorage.setItem(DATABASE_KEYS.preferences, '{broken-json');
    __resetDatabaseForTests();

    await expect(compareLocalAndRemote(TEST_UPSTASH)).rejects.toThrow();

    expect(mockRedis.store.size).toBe(0);
    expect(mockRedis.evalCalls).toHaveLength(0);
  });

  it('does not schedule Redis writes for in-progress training sessions', async () => {
    jest.useFakeTimers();
    await uploadLocalToUpstash(TEST_UPSTASH, { force: true });
    setDataSourceMode('upstash', TEST_UPSTASH);
    startCloudWriteThrough();
    mockRedis.getCalls = [];
    mockRedis.setCalls = [];
    mockRedis.evalCalls = [];

    saveTrainingSessionValue('flashcardsReading', {
      topicId: 'topic-1',
      score: 1,
      timestamp: Date.now(),
    });
    jest.advanceTimersByTime(5000);
    await Promise.resolve();

    expect(mockRedis.getCalls).toHaveLength(0);
    expect(mockRedis.setCalls).toHaveLength(0);
    expect(mockRedis.evalCalls).toHaveLength(0);

    const comparison = await compareLocalAndRemote(TEST_UPSTASH);
    expect(comparison.relation).toBe('same');
    expect(mockRedis.setCalls).toHaveLength(0);
  });

  it('preserves an in-progress training session when Redis is downloaded', async () => {
    writeDatabaseValue(DATABASE_KEYS.preferences, validPreferences);
    await uploadLocalToUpstash(TEST_UPSTASH, { force: true });
    const olderRemote = mockRedis.store.get(REMOTE_SNAPSHOT_KEY) || '';

    writeDatabaseValue(DATABASE_KEYS.preferences, {
      ...validPreferences,
      themeMode: 'dark',
    });
    await uploadLocalToUpstash(TEST_UPSTASH, { force: true });
    const newerRemote = mockRedis.store.get(REMOTE_SNAPSHOT_KEY) || '';

    mockRedis.store.set(REMOTE_SNAPSHOT_KEY, olderRemote);
    await downloadUpstashToLocal(TEST_UPSTASH);
    saveTrainingSessionValue('listenWrite', {
      topicId: 'topic-1',
      currentWordIndex: 3,
    });
    mockRedis.store.set(REMOTE_SNAPSHOT_KEY, newerRemote);
    const comparison = await compareLocalAndRemote(TEST_UPSTASH);

    await downloadUpstashToLocal(TEST_UPSTASH, {
      expectedLocalRevision: comparison.local.revision,
    });

    expect(loadTrainingSessionValue<{ currentWordIndex: number }>('listenWrite'))
      .toMatchObject({ currentWordIndex: 3 });
    expect(readDatabaseValue(DATABASE_KEYS.preferences, validPreferences).themeMode)
      .toBe('dark');
  });

  it('aborts a download if local data changes after comparison', async () => {
    writeDatabaseValue(DATABASE_KEYS.preferences, validPreferences);
    await uploadLocalToUpstash(TEST_UPSTASH, { force: true });
    const comparison = await compareLocalAndRemote(TEST_UPSTASH);

    writeDatabaseValue(DATABASE_KEYS.preferences, {
      ...validPreferences,
      themeMode: 'dark',
    });

    await expect(downloadUpstashToLocal(TEST_UPSTASH, {
      expectedLocalRevision: comparison.local.revision,
    })).rejects.toThrow(/local da thay doi/i);
    expect(readDatabaseValue(DATABASE_KEYS.preferences, validPreferences).themeMode)
      .toBe('dark');
  });

  it('coalesces a completed training result into one cloud snapshot write', async () => {
    await uploadLocalToUpstash(TEST_UPSTASH, { force: true });
    setDataSourceMode('upstash', TEST_UPSTASH);
    startCloudWriteThrough();
    mockRedis.getCalls = [];
    mockRedis.setCalls = [];
    mockRedis.evalCalls = [];

    saveTrainingSessionValue('flashcardsReading', {
      topicId: 'topic-1',
      score: 1,
      timestamp: Date.now(),
    });
    saveTrainingSessionValue('flashcardsReading', {
      topicId: 'topic-1',
      score: 2,
      timestamp: Date.now(),
    });
    writeDatabaseValue(DATABASE_KEYS.preferences, validPreferences);

    await new Promise((resolve) => window.setTimeout(resolve, 2500));

    expect(mockRedis.getCalls).toHaveLength(0);
    expect(mockRedis.setCalls).toHaveLength(0);
    expect(mockRedis.evalCalls).toEqual([REMOTE_SNAPSHOT_KEY]);
    expect(mockRedis.store.get(REMOTE_SNAPSHOT_KEY)).not.toContain(
      DATABASE_KEYS.trainingSessions,
    );
  }, 10000);

  it('keeps a mutation dirty when it happens during an upload', async () => {
    writeDatabaseValue(DATABASE_KEYS.preferences, validPreferences);
    await uploadLocalToUpstash(TEST_UPSTASH, { force: true });
    setDataSourceMode('upstash', TEST_UPSTASH);

    writeDatabaseValue(DATABASE_KEYS.preferences, {
      ...validPreferences,
      themeMode: 'dark',
    });
    mockRedis.onEval = () => {
      writeDatabaseValue(DATABASE_KEYS.preferences, {
        ...validPreferences,
        vocabularyViewMode: 'grid',
      });
    };

    await uploadLocalToUpstash(TEST_UPSTASH);
    expect(getCloudSyncRuntime().dirty).toBe(true);

    await flushPendingCloudSync();

    const remote = mockRedis.store.get(REMOTE_SNAPSHOT_KEY) || '';
    expect(remote).toContain('"vocabularyViewMode":"grid"');
    expect(getCloudSyncRuntime().dirty).toBe(false);
  });

  it('does not overwrite a concurrent remote change during a confirmed upload', async () => {
    writeDatabaseValue(DATABASE_KEYS.preferences, validPreferences);
    const firstManifest = await uploadLocalToUpstash(TEST_UPSTASH, { force: true });
    const firstRemote = mockRedis.store.get(REMOTE_SNAPSHOT_KEY) || '';

    writeDatabaseValue(DATABASE_KEYS.preferences, {
      ...validPreferences,
      themeMode: 'dark',
    });
    await uploadLocalToUpstash(TEST_UPSTASH, { force: true });
    const concurrentRemote = mockRedis.store.get(REMOTE_SNAPSHOT_KEY) || '';

    mockRedis.store.set(REMOTE_SNAPSHOT_KEY, firstRemote);
    await downloadUpstashToLocal(TEST_UPSTASH);
    writeDatabaseValue(DATABASE_KEYS.preferences, {
      ...validPreferences,
      vocabularyViewMode: 'grid',
    });
    mockRedis.onEval = () => {
      mockRedis.store.set(REMOTE_SNAPSHOT_KEY, concurrentRemote);
    };

    await expect(uploadLocalToUpstash(TEST_UPSTASH, {
      force: true,
      expectedRemoteRevision: firstManifest.revision,
    })).rejects.toThrow(/phien khac/i);
    expect(mockRedis.store.get(REMOTE_SNAPSHOT_KEY)).toBe(concurrentRemote);
  });

  it('recovers without a duplicate write when the response is lost after Redis saved', async () => {
    writeDatabaseValue(DATABASE_KEYS.preferences, validPreferences);
    await uploadLocalToUpstash(TEST_UPSTASH, { force: true });
    writeDatabaseValue(DATABASE_KEYS.preferences, {
      ...validPreferences,
      themeMode: 'dark',
    });
    mockRedis.failEvalAfterWrite = true;

    await expect(uploadLocalToUpstash(TEST_UPSTASH)).rejects.toThrow();
    expect(getCloudSyncRuntime().dirty).toBe(true);
    const savedAfterLostResponse = mockRedis.store.get(REMOTE_SNAPSHOT_KEY);

    await uploadLocalToUpstash(TEST_UPSTASH);

    expect(mockRedis.store.get(REMOTE_SNAPSHOT_KEY)).toBe(savedAfterLostResponse);
    expect(getCloudSyncRuntime().dirty).toBe(false);
  });

  it('applies a cooldown after a failed automatic upload', async () => {
    jest.useFakeTimers();
    writeDatabaseValue(DATABASE_KEYS.preferences, validPreferences);
    await uploadLocalToUpstash(TEST_UPSTASH, { force: true });
    setDataSourceMode('upstash', TEST_UPSTASH);
    startCloudWriteThrough();
    mockRedis.evalCalls = [];
    mockRedis.failEvalBeforeWrite = true;

    writeDatabaseValue(DATABASE_KEYS.preferences, {
      ...validPreferences,
      themeMode: 'dark',
    });
    await expect(flushPendingCloudSync()).rejects.toThrow();
    expect(mockRedis.evalCalls).toHaveLength(1);

    writeDatabaseValue(DATABASE_KEYS.preferences, {
      ...validPreferences,
      vocabularyViewMode: 'grid',
    });
    jest.advanceTimersByTime(5000);
    await Promise.resolve();

    expect(mockRedis.evalCalls).toHaveLength(1);
    expect(getCloudSyncRuntime().dirty).toBe(true);
  });

  it('syncs a local deletion with one atomic cloud write', async () => {
    writeDatabaseValue(DATABASE_KEYS.preferences, validPreferences);
    await uploadLocalToUpstash(TEST_UPSTASH, { force: true });
    setDataSourceMode('upstash', TEST_UPSTASH);
    mockRedis.getCalls = [];
    mockRedis.evalCalls = [];

    removeDatabaseValue(DATABASE_KEYS.preferences);
    await flushPendingCloudSync();

    expect(mockRedis.getCalls).toHaveLength(0);
    expect(mockRedis.evalCalls).toEqual([REMOTE_SNAPSHOT_KEY]);
    expect(mockRedis.store.get(REMOTE_SNAPSHOT_KEY)).not.toContain(
      DATABASE_KEYS.preferences,
    );
  });

  it('keeps cloud credentials outside the Wordly database snapshot', async () => {
    setDataSourceMode('localStorage', TEST_UPSTASH);
    await uploadLocalToUpstash(TEST_UPSTASH, { force: true });
    const payload = mockRedis.store.get(REMOTE_SNAPSHOT_KEY) || '';

    expect(payload).not.toContain(TEST_UPSTASH.token);
    expect(payload).not.toContain(DATA_SOURCE_CONFIG_KEY);
    expect(payload).not.toContain(DATA_SOURCE_META_KEY);
  });
});
