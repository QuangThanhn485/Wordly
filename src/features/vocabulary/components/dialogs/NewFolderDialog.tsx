import React, { useCallback, useRef } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button } from '@mui/material';

interface NewFolderDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (folderName: string) => void;
}

export const NewFolderDialog: React.FC<NewFolderDialogProps> = React.memo(({ open, onClose, onConfirm }) => {
  const [folderName, setFolderName] = React.useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset và focus khi mở dialog
  React.useEffect(() => {
    if (open) {
      setFolderName('');
      // Focus sau khi dialog animation hoàn thành
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [open]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFolderName(e.target.value);
  }, []);

  const handleConfirm = useCallback(() => {
    const trimmed = folderName.trim();
    if (trimmed) {
      onConfirm(trimmed); // Truyền giá trị trực tiếp - không race condition!
    }
  }, [folderName, onConfirm]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && folderName.trim()) {
      handleConfirm();
    }
  }, [folderName, handleConfirm]);

  const isDisabled = React.useMemo(() => !folderName.trim(), [folderName]);
  
  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Tạo thư mục con</DialogTitle>
      <DialogContent>
        <TextField
          inputRef={inputRef}
          fullWidth
          margin="dense"
          label="Tên thư mục"
          value={folderName}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Thư mục mới"
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

NewFolderDialog.displayName = 'NewFolderDialog';

