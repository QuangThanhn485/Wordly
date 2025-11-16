import React, { useState } from 'react';
import {
  Box,
  Drawer,
  IconButton,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Divider,
  useTheme,
  useMediaQuery,
  Fab,
  Tooltip,
} from '@mui/material';
import { List as ListIcon, X, Volume2 } from 'lucide-react';
import { speakEnglish } from '@/utils/speechUtils';
import { removeFileExtension } from '@/utils/fileUtils';

interface VocabularyItem {
  en: string;
  vi: string;
}

interface VocabularyQuickViewProps {
  vocabularyList: VocabularyItem[];
  currentFileName?: string | null;
}

export const VocabularyQuickView: React.FC<VocabularyQuickViewProps> = ({
  vocabularyList,
  currentFileName,
}) => {
  const [open, setOpen] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const handleToggle = () => {
    setOpen(!open);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleSpeak = (word: string) => {
    speakEnglish(word, { lang: 'en-US' });
  };

  return (
    <>
      {/* Floating Action Button - Pinned to right edge */}
      <Tooltip title="Vocabulary List" placement="left">
        <Fab
          color="primary"
          aria-label="vocabulary list"
          onClick={handleToggle}
          sx={{
            position: 'fixed',
            right: 0,
            top: { xs: 180, sm: 180 },
            zIndex: (theme) => theme.zIndex.speedDial,
            borderRadius: { xs: '50% 0 0 50%', sm: '50% 0 0 50%' },
            boxShadow: 3,
          }}
        >
          <ListIcon size={24} />
        </Fab>
      </Tooltip>

      {/* Drawer/Modal for Vocabulary List */}
      <Drawer
        anchor={isMobile ? 'bottom' : 'right'}
        open={open}
        onClose={handleClose}
        PaperProps={{
          sx: {
            width: isMobile ? '100%' : { sm: 400, md: 450 },
            height: isMobile ? '100%' : 'auto',
            maxHeight: isMobile ? '100%' : '100vh',
          },
        }}
      >
        <Box
          sx={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Header */}
          <Box
            sx={{
              p: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: `1px solid ${theme.palette.divider}`,
              bgcolor: 'background.paper',
            }}
          >
            <Box>
              <Typography variant="h6" fontWeight={600}>
                Vocabulary List
              </Typography>
              {currentFileName && (
                <Typography variant="caption" color="text.secondary">
                  {removeFileExtension(currentFileName)}
                </Typography>
              )}
            </Box>
            <IconButton onClick={handleClose} size="small">
              <X size={20} />
            </IconButton>
          </Box>

          {/* Vocabulary List */}
          <Box sx={{ flex: 1, overflow: 'auto' }}>
            {vocabularyList.length === 0 ? (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  p: 3,
                }}
              >
                <Typography color="text.secondary">
                  No vocabulary loaded
                </Typography>
              </Box>
            ) : (
              <List sx={{ p: 0 }}>
                {vocabularyList.map((item, index) => (
                  <React.Fragment key={`${item.en}-${index}`}>
                    <ListItem disablePadding>
                      <ListItemButton
                        onClick={() => handleSpeak(item.en)}
                        sx={{
                          py: 2,
                          px: 2,
                        }}
                      >
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                              <Volume2 size={16} style={{ color: 'inherit', opacity: 0.6 }} />
                              <Typography
                                variant="body1"
                                fontWeight={600}
                                sx={{ color: 'primary.main' }}
                              >
                                {item.en}
                              </Typography>
                            </Box>
                          }
                          secondary={
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{ mt: 0.25, ml: 3 }}
                            >
                              {item.vi}
                            </Typography>
                          }
                        />
                      </ListItemButton>
                    </ListItem>
                    {index < vocabularyList.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            )}
          </Box>

          {/* Footer - Total count */}
          <Box
            sx={{
              p: 2,
              borderTop: `1px solid ${theme.palette.divider}`,
              bgcolor: 'background.paper',
            }}
          >
            <Typography variant="body2" color="text.secondary" align="center">
              Total: {vocabularyList.length} {vocabularyList.length === 1 ? 'word' : 'words'}
            </Typography>
          </Box>
        </Box>
      </Drawer>
    </>
  );
};

