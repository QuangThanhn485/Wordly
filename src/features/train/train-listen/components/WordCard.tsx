// WordCard.tsx
import React from 'react';
import { Box, Card, CardContent, Typography, Chip } from '@mui/material';
import { CheckCircle as CheckCircleIcon } from 'lucide-react';
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
            {/* Show language label based on mode */}
            <Typography
              variant="caption"
              sx={{ 
                display: 'block', 
                textAlign: 'center', 
                mb: { xs: 0.25, sm: 0.5 },
                opacity: 0.8,
                fontWeight: 500,
                fontSize: { xs: '0.6875rem', sm: '0.75rem' }, // Smaller on mobile
              }}
            >
              {showLang === 'vi' ? 'EN' : 'VI'}
            </Typography>
            <Typography
              variant="h5"
              align="center"
              fontWeight="bold"
              sx={{
                fontSize: { xs: '1rem', sm: '1.35rem', md: '1.5rem' }, // Smaller on mobile
                lineHeight: 1.25,
                wordBreak: 'break-word',
                // Ensure text is always readable with high contrast
                color: 'inherit',
              }}
            >
              {/* VI-EN mode (showLang === 'vi'): show English on cards */}
              {/* EN-VI mode (showLang === 'en'): show Vietnamese on cards */}
              {showLang === 'vi' ? en : vi}
            </Typography>
            <Typography
              variant="body2"
              align="center"
              sx={{ 
                mt: { xs: 0.75, sm: 1.25 },
                userSelect: 'none',
                opacity: 0.7,
                fontSize: { xs: '0.75rem', sm: '0.875rem' }, // Smaller on mobile
              }}
            >
              Tap a card to answer
            </Typography>
          </CardContent>
        </Card>

        <Card sx={cardBackRotate(theme)}>
          <CardContent sx={{ width: '100%' }}>
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1 }}>
              <Chip icon={<CheckCircleIcon size={16} />} label="Correct" size="small" sx={solvedBadgeSx(theme)} />
            </Box>

            <Typography 
              variant="subtitle2" 
              align="center" 
              sx={{ 
                mb: { xs: 0.25, sm: 0.5 },
                opacity: 0.8,
                fontWeight: 500,
                color: 'inherit',
                fontSize: { xs: '0.6875rem', sm: '0.75rem' },
              }}
            >
              EN
            </Typography>
            <Typography 
              variant="h6" 
              align="center" 
              fontWeight={700} 
              sx={{ 
                wordBreak: 'break-word', 
                mb: { xs: 0.5, sm: 1 },
                color: 'inherit',
                fontSize: { xs: '0.875rem', sm: '1rem' },
              }}
            >
              {en}
            </Typography>

            <Typography 
              variant="subtitle2" 
              align="center" 
              sx={{ 
                mb: { xs: 0.125, sm: 0.25 },
                opacity: 0.8,
                fontWeight: 500,
                color: 'inherit',
                fontSize: { xs: '0.6875rem', sm: '0.75rem' },
              }}
            >
              VI
            </Typography>
            <Typography 
              variant="body1" 
              align="center" 
              sx={{ 
                fontSize: { xs: '0.8125rem', sm: '1rem' },
                wordBreak: 'break-word', 
                mb: { xs: 0.5, sm: 1 },
                color: 'inherit',
              }}
            >
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

