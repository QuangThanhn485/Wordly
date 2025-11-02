import React, { useCallback, useMemo } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button } from '@mui/material';

interface NewFileDialogProps {
  open: boolean;
  value: string;
  onChange: (value: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}

export const NewFileDialog: React.FC<NewFileDialogProps> = React.memo(({ open, value, onChange, onClose, onConfirm }) => {
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
    if (e.key === 'Enter' && localValue.trim()) {
      handleConfirm();
    }
  }, [localValue, handleConfirm]);

  const isDisabled = useMemo(() => !localValue.trim(), [localValue]);
  
  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Tạo file từ vựng mới</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          fullWidth
          margin="dense"
          label="Tên file"
          value={localValue}
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

