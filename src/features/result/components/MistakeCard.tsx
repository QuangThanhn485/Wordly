// src/features/result/components/MistakeCard.tsx
import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  useTheme,
  Tooltip,
} from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import FolderIcon from '@mui/icons-material/Folder';
import { type ProcessedMistake } from '../utils/dataTransform';
import { getTrainingModeLabel, formatTimeAgo, getMistakeSeverity } from '../utils/dataTransform';

interface MistakeCardProps {
  mistake: ProcessedMistake;
}

export const MistakeCard: React.FC<MistakeCardProps> = ({ mistake }) => {
  const theme = useTheme();
  const severity = getMistakeSeverity(mistake.totalMistakes);

  const severityColors = {
    high: {
      bg: theme.palette.error.light + '20',
      border: theme.palette.error.main,
      text: theme.palette.error.main,
    },
    medium: {
      bg: theme.palette.warning.light + '20',
      border: theme.palette.warning.main,
      text: theme.palette.warning.main,
    },
    low: {
      bg: theme.palette.info.light + '20',
      border: theme.palette.info.main,
      text: theme.palette.info.main,
    },
  };

  const colors = severityColors[severity];

  return (
    <Card
      sx={{
        height: '100%',
        border: `2px solid ${colors.border}40`,
        borderRadius: 2,
        transition: 'all 0.2s',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: theme.shadows[8],
          borderColor: colors.border,
        },
      }}
    >
      <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
        {/* Header with mistake count */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Chip
            icon={<ErrorOutlineIcon />}
            label={`${mistake.totalMistakes} ${mistake.totalMistakes === 1 ? 'lỗi' : 'lỗi'}`}
            size="small"
            sx={{
              bgcolor: colors.bg,
              color: colors.text,
              fontWeight: 600,
              border: `1px solid ${colors.border}60`,
            }}
          />
          <Tooltip title={formatTimeAgo(mistake.lastMistakeTime)}>
            <Chip
              icon={<AccessTimeIcon />}
              label={formatTimeAgo(mistake.lastMistakeTime)}
              size="small"
              variant="outlined"
              sx={{ fontSize: '0.75rem' }}
            />
          </Tooltip>
        </Box>

        {/* Word */}
        <Typography
          variant="h5"
          fontWeight={700}
          sx={{
            mb: 1,
            color: 'primary.main',
            fontSize: { xs: '1.25rem', sm: '1.5rem' },
            wordBreak: 'break-word',
          }}
        >
          {mistake.word}
        </Typography>

        {/* Vietnamese meaning */}
        <Typography
          variant="body1"
          color="text.secondary"
          sx={{
            mb: 2,
            fontSize: { xs: '0.875rem', sm: '1rem' },
            wordBreak: 'break-word',
          }}
        >
          {mistake.viMeaning}
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {/* File name */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <FolderIcon sx={{ fontSize: '1rem', color: 'text.secondary' }} />
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                fontSize: { xs: '0.75rem', sm: '0.875rem' },
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {mistake.fileName}
            </Typography>
          </Box>

          {/* Training modes */}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
            {mistake.allModes.map((mode) => (
              <Chip
                key={mode}
                label={`${getTrainingModeLabel(mode)} (${mistake.mistakesByMode[mode] || 0})`}
                size="small"
                variant="outlined"
                sx={{
                  fontSize: { xs: '0.6875rem', sm: '0.75rem' },
                  height: { xs: 24, sm: 28 },
                }}
              />
            ))}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

