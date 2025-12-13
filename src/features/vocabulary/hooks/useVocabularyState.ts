import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import type { VocabItem, FolderNode, FileLeaf, SnackState } from '../types';
import { getDefaultTree } from '../constants/seedData';
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

export const saveViewModeToStorage = (mode: 'tree' | 'grid') => {
  try {
    localStorage.setItem(STORAGE_KEY_VIEW_MODE, mode);
  } catch (err) {
    console.error('Failed to save view mode:', err);
  }
};

export interface VocabularyState {
  // Core data
  tree: FolderNode;
  vocabMap: Record<string, VocabItem[]>;
  vocabCountMap: Record<string, number>;
  treeIndex: TreeIndex;
  
  // Selection
  selectedPath: string[] | null;
  selectedFile: FileLeaf | null;
  
  // View state
  viewMode: 'tree' | 'grid';
  mobileViewMode: 'folder' | 'vocab';
  openFolders: Set<string>;
  sidebarOpen: boolean;
  
  // Grid view
  currentFolderId: string;
  gridModalOpen: boolean;
  
  // Snackbar
  snack: SnackState;
}

export interface VocabularyStateSetters {
  setTree: React.Dispatch<React.SetStateAction<FolderNode>>;
  setVocabMap: React.Dispatch<React.SetStateAction<Record<string, VocabItem[]>>>;
  setVocabCountMap: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  setSelectedPath: React.Dispatch<React.SetStateAction<string[] | null>>;
  setViewMode: React.Dispatch<React.SetStateAction<'tree' | 'grid'>>;
  setMobileViewMode: React.Dispatch<React.SetStateAction<'folder' | 'vocab'>>;
  setOpenFolders: React.Dispatch<React.SetStateAction<Set<string>>>;
  setSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setCurrentFolderId: React.Dispatch<React.SetStateAction<string>>;
  setGridModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setSnack: React.Dispatch<React.SetStateAction<SnackState>>;
}

export interface UseVocabularyStateReturn {
  state: VocabularyState;
  setters: VocabularyStateSetters;
  
  // Derived helpers
  navigate: ReturnType<typeof useNavigate>;
  updateTree: (updater: (prev: FolderNode) => FolderNode) => void;
  updateVocabMap: (updater: (prev: Record<string, VocabItem[]>) => Record<string, VocabItem[]>) => void;
  showSnack: (msg: string, sev?: 'success' | 'info' | 'warning' | 'error') => void;
}

export function useVocabularyState(): UseVocabularyStateReturn {
  const navigate = useNavigate();
  
  // Core data state
  const [vocabMap, setVocabMap] = useState<Record<string, VocabItem[]>>({});
  
  const [tree, setTree] = useState<FolderNode>(() => {
    const stored = loadTreeFromStorage();
    if (stored) {
      return stored;
    }
    const defaultTree = getDefaultTree();
    saveTreeToStorage(defaultTree);
    return defaultTree;
  });
  
  // Sync vocab counts on mount
  useEffect(() => {
    syncAllVocabCounts();
  }, []);

  // Path index cache for O(1) node lookups
  const treeIndex = useMemo(() => {
    return new TreeIndex(tree);
  }, [tree]);
  
  // Load vocab counts from storage
  const [vocabCountMap, setVocabCountMap] = useState<Record<string, number>>(() => {
    return loadVocabCounts();
  });
  
  // Selection state
  const [selectedPath, setSelectedPath] = useState<string[] | null>(null);
  
  const selectedFile = useMemo(() => {
    if (!selectedPath) return null;
    const located = treeIndex.findByPath(selectedPath);
    return located?.node.kind === 'file' ? located.node : null;
  }, [selectedPath, treeIndex]);
  
  // View state
  const [viewMode, setViewMode] = useState<'tree' | 'grid'>(() => loadViewMode());
  const [mobileViewMode, setMobileViewMode] = useState<'folder' | 'vocab'>('folder');
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  
  // Folder collapse/expand state
  const [openFolders, setOpenFolders] = useState<Set<string>>(() => new Set([tree.id]));
  
  // Grid view state
  const [currentFolderId, setCurrentFolderId] = useState<string>(tree.id);
  const [gridModalOpen, setGridModalOpen] = useState(false);
  
  // Snackbar state
  const [snack, setSnack] = useState<SnackState>({ open: false, msg: '', sev: 'success' });

  // Sync openFolders when tree changes
  useEffect(() => {
    setOpenFolders((prev) => {
      const next = new Set(prev);
      if (!next.has(tree.id)) {
        next.add(tree.id);
      }
      return next;
    });
  }, [tree.id]);

  // Sync counts from vocabMap when it changes
  const vocabMapRef = useRef(vocabMap);
  vocabMapRef.current = vocabMap;
  
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setVocabCountMap((prevCounts) => {
        const updated = { ...prevCounts };
        let hasChanges = false;
        
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
    }, 0);
    
    return () => clearTimeout(timeoutId);
  }, [vocabMap]);

  // Helper to update vocabMap and save to localStorage
  const updateVocabMap = useCallback((updater: (prev: Record<string, VocabItem[]>) => Record<string, VocabItem[]>) => {
    setVocabMap((prev) => {
      const next = updater(prev);
      
      const changedFiles = new Set<string>();
      
      for (const fileName in next) {
        if (next.hasOwnProperty(fileName)) {
          const prevVocab = prev[fileName];
          const nextVocab = next[fileName];
          
          if (!prevVocab || JSON.stringify(prevVocab) !== JSON.stringify(nextVocab)) {
            changedFiles.add(fileName);
          }
        }
      }
      
      for (const fileName in prev) {
        if (prev.hasOwnProperty(fileName) && !next[fileName]) {
          deleteVocabFile(fileName);
        }
      }
      
      Array.from(changedFiles).forEach((fileName) => {
        saveVocabFile(fileName, next[fileName]);
      });
      
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

  const showSnack = useCallback((msg: string, sev: 'success' | 'info' | 'warning' | 'error' = 'success') => {
    setSnack({ open: true, msg, sev });
  }, []);

  return {
    state: {
      tree,
      vocabMap,
      vocabCountMap,
      treeIndex,
      selectedPath,
      selectedFile,
      viewMode,
      mobileViewMode,
      openFolders,
      sidebarOpen,
      currentFolderId,
      gridModalOpen,
      snack,
    },
    setters: {
      setTree,
      setVocabMap,
      setVocabCountMap,
      setSelectedPath,
      setViewMode,
      setMobileViewMode,
      setOpenFolders,
      setSidebarOpen,
      setCurrentFolderId,
      setGridModalOpen,
      setSnack,
    },
    navigate,
    updateTree,
    updateVocabMap,
    showSnack,
  };
}

