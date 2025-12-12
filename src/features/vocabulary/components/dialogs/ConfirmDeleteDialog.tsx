import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';

interface ConfirmDeleteDialogProps {
  open: boolean;
  type: 'folder' | 'file' | 'vocab';
  label: string;
  count?: number; // For vocab: number of words to delete
  onClose: () => void;
  onConfirm: () => void;
}

export const ConfirmDeleteDialog: React.FC<ConfirmDeleteDialogProps> = ({ open, type, label, count, onClose, onConfirm }) => {
  const { t } = useTranslation(['vocabulary', 'common']);

  const getMessage = () => {
    if (type === 'vocab') {
      return (
        <Typography>
          {t('dialogs.confirmDelete.message', { name: `${count || 0} ${t('common:labels.word')}` })}
        </Typography>
      );
    }
    return (
      <Typography>
        {t('dialogs.confirmDelete.message', { name: label })}
        {type === 'folder' && ` ${t('dialogs.confirmDelete.warning')}`}
      </Typography>
    );
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>{t('dialogs.confirmDelete.title')}</DialogTitle>
      <DialogContent>
        {getMessage()}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('common:buttons.cancel')}</Button>
        <Button color="error" variant="contained" onClick={onConfirm}>
          {t('common:buttons.delete')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
