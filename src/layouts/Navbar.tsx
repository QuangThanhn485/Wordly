import {
    AppBar,
    Toolbar,
    Typography,
    Button,
    Box,
    IconButton,
    Menu,
    MenuItem,
    Container,
} from '@mui/material';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import { Link as RouterLink } from 'react-router-dom';
import { useThemeMode } from 'contexts/ThemeContext';
import React from 'react';

const Navbar = () => {
    const { toggleTheme, mode } = useThemeMode();

    // Dropdown Menu State
    const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
    const open = Boolean(anchorEl);

    const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };
    const handleMenuClose = () => {
        setAnchorEl(null);
    };

    return (
        <AppBar position='static' color='primary' enableColorOnDark>
            <Container>
                <Toolbar>
                    {/* Left section: Logo + App Name */}
                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            flexGrow: 1,
                        }}
                    >
                        <IconButton edge='start' color='inherit' sx={{ mr: 1 }}>
                            <MenuBookIcon />
                        </IconButton>
                        <Typography
                            variant='h6'
                            component='div'
                            sx={{ fontWeight: 'bold', letterSpacing: 1 }}
                        >
                            Wordly
                        </Typography>
                    </Box>

                    {/* Right section: Menu items + theme toggle */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Button
                            color='inherit'
                            component={RouterLink}
                            to='/'
                            sx={{ textTransform: 'none' }}
                        >
                            Home
                        </Button>

                        {/* Train Dropdown */}
                        <Box>
                            <Button
                                color='inherit'
                                sx={{
                                    textTransform: 'none',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 0.5,
                                }}
                                onClick={handleMenuOpen}
                                endIcon={<ArrowDropDownIcon />}
                            >
                                Train
                            </Button>
                            <Menu
                                anchorEl={anchorEl}
                                open={open}
                                onClose={handleMenuClose}
                                anchorOrigin={{
                                    vertical: 'bottom',
                                    horizontal: 'left',
                                }}
                                transformOrigin={{
                                    vertical: 'top',
                                    horizontal: 'left',
                                }}
                            >
                                <MenuItem
                                    component={RouterLink}
                                    to='/train-start'
                                    onClick={handleMenuClose}
                                >
                                    Start
                                </MenuItem>
                                <MenuItem
                                    component={RouterLink}
                                    to='/train/result'
                                    onClick={handleMenuClose}
                                >
                                    Result
                                </MenuItem>
                                <MenuItem
                                    component={RouterLink}
                                    to='/train/lib'
                                    onClick={handleMenuClose}
                                >
                                    Lib
                                </MenuItem>
                            </Menu>
                        </Box>

                        <Button
                            color='inherit'
                            component={RouterLink}
                            to='/login'
                            sx={{ textTransform: 'none' }}
                        >
                            Login
                        </Button>
                        <Button
                            variant='contained'
                            color='secondary'
                            component={RouterLink}
                            to='/register'
                            sx={{ textTransform: 'none' }}
                        >
                            Register
                        </Button>

                        {/* Dark Mode Toggle */}
                        <IconButton onClick={toggleTheme} color='inherit'>
                            {mode === 'dark' ? (
                                <Brightness7Icon />
                            ) : (
                                <Brightness4Icon />
                            )}
                        </IconButton>
                    </Box>
                </Toolbar>
            </Container>
        </AppBar>
    );
};

export default Navbar;
