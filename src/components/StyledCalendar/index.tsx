// Shared MUI-themed surface for react-calendar. Wrap a <Calendar> in
// <CalendarSurface> so every calendar in the app (history, review tasks,
// scheduling dialogs) shares one light/dark-aware look.
import { styled } from '@mui/material';
import { alpha } from '@mui/material/styles';

export const CalendarSurface = styled('div')(({ theme }) => ({
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
  '& .react-calendar__tile:disabled': {
    background: 'transparent',
    color: theme.palette.text.disabled,
    opacity: 0.55,
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
  // Days explicitly marked by the caller (e.g. the open topic's own schedule).
  '& .react-calendar__tile.task-own-day': {
    outline: `2px dashed ${alpha(theme.palette.primary.main, 0.55)}`,
    outlineOffset: -3,
  },
}));

/** Compact variant for dialogs: smaller tiles, same theming. */
export const CompactCalendarSurface = styled(CalendarSurface)(({ theme }) => ({
  '& .react-calendar__tile': {
    minHeight: 48,
    padding: theme.spacing(0.5, 0.25),
    fontSize: '0.8125rem',
    [theme.breakpoints.up('sm')]: { minHeight: 58 },
    [theme.breakpoints.up('md')]: { minHeight: 58 },
  },
  '& .react-calendar__navigation': { height: 40 },
}));
