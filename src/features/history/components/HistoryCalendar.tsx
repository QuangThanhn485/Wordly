import React from 'react';
import Calendar from 'react-calendar';
import type { OnArgs, TileArgs } from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { Box, styled, useTheme } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';
import type {
  TrainingHistoryEntry,
  TrainingHistoryKind,
} from '@/features/train/utils/trainingHistory';
import { dayKey } from '../utils/historyCalendar';
import { getKindMeta } from '../utils/modeMeta';

interface HistoryCalendarProps {
  locale: string;
  value: Date;
  activeStartDate: Date;
  byDay: Map<string, TrainingHistoryEntry[]>;
  summaryLabel: (entries: TrainingHistoryEntry[]) => string;
  onClickDay: (date: Date) => void;
  onActiveStartDateChange: (date: Date) => void;
}

const MAX_TOPIC_TAGS = 3;

// Theme the third-party calendar so it lives inside the MUI light/dark system,
// and make it big enough to fill the panel.
const CalendarWrapper = styled('div')(({ theme }) => ({
  '& .react-calendar': {
    width: '100%',
    background: 'transparent',
    border: 'none',
    fontFamily: 'inherit',
    lineHeight: 1.2,
  },
  '& .react-calendar button': { fontFamily: 'inherit', color: theme.palette.text.primary },
  '& .react-calendar__navigation': { display: 'flex', height: 48, marginBottom: theme.spacing(0.5) },
  '& .react-calendar__navigation button': {
    minWidth: 44,
    background: 'none',
    borderRadius: Number(theme.shape.borderRadius),
    fontSize: '1.05rem',
    fontWeight: 700,
  },
  '& .react-calendar__navigation button:enabled:hover, & .react-calendar__navigation button:enabled:focus': {
    background: theme.palette.action.hover,
  },
  '& .react-calendar__navigation button:disabled': { background: 'transparent', opacity: 0.4 },
  '& .react-calendar__month-view__weekdays': { textTransform: 'none', fontWeight: 600, fontSize: '0.75rem' },
  '& .react-calendar__month-view__weekdays__weekday': {
    padding: theme.spacing(0.5, 0),
    color: theme.palette.text.secondary,
  },
  '& .react-calendar__month-view__weekdays__weekday abbr': { textDecoration: 'none', cursor: 'default' },
  '& .react-calendar__month-view__weekdays__weekday--weekend': { color: theme.palette.text.disabled },
  '& .react-calendar__tile': {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 3,
    minHeight: 58,
    maxWidth: 'none',
    padding: theme.spacing(1, 0.5),
    background: 'none',
    borderRadius: Number(theme.shape.borderRadius) * 1.5,
    fontSize: '0.9375rem',
    fontWeight: 500,
    fontVariantNumeric: 'tabular-nums',
    overflow: 'hidden',
    [theme.breakpoints.up('sm')]: { minHeight: 96 },
    [theme.breakpoints.up('md')]: { minHeight: 112 },
  },
  '& .react-calendar__tile:enabled:hover, & .react-calendar__tile:enabled:focus': {
    background: theme.palette.action.hover,
  },
  '& .react-calendar__month-view__days__day--neighboringMonth': { color: theme.palette.text.disabled },
  '& .react-calendar__tile--now': { background: alpha(theme.palette.primary.main, 0.12) },
  '& .react-calendar__tile--now:enabled:hover, & .react-calendar__tile--now:enabled:focus': {
    background: alpha(theme.palette.primary.main, 0.2),
  },
  '& .react-calendar__tile--active, & .react-calendar__tile--active:enabled:hover, & .react-calendar__tile--active:enabled:focus':
    {
      background: alpha(theme.palette.primary.main, 0.22),
      color: theme.palette.text.primary,
      boxShadow: `inset 0 0 0 2px ${theme.palette.primary.main}`,
    },
}));

export const HistoryCalendar: React.FC<HistoryCalendarProps> = ({
  locale,
  value,
  activeStartDate,
  byDay,
  summaryLabel,
  onClickDay,
  onActiveStartDateChange,
}) => {
  const theme = useTheme();
  const { t } = useTranslation('history');

  // Trained vocabulary topics as tags, colour/icon coded new vs review.
  const renderTags = ({ date, view }: TileArgs): React.ReactNode => {
    if (view !== 'month') return null;
    const entries = byDay.get(dayKey(date));
    if (!entries || entries.length === 0) return null;

    const topics: { id: string; label: string; kind: TrainingHistoryKind }[] = [];
    const seen = new Set<string>();
    for (const entry of entries) {
      if (!seen.has(entry.topicId)) {
        seen.add(entry.topicId);
        topics.push({ id: entry.topicId, label: entry.topicLabel, kind: entry.kind });
      }
    }
    const shown = topics.slice(0, MAX_TOPIC_TAGS);
    const extra = topics.length - shown.length;
    const hasReview = topics.some((topic) => topic.kind === 'review');

    return (
      <Box title={summaryLabel(entries)} sx={{ width: '100%', minWidth: 0, mt: '2px' }}>
        {/* Compact dots on very small screens: colour marks new/review presence */}
        <Box sx={{ display: { xs: 'flex', sm: 'none' }, justifyContent: 'center', gap: '3px' }}>
          <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'success.main' }} />
          {hasReview && <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'info.main' }} />}
        </Box>
        {/* Topic tags on larger screens */}
        <Box sx={{ display: { xs: 'none', sm: 'flex' }, flexDirection: 'column', gap: '3px', minWidth: 0 }}>
          {shown.map((topic) => {
            const { Icon, palette, labelKey } = getKindMeta(topic.kind);
            const color = theme.palette[palette].main;
            return (
              <Box
                key={topic.id}
                title={`${topic.label} · ${t(labelKey)}`}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px',
                  px: '4px',
                  borderRadius: 0.75,
                  bgcolor: alpha(color, 0.16),
                  borderLeft: `2px solid ${color}`,
                  minWidth: 0,
                }}
              >
                <Box sx={{ display: 'flex', color, flexShrink: 0 }}>
                  <Icon size={11} />
                </Box>
                <Box
                  component="span"
                  sx={{
                    minWidth: 0,
                    fontSize: '0.625rem',
                    lineHeight: 1.6,
                    fontWeight: 600,
                    color: 'text.primary',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {topic.label}
                </Box>
              </Box>
            );
          })}
          {extra > 0 && (
            <Box sx={{ fontSize: '0.625rem', color: 'text.secondary', textAlign: 'center', lineHeight: 1.4 }}>
              +{extra}
            </Box>
          )}
        </Box>
      </Box>
    );
  };

  return (
    <CalendarWrapper>
      <Calendar
        locale={locale}
        calendarType="iso8601"
        minDetail="month"
        maxDetail="month"
        prev2Label={null}
        next2Label={null}
        value={value}
        activeStartDate={activeStartDate}
        onActiveStartDateChange={(args: OnArgs) => {
          if (args.activeStartDate) onActiveStartDateChange(args.activeStartDate);
        }}
        onClickDay={(date: Date) => onClickDay(date)}
        tileContent={renderTags}
      />
    </CalendarWrapper>
  );
};
