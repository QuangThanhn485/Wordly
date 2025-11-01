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
  CreateNewFolder as NewFolderIcon,
  DeleteOutline as DeleteIcon,
  MoreVert as MoreIcon,
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
}: {
  node: FolderNode;
  level?: number;
  onFileClick: (filePath: string[], fileName: string) => void;
  onContext: (type: 'folder' | 'file', path: string[], event: React.MouseEvent) => void;
  path: string[]; // ids from root to this node
  forceShowMenu?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const handleToggle = useCallback(() => setOpen((v) => !v), []);

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

// ===== Main =====
const ManagerFile: React.FC = () => {
  const [vocabMap, setVocabMap] = useState<Record<string, VocabItem[]>>(() => ({ ...seedVocab }));
  const [tree, setTree] = useState<FolderNode>(() => ({
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
  }));

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
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<null | { path: string[]; type: 'folder' | 'file'; label: string; fileNames: string[] }>(null);
  const [snack, setSnack] = useState<{ open: boolean; msg: string; sev: 'success' | 'info' | 'warning' | 'error' }>(
    { open: false, msg: '', sev: 'success' },
  );

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const showSnack = (msg: string, sev: 'success' | 'info' | 'warning' | 'error' = 'success') =>
    setSnack({ open: true, msg, sev });

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

    const copy = structuredClone(tree);
    const located2 = findNodeByPath(copy, menu.path)!;
    if (menu.type === 'folder' && located2.node.kind === 'folder') (located2.node as FolderNode).label = finalName;
    else if (menu.type === 'file' && located2.node.kind === 'file') (located2.node as FileLeaf).name = finalName;
    setTree(copy);
    // also if file renamed, move vocab content key
    if (menu.type === 'file' && located.node.kind === 'file') {
      const old = located.node.name;
      if (vocabMap[old]) {
        setVocabMap((m) => {
          const { [old]: vals, ...rest } = m;
          return { ...rest, [finalName]: vals };
        });
      }
      if (selectedPath && selectedPath.join('/') === menu.path.join('/')) setSelectedPath(menu.path);
    }
    setRenameOpen(false);
    showSnack('Đã đổi tên.');
  }, [menu, renameValue, tree, vocabMap, selectedPath]);

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
    const copy = structuredClone(tree);
    const located = findNodeByPath(copy, targetPath);
    if (!located || located.node.kind !== 'folder') return;
    const name = ensureUniqueName(located.node.children, newFolderName.trim() || 'Thư mục mới', true);
    located.node.children.push({ kind: 'folder', label: name, id: genId(), children: [] });
    setTree(copy);
    setNewFolderOpen(false);
    showSnack('Đã tạo thư mục con.');
  }, [menu, newFolderName, tree]);

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
          const copy = structuredClone(tree);
          const located = findNodeByPath(copy, targetFolderPath);
          if (!located || located.node.kind !== 'folder') return;
          const base = file.name;
          const finalName = ensureUniqueName(located.node.children, base, false);
          const fileNode: FileLeaf = { kind: 'file', name: finalName, id: genId() };
          located.node.children.push(fileNode);
          setTree(copy);
          setVocabMap((m) => ({ ...m, [finalName]: items.length ? items : (m[base] || []) }));
          showSnack(`Đã nhập tệp \"${finalName}\".`);
        } catch (err) {
          console.error(err);
          showSnack('Không thể đọc tệp.', 'error');
        }
      };
      reader.readAsText(file);
    },
    [menu, tree],
  );

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
    setTree(res.newRoot);
    // nếu đang chọn trong phần bị cắt, bỏ chọn
    if (selectedPath && (selectedPath.join('/') === menu.path.join('/') || isDescendant(menu.path, selectedPath))) {
      setSelectedPath(null);
    }
    setClip({ mode: 'cut', node: res.removed });
    showSnack('Đã cắt. Hãy chọn thư mục đích và Dán.');
    closeMenu();
  }, [menu, tree, selectedPath, closeMenu]);

  const doPaste = useCallback(() => {
    if (!menu || !clip) return;
    const targetFolderPath = menu.type === 'folder' ? menu.path : menu.path.slice(0, -1);
    // paste vào thư mục
    const copyRoot = structuredClone(tree);
    const target = findNodeByPath(copyRoot, targetFolderPath);
    if (!target || target.node.kind !== 'folder') return;

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
          setVocabMap((m) => ({ ...m, [newName]: structuredClone(m[oldName]) }));
        } else {
          setVocabMap((m) => {
            const { [oldName]: vals, ...rest } = m;
            return { ...rest, [newName]: vals };
          });
        }
      }
      (toInsert as FileLeaf).name = newName;
    }

    target.node.children.push(toInsert);
    setTree(copyRoot);
    setClip(null);
    showSnack('Đã dán.');
    closeMenu();
  }, [menu, clip, tree, vocabMap, closeMenu]);

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
    setTree(res.newRoot);
    // clear selection if needed
    if (selectedPath && (selectedPath.join('/') === pendingDelete.path.join('/') || isDescendant(pendingDelete.path, selectedPath))) {
      setSelectedPath(null);
    }
    // remove vocab contents for files under deleted node
    if (pendingDelete.fileNames.length) {
      setVocabMap((m) => {
        const next = { ...m } as Record<string, VocabItem[]>;
        for (const nm of pendingDelete.fileNames) delete next[nm];
        return next;
      });
    }
    setConfirmOpen(false);
    setPendingDelete(null);
    showSnack('Đã xoá.');
  }, [pendingDelete, tree, selectedPath]);

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
          width: { xs: '100%', md: sidebarWidth },
          flexShrink: 0,
          borderRight: { xs: 'none', md: `1px solid ${theme.palette.divider}` },
          borderBottom: { xs: `1px solid ${theme.palette.divider}`, md: 'none' },
          height: { xs: '40vh', sm: '45vh', md: '100%' },
          borderRadius: 0,
          display: 'flex',
          flexDirection: 'column',
          transition: theme.transitions.create(['width', 'height'], {
            duration: theme.transitions.duration.standard,
            easing: theme.transitions.easing.easeInOut,
          }),
        }}
      >
        <Box sx={{ px: 2, pt: 3, pb: 2, flexShrink: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <MenuBookIcon color="primary" sx={{ mr: 1 }} />
            <Typography variant={isSmDown ? 'subtitle1' : 'h6'} sx={{ fontWeight: 600 }}>
              Kho từ vựng
            </Typography>
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
            />
          </List>
        </Box>
      </Paper>

      {/* Content */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          height: { xs: '60vh', sm: '55vh', md: '100%' },
        }}
      >
        <Box sx={{ px: 3, pt: 2.5, pb: 2, flexShrink: 0 }}>
          {selectedFile ? (
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <CategoryIcon color="primary" sx={{ mr: 1 }} />
              <Typography variant={isSmDown ? 'h6' : 'h5'} sx={{ fontWeight: 600 }}>
                {selectedTitle}
              </Typography>
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
                      <StyledTableCell>Từ vựng</StyledTableCell>
                      <StyledTableCell>Nghĩa tiếng Việt</StyledTableCell>
                      <StyledTableCell>Từ loại</StyledTableCell>
                      <StyledTableCell>Phát âm</StyledTableCell>
                      <StyledTableCell align="center">Nghe</StyledTableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(vocabMap[selectedFile.name] || []).map((item) => (
                      <StyledTableRow key={item.word} hover>
                        <StyledTableCell sx={{ fontWeight: 500, whiteSpace: 'nowrap' }}>{item.word}</StyledTableCell>
                        <StyledTableCell sx={{ wordBreak: 'break-word' }}>{item.vnMeaning}</StyledTableCell>
                        <StyledTableCell>
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
                        <StyledTableCell sx={{ whiteSpace: 'nowrap' }}>/ {item.pronunciation} /</StyledTableCell>
                        <StyledTableCell align="center">
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
            <MenuItem onClick={startDelete}>
              <ListItemIcon><DeleteIcon fontSize="small" /></ListItemIcon>
              <ListItemText>Xoá file</ListItemText>
            </MenuItem>
            <MenuItem onClick={doCut}>
              <ListItemIcon><CutIcon fontSize="small" /></ListItemIcon>
              <ListItemText>Cắt</ListItemText>
            </MenuItem>
            <MenuItem onClick={doCopy}>
              <ListItemIcon><CopyIcon fontSize="small" /></ListItemIcon>
              <ListItemText>Sao chép</ListItemText>
            </MenuItem>
            <MenuItem onClick={startRename}>
              <ListItemIcon><RenameIcon fontSize="small" /></ListItemIcon>
              <ListItemText>Đổi tên</ListItemText>
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
