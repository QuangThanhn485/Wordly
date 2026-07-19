// src/features/result/components/FilterBar.tsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Autocomplete,
  Chip,
  IconButton,
  Tooltip,
} from '@mui/material';
import { Search, X, ArrowDownUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { type SortOption, type TopicFilterOption } from '../hooks/useMistakesStats';
import { getTrainingModeLabel } from '../utils/dataTransform';

interface FilterBarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  selectedTopicIds: string[];
  onTopicIdsChange: (topicIds: string[]) => void;
  selectedModes: string[];
  onModesChange: (modes: string[]) => void;
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  uniqueTopics: TopicFilterOption[];
  uniqueModes: string[];
  onClearFilters: () => void;
  /** Hide the topic filter (redundant inside the By-topic view). */
  hideTopicFilter?: boolean;
  /** Hide the mode filter (redundant inside the By-mode view). */
  hideModeFilter?: boolean;
}

/** Trim long selections to a single chip + "+N" so the field never grows tall. */
const renderCompactTags = <T,>(
  getLabel: (option: T) => string,
  getKey: (option: T) => string,
) =>
  (value: T[], getTagProps: (params: { index: number }) => Record<string, unknown>) => {
    if (value.length === 0) return null;
    const first = value[0];
    return (
      <Box sx={{ display: 'flex', gap: 0.5, maxWidth: '100%', overflow: 'hidden' }}>
        <Chip
          {...getTagProps({ index: 0 })}
          key={getKey(first)}
          label={getLabel(first)}
          size="small"
          sx={{ maxWidth: 120 }}
        />
        {value.length > 1 && (
          <Chip label={`+${value.length - 1}`} size="small" color="primary" />
        )}
      </Box>
    );
  };

export const FilterBar: React.FC<FilterBarProps> = ({
  searchQuery,
  onSearchChange,
  selectedTopicIds,
  onTopicIdsChange,
  selectedModes,
  onModesChange,
  sortBy,
  onSortChange,
  uniqueTopics,
  uniqueModes,
  onClearFilters,
  hideTopicFilter = false,
  hideModeFilter = false,
}) => {
  const { t } = useTranslation('result');

  const sortOptions: { value: SortOption; label: string }[] = [
    { value: 'mistakes-desc', label: t('filters.countDesc') },
    { value: 'mistakes-asc', label: t('filters.countAsc') },
    { value: 'time-desc', label: t('filters.dateDesc') },
    { value: 'time-asc', label: t('filters.dateAsc') },
    { value: 'word-asc', label: t('filters.wordAsc') },
    { value: 'word-desc', label: t('filters.wordDesc') },
  ];

  // Local state so typing stays snappy; commit shortly after the user pauses.
  const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery);

  useEffect(() => {
    const timer = setTimeout(() => onSearchChange(localSearchQuery), 300);
    return () => clearTimeout(timer);
  }, [localSearchQuery, onSearchChange]);

  useEffect(() => {
    setLocalSearchQuery(searchQuery);
  }, [searchQuery]);

  const hasActiveFilters =
    searchQuery.trim() !== '' || selectedTopicIds.length > 0 || selectedModes.length > 0;

  return (
    <Box
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 1,
        alignItems: 'center',
        mb: 2,
      }}
    >
      {/* Search */}
      <TextField
        placeholder={t('filters.searchPlaceholder')}
        value={localSearchQuery}
        onChange={(e) => setLocalSearchQuery(e.target.value)}
        size="small"
        sx={{ flex: '1 1 220px', minWidth: 0 }}
        InputProps={{
          startAdornment: <Search size={18} style={{ marginRight: 8, color: 'inherit', flexShrink: 0 }} />,
          endAdornment: localSearchQuery ? (
            <IconButton
              size="small"
              edge="end"
              onClick={() => {
                setLocalSearchQuery('');
                onSearchChange('');
              }}
              aria-label={t('filters.searchPlaceholder')}
            >
              <X size={16} />
            </IconButton>
          ) : null,
        }}
      />

      {/* Topic filter */}
      {!hideTopicFilter && (
        <Autocomplete
          multiple
          disableCloseOnSelect
          options={uniqueTopics}
          value={uniqueTopics.filter((topic) => selectedTopicIds.includes(topic.id))}
          onChange={(_, newValue) => onTopicIdsChange(newValue.map((topic) => topic.id))}
          size="small"
          getOptionLabel={(option) => option.label}
          isOptionEqualToValue={(option, value) => option.id === value.id}
          renderOption={(props, option) => (
            <li {...props} key={option.id}>{option.label}</li>
          )}
          renderInput={(params) => (
            <TextField
              {...params}
              placeholder={selectedTopicIds.length === 0 ? t('filters.byTopic') : undefined}
            />
          )}
          renderTags={renderCompactTags(
            (o: TopicFilterOption) => o.label,
            (o: TopicFilterOption) => o.id,
          )}
          sx={{ flex: '1 1 180px', minWidth: 150 }}
          ListboxProps={{ style: { maxHeight: 300 } }}
        />
      )}

      {/* Mode filter */}
      {!hideModeFilter && (
        <Autocomplete
          multiple
          disableCloseOnSelect
          options={uniqueModes}
          value={selectedModes}
          onChange={(_, newValue) => onModesChange(newValue)}
          size="small"
          getOptionLabel={(option) => getTrainingModeLabel(option)}
          renderInput={(params) => (
            <TextField
              {...params}
              placeholder={selectedModes.length === 0 ? t('filters.byMode') : undefined}
            />
          )}
          renderTags={renderCompactTags(
            (o: string) => getTrainingModeLabel(o),
            (o: string) => o,
          )}
          sx={{ flex: '1 1 170px', minWidth: 150 }}
          ListboxProps={{ style: { maxHeight: 300 } }}
        />
      )}

      {/* Sort */}
      <Autocomplete
        options={sortOptions}
        value={sortOptions.find((opt) => opt.value === sortBy) ?? sortOptions[0]}
        onChange={(_, newValue) => newValue && onSortChange(newValue.value)}
        size="small"
        disableClearable
        getOptionLabel={(option) => option.label}
        renderInput={(params) => (
          <TextField
            {...params}
            InputProps={{
              ...params.InputProps,
              startAdornment: <ArrowDownUp size={16} style={{ marginRight: 6, color: 'inherit', flexShrink: 0 }} />,
            }}
          />
        )}
        sx={{ flex: '0 1 190px', minWidth: 150 }}
        ListboxProps={{ style: { maxHeight: 300 } }}
      />

      {/* Clear */}
      {hasActiveFilters && (
        <Tooltip title={t('filters.clear')}>
          <IconButton onClick={onClearFilters} color="primary" size="small" aria-label={t('filters.clear')}>
            <X size={18} />
          </IconButton>
        </Tooltip>
      )}
    </Box>
  );
};
