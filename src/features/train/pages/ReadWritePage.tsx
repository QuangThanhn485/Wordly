// ReadWritePage.tsx
import {
  Box,
  Typography,
  Skeleton,
  Chip,
  Button,
  IconButton,
  useTheme,
  Alert,
} from '@mui/material';
import { AlertCircle, RotateCcw, ArrowLeftRight } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTrainWords } from '@/features/train/train-read-write';
import { getNextTrainingMode } from '@/features/train/utils/trainingModes';
import { WordInputCard } from '@/features/train/train-read-write';
import {
  FlashcardsSettingsPanel,
  TrainingHeader,
  VocabularyQuickView,
  useWriteTrainingSettings,
} from '@/features/train/components';
import {
  saveTrainingSession,
  loadTrainingSession,
  clearTrainingSession,
  isSessionForTopic,
  type TrainingSession,
} from '@/features/train/train-read-write/sessionStorage';
import { recordMistakes } from '@/features/train/train-read-write/mistakesStorage';
import { loadTrainingSession as loadReadingSession } from '@/features/train/train-start/sessionStorage';
import {
  CompletionModal,
  type SessionMistake,
} from '@/features/train/train-read-write/components/CompletionModal';
import { speakEnglish } from '@/utils/speechUtils';
import {
  createTrainingSearchParams,
  getTrainingTopicParams,
} from '@/features/train/utils/topicSession';

const normalize = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();

type WordItem = { id: string; en: string; vi: string };

function adaptWords(input: any[]): WordItem[] {
  if (!Array.isArray(input)) return [];
  return input.filter((w) => w && typeof w === 'object' && w.en && w.vi);
}

function pickRandomIndex(arrLength: number, exclude: Set<number>): number {
  const candidates: number[] = [];
  for (let i = 0; i < arrLength; i++) if (!exclude.has(i)) candidates.push(i);
  if (candidates.length === 0) return -1;
  const r = Math.floor(Math.random() * candidates.length);
  return candidates[r];
}

const ReadWritePage = () => {
  const theme = useTheme();
  const { t } = useTranslation('train');
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const {
    topicId: currentTopicId,
    sourceTopicId,
    trainingSource,
  } = getTrainingTopicParams(searchParams);
  const recordTopicId = sourceTopicId || currentTopicId;
  const skipMistakeLogging = trainingSource === 'top-mistakes';
  const [sessionRestored, setSessionRestored] = useState(false); // Track if we've attempted to restore session
  const {
    settings,
    setAnswerReviewDurationMs,
    setDisableAutoAdvance,
  } = useWriteTrainingSettings();

  // Restore a saved session unless the URL explicitly selects another topic.
  useEffect(() => {
    if (sessionRestored) return; // Only run once on mount
    
    const savedSession = loadTrainingSession();
    
    if (currentTopicId) {
      if (
        savedSession &&
        (savedSession.topicId !== currentTopicId ||
          (trainingSource && savedSession.trainingSource !== trainingSource))
      ) {
        clearTrainingSession();
      }
      setSessionRestored(true);
      return;
    }
    
    if (savedSession?.topicId) {
      setSearchParams(createTrainingSearchParams(savedSession), { replace: true });
      setSessionRestored(true);
      return;
    }
    
    const readingSession = loadReadingSession();
    if (readingSession?.topicId) {
      setSearchParams(createTrainingSearchParams(readingSession), { replace: true });
      setSessionRestored(true);
      return;
    }
    
    setSessionRestored(true);
  }, [currentTopicId, sessionRestored, setSearchParams, trainingSource]);

  const { words: rawWords, isLoading } = useTrainWords();
  const items = useMemo(() => adaptWords(rawWords ?? []), [rawWords]);
  const total = items.length;

  // State
  const [currentWordIndex, setCurrentWordIndex] = useState<number>(() => pickRandomIndex(total, new Set()));
  const [completedWords, setCompletedWords] = useState<number[]>([]);
  const [score, setScore] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [mode, setMode] = useState<'vi-en' | 'en-vi'>('vi-en');
  const [showHint, setShowHint] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [shouldShake, setShouldShake] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);
  const [currentWordCompleted, setCurrentWordCompleted] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [mistakesSaved, setMistakesSaved] = useState(false); // Track if mistakes have been saved
  const [completionModalShown, setCompletionModalShown] = useState(false); // Track if completion modal has been shown

  // Track mistakes per word
  const [wordMistakes, setWordMistakes] = useState<Map<string, number>>(new Map());

  const prevTopicIdRef = useRef<string | null>(null);
  const prevTrainingSourceRef = useRef<string | null>(null);
  const advanceTimeoutRef = useRef<number | null>(null);

  const clearAdvanceTimeout = useCallback(() => {
    if (advanceTimeoutRef.current !== null) {
      window.clearTimeout(advanceTimeoutRef.current);
      advanceTimeoutRef.current = null;
    }
  }, []);

  const advanceToNextWord = useCallback(() => {
    clearAdvanceTimeout();
    setCompletedWords((previous) =>
      previous.includes(currentWordIndex)
        ? previous
        : [...previous, currentWordIndex],
    );
    const exclude = new Set<number>(completedWords);
    exclude.add(currentWordIndex);
    setCurrentWordIndex(pickRandomIndex(items.length, exclude));
    setCurrentWordCompleted(false);
    setShowHint(false);
    setHasError(false);
  }, [
    clearAdvanceTimeout,
    completedWords,
    currentWordIndex,
    items.length,
  ]);

  useEffect(() => clearAdvanceTimeout, [clearAdvanceTimeout]);
  useEffect(() => {
    clearAdvanceTimeout();
  }, [currentTopicId, trainingSource, clearAdvanceTimeout]);

  useEffect(() => {
    if (!currentWordCompleted || settings.disableAutoAdvance) {
      clearAdvanceTimeout();
      return;
    }

    clearAdvanceTimeout();
    advanceTimeoutRef.current = window.setTimeout(
      advanceToNextWord,
      settings.answerReviewDurationMs,
    );
    return clearAdvanceTimeout;
  }, [
    advanceToNextWord,
    clearAdvanceTimeout,
    currentWordCompleted,
    settings.answerReviewDurationMs,
    settings.disableAutoAdvance,
  ]);

  // Load saved session when items are ready
  useEffect(() => {
    if (isLoading || items.length === 0 || !currentTopicId || !sessionRestored) return;
    
    const topicChanged =
      prevTopicIdRef.current !== null && prevTopicIdRef.current !== currentTopicId;
    const trainingSourceChanged =
      prevTrainingSourceRef.current !== null && prevTrainingSourceRef.current !== trainingSource;
    prevTopicIdRef.current = currentTopicId;
    prevTrainingSourceRef.current = trainingSource;
    
    if (topicChanged || trainingSourceChanged) {
      clearTrainingSession();
      setCurrentWordIndex(pickRandomIndex(items.length, new Set()));
      setCompletedWords([]);
      setScore(0);
      setMistakes(0);
      setWordMistakes(new Map());
      setShowCompletionModal(false);
      setShowHint(false);
      setCurrentWordCompleted(false);
      setHasError(false);
      setMistakesSaved(false);
      setCompletionModalShown(false);
      setMode('vi-en');
      return;
    }
    
    const session = loadTrainingSession();
    if (isSessionForTopic(session, currentTopicId, trainingSource)) {
      // Validate session data matches current items
      if (session && session.currentWordIndex >= 0 && session.currentWordIndex < items.length) {
        // Restore session state
        setCurrentWordIndex(session.currentWordIndex >= 0 ? session.currentWordIndex : pickRandomIndex(items.length, new Set()));
        setCompletedWords(session.completedWords || []);
        setScore(session.score || 0);
        setMistakes(session.mistakes || 0);
        setMode(session.mode || 'vi-en');
        return; // Session restored
      }
    }
    
    // No valid session - start fresh
    setCurrentWordIndex(pickRandomIndex(items.length, new Set()));
    setCompletedWords([]);
    setScore(0);
    setMistakes(0);
    setShowHint(false);
    setCurrentWordCompleted(false);
    setHasError(false);
    setMode('vi-en');
  }, [currentTopicId, isLoading, items.length, sessionRestored, trainingSource]);

  // Persist the current session.
  useEffect(() => {
    if (!currentTopicId || isLoading || items.length === 0) return;

    const session: TrainingSession = {
      topicId: currentTopicId,
      sourceTopicId: sourceTopicId || undefined,
      trainingSource: trainingSource || undefined,
      currentWordIndex,
      completedWords,
      mode,
      score,
      mistakes,
      timestamp: Date.now(),
    };
    saveTrainingSession(session);
  }, [
    currentTopicId,
    sourceTopicId,
    trainingSource,
    currentWordIndex,
    completedWords,
    mode,
    score,
    mistakes,
    isLoading,
    items.length,
  ]);

  // Prepare mistakes data for modal
  const sessionMistakes: SessionMistake[] = useMemo(() => {
    const mistakesList: SessionMistake[] = [];
    wordMistakes.forEach((count, wordId) => {
      const item = items.find((candidate) => candidate.id === wordId);
      if (item) {
        mistakesList.push({
          wordId: item.id,
          word: item.en,
          viMeaning: item.vi,
          count,
        });
      } else {
        // Fallback: if item not found (shouldn't happen), still show the word
        console.warn(`Word ID "${wordId}" not found in items, showing anyway`);
        mistakesList.push({
          wordId,
          word: wordId,
          viMeaning: 'N/A',
          count,
        });
      }
    });
    return mistakesList.sort((a, b) => b.count - a.count);
  }, [wordMistakes, items]);

  // Check completion
  const isCompleted = useMemo(() => {
    if (items.length === 0) return false;
    return completedWords.length === items.length;
  }, [completedWords.length, items.length]);

  // Show the completion modal and persist mistakes once.
  useEffect(() => {
    if (isCompleted && !isLoading && items.length > 0 && !showCompletionModal && !completionModalShown) {
      // Save mistakes only once when completing.
      if (!skipMistakeLogging && sessionMistakes.length > 0 && recordTopicId && !mistakesSaved) {
        recordMistakes(sessionMistakes, recordTopicId, 'read-write');
        setMistakesSaved(true);
      }
      setShowCompletionModal(true);
      setCompletionModalShown(true);
    }
  }, [isCompleted, isLoading, items.length, showCompletionModal, sessionMistakes, currentTopicId, mistakesSaved, completionModalShown]);

  const handleModeToggle = () => {
    clearAdvanceTimeout();
    setMode((prev) => (prev === 'vi-en' ? 'en-vi' : 'vi-en'));
    setShowHint(false);
    setCurrentWordCompleted(false);
  };

  const handleAnswer = useCallback(
    (userAnswer: string) => {
      if (isLoading || items.length === 0 || currentWordIndex < 0 || currentWordIndex >= items.length) return;
      if (currentWordCompleted) return;

      const currentWord = items[currentWordIndex];
      if (!currentWord) return;

      // Check answer based on mode
      const correctAnswer = mode === 'vi-en' ? currentWord.en : currentWord.vi;
      const isCorrect = normalize(userAnswer) === normalize(correctAnswer);

      if (isCorrect) {
        clearAdvanceTimeout();
        setCurrentWordCompleted(true);
        setScore((s) => s + 1);
        speakEnglish(currentWord.en, { lang: 'en-US' });
      } else {
        // Wrong answer
        setHasError(true);
        setShouldShake(true);
        setShakeKey((k) => k + 1);
        setMistakes((m) => m + 1);

        // Track mistake
        const wrongWordId = currentWord.id;
        setWordMistakes((prev) => {
          const newMap = new Map(prev);
          newMap.set(wrongWordId, (newMap.get(wrongWordId) || 0) + 1);
          return newMap;
        });

        // Reset shake and error after animation
        setTimeout(() => {
          setShouldShake(false);
          setHasError(false);
        }, 400);
      }
    },
    [
      items,
      currentWordIndex,
      mode,
      isLoading,
      currentWordCompleted,
      clearAdvanceTimeout,
    ],
  );

  const handleHint = useCallback(() => {
    setShowHint(true);
  }, []);

  const handleRestart = useCallback(() => {
    clearAdvanceTimeout();
    setCurrentWordIndex(pickRandomIndex(items.length, new Set()));
    setCompletedWords([]);
    setScore(0);
    setMistakes(0);
    setWordMistakes(new Map());
    setShowCompletionModal(false);
    setShowHint(false);
    setCurrentWordCompleted(false);
    setHasError(false);
    setMistakesSaved(false);
    setCompletionModalShown(false);
    if (currentTopicId) {
      clearTrainingSession();
    }
  }, [items.length, currentTopicId, clearAdvanceTimeout]);

  const saveMistakesAndAction = useCallback(
    (action: 'exit' | 'restart' | 'next') => {
      // Save mistakes if not already saved (backup in case completion effect didn't run)
      if (!skipMistakeLogging && sessionMistakes.length > 0 && recordTopicId && !mistakesSaved) {
        recordMistakes(sessionMistakes, recordTopicId, 'read-write');
        setMistakesSaved(true);
      }

      if (action === 'restart') {
        handleRestart();
      } else if (action === 'exit') {
        setShowCompletionModal(false);
        // Don't reset completionModalShown so modal won't reopen automatically
      } else if (action === 'next') {
        // Navigate to next training mode
        const nextMode = getNextTrainingMode('read-write');
        if (nextMode) {
          const nextParams = new URLSearchParams(searchParams);
          const query = nextParams.toString();
          const nextUrl = query ? `/train/${nextMode}?${query}` : `/train/${nextMode}`;
          navigate(nextUrl);
        }
        setShowCompletionModal(false);
        // Don't reset completionModalShown so modal won't reopen automatically
      }
    },
    [recordTopicId, sessionMistakes, handleRestart, mistakesSaved, navigate, searchParams, skipMistakeLogging]
  );

  const handleCompletionExit = () => {
    saveMistakesAndAction('exit');
  };

  const handleCompletionRestart = () => {
    saveMistakesAndAction('restart');
  };

  const handleCompletionNext = () => {
    saveMistakesAndAction('next');
  };

  // Get current word
  const currentWord =
    items.length > 0 && currentWordIndex >= 0 && currentWordIndex < items.length && !isLoading
      ? items[currentWordIndex]
      : null;

  const remaining = total - completedWords.length;

  // Determine question and answer based on mode
  const question = currentWord ? (mode === 'vi-en' ? currentWord.vi : currentWord.en) : '';
  const answer = currentWord ? (mode === 'vi-en' ? currentWord.en : currentWord.vi) : '';

  // Handle keyboard shortcut Ctrl+X for hint
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'x') {
        e.preventDefault();
        if (!showHint && !currentWordCompleted && !isCompleted && currentWord) {
          handleHint();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [showHint, currentWordCompleted, isCompleted, currentWord, handleHint]);

  return (
    <Box
      sx={{
        width: '100%',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        boxSizing: 'border-box',
      }}
    >
      <TrainingHeader
        title={t('readWrite.title')}
        subtitle={t('readWrite.instruction')}
        completed={completedWords.length}
        total={total}
        controls={(
          <Box
            sx={{
              flex: 1,
              minWidth: 0,
              maxWidth: '100%',
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              alignItems: { xs: 'stretch', sm: 'center' },
              justifyContent: 'space-between',
              gap: 1,
              flexWrap: 'wrap',
            }}
          >
            <Button
              variant="outlined"
              color="primary"
              size="small"
              disabled={currentWordCompleted}
              onClick={handleModeToggle}
              startIcon={<ArrowLeftRight size={16} />}
              sx={{ minWidth: 112 }}
            >
              {mode === 'vi-en' ? t('direction.viEn') : t('direction.enVi')}
            </Button>

            <Box
              sx={{
                display: 'flex',
                gap: 0.75,
                alignItems: 'center',
                width: 'auto',
                minWidth: 0,
                alignSelf: { xs: 'stretch', sm: 'auto' },
                justifyContent: 'flex-start',
                flexWrap: 'wrap',
              }}
            >
              <Chip
                label={t('topBar.remaining', { remaining })}
                variant="outlined"
                size="small"
              />
              <Chip
                icon={<AlertCircle size={15} />}
                label={t('topBar.mistakes', { count: mistakes })}
                variant="outlined"
                size="small"
                sx={{
                  borderColor: 'error.main',
                  color: 'error.main',
                  bgcolor: `${theme.palette.error.main}12`,
                }}
              />
              <IconButton
                color="primary"
                size="small"
                onClick={handleRestart}
                aria-label={t('buttons.restart')}
                sx={{ display: { xs: 'inline-flex', sm: 'none' } }}
              >
                <RotateCcw size={16} />
              </IconButton>
              <Button
                variant="outlined"
                color="primary"
                size="small"
                startIcon={<RotateCcw size={16} />}
                onClick={handleRestart}
                sx={{ display: { xs: 'none', sm: 'inline-flex' } }}
              >
                {t('buttons.restart')}
              </Button>
            </Box>
          </Box>
        )}
      />

      {/* Main Content */}
      <Box
        sx={{
          flex: 1,
          width: '100%',
          bgcolor: 'background.default',
        }}
      >
        <Box
          sx={{
            width: '100%',
            maxWidth: { xs: '100%', sm: '1200px' },
            mx: 'auto',
            px: { xs: 2, sm: 3, md: 4 },
            py: { xs: 2, sm: 3, md: 4 },
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: currentWord ? { xs: 'flex-start', md: 'center' } : 'flex-start',
            minHeight: '100%',
          }}
        >
          {isLoading ? (
            <Box sx={{ width: '100%', maxWidth: 760 }}>
              <Skeleton variant="rounded" height={420} sx={{ borderRadius: { xs: 2, sm: 2.5 } }} />
            </Box>
          ) : items.length === 0 ? (
            <Alert severity="warning" sx={{ width: '100%', maxWidth: 760 }}>
              {t('errors.selectTopic')}
            </Alert>
          ) : currentWord ? (
            <WordInputCard
              question={question}
              answer={answer}
              englishWord={currentWord.en}
              vietnameseMeaning={currentWord.vi}
              mode={mode}
              onAnswer={handleAnswer}
              onHint={handleHint}
              showHint={showHint}
              isCompleted={currentWordCompleted}
              shouldShake={shouldShake}
              shakeKey={shakeKey}
              hasError={hasError}
              showNextButton={settings.disableAutoAdvance}
              onNext={advanceToNextWord}
            />
          ) : null}
        </Box>
      </Box>

      {/* Completion Modal */}
      <CompletionModal
        open={showCompletionModal}
        totalMistakes={mistakes}
        mistakes={sessionMistakes}
        onExit={handleCompletionExit}
        onRestart={handleCompletionRestart}
        onNextMode={handleCompletionNext}
      />

      {/* Vocabulary Quick View */}
      <VocabularyQuickView
        vocabularyList={items}
        currentTopicId={sourceTopicId || currentTopicId}
      />

      <FlashcardsSettingsPanel
        answerReviewDurationMs={settings.answerReviewDurationMs}
        onAnswerReviewDurationChange={setAnswerReviewDurationMs}
        disableAutoAdvance={settings.disableAutoAdvance}
        onDisableAutoAdvanceChange={setDisableAutoAdvance}
      />
    </Box>
  );
};

export default ReadWritePage;
