import React from 'react';
import { Box, Button, IconButton, Paper, Tooltip, Typography, useTheme } from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
  Ban,
  CalendarOff,
  CheckCircle2,
  Library,
  Rocket,
  RotateCcw,
  Sparkles,
  Undo2,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ModeProgress } from './ModeProgress';
import { type ReviewTask } from '../utils/tasksStorage';

interface TaskDayDetailProps {
  date: Date;
  tasks: ReviewTask[];
  locale: string;
  /** Local YYYY-MM-DD of today; future-dated tasks get "practice early" UI. */
  todayKey: string;
  /** `full` requests the whole topic instead of the 40% review subset. */
  onStartTraining: (task: ReviewTask, full?: boolean) => void;
  onToggleStatus: (task: ReviewTask) => void;
}

const KIND_META = {
  new: { Icon: Sparkles, palette: 'success' as const, labelKey: 'task.new' },
  review: { Icon: RotateCcw, palette: 'info' as const, labelKey: 'task.review' },
};

export const TaskDayDetail: React.FC<TaskDayDetailProps> = ({
  date,
  tasks,
  locale,
  todayKey,
  onStartTraining,
  onToggleStatus,
}) => {
  const theme = useTheme();
  const { t } = useTranslation('tasks');

  const dateLabel = new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);

  const timeFormatter = new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' });

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <Box sx={{ mb: 1.5 }}>
        <Typography sx={{ fontWeight: 700, fontSize: '1rem', textTransform: 'capitalize' }}>
          {dateLabel}
        </Typography>
        {tasks.length > 0 && (
          <Typography variant="caption" color="text.secondary">
            {t('day.tasks', { count: tasks.length })}
          </Typography>
        )}
      </Box>

      {tasks.length === 0 ? (
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            color: 'text.disabled',
            gap: 1,
            py: 4,
          }}
        >
          <CalendarOff size={34} />
          <Typography variant="body2" color="text.secondary">
            {t('day.noTasks')}
          </Typography>
        </Box>
      ) : (
        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 1.25,
            pr: 0.5,
          }}
        >
          {tasks.map((task) => {
            const kindMeta = KIND_META[task.kind];
            const accent = theme.palette[kindMeta.palette].main;
            const KindIcon = kindMeta.Icon;
            const inactive = task.status === 'skipped';
            const done = task.status === 'done';
            // Runs only count while the task is active (due today/overdue);
            // a future task offers "practice early" with an honest hint.
            const future = task.status === 'new' && task.dueDate > todayKey;

            return (
              <Paper
                key={task.id}
                variant="outlined"
                sx={{
                  p: 1.25,
                  borderRadius: 2,
                  borderLeft: `4px solid ${done ? theme.palette.success.main : accent}`,
                  bgcolor: done ? alpha(theme.palette.success.main, 0.05) : alpha(accent, 0.04),
                  opacity: inactive ? 0.55 : 1,
                }}
              >
                {/* Topic + status action */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
                  <Box
                    sx={{
                      width: 30,
                      height: 30,
                      flexShrink: 0,
                      borderRadius: 1.5,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: accent,
                      bgcolor: alpha(accent, 0.12),
                    }}
                  >
                    <Library size={17} />
                  </Box>
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography
                      sx={{
                        fontWeight: 700,
                        lineHeight: 1.3,
                        textDecoration: inactive ? 'line-through' : 'none',
                      }}
                      noWrap
                      title={task.topicLabel}
                    >
                      {task.topicLabel}
                    </Typography>
                    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, color: accent }}>
                      <KindIcon size={12} />
                      <Typography variant="caption" sx={{ fontWeight: 600, color: 'inherit' }}>
                        {t(kindMeta.labelKey)}
                      </Typography>
                    </Box>
                  </Box>

                  {done ? (
                    <Tooltip
                      title={
                        task.completedAt
                          ? `${t('task.done')} · ${timeFormatter.format(new Date(task.completedAt))}`
                          : t('task.done')
                      }
                    >
                      <Box sx={{ display: 'flex', color: 'success.main', flexShrink: 0 }}>
                        <CheckCircle2 size={20} />
                      </Box>
                    </Tooltip>
                  ) : (
                    <Tooltip title={inactive ? t('task.restore') : t('task.skip')}>
                      <IconButton
                        size="small"
                        onClick={() => onToggleStatus(task)}
                        aria-label={inactive ? t('task.restore') : t('task.skip')}
                        sx={{ flexShrink: 0, color: 'text.secondary' }}
                      >
                        {inactive ? <Undo2 size={16} /> : <Ban size={16} />}
                      </IconButton>
                    </Tooltip>
                  )}
                </Box>

                {/* Progress + train action */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1, flexWrap: 'wrap' }}>
                  <ModeProgress task={task} />
                  {!inactive && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, ml: 'auto', flexShrink: 0 }}>
                      {/* Review stages default to the 40% subset, but training
                          the full set is always allowed and also counts. */}
                      {task.stageIndex > 0 && !future && (
                        <Tooltip title={t('task.trainFullHint')}>
                          <Button
                            variant="text"
                            size="small"
                            onClick={() => onStartTraining(task, true)}
                            sx={{ whiteSpace: 'nowrap', color: 'text.secondary' }}
                          >
                            {t('task.trainFull')}
                          </Button>
                        </Tooltip>
                      )}
                      <Tooltip
                        title={
                          future
                            ? t('task.trainEarlyHint')
                            : task.stageIndex > 0
                              ? t('task.reviewSubsetHint')
                              : ''
                        }
                      >
                        <Button
                          variant={done || future ? 'text' : 'outlined'}
                          size="small"
                          startIcon={<Rocket size={15} />}
                          onClick={() => onStartTraining(task)}
                          sx={{ whiteSpace: 'nowrap' }}
                        >
                          {done
                            ? t('task.trainAgain')
                            : future
                              ? t('task.trainEarly')
                              : t('task.startTraining')}
                        </Button>
                      </Tooltip>
                    </Box>
                  )}
                </Box>
              </Paper>
            );
          })}
        </Box>
      )}
    </Box>
  );
};
