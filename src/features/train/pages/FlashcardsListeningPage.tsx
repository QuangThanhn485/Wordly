// FlashcardsListeningPage.tsx - Re-exported from original location
// This file wraps the original FlashcardsListening component

import {
  Box,
  Typography,
  Skeleton,
  Chip,
  Button,
  useTheme,
  useMediaQuery,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { MapPin, AlertCircle, Volume2, HelpCircle, Play, ArrowLeftRight } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTrainWords } from '@/features/train/train-listen';
import { getNextTrainingMode } from '@/features/train/utils/trainingModes';
import { WordCard } from '@/features/train/train-listen';
import { VocabularyQuickView } from '@/features/train/components';
import { 
  saveTrainingSession, 
  loadTrainingSession, 
  clearTrainingSession,
  isSessionForFile,
  type TrainingSession 
} from '@/features/train/train-listen/sessionStorage';
import { recordMistakes } from '@/features/train/train-listen/mistakesStorage';
import { CompletionModal, type SessionMistake } from '@/features/train/train-listen-write/components/CompletionModal';
import { speakEnglish, getBestEnglishVoice, type SpeechOptions } from '@/utils/speechUtils';

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

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

const GRID_PADDING_TOP = {
  xs: '10px',
  sm: '10px',
  md: '10px'
};

const FlashcardsListeningPage = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));
  const { t } = useTranslation('train');
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const currentFileName = searchParams.get('file');
  const sourceFileName = searchParams.get('sourceFile');
  const trainingSource = searchParams.get('trainingSource');
  const recordFileName = sourceFileName || currentFileName;
  const skipMistakeLogging = trainingSource === 'top-mistakes';
  const [sessionRestored, setSessionRestored] = useState(false);

  useEffect(() => {
    if (sessionRestored) return;
    
    const savedSession = loadTrainingSession();
    
    if (currentFileName) {
      if (
        savedSession &&
        (savedSession.fileName !== currentFileName ||
          (trainingSource && savedSession.trainingSource !== trainingSource))
      ) {
        clearTrainingSession();
      }
      setSessionRestored(true);
      return;
    }
    
    if (savedSession && savedSession.fileName) {
      const params: Record<string, string> = { file: savedSession.fileName };
      if (savedSession.sourceFileName) params.sourceFile = savedSession.sourceFileName;
      if (savedSession.trainingSource) params.trainingSource = savedSession.trainingSource;
      setSearchParams(params, { replace: true });
      setSessionRestored(true);
      return;
    }
    
    try {
      const readingSessionStr = localStorage.getItem('wordly_train_session');
      if (readingSessionStr) {
        const readingSession = JSON.parse(readingSessionStr);
        if (readingSession && readingSession.fileName) {
          const params: Record<string, string> = { file: readingSession.fileName };
          if (readingSession.sourceFileName) params.sourceFile = readingSession.sourceFileName;
          if (readingSession.trainingSource) params.trainingSource = readingSession.trainingSource;
          setSearchParams(params, { replace: true });
          setSessionRestored(true);
          return;
        }
      }
    } catch (err) {}
    
    setSessionRestored(true);
  }, [currentFileName, sessionRestored, setSearchParams, trainingSource]);

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

  const prevFileNameRef = useRef<string | null>(null);
  const prevTrainingSourceRef = useRef<string | null>(null);

  useEffect(() => {
    if (isLoading || items.length === 0 || !currentFileName || !sessionRestored) return;
    
    const fileChanged = prevFileNameRef.current !== null && prevFileNameRef.current !== currentFileName;
    const trainingSourceChanged =
      prevTrainingSourceRef.current !== null && prevTrainingSourceRef.current !== trainingSource;
    prevFileNameRef.current = currentFileName;
    prevTrainingSourceRef.current = trainingSource;
    
    if (fileChanged || trainingSourceChanged) {
      clearTrainingSession();
      setFlipped({});
      setWrongIdx(null);
      setWrongTick(0);
      setScore(0);
      setMistakes(0);
      setWordMistakes(new Map());
      setShowCompletionModal(false);
      setHasStarted(false);
      setShowHintModal(false);
      setTargetIdx(pickRandomIndex(items.length, new Set()));
      setLanguage('en');
      return;
    }
    
    const session = loadTrainingSession();
    if (isSessionForFile(session, currentFileName, trainingSource)) {
      if (session && session.targetIdx >= 0 && session.targetIdx < items.length) {
        setFlipped(session.flipped || {});
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
    setWrongIdx(null);
    setWrongTick(0);
    setScore(0);
    setMistakes(0);
    setWordMistakes(new Map());
    setHasStarted(false);
    setShowHintModal(false);
    setTargetIdx(pickRandomIndex(items.length, new Set()));
    setLanguage('en');
  }, [currentFileName, isLoading, items.length, sessionRestored, trainingSource]);

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
    (text: string, options: SpeechOptions = {}) =>
      new Promise<void>((resolve) => {
        if (!text || typeof window === 'undefined') return resolve();
        const synth = window.speechSynthesis;
        if (!synth) return resolve();

        let hasSpoken = false;
        const speakNow = () => {
          if (hasSpoken) return;
          hasSpoken = true;
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.lang = options.lang || 'en-US';
          utterance.rate = options.rate ?? 1.0;
          utterance.pitch = options.pitch ?? 1.0;
          utterance.volume = options.volume ?? 1.0;

          if (options.voiceName) {
            const voice = synth.getVoices().find((v) => v.name === options.voiceName);
            if (voice) utterance.voice = voice;
          }
          if (!utterance.voice) {
            const bestVoice = getBestEnglishVoice();
            if (bestVoice) utterance.voice = bestVoice;
          }

          utterance.onend = () => resolve();
          utterance.onerror = () => resolve();
          synth.speak(utterance);
        };

        if (synth.getVoices().length === 0) {
          synth.addEventListener('voiceschanged', speakNow, { once: true });
          setTimeout(speakNow, 150);
        } else {
          speakNow();
        }
      }),
    []
  );

  const wait = useCallback((ms: number) => new Promise<void>((res) => setTimeout(res, ms)), []);

  const speakResultThenNext = useCallback(
    async (current: string, next?: string) => {
      if (!current) return;
      try {
        if (typeof window !== 'undefined') {
          window.speechSynthesis?.cancel();
        }
      } catch {}
      await speakEnglishAwaitable(current, { lang: 'en-US' });
      if (next) {
        await wait(200);
        await speakEnglishAwaitable(next, { lang: 'en-US' });
      }
    },
    [speakEnglishAwaitable, wait]
  );

  const handleLanguageToggle = () => {
    setLanguage((prev) => (prev === 'vi' ? 'en' : 'vi'));
  };

  const handleStart = useCallback(() => {
    if (isLoading || items.length === 0) return;
    if (targetIdx < 0 || targetIdx >= items.length) return;
    
    const target = items[targetIdx];
    if (!target) return;
    
    setHasStarted(true);
    setShowHintModal(false);
    speakEnglish(target.en, { lang: 'en-US' });
  }, [items, targetIdx, isLoading]);

  const handleReplayAudio = useCallback(() => {
    if (isLoading || items.length === 0) return;
    if (targetIdx < 0 || targetIdx >= items.length) return;
    if (!hasStarted) return;
    
    const target = items[targetIdx];
    if (!target) return;
    
    speakEnglish(target.en, { lang: 'en-US' });
  }, [hasStarted, items, targetIdx, isLoading]);

  const handleShowAnswer = useCallback(() => {
    if (isLoading || items.length === 0) return;
    if (targetIdx < 0 || targetIdx >= items.length) return;
    if (!hasStarted) return;
    
    setShowHintModal(true);
  }, [hasStarted, items, targetIdx, isLoading]);

  useEffect(() => {
    if (!currentFileName || isLoading || items.length === 0) return;
    
    const session: TrainingSession = {
      fileName: currentFileName,
      sourceFileName: sourceFileName || undefined,
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
    currentFileName,
    sourceFileName,
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
      if (isLoading || items.length === 0 || !hasStarted) return;
      if (targetIdx < 0 || targetIdx >= items.length) return;
      if (idx < 0 || idx >= items.length) return;
      if (flipped[idx]) return;
      
      if (!items[targetIdx] || !items[idx]) return;
      
      const isCorrect = language === 'vi'
        ? normalize(items[idx].en) === normalize(items[targetIdx].en)
        : normalize(items[idx].vi) === normalize(items[targetIdx].vi);
      
      if (isCorrect) {
        setFlipped((f) => ({ ...f, [idx]: true }));
        setScore((v) => v + 1);
        const currentEnglish = items[targetIdx].en;
        setShowHintModal(false);
        const exclude = new Set<number>();
        Object.keys(flipped).forEach((k) => {
          if (flipped[+k]) exclude.add(+k);
        });
        exclude.add(idx);
        const newTargetIdx = pickRandomIndex(items.length, exclude);
        setTargetIdx(newTargetIdx);

        const nextEnglish =
          newTargetIdx >= 0 && newTargetIdx < items.length && items[newTargetIdx]
            ? items[newTargetIdx].en
            : undefined;
        void speakResultThenNext(currentEnglish, nextEnglish);
      } else {
        setWrongIdx(idx);
        setWrongTick((t) => t + 1);
        setMistakes((m) => m + 1);
        
        const wrongWord = items[targetIdx].en;
        setWordMistakes((prev) => {
          const newMap = new Map(prev);
          newMap.set(wrongWord, (newMap.get(wrongWord) || 0) + 1);
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
    [items, targetIdx, flipped, language, isLoading, hasStarted, playErrorTone, speakResultThenNext]
  );

  const allFlipped = useMemo(() => {
    if (items.length === 0) return false;
    return Object.keys(flipped).length === items.length && 
           Object.values(flipped).every(v => v === true);
  }, [flipped, items.length]);
  
  const sessionMistakes: SessionMistake[] = useMemo(() => {
    const mistakesList: SessionMistake[] = [];
    wordMistakes.forEach((count, word) => {
      const item = items.find(it => it.en === word);
      if (item) {
        mistakesList.push({
          word: item.en,
          viMeaning: item.vi,
          count,
        });
      } else {
        mistakesList.push({
          word: word,
          viMeaning: 'N/A',
          count,
        });
      }
    });
    return mistakesList.sort((a, b) => b.count - a.count);
  }, [wordMistakes, items]);
  
  useEffect(() => {
    if (allFlipped && !isLoading && items.length > 0 && hasStarted) {
      if (!skipMistakeLogging && sessionMistakes.length > 0 && recordFileName) {
        recordMistakes(sessionMistakes, recordFileName, 'flashcards-listening');
      }
      setShowCompletionModal(true);
    }
  }, [allFlipped, isLoading, items.length, hasStarted, sessionMistakes, currentFileName]);
  
  const handleRestart = useCallback(() => {
    setFlipped({});
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
    if (currentFileName) {
      clearTrainingSession();
    }
  }, [items.length, currentFileName]);
  
  const saveMistakesAndAction = useCallback((action: 'exit' | 'restart' | 'next') => {
    if (!skipMistakeLogging && sessionMistakes.length > 0 && recordFileName) {
      recordMistakes(sessionMistakes, recordFileName, 'flashcards-listening');
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
  }, [recordFileName, sessionMistakes, handleRestart, navigate, searchParams, skipMistakeLogging]);
  
  const handleCompletionExit = () => saveMistakesAndAction('exit');
  const handleCompletionRestart = () => saveMistakesAndAction('restart');
  const handleCompletionNext = () => saveMistakesAndAction('next');

  const target = (items.length > 0 && targetIdx >= 0 && targetIdx < items.length && !isLoading) 
    ? items[targetIdx] 
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
  
  const topBarLabel = allFlipped
    ? 'Completed!'
    : !hasStarted
      ? ''
      : isLoading || !target
        ? 'Loading...'
        : '';

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
      <Box
        sx={{
          position: 'sticky',
          top: { xs: '56px', sm: '64px', md: 0 },
          zIndex: (t) => t.zIndex.appBar - 1,
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
        {topBarLabel && (
          <Typography
            variant="h6"
            fontWeight="bold"
            color="primary"
            sx={{
              fontSize: { xs: '0.875rem', sm: '1.05rem', md: '1.2rem' },
              lineHeight: 1.3,
            }}
          >
            {topBarLabel}
          </Typography>
        )}

        <Button
          variant="outlined"
          color="primary"
          size={isMobile ? 'small' : 'medium'}
          onClick={handleLanguageToggle}
          startIcon={<ArrowLeftRight size={isMobile ? 16 : 18} />}
          sx={{
            width: { xs: '100%', sm: 'auto' },
            fontSize: { xs: '0.7rem', sm: '0.875rem' },
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
            gap: { xs: 0.5, sm: 1.5 },
            width: { xs: '100%', sm: 'auto' },
            justifyContent: { xs: 'flex-start', sm: 'flex-start' },
            alignItems: 'center',
            flexWrap: { xs: 'wrap', sm: 'nowrap' },
            maxWidth: '100%',
            boxSizing: 'border-box',
          }}
        >
          {!hasStarted ? (
            <Button
              variant="contained"
              color="primary"
              size={isMobile ? 'small' : 'medium'}
              onClick={handleStart}
              startIcon={<Play size={isMobile ? 14 : 16} />}
              disabled={isLoading || items.length === 0}
              sx={{ 
                minWidth: { xs: 'auto', sm: 100 },
                fontSize: { xs: '0.65rem', sm: '0.875rem' },
                px: { xs: 1, sm: 2 },
                py: { xs: 0.5, sm: 1 },
                height: { xs: 24, sm: 'auto' },
                flexShrink: 1,
                flex: { xs: '0 1 auto', sm: '0 0 auto' },
                whiteSpace: 'nowrap',
              }}
            >
              {t('buttons.start')}
            </Button>
          ) : (
            <>
              <Tooltip title={t('flashcardsListening.replay')}>
                <IconButton
                  onClick={handleReplayAudio}
                  disabled={allFlipped}
                  color="primary"
                  size={isMobile ? 'small' : 'medium'}
                  sx={{ 
                    flexShrink: 0,
                    padding: { xs: 0.5, sm: 1 },
                  }}
                >
                  <Volume2 size={isMobile ? 16 : 24} />
                </IconButton>
              </Tooltip>
              <Tooltip title={t('flashcardsListening.hintTooltip', { shortcut: 'Ctrl+X' })}>
                <IconButton
                  onClick={handleShowAnswer}
                  disabled={allFlipped}
                  color="primary"
                  size={isMobile ? 'small' : 'medium'}
                  sx={{ 
                    flexShrink: 0,
                    padding: { xs: 0.5, sm: 1 },
                  }}
                >
                  <HelpCircle size={isMobile ? 16 : 24} />
                </IconButton>
              </Tooltip>
            </>
          )}
          <Chip
            icon={<MapPin size={16} />}
            label={`${score} / ${total}`}
            variant="outlined"
            size={isMobile ? 'small' : 'medium'}
            sx={{ 
              borderRadius: 1, 
              borderColor: theme.palette.divider, 
              bgcolor: 'background.default',
              fontSize: { xs: '0.65rem', sm: '0.875rem' },
              height: { xs: 24, sm: 32 },
              '& .MuiChip-label': { px: { xs: 0.5, sm: 1.5 }, fontSize: { xs: '0.65rem', sm: '0.875rem' } },
              '& .MuiChip-icon': { fontSize: { xs: '0.875rem', sm: '1rem' }, ml: { xs: 0.5, sm: 1 } },
              flexShrink: 1,
              flex: { xs: '0 1 auto', sm: '0 0 auto' },
            }}
          />
          <Chip
            icon={<AlertCircle size={16} color="error" />}
            label={t(isMobile ? 'topBar.mistakesShort' : 'topBar.mistakes', { count: mistakes })}
            variant="outlined"
            size={isMobile ? 'small' : 'medium'}
            sx={{
              borderRadius: 1,
              borderColor: theme.palette.error.light,
              color: 'error.main',
              bgcolor: theme.palette.error.light + '20',
              fontSize: { xs: '0.65rem', sm: '0.875rem' },
              height: { xs: 24, sm: 32 },
              '& .MuiChip-label': { px: { xs: 0.5, sm: 1.5 }, fontSize: { xs: '0.65rem', sm: '0.875rem' } },
              '& .MuiChip-icon': { fontSize: { xs: '0.875rem', sm: '1rem' }, ml: { xs: 0.5, sm: 1 } },
              flexShrink: 1,
              flex: { xs: '0 1 auto', sm: '0 0 auto' },
            }}
          />
          <Button
            variant="outlined"
            color="primary"
            size={isMobile ? 'small' : 'medium'}
            onClick={handleRestart}
            sx={{ 
              minWidth: { xs: 'auto', sm: 80 },
              fontSize: { xs: '0.65rem', sm: '0.875rem' },
              px: { xs: 0.75, sm: 2 },
              py: { xs: 0.5, sm: 1 },
              height: { xs: 24, sm: 'auto' },
              flexShrink: 1,
              flex: { xs: '0 1 auto', sm: '0 0 auto' },
              whiteSpace: 'nowrap',
            }}
          >
            {t('buttons.restart')}
          </Button>
        </Box>
      </Box>

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
            pt: GRID_PADDING_TOP,
          }}
        >
          {[...Array(8)].map((_, idx) => (
            <Skeleton key={idx} variant="rounded" height={isMobile ? 168 : isTablet ? 210 : 236} sx={{ borderRadius: 2 }} />
          ))}
        </Box>
      ) : items.length === 0 ? (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '50vh',
            py: 4,
          }}
        >
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No vocabulary found
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {currentFileName ? `File "${currentFileName}" is empty or doesn't exist.` : 'Please select a vocabulary file to train.'}
          </Typography>
        </Box>
      ) : (
        <Box
          sx={{
            display: 'grid',
            gap: { xs: 1.5, sm: 2.5, md: 3 },
            gridTemplateColumns: {
              xs: 'repeat(1, minmax(0, 1fr))',
              sm: 'repeat(2, minmax(0, 1fr))',
              md: 'repeat(3, minmax(0, 1fr))',
              lg: 'repeat(4, minmax(0, 1fr))',
            },
            alignItems: 'stretch',
            pb: { xs: 12, sm: 14 },
            pt: GRID_PADDING_TOP,
          }}
        >
          {items.map((it, idx) => (
            <Box 
              key={`${it.en}-${idx}`}
              sx={{
                pointerEvents: isLoading || items.length === 0 || !hasStarted ? 'none' : 'auto',
                opacity: isLoading || items.length === 0 ? 0.6 : 1,
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
              />
            </Box>
          ))}
        </Box>
        )}
      </Box>
      
      <Dialog
        open={showHintModal}
        onClose={() => setShowHintModal(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
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

      <VocabularyQuickView
        vocabularyList={items}
        currentFileName={sourceFileName || currentFileName}
      />
    </Box>
  );
};

export default FlashcardsListeningPage;
