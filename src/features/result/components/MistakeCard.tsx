// src/features/result/components/MistakeCard.tsx
import React from 'react';
import { Card, CardContent, Typography, Box, Chip, useTheme } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { AlertCircle, Folder } from 'lucide-react';
import { type ProcessedMistake } from '../utils/dataTransform';
import { getTrainingModeLabel, formatTimeAgo, getMistakeSeverity } from '../utils/dataTransform';

interface MistakeCardProps {
  mistake: ProcessedMistake;
  /**
   * Where the card is rendered, so redundant context can be dropped:
   * - 'mode'  → inside a By-mode group: hide the per-mode chips.
   * - 'topic' → inside a By-topic group: hide the topic line.
   * - 'all'   → flat list: show everything.
   */
  context?: 'all' | 'mode' | 'topic';
}

const clamp = (lines: number) => ({
  display: '-webkit-box',
  WebkitLineClamp: lines,
  WebkitBoxOrient: 'vertical' as const,
  overflow: 'hidden',
});

export const MistakeCard: React.FC<MistakeCardProps> = ({ mistake, context = 'all' }) => {
  const theme = useTheme();
  const severity = getMistakeSeverity(mistake.totalMistakes);
  const accent = {
    high: theme.palette.error.main,
    medium: theme.palette.warning.main,
    low: theme.palette.info.main,
  }[severity];

  const showTopic = context !== 'topic';
  const showModes = context !== 'mode';

  return (
    <Card
      variant="outlined"
      sx={{
        height: '100%',
        borderRadius: 2,
        borderLeft: `3px solid ${accent}`,
        transition: 'box-shadow 0.2s, border-color 0.2s',
        '&:hover': { boxShadow: theme.shadows[4] },
      }}
    >
      <CardContent
        sx={{
          p: 1.5,
          '&:last-child': { pb: 1.5 },
          display: 'flex',
          flexDirection: 'column',
          gap: 0.5,
          height: '100%',
        }}
      >
        {/* Word + mistake count */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1 }}>
          <Typography
            sx={{
              fontWeight: 700,
              color: 'primary.main',
              fontSize: '1.05rem',
              lineHeight: 1.25,
              wordBreak: 'break-word',
              ...clamp(2),
            }}
          >
            {mistake.word}
          </Typography>
          <Box
            sx={{
              flexShrink: 0,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.25,
              px: 0.75,
              py: 0.125,
              borderRadius: 1,
              color: accent,
              bgcolor: alpha(accent, 0.12),
              fontWeight: 700,
              fontSize: '0.8125rem',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            <AlertCircle size={13} />
            {mistake.totalMistakes}
          </Box>
        </Box>

        {/* Meaning */}
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ wordBreak: 'break-word', ...clamp(2) }}
        >
          {mistake.viMeaning}
        </Typography>

        {/* Topic (only when not already grouped by topic) */}
        {showTopic && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'text.disabled', minWidth: 0 }}>
            <Folder size={13} style={{ flexShrink: 0 }} />
            <Typography variant="caption" color="text.secondary" noWrap sx={{ minWidth: 0 }}>
              {mistake.topicLabel}
            </Typography>
          </Box>
        )}

        {/* Footer: per-mode breakdown + time */}
        <Box
          sx={{
            mt: 'auto',
            pt: 0.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 1,
            flexWrap: 'wrap',
          }}
        >
          {showModes ? (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, minWidth: 0 }}>
              {mistake.allModes.map((mode) => (
                <Chip
                  key={mode}
                  label={`${getTrainingModeLabel(mode)} · ${mistake.mistakesByMode[mode] || 0}`}
                  size="small"
                  variant="outlined"
                  sx={{ height: 22, fontSize: '0.6875rem', '& .MuiChip-label': { px: 0.75 } }}
                />
              ))}
            </Box>
          ) : (
            <span />
          )}
          <Typography variant="caption" color="text.disabled" sx={{ whiteSpace: 'nowrap', ml: 'auto' }}>
            {formatTimeAgo(mistake.lastMistakeTime)}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};
