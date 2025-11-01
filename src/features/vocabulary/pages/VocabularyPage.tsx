import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  Box,
  Typography,
  List,
  ListItemText,
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
  Button,
  Snackbar,
  Alert,
  Checkbox,
  Stack,
} from '@mui/material';
import {
  InsertDriveFile as FileIcon,
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
  Add as AddIcon,
  Edit as EditIcon,
  UnfoldLess as UnfoldLessIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
} from '@mui/icons-material';

// Import types
import type { VocabItem, FolderNode, FileLeaf, SnackState } from '../types';

// Import constants
import { TOTAL_LEFT_BAND } from '../constants/wordTypes';
import { seedVocab, getDefaultTree } from '../constants/seedData';

// Import utilities
import {
  genId,
  cloneNode,
  findNodeByPath,
  isDescendant,
  ensureUniqueName,
  getAllFileNames,
  removeAtPath,
} from '../utils/treeUtils';
import {
  saveVocabToStorage,
  loadVocabFromStorage,
  saveTreeToStorage,
  loadTreeFromStorage,
} from '../utils/storageUtils';
import { speak } from '../utils/speechUtils';

// Import components
import { FolderItem } from '../components/FolderTree';
import {
  RenameDialog,
  NewFolderDialog,
  NewFileDialog,
  ConfirmDeleteDialog,
  VocabFormDialog,
} from '../components/dialogs';

// ===== Styled Components =====
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

// ===== Main Component =====
const VocabularyPage: React.FC = () => {
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
  const [snack, setSnack] = useState<SnackState>({ open: false, msg: '', sev: 'success' });

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
            .split(/\r?\n/)
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
          showSnack(`Đã nhập tệp "${finalFileName}".`);
        } catch (err) {
          console.error(err);
          showSnack('Không thể đọc tệp.', 'error');
        }
      };
      reader.readAsText(file);
    },
    [menu, tree, updateTree, updateVocabMap],
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
    
    showSnack(`Đã export tệp "${fileName}".`);
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
  }, [menu, clip, vocabMap, closeMenu, updateTree, updateVocabMap]);

  // Delete: mở confirm cho file / folder
  const startDelete = useCallback(() => {
    if (!menu) return;
    const located = findNodeByPath(tree, menu.path);
    if (!located) return;
    const label = located.node.kind === 'folder' ? located.node.label : located.node.name;
    const fileNames = getAllFileNames(located.node);
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

      {/* Dialogs */}
      <RenameDialog
        open={renameOpen}
        value={renameValue}
        onChange={setRenameValue}
        onClose={() => setRenameOpen(false)}
        onConfirm={confirmRename}
      />

      <NewFolderDialog
        open={newFolderOpen}
        value={newFolderName}
        onChange={setNewFolderName}
        onClose={() => setNewFolderOpen(false)}
        onConfirm={confirmNewSubfolder}
      />

      <NewFileDialog
        open={newFileOpen}
        value={newFileName}
        onChange={setNewFileName}
        onClose={() => setNewFileOpen(false)}
        onConfirm={confirmNewFile}
      />

      <ConfirmDeleteDialog
        open={confirmOpen}
        type={pendingDelete?.type || 'file'}
        label={pendingDelete?.label || ''}
        onClose={() => setConfirmOpen(false)}
        onConfirm={confirmDelete}
      />

      <VocabFormDialog
        open={vocabFormOpen}
        mode={vocabFormMode}
        data={vocabFormData}
        onChange={setVocabFormData}
        onClose={() => setVocabFormOpen(false)}
        onSave={handleSaveVocab}
      />

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

export default VocabularyPage;
 
