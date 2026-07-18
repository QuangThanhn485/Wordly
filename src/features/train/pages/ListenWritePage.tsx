// ListenWritePage.tsx
import {
  Box,
  Typography,
  Skeleton,
  Chip,
  Button,
  LinearProgress,
  useTheme,
  useMediaQuery,
  Alert,
} from '@mui/material';
import { AlertCircle, RotateCcw, ArrowLeftRight } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { useTrainWords } from '@/features/train/train-listen-write';
import { WordInputCard } from '@/features/train/train-listen-write';
import { VocabularyQuickView } from '@/features/train/components';
import {
  saveTrainingSession,
  loadTrainingSession,
  clearTrainingSession,
  isSessionForTopic,
  type TrainingSession,
} from '@/features/train/train-listen-write/sessionStorage';
import { recordMistakes } from '@/features/train/train-listen-write/mistakesStorage';
import {
  CompletionModal,
  type SessionMistake,
} from '@/features/train/train-listen-write/components/CompletionModal';
import { speakEnglish } from '@/utils/speechUtils';
import {
  createTrainingSearchParams,
  getTrainingTopicParams,
  normalizeSessionTopicReference,
} from '@/features/train/utils/topicSession';

const normalize = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();

type WordItem = { en: string; vi: string };

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

const ListenWritePage = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { t } = useTranslation('train');
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    topicId: currentTopicId,
    sourceTopicId,
    trainingSource,
  } = getTrainingTopicParams(searchParams);
  const recordTopicId = sourceTopicId || currentTopicId;
  const skipMistakeLogging = trainingSource === 'top-mistakes';
  const [sessionRestored, setSessionRestored] = useState(false); // Track if we've attempted to restore session

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
    
    // If needed, inherit the topic from the flashcards reading session.
    // This allows seamless transition between training modes
    try {
      const readingSessionStr = localStorage.getItem('wordly_train_session');
      if (readingSessionStr) {
        const readingSession = normalizeSessionTopicReference(JSON.parse(readingSessionStr));
        if (readingSession?.topicId) {
          setSearchParams(createTrainingSearchParams(readingSession), { replace: true });
          setSessionRestored(true);
          return;
        }
      }
    } catch (err) {
      // Ignore errors when reading reading session
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
  const [hasStarted, setHasStarted] = useState(false); // Track if user has clicked start button for current word

  // Track mistakes per word
  const [wordMistakes, setWordMistakes] = useState<Map<string, number>>(new Map());

  const prevTopicIdRef = useRef<string | null>(null);
  const prevTrainingSourceRef = useRef<string | null>(null);

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
      setHasStarted(false);
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
        setHasStarted(session.hasStarted || false);
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
    setHasStarted(false);
  }, [currentTopicId, isLoading, items.length, sessionRestored, trainingSource]);

  // Save session to localStorage
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
      hasStarted,
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
    hasStarted,
    isLoading,
    items.length,
  ]);

  // Prepare mistakes data for modal
  const sessionMistakes: SessionMistake[] = useMemo(() => {
    const mistakesList: SessionMistake[] = [];
    wordMistakes.forEach((count, word) => {
      const item = items.find((it) => it.en === word);
      if (item) {
        mistakesList.push({
          word: item.en,
          viMeaning: item.vi,
          count,
        });
      } else {
        // Fallback: if item not found (shouldn't happen), still show the word
        console.warn(`Word "${word}" not found in items, showing anyway`);
        mistakesList.push({
          word: word,
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

  // Show completion modal when done and save mistakes to localStorage
  useEffect(() => {
    if (isCompleted && !isLoading && items.length > 0 && !showCompletionModal && !completionModalShown) {
      // Save mistakes to localStorage when completing (only once)
      if (!skipMistakeLogging && sessionMistakes.length > 0 && recordTopicId && !mistakesSaved) {
        recordMistakes(sessionMistakes, recordTopicId, 'listen-write');
        setMistakesSaved(true);
      }
      setShowCompletionModal(true);
      setCompletionModalShown(true);
    }
  }, [isCompleted, isLoading, items.length, showCompletionModal, sessionMistakes, currentTopicId, mistakesSaved, completionModalShown]);

  const handleModeToggle = () => {
    setMode((prev) => (prev === 'vi-en' ? 'en-vi' : 'vi-en'));
    setShowHint(false);
    setCurrentWordCompleted(false);
    setHasStarted(false);
  };

  const handleStart = useCallback(() => {
    setHasStarted(true);
    // Play audio for current word
    const currentWord = items[currentWordIndex];
    if (currentWord) {
      speakEnglish(currentWord.en, { lang: 'en-US' });
    }
  }, [items, currentWordIndex]);

  const handleAnswer = useCallback(
    (userAnswer: string) => {
      if (isLoading || items.length === 0 || currentWordIndex < 0 || currentWordIndex >= items.length) return;
      if (currentWordCompleted) return;

      const currentWord = items[currentWordIndex];
      if (!currentWord) return;

      // Check answer based on mode
      // For listen-write:
      // - mode 'vi-en': hear EN, type EN (answer is EN)
      // - mode 'en-vi': hear EN, type VI (answer is VI)
      const correctAnswer = mode === 'vi-en' ? currentWord.en : currentWord.vi;
      const isCorrect = normalize(userAnswer) === normalize(correctAnswer);

      if (isCorrect) {
        // Correct answer
        setCurrentWordCompleted(true);
        setScore((s) => s + 1);
        // Don't speak the current word, will speak the next word automatically

        // Mark as completed
        if (!completedWords.includes(currentWordIndex)) {
          setCompletedWords((prev) => [...prev, currentWordIndex]);
        }

        // Move to next word after a short delay and auto-play audio
        setTimeout(() => {
          const exclude = new Set<number>(completedWords);
          exclude.add(currentWordIndex);
          const nextIndex = pickRandomIndex(items.length, exclude);
          setCurrentWordIndex(nextIndex);
          setCurrentWordCompleted(false);
          setShowHint(false);
          setHasError(false);
          setHasStarted(true); // Auto-start for next word
          // Auto-play audio for next word
          const nextWord = items[nextIndex];
          if (nextWord) {
            speakEnglish(nextWord.en, { lang: 'en-US' });
          }
        }, 1500);
      } else {
        // Wrong answer
        setHasError(true);
        setShouldShake(true);
        setShakeKey((k) => k + 1);
        setMistakes((m) => m + 1);

        // Track mistake
        const wrongWord = currentWord.en;
        setWordMistakes((prev) => {
          const newMap = new Map(prev);
          newMap.set(wrongWord, (newMap.get(wrongWord) || 0) + 1);
          return newMap;
        });

        // Reset shake and error after animation
        setTimeout(() => {
          setShouldShake(false);
          setHasError(false);
        }, 400);
      }
    },
    [items, currentWordIndex, mode, completedWords, isLoading, currentWordCompleted]
  );

  const handleHint = useCallback(() => {
    setShowHint(true);
  }, []);

  const handleRestart = useCallback(() => {
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
    setHasStarted(false);
    if (currentTopicId) {
      clearTrainingSession();
    }
  }, [items.length, currentTopicId]);

  const saveMistakesAndAction = useCallback(
    (action: 'exit' | 'restart' | 'next') => {
      // Save mistakes if not already saved (backup in case completion effect didn't run)
      if (!skipMistakeLogging && sessionMistakes.length > 0 && recordTopicId && !mistakesSaved) {
        recordMistakes(sessionMistakes, recordTopicId, 'listen-write');
        setMistakesSaved(true);
      }

      if (action === 'restart') {
        handleRestart();
      } else if (action === 'exit') {
        setShowCompletionModal(false);
        // Don't reset completionModalShown so modal won't reopen automatically
      } else if (action === 'next') {
        setShowCompletionModal(false);
        // Don't reset completionModalShown so modal won't reopen automatically
      }
    },
    [recordTopicId, sessionMistakes, handleRestart, mistakesSaved, skipMistakeLogging]
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

  // Calculate progress
  const progress = total > 0 ? (completedWords.length / total) * 100 : 0;
  const remaining = total - completedWords.length;

  // Determine question and answer based on mode
  // For listen-write: always play EN audio, answer depends on mode
  const question = currentWord ? currentWord.en : ''; // Always English (for audio)
  const answer = currentWord ? (mode === 'vi-en' ? currentWord.en : currentWord.vi) : ''; // EN for vi-en mode, VI for en-vi mode
  const shouldCenterMain = !isLoading && items.length > 0 && !!currentWord;

  // Handle keyboard shortcut Ctrl+X for hint
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'x') {
        e.preventDefault();
        if (!showHint && !currentWordCompleted && !isCompleted && currentWord && hasStarted) {
          handleHint();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [showHint, currentWordCompleted, isCompleted, currentWord, hasStarted, handleHint]);

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
      {/* Sticky Top Bar */}
      <Box
        sx={{
          position: 'sticky',
          top: { xs: '56px', sm: '64px', md: 0 },
          zIndex: (t) => t.zIndex.appBar - 1,
          bgcolor: 'background.paper',
          borderBottom: `1px solid ${theme.palette.divider}`,
          px: { xs: 1.5, sm: 3 },
          py: { xs: 1, sm: 1.5 },
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          gap: 1.5,
          boxShadow: 'none',
          flexShrink: 0,
        }}
      >
        {/* Progress Bar */}
        <Box sx={{ width: '100%' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                {t('topBar.progress', { completed: completedWords.length, total, percent: Math.round(progress) })}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                {t('topBar.remaining', { remaining })}
              </Typography>
            </Box>
          <LinearProgress
            variant="determinate"
            value={progress}
            sx={{
              height: 8,
              borderRadius: 1,
              bgcolor: 'background.default',
            }}
          />
        </Box>

        {/* Controls Row */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            alignItems: { xs: 'stretch', sm: 'center' },
            justifyContent: 'space-between',
            gap: { xs: 1, sm: 2 },
          }}
        >
          <Button
            variant="outlined"
            color="primary"
            size={isMobile ? 'small' : 'medium'}
            onClick={handleModeToggle}
            startIcon={<ArrowLeftRight size={isMobile ? 16 : 18} />}
            sx={{
              fontSize: { xs: '0.75rem', sm: '0.875rem' },
              px: { xs: 1.5, sm: 2 },
              py: { xs: 0.75, sm: 1 },
              minWidth: { xs: 'auto', sm: 140 },
              fontWeight: 600,
            }}
          >
            {mode === 'vi-en' ? t('direction.viEn') : t('direction.enVi')}
          </Button>

          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
            <Chip
              icon={<AlertCircle size={16} color="error" />}
              label={t('topBar.mistakes', { count: mistakes })}
              variant="outlined"
              size={isMobile ? 'small' : 'medium'}
              sx={{
                borderColor: theme.palette.error.light,
                color: 'error.main',
                bgcolor: theme.palette.error.light + '20',
                fontSize: { xs: '0.75rem', sm: '0.875rem' },
              }}
            />
            <Button
              variant="outlined"
              color="primary"
              size={isMobile ? 'small' : 'medium'}
              startIcon={<RotateCcw size={20} />}
              onClick={handleRestart}
              sx={{
                fontSize: { xs: '0.75rem', sm: '0.875rem' },
                whiteSpace: 'nowrap',
              }}
            >
              {t('buttons.restart')}
            </Button>
          </Box>
        </Box>
      </Box>

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
            justifyContent: shouldCenterMain ? { xs: 'flex-start', md: 'center' } : 'flex-start',
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
              mode={mode}
              onAnswer={handleAnswer}
              onHint={handleHint}
              onStart={handleStart}
              showHint={showHint}
              isCompleted={currentWordCompleted}
              shouldShake={shouldShake}
              shakeKey={shakeKey}
              hasError={hasError}
              hasStarted={hasStarted}
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
    </Box>
  );
};

export default ListenWritePage;
