// src/features/result/hooks/useMistakesStats.ts
import { useState, useMemo } from 'react';
import { loadMistakesStats } from '@/features/train/train-read-write/mistakesStorage';
import { loadVocabCounts, loadTreeFromStorage } from '@/features/vocabulary/utils/storageUtils';
import { getAllFileNames } from '@/features/vocabulary/utils/treeUtils';
import { processMistakesData, calculateOverviewStats, groupMistakesByMode, groupMistakesByFile } from '../utils/dataTransform';
import { getDisplayFileName } from '@/utils/fileUtils';

export type SortOption = 'mistakes-desc' | 'mistakes-asc' | 'time-desc' | 'time-asc' | 'word-asc' | 'word-desc';

export const useMistakesStats = () => {
  const [rawStats, setRawStats] = useState(loadMistakesStats());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [selectedModes, setSelectedModes] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<SortOption>('mistakes-desc');

  // Process data
  const processedMistakes = useMemo(() => {
    return processMistakesData(rawStats);
  }, [rawStats]);

  // Get unique files - load from tree structure (all files) and merge with files from mistakes
  const uniqueFiles = useMemo(() => {
    // Load all files from tree structure (including nested folders)
    const tree = loadTreeFromStorage();
    const filesFromTree = tree ? getAllFileNames(tree) : [];
    
    // Also get files from mistakes data
    const filesFromMistakes = new Set<string>();
    processedMistakes.forEach((m) => filesFromMistakes.add(m.fileName));
    
    // Merge both sources (tree + mistakes) and sort
    const allFiles = new Set([...filesFromTree, ...Array.from(filesFromMistakes)]);
    return Array.from(allFiles).sort((a, b) =>
      getDisplayFileName(a).localeCompare(getDisplayFileName(b))
    );
  }, [processedMistakes]);

  const uniqueModes = useMemo(() => {
    // Always include all 4 training modes
    const allModes = ['flashcards-reading', 'flashcards-listening', 'read-write', 'listen-write'];
    const modes = new Set<string>(allModes);
    
    // Also add any modes found in mistakes data (for backward compatibility)
    processedMistakes.forEach((m) => {
      m.allModes.forEach((mode) => modes.add(mode));
    });
    
    return Array.from(modes).sort();
  }, [processedMistakes]);

  // Calculate overview stats
  const overviewStats = useMemo(() => {
    return calculateOverviewStats(processedMistakes);
  }, [processedMistakes]);

  // Group mistakes by mode
  const mistakesByMode = useMemo(() => {
    return groupMistakesByMode(processedMistakes);
  }, [processedMistakes]);

  // Group mistakes by file
  const mistakesByFile = useMemo(() => {
    return groupMistakesByFile(processedMistakes);
  }, [processedMistakes]);

  // Filter and sort data
  const filteredMistakes = useMemo(() => {
    let filtered = [...processedMistakes];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (m) =>
          m.word.toLowerCase().includes(query) ||
          m.viMeaning.toLowerCase().includes(query)
      );
    }

    // File filter
    if (selectedFiles.length > 0) {
      filtered = filtered.filter((m) => selectedFiles.includes(m.fileName));
    }

    // Mode filter
    if (selectedModes.length > 0) {
      filtered = filtered.filter((m) =>
        m.allModes.some((mode) => selectedModes.includes(mode))
      );
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'mistakes-desc':
          return b.totalMistakes - a.totalMistakes;
        case 'mistakes-asc':
          return a.totalMistakes - b.totalMistakes;
        case 'time-desc':
          return b.lastMistakeTime - a.lastMistakeTime;
        case 'time-asc':
          return a.lastMistakeTime - b.lastMistakeTime;
        case 'word-asc':
          return a.word.localeCompare(b.word);
        case 'word-desc':
          return b.word.localeCompare(a.word);
        default:
          return 0;
      }
    });

    return filtered;
  }, [processedMistakes, searchQuery, selectedFiles, selectedModes, sortBy]);

  // Refresh data
  const refresh = () => {
    setRawStats(loadMistakesStats());
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchQuery('');
    setSelectedFiles([]);
    setSelectedModes([]);
    setSortBy('mistakes-desc');
  };

  // Filter mistakes by mode (for grouped view)
  const filteredMistakesByMode = useMemo(() => {
    let filtered = mistakesByMode.map((group) => {
      let groupMistakes = [...group.mistakes];

      // Apply search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        groupMistakes = groupMistakes.filter(
          (m) =>
            m.word.toLowerCase().includes(query) ||
            m.viMeaning.toLowerCase().includes(query)
        );
      }

      // Apply file filter
      if (selectedFiles.length > 0) {
        groupMistakes = groupMistakes.filter((m) => selectedFiles.includes(m.fileName));
      }

      // Sort
      groupMistakes.sort((a, b) => {
        switch (sortBy) {
          case 'mistakes-desc':
            return (b.mistakesByMode[group.mode] || 0) - (a.mistakesByMode[group.mode] || 0);
          case 'mistakes-asc':
            return (a.mistakesByMode[group.mode] || 0) - (b.mistakesByMode[group.mode] || 0);
          case 'time-desc':
            return b.lastMistakeTime - a.lastMistakeTime;
          case 'time-asc':
            return a.lastMistakeTime - b.lastMistakeTime;
          case 'word-asc':
            return a.word.localeCompare(b.word);
          case 'word-desc':
            return b.word.localeCompare(a.word);
          default:
            return 0;
        }
      });

      return {
        ...group,
        mistakes: groupMistakes,
        totalMistakes: groupMistakes.reduce(
          (sum, m) => sum + (m.mistakesByMode[group.mode] || 0),
          0
        ),
        totalWords: groupMistakes.length,
      };
    });

    // Filter out empty groups if mode filter is active
    if (selectedModes.length > 0) {
      filtered = filtered.filter((group) => selectedModes.includes(group.mode));
    }

    return filtered.filter((group) => group.mistakes.length > 0);
  }, [mistakesByMode, searchQuery, selectedFiles, selectedModes, sortBy]);

  // Filter mistakes by file (for file grouped view)
  const filteredMistakesByFile = useMemo(() => {
    let filtered = mistakesByFile.map((group) => {
      let groupMistakes = [...group.mistakes];

      // Apply search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        groupMistakes = groupMistakes.filter(
          (m) =>
            m.word.toLowerCase().includes(query) ||
            m.viMeaning.toLowerCase().includes(query)
        );
      }

      // Apply file filter
      if (selectedFiles.length > 0) {
        groupMistakes = groupMistakes.filter((m) => selectedFiles.includes(m.fileName));
      }

      // Apply mode filter
      if (selectedModes.length > 0) {
        groupMistakes = groupMistakes.filter((m) =>
          m.allModes.some((mode) => selectedModes.includes(mode))
        );
      }

      // Sort
      groupMistakes.sort((a, b) => {
        switch (sortBy) {
          case 'mistakes-desc':
            return b.totalMistakes - a.totalMistakes;
          case 'mistakes-asc':
            return a.totalMistakes - b.totalMistakes;
          case 'time-desc':
            return b.lastMistakeTime - a.lastMistakeTime;
          case 'time-asc':
            return a.lastMistakeTime - b.lastMistakeTime;
          case 'word-asc':
            return a.word.localeCompare(b.word);
          case 'word-desc':
            return b.word.localeCompare(a.word);
          default:
            return 0;
        }
      });

      // Recalculate stats for filtered mistakes
      const totalMistakes = groupMistakes.reduce((sum, m) => sum + m.totalMistakes, 0);
      const mistakesByMode: Record<string, number> = {};
      groupMistakes.forEach((mistake) => {
        Object.entries(mistake.mistakesByMode).forEach(([mode, count]) => {
          mistakesByMode[mode] = (mistakesByMode[mode] || 0) + count;
        });
      });

      return {
        ...group,
        mistakes: groupMistakes,
        totalMistakes,
        totalWords: groupMistakes.length,
        mistakesByMode,
      };
    });

    // Filter out empty groups
    return filtered.filter((group) => group.mistakes.length > 0);
  }, [mistakesByFile, searchQuery, selectedFiles, selectedModes, sortBy]);

  return {
    mistakes: filteredMistakes,
    mistakesByMode: filteredMistakesByMode,
    mistakesByFile: filteredMistakesByFile,
    overviewStats,
    uniqueFiles,
    uniqueModes,
    searchQuery,
    setSearchQuery,
    selectedFiles,
    setSelectedFiles,
    selectedModes,
    setSelectedModes,
    sortBy,
    setSortBy,
    refresh,
    clearFilters,
    hasData: processedMistakes.length > 0,
  };
};

