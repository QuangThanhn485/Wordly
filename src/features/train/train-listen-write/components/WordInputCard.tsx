// WordInputCard.tsx for listen-write mode
import React, { useState, useEffect, useRef } from 'react';
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
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import ReplayIcon from '@mui/icons-material/Replay';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import { keyframes } from '@mui/system';
import { speakEnglish } from '@/utils/speechUtils';

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
  isFirstWord?: boolean; // Whether this is the first word (show Start button)
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
  isFirstWord = false,
}) => {
  const theme = useTheme();
  const [userInput, setUserInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const [hasPlayed, setHasPlayed] = useState(false);

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

  const handleStart = () => {
    if (question && !hasStarted) {
      onStart(); // onStart will handle speaking
      setHasPlayed(true);
    }
  };

  const handleReplayAudio = () => {
    if (question) {
      speakEnglish(question, { lang: 'en-US' });
      if (!hasStarted) {
        setHasPlayed(true);
        onStart();
      }
    }
  };

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
        {/* Audio Section - Always shows English word audio */}
        <Box sx={{ mb: 3, textAlign: 'center' }}>
          <Typography
            variant="caption"
            sx={{
              display: 'block',
              mb: 1,
              opacity: 0.7,
              fontWeight: 500,
              fontSize: { xs: '0.75rem', sm: '0.875rem' },
            }}
          >
            🎧 Nghe và viết
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, mb: 2, flexWrap: 'wrap' }}>
            <VolumeUpIcon 
              sx={{ 
                fontSize: { xs: '2rem', sm: '3rem', md: '4rem' },
                color: 'primary.main',
                opacity: hasStarted ? 0.8 : 0.4,
              }} 
            />
            {!hasStarted && isFirstWord ? (
              <Tooltip title="Bắt đầu phát âm">
                <Button
                  variant="contained"
                  color="primary"
                  size="large"
                  startIcon={<PlayArrowIcon />}
                  onClick={handleStart}
                  sx={{
                    px: 3,
                    py: 1.5,
                    fontSize: { xs: '0.875rem', sm: '1rem' },
                    fontWeight: 600,
                  }}
                >
                  Start
                </Button>
              </Tooltip>
            ) : null}
            <Tooltip title="Phát lại âm thanh">
              <IconButton
                onClick={handleReplayAudio}
                color="primary"
                size="large"
                disabled={!hasStarted}
                sx={{
                  border: hasStarted ? `2px solid ${theme.palette.primary.main}` : `2px solid ${theme.palette.divider}`,
                  opacity: hasStarted ? 1 : 0.5,
                  '&:hover': hasStarted ? {
                    bgcolor: 'primary.main',
                    color: 'primary.contrastText',
                  } : {},
                }}
              >
                <ReplayIcon />
              </IconButton>
            </Tooltip>
          </Box>
          {hasStarted && (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                fontSize: { xs: '0.875rem', sm: '1rem' },
                fontStyle: 'italic',
              }}
            >
              Đã phát âm từ tiếng Anh
            </Typography>
          )}
        </Box>

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
                autoFocus={hasPlayed && hasStarted}
                disabled={isCompleted || !hasStarted}
              />
              <Tooltip title="Gợi ý">
                <IconButton
                  onClick={onHint}
                  color="primary"
                  disabled={!hasStarted}
                  sx={{
                    mt: 0.5,
                    border: `1px solid ${theme.palette.primary.main}`,
                    '&:hover': {
                      bgcolor: 'primary.main',
                      color: 'primary.contrastText',
                    },
                    '&:disabled': {
                      border: `1px solid ${theme.palette.divider}`,
                      opacity: 0.5,
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
              disabled={!userInput.trim() || !hasStarted}
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
              sx={{
                fontSize: 60,
                color: 'success.main',
                mb: 2,
              }}
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

