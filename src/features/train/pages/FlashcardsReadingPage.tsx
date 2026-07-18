// FlashcardsReadingPage.tsx
import {
  Box,
  Typography,
  Skeleton,
  Chip,
  Button,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { Languages, MapPin, AlertCircle, ArrowLeftRight } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTrainWords } from '@/features/train/train-start';
import { getNextTrainingMode } from '@/features/train/utils/trainingModes';
import { WordCard } from '@/features/train/train-start';
import { FlashcardsSettingsPanel, VocabularyQuickView, useFlashcardsSettings } from '@/features/train/components';
import { 
  saveTrainingSession, 
  loadTrainingSession, 
  clearTrainingSession,
  isSessionForTopic,
  type TrainingSession 
} from '@/features/train/train-start/sessionStorage';
import { recordMistakes } from '@/features/train/train-start/mistakesStorage';
import { CompletionModal, type SessionMistake } from '@/features/train/train-read-write/components/CompletionModal';
import { speakEnglishAsync } from '@/utils/speechUtils';
import {
  createTrainingSearchParams,
  getTrainingTopicParams,
} from '@/features/train/utils/topicSession';

const normalize = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();

type WordItem = { id: string; en: string; vi: string };

function adaptWords(input: any[]): WordItem[] {
  if (!Array.isArray(input)) return [];
  // Input is already TrainWordItem[] from api, just return as-is
  return input.filter((w) => w && typeof w === 'object' && w.en && w.vi);
}

function pickRandomIndex(arrLength: number, exclude: Set<number>): number {
  const candidates: number[] = [];
  for (let i = 0; i < arrLength; i++) if (!exclude.has(i)) candidates.push(i);
  if (candidates.length === 0) return -1;
  const r = Math.floor(Math.random() * candidates.length);
  return candidates[r];
}

// Shuffle array using Fisher-Yates algorithm
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Padding-top cho cards grid - điều chỉnh tại đây để thay đổi khoảng cách giữa sticky bar và cards
const GRID_PADDING_TOP = {
  xs: '10px', // Mobile: chỉ cần gap nhỏ, sticky bar sẽ tự stick không che mất card
  sm: '10px', // Tablet: chỉ cần gap nhỏ
  md: '10px'  // Desktop: chỉ cần gap nhỏ
};

const CARD_FLIP_FEEDBACK_MS = 620;
const CARD_EXIT_ANIMATION_MS = 320;

const getHiddenCorrectCardsFromFlipped = (flipped: Record<number, boolean>) => {
  const hidden: Record<number, boolean> = {};
  Object.entries(flipped).forEach(([idx, isFlipped]) => {
    if (isFlipped) hidden[Number(idx)] = true;
  });
  return hidden;
};

const FlashcardsReadingPage = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));
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
  const { settings, setRemoveCorrectCards } = useFlashcardsSettings();
  const removeCorrectCardsRef = useRef(settings.removeCorrectCards);

  useEffect(() => {
    removeCorrectCardsRef.current = settings.removeCorrectCards;
  }, [settings.removeCorrectCards]);

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
    }
    
    setSessionRestored(true);
  }, [currentTopicId, sessionRestored, setSearchParams, trainingSource]);

  const { words: rawWords, isLoading } = useTrainWords();
  const baseItems = useMemo(() => adaptWords(rawWords ?? []), [rawWords]);
  
  // Shuffle items on mount and after restart
  const [items, setItems] = useState<WordItem[]>([]);
  const [shuffleKey, setShuffleKey] = useState(0); // Trigger to reshuffle
  
  // Shuffle items when baseItems change or shuffle is triggered
  useEffect(() => {
    if (baseItems.length > 0) {
      setItems(shuffleArray(baseItems));
    }
  }, [baseItems, shuffleKey]);
  
  const total = items.length;

  // Initialize state with defaults first
  const [flipped, setFlipped] = useState<Record<number, boolean>>({});
  const [removingCorrectCards, setRemovingCorrectCards] = useState<Record<number, boolean>>({});
  const [hiddenCorrectCards, setHiddenCorrectCards] = useState<Record<number, boolean>>({});
  const [wrongIdx, setWrongIdx] = useState<number | null>(null);
  const [wrongTick, setWrongTick] = useState(0);
  const [showMeaningIdx, setShowMeaningIdx] = useState(-1); // Track which card shows meaning
  const [showHintIdx, setShowHintIdx] = useState(-1); // Track which card shows hint (Ctrl+X)
  const [targetIdx, setTargetIdx] = useState<number>(() => pickRandomIndex(total, new Set()));
  const [score, setScore] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [language, setLanguage] = useState<'vi' | 'en'>('vi');
  
  // Track mistakes by stable word ID for the current session.
  const [wordMistakes, setWordMistakes] = useState<Map<string, number>>(new Map());
  
  // Completion modal state
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [pendingCorrectFeedbackCount, setPendingCorrectFeedbackCount] = useState(0);

  const prevTopicIdRef = useRef<string | null>(null);
  const prevTrainingSourceRef = useRef<string | null>(null);
  const cardRefs = useRef<Record<number, HTMLDivElement | null>>({});

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
      setTargetIdx(pickRandomIndex(items.length, new Set()));
      setLanguage('vi');
      return;
    }
    
    const session = loadTrainingSession();
    if (isSessionForTopic(session, currentTopicId, trainingSource)) {
      // Validate session data matches current items
      if (session && session.targetIdx >= 0 && session.targetIdx < items.length) {
        // Restore session state
        const restoredFlipped = session.flipped || {};
        setFlipped(restoredFlipped);
        setRemovingCorrectCards({});
        setHiddenCorrectCards(
          removeCorrectCardsRef.current ? getHiddenCorrectCardsFromFlipped(restoredFlipped) : {}
        );
        setPendingCorrectFeedbackCount(0);
        setScore(session.score || 0);
        setMistakes(session.mistakes || 0);
        setTargetIdx(session.targetIdx >= 0 ? session.targetIdx : pickRandomIndex(items.length, new Set()));
        setLanguage(session.language || 'vi');
        return; // Session restored
      }
    }
    
    // No valid session - start fresh
    setFlipped({});
    setRemovingCorrectCards({});
    setHiddenCorrectCards({});
    setWrongIdx(null);
    setWrongTick(0);
    setScore(0);
    setMistakes(0);
    setPendingCorrectFeedbackCount(0);
    setTargetIdx(pickRandomIndex(items.length, new Set()));
    setLanguage('vi');
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

  const wait = useCallback((ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms)), []);

  const playCorrectFeedback = useCallback(
    async (idx: number, word: string, shouldRemoveAfterFeedback: boolean) => {
      setPendingCorrectFeedbackCount((count) => count + 1);

      try {
        await Promise.all([
          wait(CARD_FLIP_FEEDBACK_MS),
          speakEnglishAsync(word, { lang: 'en-US' }),
        ]);

        if (!shouldRemoveAfterFeedback || !removeCorrectCardsRef.current) return;

        setRemovingCorrectCards((prev) => ({ ...prev, [idx]: true }));
        await wait(CARD_EXIT_ANIMATION_MS);

        if (!removeCorrectCardsRef.current) return;

        setHiddenCorrectCards((prev) => ({ ...prev, [idx]: true }));
        setRemovingCorrectCards((prev) => {
          const next = { ...prev };
          delete next[idx];
          return next;
        });
      } finally {
        setPendingCorrectFeedbackCount((count) => Math.max(0, count - 1));
      }
    },
    [wait]
  );

  const handleRemoveCorrectCardsChange = useCallback(
    (checked: boolean) => {
      removeCorrectCardsRef.current = checked;
      setRemoveCorrectCards(checked);
      setRemovingCorrectCards({});
      setHiddenCorrectCards(checked ? getHiddenCorrectCardsFromFlipped(flipped) : {});
    },
    [flipped, setRemoveCorrectCards]
  );

  const handleLanguageToggle = () => {
    setLanguage((prev) => (prev === 'vi' ? 'en' : 'vi'));
      // Note: Session will be auto-saved via useEffect
  };

  const scrollToCard = useCallback((idx: number) => {
    const cardElement = cardRefs.current[idx];
    if (!cardElement) return;

    const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    cardElement.scrollIntoView({
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
      block: 'center',
      inline: 'nearest',
    });
  }, []);

  // Handle show hint (Ctrl+X) - show meaning on correct answer card for 3 seconds
  const handleShowHint = useCallback(() => {
    if (isLoading || items.length === 0) return;
    if (targetIdx < 0 || targetIdx >= items.length) return;
    if (flipped[targetIdx]) return; // Don't show hint on already flipped card
    
    setShowHintIdx(targetIdx);
    window.requestAnimationFrame(() => scrollToCard(targetIdx));
    setTimeout(() => {
      setShowHintIdx(-1);
    }, 3000);
  }, [isLoading, items.length, targetIdx, flipped, scrollToCard]);

  // Persist the session whenever relevant state changes.
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
    isLoading,
    items.length,
  ]);

  const handleAttempt = useCallback(
    (idx: number) => {
      // Guard clauses: prevent click when loading or items not ready
      if (isLoading || items.length === 0) return;
      if (targetIdx < 0 || targetIdx >= items.length) return;
      if (idx < 0 || idx >= items.length) return;
      if (flipped[idx]) return;
      
      // Ensure target item exists before accessing
      if (!items[targetIdx] || !items[idx]) return;
      
      // Check answer based on language mode
      // VI-EN mode: top bar shows Vietnamese (target.vi), cards show English
      //   - User needs to click the card with English that matches the Vietnamese in top bar
      //   - So we check if the clicked card's English matches target's English
      // EN-VI mode: top bar shows English (target.en), cards show Vietnamese
      //   - User needs to click the card with Vietnamese that matches the English in top bar
      //   - So we check if the clicked card's Vietnamese matches target's Vietnamese
      const isCorrect = language === 'vi'
        ? normalize(items[idx].en) === normalize(items[targetIdx].en) // VI-EN: match English
        : normalize(items[idx].vi) === normalize(items[targetIdx].vi); // EN-VI: match Vietnamese
      
      if (isCorrect) {
        const currentEnglish = items[targetIdx].en;
        setFlipped((f) => ({ ...f, [idx]: true }));
        setScore((v) => v + 1);
        const exclude = new Set<number>();
        Object.keys(flipped).forEach((k) => {
          if (flipped[+k]) exclude.add(+k);
        });
        exclude.add(idx);
        setTargetIdx(pickRandomIndex(items.length, exclude));
        void playCorrectFeedback(idx, currentEnglish, removeCorrectCardsRef.current);
      } else {
        setWrongIdx(idx);
        setWrongTick((t) => t + 1);
        setMistakes((m) => m + 1);
        
        // Show meaning for 2 seconds on the clicked wrong card
        setShowMeaningIdx(idx);
        setTimeout(() => {
          setShowMeaningIdx(-1);
        }, 2000);
        
        // Track mistake for this word
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
    [items, targetIdx, flipped, language, isLoading, playErrorTone, playCorrectFeedback]
  );

  // Check if all cards are flipped (100% completion)
  const allFlipped = useMemo(() => {
    if (items.length === 0) return false;
    return Object.keys(flipped).length === items.length && 
           Object.values(flipped).every(v => v === true);
  }, [flipped, items.length]);
  
  // Show completion modal when 100% completed
  useEffect(() => {
    if (allFlipped && pendingCorrectFeedbackCount === 0 && !isLoading && items.length > 0) {
      setShowCompletionModal(true);
    }
  }, [allFlipped, pendingCorrectFeedbackCount, isLoading, items.length]);

  // Handle keyboard shortcut Ctrl+X for hint
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'x') {
        e.preventDefault();
        if (!allFlipped && targetIdx >= 0 && !flipped[targetIdx]) {
          handleShowHint();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [allFlipped, targetIdx, flipped, handleShowHint]);
  
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
    // Sort by mistake count (descending)
    return mistakesList.sort((a, b) => b.count - a.count);
  }, [wordMistakes, items]);
  
  const handleRestart = useCallback(() => {
    setFlipped({});
    setRemovingCorrectCards({});
    setHiddenCorrectCards({});
    setPendingCorrectFeedbackCount(0);
    setWrongIdx(null);
    setWrongTick(0);
    setScore(0);
    setMistakes(0);
    setWordMistakes(new Map());
    setShowCompletionModal(false);
    setTargetIdx(pickRandomIndex(items.length, new Set()));
    // Shuffle cards for next session
    setShuffleKey(prev => prev + 1);
    // Clear saved session on restart
    if (currentTopicId) {
      clearTrainingSession();
    }
  }, [items.length, currentTopicId]);
  
  // Persist mistakes and handle completion actions.
  const saveMistakesAndAction = useCallback((action: 'exit' | 'restart' | 'next') => {
    if (!skipMistakeLogging && sessionMistakes.length > 0 && recordTopicId) {
      // Save mistakes once the session completes.
      recordMistakes(sessionMistakes, recordTopicId, 'flashcards-reading');
    }
    
    // Execute action
    if (action === 'restart') {
      handleRestart();
    } else if (action === 'exit') {
      setShowCompletionModal(false);
    } else if (action === 'next') {
      // Navigate to next training mode
      const nextMode = getNextTrainingMode('flashcards-reading');
      if (nextMode) {
        const nextParams = new URLSearchParams(searchParams);
        const query = nextParams.toString();
        const nextUrl = query ? `/train/${nextMode}?${query}` : `/train/${nextMode}`;
        navigate(nextUrl);
      }
      setShowCompletionModal(false);
    }
  }, [recordTopicId, sessionMistakes, handleRestart, navigate, searchParams, skipMistakeLogging]);
  
  const handleCompletionExit = () => {
    saveMistakesAndAction('exit');
  };
  
  const handleCompletionRestart = () => {
    saveMistakesAndAction('restart');
  };
  
  const handleCompletionNext = () => {
    saveMistakesAndAction('next');
  };

  // Ensure targetIdx is valid and items are loaded before accessing
  const target = (items.length > 0 && targetIdx >= 0 && targetIdx < items.length && !isLoading) 
    ? items[targetIdx] 
    : null;
  
  // Determine what to show in top bar and cards based on language mode
  // Hide top bar label when completed (100% flipped)
  const topBarLabel = allFlipped
    ? 'Completed!'  // Show completion message
    : isLoading || !target
      ? 'Loading...'  // Show loading state
      : language === 'vi'
        ? (target.vi || '—')  // VI-EN mode: show Vietnamese in top bar
        : (target.en || '—'); // EN-VI mode: show English in top bar

  return (
    <Box
      sx={{
        width: '100%',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        // Không set overflow - để window scroll tự nhiên cho sticky
        boxSizing: 'border-box',
      }}
    >
      {/* Sticky Top Bar - Đơn giản, rõ ràng */}
      <Box
        sx={{
          position: 'sticky',
          top: { xs: '56px', sm: '64px', md: 0 }, // Stick ngay dưới AppBar trên mobile, ở top trên desktop
          zIndex: (t) => t.zIndex.appBar - 1, // Dưới AppBar, trên content
          bgcolor: 'background.paper',
          borderBottom: `1px solid ${theme.palette.divider}`,
          px: { xs: 1.5, sm: 3 },
          py: { xs: 0.75, sm: 1.5 },
          width: '100%',
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: { xs: 'flex-start', sm: 'center' },
          justifyContent: 'space-between',
          gap: { xs: 1, sm: 2 },
          boxShadow: 'none',
          flexShrink: 0,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Languages size={20} color="currentColor" style={{ color: 'inherit' }} />
          <Typography
            variant="h6"
            fontWeight="bold"
            color="primary"
            sx={{
              fontSize: { xs: '0.875rem', sm: '1.05rem', md: '1.2rem' }, // Smaller on mobile
              lineHeight: 1.3,
              wordBreak: 'break-word',
              whiteSpace: 'normal',
            }}
          >
            {topBarLabel}
          </Typography>
        </Box>

        <Button
          variant="outlined"
          color="primary"
          size={isMobile ? 'small' : 'medium'}
          onClick={handleLanguageToggle}
          startIcon={<ArrowLeftRight size={isMobile ? 16 : 18} />}
          sx={{
            width: { xs: '100%', sm: 'auto' },
            fontSize: { xs: '0.75rem', sm: '0.875rem' },
            px: { xs: 1.5, sm: 2.5 },
            py: { xs: 0.75, sm: 1 },
            minWidth: { xs: 'auto', sm: 140 },
            fontWeight: 600,
          }}
        >
          {language === 'vi' ? t('direction.viEn') : t('direction.enVi')}
        </Button>

        <Box
          sx={{
            display: 'flex',
            gap: { xs: 1, sm: 1.5 },
            width: { xs: '100%', sm: 'auto' },
            justifyContent: { xs: 'space-between', sm: 'flex-start' },
            alignItems: 'center',
            flexWrap: 'nowrap',
          }}
        >
          <Chip
            icon={<MapPin size={16} />}
            label={`${score} / ${total}`}
            variant="outlined"
            size={isMobile ? 'small' : 'medium'}
            sx={{ 
              borderRadius: 1, 
              borderColor: theme.palette.divider, 
              bgcolor: 'background.default',
              fontSize: { xs: '0.75rem', sm: '0.875rem' },
              '& .MuiChip-label': { px: { xs: 0.75, sm: 1.5 } },
              flexShrink: 0,
            }}
          />
          <Chip
            icon={<AlertCircle size={16} color="error" />}
            label={t('topBar.mistakes', { count: mistakes })}
            variant="outlined"
            size={isMobile ? 'small' : 'medium'}
            sx={{
              borderRadius: 1,
              borderColor: theme.palette.error.light,
              color: 'error.main',
              bgcolor: theme.palette.error.light + '20',
              fontSize: { xs: '0.75rem', sm: '0.875rem' },
              '& .MuiChip-label': { px: { xs: 0.75, sm: 1.5 } },
              flexShrink: 0,
            }}
          />
          <Button
            variant="outlined"
            color="primary"
            size={isMobile ? 'small' : 'medium'}
            onClick={handleRestart}
            sx={{ 
              minWidth: { xs: 'auto', sm: 80 },
              fontSize: { xs: '0.75rem', sm: '0.875rem' },
              px: { xs: 1, sm: 2 },
              flexShrink: 0,
              whiteSpace: 'nowrap',
            }}
          >
            {t('buttons.restart')}
          </Button>
        </Box>
      </Box>

      {/* Main Content */}
      <Box
        sx={{
          width: '100%',
          maxWidth: { xs: '100%', sm: '1536px' },
          mx: 'auto',
          px: { xs: 2, sm: 3, md: 4 },
          pb: { xs: 1.5, sm: 2, md: 3 },
          flex: 1,
          boxSizing: 'border-box',
        }}
      >
        {isLoading ? (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: 'repeat(1, 1fr)',
              sm: 'repeat(2, 1fr)',
              md: 'repeat(3, 1fr)',
              lg: 'repeat(4, 1fr)',
            },
            gap: { xs: 2, sm: 2.5, md: 3 },
            pb: { xs: 12, sm: 14 },
            pt: GRID_PADDING_TOP, // Padding để tránh sticky bar che mất card đầu tiên
          }}
        >
          {[...Array(8)].map((_, idx) => (
            <Skeleton key={idx} variant="rounded" height={isMobile ? 168 : isTablet ? 210 : 236} sx={{ borderRadius: 2 }} />
          ))}
        </Box>
      ) : (
        <Box
          sx={{
            display: 'grid',
            gap: { xs: 1.5, sm: 2.5, md: 3 }, // Reduced gap on mobile
            gridTemplateColumns: {
              xs: 'repeat(1, minmax(0, 1fr))',
              sm: 'repeat(2, minmax(0, 1fr))',
              md: 'repeat(3, minmax(0, 1fr))',
              lg: 'repeat(4, minmax(0, 1fr))',
            },
            alignItems: 'stretch',
            pb: { xs: 12, sm: 14 },
            pt: GRID_PADDING_TOP, // Padding để tránh sticky bar che mất card đầu tiên
          }}
        >
          {items.map((it, idx) => {
            if (hiddenCorrectCards[idx]) return null;

            const isRemoving = !!removingCorrectCards[idx];

            return (
              <Box
                key={`${it.en}-${idx}`}
                ref={(element: HTMLDivElement | null) => {
                  cardRefs.current[idx] = element;
                }}
                sx={{
                  pointerEvents: isLoading || items.length === 0 || isRemoving ? 'none' : 'auto',
                  opacity: isRemoving ? 0 : isLoading || items.length === 0 ? 0.6 : 1,
                  transform: isRemoving ? 'scale(0.92) translateY(-8px)' : 'scale(1) translateY(0)',
                  transformOrigin: 'center',
                  maxHeight: isRemoving ? 0 : { xs: 180, sm: 232, md: 260 },
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
                  showMeaning={showMeaningIdx === idx || showHintIdx === idx}
                />
              </Box>
            );
          })}
        </Box>
        )}
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
        removeCorrectCards={settings.removeCorrectCards}
        onRemoveCorrectCardsChange={handleRemoveCorrectCardsChange}
      />
    </Box>
  );
};

export default FlashcardsReadingPage;
