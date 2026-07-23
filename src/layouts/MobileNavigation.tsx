import React from 'react';
import {
  AppBar,
  Avatar,
  Box,
  ButtonBase,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  useTheme,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
  ArrowLeft,
  BarChart3,
  BookOpen,
  CalendarDays,
  Database,
  Edit,
  Headphones,
  Home,
  Library,
  ListTodo,
  Menu,
  Mic,
  Moon,
  MoreHorizontal,
  Rocket,
  Settings,
  Sun,
  X,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { useThemeMode } from '@/contexts/ThemeContext';
import { DATABASE_KEYS } from '@/data';
import { loadTrainingSession as loadReadWriteSession } from '@/features/train/train-read-write/sessionStorage';
import {
  getStoredTrainingContext,
  type TrainingContext,
} from './navigationContext';
import {
  MOBILE_APP_BAR_HEIGHT,
  MOBILE_BOTTOM_NAV_HEIGHT,
  MOBILE_BOTTOM_NAV_SPACER,
} from './mobileLayoutConstants';

const AppSettingsDialog = React.lazy(() =>
  import('@/features/settings/AppSettingsDialog').then((module) => ({
    default: module.AppSettingsDialog,
  })),
);

type Sheet = 'training' | 'more' | null;

type NavItem = {
  key: string;
  label: string;
  icon: React.ReactNode;
  path?: string;
  active: boolean;
  onClick?: () => void;
};

const trainingPaths = [
  '/train/flashcards-reading',
  '/train/flashcards-listening',
  '/train/read-write',
  '/train/listen-write',
];

export const isTrainingSessionPath = (pathname: string): boolean =>
  trainingPaths.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );

const matchesPath = (pathname: string, path: string): boolean =>
  path === '/'
    ? pathname === '/'
    : pathname === path || pathname.startsWith(`${path}/`);

const MobileNavigation = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation('navbar');
  const { mode, toggleTheme } = useThemeMode();
  const [sheet, setSheet] = React.useState<Sheet>(null);
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [trainingContext, setTrainingContext] = React.useState<TrainingContext>(
    () => getStoredTrainingContext(location.pathname),
  );

  const isTrainingSession = isTrainingSessionPath(location.pathname);
  const isSecondaryActive =
    matchesPath(location.pathname, '/train/result') ||
    matchesPath(location.pathname, '/history') ||
    matchesPath(location.pathname, '/data');

  React.useEffect(() => {
    setSheet(null);
    setTrainingContext(getStoredTrainingContext(location.pathname));
  }, [location.pathname, location.search]);

  React.useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === DATABASE_KEYS.trainingSessions) {
        setTrainingContext(getStoredTrainingContext(location.pathname));
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [location.pathname]);

  const rwTopicId = loadReadWriteSession()?.topicId || null;
  const trainingItems = React.useMemo(
    () => [
      {
        path: '/train/flashcards-reading',
        label: t('flashcardsReading'),
        icon: <Rocket size={20} />,
      },
      {
        path: '/train/flashcards-listening',
        label: t('flashcardsListening'),
        icon: <Headphones size={20} />,
      },
      {
        path: rwTopicId
          ? `/train/read-write?topic=${encodeURIComponent(rwTopicId)}`
          : '/train/read-write',
        activePath: '/train/read-write',
        label: t('readWrite'),
        icon: <Edit size={20} />,
      },
      {
        path: '/train/listen-write',
        label: t('listenWrite'),
        icon: <Mic size={20} />,
      },
    ],
    [rwTopicId, t],
  );

  const pageMeta = React.useMemo(() => {
    if (matchesPath(location.pathname, '/vocabulary')) {
      return { label: t('vocabulary'), icon: <Library size={19} /> };
    }
    if (matchesPath(location.pathname, '/tasks')) {
      return { label: t('tasks'), icon: <ListTodo size={19} /> };
    }
    if (matchesPath(location.pathname, '/train/result')) {
      return { label: t('result'), icon: <BarChart3 size={19} /> };
    }
    if (matchesPath(location.pathname, '/history')) {
      return { label: t('history'), icon: <CalendarDays size={19} /> };
    }
    if (matchesPath(location.pathname, '/data')) {
      return { label: t('data'), icon: <Database size={19} /> };
    }
    const trainingItem = trainingItems.find((item) =>
      matchesPath(location.pathname, item.activePath || item.path.split('?')[0]),
    );
    if (trainingItem) {
      return { label: trainingItem.label, icon: trainingItem.icon };
    }
    return { label: 'Wordly', icon: <BookOpen size={18} /> };
  }, [location.pathname, t, trainingItems]);

  const goTo = (path: string) => {
    setSheet(null);
    navigate(path);
  };

  const bottomItems: NavItem[] = [
    {
      key: 'home',
      label: t('home'),
      icon: <Home size={21} />,
      path: '/',
      active: location.pathname === '/',
    },
    {
      key: 'vocabulary',
      label: t('vocabulary'),
      icon: <Library size={21} />,
      path: '/vocabulary',
      active: matchesPath(location.pathname, '/vocabulary'),
    },
    {
      key: 'train',
      label: t('train'),
      icon: <Rocket size={24} />,
      active: isTrainingSession,
      onClick: () => setSheet('training'),
    },
    {
      key: 'tasks',
      label: t('tasks'),
      icon: <ListTodo size={21} />,
      path: '/tasks',
      active: matchesPath(location.pathname, '/tasks'),
    },
    {
      key: 'more',
      label: t('more'),
      icon: <MoreHorizontal size={22} />,
      active: isSecondaryActive,
      onClick: () => setSheet('more'),
    },
  ];

  const secondaryItems = [
    {
      path: '/train/result',
      label: t('result'),
      icon: <BarChart3 size={20} />,
    },
    {
      path: '/history',
      label: t('history'),
      icon: <CalendarDays size={20} />,
    },
    {
      path: '/data',
      label: t('data'),
      icon: <Database size={20} />,
    },
  ];
  const sessionNavigationItems = [
    { path: '/', label: t('home'), icon: <Home size={20} /> },
    {
      path: '/vocabulary',
      label: t('vocabulary'),
      icon: <Library size={20} />,
    },
    { path: '/tasks', label: t('tasks'), icon: <ListTodo size={20} /> },
  ];

  return (
    <>
      <AppBar
        position="fixed"
        color="inherit"
        elevation={0}
        sx={{
          zIndex: theme.zIndex.appBar,
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: alpha(theme.palette.background.paper, 0.97),
          backdropFilter: 'blur(12px)',
        }}
      >
        <Toolbar
          disableGutters
          sx={{
            minHeight: `${MOBILE_APP_BAR_HEIGHT}px !important`,
            height: MOBILE_APP_BAR_HEIGHT,
            px: 1,
            gap: 0.75,
          }}
        >
          {isTrainingSession ? (
            <IconButton
              aria-label={t('backToVocabulary')}
              onClick={() => navigate('/vocabulary')}
              sx={{ width: 44, height: 44, flexShrink: 0 }}
            >
              <ArrowLeft size={21} />
            </IconButton>
          ) : (
            <Avatar
              sx={{
                width: 34,
                height: 34,
                ml: 0.5,
                mr: 0.25,
                flexShrink: 0,
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
              }}
            >
              <BookOpen size={18} />
            </Avatar>
          )}

          <Box sx={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 1 }}>
            {location.pathname !== '/' && (
              <Box
                sx={{
                  width: 30,
                  height: 30,
                  display: 'grid',
                  placeItems: 'center',
                  flexShrink: 0,
                  borderRadius: 1,
                  color: 'primary.main',
                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                }}
              >
                {pageMeta.icon}
              </Box>
            )}
            <Box sx={{ minWidth: 0 }}>
              <Typography
                component="h1"
                noWrap
                sx={{
                  fontSize: '0.9375rem',
                  lineHeight: 1.25,
                  fontWeight: 700,
                  letterSpacing: 0,
                }}
              >
                {pageMeta.label}
              </Typography>
              {isTrainingSession && trainingContext.label && (
                <Typography
                  noWrap
                  color="text.secondary"
                  sx={{ mt: 0.125, fontSize: '0.6875rem', lineHeight: 1.2 }}
                >
                  {trainingContext.label}
                </Typography>
              )}
            </Box>
          </Box>

          <IconButton
            aria-label={t('openMenu')}
            onClick={() => setSheet('more')}
            sx={{ width: 44, height: 44, flexShrink: 0 }}
          >
            <Menu size={21} />
          </IconButton>
        </Toolbar>
      </AppBar>
      <Toolbar
        aria-hidden="true"
        disableGutters
        sx={{ minHeight: `${MOBILE_APP_BAR_HEIGHT}px !important` }}
      />

      {!isTrainingSession && (
        <Box
          component="nav"
          aria-label={t('mobileNavigation')}
          sx={{
            position: 'fixed',
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: theme.zIndex.appBar,
            height: MOBILE_BOTTOM_NAV_SPACER,
            pb: 'env(safe-area-inset-bottom, 0px)',
            display: 'grid',
            gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
            bgcolor: alpha(theme.palette.background.paper, 0.98),
            borderTop: '1px solid',
            borderColor: 'divider',
            backdropFilter: 'blur(14px)',
          }}
        >
          {bottomItems.map((item) => {
            const isPrimaryAction = item.key === 'train';
            const isVisuallyActive =
              item.active || (isPrimaryAction && sheet === 'training');

            return (
              <ButtonBase
                key={item.key}
                component={item.path ? 'a' : 'button'}
                href={item.path}
                aria-label={isPrimaryAction ? item.label : undefined}
                aria-current={item.active ? 'page' : undefined}
                onClick={(event: React.MouseEvent<HTMLElement>) => {
                  event.preventDefault();
                  if (item.path) goTo(item.path);
                  else item.onClick?.();
                }}
                sx={{
                  position: 'relative',
                  minWidth: 0,
                  height: MOBILE_BOTTOM_NAV_HEIGHT,
                  px: 0.25,
                  pt: isPrimaryAction ? 0 : 0.5,
                  pb: isPrimaryAction ? 0 : 0.375,
                  display: 'grid',
                  gridTemplateRows: isPrimaryAction ? '1fr' : '28px 16px',
                  alignContent: 'center',
                  justifyItems: 'center',
                  rowGap: isPrimaryAction ? 0 : 0.25,
                  overflow: 'visible',
                  color: isVisuallyActive ? 'primary.main' : 'text.secondary',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                <Box
                  component="span"
                  sx={
                    isPrimaryAction
                      ? {
                          position: 'absolute',
                          top: -20,
                          width: 56,
                          height: 56,
                          display: 'grid',
                          placeItems: 'center',
                          borderRadius: '50%',
                          border: '4px solid',
                          borderColor: 'background.paper',
                          bgcolor: isVisuallyActive
                            ? 'primary.dark'
                            : 'primary.main',
                          color: 'primary.contrastText',
                          boxShadow:
                            theme.palette.mode === 'dark'
                              ? '0 7px 18px rgba(0, 0, 0, 0.48)'
                              : '0 7px 18px rgba(15, 23, 42, 0.22)',
                          transition:
                            'transform 160ms ease, background-color 160ms ease',
                          '& svg': { width: 25, height: 25 },
                        }
                      : {
                          width: 40,
                          height: 28,
                          display: 'grid',
                          placeItems: 'center',
                          borderRadius: 999,
                          bgcolor: isVisuallyActive
                            ? alpha(theme.palette.primary.main, 0.14)
                            : 'transparent',
                          transition:
                            'color 160ms ease, background-color 160ms ease',
                        }
                  }
                >
                  {item.icon}
                </Box>

                {!isPrimaryAction && (
                  <Typography
                    component="span"
                    noWrap
                    sx={{
                      width: '100%',
                      height: 16,
                      px: 0.25,
                      display: 'block',
                      textAlign: 'center',
                      fontSize: '0.625rem',
                      lineHeight: '16px',
                      fontWeight: isVisuallyActive ? 700 : 500,
                      letterSpacing: 0,
                    }}
                  >
                    {item.label}
                  </Typography>
                )}
              </ButtonBase>
            );
          })}
        </Box>
      )}

      <Drawer
        anchor="bottom"
        open={sheet !== null}
        onClose={() => setSheet(null)}
        ModalProps={{ keepMounted: true }}
        PaperProps={{
          sx: {
            maxHeight: 'min(78dvh, 620px)',
            borderRadius: '8px 8px 0 0',
            overflow: 'hidden',
            pb: 'env(safe-area-inset-bottom, 0px)',
          },
        }}
      >
        <Box
          sx={{
            width: 42,
            height: 4,
            mx: 'auto',
            mt: 1,
            mb: 0.5,
            borderRadius: 1,
            bgcolor: 'divider',
          }}
        />
        <Box
          sx={{
            minHeight: 52,
            px: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 1,
          }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontSize: '1rem', fontWeight: 700, lineHeight: 1.25 }}>
              {sheet === 'training' ? t('train') : t('more')}
            </Typography>
            {sheet === 'training' && trainingContext.label && (
              <Typography
                noWrap
                color="text.secondary"
                sx={{ mt: 0.25, fontSize: '0.75rem', lineHeight: 1.25 }}
              >
                {t('trainingTopic')}: {trainingContext.label}
              </Typography>
            )}
          </Box>
          <IconButton
            aria-label={t('closeMenu')}
            onClick={() => setSheet(null)}
            sx={{ width: 40, height: 40 }}
          >
            <X size={20} />
          </IconButton>
        </Box>
        <Divider />

        {sheet === 'training' ? (
          <List disablePadding sx={{ py: 0.75, overflowY: 'auto' }}>
            {trainingItems.map((item) => {
              const active = matchesPath(
                location.pathname,
                item.activePath || item.path.split('?')[0],
              );
              return (
                <ListItemButton
                  key={item.path}
                  selected={active}
                  onClick={() => goTo(item.path)}
                  sx={{ minHeight: 52, mx: 1, px: 1.5, borderRadius: 1 }}
                >
                  <ListItemIcon sx={{ minWidth: 38, color: active ? 'primary.main' : 'inherit' }}>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={item.label}
                    primaryTypographyProps={{
                      fontSize: '0.9375rem',
                      fontWeight: active ? 700 : 500,
                      letterSpacing: 0,
                    }}
                  />
                </ListItemButton>
              );
            })}
          </List>
        ) : (
          <>
            <List disablePadding sx={{ py: 0.75, overflowY: 'auto' }}>
              {isTrainingSession && (
                <>
                  {sessionNavigationItems.slice(0, 2).map((item) => (
                    <ListItemButton
                      key={item.path}
                      onClick={() => goTo(item.path)}
                      sx={{ minHeight: 50, mx: 1, px: 1.5, borderRadius: 1 }}
                    >
                      <ListItemIcon sx={{ minWidth: 38 }}>{item.icon}</ListItemIcon>
                      <ListItemText
                        primary={item.label}
                        primaryTypographyProps={{ fontSize: '0.9375rem', fontWeight: 500 }}
                      />
                    </ListItemButton>
                  ))}
                  <ListItemButton
                    onClick={() => setSheet('training')}
                    sx={{ minHeight: 50, mx: 1, px: 1.5, borderRadius: 1 }}
                  >
                    <ListItemIcon sx={{ minWidth: 38, color: 'primary.main' }}>
                      <Rocket size={20} />
                    </ListItemIcon>
                    <ListItemText
                      primary={t('train')}
                      primaryTypographyProps={{ fontSize: '0.9375rem', fontWeight: 700 }}
                    />
                  </ListItemButton>
                  {sessionNavigationItems.slice(2).map((item) => (
                    <ListItemButton
                      key={item.path}
                      onClick={() => goTo(item.path)}
                      sx={{ minHeight: 50, mx: 1, px: 1.5, borderRadius: 1 }}
                    >
                      <ListItemIcon sx={{ minWidth: 38 }}>{item.icon}</ListItemIcon>
                      <ListItemText
                        primary={item.label}
                        primaryTypographyProps={{ fontSize: '0.9375rem', fontWeight: 500 }}
                      />
                    </ListItemButton>
                  ))}
                  <Divider sx={{ my: 0.75 }} />
                </>
              )}
              {secondaryItems.map((item) => {
                const active = matchesPath(location.pathname, item.path);
                return (
                  <ListItemButton
                    key={item.path}
                    selected={active}
                    onClick={() => goTo(item.path)}
                    sx={{ minHeight: 50, mx: 1, px: 1.5, borderRadius: 1 }}
                  >
                    <ListItemIcon sx={{ minWidth: 38, color: active ? 'primary.main' : 'inherit' }}>
                      {item.icon}
                    </ListItemIcon>
                    <ListItemText
                      primary={item.label}
                      primaryTypographyProps={{
                        fontSize: '0.9375rem',
                        fontWeight: active ? 700 : 500,
                        letterSpacing: 0,
                      }}
                    />
                  </ListItemButton>
                );
              })}
              <ListItemButton
                onClick={() => {
                  setSheet(null);
                  setSettingsOpen(true);
                }}
                sx={{ minHeight: 50, mx: 1, px: 1.5, borderRadius: 1 }}
              >
                <ListItemIcon sx={{ minWidth: 38 }}>
                  <Settings size={20} />
                </ListItemIcon>
                <ListItemText
                  primary={t('settings.title')}
                  primaryTypographyProps={{ fontSize: '0.9375rem', fontWeight: 500 }}
                />
              </ListItemButton>
            </List>
            <Divider />
            <Box
              sx={{
                minHeight: 58,
                px: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 1,
              }}
            >
              <LanguageSwitcher compact={false} />
              <IconButton
                onClick={toggleTheme}
                aria-label={
                  mode === 'dark'
                    ? t('tooltips.switchToLight')
                    : t('tooltips.switchToDark')
                }
                sx={{ width: 42, height: 42, border: '1px solid', borderColor: 'divider' }}
              >
                {mode === 'dark' ? <Sun size={19} /> : <Moon size={19} />}
              </IconButton>
            </Box>
          </>
        )}
      </Drawer>

      {settingsOpen && (
        <React.Suspense fallback={null}>
          <AppSettingsDialog open onClose={() => setSettingsOpen(false)} />
        </React.Suspense>
      )}
    </>
  );
};

export default MobileNavigation;
