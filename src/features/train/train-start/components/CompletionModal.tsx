// src/features/train/train-start/components/CompletionModal.tsx
import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  List,
  ListItem,
  ListItemText,
  Divider,
  Chip,
} from '@mui/material';
import { CheckCircle as CheckCircleIcon, AlertCircle as ErrorOutlineIcon } from 'lucide-react';

export type SessionMistake = {
  word: string; // English word
  viMeaning: string; // Vietnamese meaning
  count: number; // Number of mistakes in this session
};

interface CompletionModalProps {
  open: boolean;
  totalMistakes: number;
  mistakes: SessionMistake[]; // List of words with mistake counts for this session
  onExit: () => void;
  onRestart: () => void;
  onNextMode: () => void;
}

export const CompletionModal: React.FC<CompletionModalProps> = ({
  open,
  totalMistakes,
  mistakes,
  onExit,
  onRestart,
  onNextMode,
}) => {
  return (
    <Dialog
      open={open}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
        },
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CheckCircleIcon size={32} color="green" />
          <Typography variant="h5" fontWeight={600}>
            Congratulations!
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          You've completed all cards!
        </Typography>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* Total Mistakes */}
          <Box>
            <Typography variant="subtitle1" fontWeight={600} gutterBottom>
              Total Mistakes: <Chip label={totalMistakes} size="small" color={totalMistakes > 0 ? 'error' : 'success'} />
            </Typography>
          </Box>

          <Divider />

          {/* Mistakes List */}
          {mistakes.length > 0 ? (
            <Box>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <ErrorOutlineIcon fontSize="small" color="error" />
                Words with Mistakes:
              </Typography>
              <List dense sx={{ maxHeight: 300, overflow: 'auto', bgcolor: 'background.default', borderRadius: 1, p: 1 }}>
                {mistakes.map((mistake, idx) => (
                  <ListItem
                    key={`${mistake.word}-${idx}`}
                    sx={{
                      bgcolor: 'background.paper',
                      borderRadius: 1,
                      mb: 0.5,
                      '&:last-child': { mb: 0 },
                    }}
                  >
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                          <Typography variant="body1" fontWeight={600}>
                            {mistake.word}
                          </Typography>
                          <Chip label={`${mistake.count} ${mistake.count === 1 ? 'time' : 'times'}`} size="small" color="error" />
                        </Box>
                      }
                      secondary={
                        <Typography variant="body2" color="text.secondary">
                          {mistake.viMeaning}
                        </Typography>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
          ) : (
            <Box sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="body1" color="success.main" fontWeight={500}>
                Perfect! No mistakes! 🎉
              </Typography>
            </Box>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
        <Button onClick={onExit} variant="outlined" color="inherit">
          Exit
        </Button>
        <Button onClick={onRestart} variant="contained" color="primary">
          Restart
        </Button>
        <Button onClick={onNextMode} variant="contained" color="primary">
          Next Training Mode
        </Button>
      </DialogActions>
    </Dialog>
  );
};

