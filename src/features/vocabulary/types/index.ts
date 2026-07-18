// ===== Types =====
export type VocabItem = {
  word: string;
  type: string;
  vnMeaning: string;
  pronunciation: string;
};

export type TopicItem = {
  kind: 'topic';
  label: string;
  id: string;
};

export type FolderNode = { 
  kind: 'folder'; 
  label: string; 
  id: string; 
  children: Array<FolderNode | TopicItem>;
};

export type MenuState = {
  type: 'folder' | 'topic';
  path: string[];
  mouseX: number;
  mouseY: number;
} | null;

export type ClipboardState = {
  mode: 'cut' | 'copy';
  node: FolderNode | TopicItem;
} | null;

export type SnackState = {
  open: boolean;
  msg: string;
  sev: 'success' | 'info' | 'warning' | 'error';
};

