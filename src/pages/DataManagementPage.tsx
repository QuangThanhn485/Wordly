// src/pages/DataManagementPage.tsx
import React, { useState, useCallback } from 'react';
import {
  Alert,
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Backdrop,
  Box,
  Button,
  Checkbox,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  TextField,
  LinearProgress,
  FormControlLabel,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { AlertTriangle, ArrowRight, BookOpen, CalendarDays, CalendarRange, CheckCircle, ChevronDown, Clock, Database, Folder, HardDrive, RotateCcw, Trash2, Upload } from 'lucide-react';
import {
  clearVocabularyTopics,
  loadVocabularyTopicCounts,
  loadTreeFromStorage,
  syncAllVocabularyTopicCounts,
} from '@/features/vocabulary/utils/storageUtils';
import { getAllTopicIds } from '@/features/vocabulary/utils/treeUtils';
import {
  loadMistakesStats,
  saveMistakesStats,
} from '@/features/train/train-read-write/mistakesStorage';
import { useTranslation } from 'react-i18next';
import {
  clearDatabase,
  createDatabaseBackup,
  flushPendingCloudSync,
  getDatabaseUsageBytes,
  loadBackupMetadata,
  restoreDatabaseBackup,
  saveBackupMetadata,
} from '@/data';
import { DataSourceSettings } from '@/features/data/components/DataSourceSettings';
import { MOBILE_PAGE_VIEWPORT_HEIGHT } from '@/layouts/mobileLayoutConstants';

const DataManagementPage: React.FC = () => {
  const theme = useTheme();
  const { t, i18n } = useTranslation('dataManagement');
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
  const [deleteSectionExpanded, setDeleteSectionExpanded] = useState(false);
  
  // Date picker states
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  type DeleteReportsPreset = 'all' | 'today' | 'last7days' | 'last4hours' | 'last1hour';
  const [deleteReportsPreset, setDeleteReportsPreset] = useState<DeleteReportsPreset | null>(null);
  
  // File input ref
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const getBackupTimestamp = () => {
    const timestamp = loadBackupMetadata().lastBackupAt;
    return timestamp ? new Date(timestamp) : null;
  };

  // Backup all data
  const handleBackup = useCallback(() => {
    try {
      setLoading(true);
      syncAllVocabularyTopicCounts();
      const timestamp = Date.now();
      saveBackupMetadata(timestamp);
      const backupData = createDatabaseBackup(timestamp);

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
  }, [showSuccessDialog, t]);

  // Delete result data by date range or all
  const handleDeleteResults = useCallback(() => {
    const isAll = deleteReportsPreset === 'all';

    if (!isAll && (!startDate || !endDate)) {
      setAlert({ type: 'error', message: t('alerts.selectRange') });
      return;
    }
    if (!isAll && startDate && endDate && startDate.getTime() > endDate.getTime()) {
      setAlert({ type: 'error', message: t('alerts.selectRange') });
      return;
    }

    try {
      setLoading(true);
      const mistakesStats = loadMistakesStats();

      if (isAll) {
        // Delete all mistakes stats
        saveMistakesStats({});
        showSuccessDialog(t('messages.deleteReportsSuccess'));
      } else {
        // Delete by date range
        const startTimestamp = startDate!.getTime();
        const endTimestamp = endDate!.getTime();

        let deletedCount = 0;
        const updatedStats: typeof mistakesStats = {};

        Object.entries(mistakesStats).forEach(([key, record]) => {
          if (record.lastMistakeTime >= startTimestamp && record.lastMistakeTime <= endTimestamp) {
            deletedCount++;
          } else {
            updatedStats[key] = record;
          }
        });

        saveMistakesStats(updatedStats);
        showSuccessDialog(t('messages.deleteReportsRangeSuccess', { count: deletedCount }));
      }
      
      setDeleteResultDialogOpen(false);
      setStartDate(null);
      setEndDate(null);
      setDeleteReportsPreset(null);
    } catch (error) {
      console.error('Delete results error:', error);
      const errorMessage = error instanceof Error ? error.message : t('messages.unknownError');
      setAlert({ type: 'error', message: t('messages.deleteReportsError', { error: errorMessage }) });
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, deleteReportsPreset, showSuccessDialog, t]);

  const closeDeleteReportsDialog = () => {
    setDeleteResultDialogOpen(false);
    setStartDate(null);
    setEndDate(null);
    setDeleteReportsPreset(null);
  };

  // Delete all vocab files and folders
  const handleDeleteVocab = useCallback(() => {
    try {
      setLoading(true);
      
      const deletedTopicCount = clearVocabularyTopics();
      
      showSuccessDialog(t('messages.deleteVocabSuccess', { count: deletedTopicCount }));
      setDeleteVocabDialogOpen(false);
    } catch (error) {
      console.error('Delete vocab error:', error);
      const errorMessage = error instanceof Error ? error.message : t('messages.unknownError');
      setAlert({ type: 'error', message: t('messages.deleteVocabError', { error: errorMessage }) });
    } finally {
      setLoading(false);
    }
  }, [showSuccessDialog, t]);

  // Delete all data except backup timestamp
  const handleDeleteAllData = useCallback(async () => {
    try {
      setLoading(true);
      
      const deletedCount = clearDatabase({ preserveBackupMetadata: true });
      try {
        await flushPendingCloudSync();
      } catch (syncError) {
        console.error('Cloud sync after delete failed:', syncError);
        setAlert({
          type: 'error',
          message: syncError instanceof Error
            ? syncError.message
            : t('messages.unknownError'),
        });
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
  }, [showSuccessDialog, t]);

  // Import from backup file
  const handleImport = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        setLoading(true);
        const content = e.target?.result as string;
        const backupData = JSON.parse(content);
        const restored = restoreDatabaseBackup(backupData);
        saveBackupMetadata(restored.exportedAt);
        try {
          await flushPendingCloudSync();
        } catch (syncError) {
          console.error('Cloud sync after restore failed:', syncError);
          setAlert({
            type: 'error',
            message: syncError instanceof Error
              ? syncError.message
              : t('messages.unknownError'),
          });
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
  }, [showSuccessDialog, t]);

  const backupTimestamp = getBackupTimestamp();
  const backupExists = Boolean(backupTimestamp);
  const tree = loadTreeFromStorage();
  const vocabCounts = loadVocabularyTopicCounts();
  
  const allTopicIds = tree ? getAllTopicIds(tree) : [];
  const totalVocabTopics = allTopicIds.length;
  
  const totalVocabWords = allTopicIds.reduce(
    (sum, topicId) => sum + (vocabCounts[topicId] || 0),
    0,
  );
  
  const isDark = theme.palette.mode === 'dark';
  const dateLocale = i18n.language || undefined;
  const formatDateTime = (value: Date) => value.toLocaleString(dateLocale);
  const storageUsageKb = getDatabaseUsageBytes() / 1024;

  const startOfDay = (value: Date) => new Date(value.getFullYear(), value.getMonth(), value.getDate(), 0, 0, 0, 0);
  const endOfDay = (value: Date) => new Date(value.getFullYear(), value.getMonth(), value.getDate(), 23, 59, 59, 999);

  const formatDateInputValue = (value: Date | null) => {
    if (!value) return '';
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const parseDateInputValue = (value: string) => {
    if (!value) return null;
    const [year, month, day] = value.split('-').map((part) => Number(part));
    if (!year || !month || !day) return null;
    return new Date(year, month - 1, day);
  };

  const applyDeleteReportsPreset = (preset: DeleteReportsPreset) => {
    const nextPreset = deleteReportsPreset === preset ? null : preset;
    setDeleteReportsPreset(nextPreset);

    if (!nextPreset) return;
    if (nextPreset === 'all') {
      setStartDate(null);
      setEndDate(null);
      return;
    }

    const now = new Date();
    const rangeEnd = now;

    let rangeStart = now;
    if (nextPreset === 'today') {
      rangeStart = startOfDay(now);
    }
    if (nextPreset === 'last7days') {
      rangeStart = startOfDay(new Date(now.getTime() - 6 * 86400000));
    }
    if (nextPreset === 'last4hours') {
      rangeStart = new Date(now.getTime() - 4 * 3600000);
    }
    if (nextPreset === 'last1hour') {
      rangeStart = new Date(now.getTime() - 3600000);
    }

    setStartDate(rangeStart);
    setEndDate(rangeEnd);
  };

  const surfaceSx = {
    borderRadius: { xs: 2, sm: 2.5 },
    border: '1px solid',
    borderColor: alpha(theme.palette.divider, isDark ? 0.28 : 0.65),
    boxShadow: 'none',
    bgcolor: 'background.paper',
  } as const;

  const iconBadgeSx = (color: string) =>
    ({
      width: 36,
      height: 36,
      borderRadius: 1,
      display: 'grid',
      placeItems: 'center',
      flexShrink: 0,
      border: '1px solid',
      borderColor: alpha(color, isDark ? 0.55 : 0.35),
      bgcolor: alpha(color, isDark ? 0.16 : 0.1),
      color,
    }) as const;

  const dialogBackdropSx = {
    backgroundColor: alpha(theme.palette.common.black, isDark ? 0.72 : 0.58),
    backdropFilter: 'blur(6px)',
  } as const;

  const dialogPaperSx = {
    ...surfaceSx,
    overflow: 'hidden',
  } as const;

  const dialogTitleSx = {
    px: 3,
    py: 2.25,
    borderBottom: '1px solid',
    borderColor: alpha(theme.palette.divider, isDark ? 0.2 : 0.65),
    backgroundColor: alpha(theme.palette.background.paper, isDark ? 0.2 : 0.75),
  } as const;

  const dialogContentSx = { px: 3, py: 2.5 } as const;
  const dialogActionsSx = { px: 3, pb: 2.5 } as const;

  const deleteReportsIsAll = deleteReportsPreset === 'all';
  const deleteReportsInvalidRange = Boolean(startDate && endDate && startDate.getTime() > endDate.getTime());
  const deleteReportsHasRange = Boolean(startDate && endDate);
  const deleteReportsCanDelete = deleteReportsIsAll || (deleteReportsHasRange && !deleteReportsInvalidRange);
  const deleteReportsShowWarning = deleteReportsIsAll || deleteReportsHasRange;

  return (
    <Box
        sx={{
          width: '100%',
          minHeight: {
            xs: MOBILE_PAGE_VIEWPORT_HEIGHT,
            md: '100vh',
          },
          bgcolor: 'background.default',
          py: { xs: 2, sm: 2.5 },
        }}
      >
        <Container maxWidth="lg">
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              mb: 2.5,
            }}
          >
            <Box sx={iconBadgeSx(theme.palette.primary.main)}>
              <Database size={20} />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontSize: { xs: '1.125rem', sm: '1.5rem' }, lineHeight: 1.25, fontWeight: 700 }}>{t('title')}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>{t('backup.subtitle')}</Typography>
            </Box>
          </Box>

          {/* Alert */}
          {alert && (
            <Alert
              severity={alert.type}
              variant="outlined"
              onClose={() => setAlert(null)}
              sx={{
                mb: { xs: 2.5, sm: 3 },
                borderRadius: { xs: 2, sm: 2.5 },
                borderColor: alpha(theme.palette.divider, isDark ? 0.28 : 0.65),
                backgroundColor: alpha(theme.palette.background.paper, isDark ? 0.5 : 0.7),
              }}
            >
              <Typography variant="body2" fontWeight={700}>
                {alert.message}
              </Typography>
            </Alert>
          )}

          {/* Success Popup */}
          {successDialog && (
            <Dialog
              open
              onClose={() => setSuccessDialog(null)}
              maxWidth="xs"
              fullWidth
              BackdropProps={{
                sx: {
                  backgroundColor: alpha(theme.palette.common.black, isDark ? 0.72 : 0.58),
                  backdropFilter: 'blur(6px)',
                },
              }}
              PaperProps={{
                sx: {
                  ...surfaceSx,
                  overflow: 'hidden',
                },
              }}
            >
              <DialogTitle sx={{ p: 0 }}>
                <Box
                  sx={{
                    px: 3,
                    py: 2.5,
                    borderBottom: '1px solid',
                    borderColor: alpha(theme.palette.divider, isDark ? 0.2 : 0.65),
                    bgcolor: alpha(theme.palette.success.main, isDark ? 0.08 : 0.06),
                    position: 'relative',
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      bottom: 0,
                      width: 4,
                      bgcolor: alpha(theme.palette.success.main, isDark ? 0.7 : 0.55),
                    },
                  }}
                >
                  <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                    <Box sx={iconBadgeSx(theme.palette.success.main)}>
                      <CheckCircle size={22} />
                    </Box>
                    <Typography variant="h6" fontWeight={700} noWrap>
                      {successDialog.title}
                    </Typography>
                  </Box>
                </Box>
              </DialogTitle>
              <DialogContent sx={{ pt: 2.5 }}>
                {successDialog.description && (
                  <Typography variant="body2" color="text.secondary">
                    {successDialog.description}
                  </Typography>
                )}
              </DialogContent>
              <DialogActions sx={{ px: 3, pb: 2.5, pt: 0 }}>
                <Button
                  variant="contained"
                  fullWidth
                  onClick={() => setSuccessDialog(null)}
                  sx={{ borderRadius: 2, py: 1.1, fontWeight: 800 }}
                >
                  {t('buttons.close')}
                </Button>
              </DialogActions>
            </Dialog>
          )}

          <Box sx={{ mb: { xs: 2.5, sm: 3 } }}>
            <DataSourceSettings />
          </Box>

          {/* Overview + Actions (compact layout) */}
          <Paper sx={{ ...surfaceSx, overflow: 'hidden', mb: { xs: 2.5, sm: 3 } }}>
            <Box sx={{ px: { xs: 2, sm: 2.5 }, py: { xs: 2, sm: 2.25 } }}>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
                  gap: { xs: 1.5, sm: 2 },
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Box sx={iconBadgeSx(theme.palette.info.main)}>
                    <Folder size={20} />
                  </Box>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="caption" color="text.secondary" fontWeight={800} sx={{ letterSpacing: 0.3, textTransform: 'uppercase' }}>
                      {t('stats.vocabTopics')}
                    </Typography>
                    <Typography variant="h5" fontWeight={950} sx={{ mt: 0.35, lineHeight: 1.05 }}>
                      {totalVocabTopics}
                    </Typography>
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Box sx={iconBadgeSx(theme.palette.secondary.main)}>
                    <BookOpen size={20} />
                  </Box>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="caption" color="text.secondary" fontWeight={800} sx={{ letterSpacing: 0.3, textTransform: 'uppercase' }}>
                      {t('stats.vocabWords')}
                    </Typography>
                    <Typography variant="h5" fontWeight={950} sx={{ mt: 0.35, lineHeight: 1.05 }}>
                      {totalVocabWords}
                    </Typography>
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Box sx={iconBadgeSx(backupExists ? theme.palette.success.main : theme.palette.warning.main)}>
                    {backupExists ? <CheckCircle size={20} /> : <AlertTriangle size={20} />}
                  </Box>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="caption" color="text.secondary" fontWeight={800} sx={{ letterSpacing: 0.3, textTransform: 'uppercase' }}>
                      {t('stats.lastBackup')}
                    </Typography>
                    <Typography variant="body1" fontWeight={900} sx={{ mt: 0.6, lineHeight: 1.25, wordBreak: 'break-word' }}>
                      {backupExists && backupTimestamp ? formatDateTime(backupTimestamp) : t('stats.noBackup')}
                    </Typography>
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Box sx={iconBadgeSx(theme.palette.primary.main)}>
                    <HardDrive size={20} />
                  </Box>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="caption" color="text.secondary" fontWeight={800} sx={{ letterSpacing: 0.3, textTransform: 'uppercase' }}>
                      {t('stats.storageUsage')}
                    </Typography>
                    <Typography variant="h5" fontWeight={950} sx={{ mt: 0.35, lineHeight: 1.05 }}>
                      {storageUsageKb.toFixed(2)} KB
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </Box>

            <Divider sx={{ borderColor: alpha(theme.palette.divider, isDark ? 0.18 : 0.65) }} />

            <Box>
              <Box
                sx={{
                  px: { xs: 2, sm: 2.5 },
                  py: { xs: 1.75, sm: 2 },
                  display: 'grid',
                  gridTemplateColumns: { xs: 'auto 1fr', sm: 'auto 1fr auto' },
                  columnGap: 2,
                  rowGap: 1.25,
                  alignItems: { sm: 'center' },
                }}
              >
                <Box sx={iconBadgeSx(theme.palette.primary.main)}>
                  <Upload size={20} />
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="subtitle1" fontWeight={950} sx={{ lineHeight: 1.2 }}>
                    {t('backup.title')}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                    {t('backup.description')}
                  </Typography>
                </Box>
                <Box sx={{ gridColumn: { xs: '1 / -1', sm: 'auto' }, justifySelf: { sm: 'end' } }}>
                  <Button
                    variant="contained"
                    startIcon={<Upload size={18} />}
                    onClick={() => setBackupDialogOpen(true)}
                    sx={{ borderRadius: 2, py: 1.05, fontWeight: 900, width: { xs: '100%', sm: 'auto' } }}
                  >
                    {t('buttons.startBackup')}
                  </Button>
                </Box>
              </Box>

              <Divider sx={{ borderColor: alpha(theme.palette.divider, isDark ? 0.18 : 0.65) }} />

              <Box
                sx={{
                  px: { xs: 2, sm: 2.5 },
                  py: { xs: 1.75, sm: 2 },
                  display: 'grid',
                  gridTemplateColumns: { xs: 'auto 1fr', sm: 'auto 1fr auto' },
                  columnGap: 2,
                  rowGap: 1.25,
                  alignItems: { sm: 'center' },
                }}
              >
                <Box sx={iconBadgeSx(theme.palette.warning.main)}>
                  <RotateCcw size={20} />
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="subtitle1" fontWeight={950} sx={{ lineHeight: 1.2 }}>
                    {t('restore.title')}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                    {t('restore.description')}
                  </Typography>
                </Box>
                <Box sx={{ gridColumn: { xs: '1 / -1', sm: 'auto' }, justifySelf: { sm: 'end' } }}>
                  <Button
                    variant="outlined"
                    startIcon={<RotateCcw size={18} />}
                    onClick={() => setImportDialogOpen(true)}
                    sx={{
                      borderRadius: 2,
                      py: 1.05,
                      fontWeight: 900,
                      borderColor: alpha(theme.palette.divider, isDark ? 0.28 : 0.65),
                      width: { xs: '100%', sm: 'auto' },
                    }}
                  >
                    {t('buttons.startRestore')}
                  </Button>
                </Box>
              </Box>

              <Divider sx={{ borderColor: alpha(theme.palette.divider, isDark ? 0.18 : 0.65) }} />

              {/* Delete section (collapsible) */}
              <Accordion
                disableGutters
                elevation={0}
                square
                expanded={deleteSectionExpanded}
                onChange={(_, expanded) => setDeleteSectionExpanded(expanded)}
                sx={{
                  bgcolor: 'transparent',
                  '&::before': { display: 'none' },
                }}
              >
                <AccordionSummary
                  expandIcon={<ChevronDown size={18} />}
                  sx={{
                    px: { xs: 2, sm: 2.5 },
                    py: { xs: 1.5, sm: 1.75 },
                    minHeight: 'unset',
                    bgcolor: alpha(theme.palette.error.main, isDark ? 0.06 : 0.04),
                    borderLeft: '3px solid',
                    borderLeftColor: alpha(theme.palette.error.main, isDark ? 0.7 : 0.55),
                    '& .MuiAccordionSummary-content': { m: 0, alignItems: 'center' },
                    '& .MuiAccordionSummary-expandIconWrapper': { color: 'text.secondary' },
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, minWidth: 0 }}>
                    <Box sx={iconBadgeSx(theme.palette.error.main)}>
                      <Trash2 size={20} />
                    </Box>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="subtitle1" fontWeight={950} sx={{ lineHeight: 1.2 }}>
                        {t('delete.title')}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                        {t('delete.description')}
                      </Typography>
                    </Box>
                  </Box>
                </AccordionSummary>

                <AccordionDetails sx={{ p: 0 }}>
                  <Divider sx={{ borderColor: alpha(theme.palette.divider, isDark ? 0.18 : 0.65) }} />

                  <Box
                    sx={{
                      px: { xs: 2, sm: 2.5 },
                      py: { xs: 1.75, sm: 2 },
                      display: 'grid',
                      gridTemplateColumns: { xs: '1fr', sm: '1fr auto' },
                      columnGap: 2,
                      rowGap: 1.25,
                      alignItems: { sm: 'center' },
                    }}
                  >
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="subtitle1" fontWeight={950} sx={{ lineHeight: 1.2 }}>
                        {t('delete.deleteReports')}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                        {t('delete.deleteReportsDescription')}
                      </Typography>
                    </Box>
                    <Box sx={{ gridColumn: { xs: '1 / -1', sm: 'auto' }, justifySelf: { sm: 'end' } }}>
                      <Button
                        variant="outlined"
                        color="error"
                        onClick={() => setDeleteResultDialogOpen(true)}
                        sx={{
                          borderRadius: 2,
                          py: 1.05,
                          fontWeight: 900,
                          width: { xs: '100%', sm: 'auto' },
                          borderColor: alpha(theme.palette.divider, isDark ? 0.28 : 0.65),
                        }}
                      >
                        {t('buttons.startDeleteReports')}
                      </Button>
                    </Box>
                  </Box>

                  <Divider sx={{ borderColor: alpha(theme.palette.divider, isDark ? 0.18 : 0.65) }} />

                  <Box
                    sx={{
                      px: { xs: 2, sm: 2.5 },
                      py: { xs: 1.75, sm: 2 },
                      display: 'grid',
                      gridTemplateColumns: { xs: '1fr', sm: '1fr auto' },
                      columnGap: 2,
                      rowGap: 1.25,
                      alignItems: { sm: 'center' },
                    }}
                  >
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="subtitle1" fontWeight={950} sx={{ lineHeight: 1.2 }}>
                        {t('delete.deleteVocab')}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                        {t('delete.deleteVocabDescription')}
                      </Typography>
                    </Box>
                    <Box sx={{ gridColumn: { xs: '1 / -1', sm: 'auto' }, justifySelf: { sm: 'end' } }}>
                      <Button
                        variant="outlined"
                        color="error"
                        onClick={() => setDeleteVocabDialogOpen(true)}
                        sx={{
                          borderRadius: 2,
                          py: 1.05,
                          fontWeight: 900,
                          width: { xs: '100%', sm: 'auto' },
                          borderColor: alpha(theme.palette.divider, isDark ? 0.28 : 0.65),
                        }}
                      >
                        {t('buttons.startDeleteVocab')}
                      </Button>
                    </Box>
                  </Box>

                  <Divider sx={{ borderColor: alpha(theme.palette.divider, isDark ? 0.18 : 0.65) }} />

                  <Box
                    sx={{
                      px: { xs: 2, sm: 2.5 },
                      py: { xs: 1.75, sm: 2 },
                      backgroundColor: alpha(theme.palette.error.main, isDark ? 0.1 : 0.05),
                      display: 'grid',
                      gridTemplateColumns: { xs: '1fr', sm: '1fr auto' },
                      columnGap: 2,
                      rowGap: 1.25,
                      alignItems: { sm: 'center' },
                      borderLeft: '3px solid',
                      borderLeftColor: alpha(theme.palette.error.main, isDark ? 0.7 : 0.55),
                    }}
                  >
                    <Box sx={{ minWidth: 0 }}>
                      <Typography
                        variant="subtitle1"
                        fontWeight={950}
                        sx={{ lineHeight: 1.2, color: 'error.main' }}
                      >
                        {t('delete.deleteAll')}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                        {t('delete.deleteAllDescription')}
                      </Typography>
                    </Box>
                    <Box sx={{ gridColumn: { xs: '1 / -1', sm: 'auto' }, justifySelf: { sm: 'end' } }}>
                      <Button
                        variant="contained"
                        color="error"
                        onClick={() => setDeleteAllDialogOpen(true)}
                        sx={{ borderRadius: 2, py: 1.05, fontWeight: 950, width: { xs: '100%', sm: 'auto' } }}
                      >
                        {t('buttons.startDeleteAll')}
                      </Button>
                    </Box>
                  </Box>
                </AccordionDetails>
              </Accordion>
            </Box>
          </Paper>

          {/* Loading Overlay */}
          {loading && (
            <Backdrop
              open
              sx={{
                zIndex: (muiTheme) => muiTheme.zIndex.modal + 1,
                backgroundColor: alpha(theme.palette.common.black, isDark ? 0.72 : 0.58),
                backdropFilter: 'blur(6px)',
              }}
            >
              <Paper sx={{ ...surfaceSx, p: 3, minWidth: { xs: 280, sm: 360 } }}>
                <Typography variant="h6" fontWeight={900}>
                  {t('messages.processing')}
                </Typography>
                <LinearProgress sx={{ mt: 2, borderRadius: 999 }} />
              </Paper>
            </Backdrop>
          )}

          {/* Backup Dialog */}
          <Dialog
            open={backupDialogOpen}
            onClose={() => setBackupDialogOpen(false)}
            maxWidth="sm"
            fullWidth
            BackdropProps={{ sx: dialogBackdropSx }}
            PaperProps={{ sx: dialogPaperSx }}
          >
            <DialogTitle sx={dialogTitleSx}>{t('dialogs.backupConfirmTitle')}</DialogTitle>
            <DialogContent sx={dialogContentSx}>
              <Typography>{t('dialogs.backupConfirmMessage')}</Typography>
            </DialogContent>
            <DialogActions sx={dialogActionsSx}>
              <Button onClick={() => setBackupDialogOpen(false)}>{t('buttons.cancel')}</Button>
              <Button variant="contained" onClick={handleBackup}>
                {t('buttons.confirm')}
              </Button>
            </DialogActions>
          </Dialog>

          {/* Delete Results Dialog */}
          <Dialog
            open={deleteResultDialogOpen}
            onClose={closeDeleteReportsDialog}
            maxWidth="sm"
            fullWidth
            BackdropProps={{ sx: dialogBackdropSx }}
            PaperProps={{ sx: dialogPaperSx }}
          >
            <DialogTitle sx={dialogTitleSx}>{t('dialogs.deleteReportsTitle')}</DialogTitle>
            <DialogContent sx={dialogContentSx}>
              <Stack spacing={2.5}>
                <Box>
                  <Typography variant="subtitle2" fontWeight={900} sx={{ mb: 1 }}>
                    {t('dialogs.deleteReportsQuick')}
                  </Typography>
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
                      gap: 1,
                      '& .MuiFormControlLabel-root': { m: 0 },
                      '& .MuiCheckbox-root': { py: 0.5 },
                    }}
                  >
                    <FormControlLabel
                      control={<Checkbox checked={deleteReportsPreset === 'all'} onChange={() => applyDeleteReportsPreset('all')} />}
                      label={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Trash2 size={18} />
                          <Typography variant="body2" fontWeight={800}>
                            {t('dialogs.deleteReportsAll')}
                          </Typography>
                        </Box>
                      }
                    />
                    <FormControlLabel
                      control={<Checkbox checked={deleteReportsPreset === 'today'} onChange={() => applyDeleteReportsPreset('today')} />}
                      label={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <CalendarDays size={18} />
                          <Typography variant="body2" fontWeight={800}>
                            {t('dialogs.deleteReportsToday')}
                          </Typography>
                        </Box>
                      }
                    />
                    <FormControlLabel
                      control={<Checkbox checked={deleteReportsPreset === 'last7days'} onChange={() => applyDeleteReportsPreset('last7days')} />}
                      label={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <CalendarRange size={18} />
                          <Typography variant="body2" fontWeight={800}>
                            {t('dialogs.deleteReportsLast7Days')}
                          </Typography>
                        </Box>
                      }
                    />
                    <FormControlLabel
                      control={<Checkbox checked={deleteReportsPreset === 'last4hours'} onChange={() => applyDeleteReportsPreset('last4hours')} />}
                      label={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Clock size={18} />
                          <Typography variant="body2" fontWeight={800}>
                            {t('dialogs.deleteReportsLast4Hours')}
                          </Typography>
                        </Box>
                      }
                    />
                    <FormControlLabel
                      control={<Checkbox checked={deleteReportsPreset === 'last1hour'} onChange={() => applyDeleteReportsPreset('last1hour')} />}
                      label={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Clock size={18} />
                          <Typography variant="body2" fontWeight={800}>
                            {t('dialogs.deleteReportsLast1Hour')}
                          </Typography>
                        </Box>
                      }
                    />
                  </Box>
                </Box>

                <Divider sx={{ borderColor: alpha(theme.palette.divider, isDark ? 0.18 : 0.65) }} />

                <Box>
                  <Typography variant="subtitle2" fontWeight={900} sx={{ mb: 1 }}>
                    {t('dialogs.deleteReportsRange')}
                  </Typography>
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: { xs: '1fr', sm: '1fr auto 1fr' },
                      gap: 1.25,
                      alignItems: 'center',
                    }}
                  >
                    <TextField
                      label={t('dialogs.fromDate')}
                      type="date"
                      value={formatDateInputValue(startDate)}
                      onChange={(e) => {
                        setDeleteReportsPreset(null);
                        const parsed = parseDateInputValue(e.target.value);
                        setStartDate(parsed ? startOfDay(parsed) : null);
                      }}
                      fullWidth
                      error={deleteReportsInvalidRange}
                      InputLabelProps={{ shrink: true }}
                    />
                    <Box
                      sx={{
                        display: { xs: 'none', sm: 'grid' },
                        placeItems: 'center',
                        color: 'text.secondary',
                      }}
                    >
                      <ArrowRight size={18} />
                    </Box>
                    <TextField
                      label={t('dialogs.toDate')}
                      type="date"
                      value={formatDateInputValue(endDate)}
                      onChange={(e) => {
                        setDeleteReportsPreset(null);
                        const parsed = parseDateInputValue(e.target.value);
                        setEndDate(parsed ? endOfDay(parsed) : null);
                      }}
                      fullWidth
                      error={deleteReportsInvalidRange}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Box>

                  {startDate && endDate && (
                    <Typography variant="body2" color="text.secondary" fontWeight={700} sx={{ mt: 1 }}>
                      {t('dialogs.deleteReportsRangeApplied', { from: formatDateTime(startDate), to: formatDateTime(endDate) })}
                    </Typography>
                  )}
                </Box>

                {deleteReportsShowWarning && (
                  <Alert
                    severity={deleteReportsIsAll ? 'error' : 'warning'}
                    variant="outlined"
                    sx={{
                      borderRadius: 2,
                      borderColor: alpha(
                        deleteReportsIsAll ? theme.palette.error.main : theme.palette.warning.main,
                        isDark ? 0.35 : 0.25,
                      ),
                      backgroundColor: alpha(
                        deleteReportsIsAll ? theme.palette.error.main : theme.palette.warning.main,
                        isDark ? 0.08 : 0.06,
                      ),
                    }}
                  >
                    <Typography variant="body2">
                      {deleteReportsIsAll ? t('alerts.irreversible') : t('alerts.deleteRangeConfirm')}
                    </Typography>
                  </Alert>
                )}
              </Stack>
            </DialogContent>
            <DialogActions sx={dialogActionsSx}>
              <Button onClick={closeDeleteReportsDialog}>
                {t('dialogs.deleteReportsCancel')}
              </Button>
              <Button
                variant="contained"
                color="error"
                onClick={handleDeleteResults}
                disabled={!deleteReportsCanDelete}
                sx={{ borderRadius: 2, fontWeight: 900 }}
              >
                {t('dialogs.deleteReportsCta')}
              </Button>
            </DialogActions>
          </Dialog>

          {/* Delete Vocab Dialog */}
          <Dialog
            open={deleteVocabDialogOpen}
            onClose={() => setDeleteVocabDialogOpen(false)}
            maxWidth="sm"
            fullWidth
            BackdropProps={{ sx: dialogBackdropSx }}
            PaperProps={{ sx: dialogPaperSx }}
          >
            <DialogTitle sx={{ ...dialogTitleSx, color: 'error.main' }}>{t('dialogs.deleteVocabTitle')}</DialogTitle>
            <DialogContent sx={dialogContentSx}>
              <Stack spacing={2}>
                {!backupExists && (
                  <Alert
                    severity="warning"
                    variant="outlined"
                    sx={{
                      borderRadius: 2,
                      borderColor: alpha(theme.palette.warning.main, isDark ? 0.35 : 0.25),
                      backgroundColor: alpha(theme.palette.warning.main, isDark ? 0.08 : 0.06),
                    }}
                  >
                    <Typography variant="body1" fontWeight={700}>
                      {t('alerts.noBackup')}
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      {t('backup.description')}
                    </Typography>
                  </Alert>
                )}

                <Alert
                  severity="error"
                  variant="outlined"
                  sx={{
                    borderRadius: 2,
                    borderColor: alpha(theme.palette.error.main, isDark ? 0.35 : 0.25),
                    backgroundColor: alpha(theme.palette.error.main, isDark ? 0.08 : 0.06),
                  }}
                >
                  <Typography variant="body2">{t('delete.deleteVocabDescription')}</Typography>
                  <Typography variant="body2" sx={{ mt: 1, fontWeight: 700 }}>
                    {t('alerts.irreversible')}
                  </Typography>
                  {backupTimestamp && (
                    <Typography variant="body2" sx={{ mt: 1, fontStyle: 'italic' }}>
                      {t('stats.lastBackup')}: {formatDateTime(backupTimestamp)}
                    </Typography>
                  )}
                </Alert>
              </Stack>
            </DialogContent>
            <DialogActions sx={dialogActionsSx}>
              <Button onClick={() => setDeleteVocabDialogOpen(false)}>{t('dialogs.deleteVocabCancel')}</Button>
              <Button
                variant="contained"
                color="error"
                onClick={handleDeleteVocab}
                disabled={loading}
                sx={{ borderRadius: 2, fontWeight: 900 }}
              >
                {t('dialogs.deleteVocabCta')}
              </Button>
            </DialogActions>
          </Dialog>

          {/* Import Dialog */}
          <Dialog
            open={importDialogOpen}
            onClose={() => setImportDialogOpen(false)}
            maxWidth="sm"
            fullWidth
            BackdropProps={{ sx: dialogBackdropSx }}
            PaperProps={{ sx: dialogPaperSx }}
          >
            <DialogTitle sx={dialogTitleSx}>{t('dialogs.restoreTitle')}</DialogTitle>
            <DialogContent sx={dialogContentSx}>
              <Alert
                severity="warning"
                variant="outlined"
                sx={{
                  borderRadius: 2,
                  borderColor: alpha(theme.palette.warning.main, isDark ? 0.35 : 0.25),
                  backgroundColor: alpha(theme.palette.warning.main, isDark ? 0.08 : 0.06),
                }}
              >
                <Typography variant="body2">{t('dialogs.restoreWarning')}</Typography>
              </Alert>
              <Button
                variant="outlined"
                component="label"
                fullWidth
                startIcon={<RotateCcw size={18} />}
                sx={{ mt: 2, borderRadius: 2, py: 1.1, fontWeight: 900 }}
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
            <DialogActions sx={dialogActionsSx}>
              <Button onClick={() => setImportDialogOpen(false)} sx={{ borderRadius: 2 }}>
                {t('dialogs.restoreClose')}
              </Button>
            </DialogActions>
          </Dialog>

          {/* Delete All Data Dialog */}
          <Dialog
            open={deleteAllDialogOpen}
            onClose={() => setDeleteAllDialogOpen(false)}
            maxWidth="sm"
            fullWidth
            BackdropProps={{ sx: dialogBackdropSx }}
            PaperProps={{ sx: dialogPaperSx }}
          >
            <DialogTitle sx={{ ...dialogTitleSx, color: 'error.main' }}>{t('dialogs.deleteAllTitle')}</DialogTitle>
            <DialogContent sx={dialogContentSx}>
              <Stack spacing={2}>
                {!backupExists && (
                  <Alert
                    severity="warning"
                    variant="outlined"
                    sx={{
                      borderRadius: 2,
                      borderColor: alpha(theme.palette.warning.main, isDark ? 0.35 : 0.25),
                      backgroundColor: alpha(theme.palette.warning.main, isDark ? 0.08 : 0.06),
                    }}
                  >
                    <Typography variant="body1" fontWeight={700}>
                      {t('alerts.noBackup')}
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      {t('backup.description')}
                    </Typography>
                  </Alert>
                )}

                <Alert
                  severity="error"
                  variant="outlined"
                  sx={{
                    borderRadius: 2,
                    borderColor: alpha(theme.palette.error.main, isDark ? 0.35 : 0.25),
                    backgroundColor: alpha(theme.palette.error.main, isDark ? 0.08 : 0.06),
                  }}
                >
                  <Typography variant="body1" fontWeight={700} gutterBottom>
                    {t('dialogs.deleteAllWarning')}
                  </Typography>
                  <Typography variant="body2" component="div">
                    {t('dialogs.deleteAllList')}
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 1, fontWeight: 700 }}>
                    {t('alerts.irreversible')}
                  </Typography>
                </Alert>

                {backupExists && (
                  <Alert
                    severity="info"
                    variant="outlined"
                    sx={{
                      borderRadius: 2,
                      borderColor: alpha(theme.palette.info.main, isDark ? 0.3 : 0.25),
                      backgroundColor: alpha(theme.palette.info.main, isDark ? 0.06 : 0.05),
                    }}
                  >
                    <Typography variant="body2">{t('delete.keepBackupNote')}</Typography>
                    {backupTimestamp && (
                      <Typography variant="body2" sx={{ mt: 1, fontStyle: 'italic' }}>
                        {t('stats.lastBackup')}: {formatDateTime(backupTimestamp)}
                      </Typography>
                    )}
                  </Alert>
                )}
              </Stack>
            </DialogContent>
            <DialogActions sx={dialogActionsSx}>
              <Button onClick={() => setDeleteAllDialogOpen(false)} sx={{ borderRadius: 2 }}>
                {t('dialogs.deleteAllCancel')}
              </Button>
              <Button
                variant="contained"
                color="error"
                onClick={handleDeleteAllData}
                disabled={loading}
                sx={{ borderRadius: 2, fontWeight: 900 }}
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
