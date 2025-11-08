// src/features/result/components/FilterBar.tsx
import React, { useState, useEffect, useCallback } from 'react';
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
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import { type SortOption } from '../hooks/useMistakesStats';
import { getTrainingModeLabel } from '../utils/dataTransform';

interface FilterBarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  selectedFiles: string[];
  onFilesChange: (files: string[]) => void;
  selectedModes: string[];
  onModesChange: (modes: string[]) => void;
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  uniqueFiles: string[];
  uniqueModes: string[];
  onClearFilters: () => void;
}

const sortOptions: { value: SortOption; label: string }[] = [
  { value: 'mistakes-desc', label: 'Sai nhiều → ít' },
  { value: 'mistakes-asc', label: 'Sai ít → nhiều' },
  { value: 'time-desc', label: 'Mới nhất' },
  { value: 'time-asc', label: 'Cũ nhất' },
  { value: 'word-asc', label: 'A → Z' },
  { value: 'word-desc', label: 'Z → A' },
];

export const FilterBar: React.FC<FilterBarProps> = ({
  searchQuery,
  onSearchChange,
  selectedFiles,
  onFilesChange,
  selectedModes,
  onModesChange,
  sortBy,
  onSortChange,
  uniqueFiles,
  uniqueModes,
  onClearFilters,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
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
    searchQuery.trim() !== '' || selectedFiles.length > 0 || selectedModes.length > 0;

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
            placeholder="Tìm kiếm từ vựng hoặc nghĩa..."
            value={localSearchQuery}
            onChange={(e) => setLocalSearchQuery(e.target.value)}
            size="small"
            InputProps={{
              startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary', fontSize: '1.25rem' }} />,
              endAdornment: localSearchQuery && (
                <IconButton
                  size="small"
                  onClick={() => {
                    setLocalSearchQuery('');
                    onSearchChange('');
                  }}
                  sx={{ mr: -1 }}
                >
                  <ClearIcon fontSize="small" />
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

        {/* File Filter with search */}
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
            options={uniqueFiles}
            value={selectedFiles}
            onChange={(_, newValue) => onFilesChange(newValue)}
            size="small"
            filterSelectedOptions
            fullWidth={isMobile}
            renderInput={(params) => (
              <TextField 
                {...params} 
                label="File" 
                placeholder="Chọn file..."
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
                        label={option}
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
                          label={option}
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
                label="Chế độ" 
                placeholder="Chọn chế độ..."
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
                label="Sắp xếp" 
                placeholder="Chọn cách sắp xếp..."
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
              title="Xóa bộ lọc"
            >
              <ClearIcon />
            </IconButton>
          </Box>
        )}
      </Box>
    </Paper>
  );
};
