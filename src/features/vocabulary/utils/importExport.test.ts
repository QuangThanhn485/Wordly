import type { FolderNode, TopicItem, VocabItem } from '../types';
import { getAllTopics } from './treeUtils';
import {
  createVocabularyFolderExport,
  createVocabularyTopicExport,
  parseVocabularyFolderImport,
  parseVocabularyTopicImport,
} from './importExport';

const topic: TopicItem = {
  kind: 'topic',
  id: 'topic-actions',
  label: 'Hành động cơ bản',
};

const vocabulary: VocabItem[] = [
  {
    id: 'word-create',
    word: 'create',
    type: 'verb',
    vnMeaning: 'tạo ra',
    pronunciation: '/kriˈeɪt/',
    createdAt: 100,
    updatedAt: 200,
  },
];

describe('vocabulary import/export', () => {
  it('round-trips a topic without losing word metadata', () => {
    const exported = createVocabularyTopicExport(topic, vocabulary, 300);
    const parsed = parseVocabularyTopicImport(
      JSON.parse(JSON.stringify(exported)),
      'fallback',
    );

    expect(exported.topic).toEqual({
      id: topic.id,
      label: topic.label,
    });
    expect(parsed).toEqual({
      label: topic.label,
      vocabulary,
    });
  });

  it('round-trips nested folders, Unicode labels, and empty topics', () => {
    const folder: FolderNode = {
      kind: 'folder',
      id: 'folder-root',
      label: 'Kho từ vựng tiếng Việt',
      children: [
        topic,
        {
          kind: 'folder',
          id: 'folder-empty',
          label: 'Chủ đề chưa học',
          children: [{
            kind: 'topic',
            id: 'topic-empty',
            label: 'Từ vựng rỗng',
          }],
        },
      ],
    };
    const exported = createVocabularyFolderExport(
      folder,
      {
        [topic.id]: vocabulary,
        'topic-empty': [],
      },
      400,
    );
    let nextId = 0;
    const parsed = parseVocabularyFolderImport(
      JSON.parse(JSON.stringify(exported)),
      () => `imported-${++nextId}`,
      { folder: 'Thư mục', topic: 'Chủ đề' },
    );

    expect(parsed.folder.label).toBe(folder.label);
    const importedTopics = getAllTopics(parsed.folder);
    const importedActions = importedTopics.find(
      (item) => item.label === topic.label,
    );
    const importedEmpty = importedTopics.find(
      (item) => item.label === 'Từ vựng rỗng',
    );

    expect(importedTopics).toHaveLength(2);
    expect(importedActions?.id).not.toBe(topic.id);
    expect(parsed.vocabularyByTopicId[importedActions!.id]).toEqual(
      vocabulary,
    );
    expect(parsed.vocabularyByTopicId[importedEmpty!.id]).toEqual([]);
  });

  it('rejects a current folder export when a topic payload is missing', () => {
    const folder: FolderNode = {
      kind: 'folder',
      id: 'folder-root',
      label: 'Root',
      children: [topic],
    };
    const exported = createVocabularyFolderExport(
      folder,
      { [topic.id]: vocabulary },
      500,
    );
    delete exported.vocabularyData[topic.id];
    let nextId = 0;

    expect(() =>
      parseVocabularyFolderImport(
        exported,
        () => `new-id-${++nextId}`,
        { folder: 'Folder', topic: 'Topic' },
      ),
    ).toThrow(/missing for topic/);
  });

  it('keeps legacy topic labels compatible while validating words', () => {
    const parsed = parseVocabularyTopicImport(
      {
        fileName: 'Động vật.txt',
        vocabulary: [{
          word: 'cat',
          vnMeaning: 'con mèo',
        }],
      },
      'fallback',
    );

    expect(parsed.label).toBe('Động vật');
    expect(parsed.vocabulary).toEqual([{
      word: 'cat',
      type: '',
      vnMeaning: 'con mèo',
      pronunciation: '',
    }]);
    expect(() =>
      parseVocabularyTopicImport(
        { vocabulary: [{ type: 'noun' }] },
        'fallback',
      ),
    ).toThrow(/missing the word/);
  });
});
