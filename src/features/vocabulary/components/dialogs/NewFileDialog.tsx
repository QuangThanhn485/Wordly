import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button } from '@mui/material';

interface NewFileDialogProps {
  open: boolean;
  value: string;
  onChange: (value: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}

export const NewFileDialog: React.FC<NewFileDialogProps> = ({ open, value, onChange, onClose, onConfirm }) => {
  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Tạo file từ vựng mới</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          fullWidth
          margin="dense"
          label="Tên file"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="từ_vựng_mới.txt"
          helperText="File sẽ có phần mở rộng .txt tự động nếu chưa có"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && value.trim()) onConfirm();
          }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Hủy</Button>
        <Button variant="contained" onClick={onConfirm} disabled={!value.trim()}>
          Tạo
        </Button>
      </DialogActions>
    </Dialog>
  );
};

