import React, { useCallback, useState } from 'react';
import { Box, Button, Container, IconButton, Paper, Tooltip, Typography, useTheme } from '@mui/material';
import { CalendarDays, CalendarPlus, LocateFixed } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { saveTrainingSession as saveReadingSession } from '@/features/train/train-start/sessionStorage';
import { saveTrainingSession as saveListeningSession } from '@/features/train/train-listen/sessionStorage';
import { saveTrainingSession as saveReadWriteSession } from '@/features/train/train-read-write/sessionStorage';
import { saveTrainingSession as saveListenWriteSession } from '@/features/train/train-listen-write/sessionStorage';
import { createTrainingSearchParams } from '@/features/train/utils/topicSession';
import type { TrainingHistoryEntry } from '@/features/train/utils/trainingHistory';
import { useTrainingHistory } from '../hooks/useTrainingHistory';
import { dayKey, summarizeDay } from '../utils/historyCalendar';
import { getKindMeta } from '../utils/modeMeta';
import type { TrainingHistoryKind } from '@/features/train/utils/trainingHistory';
import { HistoryCalendar } from '../components/HistoryCalendar';
import { DayDetail } from '../components/DayDetail';
import { MOBILE_PAGE_VIEWPORT_HEIGHT } from '@/layouts/mobileLayoutConstants';

const startOfMonth = (date: Date): Date => new Date(date.getFullYear(), date.getMonth(), 1);

const HistoryPage: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation('history');
  const locale = i18n.language || 'en';

  const { byDay, hasData, anchorDate } = useTrainingHistory();

  const [activeStartDate, setActiveStartDate] = useState<Date>(() => startOfMonth(anchorDate));
  const [selectedDate, setSelectedDate] = useState<Date>(anchorDate);

  const selectedEntries = byDay.get(dayKey(selectedDate)) ?? [];

  const summaryLabel = useCallback(
    (entries: TrainingHistoryEntry[]) => {
      const summary = summarizeDay(entries);
      return t('tooltip.sessions', {
        sessions: summary.sessions,
        words: summary.words,
        mistakes: summary.mistakes,
      });
    },
    [t],
  );

  const goToday = () => {
    const now = new Date();
    setActiveStartDate(startOfMonth(now));
    setSelectedDate(now);
  };

  // Seed the four training sessions for the topic, then open the first mode.
  const handleStartTraining = useCallback(
    (topicId: string, topicLabel: string) => {
      const baseSession = { topicId, topicLabel, timestamp: Date.now() };
      saveReadingSession({ ...baseSession, score: 0, mistakes: 0, flipped: {}, targetIdx: 0, language: 'vi' });
      saveListeningSession({ ...baseSession, score: 0, mistakes: 0, flipped: {}, targetIdx: 0, language: 'en', hasStarted: false });
      saveReadWriteSession({ ...baseSession, currentWordIndex: 0, completedWords: [], mode: 'vi-en', score: 0, mistakes: 0 });
      saveListenWriteSession({ ...baseSession, currentWordIndex: 0, completedWords: [], mode: 'vi-en', score: 0, mistakes: 0, hasStarted: false });
      const params = createTrainingSearchParams({ topicId });
      navigate(`/train/flashcards-reading?${params.toString()}`);
    },
    [navigate],
  );

  if (!hasData) {
    return (
      <Box sx={{ width: '100%', minHeight: { xs: MOBILE_PAGE_VIEWPORT_HEIGHT, md: '100vh' }, bgcolor: 'background.default', py: { xs: 1.5, md: 3 } }}>
        <Container maxWidth="sm">
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              gap: 2,
              py: { xs: 8, sm: 12 },
              px: 2,
            }}
          >
            <CalendarDays size={72} style={{ opacity: 0.4 }} />
            <Typography variant="h6" fontWeight={700}>
              {t('empty.title')}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 420 }}>
              {t('empty.description')}
            </Typography>
            <Button variant="contained" startIcon={<CalendarPlus size={18} />} onClick={() => navigate('/vocabulary')}>
              {t('empty.action')}
            </Button>
          </Box>
        </Container>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', minHeight: { xs: MOBILE_PAGE_VIEWPORT_HEIGHT, md: '100vh' }, bgcolor: 'background.default', py: { xs: 1.5, md: 3 } }}>
      <Container maxWidth="xl" sx={{ px: { xs: 1.5, sm: 2, md: 3 } }}>
        {/* Toolbar: title + jump to today */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1.5, mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
            <CalendarDays size={24} style={{ flexShrink: 0 }} />
            <Typography variant="h6" fontWeight={700} noWrap>
              {t('title')}
            </Typography>
          </Box>
          <Tooltip title={t('today')}>
            <IconButton size="small" onClick={goToday} aria-label={t('today')} color="primary">
              <LocateFixed size={18} />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Two-pane: calendar + selected-day detail */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 2.4fr) minmax(300px, 1fr)' },
            gap: 2,
            alignItems: 'start',
          }}
        >
          <Paper variant="outlined" sx={{ p: { xs: 1.5, sm: 2, md: 2.5 }, borderRadius: 2 }}>
            <HistoryCalendar
              locale={locale}
              value={selectedDate}
              activeStartDate={activeStartDate}
              byDay={byDay}
              summaryLabel={summaryLabel}
              onClickDay={setSelectedDate}
              onActiveStartDateChange={setActiveStartDate}
            />

            {/* Legend: new vs review */}
            <Box
              sx={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 2,
                mt: 1.5,
                pt: 1.5,
                borderTop: `1px solid ${theme.palette.divider}`,
              }}
            >
              {(['new', 'review'] as TrainingHistoryKind[]).map((kind) => {
                const { Icon, palette, labelKey } = getKindMeta(kind);
                return (
                  <Box key={kind} sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 0 }}>
                    <Box sx={{ color: theme.palette[palette].main, display: 'flex' }}>
                      <Icon size={14} />
                    </Box>
                    <Typography variant="caption" color="text.secondary" noWrap>
                      {t(labelKey)}
                    </Typography>
                  </Box>
                );
              })}
            </Box>
          </Paper>

          <Paper
            variant="outlined"
            sx={{
              p: { xs: 1.5, sm: 2 },
              borderRadius: 2,
              position: { md: 'sticky' },
              top: { md: 16 },
              maxHeight: { md: 'calc(100vh - 32px)' },
              display: 'flex',
              flexDirection: 'column',
              minHeight: { xs: 160, md: 320 },
            }}
          >
            <DayDetail
              date={selectedDate}
              entries={selectedEntries}
              locale={locale}
              onStartTraining={handleStartTraining}
            />
          </Paper>
        </Box>
      </Container>
    </Box>
  );
};

export default HistoryPage;
