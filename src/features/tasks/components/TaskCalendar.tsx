import React from 'react';
import Calendar from 'react-calendar';
import type { OnArgs, TileArgs } from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { Box, useTheme } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { Check, RotateCcw, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { CalendarSurface, CompactCalendarSurface } from '@/components/StyledCalendar';
import { countDayTasks, type ReviewTask } from '../utils/tasksStorage';
import { dayKeyOf, todayKey } from '../utils/taskDates';

interface TaskCalendarProps {
  locale: string;
  value: Date | null;
  byDay: Map<string, ReviewTask[]>;
  onClickDay: (date: Date) => void;
  /** Compact picker inside a dialog: smaller tiles, no past days. */
  variant?: 'page' | 'picker';
  /** Day keys to outline (e.g. the open topic's own scheduled days). */
  markedDays?: Set<string>;
  activeStartDate?: Date;
  onActiveStartDateChange?: (date: Date) => void;
}

/** One small icon+count chip on a day tile. */
const CountChip: React.FC<{
  color: string;
  icon: React.ReactNode;
  count: number;
}> = ({ color, icon, count }) => (
  <Box
    sx={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '2px',
      px: '4px',
      borderRadius: 0.75,
      bgcolor: alpha(color, 0.16),
      color,
      fontSize: '0.625rem',
      lineHeight: 1.7,
      fontWeight: 700,
      fontVariantNumeric: 'tabular-nums',
    }}
  >
    {icon}
    {count}
  </Box>
);

export const TaskCalendar: React.FC<TaskCalendarProps> = ({
  locale,
  value,
  byDay,
  onClickDay,
  variant = 'page',
  markedDays,
  activeStartDate,
  onActiveStartDateChange,
}) => {
  const theme = useTheme();
  const { t } = useTranslation('tasks');
  const today = todayKey();

  const renderLoad = ({ date, view }: TileArgs): React.ReactNode => {
    if (view !== 'month') return null;
    const key = dayKeyOf(date);
    const tasks = byDay.get(key);
    if (!tasks || tasks.length === 0) return null;

    const counts = countDayTasks(tasks);
    const pending = counts.pendingNew + counts.pendingReview;
    const overdue = pending > 0 && key < today;
    // Overdue pending screams in error colour; otherwise new=green, review=blue.
    const newColor = overdue ? theme.palette.error.main : theme.palette.success.main;
    const reviewColor = overdue ? theme.palette.error.main : theme.palette.info.main;

    return (
      <Box
        title={t('tooltip.day', { pending, done: counts.done })}
        sx={{ width: '100%', minWidth: 0, mt: '2px' }}
      >
        {/* Dots on very small screens */}
        <Box sx={{ display: { xs: 'flex', sm: 'none' }, justifyContent: 'center', gap: '3px' }}>
          {counts.pendingNew > 0 && (
            <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: newColor }} />
          )}
          {counts.pendingReview > 0 && (
            <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: reviewColor }} />
          )}
          {counts.done > 0 && (
            <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'text.disabled' }} />
          )}
        </Box>
        {/* Count chips on larger screens */}
        <Box
          sx={{
            display: { xs: 'none', sm: 'flex' },
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: '3px',
            minWidth: 0,
          }}
        >
          {counts.pendingNew > 0 && (
            <CountChip color={newColor} icon={<Sparkles size={10} />} count={counts.pendingNew} />
          )}
          {counts.pendingReview > 0 && (
            <CountChip color={reviewColor} icon={<RotateCcw size={10} />} count={counts.pendingReview} />
          )}
          {counts.done > 0 && (
            <CountChip
              color={theme.palette.text.disabled}
              icon={<Check size={10} />}
              count={counts.done}
            />
          )}
        </Box>
      </Box>
    );
  };

  const Surface = variant === 'picker' ? CompactCalendarSurface : CalendarSurface;

  return (
    <Surface>
      <Calendar
        locale={locale}
        calendarType="iso8601"
        minDetail="month"
        maxDetail="month"
        prev2Label={null}
        next2Label={null}
        value={value}
        {...(variant === 'picker' ? { minDate: new Date() } : {})}
        {...(activeStartDate ? { activeStartDate } : {})}
        onActiveStartDateChange={(args: OnArgs) => {
          if (args.activeStartDate) onActiveStartDateChange?.(args.activeStartDate);
        }}
        onClickDay={(date: Date) => onClickDay(date)}
        tileContent={renderLoad}
        tileClassName={({ date, view }: TileArgs) =>
          view === 'month' && markedDays?.has(dayKeyOf(date))
            ? 'task-own-day'
            : undefined
        }
      />
    </Surface>
  );
};
