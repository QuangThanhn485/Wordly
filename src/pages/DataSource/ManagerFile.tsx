import React, { memo, useCallback, useMemo, useRef, useState } from 'react';
import {
  Box,
  Typography,
  List,
  ListItemButton,
  ListItemText,
  Collapse,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Paper,
  Divider,
  Tooltip,
  styled,
  tableCellClasses,
  Menu,
  MenuItem,
  ListItemIcon,
  useMediaQuery,
  useTheme,
  TableContainer,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Snackbar,
  Alert,
  Checkbox,
  Stack,
  Select,
  FormControl,
  InputLabel,
  FormHelperText,
} from '@mui/material';
import {
  Folder as FolderIcon,
  FolderOpen as FolderOpenIcon,
  InsertDriveFile as FileIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  VolumeUp as VolumeUpIcon,
  MenuBook as MenuBookIcon,
  Category as CategoryIcon,
  DriveFileRenameOutline as RenameIcon,
  ContentCopy as CopyIcon,
  ContentCut as CutIcon,
  ContentPaste as PasteIcon,
  FileUpload as ImportIcon,
  FileDownload as ExportIcon,
  CreateNewFolder as NewFolderIcon,
  DeleteOutline as DeleteIcon,
  MoreVert as MoreIcon,
  Add as AddIcon,
  Edit as EditIcon,
  CheckBox as CheckBoxIcon,
  CheckBoxOutlineBlank as CheckBoxOutlineBlankIcon,
  UnfoldLess as UnfoldLessIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
} from '@mui/icons-material';

// ===== Types =====
export type VocabItem = {
  word: string;
  type: string;
  vnMeaning: string;
  pronunciation: string;
};
export type FileLeaf = { kind: 'file'; name: string; id: string };
export type FolderNode = { kind: 'folder'; label: string; id: string; children: Array<FolderNode | FileLeaf> };

// ===== Word Types (Parts of Speech) =====
const WORD_TYPES = [
  { value: 'noun', label: 'Noun (Danh từ)' },
  { value: 'verb', label: 'Verb (Động từ)' },
  { value: 'adjective', label: 'Adjective (Tính từ)' },
  { value: 'adverb', label: 'Adverb (Trạng từ)' },
  { value: 'pronoun', label: 'Pronoun (Đại từ)' },
  { value: 'preposition', label: 'Preposition (Giới từ)' },
  { value: 'conjunction', label: 'Conjunction (Liên từ)' },
  { value: 'interjection', label: 'Interjection (Thán từ)' },
  { value: 'article', label: 'Article (Mạo từ)' },
  { value: 'determiner', label: 'Determiner (Từ hạn định)' },
  { value: 'auxiliary', label: 'Auxiliary (Trợ động từ)' },
] as const;

// ===== Demo seed data =====
const seedVocab: Record<string, VocabItem[]> = {
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

// ===== Utilities =====
const genId = (() => {
  let i = 0;
  return () => `n_${++i}`;
})();

const cloneNode = (node: FolderNode | FileLeaf): FolderNode | FileLeaf => {
  if (node.kind === 'file') return { ...node, id: genId() };
  return { ...node, id: genId(), children: node.children.map(cloneNode) as any };
};

// path is array of node ids from root -> target
const findNodeByPath = (
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

const isDescendant = (ancPath: string[], candPath: string[]): boolean => {
  if (candPath.length <= ancPath.length) return false;
  for (let i = 0; i < ancPath.length; i++) if (ancPath[i] !== candPath[i]) return false;
  return true;
};

// Remove node at path, returning tuple [newRoot, removedNode]
const removeAtPath = (
  root: FolderNode,
  path: string[],
): { newRoot: FolderNode; removed?: FolderNode | FileLeaf } => {
  const copy = structuredClone(root);
  const located = findNodeByPath(copy, path);
  if (!located || !located.parent) return { newRoot: root };
  const removed = located.parent.children.splice(located.index, 1)[0];
  return { newRoot: copy, removed };
};

const ensureUniqueName = (siblings: Array<FolderNode | FileLeaf>, base: string, isFolder: boolean) => {
  const exists = new Set(
    siblings.map((c) => (c.kind === 'folder' ? c.label : c.name).toLowerCase()),
  );
  if (!exists.has(base.toLowerCase())) return base;
  let k = 1;
  while (exists.has(`${base} (${k})`.toLowerCase())) k++;
  return `${base} (${k})`;
};

const gatherFileNames = (node: FolderNode | FileLeaf): string[] => {
  if (node.kind === 'file') return [node.name];
  let out: string[] = [];
  for (const c of node.children) out = out.concat(gatherFileNames(c));
  return out;
};

// ===== LocalStorage Utilities =====
const STORAGE_KEY_VOCAB = 'wordly_vocab_map';
const STORAGE_KEY_TREE = 'wordly_folder_tree';

const saveVocabToStorage = (vocabMap: Record<string, VocabItem[]>) => {
  try {
    localStorage.setItem(STORAGE_KEY_VOCAB, JSON.stringify(vocabMap));
  } catch (err) {
    console.error('Failed to save vocab to localStorage:', err);
  }
};

const loadVocabFromStorage = (): Record<string, VocabItem[]> | null => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_VOCAB);
    return stored ? JSON.parse(stored) : null;
  } catch (err) {
    console.error('Failed to load vocab from localStorage:', err);
    return null;
  }
};

const saveTreeToStorage = (tree: FolderNode) => {
  try {
    localStorage.setItem(STORAGE_KEY_TREE, JSON.stringify(tree));
  } catch (err) {
    console.error('Failed to save tree to localStorage:', err);
  }
};

const loadTreeFromStorage = (): FolderNode | null => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_TREE);
    return stored ? JSON.parse(stored) : null;
  } catch (err) {
    console.error('Failed to load tree from localStorage:', err);
    return null;
  }
};

// ===== Styles =====
const StyledTableCell = styled(TableCell)(({ theme }) => ({
  [`&.${tableCellClasses.head}`]: {
    backgroundColor: theme.palette.mode === 'dark' ? theme.palette.grey[900] : theme.palette.grey[100],
    fontWeight: 'bold',
    color: theme.palette.mode === 'dark' ? theme.palette.common.white : theme.palette.text.primary,
  },
  [`&.${tableCellClasses.body}`]: {
    fontSize: 14,
    color: theme.palette.mode === 'dark' ? theme.palette.common.white : theme.palette.text.primary,
  },
}));

const StyledTableRow = styled(TableRow)(({ theme }) => ({
  backgroundColor: theme.palette.mode === 'dark' ? theme.palette.grey[800] : theme.palette.background.paper,
  '&:nth-of-type(odd)': {
    backgroundColor: theme.palette.mode === 'dark' ? theme.palette.grey[700] : theme.palette.action.hover,
  },
  '&:last-child td, &:last-child th': { border: 0 },
}));

// ===== Speak =====
const speak = (text: string) => {
  if (typeof window === 'undefined') return;
  const synth = window.speechSynthesis;
  if (!synth) return;
  synth.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = 'en-US';
  synth.speak(utter);
};

const TOTAL_LEFT_BAND = 520;

// ===== Folder item (recursive) =====
const FolderItem = memo(function FolderItem({
  node,
  level = 0,
  onFileClick,
  onContext,
  path,
  forceShowMenu = false,
  isFolderOpen,
  onToggle,
}: {
  node: FolderNode;
  level?: number;
  onFileClick: (filePath: string[], fileName: string) => void;
  onContext: (type: 'folder' | 'file', path: string[], event: React.MouseEvent) => void;
  path: string[]; // ids from root to this node
  forceShowMenu?: boolean;
  isFolderOpen?: (id: string) => boolean;
  onToggle?: (folderId: string, open: boolean) => void;
}) {
  const open = isFolderOpen ? isFolderOpen(node.id) : false;
  const handleToggle = useCallback(() => {
    if (onToggle) {
      onToggle(node.id, !open);
    }
  }, [onToggle, node.id, open]);

  return (
    <>
      <Box sx={{ position: 'relative', '&:hover .folder-menu-icon': { opacity: 1 } }}>
        <ListItemButton
          onClick={handleToggle}
          onContextMenu={(e) => onContext('folder', path, e)}
          sx={{
            pl: 2 + level * 2,
            position: 'relative',
            '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.04)' },
            '&::before':
              level > 0
                ? {
                    content: '""',
                    position: 'absolute',
                    left: 20 + (level - 1) * 20,
                    top: 0,
                    bottom: 0,
                    width: '1px',
                    backgroundColor: '#e0e0e0',
                  }
                : undefined,
          }}
          aria-expanded={open}
          aria-label={`Toggle folder ${node.label}`}
        >
          {open ? <FolderOpenIcon color="primary" sx={{ mr: 1 }} /> : <FolderIcon color="primary" sx={{ mr: 1 }} />}
          <ListItemText primary={<Typography variant="body1" sx={{ fontWeight: 500 }}>{node.label}</Typography>} />
          <IconButton
            className="folder-menu-icon"
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              onContext('folder', path, e as unknown as React.MouseEvent);
            }}
            sx={{ opacity: forceShowMenu ? 1 : 0, transition: 'opacity 0.2s' }}
            aria-label={`Folder menu for ${node.label}`}
          >
            <MoreIcon fontSize="small" />
          </IconButton>
          {open ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
        </ListItemButton>
      </Box>

      <Collapse in={open} timeout="auto" unmountOnExit>
        <List
          component="div"
          disablePadding
          sx={{
            position: 'relative',
            '&::before': {
              content: '""',
              position: 'absolute',
              left: 20 + level * 20,
              top: 0,
              bottom: 0,
              width: '1px',
              backgroundColor: '#e0e0e0',
            },
          }}
        >
          {node.children.map((child) =>
            child.kind === 'folder' ? (
              <FolderItem
                key={child.id}
                node={child}
                level={level + 1}
                onFileClick={onFileClick}
                onContext={onContext}
                path={[...path, child.id]}
                forceShowMenu={forceShowMenu}
                isFolderOpen={isFolderOpen}
                onToggle={onToggle}
              />
            ) : (
              <FileItem
                key={child.id}
                node={child}
                level={level + 1}
                onClick={() => onFileClick([...path, child.id], child.name)}
                onContext={(e) => onContext('file', [...path, child.id], e)}
              />
            ),
          )}
        </List>
      </Collapse>
    </>
  );
});

const FileItem = memo(function FileItem({
  node,
  onClick,
  level = 0,
  onContext,
}: {
  node: FileLeaf;
  onClick: () => void;
  level?: number;
  onContext: (e: React.MouseEvent) => void;
}) {
  return (
    <ListItemButton
      sx={{
        pl: 4 + level * 2,
        position: 'relative',
        '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.04)' },
        '&::before':
          level > 0
            ? {
                content: '""',
                position: 'absolute',
                left: 20 + (level - 1) * 20,
                top: 0,
                bottom: 0,
                width: '1px',
                backgroundColor: '#e0e0e0',
              }
            : undefined,
      }}
      onClick={onClick}
      onContextMenu={onContext}
      aria-label={`Open file ${node.name}`}
    >
      <FileIcon color="action" sx={{ mr: 1 }} />
      <ListItemText primary={<Typography variant="body1">{node.name}</Typography>} />
    </ListItemButton>
  );
});

// ===== Default tree structure =====
const getDefaultTree = (): FolderNode => ({
  kind: 'folder',
  label: 'Từ vựng theo chủ đề',
  id: genId(),
  children: [
    { kind: 'folder', label: 'Thực phẩm & Ăn uống', id: genId(), children: [{ kind: 'file', name: 'vocab1.txt', id: genId() }] },
    {
      kind: 'folder',
      label: 'Hoạt động hàng ngày',
      id: genId(),
      children: [
        { kind: 'folder', label: 'Vận động', id: genId(), children: [{ kind: 'file', name: 'vocab2.txt', id: genId() }] },
        { kind: 'folder', label: 'Sinh hoạt', id: genId(), children: [{ kind: 'file', name: 'vocab3.txt', id: genId() }] },
      ],
    },
    {
      kind: 'folder',
      label: 'Học tập',
      id: genId(),
      children: [
        {
          kind: 'folder',
          label: 'Tài liệu',
          id: genId(),
          children: [
            { kind: 'folder', label: 'Sách vở', id: genId(), children: [{ kind: 'file', name: 'vocab4.txt', id: genId() }] },
          ],
        },
      ],
    },
  ],
});

// ===== Main =====
const ManagerFile: React.FC = () => {
  // Load from localStorage on init, fallback to seed data
  const [vocabMap, setVocabMap] = useState<Record<string, VocabItem[]>>(() => {
    const stored = loadVocabFromStorage();
    return stored || { ...seedVocab };
  });
  
  const [tree, setTree] = useState<FolderNode>(() => {
    const stored = loadTreeFromStorage();
    return stored || getDefaultTree();
  });
  
  // Helper to update vocabMap and save to localStorage
  const updateVocabMap = useCallback((updater: (prev: Record<string, VocabItem[]>) => Record<string, VocabItem[]>) => {
    setVocabMap((prev) => {
      const next = updater(prev);
      saveVocabToStorage(next);
      return next;
    });
  }, []);
  
  // Helper to update tree and save to localStorage
  const updateTree = useCallback((updater: (prev: FolderNode) => FolderNode) => {
    setTree((prev) => {
      const next = updater(prev);
      saveTreeToStorage(next);
      return next;
    });
  }, []);

  const [selectedPath, setSelectedPath] = useState<string[] | null>(null); // path to file id
  const selectedFile = useMemo(() => {
    if (!selectedPath) return null;
    const located = findNodeByPath(tree, selectedPath);
    return located?.node.kind === 'file' ? located.node : null;
  }, [selectedPath, tree]);
  const selectedTitle = useMemo(() => selectedFile?.name.replace(/\.txt$/i, '') ?? '', [selectedFile]);

  const theme = useTheme();
  const isMdDown = useMediaQuery(theme.breakpoints.down('md'), { noSsr: true });
  const isSmDown = useMediaQuery(theme.breakpoints.down('sm'), { noSsr: true });
  const sidebarWidth = useMemo(
    () => (isMdDown ? '100%' : `clamp(220px, calc(${TOTAL_LEFT_BAND}px - var(--nav-w, 240px)), 360px)`),
    [isMdDown],
  );

  // ===== Context menu state =====
  const [menu, setMenu] = useState<
    | { type: 'folder' | 'file'; path: string[]; mouseX: number; mouseY: number }
    | null
  >(null);
  const openContext = useCallback((type: 'folder' | 'file', path: string[], event: React.MouseEvent) => {
    event.preventDefault();
    setMenu({ type, path, mouseX: event.clientX - 2, mouseY: event.clientY - 4 });
  }, []);
  const closeMenu = useCallback(() => setMenu(null), []);

  // ===== Clipboard for cut/copy/paste =====
  const [clip, setClip] = useState<null | { mode: 'cut' | 'copy'; node: FolderNode | FileLeaf }>(null);

  // ===== Dialogs =====
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFileOpen, setNewFileOpen] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<null | { path: string[]; type: 'folder' | 'file'; label: string; fileNames: string[] }>(null);
  const [snack, setSnack] = useState<{ open: boolean; msg: string; sev: 'success' | 'info' | 'warning' | 'error' }>(
    { open: false, msg: '', sev: 'success' },
  );

  // ===== Vocab form dialog =====
  const [vocabFormOpen, setVocabFormOpen] = useState(false);
  const [vocabFormMode, setVocabFormMode] = useState<'add' | 'edit'>('add');
  const [vocabFormIndex, setVocabFormIndex] = useState<number | null>(null);
  const [vocabFormData, setVocabFormData] = useState<VocabItem>({
    word: '',
    type: '',
    vnMeaning: '',
    pronunciation: '',
  });

  // ===== Checkbox selection =====
  const [selectedVocabs, setSelectedVocabs] = useState<Set<string>>(new Set());

  // ===== Sidebar collapse/expand state =====
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);

  const toggleSidebar = useCallback(() => {
    setSidebarOpen((prev) => !prev);
  }, []);

  // ===== Folder collapse/expand state =====
  const [openFolders, setOpenFolders] = useState<Set<string>>(() => new Set([tree.id])); // Root folder is open by default

  // Sync openFolders when tree changes (e.g., after localStorage load)
  React.useEffect(() => {
    setOpenFolders((prev) => {
      const next = new Set(prev);
      // Ensure root folder is always open
      if (!next.has(tree.id)) {
        next.add(tree.id);
      }
      return next;
    });
  }, [tree.id]);

  const handleFolderToggle = useCallback((folderId: string, open: boolean) => {
    setOpenFolders((prev) => {
      const next = new Set(prev);
      if (open) {
        next.add(folderId);
      } else {
        next.delete(folderId);
        // Never close root folder
        if (folderId === tree.id) {
          next.add(tree.id);
        }
      }
      return next;
    });
  }, [tree.id]);

  const collapseAll = useCallback(() => {
    // Only keep level 1 folders (direct children of root) open
    const level1FolderIds = new Set<string>([tree.id]); // Keep root open
    tree.children.forEach((child) => {
      if (child.kind === 'folder') {
        level1FolderIds.add(child.id);
      }
    });
    setOpenFolders(level1FolderIds);
  }, [tree]);

  const isFolderOpen = useCallback((folderId: string) => {
    return openFolders.has(folderId);
  }, [openFolders]);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const showSnack = (msg: string, sev: 'success' | 'info' | 'warning' | 'error' = 'success') =>
    setSnack({ open: true, msg, sev });

  // ===== Vocab form handlers =====
  const openAddVocabForm = useCallback(() => {
    if (!selectedFile) return;
    setVocabFormMode('add');
    setVocabFormIndex(null);
    setVocabFormData({ word: '', type: '', vnMeaning: '', pronunciation: '' });
    setVocabFormOpen(true);
  }, [selectedFile]);

  const openEditVocabForm = useCallback((item: VocabItem, index: number) => {
    setVocabFormMode('edit');
    setVocabFormIndex(index);
    setVocabFormData({ ...item });
    setVocabFormOpen(true);
  }, []);

  const handleSaveVocab = useCallback(() => {
    if (!selectedFile || !vocabFormData.word.trim()) {
      showSnack('Vui lòng nhập từ vựng.', 'warning');
      return;
    }
    
    const fileName = selectedFile.name;
    updateVocabMap((prev) => {
      const vocabList = prev[fileName] || [];
      if (vocabFormMode === 'add') {
        const newList = [...vocabList, { ...vocabFormData }];
        return { ...prev, [fileName]: newList };
      } else {
        // edit mode
        if (vocabFormIndex === null) return prev;
        const newList = [...vocabList];
        newList[vocabFormIndex] = { ...vocabFormData };
        return { ...prev, [fileName]: newList };
      }
    });
    setVocabFormOpen(false);
    showSnack(vocabFormMode === 'add' ? 'Đã thêm từ vựng.' : 'Đã cập nhật từ vựng.');
  }, [selectedFile, vocabFormData, vocabFormMode, vocabFormIndex, updateVocabMap]);

  const handleDeleteSelectedVocabs = useCallback(() => {
    if (!selectedFile || selectedVocabs.size === 0) return;
    
    const fileName = selectedFile.name;
    const vocabList = vocabMap[fileName] || [];
    const wordsToDelete = Array.from(selectedVocabs);
    
    updateVocabMap((prev) => {
      const newList = vocabList.filter((item) => !wordsToDelete.includes(item.word));
      return { ...prev, [fileName]: newList };
    });
    
    setSelectedVocabs(new Set());
    showSnack(`Đã xóa ${wordsToDelete.length} từ vựng.`);
  }, [selectedFile, selectedVocabs, vocabMap, updateVocabMap]);

  const handleToggleVocabSelection = useCallback((word: string) => {
    setSelectedVocabs((prev) => {
      const next = new Set(prev);
      if (next.has(word)) {
        next.delete(word);
      } else {
        next.add(word);
      }
      return next;
    });
  }, []);

  const handleSelectAllVocabs = useCallback(() => {
    if (!selectedFile) return;
    const vocabList = vocabMap[selectedFile.name] || [];
    if (selectedVocabs.size === vocabList.length) {
      // Deselect all
      setSelectedVocabs(new Set());
    } else {
      // Select all
      setSelectedVocabs(new Set(vocabList.map((item) => item.word)));
    }
  }, [selectedFile, vocabMap, selectedVocabs]);

  // Clear selection when file changes
  React.useEffect(() => {
    setSelectedVocabs(new Set());
  }, [selectedFile]);

  // ===== Actions =====
  const handleFileClick = useCallback((filePath: string[], fileName: string) => {
    setSelectedPath(filePath);
  }, []);

  const startRename = useCallback(() => {
    if (!menu) return;
    const located = findNodeByPath(tree, menu.path);
    if (!located) return;
    const currentName = located.node.kind === 'folder' ? located.node.label : located.node.name;
    setRenameValue(currentName);
    setRenameOpen(true);
  }, [menu, tree]);

  const confirmRename = useCallback(() => {
    if (!menu) return;
    const located = findNodeByPath(tree, menu.path);
    if (!located || !located.parent) return;
    const siblings = located.parent.children.filter((c) => c.id !== located.node.id);
    const finalName = ensureUniqueName(siblings, renameValue.trim() || (menu.type === 'folder' ? 'Thư mục' : 'file.txt'), menu.type === 'folder');

    updateTree((prevTree) => {
      const copy = structuredClone(prevTree);
      const located2 = findNodeByPath(copy, menu.path)!;
      if (menu.type === 'folder' && located2.node.kind === 'folder') (located2.node as FolderNode).label = finalName;
      else if (menu.type === 'file' && located2.node.kind === 'file') (located2.node as FileLeaf).name = finalName;
      return copy;
    });
    
    // also if file renamed, move vocab content key
    if (menu.type === 'file' && located.node.kind === 'file') {
      const old = located.node.name;
      if (vocabMap[old]) {
        updateVocabMap((m) => {
          const { [old]: vals, ...rest } = m;
          return { ...rest, [finalName]: vals };
        });
      }
      if (selectedPath && selectedPath.join('/') === menu.path.join('/')) setSelectedPath(menu.path);
    }
    setRenameOpen(false);
    showSnack('Đã đổi tên.');
  }, [menu, renameValue, tree, vocabMap, selectedPath, updateTree, updateVocabMap]);

  const startNewSubfolder = useCallback(() => {
    if (!menu) return;
    const targetPath = menu.type === 'folder' ? menu.path : menu.path.slice(0, -1); // parent folder if file
    const located = findNodeByPath(tree, targetPath);
    if (!located || located.node.kind !== 'folder') return;
    setNewFolderName('Thư mục mới');
    setNewFolderOpen(true);
  }, [menu, tree]);

  const confirmNewSubfolder = useCallback(() => {
    if (!menu) return;
    const targetPath = menu.type === 'folder' ? menu.path : menu.path.slice(0, -1);
    updateTree((prevTree) => {
      const copy = structuredClone(prevTree);
      const located = findNodeByPath(copy, targetPath);
      if (!located || located.node.kind !== 'folder') return prevTree;
      const name = ensureUniqueName(located.node.children, newFolderName.trim() || 'Thư mục mới', true);
      located.node.children.push({ kind: 'folder', label: name, id: genId(), children: [] });
      return copy;
    });
    setNewFolderOpen(false);
    showSnack('Đã tạo thư mục con.');
  }, [menu, newFolderName, updateTree]);

  const startNewFile = useCallback(() => {
    if (!menu) return;
    const targetPath = menu.type === 'folder' ? menu.path : menu.path.slice(0, -1); // parent folder if file
    const located = findNodeByPath(tree, targetPath);
    if (!located || located.node.kind !== 'folder') return;
    setNewFileName('từ_vựng_mới.txt');
    setNewFileOpen(true);
  }, [menu, tree]);

  const confirmNewFile = useCallback(() => {
    if (!menu) return;
    const targetPath = menu.type === 'folder' ? menu.path : menu.path.slice(0, -1);
    const fileName = newFileName.trim() || 'từ_vựng_mới.txt';
    // Ensure .txt extension
    let baseFileName = fileName.endsWith('.txt') ? fileName : `${fileName}.txt`;
    
    // Get current tree to determine unique file name
    const located = findNodeByPath(tree, targetPath);
    if (!located || located.node.kind !== 'folder') {
      showSnack('Không tìm thấy thư mục đích.', 'error');
      return;
    }
    const finalFileName = ensureUniqueName(located.node.children, baseFileName, false);
    
    updateTree((prevTree) => {
      const copy = structuredClone(prevTree);
      const located2 = findNodeByPath(copy, targetPath);
      if (!located2 || located2.node.kind !== 'folder') return prevTree;
      const fileNode: FileLeaf = { kind: 'file', name: finalFileName, id: genId() };
      located2.node.children.push(fileNode);
      return copy;
    });
    
    // Create empty vocab array for the new file
    updateVocabMap((m) => ({ ...m, [finalFileName]: [] }));
    
    setNewFileOpen(false);
    setNewFileName('');
    showSnack(`Đã tạo file "${finalFileName}".`);
  }, [menu, newFileName, tree, updateTree, updateVocabMap]);

  const startImport = useCallback(() => {
    if (!menu) return;
    fileInputRef.current?.click();
  }, [menu]);

  const handleImportFile = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = '';
      if (!file || !menu) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const text = String(reader.result || '');
          // parse CSV lines: word,type,vnMeaning,pronunciation
          const items: VocabItem[] = text
            .split(/\r?\n/) // ✅ đừng xuống dòng giữa / và /
            .map((l) => l.trim())
            .filter(Boolean)
            .map((l) => {
              const [word, type, vnMeaning, pronunciation] = l.split(',').map((s) => (s ?? '').trim());
              return { word, type, vnMeaning, pronunciation } as VocabItem;
            })
            .filter((it) => it.word);

          const targetFolderPath = menu.type === 'folder' ? menu.path : menu.path.slice(0, -1);
          const base = file.name;
          // Get current tree to determine final file name
          const located = findNodeByPath(tree, targetFolderPath);
          if (!located || located.node.kind !== 'folder') {
            showSnack('Không tìm thấy thư mục đích.', 'error');
            return;
          }
          const finalFileName = ensureUniqueName(located.node.children, base, false);
          
          updateTree((prevTree) => {
            const copy = structuredClone(prevTree);
            const located2 = findNodeByPath(copy, targetFolderPath);
            if (!located2 || located2.node.kind !== 'folder') return prevTree;
            const fileNode: FileLeaf = { kind: 'file', name: finalFileName, id: genId() };
            located2.node.children.push(fileNode);
            return copy;
          });
          updateVocabMap((m) => ({ ...m, [finalFileName]: items.length ? items : (m[finalFileName] || []) }));
          showSnack(`Đã nhập tệp \"${finalFileName}\".`);
        } catch (err) {
          console.error(err);
          showSnack('Không thể đọc tệp.', 'error');
        }
      };
      reader.readAsText(file);
    },
    [menu, tree],
  );

  const handleExportFile = useCallback(() => {
    if (!menu || menu.type !== 'file') return;
    const located = findNodeByPath(tree, menu.path);
    if (!located || located.node.kind !== 'file') return;
    
    const fileName = located.node.name;
    const items = vocabMap[fileName] || [];
    
    if (items.length === 0) {
      showSnack('File không có từ vựng để export.', 'warning');
      return;
    }
    
    // Convert to CSV format: word,type,vnMeaning,pronunciation
    const csvContent = items
      .map((item) => {
        const word = item.word || '';
        const type = item.type || '';
        const vnMeaning = item.vnMeaning || '';
        const pronunciation = item.pronunciation || '';
        return `${word},${type},${vnMeaning},${pronunciation}`;
      })
      .join('\n');
    
    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    showSnack(`Đã export tệp \"${fileName}\".`);
    closeMenu();
  }, [menu, tree, vocabMap, closeMenu]);

  const doCopy = useCallback(() => {
    if (!menu) return;
    const located = findNodeByPath(tree, menu.path);
    if (!located) return;
    setClip({ mode: 'copy', node: cloneNode(located.node) });
    showSnack('Đã sao chép.');
    closeMenu();
  }, [menu, tree, closeMenu]);

  // Cut: XÓA NGAY tại vị trí cũ và đưa vào clipboard
  const doCut = useCallback(() => {
    if (!menu) return;
    const located = findNodeByPath(tree, menu.path);
    if (!located) return;
    const res = removeAtPath(tree, menu.path);
    if (!res.removed) return;
    updateTree(() => res.newRoot);
    // nếu đang chọn trong phần bị cắt, bỏ chọn
    if (selectedPath && (selectedPath.join('/') === menu.path.join('/') || isDescendant(menu.path, selectedPath))) {
      setSelectedPath(null);
    }
    setClip({ mode: 'cut', node: res.removed });
    showSnack('Đã cắt. Hãy chọn thư mục đích và Dán.');
    closeMenu();
  }, [menu, tree, selectedPath, closeMenu, updateTree]);

  const doPaste = useCallback(() => {
    if (!menu || !clip) return;
    const targetFolderPath = menu.type === 'folder' ? menu.path : menu.path.slice(0, -1);
    
    updateTree((prevTree) => {
      // paste vào thư mục
      const copyRoot = structuredClone(prevTree);
      const target = findNodeByPath(copyRoot, targetFolderPath);
      if (!target || target.node.kind !== 'folder') return prevTree;

      let toInsert: FolderNode | FileLeaf = clip.mode === 'copy' ? cloneNode(clip.node) : clip.node;

      // ensure unique name among siblings
      const siblings = target.node.children;
      if (toInsert.kind === 'folder') {
        (toInsert as FolderNode).label = ensureUniqueName(siblings, (toInsert as FolderNode).label, true);
      } else {
        const oldName = (toInsert as FileLeaf).name;
        const newName = ensureUniqueName(siblings, oldName, false);
        if (newName !== oldName && vocabMap[oldName]) {
          if (clip.mode === 'copy') {
            updateVocabMap((m) => ({ ...m, [newName]: structuredClone(m[oldName]) }));
          } else {
            updateVocabMap((m) => {
              const { [oldName]: vals, ...rest } = m;
              return { ...rest, [newName]: vals };
            });
          }
        }
        (toInsert as FileLeaf).name = newName;
      }

      target.node.children.push(toInsert);
      return copyRoot;
    });
    
    setClip(null);
    showSnack('Đã dán.');
    closeMenu();
  }, [menu, clip, tree, vocabMap, closeMenu, updateTree, updateVocabMap]);

  // Delete: mở confirm cho file / folder
  const startDelete = useCallback(() => {
    if (!menu) return;
    const located = findNodeByPath(tree, menu.path);
    if (!located) return;
    const label = located.node.kind === 'folder' ? located.node.label : located.node.name;
    const fileNames = gatherFileNames(located.node);
    setPendingDelete({ path: menu.path, type: menu.type, label, fileNames });
    setConfirmOpen(true);
  }, [menu, tree]);

  const confirmDelete = useCallback(() => {
    if (!pendingDelete) return;
    const res = removeAtPath(tree, pendingDelete.path);
    if (!res.removed) return;
    updateTree(() => res.newRoot);
    // clear selection if needed
    if (selectedPath && (selectedPath.join('/') === pendingDelete.path.join('/') || isDescendant(pendingDelete.path, selectedPath))) {
      setSelectedPath(null);
    }
    // remove vocab contents for files under deleted node
    if (pendingDelete.fileNames.length) {
      updateVocabMap((m) => {
        const next = { ...m } as Record<string, VocabItem[]>;
        for (const nm of pendingDelete.fileNames) delete next[nm];
        return next;
      });
    }
    setConfirmOpen(false);
    setPendingDelete(null);
    showSnack('Đã xoá.');
  }, [pendingDelete, tree, selectedPath, updateTree, updateVocabMap]);

  // ===== Render =====
  return (
    <Box
      sx={{
        height: '100vh',
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
      }}
    >
      {/* Hidden file input for Import */}
      <input ref={fileInputRef} type="file" accept=".txt,text/plain" hidden onChange={handleImportFile} />

      {/* Sidebar */}
      <Paper
        elevation={0}
        sx={{
          width: {
            xs: sidebarOpen ? '100%' : 0,
            md: sidebarOpen ? sidebarWidth : 0,
          },
          flexShrink: 0,
          borderRight: { xs: 'none', md: `1px solid ${theme.palette.divider}` },
          borderBottom: { xs: `1px solid ${theme.palette.divider}`, md: 'none' },
          height: { xs: '40vh', sm: '45vh', md: '100%' },
          borderRadius: 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          transition: theme.transitions.create(['width'], {
            duration: theme.transitions.duration.standard,
            easing: theme.transitions.easing.easeInOut,
          }),
        }}
      >
        {sidebarOpen && (
          <>
            <Box sx={{ px: 2, pt: 3, pb: 2, flexShrink: 0 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <MenuBookIcon color="primary" sx={{ mr: 1 }} />
                  <Typography variant={isSmDown ? 'subtitle1' : 'h6'} sx={{ fontWeight: 600 }}>
                    Kho từ vựng
                  </Typography>
                </Box>
                <Stack direction="row" spacing={0.5}>
                  <Tooltip title="Thu gọn tất cả" arrow>
                    <IconButton
                      size="small"
                      onClick={collapseAll}
                      sx={{ ml: 1 }}
                      aria-label="Thu gọn tất cả"
                    >
                      <UnfoldLessIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  {!isMdDown && (
                    <Tooltip title="Ẩn kho từ vựng" arrow>
                      <IconButton
                        size="small"
                        onClick={toggleSidebar}
                        sx={{ ml: 0.5 }}
                        aria-label="Ẩn kho từ vựng"
                      >
                        <ChevronLeftIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                </Stack>
              </Box>
              <Divider sx={{ mb: 0 }} />
            </Box>

            <Box sx={{ flex: 1, overflowY: 'auto', px: 2, pt: 0 }}>
              <List>
                <FolderItem
                  node={tree}
                  onFileClick={handleFileClick}
                  onContext={openContext}
                  path={[tree.id]}
                  forceShowMenu={isMdDown}
                  isFolderOpen={isFolderOpen}
                  onToggle={handleFolderToggle}
                />
              </List>
            </Box>
          </>
        )}
      </Paper>

      {/* Toggle button when sidebar is closed (desktop only) */}
      {!sidebarOpen && !isMdDown && (
        <Box
          sx={{
            position: 'fixed',
            left: 'var(--nav-w, 240px)',
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: 1200,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <Tooltip title="Hiển thị kho từ vựng" arrow placement="right">
            <IconButton
              onClick={toggleSidebar}
              sx={{
                backgroundColor: theme.palette.background.paper,
                color: theme.palette.primary.main,
                border: `2px solid ${theme.palette.primary.main}`,
                borderLeft: 'none',
                borderRadius: '0 8px 8px 0',
                boxShadow: theme.shadows[4],
                width: 40,
                height: 60,
                '&:hover': {
                  backgroundColor: theme.palette.primary.main,
                  color: theme.palette.primary.contrastText,
                  boxShadow: theme.shadows[8],
                  transform: 'translateX(2px)',
                },
                transition: theme.transitions.create(['background-color', 'transform', 'box-shadow'], {
                  duration: theme.transitions.duration.shorter,
                }),
              }}
              aria-label="Hiển thị kho từ vựng"
            >
              <ChevronRightIcon />
            </IconButton>
          </Tooltip>
        </Box>
      )}

      {/* Content */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          height: { xs: '60vh', sm: '55vh', md: '100%' },
          position: 'relative',
        }}
      >
        <Box sx={{ px: 3, pt: 2.5, pb: 2, flexShrink: 0 }}>
          {selectedFile ? (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <CategoryIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant={isSmDown ? 'h6' : 'h5'} sx={{ fontWeight: 600 }}>
                  {selectedTitle}
                </Typography>
              </Box>
              <Stack direction="row" spacing={1}>
                {selectedVocabs.size > 0 && (
                  <Button
                    variant="outlined"
                    color="error"
                    size={isSmDown ? 'small' : 'medium'}
                    startIcon={<DeleteIcon />}
                    onClick={handleDeleteSelectedVocabs}
                  >
                    Xóa đã chọn ({selectedVocabs.size})
                  </Button>
                )}
                <Button
                  variant="contained"
                  size={isSmDown ? 'small' : 'medium'}
                  startIcon={<AddIcon />}
                  onClick={openAddVocabForm}
                >
                  Thêm từ vựng
                </Button>
              </Stack>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <CategoryIcon color="primary" sx={{ mr: 1 }} />
              <Typography variant={isSmDown ? 'h6' : 'h5'} sx={{ fontWeight: 600 }}>
                Từ vựng
              </Typography>
            </Box>
          )}
        </Box>

        <Box sx={{ flex: 1, overflowY: 'auto', px: { xs: 2, md: 3 }, pb: { xs: 2, md: 3 } }}>
          {selectedFile ? (
            <Paper elevation={0} sx={{ border: `1px solid ${theme.palette.divider}` }}>
              <TableContainer sx={{ maxHeight: { xs: '50vh', md: 'unset' } }}>
                <Table aria-label="vocabulary table" stickyHeader={isMdDown} size={isSmDown ? 'small' : 'medium'} sx={{ minWidth: 650 }}>
                  <TableHead>
                    <TableRow>
                      <StyledTableCell padding="checkbox">
                        <Checkbox
                          indeterminate={selectedVocabs.size > 0 && selectedVocabs.size < (vocabMap[selectedFile.name] || []).length}
                          checked={(vocabMap[selectedFile.name] || []).length > 0 && selectedVocabs.size === (vocabMap[selectedFile.name] || []).length}
                          onChange={handleSelectAllVocabs}
                          size={isSmDown ? 'small' : 'medium'}
                        />
                      </StyledTableCell>
                      <StyledTableCell>Từ vựng</StyledTableCell>
                      <StyledTableCell>Nghĩa tiếng Việt</StyledTableCell>
                      <StyledTableCell>Từ loại</StyledTableCell>
                      <StyledTableCell>Phát âm</StyledTableCell>
                      <StyledTableCell align="center">Hành động</StyledTableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(vocabMap[selectedFile.name] || []).map((item, index) => (
                      <StyledTableRow key={item.word} hover>
                        <StyledTableCell padding="checkbox">
                          <Checkbox
                            checked={selectedVocabs.has(item.word)}
                            onChange={() => handleToggleVocabSelection(item.word)}
                            size={isSmDown ? 'small' : 'medium'}
                          />
                        </StyledTableCell>
                        <StyledTableCell 
                          sx={{ fontWeight: 500, whiteSpace: 'nowrap', cursor: 'pointer' }}
                          onClick={() => openEditVocabForm(item, index)}
                        >
                          {item.word}
                        </StyledTableCell>
                        <StyledTableCell 
                          sx={{ wordBreak: 'break-word', cursor: 'pointer' }}
                          onClick={() => openEditVocabForm(item, index)}
                        >
                          {item.vnMeaning}
                        </StyledTableCell>
                        <StyledTableCell 
                          sx={{ cursor: 'pointer' }}
                          onClick={() => openEditVocabForm(item, index)}
                        >
                          <Box
                            component="span"
                            sx={{
                              px: 1,
                              py: 0.5,
                              bgcolor: 'grey.100',
                              borderRadius: 1,
                              fontSize: 12,
                              color: 'grey.800',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {item.type}
                          </Box>
                        </StyledTableCell>
                        <StyledTableCell 
                          sx={{ whiteSpace: 'nowrap', cursor: 'pointer' }}
                          onClick={() => openEditVocabForm(item, index)}
                        >
                          / {item.pronunciation} /
                        </StyledTableCell>
                        <StyledTableCell align="center">
                          <Stack direction="row" spacing={0.5} justifyContent="center">
                            <Tooltip title="Sửa" arrow>
                              <IconButton
                                size={isSmDown ? 'small' : 'medium'}
                                onClick={() => openEditVocabForm(item, index)}
                                sx={{ '&:hover': { backgroundColor: 'primary.light', color: 'primary.main' } }}
                                aria-label={`Edit ${item.word}`}
                              >
                                <EditIcon fontSize={isSmDown ? 'small' : 'medium'} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Phát âm" arrow>
                              <IconButton
                                size={isSmDown ? 'small' : 'medium'}
                                onClick={() => speak(item.word)}
                                sx={{ '&:hover': { backgroundColor: 'primary.light', color: 'primary.main' } }}
                                aria-label={`Speak ${item.word}`}
                              >
                                <VolumeUpIcon fontSize={isSmDown ? 'small' : 'medium'} />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        </StyledTableCell>
                      </StyledTableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          ) : (
            <Box
              sx={{
                height: '100%',
                minHeight: 240,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                px: 2,
              }}
            >
              <FileIcon sx={{ fontSize: 56, color: 'grey.400', mb: 1.5 }} />
              <Typography variant={isSmDown ? 'subtitle1' : 'h6'} color="text.secondary" sx={{ mb: 1 }}>
                Chưa có tệp nào được chọn
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Vui lòng chọn một tệp từ danh sách bên trái để xem nội dung
              </Typography>
            </Box>
          )}
        </Box>
      </Box>

      {/* Context Menu */}
      <Menu
        open={Boolean(menu)}
        onClose={closeMenu}
        anchorReference="anchorPosition"
        anchorPosition={menu ? { top: menu.mouseY, left: menu.mouseX } : undefined}
      >
        {menu?.type === 'folder' ? (
          <>
            <MenuItem onClick={startNewSubfolder}>
              <ListItemIcon><NewFolderIcon fontSize="small" /></ListItemIcon>
              <ListItemText>Tạo thư mục con</ListItemText>
            </MenuItem>
            <MenuItem onClick={startNewFile}>
              <ListItemIcon><FileIcon fontSize="small" /></ListItemIcon>
              <ListItemText>Tạo file</ListItemText>
            </MenuItem>
            <MenuItem onClick={startImport}>
              <ListItemIcon><ImportIcon fontSize="small" /></ListItemIcon>
              <ListItemText>Import file (.txt)</ListItemText>
            </MenuItem>
            <Divider />
            <MenuItem onClick={startRename}>
              <ListItemIcon><RenameIcon fontSize="small" /></ListItemIcon>
              <ListItemText>Đổi tên</ListItemText>
            </MenuItem>
            <MenuItem onClick={doCut}>
              <ListItemIcon><CutIcon fontSize="small" /></ListItemIcon>
              <ListItemText>Cắt</ListItemText>
            </MenuItem>
            <MenuItem onClick={doCopy}>
              <ListItemIcon><CopyIcon fontSize="small" /></ListItemIcon>
              <ListItemText>Sao chép</ListItemText>
            </MenuItem>
            <MenuItem disabled={!clip} onClick={doPaste}>
              <ListItemIcon><PasteIcon fontSize="small" /></ListItemIcon>
              <ListItemText>Dán</ListItemText>
            </MenuItem>
            <Divider />
            <MenuItem onClick={startDelete}>
              <ListItemIcon><DeleteIcon fontSize="small" /></ListItemIcon>
              <ListItemText>Xoá thư mục</ListItemText>
            </MenuItem>
          </>
        ) : (
          <>
            <MenuItem onClick={handleExportFile}>
              <ListItemIcon><ExportIcon fontSize="small" /></ListItemIcon>
              <ListItemText>Export file (.txt)</ListItemText>
            </MenuItem>
            <Divider />
            <MenuItem onClick={startRename}>
              <ListItemIcon><RenameIcon fontSize="small" /></ListItemIcon>
              <ListItemText>Đổi tên</ListItemText>
            </MenuItem>
            <MenuItem onClick={doCut}>
              <ListItemIcon><CutIcon fontSize="small" /></ListItemIcon>
              <ListItemText>Cắt</ListItemText>
            </MenuItem>
            <MenuItem onClick={doCopy}>
              <ListItemIcon><CopyIcon fontSize="small" /></ListItemIcon>
              <ListItemText>Sao chép</ListItemText>
            </MenuItem>
            <Divider />
            <MenuItem onClick={startDelete}>
              <ListItemIcon><DeleteIcon fontSize="small" /></ListItemIcon>
              <ListItemText>Xoá file</ListItemText>
            </MenuItem>
          </>
        )}
      </Menu>

      {/* Rename dialog */}
      <Dialog open={renameOpen} onClose={() => setRenameOpen(false)}>
        <DialogTitle>Đổi tên</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            margin="dense"
            label="Tên"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') confirmRename();
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRenameOpen(false)}>Hủy</Button>
          <Button variant="contained" onClick={confirmRename}>Lưu</Button>
        </DialogActions>
      </Dialog>

      {/* New subfolder dialog */}
      <Dialog open={newFolderOpen} onClose={() => setNewFolderOpen(false)}>
        <DialogTitle>Tạo thư mục con</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            margin="dense"
            label="Tên thư mục"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') confirmNewSubfolder();
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewFolderOpen(false)}>Hủy</Button>
          <Button variant="contained" onClick={confirmNewSubfolder}>Tạo</Button>
        </DialogActions>
      </Dialog>

      {/* New file dialog */}
      <Dialog open={newFileOpen} onClose={() => setNewFileOpen(false)}>
        <DialogTitle>Tạo file từ vựng mới</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            margin="dense"
            label="Tên file"
            value={newFileName}
            onChange={(e) => setNewFileName(e.target.value)}
            placeholder="từ_vựng_mới.txt"
            helperText="File sẽ có phần mở rộng .txt tự động nếu chưa có"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newFileName.trim()) confirmNewFile();
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewFileOpen(false)}>Hủy</Button>
          <Button variant="contained" onClick={confirmNewFile} disabled={!newFileName.trim()}>
            Tạo
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirm delete dialog */}
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle>Xác nhận xoá</DialogTitle>
        <DialogContent>
          <Typography>Bạn có chắc muốn xoá <b>{pendingDelete?.label}</b>{pendingDelete?.type === 'folder' ? ' và toàn bộ nội dung bên trong' : ''}?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>Hủy</Button>
          <Button color="error" variant="contained" onClick={confirmDelete}>Xoá</Button>
        </DialogActions>
      </Dialog>

      {/* Vocab form dialog */}
      <Dialog open={vocabFormOpen} onClose={() => setVocabFormOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{vocabFormMode === 'add' ? 'Thêm từ vựng' : 'Sửa từ vựng'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              autoFocus
              fullWidth
              label="Từ vựng *"
              value={vocabFormData.word}
              onChange={(e) => setVocabFormData((prev) => ({ ...prev, word: e.target.value }))}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && vocabFormData.word.trim()) {
                  handleSaveVocab();
                }
              }}
            />
            <TextField
              fullWidth
              label="Nghĩa tiếng Việt"
              value={vocabFormData.vnMeaning}
              onChange={(e) => setVocabFormData((prev) => ({ ...prev, vnMeaning: e.target.value }))}
            />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <FormControl fullWidth>
                <InputLabel>Từ loại</InputLabel>
                <Select
                  value={vocabFormData.type}
                  label="Từ loại"
                  onChange={(e) => setVocabFormData((prev) => ({ ...prev, type: e.target.value }))}
                >
                  <MenuItem value="">
                    <em>Chọn loại từ</em>
                  </MenuItem>
                  {WORD_TYPES.map((type) => (
                    <MenuItem key={type.value} value={type.value}>
                      {type.label}
                    </MenuItem>
                  ))}
                </Select>
                <FormHelperText>Chọn loại từ trong tiếng Anh</FormHelperText>
              </FormControl>
              <TextField
                fullWidth
                label="Phát âm"
                value={vocabFormData.pronunciation}
                onChange={(e) => setVocabFormData((prev) => ({ ...prev, pronunciation: e.target.value }))}
                placeholder="ˈæp.əl"
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setVocabFormOpen(false)}>Hủy</Button>
          <Button variant="contained" onClick={handleSaveVocab} disabled={!vocabFormData.word.trim()}>
            {vocabFormMode === 'add' ? 'Thêm' : 'Lưu'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snack.open}
        autoHideDuration={2200}
        onClose={() => setSnack((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snack.sev} variant="filled" sx={{ width: '100%' }}>
          {snack.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ManagerFile;
