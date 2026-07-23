// FlashcardsListeningPage.tsx - Re-exported from original location
// This file wraps the original FlashcardsListening component

import {
  Alert,
  Box,
  Typography,
  Skeleton,
  Button,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Headphones,
  Volume2,
  HelpCircle,
  Play,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTrainWords } from '@/features/train/train-listen';
import { getNextTrainingMode } from '@/features/train/utils/trainingModes';
import { WordCard } from '@/features/train/train-listen';
import {
  FlashcardsSettingsPanel,
  TrainingHeader,
  TrainingToolbar,
  VocabularyQuickView,
  useFlashcardsSettings,
} from '@/features/train/components';
import { 
  saveTrainingSession, 
  loadTrainingSession, 
  clearTrainingSession,
  isSessionForTopic,
  type TrainingSession 
} from '@/features/train/train-listen/sessionStorage';
import { recordMistakes } from '@/features/train/train-listen/mistakesStorage';
import { recordTrainingRun } from '@/features/train/utils/trainingHistory';
import { loadTrainingSession as loadReadingSession } from '@/features/train/train-start/sessionStorage';
import { CompletionModal, type SessionMistake } from '@/features/train/train-read-write/components/CompletionModal';
import { speakEnglish, speakEnglishAsync, type SpeechOptions } from '@/utils/speechUtils';
import {
  createTrainingSearchParams,
  getTrainingTopicParams,
} from '@/features/train/utils/topicSession';
import {
  flashcardGridSx,
  flashcardHeightSx,
  flashcardRemovalMaxHeightSx,
} from '@/features/train/components/flashcardGridStyles';
import { MOBILE_MAIN_VIEWPORT_HEIGHT } from '@/layouts/mobileLayoutConstants';

const normalize = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();

type WordItem = {
  id: string;
  en: string;
  vi: string;
  type?: string;
  pronunciation?: string;
};

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

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

const CARD_FLIP_FEEDBACK_MS = 620;
const CARD_EXIT_ANIMATION_MS = 320;
const CARD_LAYOUT_SETTLE_MS = 180;

const getHiddenCorrectCardsFromFlipped = (flipped: Record<number, boolean>) => {
  const hidden: Record<number, boolean> = {};
  Object.entries(flipped).forEach(([idx, isFlipped]) => {
    if (isFlipped) hidden[Number(idx)] = true;
  });
  return hidden;
};

const FlashcardsListeningPage = () => {
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
  const [sessionRestored, setSessionRestored] = useState(false);
  const { settings, setRemoveCorrectCards } = useFlashcardsSettings();
  const removeCorrectCardsRef = useRef(settings.removeCorrectCards);

  useEffect(() => {
    removeCorrectCardsRef.current = settings.removeCorrectCards;
  }, [settings.removeCorrectCards]);

  useEffect(() => {
    if (sessionRestored) return;
    
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
  const baseItems = useMemo(() => adaptWords(rawWords ?? []), [rawWords]);
  
  const [items, setItems] = useState<WordItem[]>([]);
  const [shuffleKey, setShuffleKey] = useState(0);
  
  useEffect(() => {
    if (baseItems.length > 0) {
      setItems(shuffleArray(baseItems));
    }
  }, [baseItems, shuffleKey]);
  
  const total = items.length;

  const [flipped, setFlipped] = useState<Record<number, boolean>>({});
  const [removingCorrectCards, setRemovingCorrectCards] = useState<Record<number, boolean>>({});
  const [hiddenCorrectCards, setHiddenCorrectCards] = useState<Record<number, boolean>>({});
  const [wrongIdx, setWrongIdx] = useState<number | null>(null);
  const [wrongTick, setWrongTick] = useState(0);
  const [targetIdx, setTargetIdx] = useState<number>(() => pickRandomIndex(total, new Set()));
  const [score, setScore] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [language, setLanguage] = useState<'vi' | 'en'>('en');
  const [hasStarted, setHasStarted] = useState(false);
  const [showHintModal, setShowHintModal] = useState(false);
  
  const [wordMistakes, setWordMistakes] = useState<Map<string, number>>(new Map());
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [pendingCorrectFeedbackCount, setPendingCorrectFeedbackCount] = useState(0);
  const [feedbackTargetIdx, setFeedbackTargetIdx] = useState(-1);

  const prevTopicIdRef = useRef<string | null>(null);
  const prevTrainingSourceRef = useRef<string | null>(null);
  const interactionLockedRef = useRef(false);
  const feedbackRunIdRef = useRef(0);
  const historySavedRef = useRef(false);

  const presentedTargetIdx =
    pendingCorrectFeedbackCount > 0 && feedbackTargetIdx >= 0
      ? feedbackTargetIdx
      : targetIdx;

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
      historySavedRef.current = false;
      setFlipped({});
      setRemovingCorrectCards({});
      setHiddenCorrectCards({});
      setWrongIdx(null);
      setWrongTick(0);
      setScore(0);
      setMistakes(0);
      setWordMistakes(new Map());
      setShowCompletionModal(false);
      setPendingCorrectFeedbackCount(0);
      setFeedbackTargetIdx(-1);
      interactionLockedRef.current = false;
      feedbackRunIdRef.current += 1;
      setHasStarted(false);
      setShowHintModal(false);
      setTargetIdx(pickRandomIndex(items.length, new Set()));
      setLanguage('en');
      return;
    }
    
    const session = loadTrainingSession();
    if (isSessionForTopic(session, currentTopicId, trainingSource)) {
      if (session && session.targetIdx >= 0 && session.targetIdx < items.length) {
        const restoredFlipped = session.flipped || {};
        setFlipped(restoredFlipped);
        setRemovingCorrectCards({});
        setHiddenCorrectCards(
          removeCorrectCardsRef.current ? getHiddenCorrectCardsFromFlipped(restoredFlipped) : {}
        );
        setPendingCorrectFeedbackCount(0);
        setFeedbackTargetIdx(-1);
        interactionLockedRef.current = false;
        feedbackRunIdRef.current += 1;
        setScore(session.score || 0);
        setMistakes(session.mistakes || 0);
        setTargetIdx(session.targetIdx >= 0 ? session.targetIdx : pickRandomIndex(items.length, new Set()));
        setLanguage(session.language || 'en');
        setHasStarted(session.hasStarted || false);
        setShowHintModal(false);
        return;
      }
    }
    
    setFlipped({});
    setRemovingCorrectCards({});
    setHiddenCorrectCards({});
    setWrongIdx(null);
    setWrongTick(0);
    setScore(0);
    setMistakes(0);
    setWordMistakes(new Map());
    setPendingCorrectFeedbackCount(0);
    setFeedbackTargetIdx(-1);
    interactionLockedRef.current = false;
    feedbackRunIdRef.current += 1;
    setHasStarted(false);
    setShowHintModal(false);
    setTargetIdx(pickRandomIndex(items.length, new Set()));
    setLanguage('en');
  }, [currentTopicId, isLoading, items.length, sessionRestored, trainingSource]);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const getAudioCtx = () => {
    if (typeof window === 'undefined') return null;
    if (!audioCtxRef.current) {
      try {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      } catch {
        audioCtxRef.current = null;
      }
    }
    return audioCtxRef.current;
  };

  const playErrorTone = useCallback(() => {
    const ctx = getAudioCtx();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(440, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 0.22);
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.24);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.26);
  }, []);

  const speakEnglishAwaitable = useCallback(
    (text: string, options: SpeechOptions = {}) => speakEnglishAsync(text, options),
    []
  );

  const wait = useCallback((ms: number) => new Promise<void>((res) => window.setTimeout(res, ms)), []);

  const speakResult = useCallback(
    async (current: WordItem) => {
      if (!current.en) return;
      try {
        if (typeof window !== 'undefined') {
          window.speechSynthesis?.cancel();
        }
      } catch {}
      await speakEnglishAwaitable(current.en, {
        lang: 'en-US',
        phonetic: current.pronunciation,
        partOfSpeech: current.type,
      });
    },
    [speakEnglishAwaitable]
  );

  const playCorrectFeedback = useCallback(
    async (
      idx: number,
      current: WordItem,
      next: WordItem | undefined,
      shouldRemoveAfterFeedback: boolean,
    ) => {
      const runId = ++feedbackRunIdRef.current;
      setPendingCorrectFeedbackCount((count) => count + 1);

      try {
        await Promise.all([
          wait(CARD_FLIP_FEEDBACK_MS),
          speakResult(current),
        ]);

        if (feedbackRunIdRef.current !== runId) return;

        if (shouldRemoveAfterFeedback && removeCorrectCardsRef.current) {
          setRemovingCorrectCards((prev) => ({ ...prev, [idx]: true }));
          await wait(CARD_EXIT_ANIMATION_MS);

          if (feedbackRunIdRef.current !== runId) return;

          if (removeCorrectCardsRef.current) {
            setHiddenCorrectCards((prev) => ({ ...prev, [idx]: true }));
            setRemovingCorrectCards((prev) => {
              const nextState = { ...prev };
              delete nextState[idx];
              return nextState;
            });

            // Delay activation until the grid has completed its final reflow.
            await wait(CARD_LAYOUT_SETTLE_MS);
          }
        }

      } finally {
        if (feedbackRunIdRef.current === runId) {
          interactionLockedRef.current = false;
          setFeedbackTargetIdx(-1);
          setPendingCorrectFeedbackCount((count) => Math.max(0, count - 1));

          if (next) {
            window.requestAnimationFrame(() => {
              if (
                feedbackRunIdRef.current === runId &&
                !interactionLockedRef.current
              ) {
                speakEnglish(next.en, {
                  lang: 'en-US',
                  phonetic: next.pronunciation,
                  partOfSpeech: next.type,
                });
              }
            });
          }
        }
      }
    },
    [speakResult, wait]
  );

  const handleRemoveCorrectCardsChange = useCallback(
    (checked: boolean) => {
      if (interactionLockedRef.current) return;
      removeCorrectCardsRef.current = checked;
      setRemoveCorrectCards(checked);
      setRemovingCorrectCards({});
      setHiddenCorrectCards(checked ? getHiddenCorrectCardsFromFlipped(flipped) : {});
    },
    [flipped, setRemoveCorrectCards]
  );

  const handleLanguageChange = (mode: 'vi-en' | 'en-vi') => {
    if (interactionLockedRef.current) return;
    setLanguage(mode === 'vi-en' ? 'vi' : 'en');
  };

  const handleStart = useCallback(() => {
    if (interactionLockedRef.current) return;
    if (isLoading || items.length === 0) return;
    if (targetIdx < 0 || targetIdx >= items.length) return;
    
    const target = items[targetIdx];
    if (!target) return;
    
    setHasStarted(true);
    setShowHintModal(false);
    speakEnglish(target.en, {
      lang: 'en-US',
      phonetic: target.pronunciation,
      partOfSpeech: target.type,
    });
  }, [items, targetIdx, isLoading]);

  const handleReplayAudio = useCallback(() => {
    if (interactionLockedRef.current) return;
    if (isLoading || items.length === 0) return;
    if (targetIdx < 0 || targetIdx >= items.length) return;
    if (!hasStarted) return;
    
    const target = items[targetIdx];
    if (!target) return;
    
    speakEnglish(target.en, {
      lang: 'en-US',
      phonetic: target.pronunciation,
      partOfSpeech: target.type,
    });
  }, [hasStarted, items, targetIdx, isLoading]);

  const handleShowAnswer = useCallback(() => {
    if (interactionLockedRef.current) return;
    if (isLoading || items.length === 0) return;
    if (targetIdx < 0 || targetIdx >= items.length) return;
    if (!hasStarted) return;
    
    setShowHintModal(true);
  }, [hasStarted, items, targetIdx, isLoading]);

  useEffect(() => {
    if (!currentTopicId || isLoading || items.length === 0) return;
    
    const session: TrainingSession = {
      topicId: currentTopicId,
      sourceTopicId: sourceTopicId || undefined,
      trainingSource: trainingSource || undefined,
      score,
      mistakes,
      flipped,
      targetIdx,
      language,
      timestamp: Date.now(),
      hasStarted,
    };
    saveTrainingSession(session);
  }, [
    currentTopicId,
    sourceTopicId,
    trainingSource,
    score,
    mistakes,
    flipped,
    targetIdx,
    language,
    hasStarted,
    isLoading,
    items.length,
  ]);

  const handleAttempt = useCallback(
    (idx: number) => {
      if (interactionLockedRef.current) return;
      if (isLoading || items.length === 0 || !hasStarted) return;
      if (targetIdx < 0 || targetIdx >= items.length) return;
      if (idx < 0 || idx >= items.length) return;
      if (flipped[idx]) return;
      
      if (!items[targetIdx] || !items[idx]) return;
      
      const isCorrect = language === 'vi'
        ? normalize(items[idx].en) === normalize(items[targetIdx].en)
        : normalize(items[idx].vi) === normalize(items[targetIdx].vi);
      
      if (isCorrect) {
        interactionLockedRef.current = true;
        setFeedbackTargetIdx(targetIdx);
        setFlipped((f) => ({ ...f, [idx]: true }));
        setScore((v) => v + 1);
        const currentWord = items[targetIdx];
        setShowHintModal(false);
        const exclude = new Set<number>();
        Object.keys(flipped).forEach((k) => {
          if (flipped[+k]) exclude.add(+k);
        });
        exclude.add(idx);
        const newTargetIdx = pickRandomIndex(items.length, exclude);
        setTargetIdx(newTargetIdx);

        const nextWord =
          newTargetIdx >= 0 && newTargetIdx < items.length && items[newTargetIdx]
            ? items[newTargetIdx]
            : undefined;
        void playCorrectFeedback(
          idx,
          currentWord,
          nextWord,
          removeCorrectCardsRef.current,
        );
      } else {
        setWrongIdx(idx);
        setWrongTick((t) => t + 1);
        setMistakes((m) => m + 1);
        
        const wrongWordId = items[targetIdx].id;
        setWordMistakes((prev) => {
          const newMap = new Map(prev);
          newMap.set(wrongWordId, (newMap.get(wrongWordId) || 0) + 1);
          return newMap;
        });
        
        playErrorTone();
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          try {
            (navigator as any).vibrate?.(60);
          } catch {}
        }
      }
    },
    [items, targetIdx, flipped, language, isLoading, hasStarted, playErrorTone, playCorrectFeedback]
  );

  const allFlipped = useMemo(() => {
    if (items.length === 0) return false;
    return Object.keys(flipped).length === items.length && 
           Object.values(flipped).every(v => v === true);
  }, [flipped, items.length]);
  
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
  
  useEffect(() => {
    if (
      allFlipped &&
      pendingCorrectFeedbackCount === 0 &&
      !isLoading &&
      items.length > 0 &&
      hasStarted
    ) {
      if (!skipMistakeLogging && sessionMistakes.length > 0 && recordTopicId) {
        recordMistakes(sessionMistakes, recordTopicId, 'flashcards-listening');
      }
      // Log the completed run to the training history (once per completion).
      if (!historySavedRef.current) {
        historySavedRef.current = true;
        if (recordTopicId) {
          recordTrainingRun({
            topicId: recordTopicId,
            mode: 'flashcards-listening',
            words: items.length,
            mistakes,
            wrongWords: sessionMistakes.length,
            trainingSource: trainingSource || undefined,
          });
        }
      }
      setShowCompletionModal(true);
    }
  }, [
    allFlipped,
    pendingCorrectFeedbackCount,
    isLoading,
    items.length,
    hasStarted,
    mistakes,
    sessionMistakes,
    skipMistakeLogging,
    recordTopicId,
    trainingSource,
  ]);
  
  const handleRestart = useCallback(() => {
    feedbackRunIdRef.current += 1;
    interactionLockedRef.current = false;
    historySavedRef.current = false;
    setFlipped({});
    setRemovingCorrectCards({});
    setHiddenCorrectCards({});
    setPendingCorrectFeedbackCount(0);
    setFeedbackTargetIdx(-1);
    setWrongIdx(null);
    setWrongTick(0);
    setScore(0);
    setMistakes(0);
    setWordMistakes(new Map());
    setShowCompletionModal(false);
    setHasStarted(false);
    setShowHintModal(false);
    setTargetIdx(pickRandomIndex(items.length, new Set()));
    setShuffleKey(prev => prev + 1);
    if (currentTopicId) {
      clearTrainingSession();
    }
  }, [items.length, currentTopicId]);
  
  const saveMistakesAndAction = useCallback((action: 'exit' | 'restart' | 'next') => {
    if (!skipMistakeLogging && sessionMistakes.length > 0 && recordTopicId) {
      recordMistakes(sessionMistakes, recordTopicId, 'flashcards-listening');
    }
    
    if (action === 'restart') {
      handleRestart();
    } else if (action === 'exit') {
      setShowCompletionModal(false);
    } else if (action === 'next') {
      const nextMode = getNextTrainingMode('flashcards-listening');
      if (nextMode) {
        const nextParams = new URLSearchParams(searchParams);
        const query = nextParams.toString();
        const nextUrl = query ? `/train/${nextMode}?${query}` : `/train/${nextMode}`;
        navigate(nextUrl);
      }
      setShowCompletionModal(false);
    }
  }, [recordTopicId, sessionMistakes, handleRestart, navigate, searchParams, skipMistakeLogging]);
  
  const handleCompletionExit = () => saveMistakesAndAction('exit');
  const handleCompletionRestart = () => saveMistakesAndAction('restart');
  const handleCompletionNext = () => saveMistakesAndAction('next');

  const target = (
    items.length > 0 &&
    presentedTargetIdx >= 0 &&
    presentedTargetIdx < items.length &&
    !isLoading
  )
    ? items[presentedTargetIdx]
    : null;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'x') {
        e.preventDefault();
        if (hasStarted && !showHintModal && target !== null && !allFlipped) {
          handleShowAnswer();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [hasStarted, showHintModal, target, allFlipped, handleShowAnswer]);

  const headerSubtitle = allFlipped
    ? t('common.completed')
    : hasStarted
      ? t('flashcardsListening.activeState')
      : t('flashcardsListening.readyState');

  return (
    <Box
      sx={{
        width: '100%',
        minHeight: { xs: MOBILE_MAIN_VIEWPORT_HEIGHT, md: '100vh' },
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        boxSizing: 'border-box',
      }}
    >
      <TrainingHeader
        title={t('flashcardsListening.title')}
        subtitle={headerSubtitle}
        icon={<Headphones size={18} />}
        completed={score}
        total={total}
        controls={(
          <TrainingToolbar
            mode={language === 'vi' ? 'vi-en' : 'en-vi'}
            remaining={Math.max(0, total - score)}
            mistakes={mistakes}
            disabled={pendingCorrectFeedbackCount > 0}
            restartDisabled={pendingCorrectFeedbackCount > 0}
            onModeChange={handleLanguageChange}
            onRestart={handleRestart}
            sessionActions={
              !hasStarted ? (
                <Button
                  type="button"
                  variant="contained"
                  color="primary"
                  size="small"
                  onClick={handleStart}
                  startIcon={<Play size={15} />}
                  disabled={isLoading || items.length === 0}
                >
                  {t('buttons.start')}
                </Button>
              ) : (
                <>
                  <Tooltip title={t('flashcardsListening.replay')}>
                    <IconButton
                      aria-label={t('flashcardsListening.replay')}
                      onClick={handleReplayAudio}
                      disabled={allFlipped || pendingCorrectFeedbackCount > 0}
                      color="primary"
                      size="small"
                    >
                      <Volume2 size={17} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip
                    title={t('flashcardsListening.hintTooltip', {
                      shortcut: 'Ctrl+X',
                    })}
                  >
                    <IconButton
                      aria-label={t('buttons.hint')}
                      onClick={handleShowAnswer}
                      disabled={allFlipped || pendingCorrectFeedbackCount > 0}
                      color="primary"
                      size="small"
                    >
                      <HelpCircle size={17} />
                    </IconButton>
                  </Tooltip>
                </>
              )
            }
            actions={(
              <>
                <VocabularyQuickView
                  vocabularyList={items}
                  currentTopicId={sourceTopicId || currentTopicId}
                  triggerVariant="inline"
                />
                <FlashcardsSettingsPanel
                  removeCorrectCards={settings.removeCorrectCards}
                  onRemoveCorrectCardsChange={handleRemoveCorrectCardsChange}
                  disabled={pendingCorrectFeedbackCount > 0}
                  triggerVariant="inline"
                />
              </>
            )}
          />
        )}
      />

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
            maxWidth: 1280,
            mx: 'auto',
            px: { xs: 1, sm: 3, md: 4 },
            py: { xs: 1.25, sm: 2.5 },
            boxSizing: 'border-box',
          }}
        >
          {isLoading ? (
            <Box sx={flashcardGridSx}>
              {[...Array(8)].map((_, idx) => (
                <Skeleton
                  key={idx}
                  variant="rounded"
                  sx={{
                    width: '100%',
                    height: flashcardHeightSx,
                    borderRadius: 1,
                  }}
                />
              ))}
            </Box>
          ) : items.length === 0 ? (
            <Alert severity="info">
              {currentTopicId ? t('errors.noWords') : t('errors.selectTopic')}
            </Alert>
          ) : (
            <Box
              sx={{
                ...flashcardGridSx,
                pb: { xs: 2, sm: 3 },
              }}
            >
              {items.map((it, idx) => {
                if (hiddenCorrectCards[idx]) return null;

                const isRemoving = !!removingCorrectCards[idx];
                const isInteractionDisabled =
                  !hasStarted || isRemoving || pendingCorrectFeedbackCount > 0;

                return (
                  <Box
                    key={`${it.en}-${idx}`}
                    sx={{
                      width: '100%',
                      pointerEvents: isInteractionDisabled ? 'none' : 'auto',
                      opacity: isRemoving ? 0 : hasStarted ? 1 : 0.64,
                      transform: isRemoving
                        ? 'scale(0.96) translateY(-6px)'
                        : 'scale(1) translateY(0)',
                      transformOrigin: 'center',
                      maxHeight: isRemoving
                        ? 0
                        : flashcardRemovalMaxHeightSx,
                      overflow: 'hidden',
                      transition:
                        'opacity 280ms ease, transform 280ms ease, max-height 320ms ease',
                    }}
                  >
                    <WordCard
                      en={it.en}
                      vi={it.vi}
                      showLang={language}
                      flipped={!!flipped[idx]}
                      onAttempt={() => handleAttempt(idx)}
                      shouldShake={wrongIdx === idx}
                      shakeKey={wrongTick}
                      disabled={isInteractionDisabled}
                    />
                  </Box>
                );
              })}
            </Box>
          )}
        </Box>
      </Box>
      
      <Dialog
        open={showHintModal}
        onClose={() => setShowHintModal(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 1,
          },
        }}
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <HelpCircle size={24} color="currentColor" style={{ color: 'inherit' }} />
            <Typography variant="h6" fontWeight={600}>
              {t('buttons.hint')}
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          {target && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, py: 2 }}>
              <Box>
                <Typography 
                  variant="subtitle2" 
                  color="text.secondary" 
                  gutterBottom 
                  sx={{ 
                    fontWeight: 600,
                    fontSize: { xs: '0.75rem', sm: '0.875rem' },
                  }}
                >
                  {t('common.english')}
                </Typography>
                <Typography 
                  variant="h5" 
                  fontWeight={700} 
                  sx={{ 
                    wordBreak: 'break-word',
                    fontSize: { xs: '1.25rem', sm: '1.5rem', md: '1.75rem' },
                  }}
                >
                  {target.en}
                </Typography>
              </Box>

              <Box>
                <Typography 
                  variant="subtitle2" 
                  color="text.secondary" 
                  gutterBottom 
                  sx={{ 
                    fontWeight: 600,
                    fontSize: { xs: '0.75rem', sm: '0.875rem' },
                  }}
                >
                  {t('common.vietnamese')}
                </Typography>
                <Typography 
                  variant="h6" 
                  sx={{ 
                    wordBreak: 'break-word',
                    fontSize: { xs: '1rem', sm: '1.25rem', md: '1.5rem' },
                  }}
                >
                  {target.vi}
                </Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setShowHintModal(false)} variant="contained" color="primary">
            {t('buttons.close')}
          </Button>
        </DialogActions>
      </Dialog>

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

export default FlashcardsListeningPage;
