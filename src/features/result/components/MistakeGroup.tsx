// src/features/result/components/MistakeGroup.tsx
import React from 'react';
import { Box, Typography, useTheme } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { MistakeCard } from './MistakeCard';
import { type MistakesByMode } from '../utils/dataTransform';
import { BookOpen, Headphones, Edit, Mic } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface MistakeGroupProps {
  group: MistakesByMode;
}

const getModeIcon = (mode: string) => {
  const icons: Record<string, React.ReactNode> = {
    'flashcards-reading': <BookOpen size={18} />,
    'flashcards-listening': <Headphones size={18} />,
    'read-write': <Edit size={18} />,
    'listen-write': <Mic size={18} />,
  };
  return icons[mode] || <BookOpen size={18} />;
};

export const MistakeGroup: React.FC<MistakeGroupProps> = ({ group }) => {
  const { t } = useTranslation('result');
  const theme = useTheme();

  if (group.mistakes.length === 0) return null;

  return (
    <Box sx={{ mb: 3 }}>
      {/* Slim header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.25,
          mb: 1.5,
          pb: 1,
          borderBottom: `1px solid ${theme.palette.divider}`,
        }}
      >
        <Box
          sx={{
            width: 30,
            height: 30,
            borderRadius: 1.5,
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'primary.main',
            bgcolor: alpha(theme.palette.primary.main, 0.12),
          }}
        >
          {getModeIcon(group.mode)}
        </Box>
        <Typography sx={{ fontWeight: 700, fontSize: '1rem', minWidth: 0 }} noWrap>
          {group.label}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
          {group.totalWords} {t('group.words')} · {group.totalMistakes} {t('group.mistakes')}
        </Typography>
      </Box>

      {/* Cards */}
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
        {group.mistakes.map((mistake, index) => {
          const modeSpecificMistake = {
            ...mistake,
            totalMistakes: mistake.mistakesByMode[group.mode] || 0,
            allModes: [group.mode],
          };
          return (
            <MistakeCard
              key={`${mistake.topicId}:${mistake.wordId}:${group.mode}:${index}`}
              mistake={modeSpecificMistake}
              context="mode"
            />
          );
        })}
      </Box>
    </Box>
  );
};
