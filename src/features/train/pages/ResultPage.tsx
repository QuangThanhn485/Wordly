// ResultPage.tsx
import React from 'react';
import {
  Box,
  Container,
  Typography,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import { BarChart3, Layers, FolderTree, List as ListIcon } from 'lucide-react';
import { Trans, useTranslation } from 'react-i18next';
import { useMistakesStats } from '@/features/result/hooks/useMistakesStats';
import { OverviewCards } from '@/features/result/components/OverviewCards';
import { MistakeCard } from '@/features/result/components/MistakeCard';
import { FilterBar } from '@/features/result/components/FilterBar';
import { EmptyState } from '@/features/result/components/EmptyState';
import { MistakeGroup } from '@/features/result/components/MistakeGroup';
import { MistakeGroupByTopic } from '@/features/result/components/MistakeGroupByTopic';
import { MOBILE_PAGE_VIEWPORT_HEIGHT } from '@/layouts/mobileLayoutConstants';

type ViewMode = 'grouped' | 'byTopic' | 'all';

const ResultPage = () => {
  const { t } = useTranslation('result');
  const [viewMode, setViewMode] = React.useState<ViewMode>('grouped');

  const {
    mistakes,
    mistakesByMode,
    mistakesByTopic,
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
    clearFilters,
    hasData,
  } = useMistakesStats();

  const noMatches = (
    <Box sx={{ py: 6, textAlign: 'center' }}>
      <Typography variant="body2" color="text.secondary">
        {t('filters.noMatches')}
      </Typography>
    </Box>
  );

  const viewOptions: { value: ViewMode; label: string; icon: React.ReactNode }[] = [
    { value: 'grouped', label: t('filters.byMode'), icon: <Layers size={16} /> },
    { value: 'byTopic', label: t('filters.byTopic'), icon: <FolderTree size={16} /> },
    { value: 'all', label: t('filters.all'), icon: <ListIcon size={16} /> },
  ];

  return (
    <Box sx={{ width: '100%', minHeight: { xs: MOBILE_PAGE_VIEWPORT_HEIGHT, md: '100vh' }, bgcolor: 'background.default', py: { xs: 1.5, md: 3 } }}>
      <Container maxWidth="xl" sx={{ px: { xs: 1.5, sm: 2, md: 3 } }}>
        {/* Compact toolbar: title + view switcher */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 1.5,
            mb: 2,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
            <BarChart3 size={24} style={{ flexShrink: 0 }} />
            <Typography variant="h6" fontWeight={700} noWrap>
              {t('title')}
            </Typography>
          </Box>

          {hasData && (
            <ToggleButtonGroup
              size="small"
              exclusive
              value={viewMode}
              onChange={(_, next: ViewMode | null) => next && setViewMode(next)}
              aria-label={t('title')}
            >
              {viewOptions.map((option) => (
                <ToggleButton
                  key={option.value}
                  value={option.value}
                  sx={{ textTransform: 'none', px: { xs: 1, sm: 1.5 }, gap: 0.75 }}
                >
                  {option.icon}
                  <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' }, fontWeight: 600 }}>
                    {option.label}
                  </Box>
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          )}
        </Box>

        {hasData ? (
          <>
            <OverviewCards stats={overviewStats} />

            <FilterBar
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              selectedTopicIds={selectedTopicIds}
              onTopicIdsChange={setSelectedTopicIds}
              selectedModes={selectedModes}
              onModesChange={setSelectedModes}
              sortBy={sortBy}
              onSortChange={setSortBy}
              uniqueTopics={uniqueTopics}
              uniqueModes={uniqueModes}
              onClearFilters={clearFilters}
              hideTopicFilter={viewMode === 'byTopic'}
              hideModeFilter={viewMode === 'grouped'}
            />

            {viewMode === 'grouped' ? (
              mistakesByMode.length > 0
                ? mistakesByMode.map((group) => <MistakeGroup key={group.mode} group={group} />)
                : noMatches
            ) : viewMode === 'byTopic' ? (
              mistakesByTopic.length > 0
                ? mistakesByTopic.map((group) => (
                    <MistakeGroupByTopic key={group.topicId} group={group} />
                  ))
                : noMatches
            ) : mistakes.length > 0 ? (
              <>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                  <Trans
                    ns="result"
                    i18nKey="showingCount"
                    values={{ count: mistakes.length }}
                    components={{ strong: <strong /> }}
                  />
                </Typography>
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: {
                      xs: '1fr',
                      sm: 'repeat(2, 1fr)',
                      md: 'repeat(3, 1fr)',
                      lg: 'repeat(4, 1fr)',
                    },
                    gap: { xs: 1.5, md: 2 },
                  }}
                >
                  {mistakes.map((mistake, index) => (
                    <MistakeCard
                      key={`${mistake.topicId}:${mistake.wordId}:${index}`}
                      mistake={mistake}
                      context="all"
                    />
                  ))}
                </Box>
              </>
            ) : (
              noMatches
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
