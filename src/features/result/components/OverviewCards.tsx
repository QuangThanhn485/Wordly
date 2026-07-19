// src/features/result/components/OverviewCards.tsx
import React from 'react';
import { Box, Paper, Typography, useTheme } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { AlertCircle, TrendingUp, Star } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { type OverviewStats } from '../utils/dataTransform';

interface OverviewCardsProps {
  stats: OverviewStats;
}

/**
 * Compact stat strip: three essential figures only. The former "topics" card was
 * dropped because that count is already visible in the By-topic view.
 */
export const OverviewCards: React.FC<OverviewCardsProps> = ({ stats }) => {
  const theme = useTheme();
  const { t } = useTranslation('result');

  const tiles = [
    {
      label: t('overview.uniqueWords'),
      value: stats.totalWords.toLocaleString(),
      icon: <AlertCircle size={18} />,
      color: theme.palette.error.main,
    },
    {
      label: t('overview.totalMistakes'),
      value: stats.totalMistakes.toLocaleString(),
      icon: <TrendingUp size={18} />,
      color: theme.palette.warning.main,
    },
    {
      label: t('overview.mostMissed'),
      value: stats.mostMistakenWord?.word || '—',
      hint: stats.mostMistakenWord
        ? `${stats.mostMistakenWord.count} ${t('overview.times')}`
        : undefined,
      icon: <Star size={18} />,
      color: theme.palette.info.main,
    },
  ];

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)' },
        gap: 1,
        mb: 2,
      }}
    >
      {tiles.map((tile, index) => (
        <Paper
          key={index}
          variant="outlined"
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.25,
            px: 1.5,
            py: 1,
            borderRadius: 2,
            minWidth: 0,
            // On the narrow 2-col layout the wide "most missed" tile spans the row.
            gridColumn: { xs: index === 2 ? '1 / -1' : 'auto', sm: 'auto' },
          }}
        >
          <Box
            sx={{
              width: 34,
              height: 34,
              borderRadius: 1.5,
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: tile.color,
              bgcolor: alpha(tile.color, 0.12),
            }}
          >
            {tile.icon}
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography
              noWrap
              title={String(tile.value)}
              sx={{ fontWeight: 700, fontSize: '1.15rem', lineHeight: 1.2 }}
            >
              {tile.value}
              {tile.hint && (
                <Typography
                  component="span"
                  variant="caption"
                  color="text.secondary"
                  sx={{ ml: 0.75, fontWeight: 500 }}
                >
                  {tile.hint}
                </Typography>
              )}
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              noWrap
              sx={{ display: 'block', lineHeight: 1.3 }}
            >
              {tile.label}
            </Typography>
          </Box>
        </Paper>
      ))}
    </Box>
  );
};
