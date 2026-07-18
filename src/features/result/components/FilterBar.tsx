// src/features/result/components/FilterBar.tsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Autocomplete,
  Chip,
  IconButton,
  useTheme,
  useMediaQuery,
  Paper,
} from '@mui/material';
import { Search, X } from 'lucide-react';
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
}

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
}) => {
  const theme = useTheme();
  const { t } = useTranslation('result');
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const sortOptions: { value: SortOption; label: string }[] = [
    { value: 'mistakes-desc', label: t('filters.countDesc') },
    { value: 'mistakes-asc', label: t('filters.countAsc') },
    { value: 'time-desc', label: t('filters.dateDesc') },
    { value: 'time-asc', label: t('filters.dateAsc') },
    { value: 'word-asc', label: t('filters.wordAsc') },
    { value: 'word-desc', label: t('filters.wordDesc') },
  ];
  
  // Local state for search input (for debouncing)
  const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery);

  // Debounce search query - wait 2 seconds after user stops typing
  useEffect(() => {
    const timer = setTimeout(() => {
      onSearchChange(localSearchQuery);
    }, 2000);

    return () => {
      clearTimeout(timer);
    };
  }, [localSearchQuery, onSearchChange]);

  // Sync external searchQuery changes to local state
  useEffect(() => {
    setLocalSearchQuery(searchQuery);
  }, [searchQuery]);

  const hasActiveFilters =
    searchQuery.trim() !== '' || selectedTopicIds.length > 0 || selectedModes.length > 0;

  return (
    <Paper
      elevation={1}
      sx={{
        p: { xs: 1, sm: 2.5 },
        mb: 3,
        borderRadius: 2,
        bgcolor: 'background.paper',
        width: '100%',
        maxWidth: '100%',
        boxSizing: 'border-box',
        overflow: 'hidden',
        '& .MuiAutocomplete-root': {
          width: '100%',
          maxWidth: '100%',
        },
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          flexWrap: 'wrap',
          gap: { xs: 1.5, sm: 2, md: 2.5 },
          alignItems: { xs: 'stretch', sm: 'center' },
          width: '100%',
          maxWidth: '100%',
          boxSizing: 'border-box',
        }}
      >
        {/* Search with debounce */}
        <Box
          sx={{
            width: { xs: '100%', sm: 'auto' },
            maxWidth: { xs: '100%', sm: '300px', md: '400px' },
            minWidth: { xs: 0, sm: 200 },
            boxSizing: 'border-box',
            flex: { xs: '0 0 auto', sm: '1 1 300px' },
            flexShrink: 1,
          }}
        >
          <TextField
            fullWidth
            placeholder={t('filters.searchPlaceholder')}
            value={localSearchQuery}
            onChange={(e) => setLocalSearchQuery(e.target.value)}
            size="small"
            InputProps={{
              startAdornment: <Search size={20} style={{ marginRight: 8, color: 'inherit' }} />,
              endAdornment: localSearchQuery && (
                <IconButton
                  size="small"
                  onClick={() => {
                    setLocalSearchQuery('');
                    onSearchChange('');
                  }}
                  sx={{ mr: -1 }}
                >
                  <X size={18} />
                </IconButton>
              ),
            }}
            sx={{
              width: '100%',
              maxWidth: '100%',
              minWidth: 0,
              boxSizing: 'border-box',
            }}
          />
        </Box>

        {/* Topic filter */}
        <Box
          sx={{
            width: { xs: '100%', sm: 'auto' },
            maxWidth: { xs: '100%', sm: '200px', md: '220px' },
            minWidth: { xs: 0, sm: 180 },
            flex: '0 0 auto',
            flexShrink: 1,
            boxSizing: 'border-box',
          }}
        >
          <Autocomplete
            multiple
            options={uniqueTopics}
            value={uniqueTopics.filter((topic) => selectedTopicIds.includes(topic.id))}
            onChange={(_, newValue) => onTopicIdsChange(newValue.map((topic) => topic.id))}
            size="small"
            filterSelectedOptions
            fullWidth={isMobile}
            getOptionLabel={(option) => option.label}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            renderOption={(props, option) => (
              <li {...props} key={option.id}>{option.label}</li>
            )}
            renderInput={(params) => (
              <TextField 
                {...params} 
                label={t('filters.byTopic')}
                placeholder={t('filters.byTopic')}
                fullWidth
                sx={{ 
                  width: '100%',
                  maxWidth: '100%',
                  boxSizing: 'border-box',
                  '& .MuiInputBase-root': {
                    width: '100%',
                    maxWidth: '100%',
                  },
                }}
              />
            )}
            renderTags={(value, getTagProps) => (
              <Box
                sx={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 0.5,
                  maxWidth: '100%',
                  overflow: 'hidden',
                }}
              >
                {value.length > 0 ? (
                  value.length <= 2 ? (
                    value.map((option, index) => (
                      <Chip
                        {...getTagProps({ index })}
                        key={option.id}
                        label={option.label}
                        size="small"
                        sx={{ maxWidth: { xs: '120px', sm: 'none' } }}
                      />
                    ))
                  ) : (
                    <>
                      {value.slice(0, 1).map((option, index) => (
                        <Chip
                          {...getTagProps({ index })}
                          key={option.id}
                          label={option.label}
                          size="small"
                          sx={{ maxWidth: { xs: '120px', sm: 'none' } }}
                        />
                      ))}
                      <Chip
                        label={`+${value.length - 1}`}
                        size="small"
                        color="primary"
                      />
                    </>
                  )
                ) : null}
              </Box>
            )}
            sx={{
              width: '100%',
              maxWidth: '100%',
              boxSizing: 'border-box',
            }}
            ListboxProps={{
              style: {
                maxHeight: 300,
              },
            }}
          />
        </Box>

        {/* Mode Filter with search */}
        <Box
          sx={{
            width: { xs: '100%', sm: 'auto' },
            maxWidth: { xs: '100%', sm: '200px', md: '220px' },
            minWidth: { xs: 0, sm: 180 },
            flex: '0 0 auto',
            flexShrink: 1,
            boxSizing: 'border-box',
          }}
        >
          <Autocomplete
            multiple
            options={uniqueModes}
            value={selectedModes}
            onChange={(_, newValue) => onModesChange(newValue)}
            size="small"
            filterSelectedOptions
            fullWidth={isMobile}
            getOptionLabel={(option) => getTrainingModeLabel(option)}
            renderInput={(params) => (
              <TextField 
                {...params} 
                label={t('filters.byMode')} 
                placeholder={t('filters.byMode')}
                fullWidth
                sx={{ 
                  width: '100%',
                  maxWidth: '100%',
                  boxSizing: 'border-box',
                  '& .MuiInputBase-root': {
                    width: '100%',
                    maxWidth: '100%',
                  },
                }}
              />
            )}
            renderTags={(value, getTagProps) => (
              <Box
                sx={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 0.5,
                  maxWidth: '100%',
                  overflow: 'hidden',
                }}
              >
                {value.length > 0 ? (
                  value.length <= 2 ? (
                    value.map((option, index) => (
                      <Chip
                        {...getTagProps({ index })}
                        key={option}
                        label={getTrainingModeLabel(option)}
                        size="small"
                        sx={{ maxWidth: { xs: '120px', sm: 'none' } }}
                      />
                    ))
                  ) : (
                    <>
                      {value.slice(0, 1).map((option, index) => (
                        <Chip
                          {...getTagProps({ index })}
                          key={option}
                          label={getTrainingModeLabel(option)}
                          size="small"
                          sx={{ maxWidth: { xs: '120px', sm: 'none' } }}
                        />
                      ))}
                      <Chip
                        label={`+${value.length - 1}`}
                        size="small"
                        color="primary"
                      />
                    </>
                  )
                ) : null}
              </Box>
            )}
            sx={{
              width: '100%',
              maxWidth: '100%',
              boxSizing: 'border-box',
            }}
            ListboxProps={{
              style: {
                maxHeight: 300,
              },
            }}
          />
        </Box>

        {/* Sort with search */}
        <Box
          sx={{
            width: { xs: '100%', sm: 'auto' },
            maxWidth: { xs: '100%', sm: '180px', md: '200px' },
            minWidth: { xs: 0, sm: 160 },
            flex: '0 0 auto',
            flexShrink: 1,
            boxSizing: 'border-box',
          }}
        >
          <Autocomplete
            options={sortOptions}
            value={sortOptions.find((opt) => opt.value === sortBy) || null}
            onChange={(_, newValue) => {
              if (newValue) {
                onSortChange(newValue.value);
              }
            }}
            size="small"
            fullWidth={isMobile}
            getOptionLabel={(option) => option.label}
            renderInput={(params) => (
              <TextField 
                {...params} 
                label={t('filters.sortBy')} 
                placeholder={t('filters.sortBy')}
                fullWidth
                sx={{ 
                  width: '100%',
                  maxWidth: '100%',
                  boxSizing: 'border-box',
                  '& .MuiInputBase-root': {
                    width: '100%',
                    maxWidth: '100%',
                  },
                }}
              />
            )}
            sx={{
              width: '100%',
              maxWidth: '100%',
              boxSizing: 'border-box',
            }}
            ListboxProps={{
              style: {
                maxHeight: 300,
              },
            }}
          />
        </Box>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              width: { xs: '100%', sm: 'auto' },
              justifyContent: { xs: 'flex-start', sm: 'center' },
            }}
          >
            <IconButton
              onClick={onClearFilters}
              color="primary"
              sx={{
                flex: { xs: '0 0 auto', sm: '0 0 auto' },
              }}
            >
              <X size={20} />
            </IconButton>
          </Box>
        )}
      </Box>
    </Paper>
  );
};

