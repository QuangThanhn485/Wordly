import React, { useCallback } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button } from '@mui/material';

interface NewFolderDialogProps {
  open: boolean;
  value: string;
  onChange: (value: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}

export const NewFolderDialog: React.FC<NewFolderDialogProps> = React.memo(({ open, value, onChange, onClose, onConfirm }) => {
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
      <DialogTitle>Tạo thư mục con</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          fullWidth
          margin="dense"
          label="Tên thư mục"
          value={localValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Hủy</Button>
        <Button variant="contained" onClick={handleConfirm}>
          Tạo
        </Button>
      </DialogActions>
    </Dialog>
  );
});

NewFolderDialog.displayName = 'NewFolderDialog';

