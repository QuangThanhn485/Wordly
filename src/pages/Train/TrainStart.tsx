import {
  Box,
  Typography,
  Container,
  ToggleButton,
  ToggleButtonGroup,
  Skeleton,
  Chip,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import TranslateIcon from '@mui/icons-material/Translate';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { useState } from 'react';
import { useTrainWords } from 'features/train/train-start';
import { WordCard } from 'features/train/train-start';

const TrainStart = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { words, isLoading } = useTrainWords();

  const [language, setLanguage] = useState<'vi' | 'en'>('vi');
  const [randomWord, setRandomWord] = useState('quả táo');
  const [current, setCurrent] = useState(1);
  const [mistakes, setMistakes] = useState(1);

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
        top: { xs: '56px', sm: '64px' },
        zIndex: 10,
        backgroundColor: 'background.paper',
        borderRadius: 2,
        boxShadow: theme.shadows[1],
        px: { xs: 1.5, sm: 3 },
        py: { xs: 1, sm: 1.5 },
        mb: 3,
        border: `1px solid ${theme.palette.divider}`,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: { xs: 'flex-start', sm: 'center' },
          justifyContent: 'space-between',
          gap: 2,
        }}
      >
        {/* Current word */}
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 1,
          minWidth: { xs: '100%', sm: 'auto' },
          order: { xs: 1, sm: 1 },
        }}>
          <TranslateIcon fontSize="small" color="primary" />
          <Typography
            variant="h6"
            fontWeight="bold"
            color="primary"
            sx={{ 
              textTransform: 'capitalize',
              fontSize: { xs: '1.1rem', sm: '1.25rem' },
            }}
          >
            {randomWord}
          </Typography>
        </Box>

        {/* Language toggle */}
        <ToggleButtonGroup
          value={language}
          exclusive
          size={isMobile ? 'small' : 'medium'}
          onChange={handleLanguageToggle}
          color="primary"
          sx={{ 
            order: { xs: 4, sm: 2 },
            width: { xs: '100%', sm: 'auto' },
            justifyContent: { xs: 'center', sm: 'flex-start' },
          }}
        >
          <ToggleButton value="vi" sx={{ px: { xs: 1, sm: 2 } }}>
            VI ➜ EN
          </ToggleButton>
          <ToggleButton value="en" sx={{ px: { xs: 1, sm: 2 } }}>
            EN ➜ VI
          </ToggleButton>
        </ToggleButtonGroup>

        {/* Progress and mistakes - grouped together */}
        <Box sx={{ 
          display: 'flex', 
          gap: 2,
          order: { xs: 2, sm: 3 },
          width: { xs: '100%', sm: 'auto' },
          justifyContent: { xs: 'space-between', sm: 'flex-start' },
        }}>
          {/* Question position */}
          <Chip
            icon={<LocationOnIcon fontSize="small" />}
            label={`${current} / ${words.length}`}
            variant="outlined"
            size={isMobile ? 'small' : 'medium'}
            sx={{
              borderRadius: 1,
              borderColor: theme.palette.divider,
              bgcolor: theme.palette.background.default,
            }}
          />

          {/* Mistakes count */}
          <Chip
            icon={<ErrorOutlineIcon fontSize="small" color="error" />}
            label={`Mistakes: ${mistakes}`}
            variant="outlined"
            size={isMobile ? 'small' : 'medium'}
            sx={{
              borderRadius: 1,
              borderColor: theme.palette.error.light,
              color: theme.palette.error.main,
              bgcolor: theme.palette.error.light + '20',
            }}
          />
        </Box>
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
          meaning="A sweet fruit that grows on trees."
        />
      ))}
    </Box>
  );

  const renderLoadingSkeleton = () => (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: 'repeat(1, 1fr)',
          sm: 'repeat(2, 1fr)',
          md: 'repeat(3, 1fr)',
          lg: 'repeat(4, 1fr)',
        },
        gap: 3,
      }}
    >
      {[...Array(8)].map((_, idx) => (
        <Skeleton
          key={idx}
          variant="rounded"
          height={180}
          sx={{ borderRadius: 2 }}
        />
      ))}
    </Box>
  );

  return (
    <Container 
      maxWidth="xl" 
      sx={{ 
        px: { xs: 2, sm: 3, md: 4 },
        py: { xs: 2, sm: 3 },
        position: 'relative',
      }}
    >
      {renderTopPanel()}
      
      {isLoading ? renderLoadingSkeleton() : renderWordCards()}
    </Container>
  );
};

export default TrainStart;