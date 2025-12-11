import React, { useCallback, useMemo, useRef } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button } from '@mui/material';

interface NewFileDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (fileName: string) => void;
}

export const NewFileDialog: React.FC<NewFileDialogProps> = React.memo(({ open, onClose, onConfirm }) => {
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
      <DialogTitle>Tạo file từ vựng mới</DialogTitle>
      <DialogContent>
        <TextField
          inputRef={inputRef}
          fullWidth
          margin="dense"
          label="Tên file"
          value={fileName}
          onChange={handleChange}
          placeholder="từ_vựng_mới.txt"
          helperText="File sẽ có phần mở rộng .txt tự động nếu chưa có"
          onKeyDown={handleKeyDown}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Hủy</Button>
        <Button variant="contained" onClick={handleConfirm} disabled={isDisabled}>
          Tạo
        </Button>
      </DialogActions>
    </Dialog>
  );
});

NewFileDialog.displayName = 'NewFileDialog';

