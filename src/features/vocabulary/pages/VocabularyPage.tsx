import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
    backgroundColor: theme.palette.mode === 'dark' ? theme.palette.grey[800] : theme.palette.grey[200],
    fontWeight: 700,
    color: theme.palette.mode === 'dark' ? theme.palette.common.white : theme.palette.text.primary,
    fontSize: '0.8125rem',
    lineHeight: 1.25,
    paddingTop: theme.spacing(1.25),
    paddingBottom: theme.spacing(1.25),
    borderBottom: `2px solid ${theme.palette.primary.main}`,
  },
  [`&.${tableCellClasses.body}`]: {
    fontSize: '0.875rem',
    color: theme.palette.mode === 'dark' ? theme.palette.common.white : theme.palette.text.primary,
  },
  [theme.breakpoints.down('sm')]: {
    padding: theme.spacing(1),
    fontSize: '0.8125rem',
  },
  [`&.${tableCellClasses.paddingCheckbox}`]: {
    width: 48,
    paddingLeft: theme.spacing(1),
    paddingRight: theme.spacing(1),
  },
}));

const StyledTableRow = styled(TableRow)(({ theme }) => ({
  backgroundColor: theme.palette.background.paper,
  '&:hover': {
    backgroundColor: `${theme.palette.action.hover} !important`,
  },
  '&:last-child td, &:last-child th': { border: 0 },
}));

type VocabTableRowProps = {
  item: VocabItem;
  originalIndex: number;
  selected: boolean;
  compact: boolean;
  getSpeakAriaLabel: (word: string) => string;
  getMenuAriaLabel: (word: string) => string;
  onToggleSelection: (word: string) => void;
  onOpenDetail: (item: VocabItem) => void;
  onOpenMenu: (event: React.MouseEvent<HTMLElement>, item: VocabItem, index: number) => void;
};

const VocabTableRow = React.memo(function VocabTableRow({
  item,
  originalIndex,
  selected,
  compact,
  getSpeakAriaLabel,
  getMenuAriaLabel,
  onToggleSelection,
  onOpenDetail,
  onOpenMenu,
}: VocabTableRowProps) {
  const pendingSpeakRef = React.useRef<number | null>(null);

  React.useEffect(
    () => () => {
      if (pendingSpeakRef.current !== null) {
        window.clearTimeout(pendingSpeakRef.current);
      }
    },
    [],
  );

  const handleRowClick = useCallback(() => {
    if (pendingSpeakRef.current !== null) {
      window.clearTimeout(pendingSpeakRef.current);
    }
    pendingSpeakRef.current = window.setTimeout(() => {
      pendingSpeakRef.current = null;
      speak(item.word);
    }, 220);
  }, [item.word]);

  const handleRowDoubleClick = useCallback(() => {
    if (pendingSpeakRef.current !== null) {
      window.clearTimeout(pendingSpeakRef.current);
      pendingSpeakRef.current = null;
    }
    onOpenDetail(item);
  }, [item, onOpenDetail]);

  const stopRowInteraction = useCallback((event: React.SyntheticEvent) => {
    event.stopPropagation();
  }, []);

  return (
    <StyledTableRow
      hover
      onClick={handleRowClick}
      onDoubleClick={handleRowDoubleClick}
      sx={{ cursor: 'pointer' }}
    >
      <StyledTableCell padding="checkbox" onClick={stopRowInteraction} onDoubleClick={stopRowInteraction}>
        <Checkbox
          checked={selected}
          onChange={() => onToggleSelection(item.word)}
          size={compact ? 'small' : 'medium'}
        />
      </StyledTableCell>
      <StyledTableCell
        sx={{ width: { xs: '38%', sm: '32%', lg: '24%' }, fontWeight: 500 }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 0 }}>
          <IconButton
            size="small"
            onClick={(event) => {
              event.stopPropagation();
              speak(item.word);
            }}
            onDoubleClick={stopRowInteraction}
            sx={{
              p: 0.5,
              minWidth: 'auto',
              '&:hover': {
                backgroundColor: 'primary.light',
                color: 'primary.main',
                borderRadius: 1,
              },
            }}
            aria-label={getSpeakAriaLabel(item.word)}
          >
            <VolumeUpIcon size={18} style={{ color: 'inherit' }} />
          </IconButton>
          <Typography
            component="span"
            variant="body2"
            sx={{ minWidth: 0, fontWeight: 600, overflowWrap: 'anywhere', wordBreak: 'break-word' }}
          >
            {item.word}
          </Typography>
        </Box>
      </StyledTableCell>
      <StyledTableCell
        sx={{ minWidth: 0, overflowWrap: 'anywhere', wordBreak: 'break-word' }}
      >
        {item.vnMeaning}
      </StyledTableCell>
      <StyledTableCell
        sx={{ display: { xs: 'none', lg: 'table-cell' }, width: 112 }}
      >
        <Box
          component="span"
          sx={{
            px: 1,
            py: 0.5,
            bgcolor: 'grey.100',
            borderRadius: 1,
            fontSize: { xs: '0.75rem', sm: '0.875rem' },
            color: 'grey.800',
            whiteSpace: 'nowrap',
          }}
        >
          {item.type}
        </Box>
      </StyledTableCell>
      <StyledTableCell
        sx={{
          display: { xs: 'none', lg: 'table-cell' },
          width: 160,
          overflowWrap: 'anywhere',
          wordBreak: 'break-word',
        }}
      >
        / {item.pronunciation} /
      </StyledTableCell>
      <StyledTableCell align="center" sx={{ width: 56 }}>
        <IconButton
          size={compact ? 'small' : 'medium'}
          onClick={(event) => onOpenMenu(event, item, originalIndex)}
          onDoubleClick={stopRowInteraction}
          sx={{ '&:hover': { backgroundColor: 'primary.light', color: 'primary.main' } }}
          aria-label={getMenuAriaLabel(item.word)}
        >
          <MoreVertIcon fontSize={compact ? 'small' : 'medium'} />
        </IconButton>
      </StyledTableCell>
    </StyledTableRow>
  );
});

type SortedVocabEntry = {
  item: VocabItem;
  originalIndex: number;
};

type VocabTableBodyProps = {
  entries: SortedVocabEntry[];
  selectedVocabs: Set<string>;
  compact: boolean;
  getSpeakAriaLabel: (word: string) => string;
  getMenuAriaLabel: (word: string) => string;
  onToggleSelection: (word: string) => void;
  onOpenDetail: (item: VocabItem) => void;
  onOpenMenu: (event: React.MouseEvent<HTMLElement>, item: VocabItem, index: number) => void;
};

const VocabTableBody = React.memo(function VocabTableBody({
  entries,
  selectedVocabs,
  compact,
  getSpeakAriaLabel,
  getMenuAriaLabel,
  onToggleSelection,
  onOpenDetail,
  onOpenMenu,
}: VocabTableBodyProps) {
  return (
    <TableBody>
      {entries.map(({ item, originalIndex }) => (
        <VocabTableRow
          key={`${item.word}:${originalIndex}`}
          item={item}
          originalIndex={originalIndex}
          selected={selectedVocabs.has(item.word)}
          compact={compact}
          getSpeakAriaLabel={getSpeakAriaLabel}
          getMenuAriaLabel={getMenuAriaLabel}
          onToggleSelection={onToggleSelection}
          onOpenDetail={onOpenDetail}
          onOpenMenu={onOpenMenu}
        />
      ))}
    </TableBody>
  );
});

// ===== Helper: localStorage for viewMode =====
const STORAGE_KEY_VIEW_MODE = 'vocabulary_view_mode';
const MIN_SIDEBAR_WIDTH = 240;
const MAX_SIDEBAR_WIDTH = 480;
const MIN_CONTENT_WIDTH = 360;

const getDefaultSidebarWidth = (): number => {
  const viewportWidth = typeof window === 'undefined' ? 1280 : window.innerWidth;
  return Math.round(Math.min(336, Math.max(288, viewportWidth * 0.24)));
};

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
  const { t } = useTranslation('vocabulary');
  const getSpeakAriaLabel = useCallback(
    (word: string) => t('actions.speakWord', { word }),
    [t],
  );
  const getMenuAriaLabel = useCallback(
    (word: string) => t('actions.rowMenuFor', { word }),
    [t],
  );
  
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
          if (prevVocab !== nextVocab) {
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
  const [sidebarWidth, setSidebarWidth] = useState(getDefaultSidebarWidth);
  const [sidebarResizeStart, setSidebarResizeStart] = useState<{
    pointerX: number;
    width: number;
  } | null>(null);
  const pageRootRef = useRef<HTMLDivElement | null>(null);

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
  const [renameTarget, setRenameTarget] = useState<{
    type: 'folder' | 'file';
    path: string[];
  } | null>(null);
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFileOpen, setNewFileOpen] = useState(false);
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
  const [rowMenuAnchor, setRowMenuAnchor] = useState<{
    anchorEl: HTMLElement;
    item: VocabItem;
    index: number;
  } | null>(null);
  
  const handleRowMenuOpen = useCallback((e: React.MouseEvent<HTMLElement>, item: VocabItem, index: number) => {
    e.stopPropagation();
    setRowMenuAnchor({ anchorEl: e.currentTarget, item, index });
  }, []);
  
  const handleRowMenuClose = useCallback(() => {
    setRowMenuAnchor(null);
  }, []);

  // ===== Sidebar collapse/expand state =====
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);

  const toggleSidebar = useCallback(() => {
    setSidebarOpen((prev) => !prev);
  }, []);

  const clampSidebarWidth = useCallback((width: number): number => {
    const availableWidth = pageRootRef.current?.getBoundingClientRect().width ?? window.innerWidth;
    const responsiveMax = Math.max(
      MIN_SIDEBAR_WIDTH,
      Math.min(MAX_SIDEBAR_WIDTH, availableWidth - MIN_CONTENT_WIDTH),
    );
    return Math.round(Math.min(responsiveMax, Math.max(MIN_SIDEBAR_WIDTH, width)));
  }, []);

  const startSidebarResize = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      if (event.button !== 0) return;
      event.preventDefault();
      setSidebarResizeStart({
        pointerX: event.clientX,
        width: sidebarWidth,
      });
    },
    [sidebarWidth],
  );

  const handleSidebarResizeKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLElement>) => {
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        const direction = event.key === 'ArrowLeft' ? -1 : 1;
        setSidebarWidth((current) => clampSidebarWidth(current + direction * 16));
      } else if (event.key === 'Home') {
        event.preventDefault();
        setSidebarWidth(clampSidebarWidth(getDefaultSidebarWidth()));
      }
    },
    [clampSidebarWidth],
  );

  React.useEffect(() => {
    if (!sidebarResizeStart) return;

    const handlePointerMove = (event: PointerEvent) => {
      const nextWidth = sidebarResizeStart.width + event.clientX - sidebarResizeStart.pointerX;
      setSidebarWidth(clampSidebarWidth(nextWidth));
    };
    const stopResize = () => setSidebarResizeStart(null);

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', stopResize, { once: true });
    window.addEventListener('pointercancel', stopResize, { once: true });

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', stopResize);
      window.removeEventListener('pointercancel', stopResize);
    };
  }, [sidebarResizeStart, clampSidebarWidth]);

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

  const previousRootIdRef = useRef(tree.id);

  // Open a newly loaded root once, without forcing the current root to stay open.
  React.useEffect(() => {
    if (previousRootIdRef.current === tree.id) return;
    previousRootIdRef.current = tree.id;
    setOpenFolders((prev) => {
      const next = new Set(prev);
      next.add(tree.id);
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
      }
      return next;
    });
  }, []);

  const collapseAll = useCallback(() => {
    setOpenFolders(new Set<string>());
  }, []);

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
      showSnack(t('messages.enterWord'), 'warning');
      return;
    }

    const fileName = selectedFile.name;
    updateVocabMap((prev) => {
      const vocabList = prev[fileName] || [];
      if (vocabFormMode === 'add') {
        const newList = [...vocabList, { ...data }];
        return { ...prev, [fileName]: newList };
      } else {
        if (vocabFormIndex === null) return prev;
        const newList = [...vocabList];
        newList[vocabFormIndex] = { ...data };
        return { ...prev, [fileName]: newList };
      }
    });
    setVocabFormOpen(false);
    showSnack(vocabFormMode === 'add' ? t('messages.vocabAdded') : t('messages.vocabUpdated'));
  }, [selectedFile, vocabFormMode, vocabFormIndex, updateVocabMap, t]);

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
        showSnack(t('messages.vocabDeletedCount', { count: wordsToDelete.length }));
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

  // Keep the original index while sorting so rendering remains O(n log n).
  const sortedVocabEntries = useMemo(() => {
    if (!selectedFile) return [];
    const vocabList = vocabMap[selectedFile.name] || [];
    return vocabList.map((item, originalIndex) => ({ item, originalIndex })).sort((a, b) => {
      const wordA = a.item.word.toLowerCase().trim();
      const wordB = b.item.word.toLowerCase().trim();
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
    const located = treeIndex.findByPath(menu.path);
    if (!located) return;
    const currentName = located.node.kind === 'folder' ? located.node.label : located.node.name;
    setRenameValue(currentName);
    setRenameTarget({ type: menu.type, path: [...menu.path] });
    setRenameOpen(true);
    closeMenu();
  }, [menu, treeIndex, closeMenu]);

  const closeRenameDialog = useCallback(() => {
    setRenameOpen(false);
    setRenameTarget(null);
  }, []);

  const confirmRename = useCallback((nextValue: string) => {
    if (!renameTarget) return;
    const located = findNodeByPath(tree, renameTarget.path);
    if (!located) return;
    const siblings = located.parent
      ? located.parent.children.filter((c) => c.id !== located.node.id)
      : [];
    const folderFallback = t('defaults.folder');
    const finalName = ensureUniqueName(
      siblings,
      nextValue.trim() || (renameTarget.type === 'folder' ? folderFallback : 'file.txt'),
      renameTarget.type === 'folder',
    );

    updateTree((prevTree) => {
      const copy = structuredClone(prevTree);
      const located2 = findNodeByPath(copy, renameTarget.path);
      if (!located2) return prevTree;
      if (renameTarget.type === 'folder' && located2.node.kind === 'folder') {
        located2.node.label = finalName;
      } else if (renameTarget.type === 'file' && located2.node.kind === 'file') {
        located2.node.name = finalName;
      }
      return copy;
    });
    
    if (renameTarget.type === 'file' && located.node.kind === 'file') {
      const old = located.node.name;
      if (old !== finalName) {
        const storedValues = vocabMap[old] ?? loadVocabFile(old) ?? [];
        updateVocabMap((m) => {
          const values = m[old] ?? storedValues;
          const rest = { ...m };
          delete rest[old];
          return { ...rest, [finalName]: values };
        });
        deleteVocabFile(old);

        setVocabCountMap((prev) => {
          if (prev[old] === undefined) return prev;
          const { [old]: count, ...rest } = prev;
          return { ...rest, [finalName]: count };
        });
      }
    }
    closeRenameDialog();
    showSnack(t('messages.renamed'));
  }, [renameTarget, tree, t, vocabMap, updateTree, updateVocabMap, closeRenameDialog]);

  const startNewSubfolder = useCallback(() => {
    if (!menu) return;
    const targetPath = menu.type === 'folder' ? menu.path : menu.path.slice(0, -1); // parent folder if file
    // Use index for faster lookup
    const located = treeIndex.findByPath(targetPath);
    if (!located || located.node.kind !== 'folder') return;
    setNewFolderOpen(true);
  }, [menu, treeIndex]);

  const confirmNewSubfolder = useCallback((folderName: string) => {
    if (!menu) return;
    const targetPath = menu.type === 'folder' ? menu.path : menu.path.slice(0, -1);
    updateTree((prevTree) => {
      const copy = structuredClone(prevTree);
      const located = findNodeByPath(copy, targetPath);
      if (!located || located.node.kind !== 'folder') return prevTree;
      const newFolderName = folderName || t('defaults.newFolder');
      const name = ensureUniqueName(located.node.children, newFolderName, true);
      located.node.children.push({ kind: 'folder', label: name, id: genId(), children: [] });
      return copy;
    });
    setNewFolderOpen(false);
    showSnack(t('messages.folderCreated'));
  }, [menu, updateTree]);

  const startNewFile = useCallback(() => {
    if (!menu) return;
    const targetPath = menu.type === 'folder' ? menu.path : menu.path.slice(0, -1); // parent folder if file
    // Use index for faster lookup
    const located = treeIndex.findByPath(targetPath);
    if (!located || located.node.kind !== 'folder') return;
    setNewFileOpen(true);
  }, [menu, treeIndex]);

  const confirmNewFile = useCallback((fileName: string) => {
    if (!menu) return;
    const targetPath = menu.type === 'folder' ? menu.path : menu.path.slice(0, -1);
    // Ensure .txt extension
    let baseFileName = fileName.endsWith('.txt') ? fileName : `${fileName}.txt`;
    
    // Get current tree to determine unique file name - use index for faster lookup
    const located = treeIndex.findByPath(targetPath);
    if (!located || located.node.kind !== 'folder') {
            showSnack(t('messages.folderNotFound'), 'error');
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
    showSnack(t('messages.fileCreated', { name: finalFileName }));
  }, [menu, treeIndex, updateTree, updateVocabMap]);

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
                        showSnack(t('messages.importInvalidJson'), 'error');
            return;
          }
          
          const items: VocabItem[] = importData.vocabulary;

          const targetFolderPath = menu.type === 'folder' ? menu.path : menu.path.slice(0, -1);
          // Use fileName from JSON or fallback to file.name
          const base = importData.fileName || file.name.replace(/\.json$/i, '.txt');
          // Get current tree to determine final file name - use index for faster lookup
          const located = treeIndex.findByPath(targetFolderPath);
          if (!located || located.node.kind !== 'folder') {
            showSnack(t('messages.folderNotFound'), 'error');
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
                    showSnack(t('messages.importFileSuccess', { name: finalFileName, count: items.length }));
          closeMenu();
        } catch (err) {
          console.error(err);
          showSnack(t('messages.readFileFailed'), 'error');
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
            showSnack(t('messages.noVocabToExport'), 'warning');
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
    
        showSnack(t('messages.exportFileSuccess', { name: fileName }));
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
    
        showSnack(t('messages.exportFolderSuccess', { name: folderName, count: allFileNames.length }));
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
            showSnack(t('messages.importInvalidFormat'), 'error');
            return;
          }
          
          const folderNode: FolderNode = importData.folderStructure;
          const folderVocabData: Record<string, VocabItem[]> = importData.vocabularyData;
          
          const targetFolderPath = menu.type === 'folder' ? menu.path : menu.path.slice(0, -1);
          // Use index for faster lookup
          const located = treeIndex.findByPath(targetFolderPath);
          
          if (!located || located.node.kind !== 'folder') {
            showSnack(t('messages.folderNotFound'), 'error');
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
                    showSnack(t('messages.importFolderSuccess', { name: uniqueFolderName, fileCount: allFiles.length, wordCount: totalWords }));
          closeMenu();
        } catch (err) {
          console.error(err);
          showSnack(t('messages.readFileFailed'), 'error');
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
    showSnack(t('messages.copied'));
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
    showSnack(t('messages.cutInstruction'));
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
    showSnack(t('messages.pasted'));
    closeMenu();
  }, [menu, clip, vocabMap, closeMenu, updateTree, updateVocabMap]);

  // Delete: mở confirm cho file / folder
  const startDelete = useCallback(() => {
    if (!menu) return;
    
    // Prevent deleting root folder
    if (menu.path.length === 1 && menu.type === 'folder') {
            showSnack(t('messages.cannotDeleteRoot'), 'error');
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
    showSnack(t('messages.deleted'));
  }, [pendingDelete, tree, selectedPath, updateTree, updateVocabMap]);

  // ===== Render =====
  return (
    <Box
      ref={pageRootRef}
      sx={{
        minHeight: { xs: 'calc(100dvh - 56px)', sm: 'calc(100dvh - 64px)', md: '100dvh' },
        height: { xs: 'calc(100dvh - 56px)', sm: 'calc(100dvh - 64px)', md: '100dvh' },
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        overflow: 'hidden',
        bgcolor: 'background.default',
        cursor: sidebarResizeStart ? 'col-resize' : 'default',
        userSelect: sidebarResizeStart ? 'none' : 'auto',
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
          borderRight: { xs: 'none', md: sidebarOpen ? `1px solid ${theme.palette.divider}` : 'none' },
          borderBottom: { xs: `1px solid ${theme.palette.divider}`, md: 'none' },
          height: { xs: mobileViewMode === 'folder' ? '100%' : 0, md: '100%' },
          minHeight: 0,
          borderRadius: 0,
          display: {
            xs: mobileViewMode === 'folder' ? 'flex' : 'none',
            md: 'flex',
          },
          flexDirection: 'column',
          overflow: 'hidden',
          bgcolor: 'background.paper',
          transition: sidebarResizeStart
            ? 'none'
            : theme.transitions.create('width', {
                duration: theme.transitions.duration.standard,
                easing: theme.transitions.easing.easeInOut,
              }),
        }}
      >
        {sidebarOpen && (
          <>
            <Box sx={{ 
              px: 1.5,
              py: 0,
              height: 56,
              minHeight: 56,
              boxSizing: 'border-box',
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              bgcolor: 'background.paper',
              borderBottom: `1px solid ${theme.palette.divider}`,
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, width: '100%' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 0 }}>
                  <MenuBookIcon size={20} style={{ marginRight: 8, flexShrink: 0, color: 'inherit' }} />
                  <Typography variant="subtitle1" noWrap sx={{ minWidth: 0, fontWeight: 700 }}>
                    {t('title')}
                  </Typography>
                </Box>
                <Stack direction="row" spacing={0.25} sx={{ flexShrink: 0 }}>
                  <Tooltip title={viewMode === 'tree' ? t('viewMode.grid') : t('viewMode.tree')} arrow>
                    <IconButton
                      size="small"
                      onClick={toggleViewMode}
                      aria-label={t('viewMode.toggle')}
                    >
                      {viewMode === 'tree' ? <ViewModuleIcon fontSize="small" /> : <ViewListIcon fontSize="small" />}
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={t('actions.collapseAll')} arrow>
                    <IconButton
                      size="small"
                      onClick={collapseAll}
                      aria-label={t('actions.collapseAll')}
                    >
                      <UnfoldLessIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  {!isMdDown && (
                    <Tooltip title={t('actions.hideVocabulary')} arrow>
                      <IconButton
                        size="small"
                        onClick={toggleSidebar}
                        sx={{ ml: 0.5 }}
                        aria-label={t('actions.hideVocabulary')}
                      >
                        <ChevronLeftIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                </Stack>
              </Box>
            </Box>

            <Box sx={{ 
              flex: '1 1 auto',
              minHeight: 0,
              overflowY: 'auto',
              overflowX: 'hidden',
              px: 0.5,
              py: 1,
              scrollbarGutter: 'stable',
            }}>
              <List disablePadding>
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

      {sidebarOpen && !isMdDown && (
        <Tooltip title={t('actions.resizeVocabulary')} arrow placement="right" disableInteractive>
          <Box
            role="separator"
            aria-label={t('actions.resizeVocabulary')}
            aria-orientation="vertical"
            aria-valuemin={MIN_SIDEBAR_WIDTH}
            aria-valuemax={MAX_SIDEBAR_WIDTH}
            aria-valuenow={sidebarWidth}
            tabIndex={0}
            onPointerDown={startSidebarResize}
            onDoubleClick={() => setSidebarWidth(clampSidebarWidth(getDefaultSidebarWidth()))}
            onKeyDown={handleSidebarResizeKeyDown}
            sx={{
              position: 'relative',
              zIndex: 3,
              width: 8,
              height: '100%',
              ml: '-4px',
              mr: '-4px',
              flexShrink: 0,
              cursor: 'col-resize',
              touchAction: 'none',
              outline: 'none',
              '&::after': {
                content: '""',
                position: 'absolute',
                top: '50%',
                left: '50%',
                width: 2,
                height: sidebarResizeStart ? 48 : 32,
                transform: 'translate(-50%, -50%)',
                borderRadius: 1,
                bgcolor: sidebarResizeStart ? 'primary.main' : 'divider',
                transition: theme.transitions.create(['height', 'background-color'], {
                  duration: theme.transitions.duration.shortest,
                }),
              },
              '&:hover::after, &:focus-visible::after': {
                height: 48,
                bgcolor: 'primary.main',
              },
            }}
          />
        </Tooltip>
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
          height: '100%',
          position: 'relative',
        }}
      >
        <Box 
          sx={{ 
            px: { xs: 1.25, sm: 2 },
            py: { xs: 1, md: 0 },
            height: { xs: 'auto', md: 56 },
            minHeight: 56,
            boxSizing: 'border-box',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            bgcolor: 'background.paper',
            borderBottom: `1px solid ${theme.palette.divider}`,
          }}
        >
          {!sidebarOpen && !isMdDown && (
            <Tooltip title={t('actions.showVocabulary')} arrow placement="right">
              <IconButton
                size="small"
                onClick={toggleSidebar}
                sx={{
                  width: 32,
                  height: 32,
                  mr: 1,
                  flexShrink: 0,
                  color: 'text.secondary',
                  '&:hover': {
                    color: 'primary.main',
                    backgroundColor: 'action.hover',
                  },
                }}
                aria-label={t('actions.showVocabulary')}
              >
                <ChevronRightIcon size={18} />
              </IconButton>
            </Tooltip>
          )}
          <Box sx={{ flex: 1, minWidth: 0 }}>
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
                    aria-label={t('actions.backToFolders')}
                  >
                    <ArrowBackIcon size={20} />
                  </IconButton>
                )}
                <CategoryIcon size={20} style={{ marginRight: 8, flexShrink: 0, color: 'inherit' }} />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Tooltip title={selectedTitle} placement="bottom-start" enterDelay={500}>
                    <Typography
                      variant="body2"
                      color="primary"
                      noWrap
                      sx={{ minWidth: 0, fontWeight: 700, lineHeight: 1.25 }}
                    >
                      {selectedTitle}
                    </Typography>
                  </Tooltip>
                  {vocabCountMap[selectedFile.name] !== undefined && (
                    <Typography 
                      variant="caption" 
                      color="text.secondary" 
                      sx={{ 
                        display: 'block',
                        mt: 0.125,
                        fontSize: '0.6875rem',
                        lineHeight: 1.2,
                      }}
                    >
                      {t('table.wordCount', { count: vocabCountMap[selectedFile.name] })}
                    </Typography>
                  )}
              </Box>
                </Box>
                <Stack
                  direction="row"
                  spacing={{ xs: 0.5, sm: 0.75 }}
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
                    size="small"
                    startIcon={<DeleteIcon size={17} />}
                    onClick={handleDeleteSelectedVocabs}
                  sx={{
                    flex: { xs: '1 1 auto', sm: '0 0 auto' },
                    minWidth: 0,
                    minHeight: 34,
                    fontSize: '0.8125rem',
                    lineHeight: 1.25,
                    px: 1.25,
                  }}
                >
                  {t('actions.deleteSelectedCount', { count: selectedVocabs.size })}
                </Button>
                )}
                <Button
                  variant="contained"
                  color="primary"
                  size="small"
                  startIcon={<RocketLaunchIcon size={17} />}
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
                  flex: { xs: '1 1 auto', sm: '0 0 auto' },
                  minWidth: 0,
                  minHeight: 34,
                  fontWeight: 600,
                  fontSize: '0.8125rem',
                  lineHeight: 1.25,
                  px: 1.25,
                }}
              >
                  {t('actions.train')}
                </Button>
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<AddIcon size={17} />}
                  onClick={openAddVocabForm}
                sx={{
                  flex: { xs: '1 1 auto', sm: '0 0 auto' },
                  minWidth: 0,
                  minHeight: 34,
                  fontSize: '0.8125rem',
                  lineHeight: 1.25,
                  px: 1.25,
                }}
              >
                  {isSmDown ? t('actions.addWordShort') : t('actions.addWord')}
                </Button>
                </Stack>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <CategoryIcon size={24} style={{ marginRight: 8, color: 'inherit' }} />
                <Typography variant={isSmDown ? 'h6' : 'h5'} sx={{ fontWeight: 600 }}>
                  {t('title')}
                </Typography>
              </Box>
            )}
          </Box>
        </Box>

        <Box sx={{ 
          flex: 1, 
          overflow: 'hidden',
          p: { xs: 1, sm: 1.5, md: 2 },
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
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
                borderRadius: 1,
                overflow: 'hidden',
              }}
            >
              <TableContainer sx={{ 
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                maxHeight: '100%',
                overflow: 'auto',
                scrollbarGutter: 'stable',
              }}>
                <Table
                  aria-label={t('table.ariaLabel')}
                  stickyHeader
                  size={isSmDown ? 'small' : 'medium'}
                  sx={{ width: '100%', tableLayout: 'fixed' }}
                >
                  <TableHead>
                    <TableRow>
                      <StyledTableCell padding="checkbox">
                        <Checkbox
                          indeterminate={selectedVocabs.size > 0 && selectedVocabs.size < sortedVocabEntries.length}
                          checked={sortedVocabEntries.length > 0 && selectedVocabs.size === sortedVocabEntries.length}
                          onChange={handleSelectAllVocabs}
                          size={isSmDown ? 'small' : 'medium'}
                        />
                      </StyledTableCell>
                      <StyledTableCell sx={{ width: { xs: '38%', sm: '32%', lg: '24%' } }}>
                        {t('table.word')}
                      </StyledTableCell>
                      <StyledTableCell>{t('table.meaning')}</StyledTableCell>
                      <StyledTableCell sx={{ display: { xs: 'none', lg: 'table-cell' }, width: 112 }}>
                        {t('table.type')}
                      </StyledTableCell>
                      <StyledTableCell sx={{ display: { xs: 'none', lg: 'table-cell' }, width: 160 }}>
                        {t('table.pronunciation')}
                      </StyledTableCell>
                      <StyledTableCell align="center" sx={{ width: 56 }}>
                        {t('table.actions')}
                      </StyledTableCell>
                    </TableRow>
                  </TableHead>
                  <VocabTableBody
                    entries={sortedVocabEntries}
                    selectedVocabs={selectedVocabs}
                    compact={isSmDown}
                    getSpeakAriaLabel={getSpeakAriaLabel}
                    getMenuAriaLabel={getMenuAriaLabel}
                    onToggleSelection={handleToggleVocabSelection}
                    onOpenDetail={openVocabDetail}
                    onOpenMenu={handleRowMenuOpen}
                  />
                </Table>
                <Menu
                  anchorEl={rowMenuAnchor?.anchorEl}
                  open={rowMenuAnchor !== null}
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
                  <MenuItem
                    onClick={() => {
                      if (!rowMenuAnchor) return;
                      const { item, index } = rowMenuAnchor;
                      handleRowMenuClose();
                      openEditVocabForm(item, index);
                    }}
                  >
                    <ListItemIcon>
                      <EditIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>{t('actions.editWord')}</ListItemText>
                  </MenuItem>
                  <MenuItem onClick={handleRowMenuClose} disabled>
                    <ListItemText>{t('contextMenu.futureItem', { index: 1 })}</ListItemText>
                  </MenuItem>
                  <MenuItem onClick={handleRowMenuClose} disabled>
                    <ListItemText>{t('contextMenu.futureItem', { index: 2 })}</ListItemText>
                  </MenuItem>
                  <MenuItem onClick={handleRowMenuClose} disabled>
                    <ListItemText>{t('contextMenu.futureItem', { index: 3 })}</ListItemText>
                  </MenuItem>
                </Menu>
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
                {t('table.noFileSelectedTitle')}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t('table.noFileSelectedDescription')}
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
              primary={t('contextMenu.newSubfolder')}
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
              primary={t('contextMenu.newFile')}
              primaryTypographyProps={{
                fontSize: { xs: '0.875rem', sm: '1rem' },
              }}
            />
          </MenuItem>,
          <Divider key="divider-1" />,
          <MenuItem key="export-folder" onClick={handleExportFolder}>
            <ListItemIcon><ExportIcon fontSize="small" /></ListItemIcon>
            <ListItemText primary={t('contextMenu.exportFolder')} />
          </MenuItem>,
          <MenuItem key="import-folder" onClick={startImportFolder}>
              <ListItemIcon><ImportIcon fontSize="small" /></ListItemIcon>
            <ListItemText primary={t('contextMenu.importFolder')} />
          </MenuItem>,
          <MenuItem key="import-file" onClick={startImport}>
            <ListItemIcon><ImportIcon fontSize="small" /></ListItemIcon>
            <ListItemText primary={t('contextMenu.importFile')} />
          </MenuItem>,
          <Divider key="divider-2" />,
          <MenuItem key="rename" onClick={startRename}>
              <ListItemIcon><RenameIcon fontSize="small" /></ListItemIcon>
              <ListItemText primary={t('contextMenu.rename')} />
          </MenuItem>,
          <MenuItem key="cut" onClick={doCut}>
              <ListItemIcon><CutIcon fontSize="small" /></ListItemIcon>
              <ListItemText primary={t('contextMenu.cut')} />
          </MenuItem>,
          <MenuItem key="copy" onClick={doCopy}>
              <ListItemIcon><CopyIcon fontSize="small" /></ListItemIcon>
              <ListItemText primary={t('contextMenu.copy')} />
          </MenuItem>,
          <MenuItem key="paste" disabled={!clip} onClick={doPaste}>
              <ListItemIcon><PasteIcon fontSize="small" /></ListItemIcon>
              <ListItemText primary={t('contextMenu.paste')} />
          </MenuItem>,
          <Divider key="divider-3" />,
          <MenuItem key="delete" onClick={startDelete}>
              <ListItemIcon><DeleteIcon fontSize="small" /></ListItemIcon>
              <ListItemText primary={t('contextMenu.deleteFolder')} />
          </MenuItem>,
        ] : [
          <MenuItem key="export-file" onClick={handleExportFile}>
              <ListItemIcon><ExportIcon fontSize="small" /></ListItemIcon>
            <ListItemText primary={t('contextMenu.exportFile')} />
          </MenuItem>,
          <Divider key="divider-1" />,
          <MenuItem key="rename" onClick={startRename}>
              <ListItemIcon><RenameIcon fontSize="small" /></ListItemIcon>
              <ListItemText primary={t('contextMenu.rename')} />
          </MenuItem>,
          <MenuItem key="cut" onClick={doCut}>
              <ListItemIcon><CutIcon fontSize="small" /></ListItemIcon>
              <ListItemText primary={t('contextMenu.cut')} />
          </MenuItem>,
          <MenuItem key="copy" onClick={doCopy}>
              <ListItemIcon><CopyIcon fontSize="small" /></ListItemIcon>
              <ListItemText primary={t('contextMenu.copy')} />
          </MenuItem>,
          <Divider key="divider-2" />,
          <MenuItem key="delete" onClick={startDelete}>
              <ListItemIcon><DeleteIcon fontSize="small" /></ListItemIcon>
              <ListItemText primary={t('contextMenu.deleteFile')} />
          </MenuItem>,
        ]}
      </Menu>

      {/* Dialogs */}
      <RenameDialog
        open={renameOpen}
        value={renameValue}
        onClose={closeRenameDialog}
        onConfirm={confirmRename}
      />

      <NewFolderDialog
        open={newFolderOpen}
        onClose={() => setNewFolderOpen(false)}
        onConfirm={confirmNewSubfolder}
      />

      <NewFileDialog
        open={newFileOpen}
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
 
