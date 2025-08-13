// MainLayout.tsx
import { Box } from '@mui/material';
import Navbar from './Navbar';
import { Outlet } from 'react-router-dom';

const MainLayout = () => {
  return (
    <>
      <Navbar />
      <Box
        component="main"
        sx={(theme) => ({
          width: '100vw',
          maxWidth: '100vw',
          height: '100vh',
          boxSizing: 'border-box',
          pl: { xs: 0, md: 'var(--nav-w, 240px)' },
          pr: 0,
          pt: 0,
          overflow: 'hidden',
          transition: theme.transitions.create('padding-left', {
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
