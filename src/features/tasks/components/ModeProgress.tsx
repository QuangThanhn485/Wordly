import React from 'react';
import { Box, Tooltip, useTheme } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { getTrainingModeLabel } from '@/features/result/utils/dataTransform';
import { getModeMeta } from '@/features/history/utils/modeMeta';
import {
  isPassingResult,
  TASK_REQUIRED_MODES,
  type ReviewTask,
} from '../utils/tasksStorage';

/** Four mode icons coloured by pass state: green pass, red fail, grey untried. */
export const ModeProgress: React.FC<{ task: ReviewTask }> = ({ task }) => {
  const theme = useTheme();
  const { t } = useTranslation('tasks');
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
      {TASK_REQUIRED_MODES.map((mode) => {
        const { Icon } = getModeMeta(mode);
        const result = task.modeResults?.[mode];
        const passed = result ? isPassingResult(result) : false;
        const color = !result
          ? theme.palette.text.disabled
          : passed
            ? theme.palette.success.main
            : theme.palette.error.main;
        // One decimal where needed so a failing 10.4% never displays as "10%"
        // (the pass gate is exact: mistakes*10 <= words).
        const pct = result
          ? (result.mistakes / Math.max(result.words, 1)) * 100
          : 0;
        const label = result
          ? t('task.modeRate', {
              mode: getTrainingModeLabel(mode),
              rate: Number.isInteger(pct) ? String(pct) : pct.toFixed(1),
            })
          : t('task.modeNotPracticed', { mode: getTrainingModeLabel(mode) });
        return (
          <Tooltip key={mode} title={label}>
            <Box sx={{ display: 'flex', color }}>
              <Icon size={15} />
            </Box>
          </Tooltip>
        );
      })}
    </Box>
  );
};
