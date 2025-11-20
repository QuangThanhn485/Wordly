// WordInputCard.tsx
import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  useTheme,
  IconButton,
  Tooltip,
} from '@mui/material';
import { CheckCircle as CheckCircleIcon, Lightbulb as LightbulbIcon, Volume2 } from 'lucide-react';
import { keyframes } from '@mui/system';
import { speakEnglish } from '@/utils/speechUtils';

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
  const theme = useTheme();
  const [userInput, setUserInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const isViToEnMode = mode === 'vi-en';
  const canPlayAudio = isViToEnMode && !isCompleted;

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
  const answerLabel = mode === 'vi-en' ? 'EN' : 'VI';
  const placeholder = mode === 'vi-en' ? 'Nhập từ tiếng Anh...' : 'Nhập nghĩa tiếng Việt...';

  return (
    <Card
      sx={{
        width: '100%',
        maxWidth: { xs: '100%', sm: 600, md: 700 },
        mx: 'auto',
        mb: 3,
        animation:
          shouldShake && !isCompleted
            ? `${shakeKF} 0.35s cubic-bezier(.36,.07,.19,.97) both`
            : 'none',
        boxShadow: isCompleted ? 4 : 2,
        border: isCompleted
          ? `2px solid ${theme.palette.success.main}`
          : `1px solid ${theme.palette.divider}`,
        transition: 'all 0.3s ease',
      }}
    >
      <CardContent sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
        {/* Question Display */}
        <Box sx={{ mb: 3 }}>
          <Typography
            variant="caption"
            sx={{
              display: 'block',
              textAlign: 'center',
              mb: 1,
              opacity: 0.7,
              fontWeight: 500,
              fontSize: { xs: '0.75rem', sm: '0.875rem' },
            }}
          >
            {questionLabel}
          </Typography>
          <Typography
            variant="h4"
            align="center"
            fontWeight="bold"
            sx={{
              fontSize: { xs: '1.5rem', sm: '2rem', md: '2.5rem' },
              lineHeight: 1.3,
              wordBreak: 'break-word',
              color: 'primary.main',
              mb: 1.5,
            }}
          >
            {question}
          </Typography>
          {canPlayAudio && (
            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
              <Tooltip title="Nghe phát âm">
                <IconButton
                  size="small"
                  onClick={handleSpeakAnswer}
                  sx={{
                    bgcolor: 'primary.light',
                    color: 'primary.dark',
                    '&:hover': {
                      bgcolor: 'primary.main',
                      color: 'primary.contrastText',
                    },
                  }}
                >
                  <Volume2 size={18} />
                </IconButton>
              </Tooltip>
            </Box>
          )}
        </Box>

        {hasLetterHints && (
          <Box
            sx={{
              mb: 3,
              p: 2,
              borderRadius: 2,
              bgcolor: theme.palette.primary.light + '20',
              border: `1px dashed ${theme.palette.primary.main}66`,
            }}
          >
            <Typography
              variant="body2"
              fontWeight={600}
              sx={{
                textTransform: 'uppercase',
                fontSize: { xs: '0.75rem', sm: '0.85rem' },
                mb: 1.5,
                color: 'primary.main',
                letterSpacing: 0.5,
              }}
            >
              Gợi ý chữ cái (VI ➜ EN)
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
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
                            borderRadius: 1.5,
                            border: `2px solid ${
                              highlighted ? theme.palette.success.main : theme.palette.divider
                            }`,
                            bgcolor: highlighted
                              ? theme.palette.success.light + '40'
                              : theme.palette.background.paper,
                            color: highlighted ? 'success.main' : 'text.primary',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: '1.125rem',
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
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 2 }}>
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
                helperText={hasError && shouldShake ? 'Sai rồi! Hãy thử lại.' : ''}
                variant="outlined"
                size="medium"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    fontSize: { xs: '1rem', sm: '1.125rem' },
                  },
                }}
                autoFocus
                disabled={isCompleted}
              />
              <Tooltip title="Gợi ý">
                <IconButton
                  onClick={onHint}
                  color="primary"
                  sx={{
                    mt: 0.5,
                    border: `1px solid ${theme.palette.primary.main}`,
                    '&:hover': {
                      bgcolor: 'primary.main',
                      color: 'primary.contrastText',
                    },
                  }}
                >
                  <LightbulbIcon />
                </IconButton>
              </Tooltip>
            </Box>

            {/* Hint Display */}
            {showHint && (
              <Box
                sx={{
                  p: 2,
                  mb: 2,
                  bgcolor: 'info.light',
                  borderRadius: 1,
                  border: `1px solid ${theme.palette.info.main}`,
                }}
              >
                <Typography
                  variant="body2"
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    fontWeight: 500,
                  }}
                >
                  <LightbulbIcon fontSize="small" />
                  <span>
                    <strong>{answerLabel}:</strong> {answer}
                  </span>
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
                py: 1.5,
                fontSize: { xs: '0.875rem', sm: '1rem' },
                fontWeight: 600,
              }}
            >
              Kiểm tra
            </Button>
          </Box>
        ) : (
          <Box
            sx={{
              textAlign: 'center',
              py: 2,
            }}
          >
            <CheckCircleIcon
              size={60}
              color="green"
              style={{ marginBottom: 16 }}
            />
            <Typography variant="h6" color="success.main" fontWeight={600} gutterBottom>
              Đúng rồi!
            </Typography>
            <Typography variant="body1" color="text.secondary">
              <strong>{answerLabel}:</strong> {answer}
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};
