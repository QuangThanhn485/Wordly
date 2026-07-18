import type { FolderNode, TopicItem } from '../types';

// ===== ID Generator =====
// Generate truly unique ID using timestamp + random string
export const genId = () => {
  return `n_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
};

// ===== Clone Node =====
export const cloneNode = (node: FolderNode | TopicItem): FolderNode | TopicItem => {
  if (node.kind === 'topic') return { ...node, id: genId() };
  return { ...node, id: genId(), children: node.children.map(cloneNode) };
};

export const cloneNodeWithTopicMapping = (
  node: FolderNode | TopicItem,
): { node: FolderNode | TopicItem; topicIdMapping: Record<string, string> } => {
  const topicIdMapping: Record<string, string> = {};

  const clone = (current: FolderNode | TopicItem): FolderNode | TopicItem => {
    const id = genId();
    if (current.kind === 'topic') {
      topicIdMapping[current.id] = id;
      return { ...current, id };
    }
    return { ...current, id, children: current.children.map(clone) };
  };

  return { node: clone(node), topicIdMapping };
};

// ===== Find Node by Path =====
// path is array of node ids from root -> target
export const findNodeByPath = (
  root: FolderNode,
  path: string[],
): { node: FolderNode | TopicItem; parent: FolderNode | null; index: number } | null => {
  let current: FolderNode | TopicItem = root;
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
export const ensureUniqueName = (
  siblings: Array<FolderNode | TopicItem>,
  baseName: string,
  isFolder: boolean,
): string => {
  const existingNames = new Set(
    siblings.map((s) => s.label.trim().toLocaleLowerCase('vi')),
  );

  const normalizedBaseName = baseName.trim();
  let candidate = normalizedBaseName;
  let counter = 1;

  while (existingNames.has(candidate.toLocaleLowerCase('vi'))) {
    candidate = `${normalizedBaseName} (${counter})`;
    counter++;
  }

  return candidate;
};

// ===== Get all topic IDs in a tree (for deletion/counting) =====
export const getAllTopicIds = (node: FolderNode | TopicItem): string[] => {
  if (node.kind === 'topic') return [node.id];
  const topicIds: string[] = [];
  for (const child of node.children) {
    topicIds.push(...getAllTopicIds(child));
  }
  return topicIds;
};

export const getAllTopics = (node: FolderNode | TopicItem): TopicItem[] => {
  if (node.kind === 'topic') return [node];
  return node.children.flatMap(getAllTopics);
};

// ===== Remove node at path =====
export const removeAtPath = (
  root: FolderNode,
  path: string[],
): { newRoot: FolderNode; removed?: FolderNode | TopicItem } => {
  const copy = structuredClone(root);
  const located = findNodeByPath(copy, path);
  if (!located || !located.parent) return { newRoot: root };
  const removed = located.parent.children.splice(located.index, 1)[0];
  return { newRoot: copy, removed };
};

