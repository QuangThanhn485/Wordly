// ===== Types =====
export type VocabItem = {
  word: string;
  type: string;
  vnMeaning: string;
  pronunciation: string;
};

export type FileLeaf = { 
  kind: 'file'; 
  name: string; 
  id: string 
};

export type FolderNode = { 
  kind: 'folder'; 
  label: string; 
  id: string; 
  children: Array<FolderNode | FileLeaf> 
};

export type MenuState = {
  type: 'folder' | 'file';
  path: string[];
  mouseX: number;
  mouseY: number;
} | null;

export type ClipboardState = {
  mode: 'cut' | 'copy';
  node: FolderNode | FileLeaf;
} | null;

export type SnackState = {
  open: boolean;
  msg: string;
  sev: 'success' | 'info' | 'warning' | 'error';
};

