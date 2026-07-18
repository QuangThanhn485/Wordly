import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import App from './App';
import { CustomThemeProvider } from './contexts/ThemeContext';
import { __resetDatabaseForTests } from './data';

test('renders the Wordly application shell', async () => {
  localStorage.clear();
  __resetDatabaseForTests();

  render(
    <CustomThemeProvider>
      <App />
    </CustomThemeProvider>,
  );

  await waitFor(() => {
    expect(screen.getAllByText('Wordly').length).toBeGreaterThan(1);
  });
});
