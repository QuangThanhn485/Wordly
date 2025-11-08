import type { VocabItem, FolderNode } from '../types';
import { trackedSetItem, trackedRemoveItem } from '@/utils/storageTracker';

// ===== LocalStorage Keys =====
const STORAGE_KEY_VOCAB_OLD = 'wordly_vocab_map'; // Old format - for migration
const STORAGE_KEY_VOCAB_PREFIX = 'wordly_vocab_file:'; // New format prefix
const STORAGE_KEY_VOCAB_INDEX = 'wordly_vocab_index'; // Index of all file names
const STORAGE_KEY_VOCAB_COUNTS = 'wordly_vocab_counts'; // Counts map: { "file1.txt": 10, ... }
const STORAGE_KEY_TREE = 'wordly_tree';

// ===== Migration =====
/**
 * Migrate from old single-key format to new per-file format
 * This is a one-time migration that runs automatically
 */
const migrateOldVocabFormat = (): void => {
  try {
    const oldData = localStorage.getItem(STORAGE_KEY_VOCAB_OLD);
    if (!oldData) return; // No old data to migrate

    const oldVocabMap: Record<string, VocabItem[]> = JSON.parse(oldData);
    const fileNames = Object.keys(oldVocabMap);

    // Check if already migrated (index exists and has files)
    const existingIndex = localStorage.getItem(STORAGE_KEY_VOCAB_INDEX);
    if (existingIndex && JSON.parse(existingIndex).length > 0) {
      return; // Already migrated
    }

    console.log(`🔄 Migrating ${fileNames.length} vocab files to new storage format...`);

    // Migrate each file to its own key
    for (const fileName of fileNames) {
      const vocab = oldVocabMap[fileName];
      if (vocab && vocab.length > 0) {
        const key = `${STORAGE_KEY_VOCAB_PREFIX}${fileName}`;
        trackedSetItem(key, JSON.stringify(vocab));
      }
    }

    // Save index
    trackedSetItem(STORAGE_KEY_VOCAB_INDEX, JSON.stringify(fileNames));

    // Keep old data for safety (can remove later)
    // localStorage.removeItem(STORAGE_KEY_VOCAB_OLD);
    console.log('✅ Migration completed');
  } catch (err) {
    console.error('Failed to migrate vocab storage:', err);
  }
};

// ===== Index Management =====
/**
 * Get all file names from index
 */
const getVocabIndex = (): string[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_VOCAB_INDEX);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

/**
 * Update index with new file name
 */
const addToVocabIndex = (fileName: string): void => {
  const index = getVocabIndex();
  if (!index.includes(fileName)) {
    index.push(fileName);
    trackedSetItem(STORAGE_KEY_VOCAB_INDEX, JSON.stringify(index));
  }
};

/**
 * Remove file name from index
 */
const removeFromVocabIndex = (fileName: string): void => {
  const index = getVocabIndex();
  const filtered = index.filter((name) => name !== fileName);
  localStorage.setItem(STORAGE_KEY_VOCAB_INDEX, JSON.stringify(filtered));
};

/**
 * Update index (replace entire list)
 */
const updateVocabIndex = (fileNames: string[]): void => {
  trackedSetItem(STORAGE_KEY_VOCAB_INDEX, JSON.stringify(fileNames));
};

// ===== Per-File Vocab Storage (NEW FORMAT) =====
/**
 * Get storage key for a specific file
 */
const getVocabFileKey = (fileName: string): string => {
  return `${STORAGE_KEY_VOCAB_PREFIX}${fileName}`;
};

/**
 * Load vocab for a single file (FAST - only loads one file)
 */
export const loadVocabFile = (fileName: string): VocabItem[] | null => {
  try {
    const key = getVocabFileKey(fileName);
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : null;
  } catch (err) {
    console.error(`Failed to load vocab file "${fileName}":`, err);
    return null;
  }
};

/**
 * Save vocab for a single file (FAST - only saves one file)
 * Also updates the count automatically
 */
export const saveVocabFile = (fileName: string, vocab: VocabItem[]): void => {
  try {
    const key = getVocabFileKey(fileName);
    trackedSetItem(key, JSON.stringify(vocab));
    addToVocabIndex(fileName);
    
    // Auto-update count when saving vocab
    updateVocabCount(fileName, vocab.length);
  } catch (err) {
    console.error(`Failed to save vocab file "${fileName}":`, err);
  }
};

/**
 * Delete vocab file
 * Also removes the count
 */
export const deleteVocabFile = (fileName: string): void => {
  try {
    const key = getVocabFileKey(fileName);
    trackedRemoveItem(key);
    removeFromVocabIndex(fileName);
    removeVocabCount(fileName);
  } catch (err) {
    console.error(`Failed to delete vocab file "${fileName}":`, err);
  }
};

/**
 * Load all vocab files (for backward compatibility or bulk operations)
 * This is slower but sometimes needed
 */
export const loadVocabFromStorage = (): Record<string, VocabItem[]> | null => {
  // Run migration first
  migrateOldVocabFormat();

  try {
    const fileNames = getVocabIndex();
    const vocabMap: Record<string, VocabItem[]> = {};

    // Load each file
    for (const fileName of fileNames) {
      const vocab = loadVocabFile(fileName);
      if (vocab) {
        vocabMap[fileName] = vocab;
      }
    }

    return Object.keys(vocabMap).length > 0 ? vocabMap : null;
  } catch (err) {
    console.error('Failed to load vocab from storage:', err);
    return null;
  }
};

/**
 * Save all vocab files (for backward compatibility)
 * Note: This is slower, prefer saveVocabFile for single file updates
 */
export const saveVocabToStorage = (vocabMap: Record<string, VocabItem[]>): void => {
  try {
    const fileNames = Object.keys(vocabMap);

    // Save each file
    for (const fileName of fileNames) {
      saveVocabFile(fileName, vocabMap[fileName]);
    }

    // Update index
    updateVocabIndex(fileNames);
  } catch (err) {
    console.error('Failed to save vocab to storage:', err);
  }
};

// ===== Tree Storage =====
export const saveTreeToStorage = (tree: FolderNode): void => {
  try {
    trackedSetItem(STORAGE_KEY_TREE, JSON.stringify(tree));
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

// ===== Cleanup =====
/**
 * Remove old storage format (run after migration is confirmed working)
 */
export const cleanupOldVocabFormat = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEY_VOCAB_OLD);
  } catch (err) {
    console.error('Failed to cleanup old vocab format:', err);
  }
};

// ===== Vocab Counts Storage (FAST - for displaying counts without loading full vocab) =====
/**
 * Load vocab counts map from storage
 * Returns { "file1.txt": 10, "file2.txt": 5, ... }
 */
export const loadVocabCounts = (): Record<string, number> => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_VOCAB_COUNTS);
    return stored ? JSON.parse(stored) : {};
  } catch (err) {
    console.error('Failed to load vocab counts:', err);
    return {};
  }
};

/**
 * Save vocab counts map to storage
 */
export const saveVocabCounts = (counts: Record<string, number>): void => {
  try {
    trackedSetItem(STORAGE_KEY_VOCAB_COUNTS, JSON.stringify(counts));
  } catch (err) {
    console.error('Failed to save vocab counts:', err);
  }
};

/**
 * Update count for a single file
 */
export const updateVocabCount = (fileName: string, count: number): void => {
  const counts = loadVocabCounts();
  counts[fileName] = count;
  saveVocabCounts(counts);
};

/**
 * Remove count for a file
 */
export const removeVocabCount = (fileName: string): void => {
  const counts = loadVocabCounts();
  delete counts[fileName];
  saveVocabCounts(counts);
};

/**
 * Rename count key (when file is renamed)
 */
export const renameVocabCount = (oldFileName: string, newFileName: string): void => {
  const counts = loadVocabCounts();
  if (counts[oldFileName] !== undefined) {
    counts[newFileName] = counts[oldFileName];
    delete counts[oldFileName];
    saveVocabCounts(counts);
  }
};

/**
 * Sync count from actual vocab file (recalculate)
 */
export const syncVocabCount = (fileName: string): void => {
  const vocab = loadVocabFile(fileName);
  const count = vocab ? vocab.length : 0;
  updateVocabCount(fileName, count);
};

/**
 * Sync all counts from actual vocab files (rebuild counts map)
 */
export const syncAllVocabCounts = (): void => {
  const fileNames = getVocabIndex();
  const counts: Record<string, number> = {};
  
  for (const fileName of fileNames) {
    const vocab = loadVocabFile(fileName);
    counts[fileName] = vocab ? vocab.length : 0;
  }
  
  saveVocabCounts(counts);
};
