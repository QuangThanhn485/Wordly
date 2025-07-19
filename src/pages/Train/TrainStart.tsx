import {
  Box,
  Typography,
  Container,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import ShuffleIcon from '@mui/icons-material/Shuffle';
import { useState } from 'react';
import { useTrainWords } from 'features/train/train-start';
import { WordCard } from 'features/train/train-start';

const TrainStart = () => {
  const { words, isLoading } = useTrainWords();

  // Fake random word
  const [language, setLanguage] = useState<'vi' | 'en'>('vi');
  const [randomWord, setRandomWord] = useState('quả táo');
  const [current, setCurrent] = useState(1);

  const handleLanguageToggle = (
    _: React.MouseEvent<HTMLElement>,
    newLang: 'vi' | 'en' | null
  ) => {
    if (newLang) setLanguage(newLang);
  };

  return (
    <Container maxWidth={false} sx={{ px: 4, py: 2 }}>
      {/* Sticky Top Panel */}
      <Box
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          backgroundColor: 'background.paper',
          borderRadius: 1,
          boxShadow: 1,
          px: 2,
          py: 1.5,
          mb: 2,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        {/* Left: Random Vietnamese word */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ShuffleIcon fontSize="small" color="primary" />
            <Typography
                variant="h6"
                fontWeight="bold"
                color="primary"
                sx={{ textTransform: 'capitalize', letterSpacing: 0.5 }}
            >
                {randomWord}
            </Typography>
        </Box>

        {/* Center: Progress */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" color="text.secondary">
            📍
            </Typography>
            <Typography variant="body1" fontWeight="medium">
            {current} / {words.length}
            </Typography>
        </Box>

        {/* Mistake count */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" color="error">
            ❌
            </Typography>
            <Typography variant="body1" fontWeight="medium" color="error">
            Mistakes: 1
            </Typography>
        </Box>

        {/* Right: Language toggle */}
        <ToggleButtonGroup
          value={language}
          exclusive
          size="small"
          onChange={handleLanguageToggle}
          color="primary"
        >
          <ToggleButton value="vi">VI ➜ EN</ToggleButton>
          <ToggleButton value="en">EN ➜ VI</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {isLoading ? (
        <Typography>Loading...</Typography>
      ) : (
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 2,
            justifyContent: 'flex-start',
            alignItems: 'stretch',
          }}
        >
          {words.map((word, idx) => (
            <WordCard
              key={idx}
              word={word}
              meaning="A sweet fruit that grows on trees."
            />
          ))}
        </Box>
      )}
    </Container>
  );
};

export default TrainStart;
