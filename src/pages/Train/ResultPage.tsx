// ResultPage.tsx
import React from 'react';
import {
  Box,
  Container,
  Typography,
  useTheme,
  useMediaQuery,
  Paper,
  Tabs,
  Tab,
} from '@mui/material';
import AssessmentIcon from '@mui/icons-material/Assessment';
import { useMistakesStats } from '@/features/result/hooks/useMistakesStats';
import { OverviewCards } from '@/features/result/components/OverviewCards';
import { MistakeCard } from '@/features/result/components/MistakeCard';
import { FilterBar } from '@/features/result/components/FilterBar';
import { EmptyState } from '@/features/result/components/EmptyState';
import { MistakeGroup } from '@/features/result/components/MistakeGroup';
import { MistakeGroupByFile } from '@/features/result/components/MistakeGroupByFile';

const ResultPage = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [viewMode, setViewMode] = React.useState<'all' | 'grouped' | 'byFile'>('grouped');

  const {
    mistakes,
    mistakesByMode,
    mistakesByFile,
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
    clearFilters,
    hasData,
  } = useMistakesStats();

  return (
    <Box
      sx={{
        width: '100%',
        minHeight: '100vh',
        bgcolor: 'background.default',
        py: { xs: 2, sm: 3, md: 4 },
      }}
    >
      <Container 
        maxWidth="xl"
        sx={{
          px: { xs: 1, sm: 2, md: 3 },
          width: '100%',
          maxWidth: '100%',
          boxSizing: 'border-box',
        }}
      >
        {/* Header */}
        <Box sx={{ mb: { xs: 3, sm: 4 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
            <AssessmentIcon
              sx={{
                fontSize: { xs: '2rem', sm: '2.5rem' },
                color: 'primary.main',
              }}
            />
            <Typography
              variant="h4"
              fontWeight={700}
              sx={{
                fontSize: { xs: '1.5rem', sm: '2rem', md: '2.5rem' },
              }}
            >
              Kết quả Lỗi Từ Vựng
            </Typography>
          </Box>
          <Typography
            variant="body1"
            color="text.secondary"
            sx={{
              fontSize: { xs: '0.875rem', sm: '1rem' },
            }}
          >
            Xem thống kê chi tiết về các từ vựng bạn đã sai trong quá trình training
          </Typography>
        </Box>

        {hasData ? (
          <>
            {/* Overview Cards */}
            <OverviewCards stats={overviewStats} />

            {/* View Mode Tabs */}
            <Paper
              elevation={1}
              sx={{
                mb: 3,
                borderRadius: 2,
                bgcolor: 'background.paper',
              }}
            >
              <Tabs
                value={viewMode}
                onChange={(_, newValue) => setViewMode(newValue)}
                variant={isMobile ? 'scrollable' : 'standard'}
                scrollButtons="auto"
                sx={{
                  borderBottom: 1,
                  borderColor: 'divider',
                  '& .MuiTab-root': {
                    textTransform: 'none',
                    fontWeight: 600,
                    fontSize: { xs: '0.875rem', sm: '1rem' },
                    minWidth: { xs: 120, sm: 160 },
                  },
                }}
              >
                <Tab label="Theo chế độ training" value="grouped" />
                <Tab label="Theo file từ vựng" value="byFile" />
                <Tab label="Tất cả" value="all" />
              </Tabs>
            </Paper>

            {/* Filter Bar */}
            <FilterBar
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              selectedFiles={selectedFiles}
              onFilesChange={setSelectedFiles}
              selectedModes={selectedModes}
              onModesChange={setSelectedModes}
              sortBy={sortBy}
              onSortChange={setSortBy}
              uniqueFiles={uniqueFiles}
              uniqueModes={uniqueModes}
              onClearFilters={clearFilters}
            />

            {/* Results Count */}
            {viewMode === 'all' && mistakes.length > 0 && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Hiển thị <strong>{mistakes.length}</strong> từ vựng
                </Typography>
              </Box>
            )}

            {/* Content based on view mode */}
            {viewMode === 'grouped' ? (
              // Grouped view by training mode
              mistakesByMode.length > 0 ? (
                <>
                  {mistakesByMode.map((group) => (
                    <MistakeGroup key={group.mode} group={group} />
                  ))}
                </>
              ) : (
                <Paper
                  sx={{
                    p: 4,
                    textAlign: 'center',
                    bgcolor: 'background.paper',
                    borderRadius: 2,
                  }}
                >
                  <Typography variant="body1" color="text.secondary">
                    Không tìm thấy từ vựng nào phù hợp với bộ lọc của bạn.
                  </Typography>
                </Paper>
              )
            ) : viewMode === 'byFile' ? (
              // Grouped view by file
              mistakesByFile && mistakesByFile.length > 0 ? (
                <>
                  {mistakesByFile.map((group) => (
                    <MistakeGroupByFile key={group.fileName} group={group} />
                  ))}
                </>
              ) : (
                <Paper
                  sx={{
                    p: 4,
                    textAlign: 'center',
                    bgcolor: 'background.paper',
                    borderRadius: 2,
                  }}
                >
                  <Typography variant="body1" color="text.secondary">
                    Không tìm thấy từ vựng nào phù hợp với bộ lọc của bạn.
                  </Typography>
                </Paper>
              )
            ) : (
              // All view (original)
              mistakes && mistakes.length > 0 ? (
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: {
                      xs: '1fr',
                      sm: 'repeat(2, 1fr)',
                      md: 'repeat(3, 1fr)',
                      lg: 'repeat(4, 1fr)',
                    },
                    gap: { xs: 2, sm: 2.5, md: 3 },
                    mb: 4,
                  }}
                >
                  {mistakes.map((mistake, index) => (
                    <Box
                      key={`${mistake.fileName}:${mistake.word}:${index}`}
                    >
                      <MistakeCard mistake={mistake} />
                    </Box>
                  ))}
                </Box>
              ) : (
                <Paper
                  sx={{
                    p: 4,
                    textAlign: 'center',
                    bgcolor: 'background.paper',
                    borderRadius: 2,
                  }}
                >
                  <Typography variant="body1" color="text.secondary">
                    Không tìm thấy từ vựng nào phù hợp với bộ lọc của bạn.
                  </Typography>
                </Paper>
              )
            )}
          </>
        ) : (
          <EmptyState />
        )}
      </Container>
    </Box>
  );
};

export default ResultPage;

