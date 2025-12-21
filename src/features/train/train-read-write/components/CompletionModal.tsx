import React from 'react';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  List,
  ListItem,
  Stack,
  Typography,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { AlertCircle, ArrowRight, CheckCircle, RotateCcw, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export type SessionMistake = {
  word: string; // English word
  viMeaning: string; // Vietnamese meaning
  count: number; // Number of mistakes in this session
};

interface CompletionModalProps {
  open: boolean;
  totalMistakes: number;
  mistakes: SessionMistake[]; // List of words with mistake counts for this session
  onExit: () => void;
  onRestart: () => void;
  onNextMode: () => void;
}

export const CompletionModal: React.FC<CompletionModalProps> = ({
  open,
  totalMistakes,
  mistakes,
  onExit,
  onRestart,
  onNextMode,
}) => {
  const { t } = useTranslation('train');
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const handleClose = () => onExit();

  const hasMistakes = totalMistakes > 0 && mistakes.length > 0;
  const accent = hasMistakes ? theme.palette.error.main : theme.palette.success.main;

  const sortedMistakes = React.useMemo(
    () => [...mistakes].sort((a, b) => b.count - a.count || a.word.localeCompare(b.word)),
    [mistakes],
  );
  const maxCount = sortedMistakes[0]?.count ?? 0;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      scroll="paper"
      BackdropProps={{
        sx: {
          backgroundColor: alpha(theme.palette.common.black, isDark ? 0.72 : 0.58),
          backdropFilter: 'blur(6px)',
        },
      }}
      PaperProps={{
        sx: {
          overflow: 'hidden',
          borderRadius: { xs: 3, sm: 4 },
          border: '1px solid',
          borderColor: alpha(theme.palette.divider, isDark ? 0.28 : 0.65),
          boxShadow: 'none',
          backgroundImage: isDark
            ? `linear-gradient(180deg, ${alpha(theme.palette.common.white, 0.04)} 0%, transparent 38%)`
            : `linear-gradient(180deg, ${alpha(theme.palette.common.black, 0.02)} 0%, transparent 38%)`,
        },
      }}
    >
      <DialogTitle sx={{ p: 0 }}>
        <Box
          sx={{
            px: { xs: 2.5, sm: 3 },
            pr: { xs: 6.5, sm: 7 },
            py: { xs: 2, sm: 2.5 },
            position: 'relative',
            borderBottom: '1px solid',
            borderColor: alpha(theme.palette.divider, isDark ? 0.2 : 0.65),
            backgroundImage: [
              `linear-gradient(135deg, ${alpha(accent, isDark ? 0.22 : 0.16)} 0%, transparent 58%)`,
              `linear-gradient(180deg, ${alpha(accent, isDark ? 0.12 : 0.08)} 0%, transparent 78%)`,
            ].join(','),
          }}
        >
          <IconButton
            onClick={handleClose}
            aria-label={t('buttons.close')}
            sx={{
              position: 'absolute',
              top: 10,
              right: 10,
              borderRadius: 2,
              color: 'text.secondary',
              border: '1px solid',
              borderColor: alpha(theme.palette.divider, isDark ? 0.25 : 0.6),
              bgcolor: alpha(theme.palette.background.paper, isDark ? 0.2 : 0.75),
              '&:hover': {
                bgcolor: alpha(theme.palette.background.paper, isDark ? 0.28 : 0.85),
              },
            }}
          >
            <X size={18} />
          </IconButton>

          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <Box
              sx={{
                width: 46,
                height: 46,
                borderRadius: 999,
                display: 'grid',
                placeItems: 'center',
                border: '1px solid',
                borderColor: alpha(accent, isDark ? 0.55 : 0.45),
                bgcolor: alpha(accent, isDark ? 0.18 : 0.12),
                color: accent,
                flexShrink: 0,
              }}
            >
              <CheckCircle size={24} />
            </Box>

            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="h6" fontWeight={900} sx={{ letterSpacing: '-0.02em' }} noWrap>
                {t('completion.title')}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                {t('completion.congratulations')}
              </Typography>
            </Box>

            <Box sx={{ textAlign: 'right', minWidth: 84 }}>
              <Typography variant="h4" fontWeight={950} sx={{ lineHeight: 1, color: accent }}>
                {totalMistakes}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 800, letterSpacing: 0.3 }}>
                {t('completion.mistakes')}
              </Typography>
            </Box>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ px: { xs: 2.5, sm: 3 }, py: { xs: 2, sm: 2.5 } }}>
        {sortedMistakes.length > 0 ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <AlertCircle size={18} style={{ color: theme.palette.error.main }} />
                <Typography variant="subtitle1" fontWeight={900} sx={{ letterSpacing: '-0.01em' }}>
                  {t('completion.mistakes')}
                </Typography>
              </Box>
              <Chip
                size="small"
                label={`${sortedMistakes.length} ${t('common.words')}`}
                sx={{
                  borderRadius: 999,
                  fontWeight: 800,
                  border: '1px solid',
                  borderColor: alpha(theme.palette.divider, isDark ? 0.28 : 0.6),
                  bgcolor: alpha(theme.palette.background.paper, isDark ? 0.12 : 0.7),
                }}
              />
            </Box>

            <Box
              sx={{
                border: '1px solid',
                borderColor: alpha(theme.palette.divider, isDark ? 0.25 : 0.6),
                borderRadius: 3,
                overflow: 'hidden',
                bgcolor: alpha(theme.palette.background.paper, isDark ? 0.1 : 0.75),
              }}
            >
              <List disablePadding>
                {sortedMistakes.map((mistake, idx) => {
                  const intensity = maxCount ? mistake.count / maxCount : 0;
                  return (
                    <React.Fragment key={mistake.word}>
                      <ListItem
                        disableGutters
                        sx={{
                          px: { xs: 2, sm: 2.25 },
                          py: { xs: 1.25, sm: 1.35 },
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 2,
                        }}
                      >
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="body1" fontWeight={900} sx={{ wordBreak: 'break-word' }}>
                            {mistake.word}
                          </Typography>
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{ mt: 0.25, wordBreak: 'break-word', lineHeight: 1.35 }}
                          >
                            {mistake.viMeaning}
                          </Typography>
                          <Box
                            sx={{
                              mt: 0.75,
                              width: { xs: '68%', sm: '56%' },
                              height: 6,
                              borderRadius: 999,
                              bgcolor: alpha(theme.palette.error.main, isDark ? 0.2 : 0.14),
                              overflow: 'hidden',
                            }}
                          >
                            <Box
                              sx={{
                                height: '100%',
                                width: `${Math.max(12, Math.round(intensity * 100))}%`,
                                bgcolor: alpha(theme.palette.error.main, isDark ? 0.9 : 0.75),
                                borderRadius: 999,
                              }}
                            />
                          </Box>
                        </Box>

                        <Chip
                          label={`x${mistake.count}`}
                          size="small"
                          sx={{
                            mt: 0.25,
                            borderRadius: 999,
                            fontWeight: 900,
                            border: '1px solid',
                            borderColor: alpha(theme.palette.error.main, isDark ? 0.55 : 0.4),
                            bgcolor: alpha(theme.palette.error.main, isDark ? 0.18 : 0.12),
                            color: theme.palette.error.main,
                          }}
                        />
                      </ListItem>
                      {idx < sortedMistakes.length - 1 && (
                        <Divider sx={{ borderColor: alpha(theme.palette.divider, isDark ? 0.18 : 0.65) }} />
                      )}
                    </React.Fragment>
                  );
                })}
              </List>
            </Box>
          </Box>
        ) : (
          <Box sx={{ textAlign: 'center', py: { xs: 3, sm: 3.5 } }}>
            <Box
              sx={{
                mx: 'auto',
                mb: 1.5,
                width: 72,
                height: 72,
                borderRadius: '50%',
                display: 'grid',
                placeItems: 'center',
                border: '1px solid',
                borderColor: alpha(theme.palette.success.main, isDark ? 0.55 : 0.35),
                bgcolor: alpha(theme.palette.success.main, isDark ? 0.16 : 0.1),
                color: theme.palette.success.main,
              }}
            >
              <CheckCircle size={34} />
            </Box>
            <Typography variant="h6" fontWeight={900} sx={{ letterSpacing: '-0.01em' }}>
              {t('completion.noMistakes')}
            </Typography>
          </Box>
        )}
      </DialogContent>

      <DialogActions
        sx={{
          px: { xs: 2.5, sm: 3 },
          pb: { xs: 2.5, sm: 3 },
          pt: 0,
        }}
      >
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1}
          sx={{
            width: '100%',
            '& > *': { flex: 1 },
          }}
        >
          <Button
            onClick={onExit}
            variant="outlined"
            color="inherit"
            startIcon={<X size={18} />}
            sx={{
              borderRadius: 2.5,
              borderColor: alpha(theme.palette.divider, isDark ? 0.3 : 0.65),
            }}
          >
            {t('buttons.exit')}
          </Button>
          <Button onClick={onRestart} variant="contained" color="primary" startIcon={<RotateCcw size={18} />} sx={{ borderRadius: 2.5 }}>
            {t('buttons.restart')}
          </Button>
          <Button
            onClick={onNextMode}
            variant="contained"
            color="primary"
            disabled
            startIcon={<ArrowRight size={18} />}
            sx={{ borderRadius: 2.5 }}
          >
            {t('buttons.nextMode')}
          </Button>
        </Stack>
      </DialogActions>
    </Dialog>
  );
};
