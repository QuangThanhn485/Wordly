// styles.ts bên trong WordCard.tsx hoặc ngay trên component
const cardBackRotate = {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backfaceVisibility: 'hidden',
    transform: 'rotateY(180deg)',
    bgcolor: 'secondary.light',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    p: 2,
};
const cardBack = {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backfaceVisibility: 'hidden',
    bgcolor: 'primary.light',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    p: 2,
};

const box = {
    width: 300,
    height: 180,
    perspective: 1000,
    mx: 'auto',
    my: 2,
    cursor: 'pointer',
}
const boxRotate = (flipped:Boolean) => {
    return {
        position: 'relative',
        width: '100%',
        height: '100%',
        transformStyle: 'preserve-3d',
        transition: 'transform 0.6s',
        transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
    };
}

export {
    cardBackRotate,
    cardBack,
    box,
    boxRotate
};
