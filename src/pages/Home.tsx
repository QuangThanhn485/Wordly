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
import { loadVocabCounts } from '@/features/vocabulary/utils/storageUtils';
import { loadMistakesStats } from '@/features/train/train-read-write/mistakesStorage';

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
      elevation={2}
      sx={{
        height: '100%',
        background: `linear-gradient(135deg, ${alpha(color, 0.1)} 0%, ${alpha(color, 0.05)} 100%)`,
        border: `1px solid ${alpha(color, 0.2)}`,
        transition: 'all 0.3s ease',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: `0 8px 24px ${alpha(color, 0.25)}`,
        },
      }}
    >
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {title}
            </Typography>
            <Typography variant="h3" fontWeight={700} color={color} sx={{ mb: 0.5 }}>
              {value}
            </Typography>
            {subtitle && (
              <Typography variant="caption" color="text.secondary">
                {subtitle}
              </Typography>
            )}
          </Box>
          <Box
            sx={{
              p: 1.5,
              borderRadius: 2,
              bgcolor: alpha(color, 0.15),
              color: color,
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
      elevation={1}
      sx={{
        height: '100%',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        border: `1px solid ${alpha(color, 0.2)}`,
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: 4,
          borderColor: color,
        },
      }}
      onClick={onClick}
    >
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <Box
            sx={{
              p: 1.5,
              borderRadius: 2,
              bgcolor: alpha(color, 0.1),
              color: color,
            }}
          >
            {icon}
          </Box>
          <Typography variant="h6" fontWeight={600}>
            {title}
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary">
          {description}
        </Typography>
      </CardContent>
    </Card>
  );
};

const Home: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [stats, setStats] = useState({
    totalWords: 0,
    totalFiles: 0,
    totalMistakes: 0,
    uniqueWords: 0,
  });

  useEffect(() => {
    // Load statistics from localStorage
    const vocabCounts = loadVocabCounts();
    const mistakesStats = loadMistakesStats();

    const totalWords = Object.values(vocabCounts).reduce((sum, count) => sum + count, 0);
    const totalFiles = Object.keys(vocabCounts).length;
    const totalMistakes = Object.keys(mistakesStats).length;
    
    // Get unique words from mistakes
    const uniqueWords = new Set(Object.keys(mistakesStats)).size;

    setStats({
      totalWords,
      totalFiles,
      totalMistakes,
      uniqueWords,
    });
  }, []);

  const trainingModes = [
    {
      title: 'Flashcards Reading',
      description: 'Học từ vựng qua thẻ flashcard trực quan',
      icon: <BookOpen size={28} />,
      color: theme.palette.primary.main,
      route: '/vocabulary',
    },
    {
      title: 'Flashcards Listening',
      description: 'Luyện nghe và nhận diện từ vựng',
      icon: <Headphones size={28} />,
      color: theme.palette.info.main,
      route: '/vocabulary',
    },
    {
      title: 'Read & Write',
      description: 'Đọc nghĩa và viết từ tiếng Anh',
      icon: <Edit size={28} />,
      color: theme.palette.success.main,
      route: '/vocabulary',
    },
    {
      title: 'Listen & Write',
      description: 'Nghe phát âm và viết chính tả',
      icon: <Mic size={28} />,
      color: theme.palette.warning.main,
      route: '/vocabulary',
    },
  ];

  return (
    <Box
      sx={{
        minHeight: '100vh',
        width: '100%',
        bgcolor: 'background.default',
        pt: { xs: 3, sm: 4, md: 6 },
        pb: 6,
      }}
    >
      <Container maxWidth="lg">
        {/* Hero Section */}
        <Box sx={{ mb: { xs: 4, sm: 6 }, textAlign: 'center' }}>
          <Typography
            variant={isMobile ? 'h3' : 'h2'}
            fontWeight={800}
            gutterBottom
            sx={{
              background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              mb: 2,
            }}
          >
            Wordly
          </Typography>
          <Typography
            variant={isMobile ? 'h6' : 'h5'}
            color="text.secondary"
            sx={{ mb: 3, maxWidth: 600, mx: 'auto' }}
          >
            Ứng dụng học từ vựng tiếng Anh thông minh với 4 chế độ luyện tập đa dạng
          </Typography>
          <Stack direction="row" spacing={2} justifyContent="center" flexWrap="wrap" gap={2}>
            <Button
              variant="contained"
              size="large"
              startIcon={<Library size={20} />}
              onClick={() => navigate('/vocabulary')}
              sx={{ borderRadius: 2 }}
            >
              Kho từ vựng
            </Button>
            <Button
              variant="outlined"
              size="large"
              startIcon={<BarChart3 size={20} />}
              onClick={() => navigate('/train/result')}
              sx={{ borderRadius: 2 }}
            >
              Xem kết quả
            </Button>
          </Stack>
        </Box>

        {/* Statistics Cards */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, 1fr)',
              md: 'repeat(4, 1fr)',
            },
            gap: 3,
            mb: { xs: 4, sm: 6 },
          }}
        >
          <StatCard
            title="Tổng số từ"
            value={stats.totalWords.toLocaleString()}
            icon={<BookOpen size={32} />}
            color={theme.palette.primary.main}
            subtitle="Đang học"
          />
          <StatCard
            title="File từ vựng"
            value={stats.totalFiles}
            icon={<Library size={32} />}
            color={theme.palette.info.main}
            subtitle="Đã tạo"
          />
          <StatCard
            title="Từ cần ôn"
            value={stats.uniqueWords}
            icon={<Target size={32} />}
            color={theme.palette.warning.main}
            subtitle="Từ sai ít nhất 1 lần"
          />
          <StatCard
            title="Streak"
            value={stats.totalMistakes > 0 ? '🔥' : '✨'}
            icon={<Flame size={32} />}
            color={theme.palette.error.main}
            subtitle={stats.totalMistakes > 0 ? 'Tiếp tục luyện tập!' : 'Bắt đầu ngay'}
          />
        </Box>

        {/* Training Modes Section */}
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
            <Zap size={28} color={theme.palette.primary.main} />
            <Typography variant={isMobile ? 'h5' : 'h4'} fontWeight={700}>
              Chế độ luyện tập
            </Typography>
          </Box>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                sm: 'repeat(2, 1fr)',
                md: 'repeat(4, 1fr)',
              },
              gap: 3,
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
            background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)} 0%, ${alpha(theme.palette.secondary.main, 0.05)} 100%)`,
            border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
          }}
        >
          <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
              <TrendingUp size={28} color={theme.palette.primary.main} />
              <Typography variant={isMobile ? 'h6' : 'h5'} fontWeight={700}>
                Tính năng nổi bật
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
                    Quản lý từ vựng
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Tổ chức từ vựng theo folder, import/export dễ dàng
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
                    Theo dõi tiến độ
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Xem chi tiết lỗi sai, thống kê kết quả theo từng chế độ
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
                    Phát âm chuẩn
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Nghe phát âm tiếng Anh chuẩn với nhiều giọng đọc
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
