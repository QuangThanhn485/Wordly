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
import type { AppPreferences } from './appStorage';

const preferences: AppPreferences = {
  themeMode: 'dark',
  vocabularyViewMode: 'grid',
  flashcards: {
    removeCorrectCards: true,
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
});
