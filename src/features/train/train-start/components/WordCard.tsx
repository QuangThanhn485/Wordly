// WordCard.tsx
import React from 'react';
import { Box, Card, CardContent, Typography, Chip } from '@mui/material';
import { CheckCircle as CheckCircleIcon } from 'lucide-react';
import { alpha, useTheme } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';
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
  showMeaning?: boolean;
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
  showMeaning = false,
}) => {
  const theme = useTheme();
  const { t } = useTranslation('train');
  const isDark = theme.palette.mode === 'dark';
  const frontAccent = theme.palette.primary.main;
  return (
    <Box
      onClick={onAttempt}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onAttempt();
        }
      }}
      sx={{
        ...cardContainer,
        animation:
          shouldShake && !flipped
            ? `${shakeKF} 0.35s cubic-bezier(.36,.07,.19,.97) both`
            : 'none',
        outline: 'none',
        borderRadius: { xs: 3, sm: 3.5, md: 4 },
        '&:focus-visible': {
          outline: `2px solid ${alpha(frontAccent, isDark ? 0.55 : 0.45)}`,
          outlineOffset: 4,
        },
      }}
      data-shake-seq={shakeKey}
      role="button"
      aria-label={t('flashcards.cardAriaLabel', { word: en })}
      tabIndex={0}
    >
      <Box sx={boxRotate(flipped)}>
        <Card elevation={0} sx={cardFront(theme)}>
          <CardContent
            sx={{
              width: '100%',
              height: '100%',
              p: { xs: 2, sm: 2.5, md: 3 },
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'space-between',
              '&:last-child': { pb: { xs: 2, sm: 2.5, md: 3 } },
            }}
          >
            <Typography
              variant="overline"
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                px: 1,
                py: 0.25,
                borderRadius: 999,
                border: `1px solid ${alpha(frontAccent, isDark ? 0.45 : 0.3)}`,
                bgcolor: alpha(frontAccent, isDark ? 0.16 : 0.08),
                color: isDark ? theme.palette.primary.light : theme.palette.primary.dark,
                fontWeight: 800,
                letterSpacing: 1.4,
                lineHeight: 1,
                userSelect: 'none',
                fontSize: { xs: '0.625rem', sm: '0.6875rem' },
              }}
            >
              {showLang === 'vi' ? 'EN' : 'VI'}
            </Typography>

            <Box
              sx={{
                flex: 1,
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
              }}
            >
              <Typography
                variant="h5"
                align="center"
                fontWeight={800}
                sx={{
                  fontSize: { xs: '1.35rem', sm: '1.6rem', md: '1.85rem' },
                  lineHeight: 1.15,
                  letterSpacing: '-0.02em',
                  wordBreak: 'break-word',
                  color: 'inherit',
                }}
              >
                {showLang === 'vi' ? en : vi}
              </Typography>
              <Box
                sx={{
                  width: { xs: '42%', sm: '36%' },
                  height: 2,
                  borderRadius: 999,
                  bgcolor: alpha(frontAccent, isDark ? 0.35 : 0.25),
                  mt: { xs: 1, sm: 1.25 },
                }}
              />

              {showMeaning && !flipped && (
                <Box
                  sx={{
                    mt: { xs: 1.25, sm: 1.5 },
                    px: { xs: 1.25, sm: 1.5 },
                    py: { xs: 0.9, sm: 1 },
                    width: '100%',
                    borderRadius: 2.5,
                    border: '1px dashed',
                    borderColor: alpha(shouldShake ? theme.palette.error.main : theme.palette.info.main, isDark ? 0.55 : 0.35),
                    bgcolor: alpha(shouldShake ? theme.palette.error.main : theme.palette.info.main, isDark ? 0.16 : 0.09),
                    color: shouldShake ? theme.palette.error.main : theme.palette.info.main,
                    animation: 'fadeIn 0.18s ease-out',
                    '@keyframes fadeIn': {
                      from: { opacity: 0, transform: 'translateY(-4px)' },
                      to: { opacity: 1, transform: 'translateY(0)' },
                    },
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{
                      display: 'block',
                      textAlign: 'center',
                      fontWeight: 800,
                      letterSpacing: 1.1,
                      opacity: isDark ? 0.95 : 0.9,
                      mb: 0.25,
                    }}
                  >
                    {showLang === 'vi' ? 'VI' : 'EN'}
                  </Typography>
                  <Typography
                    variant="body1"
                    align="center"
                    sx={{
                      fontWeight: 800,
                      fontSize: { xs: '1rem', sm: '1.05rem' },
                      wordBreak: 'break-word',
                      color: 'inherit',
                    }}
                  >
                    {showLang === 'vi' ? vi : en}
                  </Typography>
                </Box>
              )}
            </Box>

            {!showMeaning && (
              <Typography
                variant="caption"
                align="center"
                sx={{
                  userSelect: 'none',
                  color: 'text.secondary',
                  fontWeight: 600,
                  letterSpacing: 0.2,
                  fontSize: { xs: '0.75rem', sm: '0.8125rem' },
                  opacity: isDark ? 0.9 : 0.8,
                }}
              >
                {t('flashcards.tapToAnswer')}
              </Typography>
            )}
          </CardContent>
        </Card>

        <Card elevation={0} sx={cardBackRotate(theme)}>
          <CardContent
            sx={{
              width: '100%',
              height: '100%',
              p: { xs: 2, sm: 2.5, md: 3 },
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'flex-start',
              '&:last-child': { pb: { xs: 2, sm: 2.5, md: 3 } },
            }}
          >
            <Chip icon={<CheckCircleIcon size={16} />} label={t('common.correct')} size="small" sx={solvedBadgeSx(theme)} />

            <Box
              sx={{
                width: '100%',
                display: 'grid',
                gap: { xs: 1.1, sm: 1.25 },
                mt: { xs: 1.25, sm: 1.5 },
              }}
            >
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.25 }}>
                <Typography
                  variant="overline"
                  sx={{
                    letterSpacing: 1.4,
                    fontWeight: 800,
                    color: 'text.secondary',
                    userSelect: 'none',
                    fontSize: { xs: '0.625rem', sm: '0.6875rem' },
                  }}
                >
                  EN
                </Typography>
                <Typography
                  variant="h6"
                  align="center"
                  fontWeight={800}
                  sx={{
                    wordBreak: 'break-word',
                    letterSpacing: '-0.01em',
                    fontSize: { xs: '1rem', sm: '1.05rem' },
                    color: 'inherit',
                  }}
                >
                  {en}
                </Typography>
              </Box>

              <Box sx={{ height: 1, width: '100%', bgcolor: alpha(theme.palette.divider, isDark ? 0.35 : 0.9) }} />

              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.25 }}>
                <Typography
                  variant="overline"
                  sx={{
                    letterSpacing: 1.4,
                    fontWeight: 800,
                    color: 'text.secondary',
                    userSelect: 'none',
                    fontSize: { xs: '0.625rem', sm: '0.6875rem' },
                  }}
                >
                  VI
                </Typography>
                <Typography
                  variant="body1"
                  align="center"
                  sx={{
                    fontSize: { xs: '0.95rem', sm: '1.05rem' },
                    fontWeight: 800,
                    wordBreak: 'break-word',
                    color: 'inherit',
                  }}
                >
                  {vi}
                </Typography>
              </Box>

              {meaning && (
                <Box sx={{ mt: { xs: 0.25, sm: 0.5 } }}>
                  <Typography variant="overline" align="center" sx={{ display: 'block', color: 'text.secondary' }}>
                    Meaning
                  </Typography>
                  <Typography
                    variant="body2"
                    align="center"
                    sx={{ fontSize: { xs: '0.875rem', sm: '0.95rem' }, lineHeight: 1.5, wordBreak: 'break-word' }}
                  >
                    {meaning}
                  </Typography>
                </Box>
              )}
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
};
