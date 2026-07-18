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
  borderRadius: 1,
  overflow: 'hidden',
  boxShadow:
    theme.palette.mode === 'dark'
      ? '0 4px 14px rgba(0, 0, 0, 0.2)'
      : '0 4px 14px rgba(15, 23, 42, 0.06)',
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
  return {
    ...cardBase(theme),
    color: theme.palette.text.primary,
    backgroundColor: isDark ? theme.palette.background.paper : alpha(accent, 0.015),
    borderWidth: 1,
    borderColor: alpha(accent, isDark ? 0.42 : 0.32),
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
      height: 4,
      pointerEvents: 'none',
      backgroundColor: alpha(accent, isDark ? 0.26 : 0.18),
      opacity: isDark ? 0.9 : 0.75,
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
    borderWidth: 1,
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
      height: 4,
      pointerEvents: 'none',
      backgroundColor: alpha(accent, isDark ? 0.22 : 0.16),
      opacity: isDark ? 0.85 : 0.7,
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
  height: { xs: 168, sm: 204, md: 224 },
  perspective: 1200,
  cursor: 'pointer',
  mx: 'auto',
  my: 0,
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
  borderRadius: 1,
  fontWeight: 600,
  border: '1px solid',
  borderColor: alpha(theme.palette.success.main, theme.palette.mode === 'dark' ? 0.5 : 0.35),
  bgcolor: alpha(theme.palette.success.main, theme.palette.mode === 'dark' ? 0.18 : 0.12),
  color: theme.palette.success.main,
  '& .MuiChip-icon': { color: theme.palette.success.main },
});

export { cardFront, cardBackRotate, boxRotate, cardContainer, shakeKF, solvedBadgeSx };
