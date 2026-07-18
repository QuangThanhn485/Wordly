import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  IconButton,
  Radio,
  RadioGroup,
  Stack,
  Typography,
  useTheme,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
  BookOpenCheck,
  Monitor,
  Settings,
  Volume2,
  X,
} from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  loadPreferences,
  updatePreferences,
  type PronunciationAccent,
  type PronunciationSource,
} from '@/data';
import {
  cancelEnglishSpeech,
  speakEnglish,
} from '@/utils/speechUtils';

type PronunciationSettings = {
  source: PronunciationSource;
  accent: PronunciationAccent;
};

type AppSettingsDialogProps = {
  open: boolean;
  onClose: () => void;
};

const loadPronunciationSettings = (): PronunciationSettings =>
  loadPreferences().pronunciation;

export const AppSettingsDialog = ({
  open,
  onClose,
}: AppSettingsDialogProps) => {
  const theme = useTheme();
  const { t } = useTranslation('navbar');
  const [draft, setDraft] = useState<PronunciationSettings>(
    loadPronunciationSettings,
  );
  const [saveError, setSaveError] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDraft(loadPronunciationSettings());
    setSaveError(false);
  }, [open]);

  const handleClose = () => {
    cancelEnglishSpeech();
    onClose();
  };

  const handleSave = () => {
    try {
      updatePreferences((current) => ({
        ...current,
        pronunciation: draft,
      }));
      handleClose();
    } catch {
      setSaveError(true);
    }
  };

  const handlePreview = () => {
    speakEnglish('water', {
      lang:
        draft.source === 'dictionary' && draft.accent === 'uk'
          ? 'en-GB'
          : 'en-US',
      preferRecordedAudio: draft.source === 'dictionary',
    });
  };

  const sourceOptions: Array<{
    value: PronunciationSource;
    icon: ReactNode;
    title: string;
    meta: string;
  }> = [
    {
      value: 'device',
      icon: <Monitor size={19} />,
      title: t('settings.pronunciation.device'),
      meta: t('settings.pronunciation.deviceMeta'),
    },
    {
      value: 'dictionary',
      icon: <BookOpenCheck size={19} />,
      title: t('settings.pronunciation.dictionary'),
      meta: t('settings.pronunciation.dictionaryMeta'),
    },
  ];

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullWidth
      maxWidth="sm"
      aria-labelledby="app-settings-title"
      PaperProps={{
        sx: {
          borderRadius: 1,
          overflow: 'hidden',
          border: '1px solid',
          borderColor: 'divider',
        },
      }}
    >
      <DialogTitle
        id="app-settings-title"
        sx={{
          px: { xs: 2, sm: 2.5 },
          py: 1.75,
          display: 'flex',
          alignItems: 'center',
          gap: 1.25,
        }}
      >
        <Box
          sx={{
            width: 36,
            height: 36,
            display: 'grid',
            placeItems: 'center',
            flexShrink: 0,
            borderRadius: 1,
            color: 'primary.main',
            bgcolor: alpha(theme.palette.primary.main, 0.1),
          }}
        >
          <Settings size={20} />
        </Box>
        <Typography
          component="span"
          sx={{
            flex: 1,
            minWidth: 0,
            fontSize: '1.0625rem',
            lineHeight: 1.3,
            fontWeight: 700,
            letterSpacing: 0,
          }}
        >
          {t('settings.title')}
        </Typography>
        <IconButton
          onClick={handleClose}
          size="small"
          aria-label={t('settings.close')}
          sx={{ flexShrink: 0 }}
        >
          <X size={19} />
        </IconButton>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ px: { xs: 2, sm: 2.5 }, py: 2.5 }}>
        <Stack spacing={2.25}>
          <Box>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Volume2 size={18} />
              <Typography
                sx={{
                  fontSize: '0.9375rem',
                  lineHeight: 1.3,
                  fontWeight: 700,
                  letterSpacing: 0,
                }}
              >
                {t('settings.pronunciation.title')}
              </Typography>
            </Stack>

            <RadioGroup
              value={draft.source}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  source: event.target.value as PronunciationSource,
                }))
              }
              sx={{ mt: 1.25, gap: 0.75 }}
            >
              {sourceOptions.map((option) => {
                const selected = draft.source === option.value;
                return (
                  <FormControlLabel
                    key={option.value}
                    value={option.value}
                    control={<Radio size="small" />}
                    label={
                      <Stack
                        direction="row"
                        alignItems="center"
                        spacing={1}
                        sx={{ minWidth: 0 }}
                      >
                        <Box
                          sx={{
                            width: 32,
                            height: 32,
                            display: 'grid',
                            placeItems: 'center',
                            flexShrink: 0,
                            borderRadius: 1,
                            color: selected
                              ? 'primary.main'
                              : 'text.secondary',
                            bgcolor: selected
                              ? alpha(theme.palette.primary.main, 0.09)
                              : 'action.hover',
                          }}
                        >
                          {option.icon}
                        </Box>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography
                            sx={{
                              fontSize: '0.875rem',
                              lineHeight: 1.3,
                              fontWeight: 600,
                              letterSpacing: 0,
                            }}
                          >
                            {option.title}
                          </Typography>
                          <Typography
                            color="text.secondary"
                            sx={{
                              mt: 0.125,
                              fontSize: '0.75rem',
                              lineHeight: 1.3,
                              letterSpacing: 0,
                            }}
                          >
                            {option.meta}
                          </Typography>
                        </Box>
                      </Stack>
                    }
                    sx={{
                      m: 0,
                      minHeight: 58,
                      px: 1,
                      py: 0.5,
                      alignItems: 'center',
                      border: '1px solid',
                      borderColor: selected ? 'primary.main' : 'divider',
                      borderRadius: 1,
                      bgcolor: selected
                        ? alpha(theme.palette.primary.main, 0.045)
                        : 'transparent',
                      '&:hover': {
                        bgcolor: selected
                          ? alpha(theme.palette.primary.main, 0.07)
                          : 'action.hover',
                      },
                      '& .MuiFormControlLabel-label': {
                        flex: 1,
                        minWidth: 0,
                      },
                    }}
                  />
                );
              })}
            </RadioGroup>
          </Box>

          <Box
            sx={{
              opacity: draft.source === 'dictionary' ? 1 : 0.5,
              transition: 'opacity 160ms ease',
            }}
          >
            <Typography
              sx={{
                mb: 0.75,
                fontSize: '0.8125rem',
                lineHeight: 1.3,
                fontWeight: 700,
                letterSpacing: 0,
              }}
            >
              {t('settings.pronunciation.accent')}
            </Typography>
            <RadioGroup
              row
              value={draft.accent}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  accent: event.target.value as PronunciationAccent,
                }))
              }
              sx={{ gap: { xs: 0.5, sm: 2 } }}
            >
              <FormControlLabel
                value="us"
                disabled={draft.source !== 'dictionary'}
                control={<Radio size="small" />}
                label={t('settings.pronunciation.us')}
                sx={{ m: 0, mr: 1.5 }}
              />
              <FormControlLabel
                value="uk"
                disabled={draft.source !== 'dictionary'}
                control={<Radio size="small" />}
                label={t('settings.pronunciation.uk')}
                sx={{ m: 0 }}
              />
            </RadioGroup>
          </Box>

          {saveError && (
            <Alert severity="error" sx={{ borderRadius: 1 }}>
              {t('settings.saveError')}
            </Alert>
          )}
        </Stack>
      </DialogContent>

      <Divider />

      <DialogActions
        sx={{
          px: { xs: 2, sm: 2.5 },
          py: 1.5,
          gap: 0.75,
          justifyContent: 'space-between',
          alignItems: 'stretch',
          flexDirection: { xs: 'column-reverse', sm: 'row' },
        }}
      >
        <Button
          onClick={handlePreview}
          startIcon={<Volume2 size={17} />}
          color="inherit"
          sx={{ width: { xs: '100%', sm: 'auto' } }}
        >
          {t('settings.pronunciation.preview')}
        </Button>
        <Stack
          direction="row"
          spacing={0.75}
          sx={{ width: { xs: '100%', sm: 'auto' } }}
        >
          <Button
            onClick={handleClose}
            color="inherit"
            sx={{ flex: { xs: 1, sm: 'initial' } }}
          >
            {t('settings.cancel')}
          </Button>
          <Button
            onClick={handleSave}
            variant="contained"
            sx={{ flex: { xs: 1, sm: 'initial' } }}
          >
            {t('settings.save')}
          </Button>
        </Stack>
      </DialogActions>
    </Dialog>
  );
};
