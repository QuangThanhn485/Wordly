import React, { useMemo } from 'react';
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  Divider,
  CircularProgress,
  Alert,
  Button,
  Paper,
  Stack,
  Tabs,
  Tab,
} from '@mui/material';
import { Volume2, X, BookOpen, Sparkles } from 'lucide-react';
import { speak } from '@/utils/speechUtils';
import type { VocabItem } from '../types';
import { useTracauDetail } from '../hooks/useTracauDetail';
import { sanitizeTracauHtml } from '../utils/tracauApi';

type DetailVocab = VocabItem | { en: string; vi?: string };

interface VocabDetailPanelProps {
  open: boolean;
  vocab: DetailVocab | null;
  onClose: () => void;
}

const highlightTerm = (text: string, term?: string): string => {
  if (!text || !term) return text;
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');
  return text.replace(regex, '<mark class="vw-highlight">$1</mark>');
};

export const VocabDetailPanel: React.FC<VocabDetailPanelProps> = ({
  open,
  vocab,
  onClose,
}) => {
  const word = (vocab as VocabItem | null)?.word || (vocab as any)?.en || null;
  const { data, loading, error, retry } = useTracauDetail(word, open);
  const displayVi = (vocab as any)?.vi;
  const [activeTab, setActiveTab] = React.useState<'dict' | 'examples'>('dict');

  const fulltext = data?.tratu?.[0]?.fields?.fulltext ?? '';
  const sanitizedFulltext = useMemo(() => sanitizeTracauHtml(fulltext), [fulltext]);
  const sentences = data?.sentences ?? [];

  const handleSpeak = (text?: string) => {
    if (!text) return;
    speak(text);
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      sx={{ zIndex: (theme) => theme.zIndex.modal + 2 }}
      ModalProps={{
        keepMounted: true,
      }}
      PaperProps={{
        sx: {
          width: { xs: '100%', md: '60vw' },
          maxWidth: 960,
          minWidth: 360,
          height: '100vh',
          borderTopLeftRadius: { xs: 0, md: 16 },
          borderBottomLeftRadius: { xs: 0, md: 16 },
          boxShadow: 8,
          display: 'flex',
          flexDirection: 'column',
        },
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 2,
          py: 2,
          borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
          gap: 1.5,
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25, minWidth: 0 }}>
          <Typography
            variant="h5"
            fontWeight={800}
            sx={{ wordBreak: 'break-word', lineHeight: 1.2 }}
          >
            {word || '—'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            EN - VI
          </Typography>
          {displayVi ? (
            <Typography variant="body2" color="text.secondary" sx={{ wordBreak: 'break-word' }}>
              {displayVi}
            </Typography>
          ) : null}
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton
            onClick={() => handleSpeak(word ?? undefined)}
            aria-label="Phát âm từ"
            size="small"
            sx={{ border: (theme) => `1px solid ${theme.palette.divider}` }}
          >
            <Volume2 size={18} />
          </IconButton>
          <IconButton
            onClick={onClose}
            aria-label="Đóng"
            size="small"
            sx={{ border: (theme) => `1px solid ${theme.palette.divider}` }}
          >
            <X size={18} />
          </IconButton>
        </Box>
      </Box>

      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {loading ? (
          <Box
            sx={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 1.5,
            }}
          >
            <CircularProgress size={26} />
            <Typography variant="body2" color="text.secondary">
              Đang tải nội dung...
            </Typography>
          </Box>
        ) : error ? (
          <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Alert
              severity="error"
              action={
                <Button color="inherit" size="small" onClick={() => retry()}>
                  Thử lại
                </Button>
              }
            >
              Không tải được dữ liệu từ điển. Vui lòng thử lại sau.
            </Alert>
          </Box>
        ) : (
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', p: { xs: 2, md: 2.5 }, overflow: 'hidden', gap: 1.5 }}>
            <Tabs
              value={activeTab}
              onChange={(_, val) => setActiveTab(val)}
              variant="fullWidth"
              sx={{
                borderRadius: 1.5,
                bgcolor: 'background.paper',
                mb: 2,
                minHeight: 40,
                '& .MuiTab-root': { textTransform: 'none', fontWeight: 700, fontSize: '0.92rem', minHeight: 40, py: 0.25 },
              }}
            >
              <Tab value="dict" label="Nghĩa & Từ điển" icon={<BookOpen size={16} />} iconPosition="start" />
              <Tab value="examples" label="Ví dụ câu" icon={<Sparkles size={16} />} iconPosition="start" />
            </Tabs>

            {activeTab === 'dict' ? (
              <Paper
                variant="outlined"
                sx={{
                  p: { xs: 1.5, md: 2 },
                  borderRadius: 2,
                  flex: 1,
                  overflowY: 'auto',
                  bgcolor: 'background.default',
                }}
              >
                {sanitizedFulltext ? (
                  <Box
                    sx={{
                      fontSize: { xs: '0.9rem', md: '0.95rem' },
                      lineHeight: 1.55,
                      '& table': { width: '100%', borderCollapse: 'collapse' },
                      '& td': { padding: '2px 4px', verticalAlign: 'top' },
                      '& p, & blockquote, & table, & tr, & td, & article, & div': {
                        marginBlock: '4px',
                      },
                      '& br': { display: 'block', margin: '4px 0' },
                      '& em': { color: 'primary.main', fontStyle: 'normal', fontWeight: 700 },
                      '& k': { fontWeight: 700 },
                    }}
                    dangerouslySetInnerHTML={{ __html: sanitizedFulltext }}
                  />
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    Chưa có dữ liệu từ điển chi tiết cho từ này.
                  </Typography>
                )}
              </Paper>
            ) : (
              <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1,
                    overflowY: 'auto',
                  }}
                >
                  {sentences.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                      Chưa có ví dụ câu cho từ này.
                    </Typography>
                  ) : (
                    sentences.map((sentence) => (
                      <Paper
                        key={sentence._id}
                        variant="outlined"
                        sx={{
                          p: { xs: 1.25, md: 1.5 },
                          borderRadius: 2,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 0.75,
                          borderLeft: (theme) => `3px solid ${theme.palette.primary.main}`,
                          '& mark.vw-highlight': {
                            backgroundColor: (theme) => theme.palette.primary.light + '40',
                            color: 'primary.main',
                            fontWeight: 700,
                            padding: '0 2px',
                            borderRadius: 4,
                          },
                          '& em, & strong': {
                            color: 'primary.main',
                            fontWeight: 700,
                            backgroundColor: (theme) => theme.palette.primary.light + '30',
                            padding: '0 2px',
                            borderRadius: 3,
                            fontStyle: 'normal',
                          },
                        }}
                      >
                        <Typography
                          variant="body1"
                          fontWeight={600}
                          sx={{ wordBreak: 'break-word' }}
                          dangerouslySetInnerHTML={{ __html: highlightTerm(sentence.fields.en, word || undefined) }}
                        />
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ wordBreak: 'break-word', pl: 0.5 }}
                          dangerouslySetInnerHTML={{ __html: highlightTerm(sentence.fields.vi, word || undefined) }}
                        />
                      </Paper>
                    ))
                  )}
                </Box>
              </Box>
            )}
          </Box>
        )}
      </Box>
    </Drawer>
  );
};
