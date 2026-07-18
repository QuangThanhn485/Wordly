import React, { useCallback, useMemo, useRef } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button } from '@mui/material';
import { useTranslation } from 'react-i18next';

interface NewTopicDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (topicLabel: string) => void;
}

export const NewTopicDialog: React.FC<NewTopicDialogProps> = React.memo(({ open, onClose, onConfirm }) => {
  const { t } = useTranslation('vocabulary');
  const [topicLabel, setTopicLabel] = React.useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset và focus khi mở dialog
  React.useEffect(() => {
    if (open) {
      setTopicLabel('');
      // Focus sau khi dialog animation hoàn thành
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [open]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setTopicLabel(e.target.value);
  }, []);

  const handleConfirm = useCallback(() => {
    const trimmed = topicLabel.trim();
    if (trimmed) {
      onConfirm(trimmed); // Truyền giá trị trực tiếp - không race condition!
    }
  }, [topicLabel, onConfirm]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && topicLabel.trim()) {
      handleConfirm();
    }
  }, [topicLabel, handleConfirm]);

  const isDisabled = useMemo(() => !topicLabel.trim(), [topicLabel]);
  
  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>{t('dialogs.newTopic.title')}</DialogTitle>
      <DialogContent>
        <TextField
          inputRef={inputRef}
          fullWidth
          margin="dense"
          label={t('dialogs.newTopic.label')}
          value={topicLabel}
          onChange={handleChange}
          placeholder={t('dialogs.newTopic.placeholder')}
          helperText={t('dialogs.newTopic.helper')}
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

NewTopicDialog.displayName = 'NewTopicDialog';
