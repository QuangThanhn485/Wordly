// src/index.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { CustomThemeProvider } from './contexts/ThemeContext';
import '@fontsource/roboto';
import { DataSourceProvider } from './data/DataSourceProvider';

// Initialize i18n
import './i18n';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <CustomThemeProvider>
      <DataSourceProvider>
        <App />
      </DataSourceProvider>
    </CustomThemeProvider>
  </React.StrictMode>
);
