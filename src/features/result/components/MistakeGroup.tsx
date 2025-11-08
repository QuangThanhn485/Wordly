// src/features/result/components/MistakeGroup.tsx
import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Chip,
  useTheme,
  useMediaQuery,
  Divider,
} from '@mui/material';
import { MistakeCard } from './MistakeCard';
import { type MistakesByMode } from '../utils/dataTransform';
import AutoStoriesIcon from '@mui/icons-material/AutoStories';
import HeadphonesIcon from '@mui/icons-material/Headphones';
import EditIcon from '@mui/icons-material/Edit';
import KeyboardVoiceIcon from '@mui/icons-material/KeyboardVoice';

interface MistakeGroupProps {
  group: MistakesByMode;
}

const getModeIcon = (mode: string) => {
  const icons: Record<string, React.ReactNode> = {
    'flashcards-reading': <AutoStoriesIcon />,
    'flashcards-listening': <HeadphonesIcon />,
    'read-write': <EditIcon />,
    'listen-write': <KeyboardVoiceIcon />,
  };
  return icons[mode] || <AutoStoriesIcon />;
};

export const MistakeGroup: React.FC<MistakeGroupProps> = ({ group }) => {
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
          border: `2px solid ${theme.palette.primary.main}20`,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box
              sx={{
                p: 1.5,
                borderRadius: 2,
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {getModeIcon(group.mode)}
            </Box>
            <Box>
              <Typography
                variant="h5"
                fontWeight={700}
                sx={{
                  fontSize: { xs: '1.25rem', sm: '1.5rem' },
                  mb: 0.5,
                }}
              >
                {group.label}
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
              color="primary"
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
        {group.mistakes.map((mistake, index) => {
          // Create a mistake object specific to this mode
          const modeSpecificMistake = {
            ...mistake,
            totalMistakes: mistake.mistakesByMode[group.mode] || 0,
            allModes: [group.mode], // Only show this mode
          };

          return (
            <Box
              key={`${mistake.fileName}:${mistake.word}:${group.mode}:${index}`}
            >
              <MistakeCard mistake={modeSpecificMistake} />
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};

