// src/features/result/components/MistakeGroupByFile.tsx
import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Chip,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { MistakeCard } from './MistakeCard';
import { type MistakesByFile } from '../utils/dataTransform';
import { getTrainingModeLabel } from '../utils/dataTransform';
import FolderIcon from '@mui/icons-material/Folder';

interface MistakeGroupByFileProps {
  group: MistakesByFile;
}

export const MistakeGroupByFile: React.FC<MistakeGroupByFileProps> = ({ group }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  if (group.mistakes.length === 0) return null;

  return (
    <Box sx={{ mb: 4 }}>
      {/* Group Header */}
      <Paper
        elevation={2}
        sx={{
          p: { xs: 2, sm: 2.5 },
          mb: 2.5,
          borderRadius: 2,
          bgcolor: 'background.paper',
          border: `2px solid ${theme.palette.secondary.main}20`,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box
              sx={{
                p: 1.5,
                borderRadius: 2,
                bgcolor: 'secondary.main',
                color: 'secondary.contrastText',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <FolderIcon />
            </Box>
            <Box>
              <Typography
                variant="h5"
                fontWeight={700}
                sx={{
                  fontSize: { xs: '1.25rem', sm: '1.5rem' },
                  mb: 0.5,
                  wordBreak: 'break-word',
                }}
              >
                {group.fileName}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {group.totalWords} từ vựng • {group.totalMistakes} lỗi
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Chip
              label={`${group.totalWords} từ`}
              size="small"
              color="secondary"
              variant="outlined"
            />
            <Chip
              label={`${group.totalMistakes} lỗi`}
              size="small"
              color="error"
              variant="outlined"
            />
          </Box>
        </Box>

        {/* Training modes in this file */}
        {Object.keys(group.mistakesByMode).length > 0 && (
          <Box sx={{ mt: 2, pt: 2, borderTop: `1px solid ${theme.palette.divider}` }}>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
              Chế độ training:
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
              {Object.entries(group.mistakesByMode).map(([mode, count]) => (
                <Chip
                  key={mode}
                  label={`${getTrainingModeLabel(mode)} (${count})`}
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
        )}
      </Paper>

      {/* Mistake Cards Grid */}
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
        }}
      >
        {group.mistakes.map((mistake, index) => (
          <Box
            key={`${mistake.fileName}:${mistake.word}:${index}`}
          >
            <MistakeCard mistake={mistake} />
          </Box>
        ))}
      </Box>
    </Box>
  );
};

