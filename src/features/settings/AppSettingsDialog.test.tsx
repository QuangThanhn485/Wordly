import { fireEvent, render, screen } from '@testing-library/react';
import i18n from '@/i18n';
import { CustomThemeProvider } from '@/contexts/ThemeContext';
import {
  __resetDatabaseForTests,
  loadPreferences,
} from '@/data';
import { AppSettingsDialog } from './AppSettingsDialog';

describe('application settings dialog', () => {
  beforeEach(async () => {
    localStorage.clear();
    __resetDatabaseForTests();
    await i18n.changeLanguage('vi');
  });

  it('saves device-only pronunciation and disables accent selection', () => {
    const onClose = jest.fn();

    render(
      <CustomThemeProvider>
        <AppSettingsDialog open onClose={onClose} />
      </CustomThemeProvider>,
    );

    const deviceVoice = screen.getByRole('radio', {
      name: /Giọng mặc định/i,
    });
    const dictionaryVoice = screen.getByRole('radio', {
      name: /Bản ghi từ điển chuẩn/i,
    });
    const usAccent = screen.getByRole('radio', {
      name: /Anh-Mỹ/i,
    });

    expect(dictionaryVoice).toBeChecked();
    expect(usAccent).toBeEnabled();

    fireEvent.click(deviceVoice);

    expect(deviceVoice).toBeChecked();
    expect(usAccent).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Lưu' }));

    expect(loadPreferences().pronunciation).toEqual({
      source: 'device',
      accent: 'us',
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
