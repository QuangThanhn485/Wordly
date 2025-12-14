import React, { useCallback } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button } from '@mui/material';
import { useTranslation } from 'react-i18next';

interface RenameDialogProps {
  open: boolean;
  value: string;
  onChange: (value: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}

export const RenameDialog: React.FC<RenameDialogProps> = React.memo(({ open, value, onChange, onClose, onConfirm }) => {
  const { t } = useTranslation('vocabulary');
  // Use local state for instant input response
  const [localValue, setLocalValue] = React.useState(value);
  
  // Sync with prop when dialog opens or value changes externally
  React.useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setLocalValue(newValue); // Update local state instantly - NO parent sync
  }, []);

  const handleConfirm = useCallback(() => {
    onChange(localValue); // Sync to parent only on confirm
    onConfirm();
  }, [localValue, onChange, onConfirm]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleConfirm();
    }
  }, [handleConfirm]);
  
  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>{t('dialogs.rename.title')}</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          fullWidth
          margin="dense"
          label={t('dialogs.rename.label')}
          value={localValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('common:buttons.cancel')}</Button>
        <Button variant="contained" onClick={handleConfirm}>
          {t('common:buttons.save')}
        </Button>
      </DialogActions>
    </Dialog>
  );
});

RenameDialog.displayName = 'RenameDialog';
