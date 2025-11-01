import type { VocabItem, FolderNode } from '../types';
import { genId } from '../utils/treeUtils';

// ===== Demo seed data =====
export const seedVocab: Record<string, VocabItem[]> = {
  'vocab1.txt': [
    { word: 'apple', type: 'noun', vnMeaning: 'quả táo', pronunciation: 'ˈæp.əl' },
    { word: 'eat', type: 'verb', vnMeaning: 'ăn', pronunciation: 'iːt' },
    { word: 'delicious', type: 'adjective', vnMeaning: 'ngon', pronunciation: 'dɪˈlɪʃ.əs' },
  ],
  'vocab2.txt': [
    { word: 'run', type: 'verb', vnMeaning: 'chạy', pronunciation: 'rʌn' },
    { word: 'quickly', type: 'adverb', vnMeaning: 'một cách nhanh chóng', pronunciation: 'ˈkwɪk.li' },
    { word: 'tired', type: 'adjective', vnMeaning: 'mệt', pronunciation: 'taɪəd' },
  ],
  'vocab3.txt': [
    { word: 'drink', type: 'verb', vnMeaning: 'uống', pronunciation: 'drɪŋk' },
    { word: 'water', type: 'noun', vnMeaning: 'nước', pronunciation: 'ˈwɔː.tər' },
  ],
  'vocab4.txt': [
    { word: 'study', type: 'verb', vnMeaning: 'học', pronunciation: 'ˈstʌd.i' },
    { word: 'book', type: 'noun', vnMeaning: 'sách', pronunciation: 'bʊk' },
  ],
};

export const getDefaultTree = (): FolderNode => ({
  kind: 'folder',
  label: 'Root',
  id: genId(),
  children: [
    { kind: 'folder', label: 'Thực phẩm & Ăn uống', id: genId(), children: [{ kind: 'file', name: 'vocab1.txt', id: genId() }] },
    {
      kind: 'folder',
      label: 'Hoạt động hàng ngày',
      id: genId(),
      children: [
        { kind: 'file', name: 'vocab2.txt', id: genId() },
        {
          kind: 'folder',
          label: 'Thể thao',
          id: genId(),
          children: [{ kind: 'file', name: 'vocab3.txt', id: genId() }],
        },
      ],
    },
    { kind: 'folder', label: 'Công việc & Giáo dục', id: genId(), children: [{ kind: 'file', name: 'vocab4.txt', id: genId() }] },
  ],
});

