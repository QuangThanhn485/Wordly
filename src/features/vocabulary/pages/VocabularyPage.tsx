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
  MenuList,
  ListItemIcon,
  Popper,
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
  BookOpenCheck as TopicIcon,
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
  FileDown as SampleDownloadIcon,
} from 'lucide-react';

// Import types
import type { VocabItem, FolderNode, TopicItem, SnackState } from '../types';

import { getDefaultTree } from '../constants/seedData';

// Import utilities
import {
  genId,
  cloneNodeWithTopicMapping,
  findNodeByPath,
  isDescendant,
  ensureUniqueName,
  getAllTopicIds,
  removeAtPath,
} from '../utils/treeUtils';
import { TreeIndex } from '../utils/treeIndex';
import {
  saveVocabularyTopic,
  loadVocabularyTopic,
  deleteVocabularyTopic,
  loadVocabularyTopicCounts,
  normalizeVocabularyItems,
  saveVocabularyImportAtomically,
  saveTreeToStorage,
  loadTreeFromStorage,
} from '../utils/storageUtils';
import {
  createVocabularyFolderExport,
  createVocabularyTopicExport,
  parseVocabularyFolderImport,
  parseVocabularyTopicImport,
} from '../utils/importExport';
import { speak } from '@/utils/speechUtils';
import { saveTrainingSession as saveReadingSession } from '@/features/train/train-start/sessionStorage';
import { saveTrainingSession as saveListeningSession } from '@/features/train/train-listen/sessionStorage';
import { saveTrainingSession as saveReadWriteSession } from '@/features/train/train-read-write/sessionStorage';
import { saveTrainingSession as saveListenWriteSession } from '@/features/train/train-listen-write/sessionStorage';

// Import components
import { FolderItem } from '../components/FolderTree';
import { type BreadcrumbItem } from '../components/FolderGrid';
import { FolderGridModal } from '../components/FolderGridModal';
import {
  RenameDialog,
  NewFolderDialog,
  NewTopicDialog,
  ConfirmDeleteDialog,
  VocabFormDialog,
} from '../components/dialogs';
import { VocabDetailPanel } from '../components/VocabDetailPanel';
import { loadPreferences, updatePreferences } from '@/data';

const getJsonDownloadName = (label: string): string => {
  const safeLabel = label
    .normalize('NFC')
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_')
    .trim();
  return `${safeLabel || 'vocabulary-topic'}.json`;
};

const downloadJsonFile = (data: unknown, fileName: string): void => {
  const jsonContent = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonContent], {
    type: 'application/json;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const getVocabItemIdentity = (item: VocabItem): string =>
  item.id || item.word;

const createVocabularyImportSample = () => {
  const folder: FolderNode = {
    kind: 'folder',
    id: 'sample-folder-root',
    label: 'Dữ liệu mẫu',
    children: [
      {
        kind: 'topic',
        id: 'sample-topic-animals',
        label: 'Động vật cơ bản',
      },
      {
        kind: 'folder',
        id: 'sample-folder-actions',
        label: 'Nhóm chủ đề mẫu',
        children: [
          {
            kind: 'topic',
            id: 'sample-topic-actions',
            label: 'Hành động cơ bản',
          },
        ],
      },
    ],
  };
  const vocabularyData: Record<string, VocabItem[]> = {
    'sample-topic-animals': [
      {
        word: 'cat',
        type: 'noun',
        vnMeaning: 'con mèo',
        pronunciation: '/kæt/',
      },
      {
        word: 'dog',
        type: 'noun',
        vnMeaning: 'con chó',
        pronunciation: '/dɔːɡ/',
      },
    ],
    'sample-topic-actions': [
      {
        word: 'create',
        type: 'verb',
        vnMeaning: 'tạo ra',
        pronunciation: '/kriˈeɪt/',
      },
    ],
  };
  return createVocabularyFolderExport(folder, vocabularyData);
};

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
          onChange={() => onToggleSelection(getVocabItemIdentity(item))}
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
          key={item.id || `${item.word}:${originalIndex}`}
          item={item}
          originalIndex={originalIndex}
          selected={selectedVocabs.has(getVocabItemIdentity(item))}
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

const MIN_SIDEBAR_WIDTH = 240;
const MAX_SIDEBAR_WIDTH = 480;
const MIN_CONTENT_WIDTH = 360;

const getDefaultSidebarWidth = (): number => {
  const viewportWidth = typeof window === 'undefined' ? 1280 : window.innerWidth;
  return Math.round(Math.min(336, Math.max(288, viewportWidth * 0.24)));
};

const loadViewMode = (): 'tree' | 'grid' => {
  try {
    return loadPreferences().vocabularyViewMode;
  } catch {
    return 'tree';
  }
};

const saveViewModeToStorage = (mode: 'tree' | 'grid') => {
  try {
    updatePreferences((current) => ({
      ...current,
      vocabularyViewMode: mode,
    }));
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
  
  // Vocabulary is loaded per topic ID on demand.
  const [vocabMap, setVocabMap] = useState<Record<string, VocabItem[]>>({});
  const vocabMapRef = React.useRef(vocabMap);
  
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
  const treeRef = React.useRef(tree);
  treeRef.current = tree;
  
  // Path index cache for O(1) node lookups - rebuilds when tree changes
  const treeIndex = useMemo(() => {
    return new TreeIndex(tree);
  }, [tree]);
  
  // Update in-memory topics and persist only the changed topic records.
  // Persist only changed topics so large vocabulary libraries remain responsive.
  const updateVocabMap = useCallback((updater: (prev: Record<string, VocabItem[]>) => Record<string, VocabItem[]>) => {
    const prev = vocabMapRef.current;
    const next = updater(prev);
    if (next === prev) return;

    const changedTopicIds = new Set<string>();
    const deletedTopicIds = new Set<string>();

    for (const topicId in next) {
      if (Object.prototype.hasOwnProperty.call(next, topicId)) {
        if (prev[topicId] !== next[topicId]) {
          changedTopicIds.add(topicId);
        }
      }
    }

    for (const topicId in prev) {
      if (
        Object.prototype.hasOwnProperty.call(prev, topicId) &&
        !Object.prototype.hasOwnProperty.call(next, topicId)
      ) {
        deletedTopicIds.add(topicId);
      }
    }

    let preparedNext = next;
    deletedTopicIds.forEach(deleteVocabularyTopic);
    changedTopicIds.forEach((topicId) => {
      const preparedItems = normalizeVocabularyItems(
        next[topicId],
        Date.now(),
        prev[topicId] || [],
      );
      if (preparedNext === next) preparedNext = { ...next };
      preparedNext[topicId] = preparedItems;
      saveVocabularyTopic(topicId, preparedItems);
    });

    vocabMapRef.current = preparedNext;
    setVocabMap(preparedNext);
    setVocabCountMap((prevCounts) => {
      const updated = { ...prevCounts };
      let hasChanges = false;

      deletedTopicIds.forEach((topicId) => {
        if (Object.prototype.hasOwnProperty.call(updated, topicId)) {
          delete updated[topicId];
          hasChanges = true;
        }
      });

      changedTopicIds.forEach((topicId) => {
        const newCount = preparedNext[topicId]?.length || 0;
        if (updated[topicId] !== newCount) {
          updated[topicId] = newCount;
          hasChanges = true;
        }
      });

      return hasChanges ? updated : prevCounts;
    });
  }, []);
  
  // Update the UI tree and persist its normalized catalog.
  const updateTree = useCallback((updater: (prev: FolderNode) => FolderNode) => {
    const prev = treeRef.current;
    const next = updater(prev);
    if (next === prev) return;
    saveTreeToStorage(next);
    treeRef.current = next;
    setTree(next);
  }, []);

  const commitVocabularyImport = useCallback((
    nextTree: FolderNode,
    importedVocabulary: Record<string, VocabItem[]>,
  ): Record<string, VocabItem[]> => {
    const preparedVocabulary = saveVocabularyImportAtomically(
      nextTree,
      importedVocabulary,
    );
    const nextVocabMap = {
      ...vocabMapRef.current,
      ...preparedVocabulary,
    };

    treeRef.current = nextTree;
    vocabMapRef.current = nextVocabMap;
    setTree(nextTree);
    setVocabMap(nextVocabMap);
    setVocabCountMap((current) => {
      const next = { ...current };
      Object.entries(preparedVocabulary).forEach(([topicId, vocabulary]) => {
        next[topicId] = vocabulary.length;
      });
      return next;
    });
    return preparedVocabulary;
  }, []);

  const [selectedPath, setSelectedPath] = useState<string[] | null>(null);
  const selectedTopic = useMemo(() => {
    if (!selectedPath) return null;
    // Use index for faster lookup
    const located = treeIndex.findByPath(selectedPath);
    return located?.node.kind === 'topic' ? located.node : null;
  }, [selectedPath, treeIndex]);
  const selectedTitle = selectedTopic?.label || '';
  
  // Mobile view mode: 'folder' = show folder tree, 'vocab' = show vocab list
  const [mobileViewMode, setMobileViewMode] = useState<'folder' | 'vocab'>('folder');
  
  // Load vocab counts from storage (FAST - no need to load full vocab data)
  // This allows displaying counts immediately without clicking files
  const [vocabCountMap, setVocabCountMap] = useState<Record<string, number>>(() => {
    return loadVocabularyTopicCounts();
  });
  
  // Sync counts from vocabMap when it changes (in-memory data takes precedence)
  // OPTIMIZED: Use ref to track if sync is needed, avoid blocking input
  vocabMapRef.current = vocabMap;
  
  React.useEffect(() => {
    // Use requestIdleCallback or setTimeout to avoid blocking UI
    const timeoutId = setTimeout(() => {
      setVocabCountMap((prevCounts) => {
        const updated = { ...prevCounts };
        let hasChanges = false;
        
        // Update counts from vocabMap (if loaded)
        const currentMap = vocabMapRef.current;
        for (const topicId in currentMap) {
          if (currentMap.hasOwnProperty(topicId)) {
            const newCount = currentMap[topicId]?.length || 0;
            if (updated[topicId] !== newCount) {
              updated[topicId] = newCount;
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
    | { type: 'folder' | 'topic'; path: string[]; mouseX: number; mouseY: number; anchorEl?: HTMLElement | null }
    | null
  >(null);
  const [menuAnchorEl, setMenuAnchorEl] = useState<HTMLElement | null>(null);
  const [importSubmenuAnchorEl, setImportSubmenuAnchorEl] =
    useState<HTMLElement | null>(null);
  const importSubmenuCloseTimer = useRef<number | null>(null);

  const cancelImportSubmenuClose = useCallback(() => {
    if (importSubmenuCloseTimer.current !== null) {
      window.clearTimeout(importSubmenuCloseTimer.current);
      importSubmenuCloseTimer.current = null;
    }
  }, []);

  const closeImportSubmenu = useCallback(() => {
    cancelImportSubmenuClose();
    setImportSubmenuAnchorEl(null);
  }, [cancelImportSubmenuClose]);

  const scheduleImportSubmenuClose = useCallback(() => {
    cancelImportSubmenuClose();
    importSubmenuCloseTimer.current = window.setTimeout(() => {
      setImportSubmenuAnchorEl(null);
      importSubmenuCloseTimer.current = null;
    }, 280);
  }, [cancelImportSubmenuClose]);

  React.useEffect(
    () => () => {
      if (importSubmenuCloseTimer.current !== null) {
        window.clearTimeout(importSubmenuCloseTimer.current);
      }
    },
    [],
  );

  const openContext = useCallback((type: 'folder' | 'topic', path: string[], event: React.MouseEvent | React.MouseEvent<HTMLElement>) => {
    event.preventDefault();
    event.stopPropagation();
    cancelImportSubmenuClose();
    setImportSubmenuAnchorEl(null);
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
    cancelImportSubmenuClose();
    setImportSubmenuAnchorEl(null);
    setMenu(null);
    setMenuAnchorEl(null);
  }, [cancelImportSubmenuClose]);

  // ===== Clipboard for cut/copy/paste =====
  const [clip, setClip] = useState<null | { mode: 'cut' | 'copy'; node: FolderNode | TopicItem }>(null);

  // ===== Dialogs =====
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [renameTarget, setRenameTarget] = useState<{
    type: 'folder' | 'topic';
    path: string[];
  } | null>(null);
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newTopicOpen, setNewTopicOpen] = useState(false);
  const [newItemTargetPath, setNewItemTargetPath] = useState<string[] | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<null | {
    path: string[];
    type: 'folder' | 'topic';
    label: string;
    topicIds: string[];
  }>(null);
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
  }, [cancelImportSubmenuClose]);

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
    if (!selectedTopic) return;
    setVocabFormMode('add');
    setVocabFormIndex(null);
    setVocabFormData({ word: '', type: '', vnMeaning: '', pronunciation: '' });
    setVocabFormOpen(true);
  }, [selectedTopic]);

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
    if (!selectedTopic || !data.word.trim()) {
      showSnack(t('messages.enterWord'), 'warning');
      return;
    }

    const topicId = selectedTopic.id;
    updateVocabMap((prev) => {
      const vocabList = prev[topicId] || [];
      if (vocabFormMode === 'add') {
        const newList = [...vocabList, { ...data }];
        return { ...prev, [topicId]: newList };
      } else {
        if (vocabFormIndex === null) return prev;
        const newList = [...vocabList];
        newList[vocabFormIndex] = { ...data };
        return { ...prev, [topicId]: newList };
      }
    });
    setVocabFormOpen(false);
    showSnack(vocabFormMode === 'add' ? t('messages.vocabAdded') : t('messages.vocabUpdated'));
  }, [selectedTopic, vocabFormMode, vocabFormIndex, updateVocabMap, t]);

  const handleDeleteSelectedVocabs = useCallback(() => {
    if (!selectedTopic || selectedVocabs.size === 0) return;
    // Open confirmation dialog
    setVocabDeleteOpen(true);
  }, [selectedTopic, selectedVocabs]);

  const confirmDeleteVocabs = useCallback(() => {
    if (!selectedTopic || selectedVocabs.size === 0) return;
    
    const topicId = selectedTopic.id;
    const vocabList = vocabMap[topicId] || [];
    const itemIdsToDelete = new Set(selectedVocabs);
    
    updateVocabMap((prev) => {
      const newList = vocabList.filter(
        (item) => !itemIdsToDelete.has(getVocabItemIdentity(item)),
      );
      return { ...prev, [topicId]: newList };
    });
    
    setSelectedVocabs(new Set());
    setVocabDeleteOpen(false);
        showSnack(t('messages.vocabDeletedCount', { count: itemIdsToDelete.size }));
  }, [selectedTopic, selectedVocabs, vocabMap, updateVocabMap]);

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
    if (!selectedTopic) return;
    const vocabList = vocabMap[selectedTopic.id] || [];
    if (selectedVocabs.size === vocabList.length) {
      // Deselect all
      setSelectedVocabs(new Set());
    } else {
      // Select all
      setSelectedVocabs(
        new Set(vocabList.map((item) => getVocabItemIdentity(item))),
      );
    }
  }, [selectedTopic, vocabMap, selectedVocabs]);

  React.useEffect(() => {
    setDetailVocab(null);
  }, [selectedTopic?.id]);

  // Load vocabulary data lazily when a topic is selected.
  React.useEffect(() => {
    setSelectedVocabs(new Set());

    if (selectedTopic && !vocabMap[selectedTopic.id]) {
      const vocabulary = loadVocabularyTopic(selectedTopic.id) || [];
      const next = {
        ...vocabMapRef.current,
        [selectedTopic.id]: vocabulary,
      };
      vocabMapRef.current = next;
      setVocabMap(next);
    }
  }, [selectedTopic, vocabMap]);

  // Keep the original index while sorting so rendering remains O(n log n).
  const sortedVocabEntries = useMemo(() => {
    if (!selectedTopic) return [];
    const vocabList = vocabMap[selectedTopic.id] || [];
    return vocabList.map((item, originalIndex) => ({ item, originalIndex })).sort((a, b) => {
      const wordA = a.item.word.toLowerCase().trim();
      const wordB = b.item.word.toLowerCase().trim();
      return wordA.localeCompare(wordB, 'vi'); // Use Vietnamese locale for proper sorting
    });
  }, [selectedTopic, vocabMap]);

  // ===== Actions =====
  const handleTopicClick = useCallback((topicPath: string[], _topicId: string) => {
    setSelectedPath(topicPath);
    setSelectedVocabs(new Set());
    // Trên mobile: chuyển sang danh sách từ khi chọn chủ đề.
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

  const handleGridTopicClick = useCallback((topic: TopicItem) => {
    const findTopicPath = (node: FolderNode, targetTopic: TopicItem, currentPath: string[]): string[] | null => {
      for (const child of node.children) {
        if (child.kind === 'topic' && child.id === targetTopic.id) {
          return [...currentPath, child.id];
        }
        if (child.kind === 'folder') {
          const result = findTopicPath(child, targetTopic, [...currentPath, child.id]);
          if (result) return result;
        }
      }
      return null;
    };
    const path = findTopicPath(tree, topic, [tree.id]);
    if (path) {
      setSelectedPath(path);
      setSelectedVocabs(new Set());
      // Close modal and display vocabulary in main panel (right side)
      setGridModalOpen(false);
      setViewMode('tree');
      saveViewModeToStorage('tree');
      // Trên mobile: chuyển sang danh sách từ khi chọn chủ đề.
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

  const handleGridContextMenu = useCallback((item: FolderNode | TopicItem, e: React.MouseEvent) => {
    e.preventDefault();
    // Find path to this item
    const findItemPath = (node: FolderNode, targetItem: FolderNode | TopicItem, currentPath: string[]): string[] | null => {
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
    const currentName = located.node.label;
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
      nextValue.trim() || (renameTarget.type === 'folder' ? folderFallback : t('defaults.topic')),
      renameTarget.type === 'folder',
    );

    updateTree((prevTree) => {
      const copy = structuredClone(prevTree);
      const located2 = findNodeByPath(copy, renameTarget.path);
      if (!located2) return prevTree;
      if (renameTarget.type === 'folder' && located2.node.kind === 'folder') {
        located2.node.label = finalName;
      } else if (renameTarget.type === 'topic' && located2.node.kind === 'topic') {
        located2.node.label = finalName;
      }
      return copy;
    });

    closeRenameDialog();
    showSnack(t('messages.renamed'));
  }, [renameTarget, tree, t, updateTree, closeRenameDialog]);

  const startNewSubfolder = useCallback(() => {
    if (!menu) return;
    const targetPath = menu.type === 'folder' ? menu.path : menu.path.slice(0, -1);
    const located = treeIndex.findByPath(targetPath);
    if (!located || located.node.kind !== 'folder') return;
    setNewItemTargetPath([...targetPath]);
    setNewFolderOpen(true);
    closeMenu();
  }, [menu, treeIndex, closeMenu]);

  const closeNewFolderDialog = useCallback(() => {
    setNewFolderOpen(false);
    setNewItemTargetPath(null);
  }, []);

  const confirmNewSubfolder = useCallback((folderName: string) => {
    if (!newItemTargetPath) return;
    const located = treeIndex.findByPath(newItemTargetPath);
    if (!located || located.node.kind !== 'folder') {
      closeNewFolderDialog();
      showSnack(t('messages.folderNotFound'), 'error');
      return;
    }
    const newFolderName = folderName || t('defaults.newFolder');
    const name = ensureUniqueName(located.node.children, newFolderName, true);
    const folderId = genId();

    updateTree((prevTree) => {
      const copy = structuredClone(prevTree);
      const target = findNodeByPath(copy, newItemTargetPath);
      if (!target || target.node.kind !== 'folder') return prevTree;
      target.node.children.push({ kind: 'folder', label: name, id: folderId, children: [] });
      return copy;
    });

    closeNewFolderDialog();
    showSnack(t('messages.folderCreated'));
  }, [
    newItemTargetPath,
    treeIndex,
    closeNewFolderDialog,
    t,
    updateTree,
  ]);

  const startNewTopic = useCallback(() => {
    if (!menu) return;
    const targetPath = menu.type === 'folder' ? menu.path : menu.path.slice(0, -1);
    const located = treeIndex.findByPath(targetPath);
    if (!located || located.node.kind !== 'folder') return;
    setNewItemTargetPath([...targetPath]);
    setNewTopicOpen(true);
    closeMenu();
  }, [menu, treeIndex, closeMenu]);

  const closeNewTopicDialog = useCallback(() => {
    setNewTopicOpen(false);
    setNewItemTargetPath(null);
  }, []);

  const confirmNewTopic = useCallback((topicLabel: string) => {
    if (!newItemTargetPath) return;
    const located = treeIndex.findByPath(newItemTargetPath);
    if (!located || located.node.kind !== 'folder') {
      closeNewTopicDialog();
      showSnack(t('messages.folderNotFound'), 'error');
      return;
    }
    const finalTopicLabel = ensureUniqueName(located.node.children, topicLabel, false);
    const topicId = genId();
    
    updateTree((prevTree) => {
      const copy = structuredClone(prevTree);
      const located2 = findNodeByPath(copy, newItemTargetPath);
      if (!located2 || located2.node.kind !== 'folder') return prevTree;
      const topic: TopicItem = { kind: 'topic', label: finalTopicLabel, id: topicId };
      located2.node.children.push(topic);
      return copy;
    });
    
    updateVocabMap((current) => ({ ...current, [topicId]: [] }));
    
    closeNewTopicDialog();
    showSnack(t('messages.topicCreated', { name: finalTopicLabel }));
  }, [
    newItemTargetPath,
    treeIndex,
    closeNewTopicDialog,
    t,
    updateTree,
    updateVocabMap,
  ]);

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
          const parsedImport = parseVocabularyTopicImport(
            importData,
            file.name.replace(/\.json$/i, ''),
          );
          const items = parsedImport.vocabulary;
          const targetFolderPath = menu.type === 'folder' ? menu.path : menu.path.slice(0, -1);
          const located = treeIndex.findByPath(targetFolderPath);
          if (!located || located.node.kind !== 'folder') {
            showSnack(t('messages.folderNotFound'), 'error');
            return;
          }

          const finalTopicLabel = ensureUniqueName(
            located.node.children,
            parsedImport.label,
            false,
          );
          const topicId = genId();

          const nextTree = structuredClone(treeRef.current);
          const targetFolder = findNodeByPath(
            nextTree,
            targetFolderPath,
          );
          if (!targetFolder || targetFolder.node.kind !== 'folder') {
            throw new Error('Vocabulary import target no longer exists.');
          }
          targetFolder.node.children.push({
            kind: 'topic',
            label: finalTopicLabel,
            id: topicId,
          });
          const preparedVocabulary = commitVocabularyImport(
            nextTree,
            { [topicId]: items },
          );
          showSnack(t('messages.importTopicSuccess', {
            name: finalTopicLabel,
            count: preparedVocabulary[topicId].length,
          }));
          closeMenu();
        } catch (err) {
          console.error(err);
          showSnack(t('messages.readFileFailed'), 'error');
        }
      };
      reader.readAsText(file);
    },
    [menu, commitVocabularyImport, treeIndex, closeMenu, t],
  );

  const handleExportTopic = useCallback(() => {
    if (!menu || menu.type !== 'topic') return;
    const located = treeIndex.findByPath(menu.path);
    if (!located || located.node.kind !== 'topic') return;
    
    const topic = located.node;
    const items = vocabMap[topic.id] || loadVocabularyTopic(topic.id) || [];
    
    downloadJsonFile(
      createVocabularyTopicExport(topic, items),
      getJsonDownloadName(topic.label),
    );
    
    showSnack(t('messages.exportTopicSuccess', { name: topic.label }));
    closeMenu();
  }, [menu, vocabMap, closeMenu, treeIndex, t]);

  const handleExportFolder = useCallback(() => {
    if (!menu || menu.type !== 'folder') return;
    // Use index for faster lookup
    const located = treeIndex.findByPath(menu.path);
    if (!located || located.node.kind !== 'folder') return;
    
    const folderNode = located.node;
    const folderName = folderNode.label;
    
    const allTopicIds = getAllTopicIds(folderNode);
    const folderVocabData: Record<string, VocabItem[]> = {};
    allTopicIds.forEach((topicId) => {
      folderVocabData[topicId] =
        vocabMap[topicId] || loadVocabularyTopic(topicId) || [];
    });
    
    downloadJsonFile(
      createVocabularyFolderExport(folderNode, folderVocabData),
      getJsonDownloadName(`${folderName}_folder`),
    );
    
    showSnack(t('messages.exportFolderSuccess', { name: folderName, count: allTopicIds.length }));
    closeMenu();
  }, [menu, vocabMap, closeMenu, treeIndex, t]);

  const startImportFolder = useCallback(() => {
    if (!menu) return;
    folderInputRef.current?.click();
  }, [menu]);

  const handleDownloadImportSample = useCallback(() => {
    const isRootFolder =
      menu?.type === 'folder' && menu.path.length === 1;
    if (!isRootFolder) return;

    downloadJsonFile(
      createVocabularyImportSample(),
      'wordly_vocabulary_import_sample.json',
    );
    showSnack(t('messages.downloadSampleSuccess'));
    closeMenu();
  }, [menu, closeMenu, t]);

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
          const parsedImport = parseVocabularyFolderImport(
            importData,
            genId,
            {
              folder: t('defaults.folder'),
              topic: t('defaults.topic'),
            },
          );
          const targetFolderPath = menu.type === 'folder' ? menu.path : menu.path.slice(0, -1);
          const located = treeIndex.findByPath(targetFolderPath);
          
          if (!located || located.node.kind !== 'folder') {
            showSnack(t('messages.folderNotFound'), 'error');
            return;
          }

          const importedRoot = parsedImport.folder;
          importedRoot.label = ensureUniqueName(
            located.node.children,
            importedRoot.label,
            true,
          );
          const allTopicIds = getAllTopicIds(importedRoot);

          const nextTree = structuredClone(treeRef.current);
          const targetFolder = findNodeByPath(
            nextTree,
            targetFolderPath,
          );
          if (!targetFolder || targetFolder.node.kind !== 'folder') {
            throw new Error('Vocabulary import target no longer exists.');
          }
          targetFolder.node.children.push(importedRoot);
          const preparedVocabulary = commitVocabularyImport(
            nextTree,
            parsedImport.vocabularyByTopicId,
          );

          const totalWords = allTopicIds.reduce((sum, topicId) => {
            return sum + (preparedVocabulary[topicId]?.length ?? 0);
          }, 0);
          showSnack(t('messages.importFolderSuccess', {
            name: importedRoot.label,
            topicCount: allTopicIds.length,
            wordCount: totalWords,
          }));
          closeMenu();
        } catch (err) {
          console.error(err);
          showSnack(t('messages.readFileFailed'), 'error');
        }
      };
      reader.readAsText(file);
    },
    [menu, treeIndex, commitVocabularyImport, closeMenu, t],
  );

  const doCopy = useCallback(() => {
    if (!menu) return;
    // Use index for faster lookup
    const located = treeIndex.findByPath(menu.path);
    if (!located) return;
    setClip({ mode: 'copy', node: structuredClone(located.node) });
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
    const target = treeIndex.findByPath(targetFolderPath);
    if (!target || target.node.kind !== 'folder') return;

    const cloned = clip.mode === 'copy'
      ? cloneNodeWithTopicMapping(clip.node)
      : { node: clip.node, topicIdMapping: {} };
    const toInsert = cloned.node;
    toInsert.label = ensureUniqueName(
      target.node.children,
      toInsert.label,
      toInsert.kind === 'folder',
    );

    updateTree((prevTree) => {
      const copyRoot = structuredClone(prevTree);
      const currentTarget = findNodeByPath(copyRoot, targetFolderPath);
      if (!currentTarget || currentTarget.node.kind !== 'folder') return prevTree;
      currentTarget.node.children.push(toInsert);
      return copyRoot;
    });

    if (clip.mode === 'copy') {
      updateVocabMap((current) => {
        const next = { ...current };
        Object.entries(cloned.topicIdMapping).forEach(([sourceTopicId, newTopicId]) => {
          const sourceVocabulary =
            current[sourceTopicId] || loadVocabularyTopic(sourceTopicId) || [];
          next[newTopicId] = structuredClone(sourceVocabulary);
        });
        return next;
      });
    }
    
    setClip(null);
    showSnack(t('messages.pasted'));
    closeMenu();
  }, [menu, clip, treeIndex, closeMenu, updateTree, updateVocabMap, t]);

  // Mở xác nhận trước khi xóa chủ đề hoặc thư mục.
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
    const label = located.node.label;
    const topicIds = getAllTopicIds(located.node);
    setPendingDelete({ path: menu.path, type: menu.type, label, topicIds });
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
    if (pendingDelete.topicIds.length) {
      updateVocabMap((m) => {
        const next = { ...m } as Record<string, VocabItem[]>;
        pendingDelete.topicIds.forEach((topicId) => delete next[topicId]);
        return next;
      });
      pendingDelete.topicIds.forEach(deleteVocabularyTopic);
      setVocabCountMap((current) => {
        const next = { ...current };
        pendingDelete.topicIds.forEach((topicId) => delete next[topicId]);
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
                  onTopicClick={handleTopicClick}
                  onContext={openContext}
                  path={[tree.id]}
                  forceShowMenu={isMdDown}
                  isFolderOpen={openFolders}
                  onToggle={handleFolderToggle}
                  vocabCountMap={vocabCountMap}
                  selectedTopicId={selectedTopic?.id || null}
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
            {selectedTopic ? (
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
                  {vocabCountMap[selectedTopic.id] !== undefined && (
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
                      {t('table.wordCount', { count: vocabCountMap[selectedTopic.id] })}
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
                    if (selectedTopic) {
                      const topicId = selectedTopic.id;
                      const baseSession = {
                        topicId,
                        topicLabel: selectedTopic.label,
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
                      
                      navigate(`/train/flashcards-reading?topic=${encodeURIComponent(topicId)}`);
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
          {selectedTopic ? (
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
              <TopicIcon size={56} style={{ color: 'gray', marginBottom: 12 }} />
              <Typography variant={isSmDown ? 'subtitle1' : 'h6'} color="text.secondary" sx={{ mb: 1 }}>
                {t('table.noTopicSelectedTitle')}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t('table.noTopicSelectedDescription')}
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
            key="new-topic"
            onClick={startNewTopic}
            sx={{
              fontSize: { xs: '0.875rem', sm: '1rem' },
              py: { xs: 1.25, sm: 1 },
            }}
          >
            <ListItemIcon sx={{ minWidth: { xs: 36, sm: 40 } }}>
              <TopicIcon size={isSmDown ? 18 : 20} />
            </ListItemIcon>
            <ListItemText 
              primary={t('contextMenu.newTopic')}
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
          <MenuItem
            key="import-data"
            id="vocabulary-import-submenu-trigger"
            aria-haspopup="menu"
            aria-expanded={Boolean(importSubmenuAnchorEl)}
            onMouseEnter={(event) => {
              cancelImportSubmenuClose();
              setImportSubmenuAnchorEl(event.currentTarget);
            }}
            onMouseLeave={scheduleImportSubmenuClose}
            onClick={(event) => {
              const anchor = event.currentTarget;
              cancelImportSubmenuClose();
              setImportSubmenuAnchorEl((current) =>
                current ? null : anchor,
              );
            }}
          >
            <ListItemIcon><ImportIcon fontSize="small" /></ListItemIcon>
            <ListItemText primary={t('contextMenu.importData')} />
            <ChevronRightIcon size={17} />
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
          <MenuItem key="export-topic" onClick={handleExportTopic}>
              <ListItemIcon><ExportIcon fontSize="small" /></ListItemIcon>
            <ListItemText primary={t('contextMenu.exportTopic')} />
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
              <ListItemText primary={t('contextMenu.deleteTopic')} />
          </MenuItem>,
        ]}
      </Menu>

      <Popper
        anchorEl={importSubmenuAnchorEl}
        open={Boolean(menu?.type === 'folder' && importSubmenuAnchorEl)}
        placement="right-start"
        modifiers={[
          {
            name: 'offset',
            options: { offset: [0, -4] },
          },
        ]}
        sx={{ zIndex: theme.zIndex.modal + 1 }}
      >
        <Paper
          elevation={8}
          onMouseEnter={cancelImportSubmenuClose}
          onMouseLeave={scheduleImportSubmenuClose}
          sx={{
            position: 'relative',
            minWidth: 240,
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: 1,
            overflow: 'visible',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: -8,
              width: 8,
            },
          }}
        >
          <MenuList
            aria-labelledby="vocabulary-import-submenu-trigger"
            autoFocusItem={false}
            sx={{ py: 0.5 }}
          >
            <MenuItem
              onClick={() => {
                closeImportSubmenu();
                startImportFolder();
              }}
            >
              <ListItemIcon><ImportIcon fontSize="small" /></ListItemIcon>
              <ListItemText primary={t('contextMenu.importFolder')} />
            </MenuItem>
            <MenuItem
              onClick={() => {
                closeImportSubmenu();
                startImport();
              }}
            >
              <ListItemIcon><TopicIcon size={18} /></ListItemIcon>
              <ListItemText primary={t('contextMenu.importTopic')} />
            </MenuItem>
            {menu?.path.length === 1 && (
              <>
                <Divider />
                <MenuItem onClick={handleDownloadImportSample}>
                  <ListItemIcon><SampleDownloadIcon size={18} /></ListItemIcon>
                  <ListItemText primary={t('contextMenu.downloadSample')} />
                </MenuItem>
              </>
            )}
          </MenuList>
        </Paper>
      </Popper>

      {/* Dialogs */}
      <RenameDialog
        open={renameOpen}
        value={renameValue}
        onClose={closeRenameDialog}
        onConfirm={confirmRename}
      />

      <NewFolderDialog
        open={newFolderOpen}
        onClose={closeNewFolderDialog}
        onConfirm={confirmNewSubfolder}
      />

      <NewTopicDialog
        open={newTopicOpen}
        onClose={closeNewTopicDialog}
        onConfirm={confirmNewTopic}
      />

      <ConfirmDeleteDialog
        open={confirmOpen}
        type={pendingDelete?.type || 'topic'}
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
        selectedTopicId={selectedTopic?.id || null}
        onFolderClick={handleGridFolderClick}
        onTopicClick={handleGridTopicClick}
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
 
