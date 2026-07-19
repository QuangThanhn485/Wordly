// src/features/result/components/MistakeGroupByTopic.tsx
import React from 'react';
import { Box, Typography, Button, useTheme } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { MistakeCard } from './MistakeCard';
import { type MistakesByTopic } from '../utils/dataTransform';
import { Folder, Rocket } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { saveTrainingSession as saveReadingSession } from '@/features/train/train-start/sessionStorage';
import { saveTrainingSession as saveListeningSession } from '@/features/train/train-listen/sessionStorage';
import { saveTrainingSession as saveReadWriteSession } from '@/features/train/train-read-write/sessionStorage';
import { saveTrainingSession as saveListenWriteSession } from '@/features/train/train-listen-write/sessionStorage';
import { useTranslation } from 'react-i18next';
import { saveTrainingVocabularySet } from '@/features/vocabulary/utils/storageUtils';
import { createTrainingSearchParams } from '@/features/train/utils/topicSession';

interface MistakeGroupByTopicProps {
  group: MistakesByTopic;
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

export const MistakeGroupByTopic: React.FC<MistakeGroupByTopicProps> = ({ group }) => {
  const theme = useTheme();
  const { t } = useTranslation('result');
  const navigate = useNavigate();

  const topCount = Math.max(1, Math.ceil(group.mistakes.length * TOP_MISTAKE_RATIO));

  if (group.mistakes.length === 0) return null;

  const handleTrainTopMistakes = () => {
    if (!group.mistakes.length) return;

    const trainingTopicId = `${TOP_MISTAKE_PREFIX}${hashString(group.topicId)}`;
    const trainingTopicLabel = `${group.topicLabel} - ${t('group.topMistakesLabel')}`;
    const trainingSource = 'top-mistakes';

    const topMistakes = [...group.mistakes]
      .sort((a, b) => {
        if (b.totalMistakes !== a.totalMistakes) return b.totalMistakes - a.totalMistakes;
        return b.lastMistakeTime - a.lastMistakeTime;
      })
      .slice(0, topCount);

    const vocabItems = topMistakes.map((mistake) => ({
      id: mistake.wordId,
      word: mistake.word,
      vnMeaning: mistake.viMeaning,
      type: 'mistake',
      pronunciation: '',
    }));

    saveTrainingVocabularySet(trainingTopicId, vocabItems);

    const baseSession = {
      topicId: trainingTopicId,
      topicLabel: trainingTopicLabel,
      sourceTopicId: group.topicId,
      sourceTopicLabel: group.topicLabel,
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

    const params = createTrainingSearchParams(baseSession);
    navigate(`/train/flashcards-reading?${params.toString()}`);
  };

  return (
    <Box sx={{ mb: 3 }}>
      {/* Slim header + primary action */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 1,
          mb: 1.5,
          pb: 1,
          borderBottom: `1px solid ${theme.palette.divider}`,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0 }}>
          <Box
            sx={{
              width: 30,
              height: 30,
              borderRadius: 1.5,
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'secondary.main',
              bgcolor: alpha(theme.palette.secondary.main, 0.12),
            }}
          >
            <Folder size={18} />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontWeight: 700, fontSize: '1rem', lineHeight: 1.25 }} noWrap>
              {group.topicLabel}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {group.totalWords} {t('group.words')} · {group.totalMistakes} {t('group.mistakes')}
            </Typography>
          </Box>
        </Box>
        <Button
          variant="contained"
          color="secondary"
          size="small"
          startIcon={<Rocket size={16} />}
          onClick={handleTrainTopMistakes}
          sx={{ flexShrink: 0, whiteSpace: 'nowrap' }}
        >
          {t('group.trainTop', { count: topCount })}
        </Button>
      </Box>

      {/* Cards */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, 1fr)',
            md: 'repeat(3, 1fr)',
            lg: 'repeat(4, 1fr)',
          },
          gap: { xs: 1.5, md: 2 },
        }}
      >
        {group.mistakes.map((mistake, index) => (
          <MistakeCard
            key={`${mistake.topicId}:${mistake.wordId}:${index}`}
            mistake={mistake}
            context="topic"
          />
        ))}
      </Box>
    </Box>
  );
};
