// ListenWritePage.tsx
import {
  Alert,
  Box,
  Skeleton,
} from '@mui/material';
import { Headphones } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { useTrainWords } from '@/features/train/train-listen-write';
import { WordInputCard } from '@/features/train/train-listen-write';
import {
  FlashcardsSettingsPanel,
  TrainingHeader,
  VocabularyQuickView,
  TrainingToolbar,
  useWriteTrainingSettings,
} from '@/features/train/components';
import {
  saveTrainingSession,
  loadTrainingSession,
  clearTrainingSession,
  isSessionForTopic,
  type TrainingSession,
} from '@/features/train/train-listen-write/sessionStorage';
import { recordMistakes } from '@/features/train/train-listen-write/mistakesStorage';
import { loadTrainingSession as loadReadingSession } from '@/features/train/train-start/sessionStorage';
import {
  CompletionModal,
  type SessionMistake,
} from '@/features/train/train-listen-write/components/CompletionModal';
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

const ListenWritePage = () => {
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
  const [hasStarted, setHasStarted] = useState(false); // Track if user has clicked start button for current word

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
    const nextIndex = pickRandomIndex(items.length, exclude);
    setCurrentWordIndex(nextIndex);
    setCurrentWordCompleted(false);
    setShowHint(false);
    setHasError(false);
    setHasStarted(true);
    const nextWord = items[nextIndex];
    if (nextWord) {
      speakEnglish(nextWord.en, { lang: 'en-US' });
    }
  }, [
    clearAdvanceTimeout,
    completedWords,
    currentWordIndex,
    items,
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
        recordMistakes(sessionMistakes, recordTopicId, 'listen-write');
        setMistakesSaved(true);
      }
      setShowCompletionModal(true);
      setCompletionModalShown(true);
    }
  }, [isCompleted, isLoading, items.length, showCompletionModal, sessionMistakes, currentTopicId, mistakesSaved, completionModalShown]);

  const handleModeChange = (nextMode: 'vi-en' | 'en-vi') => {
    clearAdvanceTimeout();
    setMode(nextMode);
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
    setHasStarted(false);
    if (currentTopicId) {
      clearTrainingSession();
    }
  }, [items.length, currentTopicId, clearAdvanceTimeout]);

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
      <TrainingHeader
        title={t('listenWrite.title')}
        subtitle={t('listenWrite.instruction')}
        icon={<Headphones size={18} />}
        completed={completedWords.length}
        total={total}
        controls={(
          <TrainingToolbar
            mode={mode}
            remaining={remaining}
            mistakes={mistakes}
            disabled={currentWordCompleted}
            onModeChange={handleModeChange}
            onRestart={handleRestart}
            actions={(
              <>
                <VocabularyQuickView
                  vocabularyList={items}
                  currentTopicId={sourceTopicId || currentTopicId}
                  triggerVariant="inline"
                />
                <FlashcardsSettingsPanel
                  answerReviewDurationMs={settings.answerReviewDurationMs}
                  onAnswerReviewDurationChange={setAnswerReviewDurationMs}
                  disableAutoAdvance={settings.disableAutoAdvance}
                  onDisableAutoAdvanceChange={setDisableAutoAdvance}
                  triggerVariant="inline"
                />
              </>
            )}
          />
        )}
      />

      {/* Main Content */}
      <Box
        sx={{
          flex: 1,
          width: '100%',
          bgcolor: 'background.default',
          display: 'flex',
        }}
      >
        <Box
          sx={{
            width: '100%',
            maxWidth: 1040,
            mx: 'auto',
            px: { xs: 1.5, sm: 3, md: 4 },
            py: { xs: 1.5, sm: 3 },
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: shouldCenterMain ? { xs: 'flex-start', md: 'center' } : 'flex-start',
            minHeight: { xs: 'auto', md: 'calc(100vh - 104px)' },
          }}
        >
          {isLoading ? (
            <Box sx={{ width: '100%', maxWidth: 820 }}>
              <Skeleton variant="rounded" height={440} sx={{ borderRadius: 1 }} />
            </Box>
          ) : items.length === 0 ? (
            <Alert severity="warning" sx={{ width: '100%', maxWidth: 820 }}>
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
              onStart={handleStart}
              showHint={showHint}
              isCompleted={currentWordCompleted}
              shouldShake={shouldShake}
              shakeKey={shakeKey}
              hasError={hasError}
              hasStarted={hasStarted}
              onNext={advanceToNextWord}
              autoAdvanceDisabled={settings.disableAutoAdvance}
              answerReviewDurationMs={settings.answerReviewDurationMs}
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

    </Box>
  );
};

export default ListenWritePage;
