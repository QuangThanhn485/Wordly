import React, { useEffect, useState } from 'react';
import {
  Box,
  Container,
  Card,
  CardContent,
  Typography,
  Button,
  useTheme,
  useMediaQuery,
  alpha,
  Stack,
} from '@mui/material';
import {
  BookOpen,
  Headphones,
  Edit,
  Mic,
  BarChart3,
  Library,
  TrendingUp,
  Flame,
  Target,
  Zap,
  FolderOpen,
  Volume2,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { loadVocabularyTopicCounts, loadTreeFromStorage } from '@/features/vocabulary/utils/storageUtils';
import { getAllTopicIds } from '@/features/vocabulary/utils/treeUtils';
import { loadMistakesStats } from '@/features/train/train-read-write/mistakesStorage';
import { TodayTasksCard } from '@/features/tasks/components/TodayTasksCard';
import { MOBILE_PAGE_VIEWPORT_HEIGHT } from '@/layouts/mobileLayoutConstants';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  subtitle?: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color, subtitle }) => {
  const theme = useTheme();

  return (
    <Card
      elevation={0}
      sx={{
        height: '100%',
        bgcolor: alpha(color, theme.palette.mode === 'dark' ? 0.08 : 0.045),
        border: `1px solid ${alpha(color, 0.2)}`,
        borderRadius: 1,
        transition: 'border-color 160ms ease, box-shadow 160ms ease',
        '&:hover': {
          borderColor: alpha(color, 0.45),
          boxShadow: `0 6px 16px ${alpha(color, 0.12)}`,
        },
      }}
    >
      <CardContent sx={{ p: { xs: 1.25, sm: 2 }, '&:last-child': { pb: { xs: 1.25, sm: 2 } } }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 0.75 }}>
          <Box sx={{ minWidth: 0 }}>
            <Typography noWrap color="text.secondary" sx={{ fontSize: { xs: '0.6875rem', sm: '0.875rem' }, lineHeight: 1.25 }}>
              {title}
            </Typography>
            <Typography fontWeight={700} color={color} sx={{ mt: 0.5, mb: { sm: 0.5 }, fontSize: { xs: '1.5rem', sm: '2.75rem' }, lineHeight: 1.1 }}>
              {value}
            </Typography>
            {subtitle && (
              <Typography variant="caption" color="text.secondary" sx={{ display: { xs: 'none', sm: 'block' } }}>
                {subtitle}
              </Typography>
            )}
          </Box>
          <Box
            sx={{
              width: { xs: 34, sm: 48 },
              height: { xs: 34, sm: 48 },
              display: 'grid',
              placeItems: 'center',
              flexShrink: 0,
              borderRadius: 1,
              bgcolor: alpha(color, 0.15),
              color: color,
              '& svg': { width: { xs: 19, sm: 28 }, height: { xs: 19, sm: 28 } },
            }}
          >
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

interface TrainingModeCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  route: string;
  onClick: () => void;
}

const TrainingModeCard: React.FC<TrainingModeCardProps> = ({
  title,
  description,
  icon,
  color,
  onClick,
}) => {
  return (
    <Card
      elevation={0}
      sx={{
        height: '100%',
        cursor: 'pointer',
        borderRadius: 1,
        transition: 'border-color 160ms ease, box-shadow 160ms ease',
        border: `1px solid ${alpha(color, 0.2)}`,
        '&:hover': {
          boxShadow: 2,
          borderColor: color,
        },
      }}
      onClick={onClick}
    >
      <CardContent sx={{ p: { xs: 1.25, sm: 2 }, '&:last-child': { pb: { xs: 1.25, sm: 2 } } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 2 }, mb: { xs: 0, sm: 2 } }}>
          <Box
            sx={{
              width: { xs: 36, sm: 52 },
              height: { xs: 36, sm: 52 },
              flexShrink: 0,
              display: 'grid',
              placeItems: 'center',
              borderRadius: 1,
              bgcolor: alpha(color, 0.1),
              color: color,
              '& svg': { width: { xs: 20, sm: 28 }, height: { xs: 20, sm: 28 } },
            }}
          >
            {icon}
          </Box>
          <Typography sx={{ minWidth: 0, fontSize: { xs: '0.8125rem', sm: '1.25rem' }, lineHeight: 1.3, fontWeight: 700, overflowWrap: 'anywhere' }}>
            {title}
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ display: { xs: 'none', sm: 'block' } }}>
          {description}
        </Typography>
      </CardContent>
    </Card>
  );
};

const Home: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { t } = useTranslation('home');
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [stats, setStats] = useState({
    totalWords: 0,
    totalTopics: 0,
    totalMistakes: 0,
    uniqueWords: 0,
  });

  useEffect(() => {
    // Load statistics from the application database.
    const tree = loadTreeFromStorage();
    const mistakesStats = loadMistakesStats();
    const vocabCounts = loadVocabularyTopicCounts();

    if (!tree) {
      setStats({ totalWords: 0, totalTopics: 0, totalMistakes: 0, uniqueWords: 0 });
      return;
    }

    // Include topics in every nested folder.
    const allTopicIds = getAllTopicIds(tree);
    const totalTopics = allTopicIds.length;

    // Use cached counts without loading each topic payload.
    let totalWords = 0;
    allTopicIds.forEach((topicId) => {
      totalWords += vocabCounts[topicId] || 0;
    });

    // Count total mistakes and unique words from mistakes
    // mistakesStats format: { "topicId:wordId:mode": MistakeRecord }
    let totalMistakes = 0;
    const uniqueWordsSet = new Set<string>();
    
    Object.values(mistakesStats).forEach((record) => {
      totalMistakes += record.mistakeCount; // Sum all mistake counts
      uniqueWordsSet.add(record.wordId);
    });
    
    const uniqueWords = uniqueWordsSet.size;

    setStats({
      totalWords,
      totalTopics,
      totalMistakes,
      uniqueWords,
    });
  }, []);

  const trainingModes = [
    {
      title: t('trainingModes.flashcardsReading.title'),
      description: t('trainingModes.flashcardsReading.description'),
      icon: <BookOpen size={28} />,
      color: theme.palette.primary.main,
      route: '/vocabulary',
    },
    {
      title: t('trainingModes.flashcardsListening.title'),
      description: t('trainingModes.flashcardsListening.description'),
      icon: <Headphones size={28} />,
      color: theme.palette.info.main,
      route: '/vocabulary',
    },
    {
      title: t('trainingModes.readWrite.title'),
      description: t('trainingModes.readWrite.description'),
      icon: <Edit size={28} />,
      color: theme.palette.success.main,
      route: '/vocabulary',
    },
    {
      title: t('trainingModes.listenWrite.title'),
      description: t('trainingModes.listenWrite.description'),
      icon: <Mic size={28} />,
      color: theme.palette.warning.main,
      route: '/vocabulary',
    },
  ];

  return (
    <Box
      sx={{
        minHeight: {
          xs: MOBILE_PAGE_VIEWPORT_HEIGHT,
          md: '100vh',
        },
        width: '100%',
        bgcolor: 'background.default',
        pt: { xs: 2, sm: 4, md: 6 },
        pb: { xs: 2, md: 6 },
      }}
    >
      <Container maxWidth="lg">
        {/* Hero Section */}
        <Box sx={{ mb: { xs: 2.5, sm: 6 }, textAlign: { xs: 'left', sm: 'center' } }}>
          <Typography
            variant="h2"
            fontWeight={800}
            gutterBottom
            sx={{
              color: 'text.primary',
              fontSize: { xs: '1.75rem', sm: '3.75rem' },
              lineHeight: 1.1,
              letterSpacing: 0,
              mb: { xs: 0.75, sm: 2 },
            }}
          >
            {t('title')}
          </Typography>
          <Typography
            variant="h5"
            color="text.secondary"
            sx={{
              mb: { xs: 1.75, sm: 3 },
              maxWidth: 600,
              mx: { sm: 'auto' },
              fontSize: { xs: '0.9375rem', sm: '1.5rem' },
              lineHeight: { xs: 1.45, sm: 1.35 },
            }}
          >
            {t('subtitle')}
          </Typography>
          <Stack direction="row" spacing={1} justifyContent={{ xs: 'stretch', sm: 'center' }}>
            <Button
              variant="contained"
              size={isMobile ? 'medium' : 'large'}
              startIcon={<Library size={20} />}
              onClick={() => navigate('/vocabulary')}
              sx={{ borderRadius: 1, flex: { xs: 1, sm: '0 0 auto' }, minWidth: 0 }}
            >
              {t('buttons.vocabulary')}
            </Button>
            <Button
              variant="outlined"
              size={isMobile ? 'medium' : 'large'}
              startIcon={<BarChart3 size={20} />}
              onClick={() => navigate('/train/result')}
              sx={{ borderRadius: 1, flex: { xs: 1, sm: '0 0 auto' }, minWidth: 0 }}
            >
              {t('buttons.viewResults')}
            </Button>
          </Stack>
        </Box>

        {/* Today's review tasks (hidden when the day has none) */}
        <TodayTasksCard />

        {/* Statistics Cards */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: 'repeat(2, minmax(0, 1fr))',
              sm: 'repeat(2, 1fr)',
              md: 'repeat(4, 1fr)',
            },
            gap: { xs: 1, sm: 3 },
            mb: { xs: 3, sm: 6 },
          }}
        >
          <StatCard
            title={t('stats.totalWords')}
            value={stats.totalWords.toLocaleString()}
            icon={<BookOpen size={32} />}
            color={theme.palette.primary.main}
            subtitle={t('stats.learning')}
          />
          <StatCard
            title={t('stats.topics')}
            value={stats.totalTopics}
            icon={<Library size={32} />}
            color={theme.palette.info.main}
            subtitle={t('stats.created')}
          />
          <StatCard
            title={t('stats.wordsToReview')}
            value={stats.uniqueWords}
            icon={<Target size={32} />}
            color={theme.palette.warning.main}
            subtitle={t('stats.mistakeAtLeastOnce')}
          />
          <StatCard
            title={t('stats.streak')}
            value={stats.totalMistakes > 0 ? '🔥' : '✨'}
            icon={<Flame size={32} />}
            color={theme.palette.error.main}
            subtitle={stats.totalMistakes > 0 ? t('stats.keepPracticing') : t('stats.startNow')}
          />
        </Box>

        {/* Training Modes Section */}
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: { xs: 1.25, sm: 3 } }}>
            <Zap size={isMobile ? 20 : 28} color={theme.palette.primary.main} />
            <Typography sx={{ fontSize: { xs: '1.0625rem', sm: '2.125rem' }, lineHeight: 1.25, fontWeight: 700 }}>
              {t('trainingModes.title')}
            </Typography>
          </Box>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: 'repeat(2, minmax(0, 1fr))',
                sm: 'repeat(2, 1fr)',
                md: 'repeat(4, 1fr)',
              },
              gap: { xs: 1, sm: 3 },
            }}
          >
            {trainingModes.map((mode, index) => (
              <TrainingModeCard
                key={index}
                {...mode}
                onClick={() => navigate(mode.route)}
              />
            ))}
          </Box>
        </Box>

        {/* Features Section */}
        <Card
          elevation={2}
          sx={{
            display: { xs: 'none', md: 'block' },
            bgcolor: 'background.paper',
            border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
            borderRadius: 1,
          }}
        >
          <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
              <TrendingUp size={28} color={theme.palette.primary.main} />
              <Typography variant={isMobile ? 'h6' : 'h5'} fontWeight={700}>
                {t('features.title')}
              </Typography>
            </Box>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: '1fr',
                  md: 'repeat(3, 1fr)',
                },
                gap: 3,
              }}
            >
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Box
                  sx={{
                    p: 1,
                    borderRadius: 2,
                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                    color: theme.palette.primary.main,
                    height: 'fit-content',
                  }}
                >
                  <FolderOpen size={24} />
                </Box>
                <Box>
                  <Typography variant="h6" fontWeight={600} gutterBottom>
                    {t('features.vocabManagement.title')}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t('features.vocabManagement.description')}
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Box
                  sx={{
                    p: 1,
                    borderRadius: 2,
                    bgcolor: alpha(theme.palette.success.main, 0.1),
                    color: theme.palette.success.main,
                    height: 'fit-content',
                  }}
                >
                  <Target size={24} />
                </Box>
                <Box>
                  <Typography variant="h6" fontWeight={600} gutterBottom>
                    {t('features.progressTracking.title')}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t('features.progressTracking.description')}
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Box
                  sx={{
                    p: 1,
                    borderRadius: 2,
                    bgcolor: alpha(theme.palette.info.main, 0.1),
                    color: theme.palette.info.main,
                    height: 'fit-content',
                  }}
                >
                  <Volume2 size={24} />
                </Box>
                <Box>
                  <Typography variant="h6" fontWeight={600} gutterBottom>
                    {t('features.pronunciation.title')}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t('features.pronunciation.description')}
                  </Typography>
                </Box>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
};

export default Home;
