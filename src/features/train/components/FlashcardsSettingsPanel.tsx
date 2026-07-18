import React, { useCallback, useEffect, useState } from 'react';
import {
  Box,
  Checkbox,
  Drawer,
  Fab,
  IconButton,
  InputAdornment,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Slider,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { Settings, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { loadPreferences, updatePreferences } from '@/data';

export type FlashcardsSettings = {
  removeCorrectCards: boolean;
};

export type WriteTrainingSettings = {
  answerReviewDurationMs: number;
  disableAutoAdvance: boolean;
};

const defaultSettings: FlashcardsSettings = {
  removeCorrectCards: false,
};

const defaultWriteTrainingSettings: WriteTrainingSettings = {
  answerReviewDurationMs: 3000,
  disableAutoAdvance: false,
};

const loadFlashcardsSettings = (): FlashcardsSettings => {
  if (typeof window === 'undefined') return defaultSettings;

  try {
    return { ...defaultSettings, ...loadPreferences().flashcards };
  } catch {
    return defaultSettings;
  }
};

const saveFlashcardsSettings = (settings: FlashcardsSettings) => {
  if (typeof window === 'undefined') return;

  try {
    updatePreferences((current) => ({
      ...current,
      flashcards: settings,
    }));
  } catch {}
};

export const useFlashcardsSettings = () => {
  const [settings, setSettings] = useState<FlashcardsSettings>(() => loadFlashcardsSettings());

  const setRemoveCorrectCards = useCallback((removeCorrectCards: boolean) => {
    setSettings((prev) => {
      const next = { ...prev, removeCorrectCards };
      saveFlashcardsSettings(next);
      return next;
    });
  }, []);

  return {
    settings,
    setRemoveCorrectCards,
  };
};

const normalizeReviewDuration = (value: number): number =>
  Math.min(10000, Math.max(1000, Math.round(value / 500) * 500));

const loadWriteTrainingSettings = (): WriteTrainingSettings => {
  if (typeof window === 'undefined') return defaultWriteTrainingSettings;

  try {
    const stored = loadPreferences().writeTraining;
    return {
      answerReviewDurationMs: normalizeReviewDuration(
        stored.answerReviewDurationMs,
      ),
      disableAutoAdvance: stored.disableAutoAdvance === true,
    };
  } catch {
    return defaultWriteTrainingSettings;
  }
};

export const useWriteTrainingSettings = () => {
  const [settings, setSettings] = useState<WriteTrainingSettings>(
    loadWriteTrainingSettings,
  );

  const setAnswerReviewDurationMs = useCallback((value: number) => {
    const answerReviewDurationMs = normalizeReviewDuration(value);
    setSettings((current) => ({ ...current, answerReviewDurationMs }));
    try {
      updatePreferences((current) => ({
        ...current,
        writeTraining: {
          ...current.writeTraining,
          answerReviewDurationMs,
        },
      }));
    } catch {}
  }, []);

  const setDisableAutoAdvance = useCallback((disableAutoAdvance: boolean) => {
    setSettings((current) => ({ ...current, disableAutoAdvance }));
    try {
      updatePreferences((current) => ({
        ...current,
        writeTraining: {
          ...current.writeTraining,
          disableAutoAdvance,
        },
      }));
    } catch {}
  }, []);

  return {
    settings,
    setAnswerReviewDurationMs,
    setDisableAutoAdvance,
  };
};

type FlashcardsSettingsPanelProps = {
  removeCorrectCards?: boolean;
  onRemoveCorrectCardsChange?: (checked: boolean) => void;
  answerReviewDurationMs?: number;
  onAnswerReviewDurationChange?: (value: number) => void;
  disableAutoAdvance?: boolean;
  onDisableAutoAdvanceChange?: (checked: boolean) => void;
  disabled?: boolean;
  triggerVariant?: 'edge' | 'inline';
};

export const FlashcardsSettingsPanel: React.FC<FlashcardsSettingsPanelProps> = ({
  removeCorrectCards,
  onRemoveCorrectCardsChange,
  answerReviewDurationMs,
  onAnswerReviewDurationChange,
  disableAutoAdvance,
  onDisableAutoAdvanceChange,
  disabled = false,
  triggerVariant = 'edge',
}) => {
  const [open, setOpen] = useState(false);
  const [draftReviewDuration, setDraftReviewDuration] = useState(
    answerReviewDurationMs ?? defaultWriteTrainingSettings.answerReviewDurationMs,
  );
  const [draftReviewDurationInput, setDraftReviewDurationInput] = useState(
    String(
      (answerReviewDurationMs ??
        defaultWriteTrainingSettings.answerReviewDurationMs) / 1000,
    ),
  );
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isDark = theme.palette.mode === 'dark';
  const { t } = useTranslation('train');

  const handleClose = () => {
    setOpen(false);
  };

  const handleToggleRemoveCorrectCards = () => {
    onRemoveCorrectCardsChange?.(!removeCorrectCards);
  };

  useEffect(() => {
    if (answerReviewDurationMs !== undefined) {
      setDraftReviewDuration(answerReviewDurationMs);
      setDraftReviewDurationInput(String(answerReviewDurationMs / 1000));
    }
  }, [answerReviewDurationMs]);

  const showRemoveCorrectCards =
    removeCorrectCards !== undefined && onRemoveCorrectCardsChange;
  const showReviewDuration =
    answerReviewDurationMs !== undefined && onAnswerReviewDurationChange;
  const showDisableAutoAdvance =
    disableAutoAdvance !== undefined && onDisableAutoAdvanceChange;

  const commitReviewDuration = (value: number) => {
    const normalized = normalizeReviewDuration(value);
    setDraftReviewDuration(normalized);
    setDraftReviewDurationInput(String(normalized / 1000));
    onAnswerReviewDurationChange?.(normalized);
  };

  const commitReviewDurationInput = () => {
    const seconds = Number(draftReviewDurationInput);
    if (!Number.isFinite(seconds)) {
      setDraftReviewDurationInput(String(draftReviewDuration / 1000));
      return;
    }
    commitReviewDuration(seconds * 1000);
  };

  return (
    <>
      {triggerVariant === 'inline' ? (
        <Tooltip title={t('settings.title')}>
          <span>
            <IconButton
              color="default"
              size="small"
              disabled={disabled}
              aria-label={t('settings.openAriaLabel')}
              onClick={() => setOpen((value) => !value)}
              sx={{
                color: 'text.secondary',
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: 'background.paper',
                '&:hover': {
                  color: 'primary.main',
                  borderColor: 'divider',
                  bgcolor: 'action.hover',
                },
              }}
            >
              <Settings size={17} />
            </IconButton>
          </span>
        </Tooltip>
      ) : (
        <Tooltip title={t('settings.title')} placement="left">
          <span>
            <Fab
              color="default"
              disabled={disabled}
              aria-label={t('settings.openAriaLabel')}
              onClick={() => setOpen((value) => !value)}
              sx={{
                position: 'fixed',
                right: 0,
                top: { xs: 248, sm: 248 },
                zIndex: (theme) => theme.zIndex.speedDial,
                width: 56,
                height: 56,
                borderRadius: '24px 0 0 24px',
                boxShadow: 'none',
                border: '1px solid',
                borderColor: alpha(theme.palette.primary.main, isDark ? 0.55 : 0.35),
                bgcolor: alpha(theme.palette.background.paper, isDark ? 0.92 : 0.98),
                color: theme.palette.primary.main,
                backdropFilter: 'blur(8px)',
                '&:hover': {
                  bgcolor: alpha(theme.palette.primary.main, isDark ? 0.16 : 0.08),
                },
              }}
            >
              <Settings size={24} />
            </Fab>
          </span>
        </Tooltip>
      )}

      <Drawer
        anchor={isMobile ? 'bottom' : 'right'}
        open={open}
        onClose={handleClose}
        PaperProps={{
          sx: {
            width: isMobile ? '100%' : { sm: 400, md: 450 },
            height: isMobile ? '100%' : '100vh',
            maxHeight: '100vh',
          },
        }}
      >
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          <Box
            sx={{
              p: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: `1px solid ${theme.palette.divider}`,
              bgcolor: 'background.paper',
            }}
          >
            <Typography variant="h6" fontWeight={600}>
              {t('settings.title')}
            </Typography>
            <IconButton onClick={handleClose} size="small">
              <X size={20} />
            </IconButton>
          </Box>

          <Box sx={{ flex: 1, overflow: 'auto' }}>
            <List sx={{ p: 0 }}>
              {showRemoveCorrectCards && (
                <ListItem disablePadding>
                  <ListItemButton
                    disabled={disabled}
                    onClick={handleToggleRemoveCorrectCards}
                    sx={{ py: 1.75, px: 2, display: 'flex', gap: 1.25 }}
                  >
                    <Checkbox
                      checked={removeCorrectCards}
                      disabled={disabled}
                      onChange={(event) =>
                        onRemoveCorrectCardsChange?.(event.target.checked)
                      }
                      onClick={(event) => event.stopPropagation()}
                      color="primary"
                      sx={{ p: 0.5, mt: -0.25 }}
                      inputProps={{ 'aria-label': t('settings.removeCorrectCards') }}
                    />
                    <ListItemText
                      primary={t('settings.removeCorrectCards')}
                      primaryTypographyProps={{
                        fontWeight: 600,
                        sx: { lineHeight: 1.4 },
                      }}
                    />
                  </ListItemButton>
                </ListItem>
              )}
              {showDisableAutoAdvance && (
                <ListItem disablePadding>
                  <ListItemButton
                    onClick={() =>
                      onDisableAutoAdvanceChange?.(!disableAutoAdvance)
                    }
                    sx={{
                      py: 1.75,
                      px: 2,
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 1.25,
                      borderTop: showRemoveCorrectCards ? '1px solid' : 0,
                      borderColor: 'divider',
                    }}
                  >
                    <Checkbox
                      checked={disableAutoAdvance}
                      onChange={(event) =>
                        onDisableAutoAdvanceChange?.(event.target.checked)
                      }
                      onClick={(event) => event.stopPropagation()}
                      color="primary"
                      sx={{ p: 0.5, mt: -0.25 }}
                      inputProps={{
                        'aria-label': t('settings.disableAutoAdvance'),
                      }}
                    />
                    <ListItemText
                      primary={t('settings.disableAutoAdvance')}
                      secondary={t('settings.disableAutoAdvanceDescription')}
                      primaryTypographyProps={{
                        fontWeight: 600,
                        sx: { lineHeight: 1.4 },
                      }}
                      secondaryTypographyProps={{
                        sx: { mt: 0.5, fontSize: '0.8125rem', lineHeight: 1.45 },
                      }}
                    />
                  </ListItemButton>
                </ListItem>
              )}
              {showReviewDuration && (
                <ListItem
                  sx={{
                    display: 'block',
                    px: 2.5,
                    py: 2,
                    borderTop:
                      showRemoveCorrectCards || showDisableAutoAdvance
                        ? '1px solid'
                        : 0,
                    borderColor: 'divider',
                  }}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 2,
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: '0.9375rem',
                        fontWeight: 600,
                        lineHeight: 1.4,
                      }}
                    >
                      {t('settings.answerReviewDuration')}
                    </Typography>
                    <TextField
                      type="number"
                      size="small"
                      value={draftReviewDurationInput}
                      disabled={disableAutoAdvance}
                      onChange={(event) => {
                        const value = event.target.value;
                        setDraftReviewDurationInput(value);
                        const seconds = Number(value);
                        if (
                          Number.isFinite(seconds) &&
                          seconds >= 1 &&
                          seconds <= 10
                        ) {
                          setDraftReviewDuration(
                            normalizeReviewDuration(seconds * 1000),
                          );
                        }
                      }}
                      onBlur={commitReviewDurationInput}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.currentTarget.blur();
                        }
                      }}
                      inputProps={{
                        min: 1,
                        max: 10,
                        step: 0.5,
                        'aria-label': t('settings.answerReviewDurationInput'),
                      }}
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            {t('settings.secondUnit')}
                          </InputAdornment>
                        ),
                      }}
                      sx={{
                        width: 116,
                        flexShrink: 0,
                        '& input': {
                          fontWeight: 700,
                          fontVariantNumeric: 'tabular-nums',
                        },
                      }}
                    />
                  </Box>
                  <Typography
                    color="text.secondary"
                    sx={{ mt: 0.5, fontSize: '0.8125rem', lineHeight: 1.45 }}
                  >
                    {t('settings.answerReviewDurationDescription')}
                  </Typography>
                  <Slider
                    value={draftReviewDuration}
                    disabled={disableAutoAdvance}
                    min={1000}
                    max={10000}
                    step={500}
                    onChange={(_, value) => {
                      const duration = value as number;
                      setDraftReviewDuration(duration);
                      setDraftReviewDurationInput(String(duration / 1000));
                    }}
                    onChangeCommitted={(_, value) =>
                      commitReviewDuration(value as number)
                    }
                    valueLabelDisplay="auto"
                    valueLabelFormat={(value) =>
                      t('settings.seconds', { value: value / 1000 })
                    }
                    aria-label={t('settings.answerReviewDuration')}
                    sx={{ mt: 1.5 }}
                  />
                </ListItem>
              )}
            </List>
          </Box>
        </Box>
      </Drawer>
    </>
  );
};
