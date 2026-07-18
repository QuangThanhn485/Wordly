import {
  __resetDatabaseForTests,
  createDatabaseBackup,
  DATABASE_KEYS,
  listDatabaseKeys,
  readDatabaseValue,
  restoreDatabaseBackup,
} from '@/data';
import type { FolderNode, VocabItem } from '../types';
import {
  loadTreeFromStorage,
  loadVocabularyTopic,
  loadVocabularyTopicCounts,
  normalizeVocabularyItems,
  saveTreeToStorage,
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
});
