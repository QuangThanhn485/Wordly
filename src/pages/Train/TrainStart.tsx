// TrainStart.tsx
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
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTrainWords } from 'features/train/train-start';
import { getNextTrainingMode, getTrainingModeUrl } from 'features/train/utils/trainingModes';
import { WordCard } from 'features/train/train-start';
import { VocabularyQuickView } from 'features/train/components';
import { 
  saveTrainingSession, 
  loadTrainingSession, 
  clearTrainingSession,
  isSessionForFile,
  type TrainingSession 
} from 'features/train/train-start/sessionStorage';
import { recordMistakes } from 'features/train/train-start/mistakesStorage';
import { CompletionModal, type SessionMistake } from 'features/train/train-start/components/CompletionModal';
import { speakEnglish } from '@/utils/speechUtils';

const normalize = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();

type WordItem = { en: string; vi: string };

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

const TrainStart = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const currentFileName = searchParams.get('file');
  const [sessionRestored, setSessionRestored] = useState(false); // Track if we've attempted to restore session

  // Check for saved session on mount - if no file in URL but session exists, restore it
  // BUT if URL has a different file, that takes priority (user selected a new file)
  useEffect(() => {
    if (sessionRestored) return; // Only run once on mount
    
    const savedSession = loadTrainingSession();
    
    // Priority 1: If URL has a file parameter, use it (user selected a file)
    if (currentFileName) {
      // Check if this is a different file than the saved session
      if (savedSession && savedSession.fileName !== currentFileName) {
        // Different file - clear old session immediately
        clearTrainingSession();
      }
      setSessionRestored(true);
      return;
    }
    
    // Priority 2: No file in URL - restore from saved session if available
    if (savedSession && savedSession.fileName) {
      setSearchParams({ file: savedSession.fileName }, { replace: true });
    }
    
    setSessionRestored(true);
  }, [currentFileName, sessionRestored, setSearchParams]);

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
  const [wrongIdx, setWrongIdx] = useState<number | null>(null);
  const [wrongTick, setWrongTick] = useState(0);
  const [showMeaningIdx, setShowMeaningIdx] = useState(-1); // Track which card shows meaning
  const [showHintIdx, setShowHintIdx] = useState(-1); // Track which card shows hint (Ctrl+X)
  const [targetIdx, setTargetIdx] = useState<number>(() => pickRandomIndex(total, new Set()));
  const [score, setScore] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [language, setLanguage] = useState<'vi' | 'en'>('vi');
  
  // Track mistakes per word for current session: word -> count
  const [wordMistakes, setWordMistakes] = useState<Map<string, number>>(new Map());
  
  // Completion modal state
  const [showCompletionModal, setShowCompletionModal] = useState(false);

  // Track previous file name to detect file changes
  const prevFileNameRef = useRef<string | null>(null);

  // Load saved session when items are ready
  useEffect(() => {
    if (isLoading || items.length === 0 || !currentFileName || !sessionRestored) return;
    
    // Check if file has changed
    const fileChanged = prevFileNameRef.current !== null && prevFileNameRef.current !== currentFileName;
    prevFileNameRef.current = currentFileName;
    
    // If file changed, clear session immediately
    if (fileChanged) {
      clearTrainingSession();
      // Reset state for new file
      setFlipped({});
      setWrongIdx(null);
      setWrongTick(0);
      setScore(0);
      setMistakes(0);
      setWordMistakes(new Map());
      setShowCompletionModal(false);
      setTargetIdx(pickRandomIndex(items.length, new Set()));
      setLanguage('vi');
      return;
    }
    
    // File hasn't changed - try to restore session
    const session = loadTrainingSession();
    if (isSessionForFile(session, currentFileName)) {
      // Validate session data matches current items
      if (session && session.targetIdx >= 0 && session.targetIdx < items.length) {
        // Restore session state
        setFlipped(session.flipped || {});
        setScore(session.score || 0);
        setMistakes(session.mistakes || 0);
        setTargetIdx(session.targetIdx >= 0 ? session.targetIdx : pickRandomIndex(items.length, new Set()));
        setLanguage(session.language || 'vi');
        return; // Session restored
      }
    }
    
    // No valid session - start fresh
    setFlipped({});
    setWrongIdx(null);
    setWrongTick(0);
    setScore(0);
    setMistakes(0);
    setTargetIdx(pickRandomIndex(items.length, new Set()));
    setLanguage('vi');
  }, [currentFileName, isLoading, items.length, sessionRestored]);

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

  // Use enhanced speech utility for better pronunciation
  // Direct use of speakEnglish utility - no wrapper needed

  const handleLanguageToggle = () => {
    setLanguage((prev) => (prev === 'vi' ? 'en' : 'vi'));
      // Note: Session will be auto-saved via useEffect
  };

  // Handle show hint (Ctrl+X) - show meaning on correct answer card for 3 seconds
  const handleShowHint = useCallback(() => {
    if (isLoading || items.length === 0) return;
    if (targetIdx < 0 || targetIdx >= items.length) return;
    if (flipped[targetIdx]) return; // Don't show hint on already flipped card
    
    setShowHintIdx(targetIdx);
    setTimeout(() => {
      setShowHintIdx(-1);
    }, 3000);
  }, [isLoading, items.length, targetIdx, flipped]);

  // Save session to localStorage whenever relevant state changes
  useEffect(() => {
    if (!currentFileName || isLoading || items.length === 0) return;
    
    const session: TrainingSession = {
      fileName: currentFileName,
      score,
      mistakes,
      flipped,
      targetIdx,
      language,
      timestamp: Date.now(),
    };
    saveTrainingSession(session);
  }, [currentFileName, score, mistakes, flipped, targetIdx, language, isLoading, items.length]);

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
        setFlipped((f) => ({ ...f, [idx]: true }));
        setScore((v) => v + 1);
        speakEnglish(items[targetIdx].en, { lang: 'en-US' }); // Always speak the English word of the target
        const exclude = new Set<number>();
        Object.keys(flipped).forEach((k) => {
          if (flipped[+k]) exclude.add(+k);
        });
        exclude.add(idx);
        setTargetIdx(pickRandomIndex(items.length, exclude));
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
    [items, targetIdx, flipped, language, isLoading, playErrorTone]
  );

  // Check if all cards are flipped (100% completion)
  const allFlipped = useMemo(() => {
    if (items.length === 0) return false;
    return Object.keys(flipped).length === items.length && 
           Object.values(flipped).every(v => v === true);
  }, [flipped, items.length]);
  
  // Show completion modal when 100% completed
  useEffect(() => {
    if (allFlipped && !isLoading && items.length > 0) {
      setShowCompletionModal(true);
    }
  }, [allFlipped, isLoading, items.length]);

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
    wordMistakes.forEach((count, word) => {
      const item = items.find(it => it.en === word);
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
    // Sort by mistake count (descending)
    return mistakesList.sort((a, b) => b.count - a.count);
  }, [wordMistakes, items]);
  
  const handleRestart = useCallback(() => {
    setFlipped({});
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
    if (currentFileName) {
      clearTrainingSession();
    }
  }, [items.length, currentFileName]);
  
  // Save mistakes to localStorage and handle actions
  const saveMistakesAndAction = useCallback((action: 'exit' | 'restart' | 'next') => {
    // Always save mistakes if there are any (even if no fileName, we still track them)
    if (sessionMistakes.length > 0 && currentFileName) {
      // Save mistakes to localStorage
      recordMistakes(sessionMistakes, currentFileName, 'flashcards-reading');
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
        const nextUrl = getTrainingModeUrl(nextMode, currentFileName || undefined);
        navigate(nextUrl);
      }
      setShowCompletionModal(false);
    }
  }, [currentFileName, sessionMistakes, handleRestart, navigate]);
  
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
          {language === 'vi' ? 'VI ➜ EN' : 'EN ➜ VI'}
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
            label={`Mistakes: ${mistakes}`}
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
            Restart
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
            <Skeleton key={idx} variant="rounded" height={isMobile ? 180 : isTablet ? 200 : 220} sx={{ borderRadius: 2 }} />
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
          {items.map((it, idx) => (
            <Box 
              key={`${it.en}-${idx}`}
              sx={{
                // Disable interaction when loading or items not ready
                pointerEvents: isLoading || items.length === 0 ? 'none' : 'auto',
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
                showMeaning={showMeaningIdx === idx || showHintIdx === idx}
              />
            </Box>
          ))}
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
        currentFileName={currentFileName}
      />
    </Box>
  );
};

export default TrainStart;
