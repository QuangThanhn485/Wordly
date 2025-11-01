import React from 'react';
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
  onChange: (data: VocabItem) => void;
  onClose: () => void;
  onSave: () => void;
}

export const VocabFormDialog: React.FC<VocabFormDialogProps> = ({ open, mode, data, onChange, onClose, onSave }) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{mode === 'add' ? 'Thêm từ vựng' : 'Sửa từ vựng'}</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField
            autoFocus
            fullWidth
            label="Từ vựng *"
            value={data.word}
            onChange={(e) => onChange({ ...data, word: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && data.word.trim()) {
                onSave();
              }
            }}
          />
          <TextField
            fullWidth
            label="Nghĩa tiếng Việt"
            value={data.vnMeaning}
            onChange={(e) => onChange({ ...data, vnMeaning: e.target.value })}
          />
          <Box sx={{ display: 'flex', gap: 2 }}>
            <FormControl fullWidth>
              <InputLabel>Từ loại</InputLabel>
              <Select
                value={data.type}
                label="Từ loại"
                onChange={(e) => onChange({ ...data, type: e.target.value })}
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
              value={data.pronunciation}
              onChange={(e) => onChange({ ...data, pronunciation: e.target.value })}
              placeholder="ˈæp.əl"
            />
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Hủy</Button>
        <Button variant="contained" onClick={onSave} disabled={!data.word.trim()}>
          {mode === 'add' ? 'Thêm' : 'Lưu'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

