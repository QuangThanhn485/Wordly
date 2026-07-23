// MainLayout.tsx
import { Box, useMediaQuery, useTheme } from '@mui/material';
import Navbar from './Navbar';
import { Outlet, useLocation } from 'react-router-dom';
import MobileNavigation, { isTrainingSessionPath } from './MobileNavigation';
import {
  MOBILE_BOTTOM_NAV_SPACER,
  MOBILE_MAIN_VIEWPORT_HEIGHT,
} from './mobileLayoutConstants';

const MainLayout = () => {
  const theme = useTheme();
  const location = useLocation();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'), { noSsr: true });
  const immersiveTraining = isTrainingSessionPath(location.pathname);

  return (
    <>
      {isMobile ? <MobileNavigation /> : <Navbar />}
      <Box
        component="main"
        sx={(theme) => ({
          width: '100%',
          minHeight: { xs: MOBILE_MAIN_VIEWPORT_HEIGHT, md: '100vh' },
          boxSizing: 'border-box',
          pl: { xs: 0, md: 'var(--nav-w, 240px)' },
          pr: 0,
          pt: 0,
          pb: {
            xs: immersiveTraining ? 0 : MOBILE_BOTTOM_NAV_SPACER,
            md: 0,
          },
          overflowX: 'hidden',
          transition: theme.transitions.create(['padding-left', 'padding-bottom'], {
            duration: theme.transitions.duration.standard,
            easing: theme.transitions.easing.easeInOut,
          }),
        })}
      >
        <Outlet />
      </Box>
    </>
  );
};

export default MainLayout;
