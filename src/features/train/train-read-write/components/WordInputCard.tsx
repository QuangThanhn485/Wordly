// WordInputCard.tsx
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
import { keyframes } from '@mui/system';

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
              mb: 2,
            }}
          >
            {question}
          </Typography>
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

