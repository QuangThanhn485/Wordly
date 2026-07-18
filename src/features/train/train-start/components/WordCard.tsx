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
  disabled?: boolean;
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
  disabled = false,
}) => {
  const theme = useTheme();
  const { t } = useTranslation('train');
  const isDark = theme.palette.mode === 'dark';
  const frontAccent = theme.palette.primary.main;
  return (
    <Box
      onClick={() => {
        if (!disabled) onAttempt();
      }}
      onKeyDown={(e) => {
        if (disabled) return;
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
        borderRadius: 1,
        cursor: disabled ? 'default' : 'pointer',
        '&:focus-visible': {
          outline: `2px solid ${alpha(frontAccent, isDark ? 0.55 : 0.45)}`,
          outlineOffset: 4,
        },
      }}
      data-shake-seq={shakeKey}
      role="button"
      aria-label={t('flashcards.cardAriaLabel', { word: en })}
      aria-disabled={disabled}
      tabIndex={disabled ? -1 : 0}
    >
      <Box sx={boxRotate(flipped)}>
        <Card elevation={0} sx={cardFront(theme)}>
          <CardContent
            sx={{
              width: '100%',
              height: '100%',
              p: { xs: 1.5, sm: 2, md: 2.25 },
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'space-between',
              '&:last-child': { pb: { xs: 1.5, sm: 2, md: 2.25 } },
            }}
          >
            <Typography
              variant="overline"
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'text.secondary',
                fontWeight: 700,
                letterSpacing: 0,
                lineHeight: 1,
                userSelect: 'none',
                fontSize: '0.6875rem',
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
                fontWeight={700}
                sx={{
                  fontSize: { xs: '1.25rem', sm: '1.45rem', md: '1.625rem' },
                  lineHeight: 1.2,
                  letterSpacing: 0,
                  width: '100%',
                  maxWidth: '100%',
                  whiteSpace: 'normal',
                  wordBreak: 'break-word',
                  overflowWrap: 'anywhere',
                  color: 'inherit',
                }}
              >
                {showLang === 'vi' ? en : vi}
              </Typography>
              <Box
                sx={{
                  width: { xs: '36%', sm: '30%' },
                  height: '1px',
                  borderRadius: 1,
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
                    borderRadius: 1,
                    border: '1px solid',
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
                      fontWeight: 600,
                      letterSpacing: 0,
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
                      fontWeight: 600,
                      fontSize: { xs: '0.9375rem', sm: '1rem' },
                      width: '100%',
                      maxWidth: '100%',
                      whiteSpace: 'normal',
                      wordBreak: 'break-word',
                      overflowWrap: 'anywhere',
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
                  fontWeight: 500,
                  letterSpacing: 0,
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
              p: { xs: 1.5, sm: 2, md: 2.25 },
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'flex-start',
              '&:last-child': { pb: { xs: 1.5, sm: 2, md: 2.25 } },
            }}
          >
            <Chip icon={<CheckCircleIcon size={16} />} label={t('common.correct')} size="small" sx={solvedBadgeSx(theme)} />

            <Box
              sx={{
                width: '100%',
                display: 'grid',
                gap: { xs: 0.5, sm: 0.75 },
                mt: { xs: 0.75, sm: 1 },
              }}
            >
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.25 }}>
                <Typography
                  variant="overline"
                  sx={{
                    letterSpacing: 0,
                    fontWeight: 600,
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
                  fontWeight={700}
                  sx={{
                    overflowWrap: 'anywhere',
                    letterSpacing: 0,
                    width: '100%',
                    maxWidth: '100%',
                    whiteSpace: 'normal',
                    wordBreak: 'break-word',
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
                    letterSpacing: 0,
                    fontWeight: 600,
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
                    fontWeight: 600,
                    width: '100%',
                    maxWidth: '100%',
                    whiteSpace: 'normal',
                    wordBreak: 'break-word',
                    overflowWrap: 'anywhere',
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
