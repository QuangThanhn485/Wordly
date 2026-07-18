// src/index.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { CustomThemeProvider } from './contexts/ThemeContext';
import '@fontsource/roboto';
import { initializeDatabase } from './data';

// Initialize i18n
import './i18n';

initializeDatabase();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <CustomThemeProvider>
      <App />
    </CustomThemeProvider>
  </React.StrictMode>
);
