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
    AppBar,
    Toolbar,
    Typography,
    useMediaQuery,
    Avatar,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
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
const collapsedWidth = 80;

const iconStyle = (open: boolean) => ({
    minWidth: 0,
    mr: open ? 2 : 'auto',
    justifyContent: 'center',
    display: 'flex',
    color: 'inherit',
});

const listItemStyle = (open: boolean, active: boolean, theme: any) => ({
    pl: open ? 2 : 1.5,
    borderRadius: 2,
    mx: 1,
    mb: 0.5,
    backgroundColor: active ? theme.palette.mode === 'dark' 
        ? 'rgba(255, 255, 255, 0.1)' 
        : 'rgba(0, 0, 0, 0.05)' : 'transparent',
    '&:hover': {
        backgroundColor: theme.palette.mode === 'dark' 
            ? 'rgba(255, 255, 255, 0.08)' 
            : 'rgba(0, 0, 0, 0.04)',
    },
});

const ListItemLink = React.forwardRef<HTMLAnchorElement,
    React.ComponentPropsWithRef<typeof RouterLink> & React.ComponentProps<typeof ListItemButton>
>(({ to, children, ...rest }, ref) => (
    <ListItemButton
        component={RouterLink}
        to={to}
        ref={ref}
        sx={{ alignItems: 'center' }}
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
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    const [open, setOpen] = React.useState(!isMobile);
    const [trainOpen, setTrainOpen] = React.useState(location.pathname.startsWith('/train'));

    const handleToggleDrawer = () => setOpen(prev => !prev);
    const handleTrainClick = () => setTrainOpen(prev => !prev);

    const isActive = (path: string) =>
        location.pathname === path || location.pathname.startsWith(path);

    return (
        <>
            {isMobile && (
                <>
                    <AppBar position="fixed" elevation={0}>
                        <Toolbar>
                            <IconButton
                                edge="start"
                                color="inherit"
                                aria-label="menu"
                                onClick={handleToggleDrawer}
                                sx={{ mr: 2 }}
                            >
                                <MenuIcon />
                            </IconButton>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                <Avatar 
                                    src="/logo.png" 
                                    alt="Wordly Logo"
                                    sx={{ 
                                        width: 32, 
                                        height: 32,
                                        bgcolor: theme.palette.primary.main,
                                    }}
                                >
                                    <AutoStoriesIcon fontSize="small" />
                                </Avatar>
                                <Typography variant="h6" noWrap component="div" fontWeight={600}>
                                    Wordly
                                </Typography>
                            </Box>
                        </Toolbar>
                    </AppBar>
                    <Toolbar />
                </>
            )}

            <Drawer
                variant={isMobile ? 'temporary' : 'permanent'}
                open={open}
                onClose={() => setOpen(false)}
                sx={{
                    width: open ? drawerWidth : collapsedWidth,
                    flexShrink: 0,
                    '& .MuiDrawer-paper': {
                        width: open ? drawerWidth : collapsedWidth,
                        overflowX: 'hidden',
                        transition: theme.transitions.create('width', {
                            easing: theme.transitions.easing.sharp,
                            duration: theme.transitions.duration.enteringScreen,
                        }),
                        boxSizing: 'border-box',
                        bgcolor: theme.palette.background.paper,
                        borderRight: `1px solid ${theme.palette.divider}`,
                    },
                }}
            >
                {!isMobile && (
                    <Box sx={{ 
                        display: 'flex', 
                        justifyContent: open ? 'space-between' : 'center', 
                        alignItems: 'center',
                        p: 2,
                        pb: 1.5,
                    }}>
                        {open ? (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                <Avatar 
                                    src="/logo.png" 
                                    alt="Wordly Logo"
                                    sx={{ 
                                        width: 32, 
                                        height: 32,
                                        bgcolor: theme.palette.primary.main,
                                    }}
                                >
                                    <AutoStoriesIcon fontSize="small" />
                                </Avatar>
                                <Typography variant="h6" fontWeight={600}>
                                    Wordly
                                </Typography>
                            </Box>
                        ) : (
                            <Avatar 
                                src="/logo.png" 
                                alt="Wordly Logo"
                                sx={{ 
                                    width: 32, 
                                    height: 32,
                                    bgcolor: theme.palette.primary.main,
                                }}
                            >
                                <AutoStoriesIcon fontSize="small" />
                            </Avatar>
                        )}
                        <IconButton 
                            onClick={handleToggleDrawer}
                            size="small"
                            sx={{
                                color: theme.palette.text.secondary,
                                '&:hover': {
                                    backgroundColor: theme.palette.action.hover,
                                },
                            }}
                        >
                            {open ? <ChevronLeftIcon /> : <ChevronRightIcon />}
                        </IconButton>
                    </Box>
                )}

                <Divider />

                <List sx={{ p: 1 }}>
                    <ListItemLink 
                        to='/' 
                        selected={isActive('/')} 
                        sx={listItemStyle(open, isActive('/'), theme)}
                    >
                        <Tooltip title='Home' placement='right' disableHoverListener={open}>
                            <ListItemIcon sx={iconStyle(open)}>
                                <HomeIcon />
                            </ListItemIcon>
                        </Tooltip>
                        {open && <ListItemText primary='Home' primaryTypographyProps={{ fontWeight: 500 }} />}
                    </ListItemLink>
                    
                    <ListItemLink 
                        to='/source-data' 
                        selected={isActive('/source-data')} 
                        sx={listItemStyle(open, isActive('/source-data'), theme)}
                    >
                        <Tooltip title='Source Data' placement='right' disableHoverListener={open}>
                            <ListItemIcon sx={iconStyle(open)}>
                                <BarChartIcon />
                            </ListItemIcon>
                        </Tooltip>
                        {open && <ListItemText primary='Source Data' primaryTypographyProps={{ fontWeight: 500 }} />}
                    </ListItemLink>

                    <ListItemButton 
                        onClick={handleTrainClick} 
                        selected={isActive('/train')} 
                        sx={listItemStyle(open, isActive('/train'), theme)}
                    >
                        <Tooltip title='Train' placement='right' disableHoverListener={open}>
                            <ListItemIcon sx={iconStyle(open)}>
                                <AutoStoriesIcon />
                            </ListItemIcon>
                        </Tooltip>
                        {open && <ListItemText primary='Train' primaryTypographyProps={{ fontWeight: 500 }} />}
                        {open && (trainOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />)}
                    </ListItemButton>

                    <Collapse in={trainOpen} timeout='auto' unmountOnExit>
                        <List component='div' disablePadding>
                            <ListItemLink
                                to='/train-start'
                                selected={isActive('/train-start')}
                                sx={{ 
                                    ...listItemStyle(open, isActive('/train-start'), theme),
                                    pl: open ? 4 : 2.5,
                                }}
                            >
                                <ListItemIcon sx={iconStyle(open)}>
                                    <RocketLaunchIcon fontSize='small' />
                                </ListItemIcon>
                                {open && <ListItemText primary='Start' />}
                            </ListItemLink>

                            <ListItemLink
                                to='/train/result'
                                selected={isActive('/train/result')}
                                sx={{ 
                                    ...listItemStyle(open, isActive('/train/result'), theme),
                                    pl: open ? 4 : 2.5,
                                }}
                            >
                                <ListItemIcon sx={iconStyle(open)}>
                                    <BarChartIcon fontSize='small' />
                                </ListItemIcon>
                                {open && <ListItemText primary='Result' />}
                            </ListItemLink>

                            <ListItemLink
                                to='/train/lib'
                                selected={isActive('/train/lib')}
                                sx={{ 
                                    ...listItemStyle(open, isActive('/train/lib'), theme),
                                    pl: open ? 4 : 2.5,
                                }}
                            >
                                <ListItemIcon sx={iconStyle(open)}>
                                    <LibraryBooksIcon fontSize='small' />
                                </ListItemIcon>
                                {open && <ListItemText primary='Lib' />}
                            </ListItemLink>
                        </List>
                    </Collapse>
                </List>

                <Box sx={{ mt: 'auto' }}>
                    <Divider />
                    <List sx={{ p: 1 }}>
                        <ListItemLink 
                            to='/login' 
                            selected={isActive('/login')} 
                            sx={listItemStyle(open, isActive('/login'), theme)}
                        >
                            <Tooltip title='Login' placement='right' disableHoverListener={open}>
                                <ListItemIcon sx={iconStyle(open)}>
                                    <LoginIcon />
                                </ListItemIcon>
                            </Tooltip>
                            {open && <ListItemText primary='Login' primaryTypographyProps={{ fontWeight: 500 }} />}
                        </ListItemLink>

                        <ListItemLink 
                            to='/register' 
                            selected={isActive('/register')} 
                            sx={listItemStyle(open, isActive('/register'), theme)}
                        >
                            <Tooltip title='Register' placement='right' disableHoverListener={open}>
                                <ListItemIcon sx={iconStyle(open)}>
                                    <AppRegistrationIcon />
                                </ListItemIcon>
                            </Tooltip>
                            {open && <ListItemText primary='Register' primaryTypographyProps={{ fontWeight: 500 }} />}
                        </ListItemLink>
                    </List>
                    <Divider />
                    
                    <Box sx={{ p: 1.5, display: 'flex', justifyContent: 'center' }}>
                        <Tooltip title={`Switch to ${mode === 'dark' ? 'light' : 'dark'} mode`}>
                            <IconButton 
                                onClick={toggleTheme}
                                sx={{
                                    color: theme.palette.text.secondary,
                                    '&:hover': {
                                        backgroundColor: theme.palette.action.hover,
                                    },
                                }}
                            >
                                {mode === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}
                            </IconButton>
                        </Tooltip>
                    </Box>
                </Box>
            </Drawer>
        </>
    );
};

export default Navbar;