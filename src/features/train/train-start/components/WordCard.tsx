// WordCard.tsx
import React from 'react';
import { Box, Card, CardContent, Typography, Chip } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useTheme } from '@mui/material/styles';
import {
  cardFront,
  cardBackRotate,
  boxRotate,
  cardContainer,
  shakeKF,
  solvedBadgeSx,
} from './styles';

interface WordCardProps {
  en: string;
  vi: string;
  meaning?: string;
  showLang?: 'vi' | 'en';
  flipped: boolean;
  onAttempt: () => void;
  shouldShake?: boolean;
  shakeKey?: number;
}

export const WordCard: React.FC<WordCardProps> = ({
  en,
  vi,
  meaning,
  showLang = 'vi',
  flipped,
  onAttempt,
  shouldShake = false,
  shakeKey = 0,
}) => {
  const theme = useTheme();
  return (
    <Box
      onClick={onAttempt}
      sx={{
        ...cardContainer,
        animation:
          shouldShake && !flipped
            ? `${shakeKF} 0.35s cubic-bezier(.36,.07,.19,.97) both`
            : 'none',
      }}
      data-shake-seq={shakeKey}
      role="button"
      aria-label={`Flashcard for ${en}`}
    >
      <Box sx={boxRotate(flipped)}>
        <Card sx={cardFront(theme)}>
          <CardContent sx={{ width: '100%' }}>
            {showLang === 'en' && (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: 'block', textAlign: 'center', mb: 0.5 }}
              >
                EN
              </Typography>
            )}
            <Typography
              variant="h5"
              align="center"
              fontWeight="bold"
              sx={{
                fontSize: { xs: '1.2rem', sm: '1.35rem', md: '1.5rem' },
                lineHeight: 1.25,
                wordBreak: 'break-word',
              }}
            >
              {en}
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              align="center"
              sx={{ mt: 1.25, userSelect: 'none' }}
            >
              Tap a card to answer
            </Typography>
          </CardContent>
        </Card>

        <Card sx={cardBackRotate(theme)}>
          <CardContent sx={{ width: '100%' }}>
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1 }}>
              <Chip icon={<CheckCircleIcon />} label="Correct" size="small" sx={solvedBadgeSx(theme)} />
            </Box>

            <Typography variant="subtitle2" color="text.secondary" align="center" sx={{ mb: 0.5 }}>
              EN
            </Typography>
            <Typography variant="h6" align="center" fontWeight={700} sx={{ wordBreak: 'break-word', mb: 1 }}>
              {en}
            </Typography>

            <Typography variant="subtitle2" color="text.secondary" align="center" sx={{ mb: 0.25 }}>
              VI
            </Typography>
            <Typography variant="body1" align="center" sx={{ fontSize: { xs: '0.95rem', sm: '1rem' }, wordBreak: 'break-word', mb: 1 }}>
              {vi}
            </Typography>

            {meaning && (
              <>
                <Typography variant="subtitle2" color="text.secondary" align="center">
                  Meaning
                </Typography>
                <Typography
                  variant="body2"
                  align="center"
                  sx={{ fontSize: { xs: '0.9rem', sm: '0.95rem' }, lineHeight: 1.5, wordBreak: 'break-word' }}
                >
                  {meaning}
                </Typography>
              </>
            )}
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
};
