import { useRoutes } from 'react-router-dom';
import MainLayout from '@/layouts/MainLayout';
import Home from '@/pages/Home';
import { VocabularyPage } from '@/features/vocabulary';
import About from '@/pages/About';
import TrainStart from '@/pages/Train/TrainStart';
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
        { path: 'train-start', element: <TrainStart /> },
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

