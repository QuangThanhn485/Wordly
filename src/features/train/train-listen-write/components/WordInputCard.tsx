import React, { useEffect, useRef, useState } from 'react';
import {
  Box,
  Button,
  Card,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { keyframes } from '@mui/system';
import {
  Headphones,
  Lightbulb,
  Play,
  RotateCcw,
  Send,
  Volume2,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { AnswerReviewPanel } from '@/features/train/components';
import { speakEnglish } from '@/utils/speechUtils';

const shake = keyframes`
  10%, 90% { transform: translate3d(-1px, 0, 0); }
  20%, 80% { transform: translate3d(2px, 0, 0); }
  30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
  40%, 60% { transform: translate3d(4px, 0, 0); }
`;

interface WordInputCardProps {
  question: string;
  answer: string;
  englishWord: string;
  vietnameseMeaning: string;
  englishPronunciation?: string;
  englishPartOfSpeech?: string;
  mode: 'vi-en' | 'en-vi';
  onAnswer: (userAnswer: string) => void;
  onHint: () => void;
  onStart: () => void;
  onNext: () => void;
  showHint?: boolean;
  isCompleted?: boolean;
  shouldShake?: boolean;
  shakeKey?: number;
  hasError?: boolean;
  hasStarted?: boolean;
  autoAdvanceDisabled?: boolean;
  answerReviewDurationMs?: number;
}

export const WordInputCard: React.FC<WordInputCardProps> = ({
  question,
  answer,
  englishWord,
  vietnameseMeaning,
  englishPronunciation,
  englishPartOfSpeech,
  mode,
  onAnswer,
  onHint,
  onStart,
  onNext,
  showHint = false,
  isCompleted = false,
  shouldShake = false,
  shakeKey = 0,
  hasError = false,
  hasStarted = false,
  autoAdvanceDisabled = false,
  answerReviewDurationMs = 3000,
}) => {
  const { t } = useTranslation('train');
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const [userInput, setUserInput] = useState('');
  const [hasPlayed, setHasPlayed] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const answerLabel = mode === 'vi-en'
    ? t('common.english')
    : t('common.vietnamese');
  const placeholder = mode === 'vi-en'
    ? t('listenWriteCard.placeholderViEn')
    : t('listenWriteCard.placeholderEnVi');
  const taskDescription = mode === 'vi-en'
    ? t('listenWriteCard.taskViEn')
    : t('listenWriteCard.taskEnVi');
  const accent = hasError && shouldShake
    ? theme.palette.error.main
    : theme.palette.primary.main;

  useEffect(() => {
    setUserInput('');
    if (!hasStarted) setHasPlayed(false);
  }, [hasStarted, question]);

  useEffect(() => {
    if (isCompleted || !hasStarted || !inputRef.current) return;
    const timeout = window.setTimeout(() => inputRef.current?.focus(), 300);
    return () => window.clearTimeout(timeout);
  }, [hasPlayed, hasStarted, isCompleted, question]);

  useEffect(() => {
    if (!shouldShake || !inputRef.current) return;
    const timeout = window.setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 400);
    return () => window.clearTimeout(timeout);
  }, [shakeKey, shouldShake]);

  const handlePlayAudio = () => {
    if (!question) return;
    if (!hasStarted) {
      onStart();
    } else {
      speakEnglish(question, {
        lang: 'en-US',
        phonetic: englishPronunciation,
        partOfSpeech: englishPartOfSpeech,
      });
    }
    setHasPlayed(true);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const value = userInput.trim();
    if (!value || !hasStarted) return;
    onAnswer(value);
    setUserInput('');
  };

  return (
    <Card
      sx={{
        width: '100%',
        maxWidth: 820,
        mx: 'auto',
        overflow: 'hidden',
        border: '1px solid',
        borderColor: isCompleted
          ? alpha(theme.palette.success.main, isDark ? 0.48 : 0.3)
          : alpha(theme.palette.divider, isDark ? 0.34 : 0.78),
        borderRadius: 1,
        bgcolor: 'background.paper',
        boxShadow: isDark
          ? '0 12px 30px rgba(0, 0, 0, 0.22)'
          : '0 10px 28px rgba(20, 35, 55, 0.08)',
        animation:
          shouldShake && !isCompleted
            ? `${shake} 0.35s cubic-bezier(.36,.07,.19,.97) both`
            : 'none',
        transition: 'border-color 160ms ease, box-shadow 160ms ease',
        '&:focus-within': {
          borderColor: alpha(accent, isDark ? 0.62 : 0.46),
          boxShadow: isDark
            ? `0 12px 30px ${alpha(accent, 0.12)}`
            : `0 10px 28px ${alpha(accent, 0.11)}`,
        },
      }}
    >
      <Box
        sx={{
          minHeight: 64,
          px: { xs: 2, sm: 2.5 },
          py: 1.25,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Box
          sx={{
            minWidth: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 1.25,
          }}
        >
          <Box
            sx={{
              width: 36,
              height: 36,
              flexShrink: 0,
              display: 'grid',
              placeItems: 'center',
              borderRadius: 1,
              color: isCompleted ? 'success.main' : 'primary.main',
              bgcolor: alpha(
                isCompleted
                  ? theme.palette.success.main
                  : theme.palette.primary.main,
                isDark ? 0.15 : 0.08,
              ),
            }}
          >
            {isCompleted ? <Volume2 size={19} /> : <Headphones size={19} />}
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography
              sx={{
                fontSize: '0.9375rem',
                lineHeight: 1.3,
                fontWeight: 700,
              }}
            >
              {t('listenWriteCard.taskTitle')}
            </Typography>
            <Typography
              noWrap
              color="text.secondary"
              sx={{ mt: 0.125, fontSize: '0.75rem', lineHeight: 1.3 }}
            >
              {taskDescription}
            </Typography>
          </Box>
        </Box>

        <Box
          sx={{
            flexShrink: 0,
            px: 1,
            py: 0.5,
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1,
            color: 'text.secondary',
            bgcolor: 'action.hover',
            fontSize: '0.6875rem',
            lineHeight: 1,
            fontWeight: 700,
          }}
        >
          {mode === 'vi-en' ? 'EN -> EN' : 'EN -> VI'}
        </Box>
      </Box>

      {isCompleted ? (
        <AnswerReviewPanel
          englishWord={englishWord}
          vietnameseMeaning={vietnameseMeaning}
          englishPronunciation={englishPronunciation}
          englishPartOfSpeech={englishPartOfSpeech}
          autoAdvanceDisabled={autoAdvanceDisabled}
          reviewDurationMs={answerReviewDurationMs}
          onNext={onNext}
        />
      ) : (
        <>
          <Box
            sx={{
              minHeight: { xs: 174, sm: 204 },
              px: { xs: 2, sm: 3 },
              py: { xs: 2.5, sm: 3 },
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              bgcolor: alpha(
                theme.palette.background.default,
                isDark ? 0.22 : 0.48,
              ),
            }}
          >
            <IconButton
              onClick={handlePlayAudio}
              disabled={!question}
              aria-label={
                hasStarted
                  ? t('listenWriteCard.replay')
                  : t('buttons.start')
              }
              sx={{
                width: 72,
                height: 72,
                color: 'primary.contrastText',
                bgcolor: 'primary.main',
                border: '6px solid',
                borderColor: alpha(
                  theme.palette.primary.main,
                  isDark ? 0.18 : 0.11,
                ),
                boxShadow: `0 6px 18px ${alpha(theme.palette.primary.main, 0.22)}`,
                '&:hover': {
                  bgcolor: 'primary.dark',
                },
                '&.Mui-disabled': {
                  color: 'action.disabled',
                  bgcolor: 'action.disabledBackground',
                  boxShadow: 'none',
                },
              }}
            >
              {hasStarted ? <RotateCcw size={27} /> : <Play size={28} />}
            </IconButton>

            <Typography
              sx={{
                mt: 1.5,
                color: 'text.primary',
                fontSize: '0.9375rem',
                lineHeight: 1.35,
                fontWeight: 700,
              }}
            >
              {hasStarted
                ? t('listenWriteCard.audioReady')
                : t('listenWriteCard.audioWaiting')}
            </Typography>
            <Typography
              color="text.secondary"
              sx={{ mt: 0.375, fontSize: '0.75rem', lineHeight: 1.35 }}
            >
              {hasStarted
                ? t('listenWriteCard.played')
                : t('listenWriteCard.startSpeak')}
            </Typography>
          </Box>

          <Box
            component="form"
            onSubmit={handleSubmit}
            sx={{
              px: { xs: 2, sm: 3 },
              py: { xs: 2, sm: 2.5 },
              borderTop: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1}
              alignItems="flex-start"
            >
              <TextField
                inputRef={inputRef}
                fullWidth
                label={answerLabel}
                placeholder={placeholder}
                value={userInput}
                onChange={(event) => setUserInput(event.target.value)}
                error={hasError && shouldShake}
                helperText={
                  hasError && shouldShake
                    ? t('listenWriteCard.wrongHelper')
                    : ' '
                }
                variant="outlined"
                size="medium"
                autoComplete="off"
                disabled={!hasStarted}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <Tooltip title={t('listenWriteCard.hint')}>
                        <span>
                          <IconButton
                            size="small"
                            edge="end"
                            onClick={onHint}
                            disabled={!hasStarted}
                            aria-label={t('listenWriteCard.hint')}
                            sx={{ color: 'text.secondary' }}
                          >
                            <Lightbulb size={18} />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </InputAdornment>
                  ),
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 1,
                    bgcolor: alpha(
                      theme.palette.background.paper,
                      isDark ? 0.7 : 1,
                    ),
                  },
                  '& .MuiInputBase-input': {
                    fontSize: '1rem',
                    fontWeight: 500,
                  },
                }}
              />

              <Button
                type="submit"
                variant="contained"
                color="primary"
                disabled={!userInput.trim() || !hasStarted}
                endIcon={<Send size={16} />}
                sx={{
                  width: { xs: '100%', sm: 'auto' },
                  minWidth: { sm: 132 },
                  minHeight: 56,
                  borderRadius: 1,
                  px: 2,
                  fontSize: '0.875rem',
                  lineHeight: 1.2,
                  fontWeight: 700,
                  boxShadow: 'none',
                }}
              >
                {t('listenWriteCard.check')}
              </Button>
            </Stack>

            {showHint && (
              <Box
                sx={{
                  mt: 0.75,
                  px: 1.5,
                  py: 1.25,
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 0.875,
                  border: '1px solid',
                  borderColor: alpha(theme.palette.info.main, isDark ? 0.42 : 0.26),
                  borderRadius: 1,
                  color: isDark
                    ? theme.palette.info.light
                    : theme.palette.info.dark,
                  bgcolor: alpha(theme.palette.info.main, isDark ? 0.12 : 0.06),
                }}
              >
                <Lightbulb size={17} style={{ marginTop: 1, flexShrink: 0 }} />
                <Typography sx={{ fontSize: '0.8125rem', lineHeight: 1.45 }}>
                  <Box component="span" sx={{ fontWeight: 700 }}>
                    {answerLabel}:
                  </Box>{' '}
                  {answer}
                </Typography>
              </Box>
            )}
          </Box>
        </>
      )}
    </Card>
  );
};
