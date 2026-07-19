import React, { useMemo } from 'react';
import { Box, Button, Paper, Tooltip, Typography, useTheme } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { AlertCircle, CalendarOff, Clock, Layers, Library, Rocket } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type {
  TrainingHistoryEntry,
  TrainingHistoryKind,
} from '@/features/train/utils/trainingHistory';
import { getTrainingModeLabel } from '@/features/result/utils/dataTransform';
import { getKindMeta, getModeMeta } from '../utils/modeMeta';

interface DayDetailProps {
  date: Date;
  entries: TrainingHistoryEntry[];
  locale: string;
  onStartTraining: (topicId: string, topicLabel: string) => void;
}

type TopicSummary = {
  topicId: string;
  topicLabel: string;
  kind: TrainingHistoryKind;
  modes: string[];
  words: number;
  mistakes: number;
  latestAt: number;
};

const Stat: React.FC<{
  icon: React.ReactNode;
  value: React.ReactNode;
  label: string;
  color?: string;
}> = ({ icon, value, label, color }) => (
  <Tooltip title={label}>
    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, color: color ?? 'text.secondary' }}>
      {icon}
      <Typography variant="caption" sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </Typography>
    </Box>
  </Tooltip>
);

export const DayDetail: React.FC<DayDetailProps> = ({ date, entries, locale, onStartTraining }) => {
  const theme = useTheme();
  const { t } = useTranslation('history');

  const dateLabel = new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);

  const timeFormatter = new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' });

  // One card per vocabulary topic (already one entry per topic/day; still merge
  // defensively in case of legacy rows).
  const topicGroups = useMemo<TopicSummary[]>(() => {
    const map = new Map<string, TopicSummary & { modeSet: Set<string> }>();
    for (const entry of entries) {
      const group = map.get(entry.topicId);
      if (group) {
        if (entry.topicLabel) group.topicLabel = entry.topicLabel;
        entry.modes.forEach((mode) => group.modeSet.add(mode));
        group.words = Math.max(group.words, entry.words);
        group.mistakes += entry.mistakes;
        group.latestAt = Math.max(group.latestAt, entry.completedAt);
        if (entry.kind === 'new') group.kind = 'new';
      } else {
        map.set(entry.topicId, {
          topicId: entry.topicId,
          topicLabel: entry.topicLabel,
          kind: entry.kind,
          modes: [],
          modeSet: new Set(entry.modes),
          words: entry.words,
          mistakes: entry.mistakes,
          latestAt: entry.completedAt,
        });
      }
    }
    return Array.from(map.values())
      .map(({ modeSet, ...rest }) => ({ ...rest, modes: Array.from(modeSet) }))
      .sort((a, b) => b.latestAt - a.latestAt);
  }, [entries]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      {/* Date header */}
      <Box sx={{ mb: 1.5 }}>
        <Typography sx={{ fontWeight: 700, fontSize: '1rem', textTransform: 'capitalize' }}>
          {dateLabel}
        </Typography>
        {topicGroups.length > 0 && (
          <Typography variant="caption" color="text.secondary">
            {t('day.sessions', { count: topicGroups.length })}
          </Typography>
        )}
      </Box>

      {topicGroups.length === 0 ? (
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
            {t('day.noTraining')}
          </Typography>
        </Box>
      ) : (
        <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 1.25, pr: 0.5 }}>
          {topicGroups.map((group) => {
            const kindMeta = getKindMeta(group.kind);
            const accent = theme.palette[kindMeta.palette].main;
            const KindIcon = kindMeta.Icon;
            return (
              <Paper
                key={group.topicId}
                variant="outlined"
                sx={{
                  p: 1.25,
                  borderRadius: 2,
                  borderLeft: `4px solid ${accent}`,
                  bgcolor: alpha(accent, 0.05),
                }}
              >
                {/* Topic + start-training */}
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
                      color: 'primary.main',
                      bgcolor: alpha(theme.palette.primary.main, 0.12),
                    }}
                  >
                    <Library size={17} />
                  </Box>
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.2 }}>
                      {t('session.topic')}
                    </Typography>
                    <Typography sx={{ fontWeight: 700, lineHeight: 1.3 }} noWrap title={group.topicLabel}>
                      {group.topicLabel}
                    </Typography>
                  </Box>
                  <Tooltip title={t('session.startTraining')}>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<Rocket size={15} />}
                      onClick={() => onStartTraining(group.topicId, group.topicLabel)}
                      sx={{ flexShrink: 0, whiteSpace: 'nowrap' }}
                    >
                      {t('session.startTraining')}
                    </Button>
                  </Tooltip>
                </Box>

                {/* new/review badge + modes + stats */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1, flexWrap: 'wrap' }}>
                  <Box
                    sx={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 0.5,
                      px: 0.75,
                      py: 0.25,
                      borderRadius: 1,
                      bgcolor: alpha(accent, 0.16),
                      color: accent,
                      fontSize: '0.7rem',
                      fontWeight: 700,
                    }}
                  >
                    <KindIcon size={13} />
                    {t(kindMeta.labelKey)}
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    {group.modes.map((mode) => {
                      const { Icon, palette } = getModeMeta(mode);
                      return (
                        <Tooltip key={mode} title={getTrainingModeLabel(mode)}>
                          <Box sx={{ display: 'flex', color: theme.palette[palette].main }}>
                            <Icon size={15} />
                          </Box>
                        </Tooltip>
                      );
                    })}
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, ml: 'auto', flexWrap: 'wrap' }}>
                    <Stat
                      icon={<Clock size={13} />}
                      value={timeFormatter.format(new Date(group.latestAt))}
                      label={dateLabel}
                    />
                    <Stat
                      icon={<Layers size={13} />}
                      value={group.words}
                      label={t('session.words', { count: group.words })}
                    />
                    {group.mistakes > 0 && (
                      <Stat
                        icon={<AlertCircle size={13} />}
                        value={group.mistakes}
                        label={t('session.mistakes', { count: group.mistakes })}
                        color={theme.palette.error.main}
                      />
                    )}
                  </Box>
                </Box>
              </Paper>
            );
          })}
        </Box>
      )}
    </Box>
  );
};
