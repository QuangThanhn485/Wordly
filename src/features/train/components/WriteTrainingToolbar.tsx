import { useState, type ReactNode } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  Typography,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import {
  AlertCircle,
  ArrowLeftRight,
  Layers3,
  RotateCcw,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

export type TrainingMode = 'vi-en' | 'en-vi';

type TrainingToolbarProps = {
  mode: TrainingMode;
  remaining: number;
  mistakes: number;
  disabled?: boolean;
  restartDisabled?: boolean;
  onModeChange: (mode: TrainingMode) => void;
  onRestart: () => void;
  sessionActions?: ReactNode;
  centerContent?: ReactNode;
  actions?: ReactNode;
};

export const TrainingToolbar = ({
  mode,
  remaining,
  mistakes,
  disabled = false,
  restartDisabled = false,
  onModeChange,
  onRestart,
  sessionActions,
  centerContent,
  actions,
}: TrainingToolbarProps) => {
  const theme = useTheme();
  const { t } = useTranslation('train');
  const isDark = theme.palette.mode === 'dark';
  const hasCenterContent = centerContent !== undefined && centerContent !== null;
  const [restartConfirmOpen, setRestartConfirmOpen] = useState(false);

  const handleRestartConfirm = () => {
    setRestartConfirmOpen(false);
    onRestart();
  };

  return (
    <>
      <Box
        sx={{
          width: '100%',
          minWidth: 0,
          display: hasCenterContent ? 'grid' : 'flex',
          gridTemplateColumns: hasCenterContent
            ? {
                xs: 'minmax(0, 1fr) 90px minmax(0, 1fr)',
                sm: 'minmax(170px, 1fr) minmax(150px, auto) minmax(170px, 1fr)',
              }
            : undefined,
          gridTemplateRows: hasCenterContent
            ? { xs: 'auto auto', sm: 'auto' }
            : undefined,
          flexDirection: hasCenterContent
            ? undefined
            : { xs: 'column', sm: 'row' },
          alignItems: 'center',
          justifyContent: 'space-between',
          columnGap: { xs: 1, sm: 1.5 },
          rowGap: { xs: 0.75, sm: 0 },
          position: 'relative',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.75,
            minWidth: 0,
            flexShrink: 0,
            flexWrap: 'nowrap',
            gridColumn: hasCenterContent ? '1' : undefined,
            gridRow: hasCenterContent ? '1' : undefined,
            justifySelf: hasCenterContent ? 'start' : undefined,
          }}
        >
          <Button
            type="button"
            variant="outlined"
            color="primary"
            size="small"
            disabled={disabled}
            startIcon={<ArrowLeftRight size={15} />}
            onClick={() => onModeChange(mode === 'vi-en' ? 'en-vi' : 'vi-en')}
            aria-label={t('toolbar.switchDirection')}
            sx={{
              minWidth: hasCenterContent ? { xs: 84, sm: 104 } : 104,
              width: hasCenterContent ? { xs: 84, sm: 'auto' } : 'auto',
              maxWidth: hasCenterContent ? { xs: 84, sm: 'none' } : 'none',
              px: hasCenterContent ? { xs: 0.5, sm: 1.25 } : 1.25,
              fontSize: hasCenterContent
                ? { xs: '0.75rem', sm: '0.8125rem' }
                : undefined,
              '& .MuiButton-startIcon': {
                display: hasCenterContent
                  ? { xs: 'none', sm: 'inherit' }
                  : 'inherit',
              },
              borderColor: alpha(theme.palette.primary.main, isDark ? 0.5 : 0.34),
              bgcolor: alpha(theme.palette.primary.main, isDark ? 0.1 : 0.035),
            }}
          >
            {mode === 'vi-en' ? t('direction.viEn') : t('direction.enVi')}
          </Button>

          {sessionActions && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.25,
              }}
            >
              {sessionActions}
            </Box>
          )}

          {sessionActions && (
            <Divider orientation="vertical" flexItem sx={{ mx: 0.25 }} />
          )}

          <Button
            type="button"
            variant="text"
            color="inherit"
            size="small"
            startIcon={<RotateCcw size={15} />}
            disabled={restartDisabled}
            onClick={() => setRestartConfirmOpen(true)}
            aria-label={t('buttons.restart')}
            sx={{
              color: 'text.secondary',
              minWidth: hasCenterContent ? { xs: 32, sm: 'auto' } : undefined,
              width: hasCenterContent ? { xs: 32, sm: 'auto' } : 'auto',
              maxWidth: hasCenterContent ? { xs: 32, sm: 'none' } : 'none',
              px: hasCenterContent ? { xs: 0, sm: 1 } : 1,
              '& .MuiButton-startIcon': {
                mr: hasCenterContent ? { xs: 0, sm: 1 } : 1,
                ml: hasCenterContent ? { xs: 0, sm: -0.5 } : -0.5,
              },
              '&:hover': {
                color: 'text.primary',
                bgcolor: 'action.hover',
              },
            }}
          >
            <Box
              component="span"
              sx={{
                display: hasCenterContent
                  ? { xs: 'none', sm: 'inline' }
                  : 'inline',
              }}
            >
              {t('buttons.restart')}
            </Box>
          </Button>
        </Box>

        {hasCenterContent && (
          <Box
            sx={{
              minWidth: 0,
              gridColumn: '2',
              gridRow: '1',
              justifySelf: 'center',
              width: '100%',
              maxWidth: 440,
              display: 'flex',
              justifyContent: 'center',
            }}
          >
            {centerContent}
          </Box>
        )}

        <Box
          sx={{
            minWidth: 0,
            width: { xs: '100%', sm: 'auto' },
            flex: { sm: 1 },
            minHeight: 32,
            display: 'flex',
            alignItems: 'center',
            justifyContent: { sm: 'flex-end' },
            gap: 0.5,
            pr: { xs: 9, sm: 0 },
            gridColumn: hasCenterContent
              ? { xs: '1 / -1', sm: '3' }
              : undefined,
            gridRow: hasCenterContent
              ? { xs: '2', sm: '1' }
              : undefined,
            justifySelf: hasCenterContent ? 'stretch' : undefined,
          }}
        >
          <Box
            sx={{
              minWidth: 0,
              display: 'flex',
              alignItems: 'center',
              gap: { xs: 1, sm: 1.5 },
            }}
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                color: 'text.secondary',
                whiteSpace: 'nowrap',
              }}
            >
              <Layers3 size={15} />
              <Typography
                sx={{
                  fontSize: '0.75rem',
                  lineHeight: 1.2,
                  fontWeight: 600,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {t('toolbar.remainingValue', { count: remaining })}
              </Typography>
            </Box>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                color: mistakes > 0 ? 'error.main' : 'text.secondary',
                whiteSpace: 'nowrap',
              }}
            >
              <AlertCircle size={15} />
              <Typography
                sx={{
                  fontSize: '0.75rem',
                  lineHeight: 1.2,
                  fontWeight: 600,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {t('toolbar.mistakesValue', { count: mistakes })}
              </Typography>
            </Box>
          </Box>

          <Divider
            orientation="vertical"
            flexItem
            sx={{ display: { xs: 'none', sm: 'block' }, mx: 0.5 }}
          />

          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.25,
              flexShrink: 0,
              minWidth: 68,
              justifyContent: 'flex-end',
              position: { xs: 'absolute', sm: 'static' },
              right: { xs: 0, sm: 'auto' },
              bottom: { xs: 0, sm: 'auto' },
              zIndex: 1,
            }}
          >
            {actions}
          </Box>
        </Box>
      </Box>

      <Dialog
        open={restartConfirmOpen}
        onClose={() => setRestartConfirmOpen(false)}
        maxWidth="xs"
        fullWidth
        aria-labelledby="restart-training-title"
      >
        <DialogTitle id="restart-training-title">
          {t('toolbar.restartTitle')}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {t('toolbar.restartDescription')}
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            type="button"
            color="inherit"
            onClick={() => setRestartConfirmOpen(false)}
          >
            {t('buttons.cancel')}
          </Button>
          <Button
            type="button"
            variant="contained"
            color="error"
            startIcon={<RotateCcw size={16} />}
            onClick={handleRestartConfirm}
            sx={{ boxShadow: 'none' }}
          >
            {t('buttons.restart')}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export const WriteTrainingToolbar = TrainingToolbar;
