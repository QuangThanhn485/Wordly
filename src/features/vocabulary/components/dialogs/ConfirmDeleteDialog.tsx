import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography } from '@mui/material';

interface ConfirmDeleteDialogProps {
  open: boolean;
  type: 'folder' | 'file' | 'vocab';
  label: string;
  count?: number; // For vocab: number of words to delete
  onClose: () => void;
  onConfirm: () => void;
}

export const ConfirmDeleteDialog: React.FC<ConfirmDeleteDialogProps> = ({ open, type, label, count, onClose, onConfirm }) => {
  const getMessage = () => {
    if (type === 'vocab') {
      return (
        <Typography>
          Bạn có chắc muốn xoá <b>{count || 0} từ vựng</b> đã chọn?
        </Typography>
      );
    }
    return (
      <Typography>
        Bạn có chắc muốn xoá <b>{label}</b>
        {type === 'folder' ? ' và toàn bộ nội dung bên trong' : ''}?
      </Typography>
    );
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Xác nhận xoá</DialogTitle>
      <DialogContent>
        {getMessage()}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Hủy</Button>
        <Button color="error" variant="contained" onClick={onConfirm}>
          Xoá
        </Button>
      </DialogActions>
    </Dialog>
  );
};

