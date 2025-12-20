import React, { useState, useEffect, useRef, useMemo } from 'react';
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
import { BookOpen, CheckCircle as CheckCircleIcon, Lightbulb as LightbulbIcon, Volume2 } from 'lucide-react';
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
  question: string; // The word to display (EN or VI)
  answer: string; // The correct answer (VI or EN)
  mode: 'vi-en' | 'en-vi'; // Training mode
  onAnswer: (userAnswer: string) => void;
  onHint: () => void;
  showHint?: boolean;
  isCompleted?: boolean;
  shouldShake?: boolean;
  shakeKey?: number;
  hasError?: boolean; // Whether there's an error (wrong answer)
}

export const WordInputCard: React.FC<WordInputCardProps> = ({
  question,
  answer,
  mode,
  onAnswer,
  onHint,
  showHint = false,
  isCompleted = false,
  shouldShake = false,
  shakeKey = 0,
  hasError = false,
}) => {
  const { t } = useTranslation('train');
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const [userInput, setUserInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const isViToEnMode = mode === 'vi-en';
  const canPlayAudio = isViToEnMode && !isCompleted;
  const hintBackground =
    theme.palette.mode === 'dark'
      ? alpha(theme.palette.info.main, 0.15)
      : theme.palette.info.light;
  const hintBorder = alpha(theme.palette.info.main, theme.palette.mode === 'dark' ? 0.6 : 1);
  const hintText = theme.palette.mode === 'dark' ? theme.palette.info.light : theme.palette.info.dark;

  const letterHints = useMemo(() => {
    if (!isViToEnMode) return [];
    const words = answer
      .split(/\s+/)
      .map((word) => word.trim())
      .filter(Boolean);

    return words.map((word) => {
      const letters = word.split('').filter((char) => /[A-Za-z]/.test(char));
      if (letters.length === 0) {
        return [];
      }
      const shuffled = [...letters];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    });
  }, [answer, isViToEnMode]);

  const letterHighlights = useMemo<boolean[][]>(() => {
    if (!isViToEnMode || letterHints.length === 0) return [];

    const inputWords = userInput
      .split(/\s+/)
      .map((word) => word.replace(/[^A-Za-z]/g, '').toLowerCase());

    return letterHints.map((letters, wordIndex) => {
      const typedWord = inputWords[wordIndex] ?? '';
      const typedCounts: Record<string, number> = {};
      typedWord.split('').forEach((letter) => {
        typedCounts[letter] = (typedCounts[letter] || 0) + 1;
      });

      return letters.map((letter) => {
        const normalized = letter.toLowerCase();
        if (typedCounts[normalized]) {
          typedCounts[normalized] -= 1;
          return true;
        }
        return false;
      });
    });
  }, [isViToEnMode, letterHints, userInput]);

  const hasLetterHints = isViToEnMode && letterHints.some((letters) => letters.length > 0);
  const handleSpeakAnswer = () => {
    if (!canPlayAudio) return;
    speakEnglish(answer, { lang: 'en-US' });
  };

  // Focus input when question changes
  useEffect(() => {
    if (!isCompleted && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [question, isCompleted]);

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

  const questionLabel = mode === 'vi-en' ? 'VI' : 'EN';
  const answerLabel = mode === 'vi-en' ? t('common.english') : t('common.vietnamese');
  const placeholder =
    mode === 'vi-en' ? t('readWriteCard.placeholderViEn') : t('readWriteCard.placeholderEnVi');
  const accent = isCompleted
    ? theme.palette.success.main
    : hasError && shouldShake
      ? theme.palette.error.main
      : theme.palette.primary.main;
  const subtitle = isCompleted
    ? t('readWriteCard.correct')
    : mode === 'vi-en'
      ? t('readWriteCard.placeholderViEn')
      : t('readWriteCard.placeholderEnVi');

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
        transition: 'border-color 160ms ease',
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
            {isCompleted ? <CheckCircleIcon size={22} /> : <BookOpen size={22} />}
          </Box>

          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="subtitle1" fontWeight={950} sx={{ letterSpacing: '-0.01em' }} noWrap>
              {t('readWrite.title')}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
              {subtitle}
            </Typography>
          </Box>
        </Box>
      </Box>

      <Box sx={{ p: { xs: 2, sm: 2.5 } }}>
        <Stack spacing={2}>
          {/* Question Display */}
          <Box sx={{ textAlign: 'center' }}>
            <Box
              sx={{
                mx: 'auto',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                px: 1.25,
                py: 0.5,
                borderRadius: 999,
                border: '1px solid',
                borderColor: alpha(theme.palette.divider, isDark ? 0.22 : 0.55),
                bgcolor: alpha(theme.palette.background.paper, isDark ? 0.08 : 0.6),
                color: 'text.secondary',
                fontWeight: 900,
                fontSize: '0.75rem',
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
              }}
            >
              {questionLabel}
            </Box>

            <Typography
              variant="h4"
              sx={{
                mt: 1.25,
                fontWeight: 950,
                fontSize: { xs: '1.6rem', sm: '2.1rem', md: '2.5rem' },
                lineHeight: 1.15,
                letterSpacing: '-0.02em',
                wordBreak: 'break-word',
                color: 'text.primary',
              }}
            >
              {question}
            </Typography>

            {canPlayAudio && (
              <Box sx={{ mt: 1.25, display: 'flex', justifyContent: 'center' }}>
                <Tooltip title={t('readWriteCard.audio')}>
                  <span>
                    <IconButton
                      size="small"
                      onClick={handleSpeakAnswer}
                      sx={{
                        borderRadius: 2,
                        border: '1px solid',
                        borderColor: alpha(theme.palette.divider, isDark ? 0.28 : 0.65),
                        color: 'text.secondary',
                        '&:hover': {
                          bgcolor: alpha(theme.palette.primary.main, isDark ? 0.16 : 0.08),
                          color: 'text.primary',
                        },
                      }}
                    >
                      <Volume2 size={18} />
                    </IconButton>
                  </span>
                </Tooltip>
              </Box>
            )}
          </Box>

        {hasLetterHints && (
          <Box
            sx={{
              p: { xs: 1.5, sm: 2 },
              borderRadius: 2,
              border: '1px solid',
              borderColor: alpha(theme.palette.divider, isDark ? 0.18 : 0.65),
              bgcolor: alpha(theme.palette.background.paper, isDark ? 0.04 : 0.7),
            }}
          >
            <Typography
              variant="caption"
              sx={{
                textTransform: 'uppercase',
                fontSize: { xs: '0.75rem', sm: '0.85rem' },
                mb: 1.25,
                color: 'text.secondary',
                letterSpacing: '0.12em',
                fontWeight: 900,
              }}
            >
              {t('readWriteCard.letterHintTitle')}
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
              {letterHints.map((letters, wordIndex) => {
                if (letters.length === 0) return null;
                return (
                  <Box
                    key={`hint-${wordIndex}`}
                    sx={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 0.75,
                      justifyContent: 'center',
                    }}
                  >
                    {letters.map((letter, letterIndex) => {
                      const highlighted = letterHighlights[wordIndex]?.[letterIndex];
                      return (
                        <Box
                          key={`letter-${wordIndex}-${letterIndex}`}
                          sx={{
                            width: 38,
                            height: 46,
                            borderRadius: 1.75,
                            border: '1px solid',
                            borderColor: highlighted
                              ? alpha(theme.palette.success.main, isDark ? 0.7 : 0.55)
                              : alpha(theme.palette.divider, isDark ? 0.28 : 0.65),
                            bgcolor: highlighted
                              ? alpha(theme.palette.success.main, isDark ? 0.18 : 0.12)
                              : alpha(theme.palette.background.paper, isDark ? 0.08 : 0.6),
                            color: highlighted ? 'success.main' : 'text.primary',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 900,
                            fontSize: '1.05rem',
                            textTransform: 'uppercase',
                            transition: 'all 0.2s ease',
                            minWidth: 38,
                          }}
                        >
                          {letter.toUpperCase()}
                        </Box>
                      );
                    })}
                  </Box>
                );
              })}
            </Box>
          </Box>
        )}

        {/* Input Section */}
        {!isCompleted ? (
          <Box component="form" onSubmit={handleSubmit}>
            <Divider sx={{ mb: 2, borderColor: alpha(theme.palette.divider, isDark ? 0.18 : 0.65) }} />

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
              helperText={hasError && shouldShake ? t('readWriteCard.wrongHelper') : ' '}
              variant="outlined"
              size="medium"
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                  fontSize: { xs: '1rem', sm: '1.1rem' },
                  bgcolor: alpha(theme.palette.background.paper, isDark ? 0.1 : 0.65),
                },
              }}
              autoFocus
              disabled={isCompleted}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end" sx={{ mr: 0.75 }}>
                    <Tooltip title={t('readWriteCard.hint')}>
                      <span>
                        <IconButton
                          onClick={onHint}
                          disabled={isCompleted}
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
              disabled={!userInput.trim()}
              sx={{
                mt: 1.5,
                py: 1.25,
                borderRadius: 2,
                fontSize: { xs: '0.875rem', sm: '1rem' },
                fontWeight: 900,
              }}
            >
              {t('readWriteCard.check')}
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
              {t('readWriteCard.correct')}
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
