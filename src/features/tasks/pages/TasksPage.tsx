import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  Container,
  IconButton,
  Paper,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import { AlertCircle, CalendarPlus, ListTodo, LocateFixed } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { DATABASE_KEYS } from '@/data';
import { seedTopicTrainingSessions } from '@/features/train/utils/startTopicTraining';
import { TaskCalendar } from '../components/TaskCalendar';
import { TaskDayDetail } from '../components/TaskDayDetail';
import {
  groupTasksByDay,
  loadReviewTasks,
  setReviewTaskStatus,
  sweepExpiredTasks,
  type ReviewTask,
} from '../utils/tasksStorage';
import { startReviewTraining } from '../utils/reviewTraining';
import { dayKeyOf, parseDayKey, todayKey } from '../utils/taskDates';
import { MOBILE_PAGE_VIEWPORT_HEIGHT } from '@/layouts/mobileLayoutConstants';

const startOfMonth = (date: Date): Date => new Date(date.getFullYear(), date.getMonth(), 1);

/** Apply the daily upkeep rules before reading (idempotent). */
const sweepAndLoadTasks = (): ReviewTask[] => {
  sweepExpiredTasks();
  return loadReviewTasks();
};

const TasksPage: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation('tasks');
  const locale = i18n.language || 'en';

  const [tasks, setTasks] = useState<ReviewTask[]>(sweepAndLoadTasks);
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const [activeStartDate, setActiveStartDate] = useState<Date>(() => startOfMonth(new Date()));

  const byDay = useMemo(() => groupTasksByDay(tasks), [tasks]);
  const today = todayKey();

  const pendingToday = useMemo(
    () => tasks.filter((task) => task.status === 'new' && task.dueDate === today).length,
    [tasks, today],
  );
  const overdue = useMemo(
    () => tasks.filter((task) => task.status === 'new' && task.dueDate < today),
    [tasks, today],
  );

  const selectedTasks = byDay.get(dayKeyOf(selectedDate)) ?? [];

  const refresh = useCallback(() => setTasks(sweepAndLoadTasks()), []);

  // Stay fresh: pick up writes from other tabs (training completion, new
  // schedules) and re-read on focus so the today/overdue signals survive
  // midnight and long-lived windows.
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === DATABASE_KEYS.learningTasks) refresh();
    };
    const onFocus = () => refresh();
    window.addEventListener('storage', onStorage);
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, [refresh]);

  const goToday = useCallback(() => {
    const now = new Date();
    setSelectedDate(now);
    setActiveStartDate(startOfMonth(now));
  }, []);

  const goOldestOverdue = useCallback(() => {
    if (overdue.length === 0) return;
    const oldest = overdue.reduce((a, b) => (a.dueDate < b.dueDate ? a : b));
    const date = parseDayKey(oldest.dueDate);
    setSelectedDate(date);
    setActiveStartDate(startOfMonth(date));
  }, [overdue]);

  const handleStartTraining = useCallback(
    (task: ReviewTask, full = false) => {
      // Anchor day learns the FULL topic. Review stages default to the
      // top-40% most-mistaken subset to keep the cycle light, but the learner
      // may opt into the full set — full runs also complete review tasks.
      if (task.stageIndex > 0 && !full) {
        const url = startReviewTraining(task.topicId, task.topicLabel);
        if (url) {
          navigate(url);
          return;
        }
      }
      navigate(seedTopicTrainingSessions(task.topicId, task.topicLabel));
    },
    [navigate],
  );

  const handleToggleStatus = useCallback(
    (task: ReviewTask) => {
      setReviewTaskStatus(task.id, task.status === 'skipped' ? 'new' : 'skipped');
      refresh();
    },
    [refresh],
  );

  if (tasks.length === 0) {
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
            <ListTodo size={72} style={{ opacity: 0.4 }} />
            <Typography variant="h6" fontWeight={700}>
              {t('empty.title')}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 440 }}>
              {t('empty.description')}
            </Typography>
            <Button
              variant="contained"
              startIcon={<CalendarPlus size={18} />}
              onClick={() => navigate('/vocabulary')}
            >
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
        {/* Toolbar: title + today/overdue signals + jump-to-today */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 1.5,
            mb: 2,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
            <ListTodo size={24} style={{ flexShrink: 0 }} />
            <Typography variant="h6" fontWeight={700} noWrap>
              {t('title')}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {pendingToday > 0 && (
              <Chip
                size="small"
                color="primary"
                variant="outlined"
                label={t('toolbar.today', { count: pendingToday })}
                onClick={goToday}
              />
            )}
            {overdue.length > 0 && (
              <Chip
                size="small"
                color="error"
                icon={<AlertCircle size={14} />}
                label={t('toolbar.overdue', { count: overdue.length })}
                onClick={goOldestOverdue}
                sx={{ '& .MuiChip-icon': { ml: 0.5 } }}
              />
            )}
            <Tooltip title={t('today')}>
              <IconButton size="small" onClick={goToday} aria-label={t('today')} color="primary">
                <LocateFixed size={18} />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* Two-pane: calendar + selected-day tasks */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 2.4fr) minmax(300px, 1fr)' },
            gap: 2,
            alignItems: 'start',
          }}
        >
          <Paper variant="outlined" sx={{ p: { xs: 1.5, sm: 2, md: 2.5 }, borderRadius: 2 }}>
            <TaskCalendar
              locale={locale}
              value={selectedDate}
              byDay={byDay}
              onClickDay={setSelectedDate}
              activeStartDate={activeStartDate}
              onActiveStartDateChange={setActiveStartDate}
            />
            {/* Legend */}
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
              {[
                { color: theme.palette.success.main, label: t('task.new') },
                { color: theme.palette.info.main, label: t('task.review') },
                { color: theme.palette.error.main, label: t('task.overdue') },
                { color: theme.palette.text.disabled, label: t('task.done') },
              ].map((item) => (
                <Box key={item.label} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: item.color }} />
                  <Typography variant="caption" color="text.secondary" noWrap>
                    {item.label}
                  </Typography>
                </Box>
              ))}
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
            <TaskDayDetail
              date={selectedDate}
              tasks={selectedTasks}
              locale={locale}
              todayKey={today}
              onStartTraining={handleStartTraining}
              onToggleStatus={handleToggleStatus}
            />
          </Paper>
        </Box>
      </Container>
    </Box>
  );
};

export default TasksPage;
