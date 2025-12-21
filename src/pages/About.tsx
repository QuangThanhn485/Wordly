import { Box, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';

const About = () => {
  const { t } = useTranslation('common');
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4">{t('labels.aboutUs')}</Typography>
    </Box>
  );
};

export default About;
