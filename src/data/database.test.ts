import {
  __resetDatabaseForTests,
  createDatabaseBackup,
  DATABASE_KEYS,
  initializeDatabase,
  readDatabaseRecord,
  readDatabaseValue,
  restoreDatabaseBackup,
  writeDatabaseValue,
} from './database';
import { loadPreferences, type AppPreferences } from './appStorage';

const preferences: AppPreferences = {
  themeMode: 'dark',
  vocabularyViewMode: 'grid',
  language: 'vi',
  pronunciation: {
    source: 'dictionary',
    accent: 'uk',
  },
  flashcards: {
    removeCorrectCards: true,
  },
  writeTraining: {
    answerReviewDurationMs: 3000,
    disableAutoAdvance: true,
  },
};

describe('key-value database', () => {
  beforeEach(() => {
    localStorage.clear();
    __resetDatabaseForTests();
  });

  it('starts schema v3 cleanly without deleting external keys', () => {
    localStorage.setItem('wordly_tree', '{"legacy":true}');
    localStorage.setItem('wordly_train_session', '{"legacy":true}');
    localStorage.setItem('themeMode', 'dark');
    localStorage.setItem('accessToken', 'keep-me');
    localStorage.setItem('i18nextLng', 'vi');

    initializeDatabase();

    expect(localStorage.getItem('wordly_tree')).toBeNull();
    expect(localStorage.getItem('wordly_train_session')).toBeNull();
    expect(localStorage.getItem('themeMode')).toBeNull();
    expect(localStorage.getItem('accessToken')).toBe('keep-me');
    expect(localStorage.getItem('i18nextLng')).toBe('vi');
    expect(readDatabaseRecord(DATABASE_KEYS.meta)?.schemaVersion).toBe(3);
    expect(loadPreferences().language).toBe('vi');
    expect(
      readDatabaseValue<AppPreferences | null>(
        DATABASE_KEYS.preferences,
        null,
      )?.language,
    ).toBe('vi');
  });

  it('increments revision only on the record being written', () => {
    const first = writeDatabaseValue(DATABASE_KEYS.preferences, preferences);
    const second = writeDatabaseValue(DATABASE_KEYS.preferences, {
      ...preferences,
      themeMode: 'light',
    });

    expect(first.revision).toBe(1);
    expect(second.revision).toBe(2);
    expect(readDatabaseRecord(DATABASE_KEYS.meta)?.revision).toBe(1);
  });

  it('defaults auto advance safely for preferences saved before the option existed', () => {
    writeDatabaseValue(DATABASE_KEYS.preferences, {
      ...preferences,
      writeTraining: {
        answerReviewDurationMs: 4500,
      },
    });

    expect(loadPreferences().writeTraining).toEqual({
      answerReviewDurationMs: 4500,
      disableAutoAdvance: false,
    });
  });

  it('defaults pronunciation safely for preferences saved before the option existed', () => {
    const legacyPreferences = {
      ...preferences,
      pronunciation: undefined,
    };
    delete legacyPreferences.pronunciation;
    writeDatabaseValue(DATABASE_KEYS.preferences, legacyPreferences);

    expect(loadPreferences().pronunciation).toEqual({
      source: 'dictionary',
      accent: 'us',
    });
  });

  it('restores a validated snapshot and rejects invalid data', () => {
    writeDatabaseValue(DATABASE_KEYS.preferences, preferences);
    const backup = createDatabaseBackup(123456);

    writeDatabaseValue(DATABASE_KEYS.preferences, {
      ...preferences,
      themeMode: 'light',
    });
    restoreDatabaseBackup(backup);

    expect(
      readDatabaseValue<AppPreferences>(
        DATABASE_KEYS.preferences,
        preferences,
      ).themeMode,
    ).toBe('dark');

    const invalid = JSON.parse(JSON.stringify(backup)) as typeof backup;
    invalid.records[DATABASE_KEYS.preferences].data = {
      ...preferences,
      themeMode: 'unsupported',
    };

    expect(() => restoreDatabaseBackup(invalid)).toThrow(
      /Record backup khong hop le/,
    );
    expect(
      readDatabaseValue<AppPreferences>(
        DATABASE_KEYS.preferences,
        preferences,
      ).themeMode,
    ).toBe('dark');
  });

  it('refuses to create a backup from a corrupted record', () => {
    writeDatabaseValue(DATABASE_KEYS.preferences, preferences);
    localStorage.setItem(
      DATABASE_KEYS.preferences,
      JSON.stringify({
        schemaVersion: 3,
        revision: 2,
        updatedAt: Date.now(),
        data: { themeMode: 'invalid' },
      }),
    );

    expect(() => createDatabaseBackup()).toThrow(
      /Khong the backup/,
    );
  });

  it('rolls back to the current database when a restore write fails', () => {
    writeDatabaseValue(DATABASE_KEYS.preferences, preferences);
    const backup = JSON.parse(
      JSON.stringify(createDatabaseBackup(123456)),
    ) as ReturnType<typeof createDatabaseBackup>;
    writeDatabaseValue(DATABASE_KEYS.preferences, {
      ...preferences,
      themeMode: 'light',
    });

    const originalSetItem = Storage.prototype.setItem;
    let failNextPreferencesWrite = true;
    const setItemSpy = jest
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementation(function setItem(
        this: Storage,
        key: string,
        value: string,
      ) {
        if (
          failNextPreferencesWrite &&
          key === DATABASE_KEYS.preferences
        ) {
          failNextPreferencesWrite = false;
          throw new Error('Simulated storage failure');
        }
        return originalSetItem.call(this, key, value);
      });

    try {
      expect(() => restoreDatabaseBackup(backup)).toThrow(
        /Simulated storage failure/,
      );
    } finally {
      setItemSpy.mockRestore();
    }

    expect(
      readDatabaseValue<AppPreferences>(
        DATABASE_KEYS.preferences,
        preferences,
      ).themeMode,
    ).toBe('light');
  });
});
