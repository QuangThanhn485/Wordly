import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CustomThemeProvider } from '@/contexts/ThemeContext';
import { __resetDatabaseForTests } from '@/data';
import i18n from '@/i18n';
import MobileNavigation, { isTrainingSessionPath } from './MobileNavigation';

const renderNavigation = (path: string) =>
  render(
    <CustomThemeProvider>
      <MemoryRouter initialEntries={[path]}>
        <MobileNavigation />
      </MemoryRouter>
    </CustomThemeProvider>,
  );

beforeEach(async () => {
  localStorage.clear();
  __resetDatabaseForTests();
  await i18n.changeLanguage('en');
});

test('renders five primary destinations on regular mobile pages', () => {
  renderNavigation('/vocabulary');

  const navigation = screen.getByRole('navigation', {
    name: 'Main navigation',
  });
  expect(navigation.querySelectorAll('a, button')).toHaveLength(5);
  expect(within(navigation).getByText('Vocabulary')).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Vocabulary' })).toBeInTheDocument();
});

test('uses the immersive mobile shell during a training session', () => {
  renderNavigation('/train/flashcards-reading');

  expect(
    screen.queryByRole('navigation', { name: 'Main navigation' }),
  ).not.toBeInTheDocument();
  expect(
    screen.getByRole('heading', { name: 'Flashcards Reading' }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole('button', { name: 'Back to vocabulary' }),
  ).toBeInTheDocument();
});

test('uses an icon-only primary training action that opens the training sheet', () => {
  renderNavigation('/');

  const navigation = screen.getByRole('navigation', {
    name: 'Main navigation',
  });
  const trainingButton = within(navigation).getByRole('button', {
    name: 'Train',
  });

  expect(within(trainingButton).queryByText('Train')).not.toBeInTheDocument();
  fireEvent.click(trainingButton);
  expect(screen.getByText('Flashcards Reading')).toBeInTheDocument();
  expect(screen.getByText('Flashcards Listening')).toBeInTheDocument();
});

test('recognizes only the four interactive training routes', () => {
  expect(isTrainingSessionPath('/train/listen-write')).toBe(true);
  expect(isTrainingSessionPath('/train/flashcards-listening')).toBe(true);
  expect(isTrainingSessionPath('/train/result')).toBe(false);
  expect(isTrainingSessionPath('/vocabulary')).toBe(false);
});
