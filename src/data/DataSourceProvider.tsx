import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Snackbar,
  Stack,
  Typography,
} from '@mui/material';
import { AlertTriangle, Cloud, HardDrive, RefreshCw } from 'lucide-react';
import {
  addCloudSyncListener,
  compareLocalAndRemote,
  downloadUpstashToLocal,
  flushPendingCloudSync,
  getCloudSyncRuntime,
  getDataSourceConfig,
  getStorageErrorMessage,
  parseUpstashConfigInput,
  saveDataSourceConfig,
  setDataSourceMode,
  startCloudWriteThrough,
  stopCloudWriteThrough,
  uploadLocalToUpstash,
  type CloudSyncRuntime,
  type DataSourceConfig,
  type DataSourceMode,
  type StorageComparison,
  type UpstashConfig,
} from './dataSource';

type PendingDecision = {
  kind: 'activate-upstash' | 'activate-local' | 'boot-conflict';
  comparison: StorageComparison;
  upstash: UpstashConfig;
} | null;

type DataSourceContextValue = {
  config: DataSourceConfig;
  comparison: StorageComparison | null;
  runtime: CloudSyncRuntime;
  busy: boolean;
  saveUpstash: (config: UpstashConfig) => Promise<StorageComparison>;
  activateMode: (mode: DataSourceMode) => Promise<void>;
  refresh: () => Promise<StorageComparison | null>;
  uploadLocal: () => Promise<void>;
  downloadRemote: () => Promise<void>;
};

const asSyncedComparison = (
  manifest: StorageComparison['local'],
): StorageComparison => ({
  local: manifest,
  remote: manifest,
  localValid: true,
  remoteHasData: true,
  relation: 'same',
});

const DataSourceContext = createContext<DataSourceContextValue | null>(null);

const reloadSoon = (): void => {
  window.setTimeout(() => window.location.reload(), 180);
};

export const DataSourceProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [config, setConfig] = useState<DataSourceConfig>(() => getDataSourceConfig());
  const [comparison, setComparison] = useState<StorageComparison | null>(null);
  const [runtime, setRuntime] = useState<CloudSyncRuntime>(() => getCloudSyncRuntime());
  const [busy, setBusy] = useState(false);
  const [bootState, setBootState] = useState<'checking' | 'ready' | 'error'>(() =>
    getDataSourceConfig().mode === 'upstash' ? 'checking' : 'ready',
  );
  const [bootError, setBootError] = useState<string | null>(null);
  const [pendingDecision, setPendingDecision] = useState<PendingDecision>(null);
  const [syncErrorOpen, setSyncErrorOpen] = useState(false);
  const bootStartedRef = useRef(false);

  const reloadConfig = useCallback(() => {
    const next = getDataSourceConfig();
    setConfig(next);
    return next;
  }, []);

  useEffect(
    () =>
      addCloudSyncListener(() => {
        const nextRuntime = getCloudSyncRuntime();
        setRuntime(nextRuntime);
        setConfig(getDataSourceConfig());
        if (nextRuntime.status === 'error' && nextRuntime.error) {
          setSyncErrorOpen(true);
        }
      }),
    [],
  );

  const refresh = useCallback(async (): Promise<StorageComparison | null> => {
    const current = reloadConfig();
    if (!current.upstash) {
      setComparison(null);
      return null;
    }
    const next = await compareLocalAndRemote(current.upstash);
    setComparison(next);
    return next;
  }, [reloadConfig]);

  const runBootCheck = useCallback(async () => {
    const current = reloadConfig();
    stopCloudWriteThrough();
    if (current.mode !== 'upstash') {
      startCloudWriteThrough();
      setBootState('ready');
      setBootError(null);
      return;
    }
    if (!current.upstash) {
      setBootError('Chưa cấu hình REST URL và token cho Upstash Redis.');
      setBootState('error');
      return;
    }

    setBootState('checking');
    setBootError(null);
    try {
      const next = await compareLocalAndRemote(current.upstash);
      setComparison(next);

      if (!next.remoteHasData) {
        await uploadLocalToUpstash(current.upstash, {
          force: true,
          expectedRemoteRevision: null,
        });
        startCloudWriteThrough();
        setBootState('ready');
        return;
      }
      if (next.relation === 'same') {
        startCloudWriteThrough();
        setBootState('ready');
        return;
      }
      if (next.relation === 'local-newer') {
        await uploadLocalToUpstash(current.upstash);
        startCloudWriteThrough();
        setBootState('ready');
        return;
      }
      if (next.relation === 'diverged') {
        setPendingDecision({
          kind: 'boot-conflict',
          comparison: next,
          upstash: current.upstash,
        });
        setBootState('ready');
        return;
      }

      await downloadUpstashToLocal(current.upstash, {
        expectedLocalRevision: next.local.revision,
      });
      reloadSoon();
    } catch (error) {
      setBootError(
        getStorageErrorMessage(error, 'Không thể khởi tạo dữ liệu từ Upstash Redis.'),
      );
      setBootState('error');
    }
  }, [reloadConfig]);

  useEffect(() => {
    if (!bootStartedRef.current) {
      bootStartedRef.current = true;
      void runBootCheck();
    }
    return () => stopCloudWriteThrough();
  }, [runBootCheck]);

  const saveUpstash = useCallback(
    async (input: UpstashConfig): Promise<StorageComparison> => {
      const upstash = parseUpstashConfigInput(input.url, input.token);
      const current = getDataSourceConfig();
      if (current.mode === 'upstash') {
        throw new Error('Hãy chuyển sang localStorage trước khi thay đổi cấu hình Redis.');
      }
      setBusy(true);
      try {
        saveDataSourceConfig({
          ...current,
          upstash,
          updatedAt: Date.now(),
        });
        reloadConfig();
        const next = await compareLocalAndRemote(upstash);
        if (!next.remoteHasData) {
          const manifest = await uploadLocalToUpstash(upstash, {
            force: true,
            expectedRemoteRevision: null,
          });
          const synced = asSyncedComparison(manifest);
          setComparison(synced);
          return synced;
        }
        setComparison(next);
        return next;
      } finally {
        setBusy(false);
      }
    },
    [reloadConfig],
  );

  const activateMode = useCallback(
    async (mode: DataSourceMode): Promise<void> => {
      const current = getDataSourceConfig();
      if (mode === current.mode) return;
      setBusy(true);
      try {
        if (mode === 'localStorage') {
          stopCloudWriteThrough();
          try {
            await flushPendingCloudSync();
          } catch {
            // The comparison below decides the safe direction after a failed flush.
          }
          if (!current.upstash) {
            setDataSourceMode('localStorage');
            reloadConfig();
            startCloudWriteThrough();
            return;
          }
          let next: StorageComparison;
          try {
            next = await compareLocalAndRemote(current.upstash);
          } catch (error) {
            setDataSourceMode('localStorage', current.upstash);
            reloadConfig();
            startCloudWriteThrough();
            throw new Error(
              `Đã chuyển sang localStorage nhưng không thể kiểm tra Redis. ${getStorageErrorMessage(
                error,
                'Dữ liệu local được giữ nguyên; hãy kiểm tra lại Redis khi kết nối ổn định.',
              )}`,
            );
          }
          setComparison(next);
          if (next.relation === 'remote-newer' || next.relation === 'diverged') {
            setPendingDecision({
              kind: 'activate-local',
              comparison: next,
              upstash: current.upstash,
            });
            return;
          }
          setDataSourceMode('localStorage', current.upstash);
          reloadConfig();
          startCloudWriteThrough();
          return;
        }

        if (!current.upstash) {
          throw new Error('Hãy lưu và kiểm tra cấu hình Upstash Redis trước.');
        }
        const next = await compareLocalAndRemote(current.upstash);
        setComparison(next);
        if (!next.remoteHasData) {
          await uploadLocalToUpstash(current.upstash, {
            force: true,
            expectedRemoteRevision: null,
          });
          setDataSourceMode('upstash', current.upstash);
          reloadConfig();
          startCloudWriteThrough();
          return;
        }
        if (next.relation === 'same') {
          setDataSourceMode('upstash', current.upstash);
          reloadConfig();
          startCloudWriteThrough();
          return;
        }
        setPendingDecision({
          kind: 'activate-upstash',
          comparison: next,
          upstash: current.upstash,
        });
      } catch (error) {
        if (getDataSourceConfig().mode === 'upstash') startCloudWriteThrough();
        throw error;
      } finally {
        setBusy(false);
      }
    },
    [reloadConfig],
  );

  const uploadLocal = useCallback(async () => {
    const current = getDataSourceConfig();
    if (!current.upstash) throw new Error('Chưa cấu hình Upstash Redis.');
    if (comparison?.relation === 'same') return;
    setBusy(true);
    try {
      const expectedRemoteRevision = comparison?.remote?.revision ?? null;
      const manifest = await uploadLocalToUpstash(current.upstash, {
        force: true,
        ...(comparison ? { expectedRemoteRevision } : {}),
      });
      setComparison(asSyncedComparison(manifest));
    } finally {
      setBusy(false);
    }
  }, [comparison]);

  const downloadRemote = useCallback(async () => {
    const current = getDataSourceConfig();
    if (!current.upstash) throw new Error('Chưa cấu hình Upstash Redis.');
    setBusy(true);
    try {
      const manifest = await downloadUpstashToLocal(current.upstash);
      if (!manifest) throw new Error('Redis chưa có snapshot Wordly.');
      reloadSoon();
    } finally {
      setBusy(false);
    }
  }, []);

  const resolveUseRemote = useCallback(async () => {
    if (!pendingDecision) return;
    setBusy(true);
    try {
      await downloadUpstashToLocal(pendingDecision.upstash, {
        expectedLocalRevision: pendingDecision.comparison.local.revision,
      });
      const nextMode = pendingDecision.kind === 'activate-local' ? 'localStorage' : 'upstash';
      setDataSourceMode(nextMode, pendingDecision.upstash);
      setPendingDecision(null);
      reloadSoon();
    } catch {
      setSyncErrorOpen(true);
    } finally {
      setBusy(false);
    }
  }, [pendingDecision]);

  const resolveUploadLocal = useCallback(async () => {
    if (!pendingDecision) return;
    setBusy(true);
    try {
      await uploadLocalToUpstash(pendingDecision.upstash, {
        force: true,
        expectedRemoteRevision: pendingDecision.comparison.remote?.revision ?? null,
      });
      setDataSourceMode('upstash', pendingDecision.upstash);
      reloadConfig();
      setPendingDecision(null);
      startCloudWriteThrough();
      setBootState('ready');
    } catch {
      setSyncErrorOpen(true);
    } finally {
      setBusy(false);
    }
  }, [pendingDecision, reloadConfig]);

  const resolveKeepLocal = useCallback(() => {
    if (!pendingDecision) return;
    setDataSourceMode('localStorage', pendingDecision.upstash);
    reloadConfig();
    setPendingDecision(null);
    setBootState('ready');
    startCloudWriteThrough();
  }, [pendingDecision, reloadConfig]);

  const cancelDecision = useCallback(() => {
    if (pendingDecision?.kind === 'boot-conflict') {
      resolveKeepLocal();
      return;
    }
    if (pendingDecision?.kind === 'activate-local') {
      setPendingDecision(null);
      void runBootCheck();
      return;
    }
    setPendingDecision(null);
  }, [pendingDecision, resolveKeepLocal, runBootCheck]);

  const value = useMemo<DataSourceContextValue>(
    () => ({
      config,
      comparison,
      runtime,
      busy,
      saveUpstash,
      activateMode,
      refresh,
      uploadLocal,
      downloadRemote,
    }),
    [
      activateMode,
      busy,
      comparison,
      config,
      downloadRemote,
      refresh,
      runtime,
      saveUpstash,
      uploadLocal,
    ],
  );

  const blockApp =
    bootState !== 'ready' || pendingDecision?.kind === 'boot-conflict';
  const decisionTitle = pendingDecision?.kind === 'activate-local'
    ? 'Redis có dữ liệu khác localStorage'
    : 'Phát hiện hai phiên bản dữ liệu';

  return (
    <DataSourceContext.Provider value={value}>
      {!blockApp ? children : (
        <Box
          sx={{
            minHeight: '100vh',
            display: 'grid',
            placeItems: 'center',
            bgcolor: 'background.default',
            p: 2,
          }}
        >
          <Paper variant="outlined" sx={{ width: 'min(440px, 100%)', p: 3, borderRadius: 2 }}>
            <Stack spacing={2.25}>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Box sx={{ color: bootState === 'error' ? 'error.main' : 'primary.main' }}>
                  {bootState === 'error' ? <AlertTriangle size={24} /> : <Cloud size={24} />}
                </Box>
                <Box>
                  <Typography variant="h6" fontWeight={700}>
                    {bootState === 'error' ? 'Không thể mở dữ liệu cloud' : 'Đang tải dữ liệu Wordly'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {bootState === 'error'
                      ? bootError
                      : 'Đang kiểm tra snapshot Upstash Redis trước khi mở ứng dụng.'}
                  </Typography>
                </Box>
              </Stack>
              {bootState === 'checking' ? <CircularProgress size={26} /> : (
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                  <Button
                    variant="contained"
                    startIcon={<RefreshCw size={17} />}
                    onClick={() => void runBootCheck()}
                  >
                    Thử lại
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<HardDrive size={17} />}
                    onClick={() => {
                      const current = getDataSourceConfig();
                      setDataSourceMode('localStorage', current.upstash);
                      reloadConfig();
                      startCloudWriteThrough();
                      setBootState('ready');
                    }}
                  >
                    Dùng localStorage
                  </Button>
                </Stack>
              )}
            </Stack>
          </Paper>
        </Box>
      )}

      <Dialog open={Boolean(pendingDecision)} onClose={busy ? undefined : cancelDecision} maxWidth="sm" fullWidth>
        <DialogTitle>{decisionTitle}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 0.5 }}>
            <Alert severity="warning" variant="outlined">
              Hai nguồn không giống nhau. Wordly sẽ không tự ghi đè cho đến khi bạn chọn phiên bản cần giữ.
            </Alert>
            {pendingDecision && (
              <Stack spacing={1}>
                <Stack direction="row" justifyContent="space-between" gap={2}>
                  <Typography variant="body2">localStorage</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {pendingDecision.comparison.local.keyCount} record
                  </Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between" gap={2}>
                  <Typography variant="body2">Upstash Redis</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {pendingDecision.comparison.remote?.keyCount ?? 0} record
                  </Typography>
                </Stack>
              </Stack>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, flexWrap: 'wrap' }}>
          <Button onClick={cancelDecision} disabled={busy}>Hủy</Button>
          {pendingDecision?.kind === 'activate-local' ? (
            <Button variant="outlined" onClick={resolveKeepLocal} disabled={busy}>
              Giữ dữ liệu local
            </Button>
          ) : (
            <Button variant="outlined" onClick={() => void resolveUploadLocal()} disabled={busy}>
              Đẩy local lên Redis
            </Button>
          )}
          <Button variant="contained" onClick={() => void resolveUseRemote()} disabled={busy}>
            Dùng dữ liệu Redis
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={syncErrorOpen}
        autoHideDuration={8000}
        onClose={() => setSyncErrorOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity="error" variant="filled" onClose={() => setSyncErrorOpen(false)}>
          {runtime.error || 'Đồng bộ Upstash Redis thất bại. Dữ liệu vẫn được giữ trên thiết bị.'}
        </Alert>
      </Snackbar>
    </DataSourceContext.Provider>
  );
};

export const useDataSource = (): DataSourceContextValue => {
  const context = useContext(DataSourceContext);
  if (!context) throw new Error('useDataSource must be used inside DataSourceProvider.');
  return context;
};
