import React from 'react';
import {
  AppBar,
  Avatar,
  Box,
  Chip,
  ClickAwayListener,
  Collapse,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Paper,
  Popper,
  Toolbar,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';
import {
  BarChart3,
  BookOpen,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Database,
  Edit,
  Headphones,
  Home,
  Library,
  Menu,
  Mic,
  Moon,
  Rocket,
  Sun,
} from 'lucide-react';
import {
  Link as RouterLink,
  useLocation,
  useSearchParams,
} from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useThemeMode } from 'contexts/ThemeContext';
import { loadTrainingSession as loadReadingSession } from 'features/train/train-start/sessionStorage';
import { loadTrainingSession as loadListeningSession } from 'features/train/train-listen/sessionStorage';
import { loadTrainingSession as loadReadWriteSession } from 'features/train/train-read-write/sessionStorage';
import { loadTrainingSession as loadListenWriteSession } from 'features/train/train-listen-write/sessionStorage';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { getTopicLabel } from '@/features/vocabulary/utils/storageUtils';
import { DATABASE_KEYS } from '@/data';

const drawerWidth = 264;
const collapsedWidth = 64;

type StoredTrainingSession = {
  topicId: string;
  sourceTopicId?: string;
  topicLabel?: string;
  sourceTopicLabel?: string;
  timestamp?: number;
};

type TrainingContext = {
  topicId: string | null;
  label: string | null;
};

const getSessionTopicLabel = (
  session: StoredTrainingSession | null,
): string | null => {
  if (!session) return null;
  return (
    session.sourceTopicLabel ||
    session.topicLabel ||
    getTopicLabel(session.sourceTopicId || session.topicId) ||
    null
  );
};

const getStoredTrainingContext = (pathname: string): TrainingContext => {
  const sessions = {
    reading: loadReadingSession() as StoredTrainingSession | null,
    listening: loadListeningSession() as StoredTrainingSession | null,
    readWrite: loadReadWriteSession() as StoredTrainingSession | null,
    listenWrite: loadListenWriteSession() as StoredTrainingSession | null,
  };

  let current: StoredTrainingSession | null = null;
  if (pathname.startsWith('/train/flashcards-reading')) {
    current = sessions.reading;
  } else if (pathname.startsWith('/train/flashcards-listening')) {
    current = sessions.listening;
  } else if (pathname.startsWith('/train/read-write')) {
    current = sessions.readWrite;
  } else if (pathname.startsWith('/train/listen-write')) {
    current = sessions.listenWrite;
  }

  if (!current) {
    current =
      Object.values(sessions)
        .filter((session): session is StoredTrainingSession => Boolean(session))
        .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))[0] || null;
  }

  return {
    topicId: current?.topicId || null,
    label: getSessionTopicLabel(current),
  };
};

const iconStyle = (expanded: boolean): SxProps<Theme> => ({
  minWidth: 0,
  width: 24,
  mr: expanded ? 1.25 : 0,
  justifyContent: 'center',
  display: 'flex',
  flexShrink: 0,
  color: 'inherit',
});

const navTextProps = {
  noWrap: true,
  fontSize: '0.875rem',
  lineHeight: 1.3,
  fontWeight: 500,
  letterSpacing: 0,
} as const;

const subNavTextProps = {
  noWrap: true,
  fontSize: '0.8125rem',
  lineHeight: 1.3,
  fontWeight: 500,
  letterSpacing: 0,
} as const;

const navItemStyle = (
  expanded: boolean,
  active: boolean,
  theme: Theme,
  isSubItem = false,
): SxProps<Theme> => ({
  position: 'relative',
  justifyContent: expanded ? 'flex-start' : 'center',
  minHeight: isSubItem ? 38 : 42,
  mx: 1,
  mb: 0.25,
  px: expanded ? (isSubItem ? 1.25 : 1.25) : 0,
  pl: expanded && isSubItem ? 3.25 : undefined,
  borderRadius: 1,
  color: active ? theme.palette.primary.main : theme.palette.text.primary,
  overflow: 'hidden',
  '&::before': active
    ? {
        content: '""',
        position: 'absolute',
        left: 0,
        top: 8,
        bottom: 8,
        width: 3,
        borderRadius: '0 3px 3px 0',
        bgcolor: 'primary.main',
      }
    : undefined,
  '&.Mui-selected': {
    bgcolor:
      theme.palette.mode === 'dark'
        ? 'rgba(144, 202, 249, 0.12)'
        : 'rgba(25, 118, 210, 0.09)',
  },
  '&.Mui-selected:hover': {
    bgcolor:
      theme.palette.mode === 'dark'
        ? 'rgba(144, 202, 249, 0.16)'
        : 'rgba(25, 118, 210, 0.13)',
  },
  '&:hover': {
    bgcolor: theme.palette.action.hover,
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

  const [trainingContext, setTrainingContext] = React.useState<TrainingContext>(
    () => getStoredTrainingContext(location.pathname),
  );
  const [rwTopicId, setRwTopicId] = React.useState<string | null>(() => {
    return loadReadWriteSession()?.topicId || null;
  });

  const refreshTrainingContext = React.useCallback(() => {
    const nextContext = getStoredTrainingContext(location.pathname);
    setTrainingContext((current) =>
      current.topicId === nextContext.topicId &&
      current.label === nextContext.label
        ? current
        : nextContext,
    );
    const nextRwTopicId = loadReadWriteSession()?.topicId || null;
    setRwTopicId((current) =>
      current === nextRwTopicId ? current : nextRwTopicId,
    );
  }, [location.pathname]);

  React.useEffect(() => {
    refreshTrainingContext();
  }, [refreshTrainingContext, searchParams]);

  React.useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === DATABASE_KEYS.trainingSessions) {
        refreshTrainingContext();
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [refreshTrainingContext]);

  React.useEffect(() => {
    const interval = window.setInterval(refreshTrainingContext, 1200);
    return () => window.clearInterval(interval);
  }, [refreshTrainingContext]);

  const [open, setOpen] = React.useState(false);
  const [trainOpen, setTrainOpen] = React.useState(() =>
    location.pathname.startsWith('/train') &&
    location.pathname !== '/train/result',
  );
  const [trainFlyoutAnchor, setTrainFlyoutAnchor] =
    React.useState<HTMLElement | null>(null);
  const closeFlyoutTimer = React.useRef<number | null>(null);

  React.useEffect(() => {
    setOpen(!isMobile);
  }, [isMobile]);

  React.useEffect(() => {
    if (open || isMobile) setTrainFlyoutAnchor(null);
  }, [open, isMobile]);

  React.useEffect(
    () => () => {
      if (closeFlyoutTimer.current !== null) {
        window.clearTimeout(closeFlyoutTimer.current);
      }
    },
    [],
  );

  const cancelFlyoutClose = React.useCallback(() => {
    if (closeFlyoutTimer.current !== null) {
      window.clearTimeout(closeFlyoutTimer.current);
      closeFlyoutTimer.current = null;
    }
  }, []);

  const closeTrainFlyout = React.useCallback(() => {
    cancelFlyoutClose();
    setTrainFlyoutAnchor(null);
  }, [cancelFlyoutClose]);

  const scheduleFlyoutClose = React.useCallback(() => {
    cancelFlyoutClose();
    closeFlyoutTimer.current = window.setTimeout(() => {
      setTrainFlyoutAnchor(null);
      closeFlyoutTimer.current = null;
    }, 140);
  }, [cancelFlyoutClose]);

  const showTrainFlyout = React.useCallback(
    (anchor: HTMLElement) => {
      if (open || isMobile) return;
      cancelFlyoutClose();
      setTrainFlyoutAnchor(anchor);
    },
    [cancelFlyoutClose, isMobile, open],
  );

  const handleToggleDrawer = React.useCallback((event?: React.MouseEvent) => {
    event?.preventDefault();
    event?.stopPropagation();
    setOpen((current) => !current);
  }, []);

  const handleTrainClick = React.useCallback(
    (event: React.MouseEvent<HTMLElement>) => {
      if (!open && !isMobile) {
        showTrainFlyout(event.currentTarget);
        return;
      }
      setTrainOpen((current) => !current);
    },
    [isMobile, open, showTrainFlyout],
  );

  const isActive = React.useCallback(
    (path: string) => {
      if (path === '/') return location.pathname === '/';
      return (
        location.pathname === path ||
        (location.pathname.startsWith(path) &&
          (location.pathname[path.length] === '/' ||
            location.pathname.length === path.length))
      );
    },
    [location.pathname],
  );

  const trainingModePaths = [
    '/train/flashcards-reading',
    '/train/flashcards-listening',
    '/train/read-write',
    '/train/listen-write',
  ];
  const trainActive =
    location.pathname === '/train' ||
    trainingModePaths.some((path) => isActive(path));

  React.useEffect(() => {
    const width = isMobile ? 0 : open ? drawerWidth : collapsedWidth;
    document.documentElement.style.setProperty('--nav-w', `${width}px`);
    return () => {
      document.documentElement.style.removeProperty('--nav-w');
    };
  }, [isMobile, open]);

  const closeMobileDrawer = React.useCallback(() => {
    if (isMobile) setOpen(false);
  }, [isMobile]);

  const renderMainNavItem = (
    to: string,
    label: string,
    icon: React.ReactNode,
  ) => {
    const active = isActive(to);
    return (
      <Tooltip
        key={to}
        title={label}
        placement="right"
        disableHoverListener={open}
      >
        <ListItemLink
          to={to}
          selected={active}
          onClick={closeMobileDrawer}
          sx={navItemStyle(open, active, theme)}
        >
          <ListItemIcon sx={iconStyle(open)}>{icon}</ListItemIcon>
          {open && (
            <ListItemText
              primary={label}
              sx={{ my: 0, minWidth: 0 }}
              primaryTypographyProps={navTextProps}
            />
          )}
        </ListItemLink>
      </Tooltip>
    );
  };

  const trainingItems = [
    {
      to: '/train/flashcards-reading',
      label: t('flashcardsReading'),
      icon: <Rocket size={18} />,
    },
    {
      to: '/train/flashcards-listening',
      label: t('flashcardsListening'),
      icon: <Headphones size={18} />,
    },
    {
      to: rwTopicId
        ? `/train/read-write?topic=${encodeURIComponent(rwTopicId)}`
        : '/train/read-write',
      activePath: '/train/read-write',
      label: t('readWrite'),
      icon: <Edit size={18} />,
    },
    {
      to: '/train/listen-write',
      label: t('listenWrite'),
      icon: <Mic size={18} />,
    },
  ];

  const renderExpandedTrainingItems = () => (
    <Collapse in={open && trainOpen} timeout="auto" unmountOnExit>
      <List component="div" disablePadding sx={{ pb: 0.25 }}>
        {trainingItems.map((item) => {
          const active = isActive(item.activePath || item.to.split('?')[0]);
          return (
            <ListItemLink
              key={item.to}
              to={item.to}
              selected={active}
              onClick={closeMobileDrawer}
              sx={navItemStyle(true, active, theme, true)}
            >
              <ListItemIcon sx={iconStyle(true)}>{item.icon}</ListItemIcon>
              <ListItemText
                primary={item.label}
                sx={{ my: 0, minWidth: 0 }}
                primaryTypographyProps={subNavTextProps}
              />
            </ListItemLink>
          );
        })}
      </List>
    </Collapse>
  );

  return (
    <>
      {isMobile && (
        <>
          <AppBar position="fixed" elevation={1}>
            <Toolbar sx={{ minHeight: { xs: 56, sm: 64 }, px: 1.25 }}>
              <IconButton
                edge="start"
                color="inherit"
                aria-label={
                  open
                    ? t('tooltips.collapseSidebar')
                    : t('tooltips.expandSidebar')
                }
                onClick={handleToggleDrawer}
                sx={{
                  mr: 1,
                  width: 44,
                  height: 44,
                  touchAction: 'manipulation',
                }}
              >
                <Menu size={23} />
              </IconButton>
              <Box
                component={RouterLink}
                to="/"
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  minWidth: 0,
                  gap: 1,
                  color: 'inherit',
                  textDecoration: 'none',
                }}
              >
                <Avatar
                  sx={{
                    width: 32,
                    height: 32,
                    bgcolor: 'primary.contrastText',
                    color: 'primary.main',
                    flexShrink: 0,
                  }}
                >
                  <BookOpen size={18} />
                </Avatar>
                <Typography
                  noWrap
                  sx={{
                    fontSize: '1.0625rem',
                    lineHeight: 1.2,
                    fontWeight: 700,
                    letterSpacing: 0,
                  }}
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
        ModalProps={{ keepMounted: true }}
        sx={{
          width: open ? drawerWidth : collapsedWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: open ? drawerWidth : collapsedWidth,
            overflowX: 'hidden',
            boxSizing: 'border-box',
            bgcolor: 'background.paper',
            borderRight: `1px solid ${theme.palette.divider}`,
            transition: isMobile
              ? theme.transitions.create('transform', {
                  easing: theme.transitions.easing.sharp,
                  duration: theme.transitions.duration.enteringScreen,
                })
              : theme.transitions.create('width', {
                  easing: theme.transitions.easing.sharp,
                  duration: theme.transitions.duration.standard,
                }),
            touchAction: 'pan-y',
            WebkitOverflowScrolling: 'touch',
          },
          zIndex: isMobile ? theme.zIndex.drawer : 'auto',
        }}
      >
        {!isMobile && (
          <Box
            sx={{
              height: 56,
              minHeight: 56,
              display: 'flex',
              alignItems: 'center',
              justifyContent: open ? 'space-between' : 'center',
              px: open ? 1.5 : 0,
              overflow: 'hidden',
            }}
          >
            {open && (
              <Box
                component={RouterLink}
                to="/"
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  minWidth: 0,
                  color: 'text.primary',
                  textDecoration: 'none',
                }}
              >
                <Avatar
                  sx={{
                    width: 30,
                    height: 30,
                    bgcolor: 'primary.main',
                    color: 'primary.contrastText',
                    flexShrink: 0,
                  }}
                >
                  <BookOpen size={17} />
                </Avatar>
                <Typography
                  noWrap
                  sx={{
                    fontSize: '1.0625rem',
                    lineHeight: 1.2,
                    fontWeight: 700,
                    letterSpacing: 0,
                  }}
                >
                  Wordly
                </Typography>
              </Box>
            )}
            <Tooltip
              title={
                open
                  ? t('tooltips.collapseSidebar')
                  : t('tooltips.expandSidebar')
              }
              placement="right"
            >
              <IconButton
                onClick={handleToggleDrawer}
                size="small"
                aria-label={
                  open
                    ? t('tooltips.collapseSidebar')
                    : t('tooltips.expandSidebar')
                }
                sx={{
                  width: 34,
                  height: 34,
                  flexShrink: 0,
                  color: 'text.secondary',
                }}
              >
                {open ? (
                  <ChevronLeft size={19} />
                ) : (
                  <ChevronRight size={19} />
                )}
              </IconButton>
            </Tooltip>
          </Box>
        )}

        {isMobile && (
          <Box
            component={RouterLink}
            to="/"
            onClick={closeMobileDrawer}
            sx={{
              minHeight: 56,
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              px: 1.5,
              color: 'text.primary',
              textDecoration: 'none',
            }}
          >
            <Avatar
              sx={{
                width: 30,
                height: 30,
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
              }}
            >
              <BookOpen size={17} />
            </Avatar>
            <Typography
              noWrap
              sx={{
                fontSize: '1.0625rem',
                fontWeight: 700,
                letterSpacing: 0,
              }}
            >
              Wordly
            </Typography>
          </Box>
        )}

        <Divider />

        <List sx={{ px: 0, py: 0.75, overflowX: 'hidden' }}>
          {renderMainNavItem('/', t('home'), <Home size={20} />)}
          {renderMainNavItem(
            '/vocabulary',
            t('vocabulary'),
            <Library size={20} />,
          )}

          <ListItemButton
            selected={trainActive}
            onClick={handleTrainClick}
            onMouseEnter={(event) => showTrainFlyout(event.currentTarget)}
            onMouseLeave={scheduleFlyoutClose}
            onFocus={(event) => showTrainFlyout(event.currentTarget)}
            aria-haspopup={!open && !isMobile ? 'menu' : undefined}
            aria-expanded={
              !open && !isMobile
                ? Boolean(trainFlyoutAnchor)
                : open
                  ? trainOpen
                  : undefined
            }
            sx={navItemStyle(open, trainActive, theme)}
          >
            <Tooltip
              title={
                trainingContext.label
                  ? `${t('train')}: ${trainingContext.label}`
                  : t('train')
              }
              placement="right"
              disableHoverListener={open || (!open && !isMobile)}
            >
              <ListItemIcon
                sx={{
                  ...iconStyle(open),
                  position: 'relative',
                  overflow: 'visible',
                }}
              >
                <BookOpen size={20} />
                {!open && trainingContext.label && (
                  <Box
                    sx={{
                      position: 'absolute',
                      top: -3,
                      right: -3,
                      width: 7,
                      height: 7,
                      borderRadius: '50%',
                      bgcolor: 'primary.main',
                      border: '2px solid',
                      borderColor: 'background.paper',
                    }}
                  />
                )}
              </ListItemIcon>
            </Tooltip>
            {open && (
              <>
                <ListItemText
                  primary={t('train')}
                  sx={{ my: 0, minWidth: 0 }}
                  primaryTypographyProps={navTextProps}
                />
                {trainOpen ? (
                  <ChevronUp size={17} />
                ) : (
                  <ChevronDown size={17} />
                )}
              </>
            )}
          </ListItemButton>

          {open && trainingContext.label && (
            <Tooltip title={trainingContext.label} placement="right">
              <Box sx={{ mx: 1.25, mb: 0.5, minWidth: 0 }}>
                <Chip
                  icon={<BookOpen size={14} />}
                  label={trainingContext.label}
                  size="small"
                  variant="outlined"
                  color="primary"
                  aria-label={`${t('trainingTopic')}: ${trainingContext.label}`}
                  sx={{
                    width: '100%',
                    height: 28,
                    borderRadius: 1,
                    justifyContent: 'flex-start',
                    '& .MuiChip-icon': {
                      ml: 0.75,
                      mr: -0.25,
                      flexShrink: 0,
                    },
                    '& .MuiChip-label': {
                      display: 'block',
                      minWidth: 0,
                      px: 0.75,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      fontSize: '0.75rem',
                      lineHeight: 1.2,
                      fontWeight: 500,
                      letterSpacing: 0,
                    },
                  }}
                />
              </Box>
            </Tooltip>
          )}

          {renderExpandedTrainingItems()}

          {renderMainNavItem(
            '/train/result',
            t('result'),
            <BarChart3 size={20} />,
          )}
          {renderMainNavItem('/data', t('data'), <Database size={20} />)}
        </List>

        <Box
          sx={{
            mt: 'auto',
            borderTop: `1px solid ${theme.palette.divider}`,
            py: 0.75,
            display: 'flex',
            flexDirection: open ? 'row' : 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: open ? 1 : 0.5,
            overflow: 'hidden',
          }}
        >
          <LanguageSwitcher compact={!open} />
          <Tooltip
            title={
              mode === 'dark'
                ? t('tooltips.switchToLight')
                : t('tooltips.switchToDark')
            }
            placement={open ? 'top' : 'right'}
          >
            <IconButton
              onClick={toggleTheme}
              size="small"
              aria-label={
                mode === 'dark'
                  ? t('tooltips.switchToLight')
                  : t('tooltips.switchToDark')
              }
              sx={{
                width: 36,
                height: 36,
                p: 0,
                borderRadius: 1,
                color: 'text.secondary',
                flexShrink: 0,
              }}
            >
              {mode === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </IconButton>
          </Tooltip>
        </Box>
      </Drawer>

      <Popper
        open={!open && !isMobile && Boolean(trainFlyoutAnchor)}
        anchorEl={trainFlyoutAnchor}
        placement="right-start"
        modifiers={[
          {
            name: 'offset',
            options: { offset: [0, 8] },
          },
        ]}
        sx={{ zIndex: theme.zIndex.drawer + 2 }}
      >
        <ClickAwayListener onClickAway={closeTrainFlyout}>
          <Paper
            role="menu"
            aria-label={t('train')}
            onMouseEnter={cancelFlyoutClose}
            onMouseLeave={scheduleFlyoutClose}
            onKeyDown={(event) => {
              if (event.key === 'Escape') closeTrainFlyout();
            }}
            elevation={8}
            sx={{
              width: 248,
              py: 0.75,
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: 1,
              overflow: 'hidden',
            }}
          >
            <Box sx={{ px: 1.5, py: 0.75, minWidth: 0 }}>
              <Typography
                sx={{
                  fontSize: '0.875rem',
                  lineHeight: 1.25,
                  fontWeight: 700,
                  letterSpacing: 0,
                }}
              >
                {t('train')}
              </Typography>
              {trainingContext.label && (
                <>
                  <Typography
                    sx={{
                      mt: 0.75,
                      color: 'text.secondary',
                      fontSize: '0.6875rem',
                      lineHeight: 1.2,
                      fontWeight: 500,
                      letterSpacing: 0,
                    }}
                  >
                    {t('trainingTopic')}
                  </Typography>
                  <Typography
                    title={trainingContext.label}
                    noWrap
                    sx={{
                      mt: 0.25,
                      color: 'primary.main',
                      fontSize: '0.8125rem',
                      lineHeight: 1.3,
                      fontWeight: 600,
                      letterSpacing: 0,
                    }}
                  >
                    {trainingContext.label}
                  </Typography>
                </>
              )}
            </Box>
            <Divider />
            <List disablePadding sx={{ py: 0.5 }}>
              {trainingItems.map((item) => {
                const active = isActive(item.activePath || item.to.split('?')[0]);
                return (
                  <ListItemLink
                    key={`flyout-${item.to}`}
                    to={item.to}
                    role="menuitem"
                    selected={active}
                    onClick={closeTrainFlyout}
                    sx={{
                      minHeight: 40,
                      mx: 0.75,
                      px: 1,
                      borderRadius: 1,
                      color: active ? 'primary.main' : 'text.primary',
                      '&.Mui-selected': {
                        bgcolor:
                          theme.palette.mode === 'dark'
                            ? 'rgba(144, 202, 249, 0.12)'
                            : 'rgba(25, 118, 210, 0.09)',
                      },
                    }}
                  >
                    <ListItemIcon sx={iconStyle(true)}>
                      {item.icon}
                    </ListItemIcon>
                    <ListItemText
                      primary={item.label}
                      sx={{ my: 0, minWidth: 0 }}
                      primaryTypographyProps={subNavTextProps}
                    />
                  </ListItemLink>
                );
              })}
            </List>
          </Paper>
        </ClickAwayListener>
      </Popper>
    </>
  );
};

export default Navbar;
