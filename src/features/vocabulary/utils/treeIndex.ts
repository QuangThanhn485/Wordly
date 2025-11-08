import type { FolderNode, FileLeaf } from '../types';

/**
 * Path Index Cache
 * Maps node IDs to their paths and nodes for O(1) lookup
 */
export class TreeIndex {
  private idToPath: Map<string, string[]> = new Map();
  private idToNode: Map<string, FolderNode | FileLeaf> = new Map();
  private root: FolderNode;

  constructor(root: FolderNode) {
    this.root = root;
    this.rebuild();
  }

  /**
   * Rebuild index from root (call when tree structure changes)
   */
  rebuild(): void {
    this.idToPath.clear();
    this.idToNode.clear();
    this._traverse(this.root, [this.root.id]);
  }

  private _traverse(node: FolderNode | FileLeaf, path: string[]): void {
    this.idToPath.set(node.id, [...path]);
    this.idToNode.set(node.id, node);

    if (node.kind === 'folder') {
      for (const child of node.children) {
        this._traverse(child, [...path, child.id]);
      }
    }
  }

  /**
   * Get path for a node ID (O(1))
   */
  getPath(nodeId: string): string[] | null {
    return this.idToPath.get(nodeId) || null;
  }

  /**
   * Get node by ID (O(1))
   */
  getNode(nodeId: string): FolderNode | FileLeaf | null {
    return this.idToNode.get(nodeId) || null;
  }

  /**
   * Find node by path using index (faster than traversal)
   */
  findByPath(path: string[]): { node: FolderNode | FileLeaf; parent: FolderNode | null; index: number } | null {
    if (path.length === 0) return null;
    
    const targetId = path[path.length - 1];
    const node = this.getNode(targetId);
    if (!node) return null;

    if (path.length === 1) {
      // Root node
      return { node, parent: null, index: -1 };
    }

    const parentId = path[path.length - 2];
    const parent = this.getNode(parentId);
    if (!parent || parent.kind !== 'folder') return null;

    const index = parent.children.findIndex(c => c.id === targetId);
    return { node, parent, index };
  }

  /**
   * Update root and rebuild index
   */
  updateRoot(newRoot: FolderNode): void {
    this.root = newRoot;
    this.rebuild();
  }
}

