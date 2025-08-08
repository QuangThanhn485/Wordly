import React, { useState } from 'react';
import { Box, Card, CardContent, Typography } from '@mui/material';
import {
  cardFront,
  cardBackRotate,
  boxRotate,
  cardContainer,
} from './styles';

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
    <Box onClick={() => setFlipped((prev) => !prev)} sx={cardContainer}>
      <Box sx={boxRotate(flipped)}>
        {/* Front */}
        <Card sx={cardFront}>
          <CardContent>
            <Typography
              variant="h5"
              align="center"
              fontWeight="bold"
              sx={{ fontSize: { xs: '1.2rem', sm: '1.5rem' } }}
            >
              {word}
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              align="center"
              mt={2}
            >
              Tap to flip
            </Typography>
          </CardContent>
        </Card>

        {/* Back */}
        <Card sx={cardBackRotate}>
          <Box>
            <Typography
              variant="subtitle1"
              fontWeight={600}
              sx={{ fontSize: { xs: '0.95rem', sm: '1.1rem' }, mb: 1 }}
            >
              Meaning
            </Typography>
            <Typography
              variant="body1"
              sx={{ fontSize: { xs: '0.85rem', sm: '1rem' } }}
            >
              {meaning}
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mt: 2 }}
            >
              Tap to flip back
            </Typography>
          </Box>
        </Card>

      </Box>
    </Box>
  );
};
