// MainLayout.tsx
import { Box, useMediaQuery, useTheme } from '@mui/material';
import Navbar from './Navbar';
import { Outlet } from 'react-router-dom';

const MainLayout = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  return (
    <>
      <Navbar />
      <Box
        component="main"
        sx={(theme) => ({
          width: '100%',
          minHeight: '100vh',
          boxSizing: 'border-box',
          pl: { xs: 0, md: 'var(--nav-w, 240px)' },
          pr: 0,
          pt: 0, // No padding - sticky elements will handle their own positioning
          // No overflow restrictions - allow natural window scroll for sticky positioning
          transition: theme.transitions.create(['padding-left', 'padding-top'], {
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
