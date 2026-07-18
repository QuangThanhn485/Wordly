import {
  DATABASE_KEYS,
  readDatabaseValue,
  removeDatabaseValue,
  writeDatabaseValue,
} from './database';

export type PronunciationSource = 'device' | 'dictionary';
export type PronunciationAccent = 'us' | 'uk';

export type AppPreferences = {
  themeMode: 'light' | 'dark';
  vocabularyViewMode: 'tree' | 'grid';
  language: 'vi' | 'en' | null;
  pronunciation: {
    source: PronunciationSource;
    accent: PronunciationAccent;
  };
  flashcards: {
    removeCorrectCards: boolean;
  };
  writeTraining: {
    answerReviewDurationMs: number;
    disableAutoAdvance: boolean;
  };
};

export type TrainingSessionMode =
  | 'flashcardsReading'
  | 'flashcardsListening'
  | 'readWrite'
  | 'listenWrite';

export type TrainingSessions = Partial<Record<TrainingSessionMode, unknown>>;

export type BackupMetadata = {
  lastBackupAt: number | null;
};

const DEFAULT_PREFERENCES: AppPreferences = {
  themeMode: 'light',
  vocabularyViewMode: 'tree',
  language: null,
  pronunciation: {
    source: 'dictionary',
    accent: 'us',
  },
  flashcards: {
    removeCorrectCards: false,
  },
  writeTraining: {
    answerReviewDurationMs: 3000,
    disableAutoAdvance: false,
  },
};

export const loadPreferences = (): AppPreferences => {
  const stored = readDatabaseValue<Partial<AppPreferences>>(
    DATABASE_KEYS.preferences,
    {},
  );
  const legacyLanguage = localStorage.getItem('i18nextLng');
  const language =
    stored.language === 'vi' || stored.language === 'en'
      ? stored.language
      : legacyLanguage === 'vi' || legacyLanguage === 'en'
        ? legacyLanguage
        : null;
  const preferences: AppPreferences = {
    ...DEFAULT_PREFERENCES,
    ...stored,
    language,
    pronunciation: {
      ...DEFAULT_PREFERENCES.pronunciation,
      ...stored.pronunciation,
    },
    flashcards: {
      ...DEFAULT_PREFERENCES.flashcards,
      ...stored.flashcards,
    },
    writeTraining: {
      ...DEFAULT_PREFERENCES.writeTraining,
      ...stored.writeTraining,
    },
  };

  if (language && stored.language !== language) {
    writeDatabaseValue(DATABASE_KEYS.preferences, preferences);
  }
  return preferences;
};

export const updatePreferences = (
  updater: (current: AppPreferences) => AppPreferences,
): AppPreferences => {
  const next = updater(loadPreferences());
  writeDatabaseValue(DATABASE_KEYS.preferences, next);
  return next;
};

export const loadTrainingSessionValue = <T,>(
  mode: TrainingSessionMode,
): T | null => {
  const sessions = readDatabaseValue<TrainingSessions>(
    DATABASE_KEYS.trainingSessions,
    {},
  );
  return (sessions[mode] as T | undefined) ?? null;
};

export const saveTrainingSessionValue = <T,>(
  mode: TrainingSessionMode,
  session: T,
): void => {
  const sessions = readDatabaseValue<TrainingSessions>(
    DATABASE_KEYS.trainingSessions,
    {},
  );
  writeDatabaseValue(DATABASE_KEYS.trainingSessions, {
    ...sessions,
    [mode]: session,
  });
};

export const clearTrainingSessionValue = (mode: TrainingSessionMode): void => {
  const sessions = readDatabaseValue<TrainingSessions>(
    DATABASE_KEYS.trainingSessions,
    {},
  );
  if (!Object.prototype.hasOwnProperty.call(sessions, mode)) return;
  const next = { ...sessions };
  delete next[mode];
  if (Object.keys(next).length === 0) {
    removeDatabaseValue(DATABASE_KEYS.trainingSessions);
  } else {
    writeDatabaseValue(DATABASE_KEYS.trainingSessions, next);
  }
};

export const loadBackupMetadata = (): BackupMetadata =>
  readDatabaseValue<BackupMetadata>(
    DATABASE_KEYS.backupMetadata,
    { lastBackupAt: null },
  );

export const saveBackupMetadata = (lastBackupAt: number): void => {
  writeDatabaseValue<BackupMetadata>(
    DATABASE_KEYS.backupMetadata,
    { lastBackupAt },
  );
};
