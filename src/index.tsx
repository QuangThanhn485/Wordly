// src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from 'App';
import { CustomThemeProvider } from './contexts/ThemeContext';
import '@fontsource/roboto';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <CustomThemeProvider>
      <App />
    </CustomThemeProvider>
  </React.StrictMode>
);
