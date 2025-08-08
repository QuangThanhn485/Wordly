import React from 'react';
import {
    Drawer,
    List,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    IconButton,
    Tooltip,
    Divider,
    Box,
    Collapse,
    useTheme,
} from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import AutoStoriesIcon from '@mui/icons-material/AutoStories';
import BarChartIcon from '@mui/icons-material/BarChart';
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import LoginIcon from '@mui/icons-material/Login';
import AppRegistrationIcon from '@mui/icons-material/AppRegistration';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import { useThemeMode } from 'contexts/ThemeContext';

const drawerWidth = 240;
const collapsedWidth = 72;

const iconStyle = (open: boolean) => ({
    minWidth: 0,
    mr: open ? 2 : 'auto',
    justifyContent: 'center',
    display: 'flex',
});

const ListItemLink = React.forwardRef<HTMLAnchorElement,
    React.ComponentPropsWithRef<typeof RouterLink> & React.ComponentProps<typeof ListItemButton>
>(({ to, children, ...rest }, ref) => (
    <ListItemButton
        component={RouterLink}
        to={to}
        ref={ref}
        sx={{ alignItems: 'center' }} // 🔧 Fix icon bị lệch chiều dọc
        {...rest}
    >
        {children}
    </ListItemButton>
));
ListItemLink.displayName = 'ListItemLink';

const Navbar = () => {
    const theme = useTheme();
    const { toggleTheme, mode } = useThemeMode();
    const location = useLocation();

    const [open, setOpen] = React.useState(true);
    const [trainOpen, setTrainOpen] = React.useState(location.pathname.startsWith('/train'));

    const handleToggleDrawer = () => setOpen(prev => !prev);
    const handleTrainClick = () => setTrainOpen(prev => !prev);

    const isActive = (path: string) =>
        location.pathname === path || location.pathname.startsWith(path);

    return (
        <Drawer
            variant='permanent'
            sx={{
                width: open ? drawerWidth : collapsedWidth,
                flexShrink: 0,
                '& .MuiDrawer-paper': {
                    width: open ? drawerWidth : collapsedWidth,
                    overflowX: 'hidden',
                    transition: 'width 0.3s',
                    boxSizing: 'border-box',
                    bgcolor: theme.palette.background.paper,
                    borderRight: `1px solid ${theme.palette.divider}`,
                },
            }}
        >
            <Box sx={{ display: 'flex', justifyContent: open ? 'flex-end' : 'center', p: 1 }}>
                <IconButton onClick={handleToggleDrawer}>
                    {open ? <ChevronLeftIcon /> : <ChevronRightIcon />}
                </IconButton>
            </Box>

            <Divider />

            <List>
                <ListItemLink to='/' selected={isActive('/')} sx={{ pl: open ? 2 : 1 }}>
                    <Tooltip title='Home' placement='right' disableHoverListener={open}>
                        <ListItemIcon sx={iconStyle(open)}><HomeIcon /></ListItemIcon>
                    </Tooltip>
                    {open && <ListItemText primary='Home' />}
                </ListItemLink>

                <ListItemButton onClick={handleTrainClick} selected={isActive('/train')} sx={{ alignItems: 'center' }}>
                    <Tooltip title='Train' placement='right' disableHoverListener={open}>
                        <ListItemIcon sx={iconStyle(open)}><AutoStoriesIcon /></ListItemIcon>
                    </Tooltip>
                    {open && <ListItemText primary='Train' />}
                    {open && (trainOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />)}
                </ListItemButton>

                <Collapse in={trainOpen} timeout='auto' unmountOnExit>
                    <List component='div' disablePadding>
                        <ListItemLink
                            to='/train-start'
                            selected={isActive('/train-start')}
                            sx={{ pl: open ? 4 : 2 }}
                        >
                            <ListItemIcon sx={iconStyle(open)}><RocketLaunchIcon fontSize='small' /></ListItemIcon>
                            {open && <ListItemText primary='Start' />}
                        </ListItemLink>

                        <ListItemLink
                            to='/train/result'
                            selected={isActive('/train/result')}
                            sx={{ pl: open ? 4 : 2 }}
                        >
                            <ListItemIcon sx={iconStyle(open)}><BarChartIcon fontSize='small' /></ListItemIcon>
                            {open && <ListItemText primary='Result' />}
                        </ListItemLink>

                        <ListItemLink
                            to='/train/lib'
                            selected={isActive('/train/lib')}
                            sx={{ pl: open ? 4 : 2 }}
                        >
                            <ListItemIcon sx={iconStyle(open)}><LibraryBooksIcon fontSize='small' /></ListItemIcon>
                            {open && <ListItemText primary='Lib' />}
                        </ListItemLink>
                    </List>
                </Collapse>

                <ListItemLink to='/login' selected={isActive('/login')} sx={{ pl: open ? 2 : 1 }}>
                    <Tooltip title='Login' placement='right' disableHoverListener={open}>
                        <ListItemIcon sx={iconStyle(open)}><LoginIcon /></ListItemIcon>
                    </Tooltip>
                    {open && <ListItemText primary='Login' />}
                </ListItemLink>

                <ListItemLink to='/register' selected={isActive('/register')} sx={{ pl: open ? 2 : 1 }}>
                    <Tooltip title='Register' placement='right' disableHoverListener={open}>
                        <ListItemIcon sx={iconStyle(open)}><AppRegistrationIcon /></ListItemIcon>
                    </Tooltip>
                    {open && <ListItemText primary='Register' />}
                </ListItemLink>
            </List>

            <Divider />

            <Box sx={{ mt: 'auto', p: 1, display: 'flex', justifyContent: 'center' }}>
                <Tooltip title='Toggle theme'>
                    <IconButton onClick={toggleTheme}>
                        {mode === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}
                    </IconButton>
                </Tooltip>
            </Box>
        </Drawer>
    );
};

export default Navbar;
