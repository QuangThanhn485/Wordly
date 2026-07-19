import React, { useCallback, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
  ArrowRight,
  CheckCircle2,
  ListTodo,
  Rocket,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { seedTopicTrainingSessions } from '@/features/train/utils/startTopicTraining';
import {
  loadReviewTasks,
  sweepExpiredTasks,
  type ReviewTask,
} from '../utils/tasksStorage';
import { startReviewTraining } from '../utils/reviewTraining';
import { todayKey } from '../utils/taskDates';
import { ModeProgress } from './ModeProgress';

const STATUS_ORDER = { new: 0, skipped: 1, done: 2 } as const;

/** Today's tasks, upkeep rules applied first; pending before done/skipped. */
const loadTodayTasks = (): ReviewTask[] => {
  sweepExpiredTasks();
  const today = todayKey();
  return loadReviewTasks()
    .filter((task) => task.dueDate === today)
    .sort(
      (a, b) =>
        STATUS_ORDER[a.status] - STATUS_ORDER[b.status] ||
        a.topicLabel.localeCompare(b.topicLabel, 'vi'),
    );
};

/**
 * Compact "today's tasks" card for the home page. Renders nothing when the
 * day has no tasks so a fresh home stays clean.
 */
export const TodayTasksCard: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { t } = useTranslation('tasks');
  const [tasks] = useState<ReviewTask[]>(loadTodayTasks);

  const handleStart = useCallback(
    (task: ReviewTask, full = false) => {
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

  if (tasks.length === 0) return null;

  const pendingCount = tasks.filter((task) => task.status === 'new').length;

  return (
    <Card variant="outlined" sx={{ mb: { xs: 4, sm: 6 }, borderRadius: 2, textAlign: 'left' }}>
      <CardContent sx={{ p: { xs: 2, sm: 2.5 }, '&:last-child': { pb: { xs: 2, sm: 2.5 } } }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5, minWidth: 0 }}>
          <ListTodo size={20} style={{ flexShrink: 0, color: theme.palette.primary.main }} />
          <Typography sx={{ fontWeight: 700, fontSize: '1.05rem', minWidth: 0 }} noWrap>
            {t('todayCard.title')}
          </Typography>
          {pendingCount > 0 && (
            <Chip size="small" color="primary" label={pendingCount} sx={{ fontWeight: 700 }} />
          )}
          <Button
            size="small"
            endIcon={<ArrowRight size={14} />}
            onClick={() => navigate('/tasks')}
            sx={{ ml: 'auto', flexShrink: 0, whiteSpace: 'nowrap' }}
          >
            {t('todayCard.viewAll')}
          </Button>
        </Box>

        {/* Task rows */}
        {tasks.map((task, index) => {
          const isReview = task.stageIndex > 0;
          const KindIcon = isReview ? RotateCcw : Sparkles;
          const accent = isReview ? theme.palette.info.main : theme.palette.success.main;
          const done = task.status === 'done';
          const skipped = task.status === 'skipped';
          return (
            <Box
              key={task.id}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                flexWrap: 'wrap',
                py: 1,
                borderTop: index > 0 ? `1px solid ${theme.palette.divider}` : 'none',
                opacity: skipped ? 0.55 : 1,
              }}
            >
              <Tooltip title={t(isReview ? 'task.review' : 'task.new')}>
                <Box
                  sx={{
                    width: 28,
                    height: 28,
                    flexShrink: 0,
                    borderRadius: 1.5,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: accent,
                    bgcolor: alpha(accent, 0.12),
                  }}
                >
                  <KindIcon size={15} />
                </Box>
              </Tooltip>
              <Typography
                sx={{
                  fontWeight: 600,
                  minWidth: 0,
                  flex: 1,
                  textDecoration: skipped ? 'line-through' : 'none',
                }}
                noWrap
                title={task.topicLabel}
              >
                {task.topicLabel}
              </Typography>
              <ModeProgress task={task} />
              {done ? (
                <Tooltip title={t('task.done')}>
                  <Box sx={{ display: 'flex', color: 'success.main', flexShrink: 0 }}>
                    <CheckCircle2 size={19} />
                  </Box>
                </Tooltip>
              ) : skipped ? null : (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
                  {isReview && (
                    <Tooltip title={t('task.trainFullHint')}>
                      <Button
                        variant="text"
                        size="small"
                        onClick={() => handleStart(task, true)}
                        sx={{ whiteSpace: 'nowrap', color: 'text.secondary' }}
                      >
                        {t('task.trainFull')}
                      </Button>
                    </Tooltip>
                  )}
                  <Tooltip title={isReview ? t('task.reviewSubsetHint') : ''}>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<Rocket size={14} />}
                      onClick={() => handleStart(task)}
                      sx={{ whiteSpace: 'nowrap' }}
                    >
                      {t('task.startTraining')}
                    </Button>
                  </Tooltip>
                </Box>
              )}
            </Box>
          );
        })}
      </CardContent>
    </Card>
  );
};
