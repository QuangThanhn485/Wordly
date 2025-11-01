import type { VocabItem, FolderNode } from '../types';

// ===== LocalStorage Keys =====
const STORAGE_KEY_VOCAB = 'wordly_vocab_map';
const STORAGE_KEY_TREE = 'wordly_tree';

// ===== Vocab Storage =====
export const saveVocabToStorage = (vocabMap: Record<string, VocabItem[]>): void => {
  try {
    localStorage.setItem(STORAGE_KEY_VOCAB, JSON.stringify(vocabMap));
  } catch (err) {
    console.error('Failed to save vocab to localStorage:', err);
  }
};

export const loadVocabFromStorage = (): Record<string, VocabItem[]> | null => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_VOCAB);
    return stored ? JSON.parse(stored) : null;
  } catch (err) {
    console.error('Failed to load vocab from localStorage:', err);
    return null;
  }
};

// ===== Tree Storage =====
export const saveTreeToStorage = (tree: FolderNode): void => {
  try {
    localStorage.setItem(STORAGE_KEY_TREE, JSON.stringify(tree));
  } catch (err) {
    console.error('Failed to save tree to localStorage:', err);
  }
};

export const loadTreeFromStorage = (): FolderNode | null => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_TREE);
    return stored ? JSON.parse(stored) : null;
  } catch (err) {
    console.error('Failed to load tree from localStorage:', err);
    return null;
  }
};

