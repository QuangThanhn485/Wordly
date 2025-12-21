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
import { 
  Menu, 
  Home, 
  BookOpen, 
  BarChart3, 
  Library, 
  Rocket, 
  ChevronLeft, 
  ChevronRight, 
  Moon, 
  Sun, 
  ChevronUp, 
  ChevronDown, 
  Headphones, 
  Edit, 
  Mic 
} from 'lucide-react';
import { Link as RouterLink, useLocation, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useThemeMode } from 'contexts/ThemeContext';
import { loadTrainingSession } from 'features/train/train-start/sessionStorage';
import { loadTrainingSession as loadRWTrainingSession } from 'features/train/train-read-write/sessionStorage';
import { Chip } from '@mui/material';
import LanguageSwitcher from '@/components/LanguageSwitcher';

const drawerWidth = 240;
const collapsedWidth = 72;

const iconStyle = (open: boolean) => ({
  minWidth: 0,
  mr: open ? 1.5 : 'auto',
  justifyContent: 'center',
  display: 'flex',
  color: 'inherit',
  '& svg': {
    fontSize: '1.25rem', // Consistent icon size: 20px
  },
});

const subIconStyle = (open: boolean) => ({
  minWidth: 0,
  mr: open ? 1.5 : 'auto',
  justifyContent: 'center',
  display: 'flex',
  color: 'inherit',
  '& svg': {
    fontSize: '1.125rem', // Smaller for submenu: 18px
  },
});

const listItemStyle = (open: boolean, active: boolean, theme: any) => ({
  pl: open ? 1.5 : 1,
  pr: open ? 1.5 : 1,
  py: 0.75, // Reduced vertical padding for more compact look
  borderRadius: 1.5,
  mx: 0.75,
  mb: 0.25, // Reduced margin between items
  minHeight: 40, // Consistent height
  backgroundColor: active
    ? theme.palette.mode === 'dark'
      ? 'rgba(255, 255, 255, 0.1)'
      : 'rgba(0, 0, 0, 0.05)'
    : 'transparent',
  '&:hover': {
    backgroundColor:
      theme.palette.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.08)'
        : 'rgba(0, 0, 0, 0.04)',
  },
});

const ListItemLink = React.forwardRef<
  HTMLAnchorElement,
  React.ComponentPropsWithRef<typeof RouterLink> &
    React.ComponentProps<typeof ListItemButton>
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

const Navbar: React.FC = () => {
  const theme = useTheme();
  const { t } = useTranslation('navbar');
  const { toggleTheme, mode } = useThemeMode();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'), { noSsr: true });
  
  // Get train file name from localStorage session (persists across page changes/browser closes)
  const [trainFileName, setTrainFileName] = React.useState<string | null>(() => {
    // Load on mount
    const session = loadTrainingSession();
    return session?.fileName || null;
  });
  
  // Get read-write file name from localStorage session
  const [rwFileName, setRWFileName] = React.useState<string | null>(() => {
    // Load on mount
    const session = loadRWTrainingSession();
    return session?.fileName || null;
  });
  
  // Update train file name when URL params change OR when localStorage session changes
  React.useEffect(() => {
    const session = loadTrainingSession();
    const fileName = session?.fileName || null;
    setTrainFileName(fileName);
  }, [searchParams, location.pathname]); // Re-check when URL params change (user navigates)
  
  // Update read-write file name when URL params change OR when localStorage session changes
  React.useEffect(() => {
    const session = loadRWTrainingSession();
    const fileName = session?.fileName || null;
    setRWFileName(fileName);
  }, [searchParams, location.pathname]); // Re-check when URL params change (user navigates)
  
  // Listen for storage events (when session is saved from other tabs/components)
  React.useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'wordly_train_session') {
        const session = loadTrainingSession();
        const fileName = session?.fileName || null;
        setTrainFileName(fileName);
      } else if (e.key === 'wordly_train_rw_session') {
        const session = loadRWTrainingSession();
        const fileName = session?.fileName || null;
        setRWFileName(fileName);
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);
  
  // Poll localStorage periodically to catch changes in the same tab
  // (since storage events only fire across tabs)
  React.useEffect(() => {
    const interval = setInterval(() => {
      const session = loadTrainingSession();
      const fileName = session?.fileName || null;
      setTrainFileName((prev) => {
        // Only update if changed to avoid unnecessary re-renders
        if (prev !== fileName) {
          return fileName;
        }
        return prev;
      });
      
      const rwSession = loadRWTrainingSession();
      const rwFile = rwSession?.fileName || null;
      setRWFileName((prev) => {
        if (prev !== rwFile) {
          return rwFile;
        }
        return prev;
      });
    }, 1000); // Check every second
    
    return () => clearInterval(interval);
  }, []);

  // Trên mobile: drawer mặc định đóng. Trên desktop: drawer mặc định mở
  const [open, setOpen] = React.useState<boolean>(false);
  const [trainOpen, setTrainOpen] = React.useState<boolean>(() =>
    location.pathname.startsWith('/train'),
  );

  // Đồng bộ trạng thái drawer khi breakpoint thay đổi (desktop <-> mobile)
  // Trên desktop: mở drawer. Trên mobile: đóng drawer
  React.useEffect(() => {
    if (!isMobile) {
      setOpen(true); // Desktop: mở drawer
    } else {
      setOpen(false); // Mobile: đóng drawer
    }
  }, [isMobile]);

  const handleToggleDrawer = React.useCallback((e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setOpen((prev) => !prev);
  }, []);
  const handleTrainClick = () => setTrainOpen((prev) => !prev);

  const isActive = React.useCallback(
    (path: string) => {
      // Home chỉ active khi pathname chính xác là '/'
      if (path === '/') {
        return location.pathname === '/';
      }
      // Các path khác: active khi pathname bắt đầu bằng path và ký tự tiếp theo là '/' hoặc kết thúc
      return location.pathname === path || 
             (location.pathname.startsWith(path) && 
              (location.pathname[path.length] === '/' || location.pathname.length === path.length));
    },
    [location.pathname],
  );

  // Cập nhật CSS var --nav-w để các trang khác (như Home) co giãn panel theo navbar
  React.useEffect(() => {
    const widthPx = isMobile ? 0 : open ? drawerWidth : collapsedWidth;
    document.documentElement.style.setProperty('--nav-w', `${widthPx}px`);
    return () => {
      document.documentElement.style.removeProperty('--nav-w');
    };
  }, [open, isMobile]);

  return (
    <>
      {isMobile && (
        <>
          <AppBar 
            position="fixed" 
            elevation={1}
            sx={{
              zIndex: (theme) => theme.zIndex.appBar, // Use standard appBar z-index
            }}
          >
            <Toolbar sx={{ minHeight: { xs: 56, sm: 64 } }}>
                <IconButton
                  edge="start"
                  color="inherit"
                  aria-label={open ? t('tooltips.collapseSidebar') : t('tooltips.expandSidebar')}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleToggleDrawer(e);
                  }}
                onTouchStart={(e) => {
                  e.stopPropagation();
                }}
                sx={{ 
                  mr: 2,
                  // Ensure touch-friendly size on mobile
                  minWidth: 48,
                  minHeight: 48,
                  touchAction: 'manipulation',
                  WebkitTapHighlightColor: 'transparent',
                  '-webkit-tap-highlight-color': 'transparent',
                  cursor: 'pointer',
                  userSelect: 'none',
                  position: 'relative',
                  zIndex: 1,
                  '&:active': {
                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  },
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.06)',
                  },
                }}
              >
                <Menu size={isMobile ? 24 : 28} style={{ pointerEvents: 'none' }} />
              </IconButton>
              <Box 
                component={RouterLink}
                to="/"
                sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 1.25, 
                  flex: 1,
                  textDecoration: 'none',
                  color: 'inherit',
                  '&:hover': {
                    opacity: 0.9,
                  },
                }}
              >
                <Avatar
                  src="/logo.png"
                  alt="Wordly Logo"
                  sx={{
                    width: { xs: 32, sm: 36 },
                    height: { xs: 32, sm: 36 },
                    bgcolor: theme.palette.primary.main,
                    flexShrink: 0,
                  }}
                >
                  <BookOpen size={isMobile ? 18 : 20} />
                </Avatar>
                <Typography 
                  variant="h6" 
                  noWrap 
                  component="div" 
                  fontWeight={600} 
                  sx={{ fontSize: { xs: '1rem', sm: '1.125rem' } }}
                >
                  Wordly
                </Typography>
              </Box>
            </Toolbar>
          </AppBar>
          <Toolbar sx={{ minHeight: { xs: 56, sm: 64 } }} />
        </>
      )}

      <Drawer
        variant={isMobile ? 'temporary' : 'permanent'}
        open={open}
        onClose={() => setOpen(false)}
        ModalProps={{
          keepMounted: true, // Better mobile performance
        }}
        sx={{
          width: open ? drawerWidth : collapsedWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: open ? drawerWidth : collapsedWidth,
            overflowX: 'hidden',
            transition: isMobile
              ? theme.transitions.create('transform', {
                  easing: theme.transitions.easing.sharp,
                  duration: theme.transitions.duration.enteringScreen,
                })
              : theme.transitions.create('width', {
                  easing: theme.transitions.easing.sharp,
                  duration: theme.transitions.duration.standard,
                }),
            boxSizing: 'border-box',
            bgcolor: theme.palette.background.paper,
            borderRight: `1px solid ${theme.palette.divider}`,
            // Better mobile touch handling
            touchAction: 'pan-y',
            WebkitOverflowScrolling: 'touch',
          },
          // Higher z-index for mobile overlay - must be higher than AppBar
          zIndex: isMobile ? theme.zIndex.drawer : 'auto',
        }}
      >
        {/* Logo header - Desktop */}
        {!isMobile && (
          <Box
            sx={{
              display: 'flex',
              justifyContent: open ? 'space-between' : 'center',
              alignItems: 'center',
              p: 1.5,
              pb: 1,
            }}
          >
            {open ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                <Avatar
                  src="/logo.png"
                  alt="Wordly Logo"
                  sx={{
                    width: 28,
                    height: 28,
                    bgcolor: theme.palette.primary.main,
                  }}
                >
                  <BookOpen size={16} />
                </Avatar>
                <Typography variant="h6" fontWeight={600} sx={{ fontSize: '1.125rem' }}>
                  Wordly
                </Typography>
              </Box>
            ) : (
              <Avatar
                src="/logo.png"
                alt="Wordly Logo"
                sx={{
                  width: 28,
                  height: 28,
                  bgcolor: theme.palette.primary.main,
                }}
              >
                <BookOpen size={16} />
              </Avatar>
            )}
            <IconButton
              onClick={handleToggleDrawer}
              size="small"
              sx={{
                p: 0.75,
                color: theme.palette.text.secondary,
                '&:hover': {
                  backgroundColor: theme.palette.action.hover,
                },
              }}
              aria-label={open ? t('tooltips.collapseSidebar') : t('tooltips.expandSidebar')}
            >
              {open ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
            </IconButton>
          </Box>
        )}

        {/* Logo header - Mobile */}
        {isMobile && (
          <Box
            component={RouterLink}
            to="/"
            onClick={() => setOpen(false)} // Đóng drawer khi click logo
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.25,
              p: 1.5,
              pb: 1,
              textDecoration: 'none',
              color: 'inherit',
              '&:hover': {
                opacity: 0.9,
                backgroundColor: theme.palette.action.hover,
              },
            }}
          >
            <Avatar
              src="/logo.png"
              alt="Wordly Logo"
              sx={{
                width: 28,
                height: 28,
                bgcolor: theme.palette.primary.main,
                flexShrink: 0,
              }}
            >
              <BookOpen size={16} />
            </Avatar>
            <Typography variant="h6" fontWeight={600} sx={{ fontSize: '1.125rem' }}>
              Wordly
            </Typography>
          </Box>
        )}

        <Divider />

        <List sx={{ px: 0.75, py: 0.5 }}>
          <ListItemLink
            to="/"
            selected={isActive('/')}
            sx={listItemStyle(open, isActive('/'), theme)}
          >
            <Tooltip title={t('home')} placement="right" disableHoverListener={open}>
              <ListItemIcon sx={iconStyle(open)}>
                <Home size={20} />
              </ListItemIcon>
            </Tooltip>
            {open && (
              <ListItemText 
                primary={t('home')} 
                primaryTypographyProps={{ 
                  fontWeight: 500,
                  fontSize: { xs: '0.9375rem', sm: '0.875rem' }, // 15px on mobile, 14px on desktop
                }} 
              />
            )}
          </ListItemLink>

          <ListItemLink
            to="/vocabulary"
            selected={isActive('/vocabulary')}
            sx={listItemStyle(open, isActive('/vocabulary'), theme)}
          >
            <Tooltip title={t('vocabulary')} placement="right" disableHoverListener={open}>
              <ListItemIcon sx={iconStyle(open)}>
                <Library size={20} />
              </ListItemIcon>
            </Tooltip>
            {open && (
              <ListItemText
                primary={t('vocabulary')}
                primaryTypographyProps={{ 
                  fontWeight: 500,
                  fontSize: { xs: '0.9375rem', sm: '0.875rem' },
                }}
              />
            )}
          </ListItemLink>

          <ListItemButton
            onClick={handleTrainClick}
            selected={isActive('/train')}
            sx={listItemStyle(open, isActive('/train'), theme)}
          >
            <Tooltip title={t('train')} placement="right" disableHoverListener={open}>
              <ListItemIcon sx={iconStyle(open)}>
                <BookOpen size={20} />
              </ListItemIcon>
            </Tooltip>
            {open && (
              <>
                <ListItemText 
                    primary={
                     <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, minWidth: 0, flexWrap: 'nowrap' }}>
                      <Typography
                        component="span"
                        sx={{
                          fontWeight: 500,
                          fontSize: { xs: '0.9375rem', sm: '0.875rem' },
                        }}
                      >
                        {t('train')}
                      </Typography>
                      {trainFileName && (
                        <Chip
                          label={trainFileName.replace(/\.txt$/i, '')}
                          size="small"
                          sx={{
                            height: 20,
                            fontSize: '0.6875rem', // 11px
                            fontWeight: 500,
                            maxWidth: 160,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            '& .MuiChip-label': {
                              px: 0.75,
                              py: 0,
                              maxWidth: 140,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            },
                          }}
                          color="primary"
                          variant="outlined"
                          title={trainFileName.replace(/\.txt$/i, '')}
                        />
                      )}
                    </Box>
                  } 
                />
                {trainOpen ? (
                  <ChevronUp size={18} style={{ marginLeft: 4 }} />
                ) : (
                  <ChevronDown size={18} style={{ marginLeft: 4 }} />
                )}
              </>
            )}
          </ListItemButton>

          <Collapse in={trainOpen} timeout="auto" unmountOnExit>
            <List component="div" disablePadding sx={{ py: 0.25 }}>
              <ListItemLink
                to="/train/flashcards-reading"
                selected={isActive('/train/flashcards-reading')}
                sx={{
                  ...listItemStyle(open, isActive('/train/flashcards-reading'), theme),
                  pl: open ? 3.5 : 2,
                  py: 0.625,
                  minHeight: 36,
                }}
              >
                <ListItemIcon sx={subIconStyle(open)}>
                  <Rocket size={18} />
                </ListItemIcon>
                {open && (
                  <ListItemText 
                    primary={t('flashcardsReading')} 
                    primaryTypographyProps={{ fontSize: { xs: '0.875rem', sm: '0.8125rem' } }}
                  />
                )}
              </ListItemLink>

              <ListItemLink
                to="/train/flashcards-listening"
                selected={isActive('/train/flashcards-listening')}
                sx={{
                  ...listItemStyle(open, isActive('/train/flashcards-listening'), theme),
                  pl: open ? 3.5 : 2,
                  py: 0.625,
                  minHeight: 36,
                }}
              >
                <ListItemIcon sx={subIconStyle(open)}>
                  <Headphones size={18} />
                </ListItemIcon>
                {open && (
                  <ListItemText 
                    primary={t('flashcardsListening')} 
                    primaryTypographyProps={{ fontSize: { xs: '0.875rem', sm: '0.8125rem' } }}
                  />
                )}
              </ListItemLink>

              <ListItemLink
                to={rwFileName ? `/train/read-write?file=${encodeURIComponent(rwFileName)}` : '/train/read-write'}
                selected={isActive('/train/read-write')}
                sx={{
                  ...listItemStyle(open, isActive('/train/read-write'), theme),
                  pl: open ? 3.5 : 2,
                  py: 0.625,
                  minHeight: 36,
                }}
              >
                <ListItemIcon sx={subIconStyle(open)}>
                  <Edit size={18} />
                </ListItemIcon>
                {open && (
                  <ListItemText 
                    primary={t('readWrite')} 
                    primaryTypographyProps={{ fontSize: { xs: '0.875rem', sm: '0.8125rem' } }}
                  />
                )}
              </ListItemLink>

              <ListItemLink
                to="/train/listen-write"
                selected={isActive('/train/listen-write')}
                sx={{
                  ...listItemStyle(open, isActive('/train/listen-write'), theme),
                  pl: open ? 3.5 : 2,
                  py: 0.625,
                  minHeight: 36,
                }}
              >
                <ListItemIcon sx={subIconStyle(open)}>
                  <Mic size={18} />
                </ListItemIcon>
                {open && (
                  <ListItemText 
                    primary={t('listenWrite')} 
                    primaryTypographyProps={{ fontSize: { xs: '0.875rem', sm: '0.8125rem' } }}
                  />
                )}
              </ListItemLink>
            </List>
          </Collapse>

          {/* Result - moved outside Train menu */}
          <ListItemLink
            to="/train/result"
            selected={isActive('/train/result')}
            sx={listItemStyle(open, isActive('/train/result'), theme)}
          >
            <Tooltip title={t('result')} placement="right" disableHoverListener={open}>
              <ListItemIcon sx={iconStyle(open)}>
                <BarChart3 size={20} />
              </ListItemIcon>
            </Tooltip>
            {open && (
              <ListItemText 
                primary={t('result')} 
                primaryTypographyProps={{ 
                  fontWeight: 500,
                  fontSize: { xs: '0.9375rem', sm: '0.875rem' },
                }} 
              />
            )}
          </ListItemLink>

          {/* Data - moved outside Train menu */}
          <ListItemLink
            to="/data"
            selected={isActive('/data')}
            sx={listItemStyle(open, isActive('/data'), theme)}
          >
            <Tooltip title={t('data')} placement="right" disableHoverListener={open}>
              <ListItemIcon sx={iconStyle(open)}>
                <Library size={20} />
              </ListItemIcon>
            </Tooltip>
            {open && (
              <ListItemText 
                primary={t('data')} 
                primaryTypographyProps={{ 
                  fontWeight: 500,
                  fontSize: '0.875rem',
                }} 
              />
            )}
          </ListItemLink>
        </List>

        <Box sx={{ mt: 'auto' }}>
          <Box sx={{ p: 1, display: 'flex', justifyContent: 'center', gap: 0.5 }}>
            <LanguageSwitcher />
            <Tooltip title={mode === 'dark' ? t('tooltips.switchToLight') : t('tooltips.switchToDark')}>
              <IconButton
                onClick={toggleTheme}
                size="small"
                sx={{
                  p: 0.75,
                  color: theme.palette.text.secondary,
                  '&:hover': {
                    backgroundColor: theme.palette.action.hover,
                  },
                }}
                aria-label={mode === 'dark' ? t('tooltips.switchToLight') : t('tooltips.switchToDark')}
              >
                {mode === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      </Drawer>
    </>
  );
};

export default Navbar;
