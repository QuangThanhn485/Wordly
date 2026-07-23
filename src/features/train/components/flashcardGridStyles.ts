export const flashcardGridSx = {
  display: 'grid',
  gridTemplateColumns: {
    xs: 'repeat(2, minmax(0, 160px))',
    sm: 'repeat(3, minmax(0, 220px))',
    md: 'repeat(auto-fill, 288px)',
  },
  '@media (min-width: 360px) and (max-width: 599.95px)': {
    gridTemplateColumns: 'repeat(3, minmax(0, 176px))',
  },
  gap: { xs: 1, sm: 1.5, md: 2.5 },
  alignItems: 'stretch',
  justifyContent: 'flex-start',
} as const;

export const flashcardHeightSx = {
  xs: 156,
  sm: 184,
  md: 224,
} as const;

export const flashcardRemovalMaxHeightSx = {
  xs: 164,
  sm: 192,
  md: 240,
} as const;
