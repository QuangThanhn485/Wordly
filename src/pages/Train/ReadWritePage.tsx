// ReadWritePage.tsx
import {
  Box,
  Typography,
  Container,
  ToggleButton,
  ToggleButtonGroup,
  Skeleton,
  Chip,
  Button,
  LinearProgress,
  useTheme,
  useMediaQuery,
  Alert,
} from '@mui/material';
import TranslateIcon from '@mui/icons-material/Translate';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTrainWords } from '@/features/train/train-read-write';
import { WordInputCard } from '@/features/train/train-read-write';
import {
  saveTrainingSession,
  loadTrainingSession,
  clearTrainingSession,
  isSessionForFile,
  type TrainingSession,
} from '@/features/train/train-read-write/sessionStorage';
import { recordMistakes } from '@/features/train/train-read-write/mistakesStorage';
import {
  CompletionModal,
  type SessionMistake,
} from '@/features/train/train-read-write/components/CompletionModal';
import { speakEnglish } from '@/utils/speechUtils';

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

const ReadWritePage = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [searchParams, setSearchParams] = useSearchParams();
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
      setSessionRestored(true);
      return;
    }
    
    // Priority 3: If no session for read-write, try to get file from flashcards-reading session
    // This allows seamless transition between training modes
    try {
      const readingSessionStr = localStorage.getItem('wordly_train_session');
      if (readingSessionStr) {
        const readingSession = JSON.parse(readingSessionStr);
        if (readingSession && readingSession.fileName) {
          setSearchParams({ file: readingSession.fileName }, { replace: true });
          setSessionRestored(true);
          return;
        }
      }
    } catch (err) {
      // Ignore errors when reading reading session
    }
    
    setSessionRestored(true);
  }, [currentFileName, sessionRestored, setSearchParams]);

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
    
    // File hasn't changed - try to restore session
    const session = loadTrainingSession();
    if (isSessionForFile(session, currentFileName)) {
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
  }, [currentFileName, isLoading, items.length, sessionRestored]);

  // Save session to localStorage
  useEffect(() => {
    if (!currentFileName || isLoading || items.length === 0) return;

    const session: TrainingSession = {
      fileName: currentFileName,
      currentWordIndex,
      completedWords,
      mode,
      score,
      mistakes,
      timestamp: Date.now(),
    };
    saveTrainingSession(session);
  }, [currentFileName, currentWordIndex, completedWords, mode, score, mistakes, isLoading, items.length]);

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
      if (sessionMistakes.length > 0 && currentFileName && !mistakesSaved) {
        recordMistakes(sessionMistakes, currentFileName, 'read-write');
        setMistakesSaved(true);
      }
      setShowCompletionModal(true);
      setCompletionModalShown(true);
    }
  }, [isCompleted, isLoading, items.length, showCompletionModal, sessionMistakes, currentFileName, mistakesSaved, completionModalShown]);

  const handleModeToggle = (_: React.MouseEvent<HTMLElement>, newMode: 'vi-en' | 'en-vi' | null) => {
    if (newMode) {
      setMode(newMode);
      setShowHint(false);
      setCurrentWordCompleted(false);
    }
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
        // Correct answer
        setCurrentWordCompleted(true);
        setScore((s) => s + 1);
        speakEnglish(currentWord.en, { lang: 'en-US' });

        // Mark as completed
        if (!completedWords.includes(currentWordIndex)) {
          setCompletedWords((prev) => [...prev, currentWordIndex]);
        }

        // Move to next word after a short delay
        setTimeout(() => {
          const exclude = new Set<number>(completedWords);
          exclude.add(currentWordIndex);
          const nextIndex = pickRandomIndex(items.length, exclude);
          setCurrentWordIndex(nextIndex);
          setCurrentWordCompleted(false);
          setShowHint(false);
          setHasError(false);
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
    if (currentFileName) {
      clearTrainingSession();
    }
  }, [items.length, currentFileName]);

  const saveMistakesAndAction = useCallback(
    (action: 'exit' | 'restart' | 'next') => {
      // Save mistakes if not already saved (backup in case completion effect didn't run)
      if (sessionMistakes.length > 0 && currentFileName && !mistakesSaved) {
        recordMistakes(sessionMistakes, currentFileName, 'read-write');
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
    [currentFileName, sessionMistakes, handleRestart, mistakesSaved]
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
  const question = currentWord ? (mode === 'vi-en' ? currentWord.vi : currentWord.en) : '';
  const answer = currentWord ? (mode === 'vi-en' ? currentWord.en : currentWord.vi) : '';

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
              Tiến trình: {completedWords.length} / {total} ({Math.round(progress)}%)
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
              Còn lại: {remaining}
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
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <TranslateIcon fontSize="small" color="primary" />
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
              Chế độ:
            </Typography>
            <ToggleButtonGroup
              value={mode}
              exclusive
              size={isMobile ? 'small' : 'medium'}
              onChange={handleModeToggle}
              color="primary"
              sx={{ flex: { xs: 1, sm: 'initial' } }}
            >
              <ToggleButton value="vi-en">VI ➜ EN</ToggleButton>
              <ToggleButton value="en-vi">EN ➜ VI</ToggleButton>
            </ToggleButtonGroup>
          </Box>

          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
            <Chip
              icon={<ErrorOutlineIcon fontSize="small" color="error" />}
              label={`Mistakes: ${mistakes}`}
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
              startIcon={<RestartAltIcon />}
              onClick={handleRestart}
              sx={{
                fontSize: { xs: '0.75rem', sm: '0.875rem' },
                whiteSpace: 'nowrap',
              }}
            >
              Bắt đầu lại
            </Button>
          </Box>
        </Box>
      </Box>

      {/* Main Content */}
      <Box
        sx={{
          width: '100%',
          maxWidth: { xs: '100%', sm: '1200px' },
          mx: 'auto',
          px: { xs: 2, sm: 3, md: 4 },
          py: { xs: 2, sm: 3, md: 4 },
          flex: 1,
          boxSizing: 'border-box',
        }}
      >
        {isLoading ? (
          <Box sx={{ maxWidth: 700, mx: 'auto' }}>
            <Skeleton variant="rounded" height={400} sx={{ borderRadius: 2 }} />
          </Box>
        ) : items.length === 0 ? (
          <Alert severity="warning" sx={{ maxWidth: 600, mx: 'auto' }}>
            Không có từ vựng nào. Vui lòng chọn file từ vựng trước.
          </Alert>
        ) : currentWord ? (
          <WordInputCard
            question={question}
            answer={answer}
            mode={mode}
            onAnswer={handleAnswer}
            onHint={handleHint}
            showHint={showHint}
            isCompleted={currentWordCompleted}
            shouldShake={shouldShake}
            shakeKey={shakeKey}
            hasError={hasError}
          />
        ) : null}
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

export default ReadWritePage;

