import {
  Box,
  Typography,
  Container,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import TranslateIcon from '@mui/icons-material/Translate';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { useState } from 'react';
import { useTrainWords } from 'features/train/train-start';
import { WordCard } from 'features/train/train-start';

const TrainStart = () => {
  const { words, isLoading } = useTrainWords();

  const [language, setLanguage] = useState<'vi' | 'en'>('vi');
  const [randomWord, setRandomWord] = useState('quả táo'); // TODO: Replace with real logic
  const [current, setCurrent] = useState(1);
  const [mistakes, setMistakes] = useState(1); // Future usage

  const handleLanguageToggle = (
    _: React.MouseEvent<HTMLElement>,
    newLang: 'vi' | 'en' | null
  ) => {
    if (newLang) setLanguage(newLang);
  };

  const renderTopPanel = () => (
    <Box
      sx={{
        position: 'sticky',
        top: { xs: '64px', sm: '72px' },
        zIndex: 10,
        backgroundColor: 'background.paper',
        borderRadius: 1,
        boxShadow: 1,
        px: 2,
        py: 1.5,
        mb: 2,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: { xs: 'flex-start', sm: 'center' },
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 2,
        }}
      >
        {/* Từ vựng hiện tại */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TranslateIcon fontSize="small" color="primary" />
          <Typography
            variant="h6"
            fontWeight="bold"
            color="primary"
            sx={{ textTransform: 'capitalize', letterSpacing: 0.5 }}
          >
            {randomWord}
          </Typography>
        </Box>

        {/* Vị trí câu hỏi */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <LocationOnIcon fontSize="small" color="action" />
          <Typography variant="body1" fontWeight="medium">
            {current} / {words.length}
          </Typography>
        </Box>

        {/* Số lỗi */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ErrorOutlineIcon fontSize="small" color="error" />
          <Typography variant="body1" fontWeight="medium" color="error">
            Mistakes: {mistakes}
          </Typography>
        </Box>

        {/* Chọn ngôn ngữ */}
        <ToggleButtonGroup
          value={language}
          exclusive
          size="small"
          onChange={handleLanguageToggle}
          color="primary"
          sx={{ alignSelf: { xs: 'flex-start', sm: 'center' } }}
        >
          <ToggleButton value="vi">VI ➜ EN</ToggleButton>
          <ToggleButton value="en">EN ➜ VI</ToggleButton>
        </ToggleButtonGroup>
      </Box>
    </Box>
  );

  const renderWordCards = () => (
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
          meaning="A sweet fruit that grows on trees." // TODO: Make dynamic if possible
        />
      ))}
    </Box>
  );

  return (
    <Container maxWidth={false} sx={{ px: 4, py: 2 }}>
      {renderTopPanel()}
      {isLoading ? (
        <Typography>Loading...</Typography>
      ) : (
        renderWordCards()
      )}
    </Container>
  );
};

export default TrainStart;
