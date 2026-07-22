import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  ButtonBase,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  InputAdornment,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import {
  CheckCircle2,
  Cloud,
  DownloadCloud,
  Eye,
  EyeOff,
  HardDrive,
  RefreshCw,
  Save,
  ShieldCheck,
  UploadCloud,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useDataSource } from '@/data/DataSourceProvider';
import type { DataSourceMode } from '@/data';

type ConfirmAction = 'upload' | 'download' | null;

export const DataSourceSettings: React.FC = () => {
  const theme = useTheme();
  const { t, i18n } = useTranslation('dataManagement');
  const {
    config,
    comparison,
    runtime,
    busy,
    saveUpstash,
    activateMode,
    refresh,
    uploadLocal,
    downloadRemote,
  } = useDataSource();
  const [url, setUrl] = useState(config.upstash?.url ?? '');
  const [token, setToken] = useState(config.upstash?.token ?? '');
  const [showToken, setShowToken] = useState(false);
  const [message, setMessage] = useState<{
    severity: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);

  useEffect(() => {
    setUrl(config.upstash?.url ?? '');
    setToken(config.upstash?.token ?? '');
  }, [config.upstash?.token, config.upstash?.url]);

  const configured = Boolean(config.upstash?.url && config.upstash?.token);
  const editingDisabled = config.mode === 'upstash';
  const relationLabel = comparison
    ? t(`cloud.${
        comparison.relation === 'same'
          ? 'same'
          : comparison.relation === 'local-newer'
            ? 'localNewer'
            : comparison.relation === 'remote-newer'
              ? 'remoteNewer'
              : comparison.relation === 'remote-empty'
                ? 'remoteEmpty'
                : 'diverged'
      }`)
    : t('cloud.unknown');
  const relationColor = comparison?.relation === 'same'
    ? 'success'
    : comparison?.relation === 'remote-empty'
      ? 'info'
      : comparison
        ? 'warning'
        : 'default';

  const dateFormatter = useMemo(
    () => new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium', timeStyle: 'short' }),
    [i18n.language],
  );

  const run = async (action: () => Promise<void>, successMessage?: string) => {
    setMessage(null);
    try {
      await action();
      if (successMessage) setMessage({ severity: 'success', text: successMessage });
    } catch (error) {
      setMessage({
        severity: 'error',
        text: error instanceof Error ? error.message : t('messages.unknownError'),
      });
    }
  };

  const handleSave = () =>
    run(async () => {
      await saveUpstash({ url, token });
    }, t('cloud.saveSuccess'));

  const handleMode = (mode: DataSourceMode) => {
    if (mode === config.mode || busy) return;
    void run(() => activateMode(mode));
  };

  const handleConfirmedAction = async () => {
    const action = confirmAction;
    setConfirmAction(null);
    if (action === 'upload') {
      await run(uploadLocal, t('cloud.uploadSuccess'));
    } else if (action === 'download') {
      await run(downloadRemote, t('cloud.downloadStarted'));
    }
  };

  return (
    <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
      <Box sx={{ px: { xs: 2, sm: 2.5 }, py: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" gap={2}>
          <Box>
            <Typography variant="h6" fontWeight={700}>{t('cloud.title')}</Typography>
            <Typography variant="body2" color="text.secondary">{t('cloud.description')}</Typography>
          </Box>
          {busy && <CircularProgress size={22} />}
        </Stack>
      </Box>

      <Box sx={{ p: { xs: 2, sm: 2.5 } }}>
        <Stack spacing={2.5}>
          {message && (
            <Alert severity={message.severity} variant="outlined" onClose={() => setMessage(null)}>
              {message.text}
            </Alert>
          )}
          {comparison && !comparison.localValid && (
            <Alert severity="warning" variant="outlined">
              {t('cloud.localInvalid')}
            </Alert>
          )}

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.25 }}>
            {([
              {
                mode: 'localStorage' as const,
                icon: HardDrive,
                title: t('cloud.localTitle'),
                description: t('cloud.localDescription'),
              },
              {
                mode: 'upstash' as const,
                icon: Cloud,
                title: t('cloud.upstashTitle'),
                description: t('cloud.upstashDescription'),
              },
            ]).map((option) => {
              const active = config.mode === option.mode;
              const Icon = option.icon;
              return (
                <ButtonBase
                  key={option.mode}
                  onClick={() => handleMode(option.mode)}
                  disabled={busy || (option.mode === 'upstash' && !configured)}
                  sx={{
                    minHeight: 92,
                    alignItems: 'stretch',
                    justifyContent: 'stretch',
                    textAlign: 'left',
                    border: '1px solid',
                    borderColor: active ? 'primary.main' : 'divider',
                    borderRadius: 1,
                    bgcolor: active ? alpha(theme.palette.primary.main, 0.07) : 'transparent',
                    transition: theme.transitions.create(['border-color', 'background-color']),
                    '&:hover': { bgcolor: active ? alpha(theme.palette.primary.main, 0.1) : 'action.hover' },
                  }}
                >
                  <Stack direction="row" spacing={1.5} sx={{ width: '100%', p: 1.75 }}>
                    <Box sx={{ color: active ? 'primary.main' : 'text.secondary', pt: 0.25 }}>
                      <Icon size={21} />
                    </Box>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center" gap={1}>
                        <Typography variant="subtitle2" fontWeight={700}>{option.title}</Typography>
                        {active && <Chip size="small" color="primary" label={t('cloud.active')} />}
                      </Stack>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        {option.description}
                      </Typography>
                    </Box>
                  </Stack>
                </ButtonBase>
              );
            })}
          </Box>

          <Divider />

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1fr) minmax(0, 1fr)' }, gap: 2 }}>
            <Stack spacing={1.5}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" gap={1}>
                <Typography variant="subtitle2" fontWeight={700}>{t('cloud.upstashTitle')}</Typography>
                <Chip
                  size="small"
                  variant="outlined"
                  color={configured ? 'success' : 'default'}
                  label={configured ? t('cloud.configured') : t('cloud.notConfigured')}
                />
              </Stack>
              <TextField
                size="small"
                label={t('cloud.url')}
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                disabled={editingDisabled || busy}
                placeholder="https://...upstash.io"
                autoComplete="off"
              />
              <TextField
                size="small"
                label={t('cloud.token')}
                type={showToken ? 'text' : 'password'}
                value={token}
                onChange={(event) => setToken(event.target.value)}
                disabled={editingDisabled || busy}
                autoComplete="off"
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <Tooltip title={showToken ? t('cloud.hideToken') : t('cloud.showToken')}>
                        <IconButton
                          size="small"
                          edge="end"
                          aria-label={showToken ? t('cloud.hideToken') : t('cloud.showToken')}
                          onClick={() => setShowToken((value) => !value)}
                          disabled={editingDisabled}
                        >
                          {showToken ? <EyeOff size={17} /> : <Eye size={17} />}
                        </IconButton>
                      </Tooltip>
                    </InputAdornment>
                  ),
                }}
              />
              {editingDisabled && (
                <Typography variant="caption" color="text.secondary">{t('cloud.switchLocalFirst')}</Typography>
              )}
              <Button
                variant="contained"
                startIcon={<Save size={17} />}
                onClick={() => void handleSave()}
                disabled={editingDisabled || busy || !url.trim() || !token.trim()}
                sx={{ alignSelf: 'flex-start' }}
              >
                {t('cloud.saveAndTest')}
              </Button>
            </Stack>

            <Stack spacing={1.5}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" gap={1}>
                <Typography variant="subtitle2" fontWeight={700}>{t('cloud.namespace')}</Typography>
                <Chip size="small" color={relationColor} label={relationLabel} />
              </Stack>
              <Box
                sx={{
                  px: 1.5,
                  py: 1.25,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1,
                  bgcolor: 'action.hover',
                }}
              >
                <Typography variant="body2" fontFamily="monospace" sx={{ overflowWrap: 'anywhere' }}>
                  {t('cloud.namespaceValue')}
                </Typography>
              </Box>
              <Stack direction="row" spacing={1} alignItems="flex-start">
                <ShieldCheck size={17} color={theme.palette.success.main} style={{ marginTop: 2, flexShrink: 0 }} />
                <Typography variant="body2" color="text.secondary">{t('cloud.singleKeyNote')}</Typography>
              </Stack>
              {comparison && (
                <Typography variant="caption" color="text.secondary">
                  localStorage: {t('cloud.records', { count: comparison.local.keyCount })} · Redis:{' '}
                  {t('cloud.records', { count: comparison.remote?.keyCount ?? 0 })}
                </Typography>
              )}
              {runtime.lastSyncedAt && (
                <Stack direction="row" spacing={0.75} alignItems="center">
                  <CheckCircle2 size={15} color={theme.palette.success.main} />
                  <Typography variant="caption" color="text.secondary">
                    {t('cloud.lastSync')}: {dateFormatter.format(new Date(runtime.lastSyncedAt))}
                  </Typography>
                </Stack>
              )}
              {runtime.dirty && <Chip size="small" color="warning" variant="outlined" label={t('cloud.pending')} sx={{ alignSelf: 'flex-start' }} />}
              <Stack direction="row" gap={1} flexWrap="wrap">
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<RefreshCw size={16} />}
                  disabled={!configured || busy}
                  onClick={() => void run(async () => { await refresh(); })}
                >
                  {t('cloud.refresh')}
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<UploadCloud size={16} />}
                  disabled={!configured || busy}
                  onClick={() => setConfirmAction('upload')}
                >
                  {t('cloud.upload')}
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<DownloadCloud size={16} />}
                  disabled={!configured || busy || !comparison?.remoteHasData}
                  onClick={() => setConfirmAction('download')}
                >
                  {t('cloud.download')}
                </Button>
              </Stack>
            </Stack>
          </Box>
        </Stack>
      </Box>

      <Dialog open={confirmAction !== null} onClose={() => setConfirmAction(null)} maxWidth="xs" fullWidth>
        <DialogTitle>
          {confirmAction === 'upload' ? t('cloud.overwriteRemoteTitle') : t('cloud.overwriteLocalTitle')}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            {confirmAction === 'upload' ? t('cloud.overwriteRemoteBody') : t('cloud.overwriteLocalBody')}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setConfirmAction(null)}>{t('cloud.cancel')}</Button>
          <Button variant="contained" onClick={() => void handleConfirmedAction()}>
            {confirmAction === 'upload' ? t('cloud.confirmUpload') : t('cloud.confirmDownload')}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};
