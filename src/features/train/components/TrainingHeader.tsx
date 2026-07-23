import type { ReactNode } from 'react';
import { Box, LinearProgress, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';

type TrainingHeaderProps = {
  title: string;
  subtitle?: ReactNode;
  icon?: ReactNode;
  completed: number;
  total: number;
  controls: ReactNode;
};

export const TrainingHeader = ({
  title,
  subtitle,
  icon,
  completed,
  total,
  controls,
}: TrainingHeaderProps) => {
  const { t } = useTranslation('train');
  const safeTotal = Math.max(0, total);
  const safeCompleted = Math.min(
    safeTotal,
    Math.max(0, completed),
  );
  const progress =
    safeTotal > 0 ? (safeCompleted / safeTotal) * 100 : 0;

  return (
    <Box
      component="header"
      sx={{
        position: { xs: 'static', md: 'sticky' },
        top: 0,
        zIndex: (theme) => theme.zIndex.appBar - 1,
        width: '100%',
        flexShrink: 0,
        bgcolor: 'background.paper',
        borderBottom: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Box
        sx={{
          minHeight: { xs: 38, md: 56 },
          height: { xs: 38, md: 56 },
          px: { xs: 1.25, md: 2 },
          display: 'grid',
          gridTemplateColumns: {
            xs: 'minmax(0, 1fr)',
            md: 'minmax(0, 1fr) minmax(112px, 240px)',
          },
          alignItems: 'center',
          gap: { xs: 0, md: 3 },
          borderBottom: '1px solid',
          borderColor: 'divider',
          boxSizing: 'border-box',
        }}
      >
        <Box
          sx={{
            minWidth: 0,
            display: { xs: 'none', md: 'flex' },
            alignItems: 'center',
            gap: 1.125,
          }}
        >
          {icon && (
            <Box
              sx={{
                width: 32,
                height: 32,
                flexShrink: 0,
                display: 'grid',
                placeItems: 'center',
                borderRadius: 1,
                color: 'primary.main',
                bgcolor: 'action.hover',
              }}
            >
              {icon}
            </Box>
          )}
          <Box sx={{ minWidth: 0 }}>
            <Typography
              noWrap
              sx={{
                fontSize: { xs: '0.875rem', sm: '0.9375rem' },
                lineHeight: 1.25,
                fontWeight: 700,
                letterSpacing: 0,
              }}
            >
              {title}
            </Typography>
            {subtitle && (
              <Typography
                component="div"
                noWrap
                color="text.secondary"
                sx={{
                  display: 'block',
                  mt: 0.25,
                  minWidth: 0,
                  fontSize: '0.75rem',
                  lineHeight: 1.2,
                  letterSpacing: 0,
                }}
              >
                {subtitle}
              </Typography>
            )}
          </Box>
        </Box>

        <Box sx={{ minWidth: 0, width: '100%' }}>
          <Typography
            noWrap
            color="text.secondary"
            sx={{
              mb: { xs: 0.375, md: 0.5 },
              textAlign: 'right',
              fontSize: '0.75rem',
              lineHeight: 1,
              fontVariantNumeric: 'tabular-nums',
              letterSpacing: 0,
            }}
          >
            {t('topBar.progressCompact', {
              completed: safeCompleted,
              total: safeTotal,
              percent: Math.round(progress),
            })}
          </Typography>
          <LinearProgress
            variant="determinate"
            value={progress}
            aria-label={t('topBar.progress', {
              completed: safeCompleted,
              total: safeTotal,
              percent: Math.round(progress),
            })}
            sx={{
              height: { xs: 4, md: 5 },
              borderRadius: 1,
              bgcolor: 'action.hover',
            }}
          />
        </Box>
      </Box>

      <Box
        sx={{
          minHeight: { xs: 50, md: 48 },
          px: { xs: 1, md: 2 },
          py: { xs: 0.625, md: 0.75 },
          display: 'flex',
          alignItems: 'center',
          boxSizing: 'border-box',
          '& .MuiButton-root': {
            minHeight: { xs: 38, md: 32 },
            borderRadius: 1,
            px: 1.5,
            py: 0.5,
            fontSize: '0.8125rem',
            lineHeight: 1.25,
            fontWeight: 600,
            letterSpacing: 0,
            whiteSpace: 'nowrap',
          },
          '& .MuiChip-root': {
            minHeight: 28,
            height: 28,
            borderRadius: 1,
            fontSize: '0.75rem',
          },
          '& .MuiChip-label': {
            px: 1,
            fontSize: '0.75rem',
            letterSpacing: 0,
          },
          '& .MuiChip-icon': {
            ml: 0.75,
          },
          '& .MuiIconButton-root': {
            width: { xs: 38, md: 32 },
            height: { xs: 38, md: 32 },
            p: 0.75,
          },
        }}
      >
        {controls}
      </Box>
    </Box>
  );
};
