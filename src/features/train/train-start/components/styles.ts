// styles.ts
import { keyframes } from '@mui/system';
import { Theme } from '@mui/material/styles';

const cardBase = (theme: Theme) => ({
  position: 'absolute' as const,
  inset: 0,
  backfaceVisibility: 'hidden' as const,
  WebkitBackfaceVisibility: 'hidden' as const,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  p: { xs: 2, sm: 2.5, md: 3 },
  borderRadius: 2,
  boxShadow: 3,
  color: theme.palette.getContrastText(theme.palette.background.paper),
});

const cardFront = (theme: Theme) => ({
  ...cardBase(theme),
  bgcolor: theme.palette.primary.main,
  color: theme.palette.getContrastText(theme.palette.primary.main),
});

const cardBackRotate = (theme: Theme) => ({
  ...cardBase(theme),
  transform: 'rotateY(180deg)',
  bgcolor: theme.palette.success.light,
  color: theme.palette.getContrastText(theme.palette.success.light),
  textAlign: 'center' as const,
});

const boxRotate = (flipped: boolean) => ({
  position: 'relative' as const,
  width: '100%',
  height: '100%',
  transformStyle: 'preserve-3d' as const,
  transition: 'transform 0.6s ease-in-out',
  transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
  willChange: 'transform',
});

const cardContainer = {
  width: '100%',
  height: { xs: 180, sm: 200, md: 220 },
  perspective: 1000,
  cursor: 'pointer',
  mx: 'auto',
  my: { xs: 0.5, sm: 1 },
  userSelect: 'none' as const,
  touchAction: 'manipulation' as const,
};

const shakeKF = keyframes`
  10%, 90% { transform: translate3d(-1px, 0, 0); }
  20%, 80% { transform: translate3d(2px, 0, 0); }
  30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
  40%, 60% { transform: translate3d(4px, 0, 0); }
`;

const solvedBadgeSx = (theme: Theme) => ({
  borderRadius: 1,
  color: theme.palette.success.contrastText,
  bgcolor: theme.palette.success.main,
  '& .MuiChip-icon': { color: theme.palette.success.contrastText },
});

export { cardFront, cardBackRotate, boxRotate, cardContainer, shakeKF, solvedBadgeSx };
