import React from 'react';
import { render, screen } from '@testing-library/react';
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

  expect(
    await screen.findByRole(
      'heading',
      { name: 'Wordly' },
      { timeout: 5000 },
    ),
  ).toBeInTheDocument();
});
