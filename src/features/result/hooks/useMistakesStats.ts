// src/features/result/hooks/useMistakesStats.ts
import { useState, useMemo } from 'react';
import { loadMistakesStats } from '@/features/train/train-read-write/mistakesStorage';
import { loadTreeFromStorage } from '@/features/vocabulary/utils/storageUtils';
import { getAllTopics } from '@/features/vocabulary/utils/treeUtils';
import {
  processMistakesData,
  calculateOverviewStats,
  groupMistakesByMode,
  groupMistakesByTopic,
} from '../utils/dataTransform';

export type SortOption = 'mistakes-desc' | 'mistakes-asc' | 'time-desc' | 'time-asc' | 'word-asc' | 'word-desc';
export type TopicFilterOption = { id: string; label: string };

export const useMistakesStats = () => {
  const [rawStats, setRawStats] = useState(loadMistakesStats());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTopicIds, setSelectedTopicIds] = useState<string[]>([]);
  const [selectedModes, setSelectedModes] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<SortOption>('mistakes-desc');

  // Process data
  const processedMistakes = useMemo(() => {
    return processMistakesData(rawStats);
  }, [rawStats]);

  const uniqueTopics = useMemo<TopicFilterOption[]>(() => {
    const tree = loadTreeFromStorage();
    const topicLabels = new Map<string, string>();
    if (tree) {
      getAllTopics(tree).forEach((topic) => topicLabels.set(topic.id, topic.label));
    }
    processedMistakes.forEach((mistake) => {
      if (!topicLabels.has(mistake.topicId)) {
        topicLabels.set(mistake.topicId, mistake.topicLabel);
      }
    });
    return Array.from(topicLabels, ([id, label]) => ({ id, label })).sort(
      (a, b) => a.label.localeCompare(b.label, 'vi'),
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

  // Group mistakes by topic.
  const mistakesByTopic = useMemo(() => {
    return groupMistakesByTopic(processedMistakes);
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

    if (selectedTopicIds.length > 0) {
      filtered = filtered.filter((m) => selectedTopicIds.includes(m.topicId));
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
  }, [processedMistakes, searchQuery, selectedTopicIds, selectedModes, sortBy]);

  // Refresh data
  const refresh = () => {
    setRawStats(loadMistakesStats());
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchQuery('');
    setSelectedTopicIds([]);
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

      if (selectedTopicIds.length > 0) {
        groupMistakes = groupMistakes.filter((m) => selectedTopicIds.includes(m.topicId));
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
  }, [mistakesByMode, searchQuery, selectedTopicIds, selectedModes, sortBy]);

  const filteredMistakesByTopic = useMemo(() => {
    let filtered = mistakesByTopic.map((group) => {
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

      if (selectedTopicIds.length > 0) {
        groupMistakes = groupMistakes.filter((m) => selectedTopicIds.includes(m.topicId));
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
  }, [mistakesByTopic, searchQuery, selectedTopicIds, selectedModes, sortBy]);

  return {
    mistakes: filteredMistakes,
    mistakesByMode: filteredMistakesByMode,
    mistakesByTopic: filteredMistakesByTopic,
    overviewStats,
    uniqueTopics,
    uniqueModes,
    searchQuery,
    setSearchQuery,
    selectedTopicIds,
    setSelectedTopicIds,
    selectedModes,
    setSelectedModes,
    sortBy,
    setSortBy,
    refresh,
    clearFilters,
    hasData: processedMistakes.length > 0,
  };
};

