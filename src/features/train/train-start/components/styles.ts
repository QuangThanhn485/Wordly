// styles.ts

const cardBase = {
  position: 'absolute',
  width: '100%',
  height: '100%',
  backfaceVisibility: 'hidden' as const,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  p: 2,
  borderRadius: 2,
  boxShadow: 3,
};

const cardFront = {
  ...cardBase,
  bgcolor: 'primary.light',
};

const cardBackRotate = {
  position: 'absolute',
  width: '100%',
  height: '100%',
  backfaceVisibility: 'hidden' as const,
  transform: 'rotateY(180deg)',
  bgcolor: '#f8d7da',
  color: '#212529',
  borderRadius: 2,
  boxShadow: 3,
  p: { xs: 2, sm: 3 },
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center',
  textAlign: 'center',
};


const boxRotate = (flipped: boolean) => ({
  position: 'relative',
  width: '100%',
  height: '100%',
  transformStyle: 'preserve-3d',
  transition: 'transform 0.6s',
  transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
});

const cardContainer = {
  flex: {
    xs: '1 1 calc(50% - 16px)',
    sm: '1 1 calc(33.333% - 16px)',
    md: '1 1 calc(25% - 16px)',
  },
  maxWidth: 300,
  minWidth: 150,
  height: 180,
  perspective: 1000,
  cursor: 'pointer',
  mx: 'auto',
  my: 2,
};

export {
  cardFront,
  cardBackRotate,
  boxRotate,
  cardContainer,
};
