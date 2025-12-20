// styles.ts
import { keyframes } from '@mui/system';
import { Theme, alpha } from '@mui/material/styles';

const cardBase = (theme: Theme) => ({
  position: 'absolute' as const,
  inset: 0,
  backfaceVisibility: 'hidden' as const,
  WebkitBackfaceVisibility: 'hidden' as const,
  isolation: 'isolate',
  display: 'flex',
  alignItems: 'stretch',
  justifyContent: 'stretch',
  borderRadius: { xs: 3, sm: 3.5, md: 4 },
  overflow: 'hidden',
  boxShadow: 'none',
  border: '1px solid',
  borderColor:
    theme.palette.mode === 'dark'
      ? alpha(theme.palette.common.white, 0.16)
      : alpha(theme.palette.common.black, 0.14),
  backgroundColor: theme.palette.background.paper,
  backgroundClip: 'padding-box',
});

const cardFront = (theme: Theme) => {
  const isDark = theme.palette.mode === 'dark';
  const accent = theme.palette.primary.main;
  const innerRingInset = isDark ? 1 : 2;

  return {
    ...cardBase(theme),
    color: theme.palette.text.primary,
    backgroundColor: isDark ? theme.palette.background.paper : alpha(accent, 0.015),
    borderWidth: isDark ? 1 : 2,
    borderColor: alpha(accent, isDark ? 0.45 : 0.55),
    backgroundImage: 'none',
    '& .MuiCardContent-root': {
      position: 'relative',
      zIndex: 2,
    },
    '&::before': {
      content: '""',
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: 8,
      pointerEvents: 'none',
      backgroundColor: alpha(accent, isDark ? 0.26 : 0.18),
      opacity: isDark ? 0.95 : 0.7,
      zIndex: 1,
    },
    '&::after': {
      content: '""',
      position: 'absolute',
      inset: innerRingInset,
      borderRadius: 'inherit',
      pointerEvents: 'none',
      border: `1px solid ${isDark ? alpha(theme.palette.common.white, 0.08) : alpha(theme.palette.common.black, 0.08)}`,
      opacity: isDark ? 0.35 : 0.9,
      zIndex: 1,
    },
  };
};

const cardBackRotate = (theme: Theme) => {
  const isDark = theme.palette.mode === 'dark';
  const accent = theme.palette.success.main;

  return {
    ...cardBase(theme),
    transform: 'rotateY(180deg)',
    color: theme.palette.text.primary,
    textAlign: 'center' as const,
    borderWidth: 2,
    backgroundColor: isDark ? theme.palette.background.paper : alpha(accent, 0.015),
    borderColor: alpha(accent, isDark ? 0.72 : 0.55),
    backgroundImage: 'none',
    '& .MuiCardContent-root': {
      position: 'relative',
      zIndex: 2,
    },
    '&::before': {
      content: '""',
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: 8,
      pointerEvents: 'none',
      backgroundColor: alpha(accent, isDark ? 0.22 : 0.16),
      opacity: isDark ? 0.9 : 0.65,
    },
    '&::after': {
      content: '"✓"',
      position: 'absolute',
      inset: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      pointerEvents: 'none',
      fontWeight: 900,
      fontSize: { xs: 132, sm: 152, md: 176 },
      lineHeight: 1,
      letterSpacing: '-0.06em',
      color: alpha(accent, isDark ? 0.14 : 0.08),
      transform: 'rotate(-12deg) translateY(2px)',
      zIndex: 1,
    },
  };
};

const boxRotate = (flipped: boolean) => ({
  position: 'relative' as const,
  width: '100%',
  height: '100%',
  transformStyle: 'preserve-3d' as const,
  transition: 'transform 560ms cubic-bezier(0.2, 0.8, 0.2, 1)',
  transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
  willChange: 'transform',
});

const cardContainer = {
  width: '100%',
  height: { xs: 168, sm: 210, md: 236 },
  perspective: 1200,
  cursor: 'pointer',
  mx: 'auto',
  my: { xs: 0.25, sm: 1 }, // Reduced margin on mobile
  userSelect: 'none' as const,
  touchAction: 'manipulation' as const,
  WebkitTapHighlightColor: 'transparent',
};

const shakeKF = keyframes`
  10%, 90% { transform: translate3d(-1px, 0, 0); }
  20%, 80% { transform: translate3d(2px, 0, 0); }
  30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
  40%, 60% { transform: translate3d(4px, 0, 0); }
`;

const solvedBadgeSx = (theme: Theme) => ({
  borderRadius: 999,
  fontWeight: 700,
  border: '1px solid',
  borderColor: alpha(theme.palette.success.main, theme.palette.mode === 'dark' ? 0.5 : 0.35),
  bgcolor: alpha(theme.palette.success.main, theme.palette.mode === 'dark' ? 0.18 : 0.12),
  color: theme.palette.success.main,
  '& .MuiChip-icon': { color: theme.palette.success.main },
});

export { cardFront, cardBackRotate, boxRotate, cardContainer, shakeKF, solvedBadgeSx };
