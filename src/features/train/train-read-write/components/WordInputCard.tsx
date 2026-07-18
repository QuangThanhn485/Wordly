import React, { useEffect, useMemo, useRef, useState } from 'react';
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
  BookOpen,
  Languages,
  Lightbulb,
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
  onNext: () => void;
  showHint?: boolean;
  isCompleted?: boolean;
  shouldShake?: boolean;
  shakeKey?: number;
  hasError?: boolean;
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
  onNext,
  showHint = false,
  isCompleted = false,
  shouldShake = false,
  shakeKey = 0,
  hasError = false,
  autoAdvanceDisabled = false,
  answerReviewDurationMs = 3000,
}) => {
  const { t } = useTranslation('train');
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const [userInput, setUserInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const isViToEnMode = mode === 'vi-en';
  const answerLabel = isViToEnMode
    ? t('common.english')
    : t('common.vietnamese');
  const questionLabel = isViToEnMode
    ? t('common.vietnamese')
    : t('common.english');
  const placeholder = isViToEnMode
    ? t('readWriteCard.placeholderViEn')
    : t('readWriteCard.placeholderEnVi');
  const taskDescription = isViToEnMode
    ? t('readWriteCard.taskViEn')
    : t('readWriteCard.taskEnVi');
  const accent = hasError && shouldShake
    ? theme.palette.error.main
    : theme.palette.primary.main;

  const letterHints = useMemo(() => {
    if (!isViToEnMode) return [];
    return answer
      .split(/\s+/)
      .map((word) => word.trim())
      .filter(Boolean)
      .map((word) => {
        const letters = word.split('').filter((char) => /[A-Za-z]/.test(char));
        const shuffled = [...letters];
        for (let index = shuffled.length - 1; index > 0; index -= 1) {
          const target = Math.floor(Math.random() * (index + 1));
          [shuffled[index], shuffled[target]] = [
            shuffled[target],
            shuffled[index],
          ];
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
      const typedCounts: Record<string, number> = {};
      (inputWords[wordIndex] ?? '').split('').forEach((letter) => {
        typedCounts[letter] = (typedCounts[letter] || 0) + 1;
      });
      return letters.map((letter) => {
        const normalized = letter.toLowerCase();
        if (!typedCounts[normalized]) return false;
        typedCounts[normalized] -= 1;
        return true;
      });
    });
  }, [isViToEnMode, letterHints, userInput]);

  const hasLetterHints = letterHints.some((letters) => letters.length > 0);

  useEffect(() => {
    setUserInput('');
  }, [question]);

  useEffect(() => {
    if (isCompleted || !inputRef.current) return;
    const timeout = window.setTimeout(() => inputRef.current?.focus(), 100);
    return () => window.clearTimeout(timeout);
  }, [isCompleted, question]);

  useEffect(() => {
    if (!shouldShake || !inputRef.current) return;
    const timeout = window.setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 400);
    return () => window.clearTimeout(timeout);
  }, [shakeKey, shouldShake]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const value = userInput.trim();
    if (!value) return;
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
            {isCompleted ? <BookOpen size={19} /> : <Languages size={19} />}
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography
              sx={{
                fontSize: '0.9375rem',
                lineHeight: 1.3,
                fontWeight: 700,
              }}
            >
              {t('readWriteCard.taskTitle')}
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
          {isViToEnMode ? 'VI -> EN' : 'EN -> VI'}
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
              minHeight: { xs: 142, sm: 170 },
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
            <Typography
              color="text.secondary"
              sx={{
                fontSize: '0.6875rem',
                lineHeight: 1.2,
                fontWeight: 700,
                textTransform: 'uppercase',
              }}
            >
              {questionLabel}
            </Typography>
            <Typography
              sx={{
                mt: 1,
                maxWidth: 680,
                color: 'text.primary',
                fontSize: { xs: '1.625rem', sm: '2rem' },
                lineHeight: 1.25,
                fontWeight: 700,
                letterSpacing: 0,
                wordBreak: 'break-word',
              }}
            >
              {question}
            </Typography>

            {isViToEnMode && (
              <Tooltip title={t('readWriteCard.audio')}>
                <IconButton
                  size="small"
                  onClick={() =>
                    speakEnglish(answer, {
                      lang: 'en-US',
                      phonetic: englishPronunciation,
                      partOfSpeech: englishPartOfSpeech,
                    })
                  }
                  aria-label={t('readWriteCard.audio')}
                  sx={{
                    mt: 1.25,
                    color: 'primary.main',
                    border: '1px solid',
                    borderColor: alpha(theme.palette.primary.main, isDark ? 0.35 : 0.24),
                    bgcolor: alpha(theme.palette.primary.main, isDark ? 0.12 : 0.05),
                  }}
                >
                  <Volume2 size={17} />
                </IconButton>
              </Tooltip>
            )}
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
            {hasLetterHints && (
              <Box sx={{ mb: 1.75 }}>
                <Typography
                  color="text.secondary"
                  sx={{
                    mb: 0.875,
                    fontSize: '0.6875rem',
                    lineHeight: 1.2,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                  }}
                >
                  {t('readWriteCard.letterHintTitle')}
                </Typography>
                <Stack spacing={0.75}>
                  {letterHints.map((letters, wordIndex) => (
                    <Box
                      key={`hint-${wordIndex}`}
                      sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}
                    >
                      {letters.map((letter, letterIndex) => {
                        const highlighted =
                          letterHighlights[wordIndex]?.[letterIndex];
                        return (
                          <Box
                            key={`letter-${wordIndex}-${letterIndex}`}
                            sx={{
                              width: 30,
                              height: 32,
                              display: 'grid',
                              placeItems: 'center',
                              border: '1px solid',
                              borderColor: highlighted
                                ? alpha(theme.palette.success.main, isDark ? 0.58 : 0.4)
                                : 'divider',
                              borderRadius: 1,
                              bgcolor: highlighted
                                ? alpha(theme.palette.success.main, isDark ? 0.15 : 0.08)
                                : 'transparent',
                              color: highlighted ? 'success.main' : 'text.secondary',
                              fontSize: '0.8125rem',
                              lineHeight: 1,
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              transition: 'all 160ms ease',
                            }}
                          >
                            {letter}
                          </Box>
                        );
                      })}
                    </Box>
                  ))}
                </Stack>
              </Box>
            )}

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
                    ? t('readWriteCard.wrongHelper')
                    : ' '
                }
                variant="outlined"
                size="medium"
                autoComplete="off"
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <Tooltip title={t('readWriteCard.hint')}>
                        <IconButton
                          size="small"
                          edge="end"
                          onClick={onHint}
                          aria-label={t('readWriteCard.hint')}
                          sx={{ color: 'text.secondary' }}
                        >
                          <Lightbulb size={18} />
                        </IconButton>
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
                disabled={!userInput.trim()}
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
                {t('readWriteCard.check')}
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
