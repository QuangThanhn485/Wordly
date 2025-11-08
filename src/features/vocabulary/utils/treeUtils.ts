import type { FolderNode, FileLeaf } from '../types';

// ===== ID Generator =====
// Generate truly unique ID using timestamp + random string
export const genId = () => {
  return `n_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
};

// ===== Clone Node =====
export const cloneNode = (node: FolderNode | FileLeaf): FolderNode | FileLeaf => {
  if (node.kind === 'file') return { ...node, id: genId() };
  return { ...node, id: genId(), children: node.children.map(cloneNode) as any };
};

// ===== Find Node by Path =====
// path is array of node ids from root -> target
export const findNodeByPath = (
  root: FolderNode,
  path: string[],
): { node: FolderNode | FileLeaf; parent: FolderNode | null; index: number } | null => {
  let current: FolderNode | FileLeaf = root;
  let parent: FolderNode | null = null;
  let idx = -1;
  for (let i = 1; i < path.length; i++) {
    if (current.kind !== 'folder') return null;
    const nextIndex = current.children.findIndex((c) => c.id === path[i]);
    if (nextIndex === -1) return null;
    parent = current;
    idx = nextIndex;
    current = current.children[nextIndex];
  }
  return { node: current, parent, index: idx };
};

// ===== Check if candidate is descendant of ancestor =====
export const isDescendant = (ancPath: string[], candPath: string[]): boolean => {
  if (candPath.length <= ancPath.length) return false;
  for (let i = 0; i < ancPath.length; i++) if (ancPath[i] !== candPath[i]) return false;
  return true;
};

// ===== Ensure unique name =====
export const ensureUniqueName = (siblings: Array<FolderNode | FileLeaf>, baseName: string, isFolder: boolean): string => {
  const existingNames = new Set(
    siblings.map((s) => (s.kind === 'folder' ? s.label.toLowerCase() : s.name.toLowerCase()))
  );
  
  let candidate = baseName;
  let counter = 1;
  
  while (existingNames.has(candidate.toLowerCase())) {
    if (isFolder) {
      candidate = `${baseName} (${counter})`;
    } else {
      // For files, insert counter before extension
      const dotIndex = baseName.lastIndexOf('.');
      if (dotIndex > 0) {
        const nameWithoutExt = baseName.substring(0, dotIndex);
        const ext = baseName.substring(dotIndex);
        candidate = `${nameWithoutExt} (${counter})${ext}`;
      } else {
        candidate = `${baseName} (${counter})`;
      }
    }
    counter++;
  }
  
  return candidate;
};

// ===== Get all file names in a tree (for deletion) =====
export const getAllFileNames = (node: FolderNode | FileLeaf): string[] => {
  if (node.kind === 'file') return [node.name];
  const files: string[] = [];
  for (const child of node.children) {
    files.push(...getAllFileNames(child));
  }
  return files;
};

// ===== Remove node at path =====
export const removeAtPath = (
  root: FolderNode,
  path: string[],
): { newRoot: FolderNode; removed?: FolderNode | FileLeaf } => {
  const copy = structuredClone(root);
  const located = findNodeByPath(copy, path);
  if (!located || !located.parent) return { newRoot: root };
  const removed = located.parent.children.splice(located.index, 1)[0];
  return { newRoot: copy, removed };
};

