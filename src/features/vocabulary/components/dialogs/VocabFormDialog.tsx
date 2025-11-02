import React, { useCallback, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Select,
  FormControl,
  InputLabel,
  FormHelperText,
  MenuItem,
} from '@mui/material';
import type { VocabItem } from '../../types';
import { WORD_TYPES } from '../../constants/wordTypes';

interface VocabFormDialogProps {
  open: boolean;
  mode: 'add' | 'edit';
  data: VocabItem;
  onChange?: (data: VocabItem) => void; // Optional - only for compatibility
  onClose: () => void;
  onSave: (data: VocabItem) => void; // Receives data as parameter
}

export const VocabFormDialog: React.FC<VocabFormDialogProps> = React.memo(({ open, mode, data, onChange, onClose, onSave }) => {
  // Use local state for instant input response - sync with prop only on open/change
  const [localData, setLocalData] = React.useState(data);
  
  // Sync local state when data prop changes (e.g., when dialog opens with new data)
  React.useEffect(() => {
    setLocalData(data);
  }, [data]);

  // Update local state instantly - NO parent sync during typing
  // Only sync when dialog closes or save is clicked
  const handleWordChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setLocalData((prev) => ({ ...prev, word: newValue }));
  }, []);

  const handleVnMeaningChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setLocalData((prev) => ({ ...prev, vnMeaning: newValue }));
  }, []);

  const handleTypeChange = useCallback((e: { target: { value: unknown } }) => {
    const newValue = e.target.value as string;
    setLocalData((prev) => ({ ...prev, type: newValue }));
  }, []);

  const handlePronunciationChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setLocalData((prev) => ({ ...prev, pronunciation: newValue }));
  }, []);

  // Sync to parent only when saving
  const handleSave = useCallback(() => {
    onSave(localData); // Pass local state directly to save handler
  }, [localData, onSave]);

  const handleClose = useCallback(() => {
    // Optionally sync before close to preserve unsaved changes
    // onChange(localData);
    onClose();
  }, [onClose]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && localData.word.trim()) {
      handleSave();
    }
  }, [localData.word, handleSave]);

  const isSaveDisabled = useMemo(() => !localData.word.trim(), [localData.word]);
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{mode === 'add' ? 'Thêm từ vựng' : 'Sửa từ vựng'}</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField
            autoFocus
            fullWidth
            label="Từ vựng *"
            value={localData.word}
            onChange={handleWordChange}
            onKeyDown={handleKeyDown}
          />
          <TextField
            fullWidth
            label="Nghĩa tiếng Việt"
            value={localData.vnMeaning}
            onChange={handleVnMeaningChange}
          />
          <Box sx={{ display: 'flex', gap: 2 }}>
            <FormControl fullWidth>
              <InputLabel>Từ loại</InputLabel>
              <Select
                value={localData.type}
                label="Từ loại"
                onChange={handleTypeChange}
              >
                <MenuItem value="">
                  <em>Chọn loại từ</em>
                </MenuItem>
                {WORD_TYPES.map((type) => (
                  <MenuItem key={type.value} value={type.value}>
                    {type.label}
                  </MenuItem>
                ))}
              </Select>
              <FormHelperText>Chọn loại từ trong tiếng Anh</FormHelperText>
            </FormControl>
            <TextField
              fullWidth
              label="Phát âm"
              value={localData.pronunciation}
              onChange={handlePronunciationChange}
              placeholder="ˈæp.əl"
            />
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Hủy</Button>
        <Button variant="contained" onClick={handleSave} disabled={isSaveDisabled}>
          {mode === 'add' ? 'Thêm' : 'Lưu'}
        </Button>
      </DialogActions>
    </Dialog>
  );
});

VocabFormDialog.displayName = 'VocabFormDialog';

