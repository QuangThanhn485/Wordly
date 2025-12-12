// src/features/result/components/EmptyState.tsx
import React from 'react';
import { Box, Typography } from '@mui/material';
import { BarChart3 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const EmptyState: React.FC = () => {
  const { t } = useTranslation('result');

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
      <BarChart3
        size={80}
        style={{
          color: 'inherit',
          marginBottom: 24,
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
        {t('empty.title')}
      </Typography>
      <Typography
        variant="body1"
        color="text.secondary"
        sx={{
          maxWidth: 500,
          fontSize: { xs: '0.875rem', sm: '1rem' },
        }}
      >
        {t('empty.description')}
      </Typography>
    </Box>
  );
};
