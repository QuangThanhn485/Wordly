import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  FileText as FileIcon,
  Volume2 as VolumeUpIcon,
  BookOpen as MenuBookIcon,
  FolderTree as CategoryIcon,
  Edit3 as RenameIcon,
  Copy as CopyIcon,
  Scissors as CutIcon,
  Clipboard as PasteIcon,
  Upload as ImportIcon,
  Download as ExportIcon,
  FolderPlus as NewFolderIcon,
  Trash2 as DeleteIcon,
  Plus as AddIcon,
  Edit as EditIcon,
  MoreVertical as MoreVertIcon,
  ChevronsUp as UnfoldLessIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  List as ViewListIcon,
  Grid3x3 as ViewModuleIcon,
  Rocket as RocketLaunchIcon,
  ArrowLeft as ArrowBackIcon,
} from 'lucide-react';

// Import types
import type { VocabItem, FolderNode, FileLeaf, SnackState } from '../types';

// Import constants
import { TOTAL_LEFT_BAND } from '../constants/wordTypes';
import { getDefaultTree } from '../constants/seedData';

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
import { TreeIndex } from '../utils/treeIndex';
import {
  saveVocabFile,
  loadVocabFile,
  deleteVocabFile,
  loadVocabCounts,
  renameVocabCount,
  saveTreeToStorage,
  loadTreeFromStorage,
  syncAllVocabCounts,
} from '../utils/storageUtils';
import { speak } from '@/utils/speechUtils';
import { saveTrainingSession as saveReadingSession } from '@/features/train/train-start/sessionStorage';
import { saveTrainingSession as saveListeningSession } from '@/features/train/train-listen/sessionStorage';
import { saveTrainingSession as saveReadWriteSession } from '@/features/train/train-read-write/sessionStorage';
import { saveTrainingSession as saveListenWriteSession } from '@/features/train/train-listen-write/sessionStorage';

// Import components
import { FolderItem } from '../components/FolderTree';
import { type BreadcrumbItem } from '../components/FolderGrid';
import { FolderGridModal } from '../components/FolderGridModal';
import { removeFileExtension } from '@/utils/fileUtils';
import {
  RenameDialog,
  NewFolderDialog,
  NewFileDialog,
  ConfirmDeleteDialog,
  VocabFormDialog,
} from '../components/dialogs';
import { VocabDetailPanel } from '../components/VocabDetailPanel';

// ===== Styled Components =====
const StyledTableCell = styled(TableCell)(({ theme }) => ({
  [`&.${tableCellClasses.head}`]: {
    backgroundColor: theme.palette.mode === 'dark' ? theme.palette.grey[900] : theme.palette.grey[100],
    fontWeight: 'bold',
    color: theme.palette.mode === 'dark' ? theme.palette.common.white : theme.palette.text.primary,
    fontSize: theme.breakpoints.down('sm') ? '0.875rem' : '1rem', // Mobile: 14px, Desktop: 16px
  },
  [`&.${tableCellClasses.body}`]: {
    fontSize: theme.breakpoints.down('sm') ? '0.875rem' : '1rem', // Mobile: 14px, Desktop: 16px
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

// ===== Helper: localStorage for viewMode =====
const STORAGE_KEY_VIEW_MODE = 'vocabulary_view_mode';

const loadViewMode = (): 'tree' | 'grid' => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_VIEW_MODE);
    return saved === 'grid' ? 'grid' : 'tree';
  } catch {
    return 'tree';
  }
};

const saveViewModeToStorage = (mode: 'tree' | 'grid') => {
  try {
    localStorage.setItem(STORAGE_KEY_VIEW_MODE, mode);
  } catch (err) {
    console.error('Failed to save view mode:', err);
  }
};

// ===== Main Component =====
const VocabularyPage: React.FC = () => {
  const navigate = useNavigate();
  
  // Lazy load vocabMap - start empty, load files on-demand
  const [vocabMap, setVocabMap] = useState<Record<string, VocabItem[]>>({});
  
  const [tree, setTree] = useState<FolderNode>(() => {
    const stored = loadTreeFromStorage();
    if (stored) {
      return stored;
    }
    
    // First time init: save default tree (empty root folder)
    const defaultTree = getDefaultTree();
    saveTreeToStorage(defaultTree);
    
    return defaultTree;
  });
  
  // Sync vocab counts on mount to ensure accuracy
  // This rebuilds wordly_vocab_counts from actual vocab files
  React.useEffect(() => {
    syncAllVocabCounts();
  }, []); // Only run once on mount

  // Path index cache for O(1) node lookups - rebuilds when tree changes
  const treeIndex = useMemo(() => {
    return new TreeIndex(tree);
  }, [tree]);
  
  // Helper to update vocabMap and save to localStorage
  // OPTIMIZED: Uses per-file storage for faster saves
  const updateVocabMap = useCallback((updater: (prev: Record<string, VocabItem[]>) => Record<string, VocabItem[]>) => {
    setVocabMap((prev) => {
      const next = updater(prev);
      
      // Optimized: Only save changed files instead of entire map
      // Find which files changed by comparing prev and next
      const changedFiles = new Set<string>();
      
      // Check for added/modified files
      for (const fileName in next) {
        if (next.hasOwnProperty(fileName)) {
          const prevVocab = prev[fileName];
          const nextVocab = next[fileName];
          
          // File is new or changed
          if (!prevVocab || JSON.stringify(prevVocab) !== JSON.stringify(nextVocab)) {
            changedFiles.add(fileName);
          }
        }
      }
      
      // Check for deleted files
      for (const fileName in prev) {
        if (prev.hasOwnProperty(fileName) && !next[fileName]) {
          deleteVocabFile(fileName);
        }
      }
      
      // Save only changed files (FAST - per-file storage)
      // saveVocabFile automatically updates counts in storage
      Array.from(changedFiles).forEach((fileName) => {
        saveVocabFile(fileName, next[fileName]);
      });
      
      // Update counts in state (for immediate UI update)
      setVocabCountMap((prevCounts) => {
        const updated = { ...prevCounts };
        let hasChanges = false;
        
        Array.from(changedFiles).forEach((fileName) => {
          const newCount = next[fileName]?.length || 0;
          if (updated[fileName] !== newCount) {
            updated[fileName] = newCount;
            hasChanges = true;
          }
        });
        
        return hasChanges ? updated : prevCounts;
      });
      
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
    // Use index for faster lookup
    const located = treeIndex.findByPath(selectedPath);
    return located?.node.kind === 'file' ? located.node : null;
  }, [selectedPath, treeIndex]);
  const selectedTitle = useMemo(() => removeFileExtension(selectedFile?.name) || '', [selectedFile]);
  
  // Mobile view mode: 'folder' = show folder tree, 'vocab' = show vocab list
  const [mobileViewMode, setMobileViewMode] = useState<'folder' | 'vocab'>('folder');
  
  // Load vocab counts from storage (FAST - no need to load full vocab data)
  // This allows displaying counts immediately without clicking files
  const [vocabCountMap, setVocabCountMap] = useState<Record<string, number>>(() => {
    return loadVocabCounts();
  });
  
  // Sync counts from vocabMap when it changes (in-memory data takes precedence)
  // OPTIMIZED: Use ref to track if sync is needed, avoid blocking input
  const vocabMapRef = React.useRef(vocabMap);
  vocabMapRef.current = vocabMap;
  
  React.useEffect(() => {
    // Use requestIdleCallback or setTimeout to avoid blocking UI
    const timeoutId = setTimeout(() => {
      setVocabCountMap((prevCounts) => {
        const updated = { ...prevCounts };
        let hasChanges = false;
        
        // Update counts from vocabMap (if loaded)
        const currentMap = vocabMapRef.current;
        for (const fileName in currentMap) {
          if (currentMap.hasOwnProperty(fileName)) {
            const newCount = currentMap[fileName]?.length || 0;
            if (updated[fileName] !== newCount) {
              updated[fileName] = newCount;
              hasChanges = true;
            }
          }
        }
        
        return hasChanges ? updated : prevCounts;
      });
    }, 0); // Defer to next tick to avoid blocking input
    
    return () => clearTimeout(timeoutId);
  }, [vocabMap]);

  // ===== View mode state =====
  const [viewMode, setViewMode] = useState<'tree' | 'grid'>(() => loadViewMode());
  const [currentFolderId, setCurrentFolderId] = useState<string>(tree.id); // For grid view navigation
  const [gridModalOpen, setGridModalOpen] = useState(false); // Grid view modal

  const theme = useTheme();
  const isMdDown = useMediaQuery(theme.breakpoints.down('md'), { noSsr: true });
  const isSmDown = useMediaQuery(theme.breakpoints.down('sm'), { noSsr: true });
  const sidebarWidth = useMemo(
    () => (isMdDown ? '100%' : `clamp(220px, calc(${TOTAL_LEFT_BAND}px - var(--nav-w, 240px)), 360px)`),
    [isMdDown],
  );

  // ===== Context menu state =====
  const [menu, setMenu] = useState<
    | { type: 'folder' | 'file'; path: string[]; mouseX: number; mouseY: number; anchorEl?: HTMLElement | null }
    | null
  >(null);
  const [menuAnchorEl, setMenuAnchorEl] = useState<HTMLElement | null>(null);
  const openContext = useCallback((type: 'folder' | 'file', path: string[], event: React.MouseEvent | React.MouseEvent<HTMLElement>) => {
    event.preventDefault();
    event.stopPropagation();
    // Lưu anchorEl nếu là click từ button (mobile), mouseX/Y nếu là context menu (desktop)
    const anchorEl = 'currentTarget' in event && event.currentTarget ? event.currentTarget as HTMLElement : null;
    setMenu({ 
      type, 
      path, 
      mouseX: 'clientX' in event ? event.clientX - 2 : 0, 
      mouseY: 'clientY' in event ? event.clientY - 4 : 0,
      anchorEl 
    });
    setMenuAnchorEl(anchorEl);
  }, []);
  const closeMenu = useCallback(() => {
    setMenu(null);
    setMenuAnchorEl(null);
  }, []);

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
  // Vocab delete confirmation
  const [vocabDeleteOpen, setVocabDeleteOpen] = useState(false);
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
  // ===== Detail panel =====
  const [detailVocab, setDetailVocab] = useState<VocabItem | null>(null);

  // ===== Checkbox selection =====
  const [selectedVocabs, setSelectedVocabs] = useState<Set<string>>(new Set());

  // ===== Row menu state =====
  const [rowMenuAnchor, setRowMenuAnchor] = useState<{ anchorEl: HTMLElement; word: string; index: number } | null>(null);
  
  const handleRowMenuOpen = useCallback((e: React.MouseEvent<HTMLElement>, word: string, index: number) => {
    e.stopPropagation();
    setRowMenuAnchor({ anchorEl: e.currentTarget, word, index });
  }, []);
  
  const handleRowMenuClose = useCallback(() => {
    setRowMenuAnchor(null);
  }, []);

  // ===== Sidebar collapse/expand state =====
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);

  const toggleSidebar = useCallback(() => {
    setSidebarOpen((prev) => !prev);
  }, []);

  const toggleViewMode = useCallback(() => {
    setViewMode((prev) => {
      const next = prev === 'tree' ? 'grid' : 'tree';
      saveViewModeToStorage(next);
      // Open grid modal when switching to grid view
      if (next === 'grid') {
        setCurrentFolderId(tree.id); // Always start from root
        // NOTE: Do NOT clear selectedPath here - keep vocabulary list visible
        setGridModalOpen(true);
      }
      return next;
    });
  }, [tree.id]);

  const closeGridModal = useCallback(() => {
    setGridModalOpen(false);
    // Switch back to tree view when closing modal
    setViewMode('tree');
    saveViewModeToStorage('tree');
    // Reset to root folder for next time
    setCurrentFolderId(tree.id);
  }, [tree.id]);

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
    // Optimize: Create new Set and update immediately
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
    // Only keep root open, close all other folders (level 1 folders will be visible but collapsed)
    setOpenFolders(new Set<string>([tree.id]));
  }, [tree.id]);

  // Optimize: pass Set directly instead of function to avoid function calls on every render
  // Note: Keeping as function for backward compatibility, but can optimize later if needed
  // Removed unused isFolderOpen function

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const folderInputRef = useRef<HTMLInputElement | null>(null);

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
  const openVocabDetail = useCallback((item: VocabItem) => {
    setDetailVocab(item);
  }, []);
  const closeVocabDetail = useCallback(() => {
    setDetailVocab(null);
  }, []);

  const handleSaveVocab = useCallback((data: VocabItem) => {
    if (!selectedFile || !data.word.trim()) {
      showSnack('Vui lòng nhập từ vựng.', 'warning');
      return;
    }
    
    const fileName = selectedFile.name;
    updateVocabMap((prev) => {
      const vocabList = prev[fileName] || [];
      if (vocabFormMode === 'add') {
        const newList = [...vocabList, { ...data }];
        return { ...prev, [fileName]: newList };
      } else {
        // edit mode
        if (vocabFormIndex === null) return prev;
        const newList = [...vocabList];
        newList[vocabFormIndex] = { ...data };
        return { ...prev, [fileName]: newList };
      }
    });
    setVocabFormOpen(false);
    showSnack(vocabFormMode === 'add' ? 'Đã thêm từ vựng.' : 'Đã cập nhật từ vựng.');
  }, [selectedFile, vocabFormMode, vocabFormIndex, updateVocabMap]);

  const handleDeleteSelectedVocabs = useCallback(() => {
    if (!selectedFile || selectedVocabs.size === 0) return;
    // Open confirmation dialog
    setVocabDeleteOpen(true);
  }, [selectedFile, selectedVocabs]);

  const confirmDeleteVocabs = useCallback(() => {
    if (!selectedFile || selectedVocabs.size === 0) return;
    
    const fileName = selectedFile.name;
    const vocabList = vocabMap[fileName] || [];
    const wordsToDelete = Array.from(selectedVocabs);
    
    updateVocabMap((prev) => {
      const newList = vocabList.filter((item) => !wordsToDelete.includes(item.word));
      return { ...prev, [fileName]: newList };
    });
    
    setSelectedVocabs(new Set());
    setVocabDeleteOpen(false);
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

  React.useEffect(() => {
    setDetailVocab(null);
  }, [selectedFile?.name]);

  // Load vocab data when file is selected (LAZY LOADING)
  React.useEffect(() => {
    setSelectedVocabs(new Set());

    if (selectedFile && !vocabMap[selectedFile.name]) {
      // Load vocab data for this file (FAST - per-file storage)
      const vocab = loadVocabFile(selectedFile.name);
      if (vocab) {
        setVocabMap((prev) => ({
          ...prev,
          [selectedFile.name]: vocab,
        }));
      } else {
        // File doesn't exist in storage, initialize empty
        setVocabMap((prev) => ({
          ...prev,
          [selectedFile.name]: [],
        }));
      }
    }
  }, [selectedFile, vocabMap]);

  // Sort vocabulary list alphabetically by word (Vietnamese-aware)
  const sortedVocabList = useMemo(() => {
    if (!selectedFile) return [];
    const vocabList = vocabMap[selectedFile.name] || [];
    // Create a copy to avoid mutating the original array
    return [...vocabList].sort((a, b) => {
      const wordA = a.word.toLowerCase().trim();
      const wordB = b.word.toLowerCase().trim();
      return wordA.localeCompare(wordB, 'vi'); // Use Vietnamese locale for proper sorting
    });
  }, [selectedFile, vocabMap]);

  // ===== Actions =====
  const handleFileClick = useCallback((filePath: string[], fileName: string) => {
    setSelectedPath(filePath);
    setSelectedVocabs(new Set());
    // Trên mobile: chuyển sang vocab list view khi chọn file
    if (isMdDown) {
      setMobileViewMode('vocab');
    }
  }, [isMdDown]);
  
  // Handle back button trên mobile để quay lại folder view
  const handleBackToFolder = useCallback(() => {
    setMobileViewMode('folder');
    setSelectedPath(null);
    setSelectedVocabs(new Set());
    // Đảm bảo sidebar mở khi quay lại folder view trên mobile
    if (isMdDown) {
      setSidebarOpen(true);
    }
  }, [isMdDown]);

  // ===== Grid view navigation =====
  const currentFolder = useMemo(() => {
    // Build path to current folder by ID
    const findFolderById = (node: FolderNode, targetId: string): FolderNode | null => {
      if (node.id === targetId) return node;
      for (const child of node.children) {
        if (child.kind === 'folder') {
          const result = findFolderById(child, targetId);
          if (result) return result;
        }
      }
      return null;
    };
    
    const found = findFolderById(tree, currentFolderId);
    return found || tree;
  }, [tree, currentFolderId]);

  const breadcrumbPath = useMemo(() => {
    const result: BreadcrumbItem[] = [];
    const findPath = (node: FolderNode, targetId: string, currentPath: BreadcrumbItem[]): boolean => {
      currentPath.push({ id: node.id, label: node.label });
      if (node.id === targetId) return true;
      for (const child of node.children) {
        if (child.kind === 'folder') {
          if (findPath(child, targetId, currentPath)) return true;
        }
      }
      currentPath.pop();
      return false;
    };
    findPath(tree, currentFolderId, result);
    return result;
  }, [tree, currentFolderId]);

  const handleGridFolderClick = useCallback((folder: FolderNode) => {
    setCurrentFolderId(folder.id);
    // NOTE: Do NOT clear selectedPath - keep vocabulary list visible
  }, []);

  const handleGridFileClick = useCallback((file: FileLeaf) => {
    // Find path to file
    const findFilePath = (node: FolderNode, targetFile: FileLeaf, currentPath: string[]): string[] | null => {
      for (const child of node.children) {
        if (child.kind === 'file' && child.id === targetFile.id) {
          return [...currentPath, child.id];
        }
        if (child.kind === 'folder') {
          const result = findFilePath(child, targetFile, [...currentPath, child.id]);
          if (result) return result;
        }
      }
      return null;
    };
    const path = findFilePath(tree, file, [tree.id]);
    if (path) {
      setSelectedPath(path);
      setSelectedVocabs(new Set());
      // Close modal and display vocabulary in main panel (right side)
      setGridModalOpen(false);
      setViewMode('tree');
      saveViewModeToStorage('tree');
      // Trên mobile: chuyển sang vocab list view khi chọn file
      if (isMdDown) {
        setMobileViewMode('vocab');
      }
      // Reset to root folder for next time
      setCurrentFolderId(tree.id);
    }
  }, [tree, isMdDown]);

  const handleBreadcrumbNavigate = useCallback((folderId: string) => {
    setCurrentFolderId(folderId);
    // NOTE: Do NOT clear selectedPath - keep vocabulary list visible
  }, []);

  const handleGridContextMenu = useCallback((item: FolderNode | FileLeaf, e: React.MouseEvent) => {
    e.preventDefault();
    // Find path to this item
    const findItemPath = (node: FolderNode, targetItem: FolderNode | FileLeaf, currentPath: string[]): string[] | null => {
      if (node.id === targetItem.id) return currentPath;
      for (const child of node.children) {
        if (child.id === targetItem.id) {
          return [...currentPath, child.id];
        }
        if (child.kind === 'folder') {
          const result = findItemPath(child, targetItem, [...currentPath, child.id]);
          if (result) return result;
        }
      }
      return null;
    };
    const path = findItemPath(tree, item, [tree.id]);
    if (path) {
      openContext(item.kind, path, e);
    }
  }, [tree, openContext]);

  const handleEmptySpaceContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    // Open context menu for current folder in grid view
    // Use the same findFolderById logic to find the current folder and build its path
    const buildPathToFolder = (node: FolderNode, targetId: string, currentPath: string[]): string[] | null => {
      if (node.id === targetId) return [...currentPath, node.id];
      for (const child of node.children) {
        if (child.kind === 'folder') {
          const result = buildPathToFolder(child, targetId, [...currentPath, node.id]);
          if (result) return result;
        }
      }
      return null;
    };
    
    const path = buildPathToFolder(tree, currentFolderId, []);
    if (path) {
      openContext('folder', path, e);
    }
  }, [tree, currentFolderId, openContext]);

  const startRename = useCallback(() => {
    if (!menu) return;
    // Use index for faster lookup
    const located = treeIndex.findByPath(menu.path);
    if (!located) return;
    const currentName = located.node.kind === 'folder' ? located.node.label : located.node.name;
    setRenameValue(currentName);
    setRenameOpen(true);
  }, [menu, treeIndex]);

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
    
    // also if file renamed, move vocab content key and count
    if (menu.type === 'file' && located.node.kind === 'file') {
      const old = located.node.name;
      if (vocabMap[old]) {
        updateVocabMap((m) => {
          const { [old]: vals, ...rest } = m;
          return { ...rest, [finalName]: vals };
        });
      }
      // Rename count key
      renameVocabCount(old, finalName);
      // Update count map state
      setVocabCountMap((prev) => {
        if (prev[old] !== undefined) {
          const { [old]: count, ...rest } = prev;
          return { ...rest, [finalName]: count };
        }
        return prev;
      });
      if (selectedPath && selectedPath.join('/') === menu.path.join('/')) setSelectedPath(menu.path);
    }
    setRenameOpen(false);
    showSnack('Đã đổi tên.');
  }, [menu, renameValue, treeIndex, vocabMap, selectedPath, updateTree, updateVocabMap, tree]);

  const startNewSubfolder = useCallback(() => {
    if (!menu) return;
    const targetPath = menu.type === 'folder' ? menu.path : menu.path.slice(0, -1); // parent folder if file
    // Use index for faster lookup
    const located = treeIndex.findByPath(targetPath);
    if (!located || located.node.kind !== 'folder') return;
    setNewFolderName('Thư mục mới');
    setNewFolderOpen(true);
  }, [menu, treeIndex]);

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
    // Use index for faster lookup
    const located = treeIndex.findByPath(targetPath);
    if (!located || located.node.kind !== 'folder') return;
    setNewFileName('từ_vựng_mới.txt');
    setNewFileOpen(true);
  }, [menu, treeIndex]);

  const confirmNewFile = useCallback(() => {
    if (!menu) return;
    const targetPath = menu.type === 'folder' ? menu.path : menu.path.slice(0, -1);
    const fileName = newFileName.trim() || 'từ_vựng_mới.txt';
    // Ensure .txt extension
    let baseFileName = fileName.endsWith('.txt') ? fileName : `${fileName}.txt`;
    
    // Get current tree to determine unique file name - use index for faster lookup
    const located = treeIndex.findByPath(targetPath);
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
  }, [menu, newFileName, tree, updateTree, updateVocabMap, treeIndex]);

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
          const importData = JSON.parse(text);
          
          // Validate import data structure
          if (!importData.vocabulary || !Array.isArray(importData.vocabulary)) {
            showSnack('File import không đúng định dạng JSON.', 'error');
            return;
          }
          
          const items: VocabItem[] = importData.vocabulary;

          const targetFolderPath = menu.type === 'folder' ? menu.path : menu.path.slice(0, -1);
          // Use fileName from JSON or fallback to file.name
          const base = importData.fileName || file.name.replace(/\.json$/i, '.txt');
          // Get current tree to determine final file name - use index for faster lookup
          const located = treeIndex.findByPath(targetFolderPath);
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
          // Import vocabulary data - always save the items array (even if empty)
          updateVocabMap((m) => ({ ...m, [finalFileName]: items }));
          showSnack(`Đã nhập tệp "${finalFileName}" với ${items.length} từ vựng.`);
          closeMenu();
        } catch (err) {
          console.error(err);
          showSnack('Không thể đọc file. Đảm bảo file đúng định dạng JSON.', 'error');
        }
      };
      reader.readAsText(file);
    },
    [menu, tree, updateTree, updateVocabMap, treeIndex, closeMenu],
  );

  const handleExportFile = useCallback(() => {
    if (!menu || menu.type !== 'file') return;
    // Use index for faster lookup
    const located = treeIndex.findByPath(menu.path);
    if (!located || located.node.kind !== 'file') return;
    
    const fileName = located.node.name;
    const items = vocabMap[fileName] || [];
    
    if (items.length === 0) {
      showSnack('File không có từ vựng để export.', 'warning');
      return;
    }
    
    // Create export data structure (JSON format)
    const exportData = {
      fileName: fileName,
      vocabulary: items,
      exportDate: new Date().toISOString(),
      version: '1.0',
    };
    
    // Convert to JSON
    const jsonContent = JSON.stringify(exportData, null, 2);
    
    // Create and download file
    const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName.replace(/\.txt$/i, '.json');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    showSnack(`Đã export tệp "${fileName}".`);
    closeMenu();
  }, [menu, tree, vocabMap, closeMenu, treeIndex]);

  const handleExportFolder = useCallback(() => {
    if (!menu || menu.type !== 'folder') return;
    // Use index for faster lookup
    const located = treeIndex.findByPath(menu.path);
    if (!located || located.node.kind !== 'folder') return;
    
    const folderNode = located.node;
    const folderName = folderNode.label;
    
    // Collect all file names in this folder recursively
    const allFileNames = getAllFileNames(folderNode);
    
    // Create vocabulary data for all files in folder
    const folderVocabData: Record<string, VocabItem[]> = {};
    allFileNames.forEach((fileName) => {
      if (vocabMap[fileName]) {
        folderVocabData[fileName] = vocabMap[fileName];
      }
    });
    
    // Create export data structure
    const exportData = {
      folderStructure: folderNode,
      vocabularyData: folderVocabData,
      exportDate: new Date().toISOString(),
      version: '1.0',
    };
    
    // Convert to JSON
    const jsonContent = JSON.stringify(exportData, null, 2);
    
    // Create and download file
    const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${folderName.replace(/\s+/g, '_')}_folder.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    showSnack(`Đã export thư mục "${folderName}" (${allFileNames.length} files).`);
    closeMenu();
  }, [menu, tree, vocabMap, closeMenu, treeIndex]);

  const startImportFolder = useCallback(() => {
    if (!menu) return;
    folderInputRef.current?.click();
  }, [menu]);

  const handleImportFolder = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = '';
      if (!file || !menu) return;
      
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const text = String(reader.result || '');
          const importData = JSON.parse(text);
          
          // Validate import data structure
          if (!importData.folderStructure || !importData.vocabularyData) {
            showSnack('File import không đúng định dạng.', 'error');
            return;
          }
          
          const folderNode: FolderNode = importData.folderStructure;
          const folderVocabData: Record<string, VocabItem[]> = importData.vocabularyData;
          
          const targetFolderPath = menu.type === 'folder' ? menu.path : menu.path.slice(0, -1);
          // Use index for faster lookup
          const located = treeIndex.findByPath(targetFolderPath);
          
          if (!located || located.node.kind !== 'folder') {
            showSnack('Không tìm thấy thư mục đích.', 'error');
            return;
          }
          
          // Ensure unique folder name
          const uniqueFolderName = ensureUniqueName(located.node.children, folderNode.label, true);
          folderNode.label = uniqueFolderName;
          
          // Regenerate all IDs to avoid conflicts
          const clonedFolder = cloneNode(folderNode) as FolderNode;
          
          // Get all file names for notification
          const allFiles = getAllFileNames(clonedFolder);
          const fileNameMapping: Record<string, string> = {};
          
          // Build file name mapping (old name -> new unique name)
          // Track all existing file names (from vocabMap) and newly renamed files
          const allExistingFileNames = new Set(Object.keys(vocabMap));
          const processedFileNames = new Set<string>(); // Track files already processed in this import
          
          // Recursively rename files to ensure uniqueness
          const renameFilesRecursively = (node: FolderNode | FileLeaf): void => {
            if (node.kind === 'file') {
              const oldName = node.name;
              
              // Build siblings list: existing files + already processed files from this import
              const siblings: FileLeaf[] = [];
              
              // Add all existing files from vocabMap
              allExistingFileNames.forEach(name => {
                siblings.push({ kind: 'file', name, id: '' });
              });
              
              // Add all files already processed in this import (to avoid conflicts within same import)
              processedFileNames.forEach(name => {
                siblings.push({ kind: 'file', name, id: '' });
              });
              
              // Generate unique name
              const newName = ensureUniqueName(siblings, oldName, false);
              
              // Update mapping and node name
              fileNameMapping[oldName] = newName;
              node.name = newName;
              
              // Track this file name for next iterations
              processedFileNames.add(newName);
            } else {
              // For folders, recursively process children
              node.children.forEach(child => renameFilesRecursively(child));
            }
          };
          
          renameFilesRecursively(clonedFolder);
          
          // Update tree
          updateTree((prevTree) => {
            const copy = structuredClone(prevTree);
            const located2 = findNodeByPath(copy, targetFolderPath);
            if (!located2 || located2.node.kind !== 'folder') return prevTree;
            located2.node.children.push(clonedFolder);
            return copy;
          });
          
          // Update vocabulary data with renamed file names
          updateVocabMap((prevMap) => {
            const newData = { ...prevMap };
            Object.keys(folderVocabData).forEach((oldFileName) => {
              const newFileName = fileNameMapping[oldFileName] || oldFileName;
              newData[newFileName] = folderVocabData[oldFileName];
            });
            return newData;
          });
          
          // Count total vocabulary words
          const totalWords = Object.values(folderVocabData).reduce((sum, vocab) => sum + vocab.length, 0);
          showSnack(`Đã import thư mục "${uniqueFolderName}" (${allFiles.length} files, ${totalWords} từ vựng).`);
          closeMenu();
        } catch (err) {
          console.error(err);
          showSnack('Không thể đọc file. Đảm bảo file đúng định dạng JSON.', 'error');
        }
      };
      reader.readAsText(file);
    },
    [menu, treeIndex, vocabMap, updateTree, updateVocabMap, closeMenu],
  );

  const doCopy = useCallback(() => {
    if (!menu) return;
    // Use index for faster lookup
    const located = treeIndex.findByPath(menu.path);
    if (!located) return;
    setClip({ mode: 'copy', node: cloneNode(located.node) });
    showSnack('Đã sao chép.');
    closeMenu();
  }, [menu, treeIndex, closeMenu]);

  // Cut: XÓA NGAY tại vị trí cũ và đưa vào clipboard
  const doCut = useCallback(() => {
    if (!menu) return;
    // Use index for faster lookup
    const located = treeIndex.findByPath(menu.path);
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
  }, [menu, tree, treeIndex, selectedPath, closeMenu, updateTree]);

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
    
    // Prevent deleting root folder
    if (menu.path.length === 1 && menu.type === 'folder') {
      showSnack('Không thể xóa thư mục gốc!', 'error');
      closeMenu();
      return;
    }
    
    const located = findNodeByPath(tree, menu.path);
    if (!located) return;
    const label = located.node.kind === 'folder' ? located.node.label : located.node.name;
    const fileNames = getAllFileNames(located.node);
    setPendingDelete({ path: menu.path, type: menu.type, label, fileNames });
    setConfirmOpen(true);
  }, [menu, tree, closeMenu]);

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
        minHeight: { xs: '100vh', md: '100vh' }, // Cho phép mở rộng hơn 100vh trên mobile
        height: { xs: 'auto', md: '100vh' }, // Auto trên mobile để cho phép mở rộng theo nội dung
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
      }}
    >
      {/* Hidden file input for Import */}
      <input ref={fileInputRef} type="file" accept=".json,application/json" hidden onChange={handleImportFile} />
      <input ref={folderInputRef} type="file" accept=".json,application/json" hidden onChange={handleImportFolder} />

      {/* Sidebar */}
      <Paper
        elevation={0}
        sx={{
          width: {
            xs: sidebarOpen && (mobileViewMode === 'folder' || !isMdDown) ? '100%' : 0,
            md: sidebarOpen ? sidebarWidth : 0,
          },
          flexShrink: 0,
          borderRight: { xs: 'none', md: `1px solid ${theme.palette.divider}` },
          borderBottom: { xs: `1px solid ${theme.palette.divider}`, md: 'none' },
          height: { 
            xs: mobileViewMode === 'folder' ? 'auto' : 0, // Auto trên mobile để tự mở rộng theo nội dung
            sm: mobileViewMode === 'folder' ? 'auto' : 0,
            md: '100%' 
          },
          minHeight: {
            xs: mobileViewMode === 'folder' ? '100vh' : 0, // Ít nhất bằng viewport height
            sm: mobileViewMode === 'folder' ? '100vh' : 0,
            md: 'auto',
          },
          borderRadius: 0,
          display: {
            xs: mobileViewMode === 'folder' ? 'flex' : 'none',
            md: 'flex',
          },
          flexDirection: 'column',
          overflow: { xs: 'visible', md: 'hidden' }, // Mobile: visible để window scroll, Desktop: hidden
          overflowY: { xs: 'visible', md: 'auto' }, // Mobile: visible, Desktop: auto
          bgcolor: { 
            xs: theme.palette.mode === 'dark' ? '#1e1e1e' : 'background.default', 
            md: theme.palette.mode === 'dark' ? '#1e1e1e' : 'background.paper' 
          }, // Dark mode: #1e1e1e để nhìn dịu hơn, mobile dùng background.default để khớp với body
          transition: theme.transitions.create(['width', 'height'], {
            duration: theme.transitions.duration.standard,
            easing: theme.transitions.easing.easeInOut,
          }),
        }}
      >
        {sidebarOpen && (
          <>
            {/* Sticky Header - "Kho từ vựng" */}
            <Box sx={{ 
              px: 2, 
              pt: 3, 
              pb: 2, 
              flexShrink: 0,
              position: 'sticky',
              top: { xs: '56px', sm: '64px', md: 0 }, // Dưới AppBar trên mobile
              zIndex: (t) => t.zIndex.appBar - 1, // Dưới AppBar
              bgcolor: 'background.paper',
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <MenuBookIcon size={24} style={{ marginRight: 8, color: 'inherit' }} />
                  <Typography variant={isSmDown ? 'subtitle1' : 'h6'} sx={{ fontWeight: 600 }}>
                    Kho từ vựng
                  </Typography>
                </Box>
                <Stack direction="row" spacing={0.5}>
                  <Tooltip title={viewMode === 'tree' ? 'Chế độ lưới' : 'Chế độ cây'} arrow>
                    <IconButton
                      size="small"
                      onClick={toggleViewMode}
                      aria-label="Đổi chế độ xem"
                    >
                      {viewMode === 'tree' ? <ViewModuleIcon fontSize="small" /> : <ViewListIcon fontSize="small" />}
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Thu gọn tất cả" arrow>
                    <IconButton
                      size="small"
                      onClick={collapseAll}
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

            {/* Folder Tree List - Loại bỏ scroll riêng trên mobile để sticky hoạt động */}
            <Box sx={{ 
              flex: '1 1 auto', // Cho phép mở rộng tự do
              minHeight: 0,
              overflowY: { xs: 'visible', md: 'auto' }, // Mobile: visible để window scroll, Desktop: auto cho scroll riêng
              px: 2, 
              pt: 0,
              pb: { xs: 4, md: 2 }, // Padding bottom trên mobile để scroll được hết nội dung
              bgcolor: { 
                xs: theme.palette.mode === 'dark' ? '#1e1e1e' : 'background.default', 
                md: theme.palette.mode === 'dark' ? '#1e1e1e' : 'transparent' 
              }, // Dark mode: #1e1e1e để nhìn dịu hơn, mobile dùng background.default để khớp với body khi scroll
            }}>
              <List>
                <FolderItem
                  node={tree}
                  onFileClick={handleFileClick}
                  onContext={openContext}
                  path={[tree.id]}
                  forceShowMenu={isMdDown}
                  isFolderOpen={openFolders}
                  onToggle={handleFolderToggle}
                  vocabCountMap={vocabCountMap}
                  selectedFileId={selectedFile?.id || null}
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
          display: {
            xs: mobileViewMode === 'vocab' ? 'flex' : 'none',
            md: 'flex',
          },
          flexDirection: 'column',
          minWidth: 0,
          height: { 
            xs: mobileViewMode === 'vocab' ? 'calc(100vh - 56px)' : '60vh',
            sm: mobileViewMode === 'vocab' ? 'calc(100vh - 64px)' : '55vh',
            md: '100%' 
          },
          position: 'relative',
        }}
      >
        {/* Sticky Header - Tên file + buttons */}
        <Box 
          sx={{ 
            px: { xs: 1.5, sm: 2, md: 3 }, 
            pt: { xs: 1.5, sm: 2, md: 2.5 }, 
            pb: { xs: 1.5, sm: 1.5, md: 2 }, 
            flexShrink: 0,
            position: 'sticky',
            top: { xs: '56px', sm: '64px', md: 0 }, // Dưới AppBar trên mobile
            zIndex: (t) => t.zIndex.appBar - 1, // Dưới AppBar
            bgcolor: 'background.paper',
          }}
        >
          {selectedFile ? (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0 }}>
                {/* Back button - chỉ hiển thị trên mobile */}
                {isMdDown && (
                  <IconButton
                    onClick={handleBackToFolder}
                    sx={{ 
                      mr: 1, 
                      flexShrink: 0,
                      color: 'text.primary',
                    }}
                    aria-label="Quay lại danh sách thư mục"
                  >
                    <ArrowBackIcon size={isSmDown ? 20 : 24} />
                  </IconButton>
                )}
                <CategoryIcon size={isSmDown ? 20 : 24} style={{ marginRight: isSmDown ? 8 : 12, flexShrink: 0, color: 'inherit' }} />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography 
                    variant={isSmDown ? 'subtitle1' : 'h6'} 
                    color="primary"
                    sx={{ 
                      fontWeight: 700,
                      fontSize: { xs: '0.875rem', sm: '1rem', md: undefined }, // Desktop giữ fontSize mặc định của variant
                      wordBreak: 'break-word',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                  {selectedTitle}
                </Typography>
                  {vocabCountMap[selectedFile.name] !== undefined && (
                    <Typography 
                      variant="caption" 
                      color="text.secondary" 
                      sx={{ 
                        display: 'block', 
                        mt: 0.25,
                        fontSize: { xs: '0.6875rem', sm: '0.75rem' },
                      }}
                    >
                      {vocabCountMap[selectedFile.name]} từ vựng
                    </Typography>
                  )}
              </Box>
              </Box>
              <Stack 
                direction="row" 
                spacing={{ xs: 0.5, sm: 1 }}
                sx={{ 
                  flexWrap: { xs: 'wrap', sm: 'nowrap' },
                  gap: { xs: 0.5, sm: 0 },
                  width: { xs: '100%', sm: 'auto' },
                }}
              >
                {selectedVocabs.size > 0 && (
                  <Button
                    variant="outlined"
                    color="error"
                    size={isSmDown ? 'small' : 'medium'}
                    startIcon={<DeleteIcon />}
                    onClick={handleDeleteSelectedVocabs}
                    sx={{ 
                      fontSize: { xs: '0.6875rem', sm: undefined }, // Desktop giữ fontSize mặc định
                      px: { xs: 1, sm: 2 },
                    }}
                  >
                    Xóa ({selectedVocabs.size})
                  </Button>
                )}
                <Button
                  variant="contained"
                  color="primary"
                  size={isSmDown ? 'small' : 'medium'}
                  startIcon={<RocketLaunchIcon />}
                  onClick={() => {
                    if (selectedFile) {
                      const fileName = selectedFile.name;
                      // Update session storage for all training modes with the new file name
                      // This ensures all training pages use the same file when navigating between them
                      const baseSession = {
                        fileName,
                        timestamp: Date.now(),
                      };
                      
                      // Update flashcards-reading session
                      saveReadingSession({
                        ...baseSession,
                        score: 0,
                        mistakes: 0,
                        flipped: {},
                        targetIdx: 0,
                        language: 'vi',
                      });
                      
                      // Update flashcards-listening session
                      saveListeningSession({
                        ...baseSession,
                        score: 0,
                        mistakes: 0,
                        flipped: {},
                        targetIdx: 0,
                        language: 'en',
                        hasStarted: false,
                      });
                      
                      // Update read-write session
                      saveReadWriteSession({
                        ...baseSession,
                        currentWordIndex: 0,
                        completedWords: [],
                        mode: 'vi-en' as const,
                        score: 0,
                        mistakes: 0,
                      });
                      
                      // Update listen-write session
                      saveListenWriteSession({
                        ...baseSession,
                        currentWordIndex: 0,
                        completedWords: [],
                        mode: 'vi-en' as const,
                        score: 0,
                        mistakes: 0,
                      });
                      
                      // Navigate to flashcards-reading with file parameter
                      navigate(`/train/flashcards-reading?file=${encodeURIComponent(fileName)}`);
                    }
                  }}
                  sx={{ 
                    fontWeight: 600,
                    fontSize: { xs: '0.6875rem', sm: undefined }, // Desktop giữ fontSize mặc định
                    px: { xs: 1, sm: 2 },
                  }}
                >
                  Train
                </Button>
                <Button
                  variant="contained"
                  size={isSmDown ? 'small' : 'medium'}
                  startIcon={<AddIcon />}
                  onClick={openAddVocabForm}
                  sx={{ 
                    fontSize: { xs: '0.6875rem', sm: undefined }, // Desktop giữ fontSize mặc định
                    px: { xs: 1, sm: 2 },
                  }}
                >
                  {isSmDown ? 'Thêm' : 'Thêm từ vựng'}
                </Button>
              </Stack>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <CategoryIcon size={24} style={{ marginRight: 8, color: 'inherit' }} />
              <Typography variant={isSmDown ? 'h6' : 'h5'} sx={{ fontWeight: 600 }}>
                Từ vựng
              </Typography>
            </Box>
          )}
        </Box>

        {/* Content Area - Danh sách từ vựng */}
        <Box sx={{ 
          flex: 1, 
          overflow: 'hidden', // Không scroll ở đây, để TableContainer handle
          px: { xs: 2, md: 3 }, 
          pb: { xs: 2, md: 3 },
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0, // Quan trọng để flex child có thể shrink
        }}>
          {selectedFile ? (
            <Paper 
              elevation={0} 
              sx={{ 
                border: `1px solid ${theme.palette.divider}`,
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                minHeight: 0,
              }}
            >
              <TableContainer sx={{ 
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                maxHeight: '100%', // Sử dụng 100% của parent flex container
                overflow: 'auto', // Cho phép scroll khi cần
                overflowX: 'hidden', // Không scroll ngang
              }}>
                <Table aria-label="vocabulary table" stickyHeader={isMdDown} size="medium" sx={{ minWidth: 650 }}>
                  <TableHead>
                    <TableRow>
                      <StyledTableCell padding="checkbox">
                        <Checkbox
                          indeterminate={selectedVocabs.size > 0 && selectedVocabs.size < sortedVocabList.length}
                          checked={sortedVocabList.length > 0 && selectedVocabs.size === sortedVocabList.length}
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
                    {sortedVocabList.map((item, index) => {
                      // Find original index for editing (needed for updateVocabMap)
                      const originalList = vocabMap[selectedFile.name] || [];
                      const originalIndex = originalList.findIndex(v => v.word === item.word);
                      const itemIndex = originalIndex >= 0 ? originalIndex : index;
                      
                      return (
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
                          onClick={() => openVocabDetail(item)}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                speak(item.word);
                              }}
                              sx={{
                                p: 0.5,
                                minWidth: 'auto',
                                '&:hover': { 
                                  backgroundColor: 'primary.light', 
                                  color: 'primary.main',
                                  borderRadius: 1,
                                },
                              }}
                              aria-label={`Phát âm ${item.word}`}
                            >
                              <VolumeUpIcon 
                                size={18}
                                style={{ color: 'inherit' }}
                              />
                            </IconButton>
                            <Box component="span">{item.word}</Box>
                          </Box>
                        </StyledTableCell>
                        <StyledTableCell 
                          sx={{ wordBreak: 'break-word', cursor: 'pointer' }}
                          onClick={() => openVocabDetail(item)}
                        >
                          {item.vnMeaning}
                        </StyledTableCell>
                        <StyledTableCell 
                          sx={{ cursor: 'pointer' }}
                          onClick={() => openVocabDetail(item)}
                        >
                          <Box
                            component="span"
                            sx={{
                              px: 1,
                              py: 0.5,
                              bgcolor: 'grey.100',
                              borderRadius: 1,
                              fontSize: { xs: '0.75rem', sm: '0.875rem' }, // Mobile: 12px, Desktop: 14px
                              color: 'grey.800',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {item.type}
                          </Box>
                        </StyledTableCell>
                        <StyledTableCell 
                          sx={{ whiteSpace: 'nowrap', cursor: 'pointer' }}
                          onClick={() => openVocabDetail(item)}
                        >
                          / {item.pronunciation} /
                        </StyledTableCell>
                        <StyledTableCell align="center">
                              <IconButton
                                size={isSmDown ? 'small' : 'medium'}
                            onClick={(e) => handleRowMenuOpen(e, item.word, itemIndex)}
                                sx={{ '&:hover': { backgroundColor: 'primary.light', color: 'primary.main' } }}
                            aria-label={`Menu cho ${item.word}`}
                              >
                            <MoreVertIcon fontSize={isSmDown ? 'small' : 'medium'} />
                              </IconButton>
                          <Menu
                            anchorEl={rowMenuAnchor?.anchorEl}
                            open={rowMenuAnchor !== null && rowMenuAnchor.word === item.word}
                            onClose={handleRowMenuClose}
                            anchorOrigin={{
                              vertical: 'bottom',
                              horizontal: 'right',
                            }}
                            transformOrigin={{
                              vertical: 'top',
                              horizontal: 'right',
                            }}
                          >
                            <MenuItem onClick={() => {
                              handleRowMenuClose();
                              openEditVocabForm(item, itemIndex);
                            }}>
                              <ListItemIcon>
                                <EditIcon fontSize="small" />
                              </ListItemIcon>
                              <ListItemText>Sửa</ListItemText>
                            </MenuItem>
                            <MenuItem onClick={handleRowMenuClose} disabled>
                              <ListItemText>Item 1 (Tính năng tương lai)</ListItemText>
                            </MenuItem>
                            <MenuItem onClick={handleRowMenuClose} disabled>
                              <ListItemText>Item 2 (Tính năng tương lai)</ListItemText>
                            </MenuItem>
                            <MenuItem onClick={handleRowMenuClose} disabled>
                              <ListItemText>Item 3 (Tính năng tương lai)</ListItemText>
                            </MenuItem>
                          </Menu>
                        </StyledTableCell>
                      </StyledTableRow>
                      );
                    })}
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
              <FileIcon size={56} style={{ color: 'gray', marginBottom: 12 }} />
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
        anchorReference={isMdDown ? "anchorEl" : "anchorPosition"}
        anchorPosition={!isMdDown && menu ? { top: menu.mouseY, left: menu.mouseX } : undefined}
        anchorEl={isMdDown ? menuAnchorEl : null}
        transformOrigin={isMdDown ? { horizontal: 'right', vertical: 'top' } : undefined}
        anchorOrigin={isMdDown ? { horizontal: 'right', vertical: 'bottom' } : undefined}
        PaperProps={{
          sx: {
            minWidth: isMdDown ? '200px' : 'auto',
            maxWidth: isMdDown ? 'calc(100vw - 32px)' : 'none',
          },
        }}
      >
        {menu?.type === 'folder' ? [
          <MenuItem 
            key="new-folder" 
            onClick={startNewSubfolder}
            sx={{
              fontSize: { xs: '0.875rem', sm: '1rem' },
              py: { xs: 1.25, sm: 1 },
            }}
          >
            <ListItemIcon sx={{ minWidth: { xs: 36, sm: 40 } }}>
              <NewFolderIcon fontSize={isSmDown ? 'small' : 'medium'} />
            </ListItemIcon>
            <ListItemText 
              primary="Tạo thư mục con"
              primaryTypographyProps={{
                fontSize: { xs: '0.875rem', sm: '1rem' },
              }}
            />
          </MenuItem>,
          <MenuItem 
            key="new-file" 
            onClick={startNewFile}
            sx={{
              fontSize: { xs: '0.875rem', sm: '1rem' },
              py: { xs: 1.25, sm: 1 },
            }}
          >
            <ListItemIcon sx={{ minWidth: { xs: 36, sm: 40 } }}>
              <FileIcon fontSize={isSmDown ? 'small' : 'medium'} />
            </ListItemIcon>
            <ListItemText 
              primary="Tạo file"
              primaryTypographyProps={{
                fontSize: { xs: '0.875rem', sm: '1rem' },
              }}
            />
          </MenuItem>,
          <Divider key="divider-1" />,
          <MenuItem key="export-folder" onClick={handleExportFolder}>
            <ListItemIcon><ExportIcon fontSize="small" /></ListItemIcon>
            <ListItemText>Export thư mục (.json)</ListItemText>
          </MenuItem>,
          <MenuItem key="import-folder" onClick={startImportFolder}>
              <ListItemIcon><ImportIcon fontSize="small" /></ListItemIcon>
            <ListItemText>Import thư mục (.json)</ListItemText>
          </MenuItem>,
          <MenuItem key="import-file" onClick={startImport}>
            <ListItemIcon><ImportIcon fontSize="small" /></ListItemIcon>
            <ListItemText>Import file (.json)</ListItemText>
          </MenuItem>,
          <Divider key="divider-2" />,
          <MenuItem key="rename" onClick={startRename}>
              <ListItemIcon><RenameIcon fontSize="small" /></ListItemIcon>
              <ListItemText>Đổi tên</ListItemText>
          </MenuItem>,
          <MenuItem key="cut" onClick={doCut}>
              <ListItemIcon><CutIcon fontSize="small" /></ListItemIcon>
              <ListItemText>Cắt</ListItemText>
          </MenuItem>,
          <MenuItem key="copy" onClick={doCopy}>
              <ListItemIcon><CopyIcon fontSize="small" /></ListItemIcon>
              <ListItemText>Sao chép</ListItemText>
          </MenuItem>,
          <MenuItem key="paste" disabled={!clip} onClick={doPaste}>
              <ListItemIcon><PasteIcon fontSize="small" /></ListItemIcon>
              <ListItemText>Dán</ListItemText>
          </MenuItem>,
          <Divider key="divider-3" />,
          <MenuItem key="delete" onClick={startDelete}>
              <ListItemIcon><DeleteIcon fontSize="small" /></ListItemIcon>
              <ListItemText>Xoá thư mục</ListItemText>
          </MenuItem>,
        ] : [
          <MenuItem key="export-file" onClick={handleExportFile}>
              <ListItemIcon><ExportIcon fontSize="small" /></ListItemIcon>
            <ListItemText>Export file (.json)</ListItemText>
          </MenuItem>,
          <Divider key="divider-1" />,
          <MenuItem key="rename" onClick={startRename}>
              <ListItemIcon><RenameIcon fontSize="small" /></ListItemIcon>
              <ListItemText>Đổi tên</ListItemText>
          </MenuItem>,
          <MenuItem key="cut" onClick={doCut}>
              <ListItemIcon><CutIcon fontSize="small" /></ListItemIcon>
              <ListItemText>Cắt</ListItemText>
          </MenuItem>,
          <MenuItem key="copy" onClick={doCopy}>
              <ListItemIcon><CopyIcon fontSize="small" /></ListItemIcon>
              <ListItemText>Sao chép</ListItemText>
          </MenuItem>,
          <Divider key="divider-2" />,
          <MenuItem key="delete" onClick={startDelete}>
              <ListItemIcon><DeleteIcon fontSize="small" /></ListItemIcon>
              <ListItemText>Xoá file</ListItemText>
          </MenuItem>,
        ]}
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

      <ConfirmDeleteDialog
        open={vocabDeleteOpen}
        type="vocab"
        label=""
        count={selectedVocabs.size}
        onClose={() => setVocabDeleteOpen(false)}
        onConfirm={confirmDeleteVocabs}
      />

      <VocabFormDialog
        open={vocabFormOpen}
        mode={vocabFormMode}
        data={vocabFormData}
        onChange={setVocabFormData}
        onClose={() => setVocabFormOpen(false)}
        onSave={handleSaveVocab}
      />

      <VocabDetailPanel
        open={!!detailVocab}
        vocab={detailVocab}
        onClose={closeVocabDetail}
      />

      {/* Grid View Modal */}
      <FolderGridModal
        open={gridModalOpen}
        onClose={closeGridModal}
        currentFolder={currentFolder}
        breadcrumbPath={breadcrumbPath}
        selectedFileName={selectedFile?.name || null}
        onFolderClick={handleGridFolderClick}
        onFileClick={handleGridFileClick}
        onBreadcrumbNavigate={handleBreadcrumbNavigate}
        onContextMenu={handleGridContextMenu}
        onEmptySpaceContextMenu={handleEmptySpaceContextMenu}
        vocabCountMap={vocabCountMap}
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
 
