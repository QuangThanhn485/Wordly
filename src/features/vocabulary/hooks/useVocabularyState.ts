import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import type { VocabItem, FolderNode, TopicItem, SnackState } from '../types';
import { getDefaultTree } from '../constants/seedData';
import { TreeIndex } from '../utils/treeIndex';
import {
  saveVocabularyTopic,
  deleteVocabularyTopic,
  loadVocabularyTopicCounts,
  saveTreeToStorage,
  loadTreeFromStorage,
  normalizeVocabularyItems,
} from '../utils/storageUtils';
import { loadPreferences, updatePreferences } from '@/data';

const loadViewMode = (): 'tree' | 'grid' => {
  try {
    return loadPreferences().vocabularyViewMode;
  } catch {
    return 'tree';
  }
};

export const saveViewModeToStorage = (mode: 'tree' | 'grid') => {
  try {
    updatePreferences((current) => ({
      ...current,
      vocabularyViewMode: mode,
    }));
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
  selectedTopic: TopicItem | null;
  
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
  const vocabMapRef = useRef(vocabMap);
  
  const [tree, setTree] = useState<FolderNode>(() => {
    const stored = loadTreeFromStorage();
    if (stored) {
      return stored;
    }
    const defaultTree = getDefaultTree();
    saveTreeToStorage(defaultTree);
    return defaultTree;
  });
  const treeRef = useRef(tree);
  treeRef.current = tree;
  
  // Path index cache for O(1) node lookups
  const treeIndex = useMemo(() => {
    return new TreeIndex(tree);
  }, [tree]);
  
  // Load vocab counts from storage
  const [vocabCountMap, setVocabCountMap] = useState<Record<string, number>>(() => {
    return loadVocabularyTopicCounts();
  });
  
  // Selection state
  const [selectedPath, setSelectedPath] = useState<string[] | null>(null);
  
  const selectedTopic = useMemo(() => {
    if (!selectedPath) return null;
    const located = treeIndex.findByPath(selectedPath);
    return located?.node.kind === 'topic' ? located.node : null;
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
  vocabMapRef.current = vocabMap;
  
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setVocabCountMap((prevCounts) => {
        const updated = { ...prevCounts };
        let hasChanges = false;
        
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
    }, 0);
    
    return () => clearTimeout(timeoutId);
  }, [vocabMap]);

  // Update in-memory topics and persist only the changed topic records.
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
      selectedTopic,
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

