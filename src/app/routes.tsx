import { useRoutes } from 'react-router-dom';
import MainLayout from '@/layouts/MainLayout';
import Home from '@/pages/Home';
import { VocabularyPage } from '@/features/vocabulary';
import About from '@/pages/About';
import TrainStart from '@/pages/Train/TrainStart';
import FlashcardsListening from '@/pages/Train/FlashcardsListening';
import Login from '@/features/auth/pages/Login';

export default function AppRoutes() {
  return useRoutes([
    {
      path: '/',
      element: <MainLayout />,
      children: [
        { index: true, element: <Home /> },
        { path: 'about', element: <About /> },
        { path: 'vocabulary', element: <VocabularyPage /> },
        { path: 'train/flashcards-reading', element: <TrainStart /> },
        { path: 'train/flashcards-listening', element: <FlashcardsListening /> },
      ],
    },
    {
      path: '/login',
      element: <Login />,
    },
    {
      path: '*',
      element: <div>404 - Not Found</div>,
    },
  ]);
}
