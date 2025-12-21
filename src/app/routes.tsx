import { useRoutes } from 'react-router-dom';
import MainLayout from '@/layouts/MainLayout';
import Home from '@/pages/Home';
import { VocabularyPage } from '@/features/vocabulary';
import About from '@/pages/About';
import {
  FlashcardsReadingPage,
  FlashcardsListeningPage,
  ReadWritePage,
  ListenWritePage,
  ResultPage,
} from '@/features/train/pages';
import DataManagementPage from '@/pages/DataManagementPage';
import NotFoundPage from '@/pages/NotFoundPage';

export default function AppRoutes() {
  return useRoutes([
    {
      path: '/',
      element: <MainLayout />,
      children: [
        { index: true, element: <Home /> },
        { path: 'about', element: <About /> },
        { path: 'vocabulary', element: <VocabularyPage /> },
        { path: 'train/flashcards-reading', element: <FlashcardsReadingPage /> },
        { path: 'train/flashcards-listening', element: <FlashcardsListeningPage /> },
        { path: 'train/read-write', element: <ReadWritePage /> },
        { path: 'train/listen-write', element: <ListenWritePage /> },
        { path: 'train/result', element: <ResultPage /> },
        { path: 'data', element: <DataManagementPage /> },
      ],
    },
    {
      path: '*',
      element: <NotFoundPage />,
    },
  ]);
}
