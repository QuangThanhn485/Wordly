import { Box, Button, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { keyframes } from '@mui/system';
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  PauseCircle,
  Volume2,
} from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { speakEnglish } from '@/utils/speechUtils';

const reveal = keyframes`
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
`;

type AnswerReviewPanelProps = {
  englishWord: string;
  vietnameseMeaning: string;
  autoAdvanceDisabled: boolean;
  reviewDurationMs: number;
  onNext: () => void;
};

export const AnswerReviewPanel = ({
  englishWord,
  vietnameseMeaning,
  autoAdvanceDisabled,
  reviewDurationMs,
  onNext,
}: AnswerReviewPanelProps) => {
  const theme = useTheme();
  const { t } = useTranslation('train');
  const isDark = theme.palette.mode === 'dark';
  const isAdvancingRef = useRef(false);

  useEffect(() => {
    isAdvancingRef.current = false;
  }, [englishWord, vietnameseMeaning]);

  useEffect(() => {
    const handleEnter = (event: KeyboardEvent) => {
      if (
        event.key !== 'Enter' ||
        event.defaultPrevented ||
        event.repeat ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        event.shiftKey ||
        isAdvancingRef.current
      ) {
        return;
      }

      const target = event.target;
      if (
        target instanceof Element &&
        target.closest(
          'button, a, input, textarea, select, [contenteditable="true"]',
        )
      ) {
        return;
      }

      if (document.querySelector('[role="dialog"]')) return;

      event.preventDefault();
      isAdvancingRef.current = true;
      onNext();
    };

    window.addEventListener('keydown', handleEnter);
    return () => window.removeEventListener('keydown', handleEnter);
  }, [onNext]);

  return (
    <Box
      role="status"
      aria-live="polite"
      sx={{
        animation: `${reveal} 220ms ease-out`,
      }}
    >
      <Box
        sx={{
          px: { xs: 2, sm: 3 },
          py: { xs: 2, sm: 2.5 },
          display: 'flex',
          alignItems: 'center',
          gap: 1.25,
          color: 'success.main',
          bgcolor: alpha(theme.palette.success.main, isDark ? 0.14 : 0.07),
          borderBottom: '1px solid',
          borderColor: alpha(theme.palette.success.main, isDark ? 0.28 : 0.18),
        }}
      >
        <CheckCircle2 size={24} />
        <Box sx={{ minWidth: 0 }}>
          <Typography
            sx={{
              fontSize: '1rem',
              lineHeight: 1.3,
              fontWeight: 700,
              color: 'success.main',
            }}
          >
            {t('review.correctTitle')}
          </Typography>
          <Typography
            sx={{
              mt: 0.125,
              fontSize: '0.8125rem',
              lineHeight: 1.35,
              color: 'text.secondary',
            }}
          >
            {t('review.correctDescription')}
          </Typography>
        </Box>
      </Box>

      <Box
        sx={{
          px: { xs: 2, sm: 3 },
          py: { xs: 2.5, sm: 3 },
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'minmax(0, 0.9fr) minmax(0, 1.1fr)' },
          gap: { xs: 2, sm: 3 },
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography
            sx={{
              mb: 0.625,
              color: 'text.secondary',
              fontSize: '0.6875rem',
              lineHeight: 1.2,
              fontWeight: 700,
              letterSpacing: 0,
              textTransform: 'uppercase',
            }}
          >
            {t('common.english')}
          </Typography>
          <Stack direction="row" spacing={0.75} alignItems="center">
            <Typography
              sx={{
                minWidth: 0,
                color: 'text.primary',
                fontSize: { xs: '1.375rem', sm: '1.5rem' },
                lineHeight: 1.25,
                fontWeight: 700,
                wordBreak: 'break-word',
              }}
            >
              {englishWord}
            </Typography>
            <Tooltip title={t('review.replay')}>
              <IconButton
                size="small"
                onClick={() => speakEnglish(englishWord, { lang: 'en-US' })}
                aria-label={t('review.replay')}
                sx={{
                  flexShrink: 0,
                  color: 'primary.main',
                  border: '1px solid',
                  borderColor: alpha(theme.palette.primary.main, isDark ? 0.35 : 0.22),
                  bgcolor: alpha(theme.palette.primary.main, isDark ? 0.12 : 0.05),
                }}
              >
                <Volume2 size={17} />
              </IconButton>
            </Tooltip>
          </Stack>
        </Box>

        <Box sx={{ minWidth: 0 }}>
          <Typography
            sx={{
              mb: 0.625,
              color: 'text.secondary',
              fontSize: '0.6875rem',
              lineHeight: 1.2,
              fontWeight: 700,
              letterSpacing: 0,
              textTransform: 'uppercase',
            }}
          >
            {t('common.vietnamese')}
          </Typography>
          <Typography
            sx={{
              color: 'text.primary',
              fontSize: { xs: '1.0625rem', sm: '1.125rem' },
              lineHeight: 1.45,
              fontWeight: 500,
              wordBreak: 'break-word',
            }}
          >
            {vietnameseMeaning}
          </Typography>
        </Box>
      </Box>

      <Box
        sx={{
          minHeight: 64,
          px: { xs: 2, sm: 3 },
          py: 1.25,
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: { xs: 'stretch', sm: 'center' },
          justifyContent: 'space-between',
          gap: 1.25,
          borderTop: '1px solid',
          borderColor: 'divider',
          bgcolor: alpha(theme.palette.background.default, isDark ? 0.26 : 0.55),
        }}
      >
        <Box
          sx={{
            minWidth: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 0.75,
            color: 'text.secondary',
          }}
        >
          {autoAdvanceDisabled ? (
            <PauseCircle size={17} />
          ) : (
            <Clock3 size={17} />
          )}
          <Typography sx={{ fontSize: '0.8125rem', lineHeight: 1.35 }}>
            {autoAdvanceDisabled
              ? t('review.manualAdvance')
              : t('review.autoAdvance', {
                  seconds: reviewDurationMs / 1000,
                })}
          </Typography>
        </Box>

        <Button
          type="button"
          variant="contained"
          color="primary"
          size="medium"
          endIcon={<ArrowRight size={17} />}
          onClick={onNext}
          sx={{
            minWidth: { xs: '100%', sm: 140 },
            minHeight: 38,
            borderRadius: 1,
            px: 2,
            py: 0.75,
            fontSize: '0.875rem',
            lineHeight: 1.2,
            fontWeight: 700,
            boxShadow: 'none',
          }}
        >
          {t('buttons.nextQuestion')}
        </Button>
      </Box>
    </Box>
  );
};
