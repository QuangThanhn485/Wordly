// TrainStart.tsx
import {
  Box,
  Typography,
  Container,
  ToggleButton,
  ToggleButtonGroup,
  Skeleton,
  Chip,
  Button,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import TranslateIcon from '@mui/icons-material/Translate';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTrainWords } from 'features/train/train-start';
import { WordCard } from 'features/train/train-start';

const normalize = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();

const viDict: Record<string, string> = {
  apple: 'quả táo',
  orange: 'quả cam',
  banana: 'quả chuối',
  cat: 'con mèo',
  dog: 'con chó',
  book: 'cuốn sách',
};
const viOf = (en: string) => viDict[normalize(en)] || en;

type WordItem = { en: string; vi: string; meaning?: string };

function adaptWords(input: any[]): WordItem[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((w) => (typeof w === 'string' ? { en: w } : null))
    .filter(Boolean)
    .map(({ en }: any) => ({ en, vi: viOf(en), meaning: undefined }));
}

function pickRandomIndex(arrLength: number, exclude: Set<number>): number {
  const candidates: number[] = [];
  for (let i = 0; i < arrLength; i++) if (!exclude.has(i)) candidates.push(i);
  if (candidates.length === 0) return -1;
  const r = Math.floor(Math.random() * candidates.length);
  return candidates[r];
}

const TrainStart = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));

  const { words: rawWords, isLoading } = useTrainWords();
  const items = useMemo(() => adaptWords(rawWords ?? []), [rawWords]);
  const total = items.length;

  const [flipped, setFlipped] = useState<Record<number, boolean>>({});
  const [wrongIdx, setWrongIdx] = useState<number | null>(null);
  const [wrongTick, setWrongTick] = useState(0);
  const [targetIdx, setTargetIdx] = useState<number>(() => pickRandomIndex(total, new Set()));
  const [score, setScore] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [language, setLanguage] = useState<'vi' | 'en'>('vi');

  useEffect(() => {
    setFlipped({});
    setWrongIdx(null);
    setWrongTick(0);
    setScore(0);
    setMistakes(0);
    setTargetIdx(pickRandomIndex(items.length, new Set()));
  }, [items.length]);

  const handleLanguageToggle = (_: React.MouseEvent<HTMLElement>, newLang: 'vi' | 'en' | null) => {
    if (newLang) setLanguage(newLang);
  };

  const handleAttempt = useCallback(
    (idx: number) => {
      if (targetIdx < 0 || idx < 0 || idx >= items.length) return;
      if (flipped[idx]) return;
      const isCorrect = normalize(items[idx].en) === normalize(items[targetIdx].en);
      if (isCorrect) {
        setFlipped((f) => ({ ...f, [idx]: true }));
        setScore((v) => v + 1);
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
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          try {
            (navigator as any).vibrate?.(60);
          } catch {}
        }
      }
    },
    [items, targetIdx, flipped]
  );

  const handleRestart = () => {
    setFlipped({});
    setWrongIdx(null);
    setWrongTick(0);
    setScore(0);
    setMistakes(0);
    setTargetIdx(pickRandomIndex(items.length, new Set()));
  };

  const target = items[targetIdx] || null;
  const viLabel = target?.vi || '—';

  return (
    <Container
      maxWidth="xl"
      sx={{
        px: { xs: 2, sm: 3, md: 4 },
        py: { xs: 2, sm: 3 },
        position: 'relative',
      }}
    >
      <Box
        sx={{
        position: 'sticky',
        top: { xs: 56, sm: 56, md: 0, lg: 0, xl: 0 },
        zIndex: (t) => t.zIndex.appBar + 1,
        bgcolor: 'background.paper',
        borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
        px: { xs: 1.5, sm: 3 },
        py: { xs: 1, sm: 1.5 },
        mb: 2,
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        alignItems: { xs: 'flex-start', sm: 'center' },
        justifyContent: 'space-between',
        gap: 2,
      }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TranslateIcon fontSize="small" color="primary" />
          <Typography
            variant="h6"
            fontWeight="bold"
            color="primary"
            sx={{
              fontSize: { xs: '0.95rem', sm: '1.2rem' }, // mobile nhỏ hơn
              lineHeight: 1.3,
              wordBreak: 'break-word', // xuống dòng nếu dài
              whiteSpace: 'normal',
            }}
          >
            {viLabel}
          </Typography>
        </Box>

        <ToggleButtonGroup
          value={language}
          exclusive
          size={isMobile ? 'small' : 'medium'}
          onChange={handleLanguageToggle}
          color="primary"
          sx={{
            width: { xs: '100%', sm: 'auto' },
            justifyContent: { xs: 'center', sm: 'flex-start' },
            '& .MuiToggleButton-root': { px: { xs: 1, sm: 2 }, flex: { xs: 1, sm: 'initial' } },
          }}
        >
          <ToggleButton value="vi">VI ➜ EN</ToggleButton>
          <ToggleButton value="en">EN ➜ VI</ToggleButton>
        </ToggleButtonGroup>

        <Box
          sx={{
            display: 'flex',
            gap: 1.5,
            width: { xs: '100%', sm: 'auto' },
            justifyContent: { xs: 'space-between', sm: 'flex-start' },
            alignItems: 'center',
          }}
        >
          <Chip
            icon={<LocationOnIcon fontSize="small" />}
            label={`${score} / ${total}`}
            variant="outlined"
            size={isMobile ? 'small' : 'medium'}
            sx={{ borderRadius: 1, borderColor: theme.palette.divider, bgcolor: 'background.default' }}
          />
          <Chip
            icon={<ErrorOutlineIcon fontSize="small" color="error" />}
            label={`Mistakes: ${mistakes}`}
            variant="outlined"
            size={isMobile ? 'small' : 'medium'}
            sx={{ borderRadius: 1, borderColor: theme.palette.error.light, color: 'error.main', bgcolor: 'error.light' + '20' }}
          />
          <Button
            variant="outlined"
            color="primary"
            size={isMobile ? 'small' : 'medium'}
            onClick={handleRestart}
            sx={{ minWidth: { xs: 64, sm: 80 } }}
          >
            Restart
          </Button>
        </Box>
      </Box>

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
            gap: { xs: 2, sm: 2.5, md: 3 },
            gridTemplateColumns: {
              xs: 'repeat(1, minmax(0, 1fr))',
              sm: 'repeat(2, minmax(0, 1fr))',
              md: 'repeat(3, minmax(0, 1fr))',
              lg: 'repeat(4, minmax(0, 1fr))',
            },
            alignItems: 'stretch',
            pb: { xs: 12, sm: 14 },
          }}
        >
          {items.map((it, idx) => (
            <Box key={`${it.en}-${idx}`}>
              <WordCard
                en={it.en}
                vi={it.vi}
                meaning={it.meaning}
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
    </Container>
  );
};

export default TrainStart;
