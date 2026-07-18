import { lazy, Suspense, type ReactNode } from 'react';
import { Box, LinearProgress } from '@mui/material';
import { useRoutes } from 'react-router-dom';
import MainLayout from '@/layouts/MainLayout';

const Home = lazy(() => import('@/pages/Home'));
const VocabularyPage = lazy(
  () => import('@/features/vocabulary/pages/VocabularyPage'),
);
const FlashcardsReadingPage = lazy(
  () => import('@/features/train/pages/FlashcardsReadingPage'),
);
const FlashcardsListeningPage = lazy(
  () => import('@/features/train/pages/FlashcardsListeningPage'),
);
const ReadWritePage = lazy(
  () => import('@/features/train/pages/ReadWritePage'),
);
const ListenWritePage = lazy(
  () => import('@/features/train/pages/ListenWritePage'),
);
const ResultPage = lazy(() => import('@/features/train/pages/ResultPage'));
const DataManagementPage = lazy(() => import('@/pages/DataManagementPage'));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));

function LazyRoute({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <Box sx={{ width: '100%', px: 2, pt: 1 }}>
          <LinearProgress aria-label="Loading page" />
        </Box>
      }
    >
      {children}
    </Suspense>
  );
}

const lazyRoute = (element: ReactNode) => <LazyRoute>{element}</LazyRoute>;

export default function AppRoutes() {
  return useRoutes([
    {
      path: '/',
      element: <MainLayout />,
      children: [
        { index: true, element: lazyRoute(<Home />) },
        { path: 'vocabulary', element: lazyRoute(<VocabularyPage />) },
        {
          path: 'train/flashcards-reading',
          element: lazyRoute(<FlashcardsReadingPage />),
        },
        {
          path: 'train/flashcards-listening',
          element: lazyRoute(<FlashcardsListeningPage />),
        },
        { path: 'train/read-write', element: lazyRoute(<ReadWritePage />) },
        { path: 'train/listen-write', element: lazyRoute(<ListenWritePage />) },
        { path: 'train/result', element: lazyRoute(<ResultPage />) },
        { path: 'data', element: lazyRoute(<DataManagementPage />) },
      ],
    },
    {
      path: '*',
      element: lazyRoute(<NotFoundPage />),
    },
  ]);
}
