import type { VocabItem, FolderNode } from '../types';
import { genId } from '../utils/treeUtils';

// ===== Empty seed data (no default vocabulary) =====
export const seedVocab: Record<string, VocabItem[]> = {};

export const getDefaultTree = (): FolderNode => ({
  kind: 'folder',
  label: 'Root',
  id: genId(),
  children: [], // Empty - users will import their own data
});

