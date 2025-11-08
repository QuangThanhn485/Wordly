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
  Divider,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  useTheme,
  useMediaQuery,
  Stack,
  Chip,
  LinearProgress,
  IconButton,
  Tooltip,
  Checkbox,
  FormControlLabel,
} from '@mui/material';
import StorageIcon from '@mui/icons-material/Storage';
import BackupIcon from '@mui/icons-material/Backup';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import RestoreIcon from '@mui/icons-material/Restore';
import WarningIcon from '@mui/icons-material/Warning';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { loadVocabCounts, loadVocabFromStorage } from '@/features/vocabulary/utils/storageUtils';
import { loadMistakesStats } from '@/features/train/train-read-write/mistakesStorage';
import { getLastChangeTimestamp, trackedSetItem, trackedRemoveItem } from '@/utils/storageTracker';

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
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  
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

      setAlert({ type: 'success', message: 'Backup thành công! File đã được tải xuống.' });
      setBackupDialogOpen(false);
    } catch (error) {
      console.error('Backup error:', error);
      setAlert({ type: 'error', message: 'Lỗi khi backup: ' + (error instanceof Error ? error.message : 'Unknown error') });
    } finally {
      setLoading(false);
    }
  }, []);

  // Delete result data by date range or all
  const handleDeleteResults = useCallback(() => {
    if (!deleteAllResults && (!startDate || !endDate)) {
      setAlert({ type: 'error', message: 'Vui lòng chọn khoảng thời gian hoặc chọn "Xóa toàn bộ"' });
      return;
    }

    try {
      setLoading(true);
      const mistakesStats = loadMistakesStats();

      if (deleteAllResults) {
        // Delete all mistakes stats
        trackedRemoveItem('wordly_mistakes_stats');
        const totalCount = Object.keys(mistakesStats).length;
        setAlert({ type: 'success', message: `Đã xóa toàn bộ ${totalCount} bản ghi lỗi.` });
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
        setAlert({ type: 'success', message: `Đã xóa ${deletedCount} bản ghi lỗi trong khoảng thời gian đã chọn.` });
      }
      
      setDeleteResultDialogOpen(false);
      setStartDate(null);
      setEndDate(null);
      setDeleteAllResults(false);
    } catch (error) {
      console.error('Delete results error:', error);
      setAlert({ type: 'error', message: 'Lỗi khi xóa: ' + (error instanceof Error ? error.message : 'Unknown error') });
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, deleteAllResults]);

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
      
      setAlert({ type: 'success', message: `Đã xóa ${vocabIndex.length} file từ vựng và cấu trúc thư mục.` });
      setDeleteVocabDialogOpen(false);
    } catch (error) {
      console.error('Delete vocab error:', error);
      setAlert({ type: 'error', message: 'Lỗi khi xóa: ' + (error instanceof Error ? error.message : 'Unknown error') });
    } finally {
      setLoading(false);
    }
  }, []);

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
      
      setAlert({ type: 'success', message: `Đã xóa ${deletedCount} mục dữ liệu. Backup timestamp đã được giữ lại.` });
      setDeleteAllDialogOpen(false);
      
      // Reload page to reflect changes
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      console.error('Delete all data error:', error);
      setAlert({ type: 'error', message: 'Lỗi khi xóa: ' + (error instanceof Error ? error.message : 'Unknown error') });
    } finally {
      setLoading(false);
    }
  }, []);

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
        }

        setAlert({ type: 'success', message: 'Import thành công! Dữ liệu đã được khôi phục.' });
        setImportDialogOpen(false);
        
        // Reload page to reflect changes
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } catch (error) {
        console.error('Import error:', error);
        setAlert({ type: 'error', message: 'Lỗi khi import: File không hợp lệ hoặc đã bị hỏng.' });
      } finally {
        setLoading(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };
    reader.readAsText(file);
  }, []);

  const backupTimestamp = getBackupTimestamp();
  const allVocab = loadVocabFromStorage();
  const vocabIndex = allVocab ? Object.keys(allVocab) : [];
  const vocabCounts = loadVocabCounts();
  const totalVocabFiles = vocabIndex.length;
  const totalVocabWords = Object.values(vocabCounts).reduce((sum, count) => sum + count, 0);
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
              <StorageIcon
                sx={{
                  fontSize: { xs: '2rem', sm: '2.5rem' },
                  color: 'primary.main',
                }}
              />
              <Typography
                variant="h4"
                fontWeight={700}
                sx={{
                  fontSize: { xs: '1.5rem', sm: '2rem', md: '2.5rem' },
                }}
              >
                Quản lý Dữ liệu
              </Typography>
            </Box>
            <Typography
              variant="body1"
              color="text.secondary"
              sx={{
                fontSize: { xs: '0.875rem', sm: '1rem' },
              }}
            >
              Backup, khôi phục và quản lý dữ liệu ứng dụng
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
                  Tổng số file từ vựng
                </Typography>
                <Typography variant="h4" fontWeight={700}>
                  {totalVocabFiles}
                </Typography>
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Tổng số từ vựng
                </Typography>
                <Typography variant="h4" fontWeight={700}>
                  {totalVocabWords}
                </Typography>
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Trạng thái Backup
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                  {hasBackup() ? (
                    <>
                      <CheckCircleIcon color="success" />
                      <Typography variant="body2">
                        {backupTimestamp?.toLocaleDateString('vi-VN')}
                      </Typography>
                    </>
                  ) : (
                    <>
                      <WarningIcon color="warning" />
                      <Typography variant="body2">Chưa có backup</Typography>
                    </>
                  )}
                </Box>
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Dung lượng sử dụng
                </Typography>
                <Typography variant="h4" fontWeight={700}>
                  {((JSON.stringify(localStorage).length / 1024).toFixed(2))} KB
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
                  <BackupIcon color="primary" sx={{ fontSize: '2rem' }} />
                  <Box>
                    <Typography variant="h6" fontWeight={600}>
                      Backup Dữ liệu
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Sao lưu toàn bộ dữ liệu vào file
                    </Typography>
                  </Box>
                </Box>
                {hasBackup() && backupTimestamp && (
                  <Alert severity="info" sx={{ mb: 2 }}>
                    Backup gần nhất: {backupTimestamp.toLocaleString('vi-VN')}
                  </Alert>
                )}
              </CardContent>
              <CardActions sx={{ px: 2, pb: 2, mt: 'auto' }}>
                <Button
                  variant="contained"
                  startIcon={<BackupIcon />}
                  onClick={() => setBackupDialogOpen(true)}
                  fullWidth
                >
                  Tạo Backup
                </Button>
              </CardActions>
            </Card>

            {/* Import Card */}
            <Card sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <CardContent sx={{ flex: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <RestoreIcon color="primary" sx={{ fontSize: '2rem' }} />
                  <Box>
                    <Typography variant="h6" fontWeight={600}>
                      Khôi phục Dữ liệu
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Import dữ liệu từ file backup
                    </Typography>
                  </Box>
                </Box>
                <Alert severity="warning" sx={{ mb: 2 }}>
                  Dữ liệu hiện tại sẽ bị ghi đè
                </Alert>
              </CardContent>
              <CardActions sx={{ px: 2, pb: 2, mt: 'auto' }}>
                <Button
                  variant="outlined"
                  startIcon={<RestoreIcon />}
                  onClick={() => {
                    setImportDialogOpen(true);
                    setTimeout(() => fileInputRef.current?.click(), 100);
                  }}
                  fullWidth
                >
                  Import từ File
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
                  <DeleteForeverIcon color="error" sx={{ fontSize: '2rem' }} />
                  <Box>
                    <Typography variant="h6" fontWeight={600}>
                      Xóa Báo cáo Lỗi
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Xóa dữ liệu báo cáo theo khoảng thời gian hoặc toàn bộ
                    </Typography>
                  </Box>
                </Box>
                <Alert severity="warning" sx={{ mb: 2 }}>
                  Hành động này không thể hoàn tác
                </Alert>
              </CardContent>
              <CardActions sx={{ px: 2, pb: 2, mt: 'auto' }}>
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<DeleteForeverIcon />}
                  onClick={() => setDeleteResultDialogOpen(true)}
                  fullWidth
                >
                  Xóa Báo cáo
                </Button>
              </CardActions>
            </Card>

            {/* Delete Vocab Card */}
            <Card sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <CardContent sx={{ flex: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <DeleteForeverIcon color="error" sx={{ fontSize: '2rem' }} />
                  <Box>
                    <Typography variant="h6" fontWeight={600}>
                      Xóa Từ vựng
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Xóa toàn bộ file và thư mục từ vựng
                    </Typography>
                  </Box>
                </Box>
                <Alert severity="error" sx={{ mb: 2 }}>
                  {!hasBackup() && (
                    <Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <WarningIcon />
                        <Typography variant="body1" fontWeight={600}>
                          Cảnh báo: Chưa có backup!
                        </Typography>
                      </Box>
                      <Typography variant="body2">
                        Hãy tạo backup trước khi xóa từ vựng. Backup data và timestamp sẽ được giữ lại để có thể khôi phục sau này.
                      </Typography>
                    </Box>
                  )}
                  {hasBackup() && hasChanges && (
                    <Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <WarningIcon />
                        <Typography variant="body1" fontWeight={600}>
                          Cảnh báo: Có thay đổi sau backup!
                        </Typography>
                      </Box>
                      <Typography variant="body2">
                        Đã phát hiện thay đổi dữ liệu sau thời điểm backup. Vui lòng tạo backup mới trước khi xóa để đảm bảo không mất dữ liệu mới nhất.
                      </Typography>
                      {backupTimestamp && (
                        <Typography variant="body2" sx={{ mt: 1, fontStyle: 'italic' }}>
                          Backup hiện tại: {backupTimestamp.toLocaleString('vi-VN')}
                        </Typography>
                      )}
                    </Box>
                  )}
                  {hasBackup() && !hasChanges && (
                    <Box>
                      <Typography variant="body2" fontWeight={600} gutterBottom>
                        Hành động này sẽ xóa:
                      </Typography>
                      <Typography variant="body2" component="div">
                        <ul style={{ margin: '4px 0', paddingLeft: '20px' }}>
                          <li>Tất cả file từ vựng ({totalVocabFiles} files)</li>
                          <li>Cấu trúc thư mục</li>
                          <li>Vocab index và counts</li>
                        </ul>
                      </Typography>
                      <Typography variant="body2" fontWeight={600} color="success.main" sx={{ mt: 1 }}>
                        ✓ Backup data và timestamp sẽ được giữ lại
                      </Typography>
                      {backupTimestamp && (
                        <Typography variant="body2" sx={{ mt: 1, fontStyle: 'italic' }}>
                          Backup: {backupTimestamp.toLocaleString('vi-VN')}
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
                  startIcon={<DeleteForeverIcon />}
                  onClick={() => {
                    if (!hasBackup()) {
                      setAlert({ type: 'error', message: 'Vui lòng tạo backup trước khi xóa dữ liệu!' });
                      return;
                    }
                    if (hasChanges) {
                      setAlert({ type: 'error', message: 'Có thay đổi sau backup! Vui lòng tạo backup mới trước khi xóa.' });
                      return;
                    }
                    setDeleteVocabDialogOpen(true);
                  }}
                  fullWidth
                  disabled={!hasBackup() || hasChanges}
                >
                  Xóa Từ vựng
                </Button>
              </CardActions>
            </Card>
          </Box>

          {/* Delete All Data Card - Full Width */}
          <Card sx={{ border: `2px solid ${theme.palette.error.main}40`, display: 'flex', flexDirection: 'column' }}>
            <CardContent sx={{ flex: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <DeleteForeverIcon color="error" sx={{ fontSize: '2.5rem' }} />
                <Box>
                  <Typography variant="h6" fontWeight={700} color="error">
                    Xóa Toàn bộ Dữ liệu
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Xóa tất cả dữ liệu
                  </Typography>
                </Box>
              </Box>
              <Alert severity="error" sx={{ mb: 2 }}>
                {!hasBackup() && (
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <WarningIcon />
                      <Typography variant="body1" fontWeight={600}>
                        Cảnh báo: Chưa có backup!
                      </Typography>
                    </Box>
                    <Typography variant="body2">
                      Hãy tạo backup trước khi xóa toàn bộ dữ liệu. Backup data và timestamp sẽ được giữ lại để có thể khôi phục sau này.
                    </Typography>
                  </Box>
                )}
                {hasBackup() && hasChanges && (
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <WarningIcon />
                      <Typography variant="body1" fontWeight={600}>
                        Cảnh báo: Có thay đổi sau backup!
                      </Typography>
                    </Box>
                    <Typography variant="body2">
                      Đã phát hiện thay đổi dữ liệu sau thời điểm backup. Vui lòng tạo backup mới trước khi xóa để đảm bảo không mất dữ liệu mới nhất.
                    </Typography>
                    {backupTimestamp && (
                      <Typography variant="body2" sx={{ mt: 1, fontStyle: 'italic' }}>
                        Backup hiện tại: {backupTimestamp.toLocaleString('vi-VN')}
                      </Typography>
                    )}
                  </Box>
                )}
                {hasBackup() && !hasChanges && (
                  <Box>
                    <Typography variant="body1" fontWeight={600} gutterBottom>
                      Hành động này sẽ xóa:
                    </Typography>
                    <Typography variant="body2" component="div">
                      <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                        <li>Tất cả file từ vựng</li>
                        <li>Tất cả báo cáo lỗi</li>
                        <li>Tất cả session training</li>
                        <li>Tất cả cấu trúc thư mục</li>
                      </ul>
                    </Typography>
                    <Typography variant="body2" fontWeight={600} color="success.main" sx={{ mt: 1 }}>
                      ✓ Backup data và timestamp sẽ được giữ lại
                    </Typography>
                    {backupTimestamp && (
                      <Typography variant="body2" sx={{ mt: 1, fontStyle: 'italic' }}>
                        Backup: {backupTimestamp.toLocaleString('vi-VN')}
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
                startIcon={<DeleteForeverIcon />}
                onClick={() => {
                  if (!hasBackup()) {
                    setAlert({ type: 'error', message: 'Vui lòng tạo backup trước khi xóa toàn bộ dữ liệu!' });
                    return;
                  }
                  if (hasChanges) {
                    setAlert({ type: 'error', message: 'Có thay đổi sau backup! Vui lòng tạo backup mới trước khi xóa.' });
                    return;
                  }
                  setDeleteAllDialogOpen(true);
                }}
                fullWidth
                disabled={!hasBackup() || hasChanges}
                size="large"
              >
                Xóa Toàn bộ Dữ liệu
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
                  Đang xử lý...
                </Typography>
                <LinearProgress sx={{ mt: 2 }} />
              </Paper>
            </Box>
          )}

          {/* Backup Dialog */}
          <Dialog open={backupDialogOpen} onClose={() => setBackupDialogOpen(false)} maxWidth="sm" fullWidth>
            <DialogTitle>Xác nhận Backup</DialogTitle>
            <DialogContent>
              <Typography>
                Bạn có chắc chắn muốn tạo backup toàn bộ dữ liệu? File backup sẽ được tải xuống tự động.
              </Typography>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setBackupDialogOpen(false)}>Hủy</Button>
              <Button variant="contained" onClick={handleBackup}>
                Xác nhận
              </Button>
            </DialogActions>
          </Dialog>

          {/* Delete Results Dialog */}
          <Dialog open={deleteResultDialogOpen} onClose={() => setDeleteResultDialogOpen(false)} maxWidth="sm" fullWidth>
            <DialogTitle>Xóa Báo cáo Lỗi</DialogTitle>
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
                  label={
                    <Typography variant="body1" fontWeight={600}>
                      Xóa toàn bộ báo cáo lỗi
                    </Typography>
                  }
                />
                
                {!deleteAllResults && (
                  <>
                    <TextField
                      label="Từ ngày"
                      type="date"
                      value={startDate ? startDate.toISOString().split('T')[0] : ''}
                      onChange={(e) => setStartDate(e.target.value ? new Date(e.target.value) : null)}
                      fullWidth
                      InputLabelProps={{
                        shrink: true,
                      }}
                    />
                    <TextField
                      label="Đến ngày"
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
                  {deleteAllResults ? (
                    <Typography variant="body2">
                      <strong>Cảnh báo:</strong> Tất cả báo cáo lỗi sẽ bị xóa vĩnh viễn. Hành động này không thể hoàn tác.
                    </Typography>
                  ) : (
                    <Typography variant="body2">
                      Tất cả báo cáo lỗi trong khoảng thời gian này sẽ bị xóa vĩnh viễn.
                    </Typography>
                  )}
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
                Hủy
              </Button>
              <Button 
                variant="contained" 
                color="error" 
                onClick={handleDeleteResults} 
                disabled={!deleteAllResults && (!startDate || !endDate)}
              >
                {deleteAllResults ? 'Xóa Toàn bộ' : 'Xóa'}
              </Button>
            </DialogActions>
          </Dialog>

          {/* Delete Vocab Dialog */}
          <Dialog open={deleteVocabDialogOpen} onClose={() => setDeleteVocabDialogOpen(false)} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ color: 'error.main' }}>Xác nhận Xóa Từ vựng</DialogTitle>
            <DialogContent>
              {!hasBackup() ? (
                <Alert severity="error" sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <WarningIcon />
                    <Typography variant="body1" fontWeight={600}>
                      Chưa có backup!
                    </Typography>
                  </Box>
                  <Typography variant="body2">
                    Bạn phải tạo backup trước khi xóa từ vựng. Vui lòng quay lại và tạo backup trước.
                  </Typography>
                </Alert>
              ) : hasChanges ? (
                <Alert severity="error" sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <WarningIcon />
                    <Typography variant="body1" fontWeight={600}>
                      Có thay đổi sau backup!
                    </Typography>
                  </Box>
                  <Typography variant="body2" component="div">
                    Đã phát hiện thay đổi dữ liệu sau thời điểm backup. Vui lòng tạo backup mới trước khi xóa để đảm bảo không mất dữ liệu mới nhất.
                    {backupTimestamp && (
                      <Typography variant="body2" sx={{ mt: 1, fontStyle: 'italic' }}>
                        Backup hiện tại: {backupTimestamp.toLocaleString('vi-VN')}
                      </Typography>
                    )}
                  </Typography>
                </Alert>
              ) : (
                <>
                  <Alert severity="error" sx={{ mb: 2 }}>
                    <Typography variant="body1" fontWeight={600} gutterBottom>
                      Cảnh báo!
                    </Typography>
                    <Typography variant="body2" component="div">
                      Bạn sắp xóa toàn bộ {totalVocabFiles} file từ vựng và cấu trúc thư mục.
                      <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                        <li>Tất cả file từ vựng ({totalVocabFiles} files)</li>
                        <li>Cấu trúc thư mục</li>
                        <li>Vocab index và counts</li>
                      </ul>
                    </Typography>
                    <Typography variant="body2" fontWeight={600} color="success.main" sx={{ mt: 1 }}>
                      ✓ Backup data và timestamp sẽ được giữ lại
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 2, fontWeight: 600 }}>
                      Hành động này không thể hoàn tác!
                    </Typography>
                  </Alert>
                  <Alert severity="info">
                    Backup đã được kiểm tra và không có thay đổi sau thời điểm backup. Có thể khôi phục sau khi xóa.
                    {backupTimestamp && (
                      <Typography variant="body2" sx={{ mt: 1, fontStyle: 'italic' }}>
                        Backup: {backupTimestamp.toLocaleString('vi-VN')}
                      </Typography>
                    )}
                  </Alert>
                </>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDeleteVocabDialogOpen(false)}>Hủy</Button>
              <Button 
                variant="contained" 
                color="error" 
                onClick={handleDeleteVocab}
                disabled={!hasBackup() || hasChanges}
              >
                Xác nhận Xóa
              </Button>
            </DialogActions>
          </Dialog>

          {/* Import Dialog */}
          <Dialog open={importDialogOpen} onClose={() => setImportDialogOpen(false)} maxWidth="sm" fullWidth>
            <DialogTitle>Import Dữ liệu</DialogTitle>
            <DialogContent>
              <Alert severity="warning" sx={{ mb: 2 }}>
                Dữ liệu hiện tại sẽ bị ghi đè bởi dữ liệu từ file backup.
              </Alert>
              <Button
                variant="outlined"
                component="label"
                fullWidth
                startIcon={<RestoreIcon />}
              >
                Chọn File Backup
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
              <Button onClick={() => setImportDialogOpen(false)}>Đóng</Button>
            </DialogActions>
          </Dialog>

          {/* Delete All Data Dialog */}
          <Dialog open={deleteAllDialogOpen} onClose={() => setDeleteAllDialogOpen(false)} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ color: 'error.main' }}>Xác nhận Xóa Toàn bộ Dữ liệu</DialogTitle>
            <DialogContent>
              {!hasBackup() ? (
                <Alert severity="error" sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <WarningIcon />
                    <Typography variant="body1" fontWeight={600}>
                      Chưa có backup!
                    </Typography>
                  </Box>
                  <Typography variant="body2">
                    Bạn phải tạo backup trước khi xóa toàn bộ dữ liệu. Vui lòng quay lại và tạo backup trước.
                  </Typography>
                </Alert>
              ) : hasChanges ? (
                <Alert severity="error" sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <WarningIcon />
                    <Typography variant="body1" fontWeight={600}>
                      Có thay đổi sau backup!
                    </Typography>
                  </Box>
                  <Typography variant="body2" component="div">
                    Đã phát hiện thay đổi dữ liệu sau thời điểm backup. Vui lòng tạo backup mới trước khi xóa để đảm bảo không mất dữ liệu mới nhất.
                    {backupTimestamp && (
                      <Typography variant="body2" sx={{ mt: 1, fontStyle: 'italic' }}>
                        Backup hiện tại: {backupTimestamp.toLocaleString('vi-VN')}
                      </Typography>
                    )}
                  </Typography>
                </Alert>
              ) : (
                <>
                  <Alert severity="error" sx={{ mb: 2 }}>
                    <Typography variant="body1" fontWeight={600} gutterBottom>
                      Cảnh báo nguy hiểm!
                    </Typography>
                    <Typography variant="body2" component="div">
                      Bạn sắp xóa <strong>TOÀN BỘ</strong> dữ liệu trong ứng dụng, bao gồm:
                      <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                        <li>Tất cả file từ vựng ({totalVocabFiles} files)</li>
                        <li>Tất cả báo cáo lỗi</li>
                        <li>Tất cả session training</li>
                        <li>Tất cả cấu trúc thư mục</li>
                      </ul>
                    </Typography>
                    <Typography variant="body2" fontWeight={600} color="success.main" sx={{ mt: 1 }}>
                      ✓ Backup data và timestamp sẽ được giữ lại
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 2, fontWeight: 600 }}>
                      Hành động này không thể hoàn tác!
                    </Typography>
                  </Alert>
                  <Alert severity="info">
                    Backup đã được kiểm tra và không có thay đổi sau thời điểm backup. Có thể khôi phục sau khi xóa.
                    {backupTimestamp && (
                      <Typography variant="body2" sx={{ mt: 1, fontStyle: 'italic' }}>
                        Backup: {backupTimestamp.toLocaleString('vi-VN')}
                      </Typography>
                    )}
                  </Alert>
                </>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDeleteAllDialogOpen(false)}>Hủy</Button>
              <Button 
                variant="contained" 
                color="error" 
                onClick={handleDeleteAllData}
                disabled={!hasBackup() || hasChanges}
              >
                Xác nhận Xóa Toàn bộ
              </Button>
            </DialogActions>
          </Dialog>
        </Container>
      </Box>
  );
};

export default DataManagementPage;

