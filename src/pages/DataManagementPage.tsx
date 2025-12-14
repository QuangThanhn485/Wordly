// src/pages/DataManagementPage.tsx
import React, { useState, useCallback } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Button,
  Card,
  CardContent,
  CardActions,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  useTheme,
  LinearProgress,
  Checkbox,
  FormControlLabel,
  Stack,
} from '@mui/material';
import { Database, Upload, Trash2, RotateCcw, CheckCircle } from 'lucide-react';
import { loadVocabCounts, loadVocabFromStorage, loadTreeFromStorage } from '@/features/vocabulary/utils/storageUtils';
import { getAllFileNames } from '@/features/vocabulary/utils/treeUtils';
import { loadMistakesStats } from '@/features/train/train-read-write/mistakesStorage';
import { getLastChangeTimestamp, trackedSetItem, trackedRemoveItem, updateLastChangeTimestamp } from '@/utils/storageTracker';
import { useTranslation } from 'react-i18next';

const BACKUP_TIMESTAMP_KEY = 'wordly_backup_timestamp';

interface BackupData {
  timestamp: number;
  vocabFiles: Record<string, any>;
  vocabIndex: string[];
  vocabCounts: Record<string, number>;
  vocabTree: any;
  mistakesStats: any;
  trainingSessions: {
    reading?: any;
    listening?: any;
    readWrite?: any;
    listenWrite?: any;
  };
}

const DataManagementPage: React.FC = () => {
  const theme = useTheme();
  const { t } = useTranslation('dataManagement');
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [successDialog, setSuccessDialog] = useState<{ title: string; description?: string } | null>(null);

  const showSuccessDialog = useCallback((title: string, description?: string) => {
    setSuccessDialog({ title, description });
  }, []);
  
  // Dialog states
  const [backupDialogOpen, setBackupDialogOpen] = useState(false);
  const [deleteResultDialogOpen, setDeleteResultDialogOpen] = useState(false);
  const [deleteVocabDialogOpen, setDeleteVocabDialogOpen] = useState(false);
  const [deleteAllDialogOpen, setDeleteAllDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  
  // Date picker states
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [deleteAllResults, setDeleteAllResults] = useState(false);
  
  // File input ref
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Check if backup exists (has backup timestamp)
  const hasBackup = () => {
    const timestamp = localStorage.getItem(BACKUP_TIMESTAMP_KEY);
    return !!timestamp;
  };

  // Get backup timestamp
  const getBackupTimestamp = () => {
    const timestamp = localStorage.getItem(BACKUP_TIMESTAMP_KEY);
    return timestamp ? new Date(parseInt(timestamp)) : null;
  };

  // Check if there are any changes after backup by comparing timestamps
  const hasChangesAfterBackup = useCallback(() => {
    if (!hasBackup()) return false;
    
    const backupTimestamp = getBackupTimestamp();
    if (!backupTimestamp) return false;

    try {
      const backupTime = backupTimestamp.getTime();
      const lastChangeTime = getLastChangeTimestamp();
      
      // If no change timestamp exists, assume no changes (first time)
      if (!lastChangeTime) return false;
      
      // If last change is after backup, there are changes
      return lastChangeTime > backupTime;
    } catch (error) {
      console.error('Error checking changes:', error);
      // If we can't check, assume there might be changes for safety
      return true;
    }
  }, []);

  // Backup all data
  const handleBackup = useCallback(() => {
    try {
      setLoading(true);
      
      // Collect all vocab files
      const allVocab = loadVocabFromStorage();
      const vocabFiles: Record<string, any> = allVocab || {};
      const vocabIndex = allVocab ? Object.keys(allVocab) : [];

      // Collect other data
      const vocabCounts = loadVocabCounts();
      const vocabTree = localStorage.getItem('wordly_tree');
      const mistakesStats = loadMistakesStats();
      
      // Collect training sessions
      const trainingSessions = {
        reading: localStorage.getItem('wordly_train_session'),
        listening: localStorage.getItem('wordly_train_listen_session'),
        readWrite: localStorage.getItem('wordly_train_rw_session'),
        listenWrite: localStorage.getItem('wordly_train_lw_session'),
      };

      const backupData: BackupData = {
        timestamp: Date.now(),
        vocabFiles,
        vocabIndex,
        vocabCounts,
        vocabTree: vocabTree ? JSON.parse(vocabTree) : null,
        mistakesStats,
        trainingSessions,
      };

      // Save only backup timestamp (not the full data to save space)
      localStorage.setItem(BACKUP_TIMESTAMP_KEY, backupData.timestamp.toString());

      // Download as file
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `wordly_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showSuccessDialog(t('messages.backupSuccess'));
      setBackupDialogOpen(false);
    } catch (error) {
      console.error('Backup error:', error);
      const errorMessage = error instanceof Error ? error.message : t('messages.unknownError');
      setAlert({ type: 'error', message: t('messages.backupError', { error: errorMessage }) });
    } finally {
      setLoading(false);
    }
  }, [showSuccessDialog]);

  // Delete result data by date range or all
  const handleDeleteResults = useCallback(() => {
    if (!deleteAllResults && (!startDate || !endDate)) {
      setAlert({ type: 'error', message: t('alerts.selectRange') });
      return;
    }

    try {
      setLoading(true);
      const mistakesStats = loadMistakesStats();

      if (deleteAllResults) {
        // Delete all mistakes stats
        trackedRemoveItem('wordly_mistakes_stats');
        const totalCount = Object.keys(mistakesStats).length;
        showSuccessDialog(t('messages.deleteReportsSuccess'));
      } else {
        // Delete by date range
        const startTimestamp = startDate!.getTime();
        const endTimestamp = endDate!.getTime() + 86400000; // End of day

        let deletedCount = 0;
        const updatedStats: typeof mistakesStats = {};

        Object.entries(mistakesStats).forEach(([key, record]) => {
          if (record.lastMistakeTime >= startTimestamp && record.lastMistakeTime < endTimestamp) {
            deletedCount++;
          } else {
            updatedStats[key] = record;
          }
        });

        trackedSetItem('wordly_mistakes_stats', JSON.stringify(updatedStats));
        showSuccessDialog(t('messages.deleteReportsRangeSuccess', { count: deletedCount }));
      }
      
      setDeleteResultDialogOpen(false);
      setStartDate(null);
      setEndDate(null);
      setDeleteAllResults(false);
    } catch (error) {
      console.error('Delete results error:', error);
      const errorMessage = error instanceof Error ? error.message : t('messages.unknownError');
      setAlert({ type: 'error', message: t('messages.deleteReportsError', { error: errorMessage }) });
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, deleteAllResults, showSuccessDialog]);

  // Delete all vocab files and folders
  const handleDeleteVocab = useCallback(() => {
    try {
      setLoading(true);
      
      // Get all vocab files
      const allVocab = loadVocabFromStorage();
      const vocabIndex = allVocab ? Object.keys(allVocab) : [];
      
      // Delete all vocab files
      vocabIndex.forEach((fileName) => {
        trackedRemoveItem(`wordly_vocab_file:${fileName}`);
      });

      // Delete indexes and counts
      trackedRemoveItem('wordly_vocab_index');
      trackedRemoveItem('wordly_vocab_counts');
      trackedRemoveItem('wordly_tree');
      
      showSuccessDialog(t('messages.deleteVocabSuccess', { count: vocabIndex.length }));
      setDeleteVocabDialogOpen(false);
    } catch (error) {
      console.error('Delete vocab error:', error);
      const errorMessage = error instanceof Error ? error.message : t('messages.unknownError');
      setAlert({ type: 'error', message: t('messages.deleteVocabError', { error: errorMessage }) });
    } finally {
      setLoading(false);
    }
  }, [showSuccessDialog]);

  // Delete all data except backup timestamp
  const handleDeleteAllData = useCallback(() => {
    try {
      setLoading(true);
      
      // Save backup timestamp temporarily
      const backupTimestamp = localStorage.getItem(BACKUP_TIMESTAMP_KEY);
      
      // Get all localStorage keys
      const allKeys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          allKeys.push(key);
        }
      }
      
      // Delete all wordly_* keys except backup timestamp
      let deletedCount = 0;
      allKeys.forEach((key) => {
        if (key.startsWith('wordly_') && key !== BACKUP_TIMESTAMP_KEY) {
          trackedRemoveItem(key);
          deletedCount++;
        }
      });
      
      // Restore backup timestamp
      if (backupTimestamp) {
        localStorage.setItem(BACKUP_TIMESTAMP_KEY, backupTimestamp);
      }
      
      showSuccessDialog(t('messages.deleteAllSuccess', { count: deletedCount }));
      setDeleteAllDialogOpen(false);
      
      // Reload page to reflect changes
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      console.error('Delete all data error:', error);
      const errorMessage = error instanceof Error ? error.message : t('messages.unknownError');
      setAlert({ type: 'error', message: t('messages.deleteAllError', { error: errorMessage }) });
    } finally {
      setLoading(false);
    }
  }, [showSuccessDialog]);

  // Import from backup file
  const handleImport = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        setLoading(true);
        const content = e.target?.result as string;
        const backupData: BackupData = JSON.parse(content);

        // Restore vocab files (using trackedSetItem to update timestamp)
        Object.entries(backupData.vocabFiles || {}).forEach(([fileName, data]) => {
          trackedSetItem(`wordly_vocab_file:${fileName}`, JSON.stringify(data));
        });

        // Restore indexes and counts
        if (backupData.vocabIndex) {
          trackedSetItem('wordly_vocab_index', JSON.stringify(backupData.vocabIndex));
        }
        if (backupData.vocabCounts) {
          trackedSetItem('wordly_vocab_counts', JSON.stringify(backupData.vocabCounts));
        }
        if (backupData.vocabTree) {
          trackedSetItem('wordly_tree', JSON.stringify(backupData.vocabTree));
        }

        // Restore mistakes stats
        if (backupData.mistakesStats) {
          trackedSetItem('wordly_mistakes_stats', JSON.stringify(backupData.mistakesStats));
        }

        // Restore training sessions
        if (backupData.trainingSessions) {
          if (backupData.trainingSessions.reading) {
            trackedSetItem('wordly_train_session', backupData.trainingSessions.reading);
          }
          if (backupData.trainingSessions.listening) {
            trackedSetItem('wordly_train_listen_session', backupData.trainingSessions.listening);
          }
          if (backupData.trainingSessions.readWrite) {
            trackedSetItem('wordly_train_rw_session', backupData.trainingSessions.readWrite);
          }
          if (backupData.trainingSessions.listenWrite) {
            trackedSetItem('wordly_train_lw_session', backupData.trainingSessions.listenWrite);
          }
        }

        // Update backup timestamp to match imported data
        if (backupData.timestamp) {
          localStorage.setItem(BACKUP_TIMESTAMP_KEY, backupData.timestamp.toString());
          updateLastChangeTimestamp(backupData.timestamp);
        } else {
          updateLastChangeTimestamp();
        }

        showSuccessDialog(t('messages.restoreSuccess'));
        setImportDialogOpen(false);
        
        // Reload page to reflect changes
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } catch (error) {
        console.error('Import error:', error);
        const errorMessage = error instanceof Error ? error.message : t('messages.unknownError');
        setAlert({ type: 'error', message: t('messages.restoreError', { error: errorMessage }) });
      } finally {
        setLoading(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };
    reader.readAsText(file);
  }, [showSuccessDialog]);

  const backupTimestamp = getBackupTimestamp();
  const tree = loadTreeFromStorage();
  const vocabCounts = loadVocabCounts();
  
  // Get ALL file names from tree structure (including nested folders)
  const allFileNames = tree ? getAllFileNames(tree) : [];
  const totalVocabFiles = allFileNames.length;
  
  // Calculate total words from wordly_vocab_counts quickly without loading each file
  const totalVocabWords = allFileNames.reduce((sum, fileName) => sum + (vocabCounts[fileName] || 0), 0);
  
  const hasChanges = hasChangesAfterBackup();

  return (
    <Box
        sx={{
          width: '100%',
          minHeight: '100vh',
          bgcolor: 'background.default',
          py: { xs: 2, sm: 3, md: 4 },
        }}
      >
        <Container maxWidth="lg">
          {/* Header */}
          <Box sx={{ mb: { xs: 3, sm: 4 } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
              <Database size={40} style={{ color: 'inherit' }} />
              <Typography
                variant="h4"
                fontWeight={700}
                sx={{
                  fontSize: { xs: '1.5rem', sm: '2rem', md: '2.5rem' },
                }}
              >
                {t('title')}
              </Typography>
            </Box>
            <Typography
              variant="body1"
              color="text.secondary"
              sx={{
                fontSize: { xs: '0.875rem', sm: '1rem' },
              }}
            >
              {t('backup.subtitle')}
            </Typography>
          </Box>

          {/* Alert */}
          {alert && (
            <Alert
              severity={alert.type}
              onClose={() => setAlert(null)}
              sx={{ mb: 3 }}
            >
              {alert.message}
            </Alert>
          )}

          {/* Success Popup */}
          {successDialog && (
            <Dialog
              open
              onClose={() => setSuccessDialog(null)}
              maxWidth="xs"
              fullWidth
              PaperProps={{
                sx: {
                  textAlign: 'center',
                  p: 3,
                  borderRadius: 3,
                },
              }}
            >
              <DialogContent>
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 2,
                  }}
                >
                  <Box
                    sx={{
                      width: 72,
                      height: 72,
                      borderRadius: '50%',
                      bgcolor: 'success.light',
                      color: 'success.dark',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <CheckCircle size={36} />
                  </Box>
                  <Typography variant="h6" fontWeight={700}>
                    {successDialog.title}
                  </Typography>
                  {successDialog.description && (
                    <Typography variant="body1" color="text.secondary">
                      {successDialog.description}
                    </Typography>
                  )}
                </Box>
              </DialogContent>
              <DialogActions sx={{ px: 3, pb: 2 }}>
                <Button variant="contained" fullWidth onClick={() => setSuccessDialog(null)}>
                  {t('buttons.close')}
                </Button>
              </DialogActions>
            </Dialog>
          )}

          {/* Statistics Cards */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
              gap: 2,
              mb: 4,
            }}
          >
            <Card>
              <CardContent>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {t('stats.vocabFiles')}
                </Typography>
                <Typography variant="h4" fontWeight={700}>
                  {totalVocabFiles}
                </Typography>
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {t('stats.vocabWords')}
                </Typography>
                <Typography variant="h4" fontWeight={700}>
                  {totalVocabWords}
                </Typography>
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {t('stats.backupStatus')}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                  {hasBackup() ? (
                    <>
                      <CheckCircle size={20} color="green" />
                      <Typography variant="body2">
                        {backupTimestamp?.toLocaleDateString('vi-VN')}
                      </Typography>
                    </>
                  ) : (
                    <Typography variant="body2">{t('stats.noBackup')}</Typography>
                  )}
                </Box>
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {t('stats.storageUsage')}
                </Typography>
                <Typography variant="h4" fontWeight={700}>
                  {(JSON.stringify(localStorage).length / 1024).toFixed(2)} KB
                </Typography>
              </CardContent>
            </Card>
          </Box>
          {/* Action Cards */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
              gap: 3,
              mb: 3,
            }}
          >
            {/* Backup Card */}
            <Card sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <CardContent sx={{ flex: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <Upload size={32} color="currentColor" style={{ color: 'inherit' }} />
                  <Box>
                    <Typography variant="h6" fontWeight={600}>
                      {t('backup.title')}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {t('backup.description')}
                    </Typography>
                  </Box>
                </Box>
                {hasBackup() && backupTimestamp && (
                  <Alert severity="info" sx={{ mb: 2 }}>
                    {t('backup.createdAt', { timestamp: backupTimestamp.toLocaleString('vi-VN') })}
                  </Alert>
                )}
              </CardContent>
              <CardActions sx={{ px: 2, pb: 2, mt: 'auto' }}>
                <Button
                  variant="contained"
                  startIcon={<Upload size={20} />}
                  onClick={() => setBackupDialogOpen(true)}
                  fullWidth
                >
                  {t('buttons.startBackup')}
                </Button>
              </CardActions>
            </Card>

            {/* Import Card */}
            <Card sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <CardContent sx={{ flex: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <RotateCcw size={32} color="currentColor" style={{ color: 'inherit' }} />
                  <Box>
                    <Typography variant="h6" fontWeight={600}>
                      {t('restore.title')}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {t('restore.description')}
                    </Typography>
                  </Box>
                </Box>
                <Alert severity="warning" sx={{ mb: 2 }}>
                  {t('backup.warning')}
                </Alert>
              </CardContent>
              <CardActions sx={{ px: 2, pb: 2, mt: 'auto' }}>
                <Button
                  variant="outlined"
                  startIcon={<RotateCcw size={20} />}
                  onClick={() => {
                    setImportDialogOpen(true);
                    setTimeout(() => fileInputRef.current?.click(), 100);
                  }}
                  fullWidth
                >
                  {t('restore.button')}
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  style={{ display: 'none' }}
                  onChange={handleImport}
                />
              </CardActions>
            </Card>
            {/* Delete Results Card */}
            <Card sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <CardContent sx={{ flex: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <Trash2 size={32} color="currentColor" style={{ color: 'inherit' }} />
                  <Box>
                    <Typography variant="h6" fontWeight={600}>
                      {t('delete.deleteReports')}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {t('delete.deleteReportsDescription')}
                    </Typography>
                  </Box>
                </Box>
                <Alert severity="warning" sx={{ mb: 2 }}>
                  {t('alerts.irreversible')}
                </Alert>
              </CardContent>
              <CardActions sx={{ px: 2, pb: 2, mt: 'auto' }}>
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<Trash2 size={20} />}
                  onClick={() => setDeleteResultDialogOpen(true)}
                  fullWidth
                >
                  {t('buttons.startDeleteReports')}
                </Button>
              </CardActions>
            </Card>

            {/* Delete Vocab Card */}
            <Card sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <CardContent sx={{ flex: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <Trash2 size={32} color="currentColor" style={{ color: 'inherit' }} />
                  <Box>
                    <Typography variant="h6" fontWeight={600}>
                      {t('delete.deleteVocab')}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {t('delete.deleteVocabDescription')}
                    </Typography>
                  </Box>
                </Box>
                <Alert severity="error" sx={{ mb: 2 }}>
                  {!hasBackup() ? (
                    <Typography variant="body2">{t('alerts.mustBackupVocab')}</Typography>
                  ) : hasChanges ? (
                    <Typography variant="body2">{t('alerts.hasChanges')}</Typography>
                  ) : (
                    <Box>
                      <Typography variant="body2" fontWeight={600} gutterBottom>
                        {t('dialogs.deleteVocabChecked')}
                      </Typography>
                      <Typography variant="body2" component="div">
                        {t('delete.keepBackupNote')}
                      </Typography>
                      {backupTimestamp && (
                        <Typography variant="body2" sx={{ mt: 1, fontStyle: 'italic' }}>
                          {t('stats.lastBackup')}: {backupTimestamp.toLocaleString('vi-VN')}
                        </Typography>
                      )}
                    </Box>
                  )}
                </Alert>
              </CardContent>
              <CardActions sx={{ px: 2, pb: 2, mt: 'auto' }}>
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<Trash2 size={20} />}
                  onClick={() => {
                    if (!hasBackup()) {
                      setAlert({ type: 'error', message: t('alerts.mustBackupVocab') });
                      return;
                    }
                    if (hasChanges) {
                      setAlert({ type: 'error', message: t('alerts.hasChanges') });
                      return;
                    }
                    setDeleteVocabDialogOpen(true);
                  }}
                  fullWidth
                  disabled={!hasBackup() || hasChanges}
                >
                  {t('buttons.startDeleteVocab')}
              </Button>
            </CardActions>
          </Card>
          </Box>

          {/* Delete All Data Card - Full Width */}
          <Card sx={{ border: `2px solid ${theme.palette.error.main}40`, display: 'flex', flexDirection: 'column' }}>
            <CardContent sx={{ flex: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Trash2 size={40} color="currentColor" style={{ color: 'inherit' }} />
                <Box>
                  <Typography variant="h6" fontWeight={700} color="error">
                    {t('delete.deleteAll')}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t('delete.deleteAllDescription')}
                  </Typography>
                </Box>
              </Box>
              <Alert severity="error" sx={{ mb: 2 }}>
                {!hasBackup() ? (
                  <Typography variant="body2">{t('alerts.mustBackupFirst')}</Typography>
                ) : hasChanges ? (
                  <Typography variant="body2">{t('alerts.hasChanges')}</Typography>
                ) : (
                  <Box>
                    <Typography variant="body1" fontWeight={600} gutterBottom>
                      {t('dialogs.deleteAllWarning')}
                    </Typography>
                    <Typography variant="body2" component="div">
                      {t('dialogs.deleteAllList')}
                    </Typography>
                    <Typography variant="body2" fontWeight={600} color="success.main" sx={{ mt: 1 }}>
                      {t('delete.keepBackupNote')}
                    </Typography>
                    {backupTimestamp && (
                      <Typography variant="body2" sx={{ mt: 1, fontStyle: 'italic' }}>
                        {t('stats.lastBackup')}: {backupTimestamp.toLocaleString('vi-VN')}
                      </Typography>
                    )}
                  </Box>
                )}
              </Alert>
            </CardContent>
            <CardActions sx={{ px: 2, pb: 2, mt: 'auto' }}>
              <Button
                variant="contained"
                color="error"
                startIcon={<Trash2 size={20} />}
                onClick={() => {
                  if (!hasBackup()) {
                    setAlert({ type: 'error', message: t('alerts.mustBackupFirst') });
                    return;
                  }
                  if (hasChanges) {
                    setAlert({ type: 'error', message: t('alerts.hasChanges') });
                    return;
                  }
                  setDeleteAllDialogOpen(true);
                }}
                fullWidth
                disabled={!hasBackup() || hasChanges}
                size="large"
              >
                {t('buttons.startDeleteAll')}
              </Button>
            </CardActions>
          </Card>

          {/* Loading Overlay */}
          {loading && (
            <Box
              sx={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                bgcolor: 'rgba(0, 0, 0, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 9999,
              }}
            >
              <Paper sx={{ p: 4, minWidth: 300 }}>
                <Typography variant="h6" gutterBottom>
                  {t('messages.processing')}
                </Typography>
                <LinearProgress sx={{ mt: 2 }} />
              </Paper>
            </Box>
          )}

          {/* Backup Dialog */}
          <Dialog open={backupDialogOpen} onClose={() => setBackupDialogOpen(false)} maxWidth="sm" fullWidth>
            <DialogTitle>{t('dialogs.backupConfirmTitle')}</DialogTitle>
            <DialogContent>
              <Typography>{t('dialogs.backupConfirmMessage')}</Typography>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setBackupDialogOpen(false)}>{t('buttons.cancel')}</Button>
              <Button variant="contained" onClick={handleBackup}>
                {t('buttons.confirm')}
              </Button>
            </DialogActions>
          </Dialog>

          {/* Delete Results Dialog */}
          <Dialog open={deleteResultDialogOpen} onClose={() => setDeleteResultDialogOpen(false)} maxWidth="sm" fullWidth>
            <DialogTitle>{t('dialogs.deleteReportsTitle')}</DialogTitle>
            <DialogContent>
              <Stack spacing={3} sx={{ mt: 1 }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={deleteAllResults}
                      onChange={(e) => {
                        setDeleteAllResults(e.target.checked);
                        if (e.target.checked) {
                          setStartDate(null);
                          setEndDate(null);
                        }
                      }}
                    />
                  }
                  label={<Typography variant="body1" fontWeight={600}>{t('dialogs.deleteReportsAll')}</Typography>}
                />
                {!deleteAllResults && (
                  <>
                    <TextField
                      label={t('dialogs.fromDate')}
                      type="date"
                      value={startDate ? startDate.toISOString().split('T')[0] : ''}
                      onChange={(e) => setStartDate(e.target.value ? new Date(e.target.value) : null)}
                      fullWidth
                      InputLabelProps={{
                        shrink: true,
                      }}
                    />
                    <TextField
                      label={t('dialogs.toDate')}
                      type="date"
                      value={endDate ? endDate.toISOString().split('T')[0] : ''}
                      onChange={(e) => setEndDate(e.target.value ? new Date(e.target.value) : null)}
                      fullWidth
                      InputLabelProps={{
                        shrink: true,
                      }}
                    />
                  </>
                )}
                <Alert severity={deleteAllResults ? 'error' : 'warning'}>
                  <Typography variant="body2">
                    {deleteAllResults ? t('alerts.irreversible') : t('alerts.deleteRangeConfirm')}
                  </Typography>
                </Alert>
              </Stack>
            </DialogContent>
            <DialogActions>
              <Button
                onClick={() => {
                  setDeleteResultDialogOpen(false);
                  setStartDate(null);
                  setEndDate(null);
                  setDeleteAllResults(false);
                }}
              >
                {t('dialogs.deleteReportsCancel')}
              </Button>
              <Button
                variant="contained"
                color="error"
                onClick={handleDeleteResults}
                disabled={!deleteAllResults && (!startDate || !endDate)}
              >
                {t('dialogs.deleteReportsCta')}
              </Button>
            </DialogActions>
          </Dialog>

          {/* Delete Vocab Dialog */}
          <Dialog open={deleteVocabDialogOpen} onClose={() => setDeleteVocabDialogOpen(false)} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ color: 'error.main' }}>{t('dialogs.deleteVocabTitle')}</DialogTitle>
            <DialogContent>
              {!hasBackup() ? (
                <Alert severity="error" sx={{ mb: 2 }}>
                  <Typography variant="body1" fontWeight={600}>{t('dialogs.deleteVocabNoBackup')}</Typography>
                  <Typography variant="body2" sx={{ mt: 1 }}>{t('dialogs.deleteVocabNoBackupDesc')}</Typography>
                </Alert>
              ) : hasChanges ? (
                <Alert severity="error" sx={{ mb: 2 }}>
                  <Typography variant="body1" fontWeight={600}>{t('dialogs.deleteVocabHasChanges')}</Typography>
                  <Typography variant="body2" sx={{ mt: 1 }}>{t('dialogs.deleteVocabHasChangesDesc')}</Typography>
                  {backupTimestamp && (
                    <Typography variant="body2" sx={{ mt: 1, fontStyle: 'italic' }}>{t('stats.lastBackup')}: {backupTimestamp.toLocaleString('vi-VN')}</Typography>
                  )}
                </Alert>
              ) : (
                <Alert severity="error" sx={{ mb: 2 }}>
                  <Typography variant="body1" fontWeight={600} gutterBottom>{t('dialogs.deleteVocabChecked')}</Typography>
                  <Typography variant="body2" component="div">{t('delete.keepBackupNote')}</Typography>
                  <Typography variant="body2" sx={{ mt: 1, fontWeight: 600 }}>{t('alerts.irreversible')}</Typography>
                  {backupTimestamp && (
                    <Typography variant="body2" sx={{ mt: 1, fontStyle: 'italic' }}>{t('stats.lastBackup')}: {backupTimestamp.toLocaleString('vi-VN')}</Typography>
                  )}
                </Alert>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDeleteVocabDialogOpen(false)}>{t('dialogs.deleteVocabCancel')}</Button>
              <Button
                variant="contained"
                color="error"
                onClick={handleDeleteVocab}
                disabled={!hasBackup() || hasChanges}
              >
                {t('dialogs.deleteVocabCta')}
              </Button>
            </DialogActions>
          </Dialog>

          {/* Import Dialog */}
          <Dialog open={importDialogOpen} onClose={() => setImportDialogOpen(false)} maxWidth="sm" fullWidth>
            <DialogTitle>{t('dialogs.restoreTitle')}</DialogTitle>
            <DialogContent>
              <Alert severity="warning" sx={{ mb: 2 }}>
                {t('dialogs.restoreWarning')}
              </Alert>
              <Button
                variant="outlined"
                component="label"
                fullWidth
                startIcon={<RotateCcw size={20} />}
              >
                {t('restore.fileLabel')}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  hidden
                  onChange={handleImport}
                />
              </Button>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setImportDialogOpen(false)}>{t('dialogs.restoreClose')}</Button>
            </DialogActions>
          </Dialog>

          {/* Delete All Data Dialog */}
          <Dialog open={deleteAllDialogOpen} onClose={() => setDeleteAllDialogOpen(false)} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ color: 'error.main' }}>{t('dialogs.deleteAllTitle')}</DialogTitle>
            <DialogContent>
              {!hasBackup() ? (
                <Alert severity="error" sx={{ mb: 2 }}>
                  <Typography variant="body1" fontWeight={600}>{t('alerts.noBackup')}</Typography>
                  <Typography variant="body2" sx={{ mt: 1 }}>{t('alerts.mustBackupFirst')}</Typography>
                </Alert>
              ) : hasChanges ? (
                <Alert severity="error" sx={{ mb: 2 }}>
                  <Typography variant="body1" fontWeight={600}>{t('alerts.hasChanges')}</Typography>
                  {backupTimestamp && (
                    <Typography variant="body2" sx={{ mt: 1, fontStyle: 'italic' }}>{t('stats.lastBackup')}: {backupTimestamp.toLocaleString('vi-VN')}</Typography>
                  )}
                </Alert>
              ) : (
                <>
                  <Alert severity="error" sx={{ mb: 2 }}>
                    <Typography variant="body1" fontWeight={600} gutterBottom>{t('dialogs.deleteAllWarning')}</Typography>
                    <Typography variant="body2" component="div">{t('dialogs.deleteAllList')}</Typography>
                    <Typography variant="body2" sx={{ mt: 1, fontWeight: 600 }}>{t('alerts.irreversible')}</Typography>
                  </Alert>
                  <Alert severity="info">
                    <Typography variant="body2">{t('delete.keepBackupNote')}</Typography>
                    {backupTimestamp && (
                      <Typography variant="body2" sx={{ mt: 1, fontStyle: 'italic' }}>{t('stats.lastBackup')}: {backupTimestamp.toLocaleString('vi-VN')}</Typography>
                    )}
                  </Alert>
                </>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDeleteAllDialogOpen(false)}>{t('dialogs.deleteAllCancel')}</Button>
              <Button
                variant="contained"
                color="error"
                onClick={handleDeleteAllData}
                disabled={!hasBackup() || hasChanges}
              >
                {t('dialogs.deleteAllCta')}
              </Button>
            </DialogActions>
          </Dialog>
        </Container>
      </Box>
    );
};

export default DataManagementPage;
