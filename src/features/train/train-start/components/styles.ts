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

const cardFront = (theme: Theme) => {
  const isDark = theme.palette.mode === 'dark';
  
  // Dark mode: use paper background with primary border (not bright primary fill)
  // Light mode: use primary main color
  const bgColor = isDark 
    ? theme.palette.background.paper 
    : theme.palette.primary.main;
  
  return {
    ...cardBase(theme),
    bgcolor: bgColor,
    // Dark mode: use primary light for text (bright on dark), Light mode: use contrast text
    color: isDark
      ? theme.palette.primary.light || theme.palette.primary.main
      : theme.palette.getContrastText(theme.palette.primary.main),
    // Add border with primary color in dark mode for better visibility
    border: isDark 
      ? `2px solid ${theme.palette.primary.dark || theme.palette.primary.main}` 
      : 'none',
    // Dark mode: subtle elevation, Light mode: stronger shadow
    boxShadow: isDark ? 2 : 4,
  };
};

const cardBackRotate = (theme: Theme) => {
  const isDark = theme.palette.mode === 'dark';
  
  // Dark mode: use background.default (slightly lighter than paper) to distinguish from front card
  // This creates a subtle visual difference while maintaining dark theme aesthetics
  // Light mode: use success light color
  const bgColor = isDark
    ? theme.palette.background.default // Slightly elevated/lighter than paper
    : theme.palette.success.light;
  
  return {
    ...cardBase(theme),
    transform: 'rotateY(180deg)',
    bgcolor: bgColor,
    // Dark mode: use success light color for text (bright on dark), Light mode: use contrast text
    color: isDark
      ? theme.palette.success.light || theme.palette.success.main
      : theme.palette.getContrastText(theme.palette.success.light),
    textAlign: 'center' as const,
    // Dark mode: thicker, brighter border with success.light (vs primary.dark on front) to distinguish clearly
    border: isDark 
      ? `3px solid ${theme.palette.success.light || theme.palette.success.main}` 
      : 'none',
    // Dark mode: stronger shadow with success glow to make it stand out more from front card
    boxShadow: isDark 
      ? `0 6px 16px rgba(0, 0, 0, 0.4), 0 0 8px ${theme.palette.success.main}30` 
      : 4,
  };
};

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
  height: { xs: 160, sm: 200, md: 220 }, // Reduced height on mobile
  perspective: 1000,
  cursor: 'pointer',
  mx: 'auto',
  my: { xs: 0.25, sm: 1 }, // Reduced margin on mobile
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
