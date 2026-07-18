import {
  getBestEnglishVoice,
  resolveSpeechOptions,
} from './speechUtils';
import {
  __resetDatabaseForTests,
  updatePreferences,
} from '@/data';

const createVoice = (
  name: string,
  lang: string,
  options: { default?: boolean; localService?: boolean } = {},
): SpeechSynthesisVoice => ({
  default: options.default ?? false,
  lang,
  localService: options.localService ?? true,
  name,
  voiceURI: name,
});

describe('English browser voice selection', () => {
  const originalSpeechSynthesis = window.speechSynthesis;

  afterEach(() => {
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: originalSpeechSynthesis,
    });
  });

  it('prefers a natural voice in the requested locale', () => {
    const voices = [
      createVoice('Generic English', 'en-US'),
      createVoice('Microsoft Aria Online (Natural)', 'en-US', {
        localService: false,
      }),
      createVoice('Google UK English', 'en-GB'),
    ];

    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: { getVoices: () => voices },
    });

    expect(getBestEnglishVoice('en-US')?.name).toContain('Aria');
  });

  it('does not select a compact voice just because its locale is exact', () => {
    const voices = [
      createVoice('English Compact', 'en-US'),
      createVoice('Google UK English', 'en-GB'),
    ];

    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: { getVoices: () => voices },
    });

    expect(getBestEnglishVoice('en-US')?.name).toBe('Google UK English');
  });
});

describe('pronunciation preferences', () => {
  beforeEach(() => {
    localStorage.clear();
    __resetDatabaseForTests();
  });

  it('disables recorded audio completely in device mode', () => {
    updatePreferences((current) => ({
      ...current,
      pronunciation: {
        source: 'device',
        accent: 'uk',
      },
    }));

    expect(resolveSpeechOptions({ lang: 'en-US' })).toMatchObject({
      lang: 'en-US',
      preferRecordedAudio: false,
      browserVoiceProfile: 'original',
    });
  });

  it('applies the selected dictionary accent to every pronunciation', () => {
    updatePreferences((current) => ({
      ...current,
      pronunciation: {
        source: 'dictionary',
        accent: 'uk',
      },
    }));

    expect(resolveSpeechOptions({ lang: 'en-US' })).toMatchObject({
      lang: 'en-GB',
      preferRecordedAudio: true,
    });
  });

  it('allows the settings preview to use its unsaved draft', () => {
    updatePreferences((current) => ({
      ...current,
      pronunciation: {
        source: 'device',
        accent: 'us',
      },
    }));

    expect(
      resolveSpeechOptions({
        lang: 'en-GB',
        preferRecordedAudio: true,
      }),
    ).toMatchObject({
      lang: 'en-GB',
      preferRecordedAudio: true,
    });
  });
});
