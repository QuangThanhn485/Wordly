// src/features/train/train-start/components/WordCard.tsx
import React, { useState } from 'react';
import { Box, Card, CardContent, Typography } from '@mui/material';
import {cardBackRotate, cardBack, boxRotate} from './styles'

interface WordCardProps {
  word: string;
  meaning?: string;
}

export const WordCard: React.FC<WordCardProps> = ({
  word,
  meaning = 'This is a sample meaning or sentence using the word.',
}) => {
  const [flipped, setFlipped] = useState(false);

  return (
    <Box
      onClick={() => setFlipped((prev) => !prev)}
      sx={{
        width: 300,
        height: 180,
        perspective: 1000,
        mx: 'auto',
        my: 2,
        cursor: 'pointer',
      }}
    >
      <Box
        sx={boxRotate(flipped)}
      >
        {/* Front */}
        <Card
          sx={cardBack}
        >
          <CardContent>
            <Typography variant="h4" align="center" fontWeight="bold">
              {word}
            </Typography>
            <Typography variant="body2" color="text.secondary" align="center" mt={2}>
              Click to flip
            </Typography>
          </CardContent>
        </Card>

        {/* Back */}
        <Card
          sx={cardBackRotate}
        >
          <CardContent>
            <Typography variant="subtitle1" align="center" fontWeight={600}>
              Meaning
            </Typography>
            <Typography variant="body1" align="center" mt={1}>
              {meaning}
            </Typography>
            <Typography variant="body2" color="text.secondary" align="center" mt={2}>
              Click to flip back
            </Typography>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
};
