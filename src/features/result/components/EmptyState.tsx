// src/features/result/components/EmptyState.tsx
import React from 'react';
import { Box, Typography, useTheme } from '@mui/material';
import AssessmentIcon from '@mui/icons-material/Assessment';

export const EmptyState: React.FC = () => {
  const theme = useTheme();

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        py: { xs: 8, sm: 12 },
        px: 2,
        textAlign: 'center',
      }}
    >
      <AssessmentIcon
        sx={{
          fontSize: { xs: 64, sm: 80 },
          color: 'text.secondary',
          mb: 3,
          opacity: 0.5,
        }}
      />
      <Typography
        variant="h5"
        fontWeight={600}
        gutterBottom
        sx={{
          fontSize: { xs: '1.25rem', sm: '1.5rem' },
          mb: 1,
        }}
      >
        Chưa có dữ liệu lỗi
      </Typography>
      <Typography
        variant="body1"
        color="text.secondary"
        sx={{
          maxWidth: 500,
          fontSize: { xs: '0.875rem', sm: '1rem' },
        }}
      >
        Bắt đầu training để tích lũy dữ liệu về các từ vựng bạn đã sai. Dữ liệu sẽ được hiển thị ở đây sau khi bạn hoàn thành các bài tập.
      </Typography>
    </Box>
  );
};

