// src/index.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import App from 'App';
import { store } from './app/store';
import { CustomThemeProvider } from './contexts/ThemeContext';
import '@fontsource/roboto';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Provider store={store}>
      <CustomThemeProvider>
        <App />
      </CustomThemeProvider>
    </Provider>
  </React.StrictMode>
);
