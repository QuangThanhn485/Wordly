import React from 'react';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import App from './App';
import { store } from './app/store';
import { CustomThemeProvider } from './contexts/ThemeContext';
import { __resetDatabaseForTests } from './data';

test('renders the Wordly application shell', () => {
  localStorage.clear();
  __resetDatabaseForTests();

  render(
    <Provider store={store}>
      <CustomThemeProvider>
        <App />
      </CustomThemeProvider>
    </Provider>,
  );

  expect(screen.getAllByText('Wordly').length).toBeGreaterThan(0);
});
