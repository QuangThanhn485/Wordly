// src/features/result/components/OverviewCards.tsx
import React from 'react';
import { Box, Card, CardContent, Typography, useTheme } from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import StarIcon from '@mui/icons-material/Star';
import AssessmentIcon from '@mui/icons-material/Assessment';
import { type OverviewStats } from '../utils/dataTransform';

interface OverviewCardsProps {
  stats: OverviewStats;
}

export const OverviewCards: React.FC<OverviewCardsProps> = ({ stats }) => {
  const theme = useTheme();

  const cards = [
    {
      title: 'Tổng số từ đã sai',
      value: stats.totalWords,
      icon: <ErrorOutlineIcon />,
      color: theme.palette.error.main,
      bgColor: theme.palette.error.light + '20',
    },
    {
      title: 'Tổng số lần sai',
      value: stats.totalMistakes,
      icon: <TrendingUpIcon />,
      color: theme.palette.warning.main,
      bgColor: theme.palette.warning.light + '20',
    },
    {
      title: 'Từ sai nhiều nhất',
      value: stats.mostMistakenWord?.word || '—',
      subtitle: stats.mostMistakenWord ? `${stats.mostMistakenWord.count} lần` : '',
      icon: <StarIcon />,
      color: theme.palette.info.main,
      bgColor: theme.palette.info.light + '20',
    },
    {
      title: 'Số file có lỗi',
      value: Object.keys(stats.mistakesByFile).length,
      icon: <AssessmentIcon />,
      color: theme.palette.success.main,
      bgColor: theme.palette.success.light + '20',
    },
  ];

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: '1fr',
          sm: 'repeat(2, 1fr)',
          md: 'repeat(4, 1fr)',
        },
        gap: { xs: 2, sm: 2, md: 3 },
        mb: 3,
      }}
    >
      {cards.map((card, index) => (
        <Card
          key={index}
          sx={{
            background: `linear-gradient(135deg, ${card.bgColor} 0%, ${card.bgColor}00 100%)`,
            border: `1px solid ${card.color}40`,
            borderRadius: 2,
            transition: 'transform 0.2s, box-shadow 0.2s',
            '&:hover': {
              transform: 'translateY(-4px)',
              boxShadow: theme.shadows[8],
            },
          }}
        >
          <CardContent sx={{ p: { xs: 2, sm: 2.5, md: 3 } }}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1 }}>
              <Box
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  bgcolor: card.bgColor,
                  color: card.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {card.icon}
              </Box>
            </Box>
            <Typography
              variant="h4"
              fontWeight={700}
              sx={{
                color: card.color,
                mb: 0.5,
                fontSize: { xs: '1.5rem', sm: '1.75rem', md: '2rem' },
              }}
            >
              {typeof card.value === 'number' ? card.value.toLocaleString('vi-VN') : card.value}
            </Typography>
            {card.subtitle && (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                {card.subtitle}
              </Typography>
            )}
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                fontSize: { xs: '0.75rem', sm: '0.875rem' },
                fontWeight: 500,
              }}
            >
              {card.title}
            </Typography>
          </CardContent>
        </Card>
      ))}
    </Box>
  );
};

