import { Box, Button, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { Link as RouterLink } from 'react-router-dom';

const NotFoundPage = () => {
  const { t } = useTranslation('common');

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        {t('errors.notFound')}
      </Typography>
      <Button component={RouterLink} to="/" variant="contained">
        {t('buttons.back')}
      </Button>
    </Box>
  );
};

export default NotFoundPage;

