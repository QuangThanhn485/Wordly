import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Card,
  Divider,
  InputAdornment,
  Stack,
  TextField,
  Button,
  Typography,
  useTheme,
  IconButton,
  Tooltip,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
  CheckCircle as CheckCircleIcon,
  Lightbulb as LightbulbIcon,
  RotateCcw as ReplayIcon,
  Volume2 as VolumeUpIcon,
  Play as PlayArrowIcon,
} from 'lucide-react';
import { keyframes } from '@mui/system';
import { speakEnglish } from '@/utils/speechUtils';
import { useTranslation } from 'react-i18next';

const shakeKF = keyframes`
  10%, 90% { transform: translate3d(-1px, 0, 0); }
  20%, 80% { transform: translate3d(2px, 0, 0); }
  30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
  40%, 60% { transform: translate3d(4px, 0, 0); }
`;

interface WordInputCardProps {
  question: string; // The English word (always EN for listening)
  answer: string; // The correct answer (VI or EN depending on mode)
  mode: 'vi-en' | 'en-vi'; // Training mode
  onAnswer: (userAnswer: string) => void;
  onHint: () => void;
  onStart: () => void; // Callback when start button is clicked
  showHint?: boolean;
  isCompleted?: boolean;
  shouldShake?: boolean;
  shakeKey?: number;
  hasError?: boolean; // Whether there's an error (wrong answer)
  hasStarted?: boolean; // Whether user has clicked start button for current word
}

export const WordInputCard: React.FC<WordInputCardProps> = ({
  question,
  answer,
  mode,
  onAnswer,
  onHint,
  onStart,
  showHint = false,
  isCompleted = false,
  shouldShake = false,
  shakeKey = 0,
  hasError = false,
  hasStarted = false,
}) => {
  const { t } = useTranslation('train');
  const theme = useTheme();
  const [userInput, setUserInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const [hasPlayed, setHasPlayed] = useState(false);
  const hintBackground =
    theme.palette.mode === 'dark'
      ? alpha(theme.palette.info.main, 0.15)
      : theme.palette.info.light;
  const hintBorder = alpha(theme.palette.info.main, theme.palette.mode === 'dark' ? 0.6 : 1);
  const hintText = theme.palette.mode === 'dark' ? theme.palette.info.light : theme.palette.info.dark;

  // Reset hasPlayed when question changes or when hasStarted becomes false
  useEffect(() => {
    if (question && !isCompleted) {
      if (!hasStarted) {
        setHasPlayed(false);
      }
    }
  }, [question, isCompleted, hasStarted]);

  // Focus input when audio has played
  useEffect(() => {
    if (!isCompleted && inputRef.current && hasPlayed && hasStarted) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 500);
    }
  }, [question, isCompleted, hasPlayed, hasStarted]);

  // Reset input when question changes
  useEffect(() => {
    setUserInput('');
  }, [question]);

  // Focus input when error occurs (shake)
  useEffect(() => {
    if (shouldShake && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 400);
    }
  }, [shouldShake, shakeKey]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim()) return;

    onAnswer(userInput.trim());
    setUserInput('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit(e);
    }
  };

  // For listen-write mode:
  // - mode 'vi-en': hear EN, type EN (answer is EN)
  // - mode 'en-vi': hear EN, type VI (answer is VI)
  const answerLabel = mode === 'vi-en' ? t('common.english') : t('common.vietnamese');
  const placeholder =
    mode === 'vi-en' ? t('listenWriteCard.placeholderViEn') : t('listenWriteCard.placeholderEnVi');
  const isDark = theme.palette.mode === 'dark';
  const accent = isCompleted
    ? theme.palette.success.main
    : hasError && shouldShake
      ? theme.palette.error.main
      : theme.palette.primary.main;

  const handlePlayAudio = () => {
    if (!question) return;

    if (!hasStarted) {
      onStart();
      setHasPlayed(true);
      return;
    }

    speakEnglish(question, { lang: 'en-US' });
    setHasPlayed(true);
  };

  return (
    <Card
      sx={{
        width: '100%',
        maxWidth: { xs: '100%', sm: 680, md: 760 },
        mx: 'auto',
        mb: 3,
        animation:
          shouldShake && !isCompleted
            ? `${shakeKF} 0.35s cubic-bezier(.36,.07,.19,.97) both`
            : 'none',
        boxShadow: 'none',
        borderRadius: { xs: 2, sm: 2.5 },
        border: '1px solid',
        borderColor: isCompleted
          ? alpha(theme.palette.success.main, isDark ? 0.6 : 0.4)
          : alpha(theme.palette.divider, isDark ? 0.28 : 0.65),
        overflow: 'hidden',
        transition: 'border-color 160ms ease, transform 160ms ease',
        '&:focus-within': {
          borderColor: alpha(accent, isDark ? 0.55 : 0.45),
        },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          px: { xs: 2, sm: 2.5 },
          py: { xs: 1.75, sm: 2 },
          borderBottom: '1px solid',
          borderColor: alpha(theme.palette.divider, isDark ? 0.18 : 0.65),
          bgcolor: alpha(accent, isDark ? 0.08 : 0.06),
          position: 'relative',
          '&::before': {
            content: '""',
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: 4,
            bgcolor: alpha(accent, isDark ? 0.75 : 0.55),
          },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: 999,
              display: 'grid',
              placeItems: 'center',
              flexShrink: 0,
              border: '1px solid',
              borderColor: alpha(accent, isDark ? 0.55 : 0.35),
              bgcolor: alpha(accent, isDark ? 0.16 : 0.1),
              color: accent,
            }}
          >
            {isCompleted ? <CheckCircleIcon size={22} /> : <VolumeUpIcon size={22} />}
          </Box>

          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="subtitle1" fontWeight={950} sx={{ letterSpacing: '-0.01em' }} noWrap>
              {t('listenWriteCard.title')}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
              {isCompleted ? t('listenWriteCard.correct') : hasStarted ? t('listenWriteCard.played') : t('listenWriteCard.startSpeak')}
            </Typography>
          </Box>
        </Box>
      </Box>

      <Box sx={{ p: { xs: 2, sm: 2.5 } }}>
        {/* Audio Controls */}
        <Stack spacing={2}>
          <Box sx={{ display: 'flex', gap: 1.25, alignItems: 'center', flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              color="primary"
              size="large"
              startIcon={!hasStarted ? <PlayArrowIcon size={18} /> : <ReplayIcon size={18} />}
              onClick={handlePlayAudio}
              disabled={!question}
              sx={{
                borderRadius: 2,
                py: 1.1,
                px: 2.25,
                fontWeight: 900,
                flex: { xs: '1 1 240px', sm: '0 0 auto' },
              }}
            >
              {!hasStarted ? t('buttons.start') : t('listenWriteCard.replay')}
            </Button>
          </Box>

          <Divider sx={{ borderColor: alpha(theme.palette.divider, isDark ? 0.18 : 0.65) }} />

        {/* Input Section */}
        {!isCompleted ? (
          <Box component="form" onSubmit={handleSubmit}>
            <TextField
              inputRef={inputRef}
              fullWidth
              label={answerLabel}
              placeholder={placeholder}
              value={userInput}
              onChange={(e) => {
                setUserInput(e.target.value);
              }}
              onKeyPress={handleKeyPress}
              error={hasError && shouldShake}
              helperText={hasError && shouldShake ? t('listenWriteCard.wrongHelper') : ' '}
              variant="outlined"
              size="medium"
              autoFocus={hasPlayed && hasStarted}
              disabled={isCompleted || !hasStarted}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end" sx={{ mr: 0.75 }}>
                    <Tooltip title={t('listenWriteCard.hint')}>
                      <span>
                        <IconButton
                          onClick={onHint}
                          disabled={!hasStarted}
                          edge="end"
                          sx={{
                            borderRadius: 2,
                            border: '1px solid',
                            borderColor: alpha(theme.palette.divider, isDark ? 0.28 : 0.65),
                            color: 'text.secondary',
                            '&:hover': {
                              bgcolor: alpha(theme.palette.primary.main, isDark ? 0.16 : 0.08),
                              color: 'text.primary',
                            },
                            '&.Mui-disabled': {
                              borderColor: alpha(theme.palette.divider, isDark ? 0.18 : 0.5),
                              color: alpha(theme.palette.text.primary, 0.35),
                            },
                          }}
                        >
                          <LightbulbIcon size={18} />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </InputAdornment>
                ),
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                  fontSize: { xs: '1rem', sm: '1.1rem' },
                  bgcolor: alpha(theme.palette.background.paper, isDark ? 0.1 : 0.65),
                },
              }}
            />

            {/* Hint Display */}
            {showHint && (
              <Box
                sx={{
                  mt: 1.25,
                  p: 1.5,
                  bgcolor: hintBackground,
                  borderRadius: 2,
                  border: `1px solid ${hintBorder}`,
                  color: hintText,
                }}
              >
                <Typography
                  variant="body2"
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    fontWeight: 700,
                    color: hintText,
                    '& svg': { color: hintText, stroke: hintText },
                  }}
                >
                  <LightbulbIcon size={18} />
                  <Box component="span" sx={{ minWidth: 0 }}>
                    <Box component="span" sx={{ fontWeight: 900 }}>
                      {answerLabel}:
                    </Box>{' '}
                    {answer}
                  </Box>
                </Typography>
              </Box>
            )}

            <Button
              type="submit"
              variant="contained"
              color="primary"
              fullWidth
              size="large"
              disabled={!userInput.trim() || !hasStarted}
              sx={{
                mt: 1.5,
                py: 1.25,
                borderRadius: 2,
                fontSize: { xs: '0.875rem', sm: '1rem' },
                fontWeight: 900,
              }}
            >
              {t('listenWriteCard.check')}
            </Button>
          </Box>
        ) : (
          <Box sx={{ textAlign: 'center', py: { xs: 1.5, sm: 2 } }}>
            <Box
              sx={{
                mx: 'auto',
                mb: 1.5,
                width: 72,
                height: 72,
                borderRadius: 999,
                display: 'grid',
                placeItems: 'center',
                border: '1px solid',
                borderColor: alpha(theme.palette.success.main, isDark ? 0.55 : 0.35),
                bgcolor: alpha(theme.palette.success.main, isDark ? 0.16 : 0.1),
                color: theme.palette.success.main,
              }}
            >
              <CheckCircleIcon size={34} />
            </Box>
            <Typography variant="h6" color="success.main" fontWeight={950} gutterBottom>
              {t('listenWriteCard.correct')}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 800 }}>
              {answerLabel}: {answer}
            </Typography>
          </Box>
        )}
        </Stack>
      </Box>
    </Card>
  );
};
