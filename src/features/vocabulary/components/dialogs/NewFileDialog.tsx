import React, { useCallback, useMemo, useRef } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button } from '@mui/material';
import { useTranslation } from 'react-i18next';

interface NewFileDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (fileName: string) => void;
}

export const NewFileDialog: React.FC<NewFileDialogProps> = React.memo(({ open, onClose, onConfirm }) => {
  const { t } = useTranslation('vocabulary');
  const [fileName, setFileName] = React.useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset và focus khi mở dialog
  React.useEffect(() => {
    if (open) {
      setFileName('');
      // Focus sau khi dialog animation hoàn thành
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [open]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFileName(e.target.value);
  }, []);

  const handleConfirm = useCallback(() => {
    const trimmed = fileName.trim();
    if (trimmed) {
      onConfirm(trimmed); // Truyền giá trị trực tiếp - không race condition!
    }
  }, [fileName, onConfirm]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && fileName.trim()) {
      handleConfirm();
    }
  }, [fileName, handleConfirm]);

  const isDisabled = useMemo(() => !fileName.trim(), [fileName]);
  
  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>{t('dialogs.newFile.title')}</DialogTitle>
      <DialogContent>
        <TextField
          inputRef={inputRef}
          fullWidth
          margin="dense"
          label={t('dialogs.newFile.label')}
          value={fileName}
          onChange={handleChange}
          placeholder={t('dialogs.newFile.placeholder')}
          helperText={t('dialogs.newFile.helper')}
          onKeyDown={handleKeyDown}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('common:buttons.cancel')}</Button>
        <Button variant="contained" onClick={handleConfirm} disabled={isDisabled}>
          {t('common:buttons.create')}
        </Button>
      </DialogActions>
    </Dialog>
  );
});

NewFileDialog.displayName = 'NewFileDialog';
