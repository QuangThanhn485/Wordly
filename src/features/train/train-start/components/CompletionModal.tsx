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
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation('train');
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
            {t('completion.title')}
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          {t('completion.congratulations')}
        </Typography>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* Total Mistakes */}
          <Box>
            <Typography variant="subtitle1" fontWeight={600} gutterBottom>
              {t('completion.mistakes')}: <Chip label={totalMistakes} size="small" color={totalMistakes > 0 ? 'error' : 'success'} />
            </Typography>
          </Box>

          <Divider />

          {/* Mistakes List */}
          {mistakes.length > 0 ? (
            <Box>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <ErrorOutlineIcon fontSize="small" color="error" />
                {t('completion.mistakes')}
              </Typography>
              <List dense>
                {mistakes.map((mistake) => (
                  <ListItem key={mistake.word} disableGutters secondaryAction={<Chip label={`x${mistake.count}`} size="small" color="error" />}>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body1" fontWeight={600}>
                            {mistake.word}
                          </Typography>
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
                {t('completion.noMistakes')}
              </Typography>
            </Box>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
        <Button onClick={onExit} variant="outlined" color="inherit">
          {t('buttons.exit')}
        </Button>
        <Button onClick={onRestart} variant="contained" color="primary">
          {t('buttons.restart')}
        </Button>
        <Button onClick={onNextMode} variant="contained" color="primary" disabled>
          {t('buttons.nextMode')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
