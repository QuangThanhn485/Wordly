// src/index.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import App from 'App';
import { store } from './app/store';
import { CustomThemeProvider } from './contexts/ThemeContext';
import '@fontsource/roboto';

// Initialize i18n
import './i18n';

// Cleanup legacy storage key (removed change-tracking mechanism)
try {
  localStorage.removeItem('wordly_last_change_timestamp');
} catch {
  // Ignore storage access errors
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Provider store={store}>
      <CustomThemeProvider>
        <App />
      </CustomThemeProvider>
    </Provider>
  </React.StrictMode>
);
