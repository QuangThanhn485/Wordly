import { render, screen } from '@testing-library/react';
import App from '@/App';
import { CustomThemeProvider } from '@/contexts/ThemeContext';
import { DataSourceProvider } from '@/data/DataSourceProvider';
import {
  __resetDataSourceForTests,
  __resetDatabaseForTests,
  initializeDatabase,
} from '@/data';
import i18n from '@/i18n';

describe('data management page', () => {
  beforeEach(async () => {
    localStorage.clear();
    __resetDatabaseForTests();
    __resetDataSourceForTests();
    initializeDatabase();
    await i18n.changeLanguage('vi');
    window.history.pushState({}, '', '/data');
  });

  it('shows a compact source selector and namespaced Redis configuration', async () => {
    render(
      <CustomThemeProvider>
        <DataSourceProvider>
          <App />
        </DataSourceProvider>
      </CustomThemeProvider>,
    );

    expect(
      await screen.findByRole('heading', { name: 'Nguồn dữ liệu' }, { timeout: 5000 }),
    ).toBeInTheDocument();
    expect(screen.getByText('wordly:storage:v1:snapshot')).toBeInTheDocument();
    expect(screen.getByLabelText('REST URL')).toBeInTheDocument();
    expect(screen.getByLabelText('REST token')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Upstash Redis/i })).toBeDisabled();
  }, 15000);
});
