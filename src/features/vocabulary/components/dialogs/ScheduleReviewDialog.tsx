import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { CalendarPlus, CheckCircle2, RotateCcw, Sparkles, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { TaskCalendar } from '@/features/tasks/components/TaskCalendar';
import {
  DEFAULT_REVIEW_INTERVALS,
  getScheduleEditState,
  getTopicSchedule,
  groupTasksByDay,
  loadReviewTasks,
  normalizeIntervals,
  projectScheduleDates,
  removeTopicSchedule,
  scheduleTopicReview,
  sweepExpiredTasks,
  updateScheduleIntervals,
} from '@/features/tasks/utils/tasksStorage';
import { dayKeyOf, parseDayKey } from '@/features/tasks/utils/taskDates';

export interface ScheduleReviewDialogProps {
  open: boolean;
  topicId: string;
  topicLabel: string;
  onClose: () => void;
  /** Snackbar notification; create/update closes the dialog, delete keeps it open. */
  onNotify: (message: string) => void;
}

const parseIntervalsText = (text: string): number[] | null => {
  const tokens = text.split(/[,;\s]+/).filter(Boolean);
  if (tokens.length === 0) return null;
  const numbers = tokens.map(Number);
  if (numbers.some((value) => !Number.isInteger(value) || value <= 0)) return null;
  return normalizeIntervals(numbers);
};

export const ScheduleReviewDialog: React.FC<ScheduleReviewDialogProps> = ({
  open,
  topicId,
  topicLabel,
  onClose,
  onNotify,
}) => {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const { t, i18n } = useTranslation('vocabulary');
  const locale = i18n.language || 'en';

  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const [intervalsText, setIntervalsText] = useState('');
  const [taskVersion, setTaskVersion] = useState(0);
  const [saveFailed, setSaveFailed] = useState(false);

  const editState = useMemo(
    () => (open ? getScheduleEditState(topicId) : 'none'),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [open, topicId, taskVersion],
  );
  const existingSchedule = useMemo(
    () => (open ? getTopicSchedule(topicId) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [open, topicId, taskVersion],
  );

  const locked = editState === 'locked';
  const cycleOnly = editState === 'cycle-only';

  // Reset per open: date defaults to today; intervals prefill from the topic's
  // saved cycle so users see (and can edit) what will regenerate.
  useEffect(() => {
    if (!open) return;
    setSelectedDate(new Date());
    setSaveFailed(false);
    const current = getTopicSchedule(topicId);
    setIntervalsText((current?.intervals ?? DEFAULT_REVIEW_INTERVALS).join(', '));
  }, [open, topicId]);

  // Full day-load for balancing (every topic's tasks). The open topic's own
  // days are additionally outlined so the user can tell which load belongs to
  // this schedule (and would move on a re-create).
  const { byDay, ownDays } = useMemo(() => {
    if (!open) {
      return { byDay: new Map<string, never[]>(), ownDays: new Set<string>() };
    }
    sweepExpiredTasks();
    const tasks = loadReviewTasks();
    const own = new Set<string>();
    tasks.forEach((task) => {
      if (task.topicId === topicId) own.add(task.dueDate);
    });
    return { byDay: groupTasksByDay(tasks), ownDays: own };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, topicId, taskVersion]);

  const intervals = useMemo(() => parseIntervalsText(intervalsText), [intervalsText]);
  const intervalsInvalid = intervals === null;

  // Anchor of the projected chain: fixed to the saved schedule once the
  // new-learn stage is completed, otherwise the picked date.
  const anchorKey =
    (cycleOnly || locked) && existingSchedule
      ? existingSchedule.anchorDate
      : dayKeyOf(selectedDate);

  const previewDates = useMemo(() => {
    if (locked) {
      return existingSchedule
        ? projectScheduleDates(existingSchedule.anchorDate, existingSchedule.intervals)
        : [];
    }
    if (!intervals) return [];
    return projectScheduleDates(anchorKey, intervals);
  }, [locked, existingSchedule, intervals, anchorKey]);

  const dateFormatter = useMemo(
    () => new Intl.DateTimeFormat(locale, { day: '2-digit', month: '2-digit' }),
    [locale],
  );

  const handleConfirm = useCallback(() => {
    if (!intervals) return;
    setSaveFailed(false);
    if (cycleOnly) {
      const result = updateScheduleIntervals(topicId, intervals);
      if (!result) {
        setSaveFailed(true);
        return;
      }
      onNotify(t('messages.scheduleUpdated', { name: topicLabel }));
      onClose();
      return;
    }
    const result = scheduleTopicReview({
      topicId,
      topicLabel,
      anchorDate: dayKeyOf(selectedDate),
      intervals,
    });
    if (!result) {
      setSaveFailed(true);
      return;
    }
    onNotify(t('messages.scheduleCreated', { name: topicLabel, count: result.created }));
    onClose();
  }, [intervals, cycleOnly, topicId, topicLabel, selectedDate, onNotify, onClose, t]);

  // Deleting keeps the dialog open so a fresh schedule can be created at once.
  const handleDelete = useCallback(() => {
    setSaveFailed(false);
    if (!removeTopicSchedule(topicId)) {
      setSaveFailed(true);
      return;
    }
    setTaskVersion((version) => version + 1);
    onNotify(t('messages.scheduleDeleted', { name: topicLabel }));
  }, [topicId, topicLabel, onNotify, t]);

  return (
    <Dialog open={open} onClose={onClose} fullScreen={fullScreen} fullWidth maxWidth="sm">
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
          <CalendarPlus size={20} style={{ flexShrink: 0 }} />
          <Typography component="span" variant="h6" noWrap sx={{ minWidth: 0, fontWeight: 700 }}>
            {t('dialogs.scheduleReview.title', { name: topicLabel })}
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {saveFailed && (
          <Alert severity="error" onClose={() => setSaveFailed(false)}>
            {t('dialogs.scheduleReview.saveError')}
          </Alert>
        )}
        {locked ? (
          <Alert severity="warning" icon={<CheckCircle2 size={20} />}>
            {t('dialogs.scheduleReview.locked')}
          </Alert>
        ) : cycleOnly ? (
          <Alert severity="info">
            {t('dialogs.scheduleReview.anchorDone', {
              date: existingSchedule
                ? dateFormatter.format(parseDayKey(existingSchedule.anchorDate))
                : '',
            })}
          </Alert>
        ) : existingSchedule ? (
          <Alert
            severity="info"
            action={
              <Button
                color="inherit"
                size="small"
                startIcon={<Trash2 size={14} />}
                onClick={handleDelete}
              >
                {t('dialogs.scheduleReview.deleteSchedule')}
              </Button>
            }
          >
            {t('dialogs.scheduleReview.existing', {
              date: dateFormatter.format(parseDayKey(existingSchedule.anchorDate)),
            })}
          </Alert>
        ) : null}

        {/* Per-day task load for coordinating workload. While the anchor is
            editable it doubles as the date picker; on a protected schedule it
            stays visible read-only. */}
        <TaskCalendar
          locale={locale}
          value={locked || cycleOnly ? null : selectedDate}
          byDay={byDay}
          onClickDay={locked || cycleOnly ? () => undefined : setSelectedDate}
          variant="picker"
          markedDays={ownDays}
        />
        {ownDays.size > 0 && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: -1 }}>
            {t('dialogs.scheduleReview.ownDaysHint')}
          </Typography>
        )}

        {/* Editable per-topic spaced-repetition cycle */}
        {!locked && (
          <TextField
            label={t('dialogs.scheduleReview.intervalsLabel')}
            value={intervalsText}
            onChange={(event) => setIntervalsText(event.target.value)}
            size="small"
            fullWidth
            error={intervalsInvalid}
            helperText={
              intervalsInvalid
                ? t('dialogs.scheduleReview.intervalsError')
                : t('dialogs.scheduleReview.intervalsHelper')
            }
          />
        )}

        {/* Projected review days */}
        {previewDates.length > 0 && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 0.5 }}>
            {previewDates.map((key, index) => {
              const isAnchor = index === 0;
              return (
                <Chip
                  key={key}
                  size="small"
                  icon={isAnchor ? <Sparkles size={12} /> : <RotateCcw size={12} />}
                  label={dateFormatter.format(parseDayKey(key))}
                  color={isAnchor ? 'success' : 'default'}
                  variant={isAnchor ? 'filled' : 'outlined'}
                  sx={{ fontVariantNumeric: 'tabular-nums' }}
                />
              );
            })}
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>{t('common:buttons.cancel')}</Button>
        {!locked && (
          <Button
            variant="contained"
            startIcon={<CalendarPlus size={16} />}
            onClick={handleConfirm}
            disabled={intervalsInvalid}
          >
            {cycleOnly
              ? t('dialogs.scheduleReview.updateCycle')
              : t('dialogs.scheduleReview.create')}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

ScheduleReviewDialog.displayName = 'ScheduleReviewDialog';
