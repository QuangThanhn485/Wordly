import React from 'react';
import { useTranslation } from 'react-i18next';
import { IconButton, Tooltip, useTheme } from '@mui/material';
import { Languages } from 'lucide-react';

interface LanguageSwitcherProps {
  size?: 'small' | 'medium';
}

const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({ size = 'small' }) => {
  const { i18n, t } = useTranslation('navbar');
  const theme = useTheme();

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'vi' : 'en';
    i18n.changeLanguage(newLang);
  };

  const currentLang = i18n.language === 'vi' ? 'VI' : 'EN';

  return (
    <Tooltip title={t('tooltips.switchLanguage')}>
      <IconButton
        onClick={toggleLanguage}
        size={size}
        sx={{
          p: 0.75,
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
        <span style={{ 
          fontSize: '0.75rem', 
          fontWeight: 600,
          minWidth: '20px',
        }}>
          {currentLang}
        </span>
      </IconButton>
    </Tooltip>
  );
};

export default LanguageSwitcher;
