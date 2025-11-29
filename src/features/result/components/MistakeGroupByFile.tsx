// src/features/result/components/MistakeGroupByFile.tsx
import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Chip,
  useTheme,
  Button,
} from '@mui/material';
import { MistakeCard } from './MistakeCard';
import { type MistakesByFile } from '../utils/dataTransform';
import { getTrainingModeLabel } from '../utils/dataTransform';
import { Folder } from 'lucide-react';
import { getDisplayFileName } from '@/utils/fileUtils';
import { trackedSetItem } from '@/utils/storageTracker';
import { useNavigate } from 'react-router-dom';
import { saveTrainingSession as saveReadingSession } from '@/features/train/train-start/sessionStorage';
import { saveTrainingSession as saveListeningSession } from '@/features/train/train-listen/sessionStorage';
import { saveTrainingSession as saveReadWriteSession } from '@/features/train/train-read-write/sessionStorage';
import { saveTrainingSession as saveListenWriteSession } from '@/features/train/train-listen-write/sessionStorage';

interface MistakeGroupByFileProps {
  group: MistakesByFile;
}

const TOP_MISTAKE_RATIO = 0.4;
const TOP_MISTAKE_PREFIX = '__top_mistakes__';

const hashString = (value: string): string => {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
};

const buildTrainingFileName = (fileName: string): string => {
  const base = getDisplayFileName(fileName);
  const sanitizedBase = base
    .replace(/[^\w-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
  const safeBase = sanitizedBase || 'vocab';
  const suffix = hashString(fileName);
  return `${TOP_MISTAKE_PREFIX}${safeBase}-${suffix}.txt`;
};

export const MistakeGroupByFile: React.FC<MistakeGroupByFileProps> = ({ group }) => {
  const theme = useTheme();
  const displayFileName = getDisplayFileName(group.fileName);
  const navigate = useNavigate();

  const topCount = Math.max(1, Math.ceil(group.mistakes.length * TOP_MISTAKE_RATIO));

  if (group.mistakes.length === 0) return null;

  const handleTrainTopMistakes = () => {
    if (!group.mistakes.length) return;

    const trainingFileName = buildTrainingFileName(group.fileName);
    const trainingSource = 'top-mistakes';

    const topMistakes = [...group.mistakes]
      .sort((a, b) => {
        if (b.totalMistakes !== a.totalMistakes) return b.totalMistakes - a.totalMistakes;
        return b.lastMistakeTime - a.lastMistakeTime;
      })
      .slice(0, topCount);

    const vocabItems = topMistakes.map((mistake) => ({
      word: mistake.word,
      vnMeaning: mistake.viMeaning,
      type: 'mistake',
      pronunciation: '',
    }));

    trackedSetItem(`wordly_vocab_file:${trainingFileName}`, JSON.stringify(vocabItems));

    // Prime training sessions for all modes so the top-mistake file is used consistently
    const baseSession = {
      fileName: trainingFileName,
      sourceFileName: group.fileName,
      trainingSource,
      timestamp: Date.now(),
    };

    saveReadingSession({
      ...baseSession,
      score: 0,
      mistakes: 0,
      flipped: {},
      targetIdx: 0,
      language: 'vi',
    });

    saveListeningSession({
      ...baseSession,
      score: 0,
      mistakes: 0,
      flipped: {},
      targetIdx: 0,
      language: 'en',
      hasStarted: false,
    });

    saveReadWriteSession({
      ...baseSession,
      currentWordIndex: 0,
      completedWords: [],
      mode: 'vi-en',
      score: 0,
      mistakes: 0,
    });

    saveListenWriteSession({
      ...baseSession,
      currentWordIndex: 0,
      completedWords: [],
      mode: 'vi-en',
      score: 0,
      mistakes: 0,
      hasStarted: false,
    });

    const params = new URLSearchParams();
    params.set('file', trainingFileName);
    params.set('sourceFile', group.fileName);
    params.set('trainingSource', trainingSource);

    navigate(`/train/flashcards-reading?${params.toString()}`);
  };

  return (
    <Box sx={{ mb: 4 }}>
      {/* Group Header */}
      <Paper
        elevation={2}
        sx={{
          p: { xs: 2, sm: 2.5 },
          mb: 2.5,
          borderRadius: 2,
          bgcolor: 'background.paper',
          border: `2px solid ${theme.palette.secondary.main}20`,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box
              sx={{
                p: 1.5,
                borderRadius: 2,
                bgcolor: 'secondary.main',
                color: 'secondary.contrastText',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Folder size={24} />
            </Box>
            <Box>
              <Typography
                variant="h5"
                fontWeight={700}
                sx={{
                  fontSize: { xs: '1.25rem', sm: '1.5rem' },
                  mb: 0.5,
                  wordBreak: 'break-word',
                }}
              >
                {displayFileName}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {group.totalWords} tu vung voi {group.totalMistakes} loi
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
            <Chip
              label={`${group.totalWords} tu`}
              size="small"
              color="secondary"
              variant="outlined"
            />
            <Chip
              label={`${group.totalMistakes} loi`}
              size="small"
              color="error"
              variant="outlined"
            />
            <Button
              variant="contained"
              color="secondary"
              size="small"
              onClick={handleTrainTopMistakes}
              disabled={group.mistakes.length === 0}
              sx={{ whiteSpace: 'nowrap' }}
            >
              Train 40% ({topCount} tu sai nhieu nhat)
            </Button>
          </Box>
        </Box>

        {/* Training modes in this file */}
        {Object.keys(group.mistakesByMode).length > 0 && (
          <Box sx={{ mt: 2, pt: 2, borderTop: `1px solid ${theme.palette.divider}` }}>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
              {Object.entries(group.mistakesByMode).map(([mode, count]) => (
                <Chip
                  key={mode}
                  label={`${getTrainingModeLabel(mode)} (${count})`}
                  size="small"
                  variant="outlined"
                  sx={{
                    fontSize: { xs: '0.6875rem', sm: '0.75rem' },
                    height: { xs: 24, sm: 28 },
                  }}
                />
              ))}
            </Box>
          </Box>
        )}
      </Paper>

      {/* Mistake Cards Grid */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, 1fr)',
            md: 'repeat(3, 1fr)',
            lg: 'repeat(4, 1fr)',
          },
          gap: { xs: 2, sm: 2.5, md: 3 },
        }}
      >
        {group.mistakes.map((mistake, index) => (
          <Box
            key={`${mistake.fileName}:${mistake.word}:${index}`}
          >
            <MistakeCard mistake={mistake} />
          </Box>
        ))}
      </Box>
    </Box>
  );
};
