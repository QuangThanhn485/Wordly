import React from 'react';
import { useTranslation } from 'react-i18next';
import { IconButton, Tooltip, useTheme } from '@mui/material';
import { Languages } from 'lucide-react';
import { updatePreferences } from '@/data';

interface LanguageSwitcherProps {
  size?: 'small' | 'medium';
  compact?: boolean;
}

const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({
  size = 'small',
  compact = false,
}) => {
  const { i18n, t } = useTranslation('navbar');
  const theme = useTheme();

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'vi' : 'en';
    updatePreferences((current) => ({
      ...current,
      language: newLang,
    }));
    i18n.changeLanguage(newLang);
  };

  const currentLang = i18n.language === 'vi' ? 'VI' : 'EN';

  return (
    <Tooltip
      title={`${t('tooltips.switchLanguage')} (${currentLang})`}
      placement={compact ? 'right' : 'top'}
    >
      <IconButton
        onClick={toggleLanguage}
        size={size}
        sx={{
          width: compact ? 36 : 'auto',
          height: 36,
          minWidth: 36,
          p: compact ? 0 : 0.75,
          borderRadius: 1,
          color: theme.palette.text.secondary,
          '&:hover': {
            backgroundColor: theme.palette.action.hover,
          },
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
        }}
        aria-label={t('tooltips.switchLanguage')}
      >
        <Languages size={18} />
        {!compact && (
          <span
            style={{
              fontSize: '0.75rem',
              lineHeight: 1,
              fontWeight: 600,
              letterSpacing: 0,
              minWidth: '20px',
            }}
          >
            {currentLang}
          </span>
        )}
      </IconButton>
    </Tooltip>
  );
};

export default LanguageSwitcher;
