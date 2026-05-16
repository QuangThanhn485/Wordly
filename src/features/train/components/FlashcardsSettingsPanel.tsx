import React, { useCallback, useState } from 'react';
import {
  Box,
  Checkbox,
  Drawer,
  Fab,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { Settings, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const STORAGE_KEY_FLASHCARDS_SETTINGS = 'wordly_flashcards_settings';

export type FlashcardsSettings = {
  removeCorrectCards: boolean;
};

const defaultSettings: FlashcardsSettings = {
  removeCorrectCards: false,
};

const loadFlashcardsSettings = (): FlashcardsSettings => {
  if (typeof window === 'undefined') return defaultSettings;

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY_FLASHCARDS_SETTINGS);
    if (!stored) return defaultSettings;
    return { ...defaultSettings, ...JSON.parse(stored) };
  } catch {
    return defaultSettings;
  }
};

const saveFlashcardsSettings = (settings: FlashcardsSettings) => {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(STORAGE_KEY_FLASHCARDS_SETTINGS, JSON.stringify(settings));
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

type FlashcardsSettingsPanelProps = {
  removeCorrectCards: boolean;
  onRemoveCorrectCardsChange: (checked: boolean) => void;
};

export const FlashcardsSettingsPanel: React.FC<FlashcardsSettingsPanelProps> = ({
  removeCorrectCards,
  onRemoveCorrectCardsChange,
}) => {
  const [open, setOpen] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isDark = theme.palette.mode === 'dark';
  const { t } = useTranslation('train');

  const handleClose = () => {
    setOpen(false);
  };

  const handleToggleRemoveCorrectCards = () => {
    onRemoveCorrectCardsChange(!removeCorrectCards);
  };

  return (
    <>
      <Tooltip title={t('settings.title')} placement="left">
        <Fab
          color="default"
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
      </Tooltip>

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
              <ListItem disablePadding>
                <ListItemButton
                  onClick={handleToggleRemoveCorrectCards}
                  sx={{ py: 1.75, px: 2, display: 'flex', gap: 1.25 }}
                >
                  <Checkbox
                    checked={removeCorrectCards}
                    onChange={(event) => onRemoveCorrectCardsChange(event.target.checked)}
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
            </List>
          </Box>
        </Box>
      </Drawer>
    </>
  );
};
