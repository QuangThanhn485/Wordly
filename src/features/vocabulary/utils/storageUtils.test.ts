import {
  __resetDatabaseForTests,
  clearDatabase,
  createDatabaseBackup,
  DATABASE_KEYS,
  listDatabaseKeys,
  loadPreferences,
  loadTrainingSessionValue,
  readDatabaseValue,
  restoreDatabaseBackup,
  saveBackupMetadata,
  saveTrainingSessionValue,
  updatePreferences,
} from '@/data';
import type { FolderNode, VocabItem } from '../types';
import {
  loadTreeFromStorage,
  loadVocabularyTopic,
  loadVocabularyTopicCounts,
  normalizeVocabularyItems,
  saveTrainingVocabularySet,
  saveTreeToStorage,
  saveVocabularyImportAtomically,
  saveVocabularyTopic,
  type VocabularyCatalog,
} from './storageUtils';
import {
  loadMistakesStats,
  recordMistakes,
} from '@/features/train/train-start/mistakesStorage';

describe('normalized vocabulary storage', () => {
  beforeEach(() => {
    localStorage.clear();
    __resetDatabaseForTests();
  });

  it('stores Vietnamese labels in a normalized entity catalog', () => {
    const tree: FolderNode = {
      kind: 'folder',
      id: 'root',
      label: 'Root',
      children: [
        {
          kind: 'folder',
          id: 'folder-basic',
          label: 'Từ vựng hằng ngày',
          children: [
            {
              kind: 'topic',
              id: 'topic-food',
              label: 'Đồ ăn và thức uống',
            },
          ],
        },
      ],
    };

    saveTreeToStorage(tree);
    saveVocabularyTopic('topic-food', [
      {
        word: 'cathedral',
        type: 'noun',
        vnMeaning: 'nhà thờ chính tòa',
        pronunciation: '/kəˈθiːdrəl/',
      },
    ]);

    const catalog = readDatabaseValue<VocabularyCatalog | null>(
      DATABASE_KEYS.vocabularyCatalog,
      null,
    );
    const topic = catalog?.nodesById['topic-food'];
    const storedTree = loadTreeFromStorage();
    const storedItems = loadVocabularyTopic('topic-food');

    expect(catalog?.rootId).toBe('root');
    expect(catalog?.nodesById.root.kind).toBe('folder');
    expect((catalog?.nodesById.root as any).children).toBeUndefined();
    expect(topic?.label).toBe('Đồ ăn và thức uống');
    expect(topic?.parentId).toBe('folder-basic');
    expect(topic?.kind === 'topic' && topic.wordCount).toBe(1);
    expect(storedTree).toEqual(tree);
    expect(storedItems?.[0].id).toMatch(/^word_/);
    expect(loadVocabularyTopicCounts()).toEqual({ 'topic-food': 1 });
    expect(
      listDatabaseKeys().filter((key) =>
        key.startsWith(DATABASE_KEYS.vocabularyTopicPrefix),
      ),
    ).toHaveLength(1);

    const invalidBackup = JSON.parse(
      JSON.stringify(createDatabaseBackup()),
    ) as ReturnType<typeof createDatabaseBackup>;
    const invalidCatalog = invalidBackup.records[
      DATABASE_KEYS.vocabularyCatalog
    ].data as VocabularyCatalog;
    const invalidTopic = invalidCatalog.nodesById['topic-food'];
    if (invalidTopic.kind === 'topic') invalidTopic.wordCount = 2;
    expect(() => restoreDatabaseBackup(invalidBackup)).toThrow(
      /khong khop voi vocabulary catalog/,
    );
  });

  it('keeps word IDs and timestamps stable until the word changes', () => {
    const initial = normalizeVocabularyItems(
      [{
        word: 'create',
        type: 'verb',
        vnMeaning: 'tạo ra',
        pronunciation: '/kriˈeɪt/',
      }],
      100,
    );
    const unchanged = normalizeVocabularyItems(initial, 200, initial);
    const changedInput: VocabItem[] = [{
      ...unchanged[0],
      vnMeaning: 'tạo mới',
    }];
    const changed = normalizeVocabularyItems(changedInput, 300, unchanged);

    expect(unchanged[0].id).toBe(initial[0].id);
    expect(unchanged[0].createdAt).toBe(100);
    expect(unchanged[0].updatedAt).toBe(100);
    expect(changed[0].id).toBe(initial[0].id);
    expect(changed[0].createdAt).toBe(100);
    expect(changed[0].updatedAt).toBe(300);
  });

  it('keeps mistake history separate for duplicate word text', () => {
    const tree: FolderNode = {
      kind: 'folder',
      id: 'root',
      label: 'Root',
      children: [{
        kind: 'topic',
        id: 'topic-duplicate',
        label: 'Từ đồng dạng',
      }],
    };
    saveTreeToStorage(tree);

    recordMistakes(
      [
        { wordId: 'word-1', word: 'read', viMeaning: 'đọc', count: 1 },
        {
          wordId: 'word-2',
          word: 'read',
          viMeaning: 'đã đọc',
          count: 2,
        },
      ],
      'topic-duplicate',
      'read-write',
    );

    const stats = Object.values(loadMistakesStats());
    expect(stats).toHaveLength(2);
    expect(stats.map((record) => record.wordId).sort()).toEqual([
      'word-1',
      'word-2',
    ]);
  });

  it('rolls back a folder import when one topic cannot be written', () => {
    const initialTree: FolderNode = {
      kind: 'folder',
      id: 'root',
      label: 'Root',
      children: [{
        kind: 'topic',
        id: 'topic-existing',
        label: 'Hiện có',
      }],
    };
    saveTreeToStorage(initialTree);
    saveVocabularyTopic('topic-existing', [{
      word: 'existing',
      type: 'adjective',
      vnMeaning: 'hiện có',
      pronunciation: '',
    }]);
    const beforeImport = createDatabaseBackup(600).records;

    const importedTree: FolderNode = {
      ...initialTree,
      children: [
        ...initialTree.children,
        {
          kind: 'topic',
          id: 'topic-new-one',
          label: 'Mới một',
        },
        {
          kind: 'topic',
          id: 'topic-new-two',
          label: 'Mới hai',
        },
      ],
    };
    const failingKey =
      `${DATABASE_KEYS.vocabularyTopicPrefix}topic-new-two`;
    const originalSetItem = Storage.prototype.setItem;
    let failNextWrite = true;
    const setItemSpy = jest
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementation(function setItem(
        this: Storage,
        key: string,
        value: string,
      ) {
        if (failNextWrite && key === failingKey) {
          failNextWrite = false;
          throw new Error('Simulated topic write failure');
        }
        return originalSetItem.call(this, key, value);
      });

    try {
      expect(() =>
        saveVocabularyImportAtomically(importedTree, {
          'topic-new-one': [{
            word: 'one',
            type: 'number',
            vnMeaning: 'một',
            pronunciation: '',
          }],
          'topic-new-two': [{
            word: 'two',
            type: 'number',
            vnMeaning: 'hai',
            pronunciation: '',
          }],
        }),
      ).toThrow(/Simulated topic write failure/);
    } finally {
      setItemSpy.mockRestore();
    }

    expect(createDatabaseBackup(600).records).toEqual(beforeImport);
    expect(loadTreeFromStorage()).toEqual(initialTree);
    expect(loadVocabularyTopic('topic-new-one')).toBeNull();
    expect(loadVocabularyTopic('topic-new-two')).toBeNull();
  });

  it('round-trips all application data through a JSON backup', () => {
    const exportedAt = 987654321;
    const tree: FolderNode = {
      kind: 'folder',
      id: 'root',
      label: 'Kho từ vựng',
      children: [{
        kind: 'folder',
        id: 'folder-daily',
        label: 'Từ vựng hằng ngày',
        children: [
          {
            kind: 'topic',
            id: 'topic-food',
            label: 'Đồ ăn và thức uống',
          },
          {
            kind: 'topic',
            id: 'topic-empty',
            label: 'Chủ đề rỗng',
          },
        ],
      }],
    };
    const foodItems: VocabItem[] = [{
      id: 'word-cathedral',
      word: 'cathedral',
      type: 'noun',
      vnMeaning: 'nhà thờ chính tòa',
      pronunciation: '/kəˈθiːdrəl/',
      createdAt: 100,
      updatedAt: 200,
    }];

    saveTreeToStorage(tree);
    saveVocabularyTopic('topic-food', foodItems);
    saveVocabularyTopic('topic-empty', []);
    saveTrainingVocabularySet('training-mistakes', foodItems);
    updatePreferences((current) => ({
      ...current,
      themeMode: 'dark',
      vocabularyViewMode: 'grid',
      language: 'vi',
      flashcards: { removeCorrectCards: true },
      writeTraining: {
        answerReviewDurationMs: 4500,
        disableAutoAdvance: true,
      },
    }));
    saveTrainingSessionValue('flashcardsReading', {
      topicId: 'topic-food',
      score: 2,
      mistakes: 1,
      flipped: { 0: true },
      targetIdx: 0,
      language: 'vi',
      timestamp: 300,
    });
    recordMistakes(
      [{
        wordId: 'word-cathedral',
        word: 'cathedral',
        viMeaning: 'nhà thờ chính tòa',
        count: 2,
      }],
      'topic-food',
      'flashcards-reading',
    );
    saveBackupMetadata(exportedAt);

    const exported = JSON.parse(
      JSON.stringify(createDatabaseBackup(exportedAt)),
    ) as ReturnType<typeof createDatabaseBackup>;
    const expectedRecords = exported.records;

    clearDatabase();
    restoreDatabaseBackup(exported);

    expect(createDatabaseBackup(exportedAt).records).toEqual(
      expectedRecords,
    );
    expect(loadTreeFromStorage()).toEqual(tree);
    expect(loadVocabularyTopic('topic-food')).toEqual(foodItems);
    expect(loadVocabularyTopic('topic-empty')).toEqual([]);
    expect(loadPreferences()).toEqual({
      themeMode: 'dark',
      vocabularyViewMode: 'grid',
      language: 'vi',
      flashcards: { removeCorrectCards: true },
      writeTraining: {
        answerReviewDurationMs: 4500,
        disableAutoAdvance: true,
      },
    });
    expect(
      loadTrainingSessionValue<{ topicId: string }>('flashcardsReading')
        ?.topicId,
    ).toBe('topic-food');
    expect(Object.values(loadMistakesStats())).toEqual([
      expect.objectContaining({
        wordId: 'word-cathedral',
        topicId: 'topic-food',
        mistakeCount: 2,
      }),
    ]);
  });
});
