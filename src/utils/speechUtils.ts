import {
  isRecordedPronunciationCandidate,
  selectPronunciationAudio,
  type EnglishAccent,
} from './pronunciationSource';
import { loadPreferences } from '@/data';

export interface SpeechOptions {
  lang?: string;
  rate?: number;
  pitch?: number;
  volume?: number;
  voiceName?: string;
  phonetic?: string;
  partOfSpeech?: string;
  preferRecordedAudio?: boolean;
  browserVoiceProfile?: 'original' | 'enhanced';
}

type PlaybackSession = {
  cancelled: boolean;
  setStageCancel: (cancel: (() => void) | null) => boolean;
};

type ActivePlayback = {
  cancel: () => void;
};

const PRONUNCIATION_PROXY_PATH = '/api/pronunciation';
const DICTIONARY_API_PATH = 'https://api.dictionaryapi.dev/api/v2/entries/en';
const RECORDED_AUDIO_START_TIMEOUT_MS = 2_500;
const RECORDED_AUDIO_MAX_DURATION_MS = 12_000;
const VOICE_LOAD_TIMEOUT_MS = 800;
const DIRECT_SOURCE_CACHE_LIMIT = 200;

const directSourceCache = new Map<string, Promise<string | null>>();
let activePlayback: ActivePlayback | null = null;

const normalizeText = (text: string): string =>
  text.trim().replace(/\s+/g, ' ');

const getRequestedAccent = (lang = 'en-US'): EnglishAccent =>
  lang.toLocaleLowerCase('en').startsWith('en-gb') ? 'uk' : 'us';

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

export const resolveSpeechOptions = (
  options: SpeechOptions,
): SpeechOptions => {
  if (options.preferRecordedAudio !== undefined) {
    return options.preferRecordedAudio
      ? options
      : {
          ...options,
          browserVoiceProfile: options.browserVoiceProfile ?? 'original',
        };
  }

  try {
    const pronunciation = loadPreferences().pronunciation;
    if (pronunciation.source === 'device') {
      return {
        ...options,
        preferRecordedAudio: false,
        browserVoiceProfile: 'original',
      };
    }
    return {
      ...options,
      lang: pronunciation.accent === 'uk' ? 'en-GB' : 'en-US',
      preferRecordedAudio: true,
    };
  } catch {
    return options;
  }
};

const getOriginalEnglishVoice = (
  voices: SpeechSynthesisVoice[],
): SpeechSynthesisVoice | null => {
  const priorities = [
    (voice: SpeechSynthesisVoice) =>
      voice.name.includes('Google') && voice.lang.startsWith('en'),
    (voice: SpeechSynthesisVoice) =>
      voice.name.includes('Microsoft') && voice.lang.startsWith('en'),
    (voice: SpeechSynthesisVoice) => voice.lang === 'en-US',
    (voice: SpeechSynthesisVoice) => voice.lang === 'en-GB',
    (voice: SpeechSynthesisVoice) => voice.lang.startsWith('en'),
  ];

  for (const priority of priorities) {
    const voice = voices.find(priority);
    if (voice) return voice;
  }
  return null;
};

const getVoiceScore = (
  voice: SpeechSynthesisVoice,
  preferredLang: string,
): number => {
  const name = voice.name.toLocaleLowerCase('en');
  const lang = voice.lang.toLocaleLowerCase('en');
  const requestedLang = preferredLang.toLocaleLowerCase('en');
  let score = 0;

  if (lang === requestedLang) score += 180;
  else if (lang.split('-')[0] === requestedLang.split('-')[0]) score += 45;
  else return Number.NEGATIVE_INFINITY;

  if (/(natural|neural|premium|enhanced)/.test(name)) score += 110;
  if (/(google|microsoft|apple)/.test(name)) score += 45;
  if (
    /(aria|ava|daniel|guy|jenny|libby|ryan|samantha|sonia|tessa|zira)/.test(
      name,
    )
  ) {
    score += 30;
  }
  if (voice.default) score += 8;
  if (voice.localService) score += 3;
  if (/(compact|espeak|festival|novelty)/.test(name)) score -= 100;

  return score;
};

export const getBestEnglishVoice = (
  preferredLang = 'en-US',
): SpeechSynthesisVoice | null => {
  if (typeof window === 'undefined' || !window.speechSynthesis) return null;

  const englishVoices = window.speechSynthesis
    .getVoices()
    .filter((voice) => voice.lang.toLocaleLowerCase('en').startsWith('en'));

  return englishVoices
    .map((voice, index) => ({
      voice,
      index,
      score: getVoiceScore(voice, preferredLang),
    }))
    .sort((left, right) =>
      right.score - left.score || left.index - right.index
    )[0]?.voice ?? null;
};

const waitForVoices = (
  synth: SpeechSynthesis,
): Promise<SpeechSynthesisVoice[]> => {
  const currentVoices = synth.getVoices();
  if (currentVoices.length > 0) return Promise.resolve(currentVoices);

  return new Promise((resolve) => {
    let finished = false;
    let timer: number | undefined;

    const finish = () => {
      if (finished) return;
      finished = true;
      synth.removeEventListener('voiceschanged', finish);
      if (timer !== undefined) window.clearTimeout(timer);
      resolve(synth.getVoices());
    };

    synth.addEventListener('voiceschanged', finish);
    timer = window.setTimeout(finish, VOICE_LOAD_TIMEOUT_MS);
  });
};

const buildProxyUrl = (text: string, options: SpeechOptions): string => {
  const params = new URLSearchParams({
    word: text.toLocaleLowerCase('en'),
    accent: getRequestedAccent(options.lang),
  });
  if (options.phonetic?.trim()) {
    params.set('phonetic', options.phonetic.trim());
  }
  if (options.partOfSpeech?.trim()) {
    params.set('partOfSpeech', options.partOfSpeech.trim());
  }
  return `${PRONUNCIATION_PROXY_PATH}?${params.toString()}`;
};

const resolveDirectAudioUrl = (
  text: string,
  options: SpeechOptions,
): Promise<string | null> => {
  const cacheKey = [
    text.toLocaleLowerCase('en'),
    getRequestedAccent(options.lang),
    options.phonetic?.trim() ?? '',
    options.partOfSpeech?.trim() ?? '',
  ].join('|');
  const cached = directSourceCache.get(cacheKey);
  if (cached) return cached;

  const request = (async () => {
    const controller = new AbortController();
    const timeout = window.setTimeout(
      () => controller.abort(),
      RECORDED_AUDIO_START_TIMEOUT_MS,
    );

    try {
      const response = await fetch(
        `${DICTIONARY_API_PATH}/${encodeURIComponent(text.toLocaleLowerCase('en'))}`,
        {
          headers: { Accept: 'application/json' },
          mode: 'cors',
          signal: controller.signal,
        },
      );
      if (!response.ok) return null;
      const payload: unknown = await response.json();
      return selectPronunciationAudio(payload, {
        accent: getRequestedAccent(options.lang),
        phonetic: options.phonetic,
        partOfSpeech: options.partOfSpeech,
      })?.url ?? null;
    } catch {
      return null;
    } finally {
      window.clearTimeout(timeout);
    }
  })();

  if (directSourceCache.size >= DIRECT_SOURCE_CACHE_LIMIT) {
    const oldestKey = directSourceCache.keys().next().value;
    if (oldestKey) directSourceCache.delete(oldestKey);
  }
  directSourceCache.set(cacheKey, request);
  return request;
};

const shouldUseRecordedAudio = (
  text: string,
  options: SpeechOptions,
): boolean =>
  options.preferRecordedAudio !== false &&
  !options.voiceName &&
  (options.pitch === undefined || options.pitch === 1) &&
  isRecordedPronunciationCandidate(text);

const playRecordedPronunciation = async (
  text: string,
  options: SpeechOptions,
  session: PlaybackSession,
): Promise<boolean> => {
  let sourceUrl: string | null;

  if (process.env.NODE_ENV === 'production') {
    sourceUrl = buildProxyUrl(text, options);
  } else {
    sourceUrl = await resolveDirectAudioUrl(text, options);
  }

  if (!sourceUrl || session.cancelled || typeof Audio === 'undefined') {
    return false;
  }

  return new Promise((resolve) => {
    const audio = new Audio(sourceUrl);
    let settled = false;
    let startTimer: number | undefined;
    let durationTimer: number | undefined;

    const cleanup = () => {
      audio.onended = null;
      audio.onerror = null;
      audio.onplaying = null;
      if (startTimer !== undefined) window.clearTimeout(startTimer);
      if (durationTimer !== undefined) window.clearTimeout(durationTimer);
      session.setStageCancel(null);
    };

    const settle = (played: boolean) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(played);
    };

    const stop = () => {
      audio.pause();
      audio.removeAttribute('src');
      try {
        audio.load();
      } catch {}
      settle(false);
    };

    if (!session.setStageCancel(stop)) {
      stop();
      return;
    }

    audio.preload = 'auto';
    audio.volume = clamp(options.volume ?? 1, 0, 1);
    audio.playbackRate = clamp(options.rate ?? 1, 0.75, 1.25);
    audio.onplaying = () => {
      if (startTimer !== undefined) {
        window.clearTimeout(startTimer);
        startTimer = undefined;
      }
      durationTimer = window.setTimeout(() => {
        audio.pause();
        settle(true);
      }, RECORDED_AUDIO_MAX_DURATION_MS);
    };
    audio.onended = () => settle(true);
    audio.onerror = () => settle(false);
    startTimer = window.setTimeout(stop, RECORDED_AUDIO_START_TIMEOUT_MS);

    try {
      const playResult = audio.play();
      playResult?.catch(() => settle(false));
    } catch {
      settle(false);
    }
  });
};

const speakWithBrowserVoice = async (
  text: string,
  options: SpeechOptions,
  session: PlaybackSession,
): Promise<void> => {
  if (
    session.cancelled ||
    typeof window === 'undefined' ||
    !window.speechSynthesis ||
    typeof SpeechSynthesisUtterance === 'undefined'
  ) {
    return;
  }

  const synth = window.speechSynthesis;
  const voices = await waitForVoices(synth);
  if (session.cancelled) return;

  await new Promise<void>((resolve) => {
    const utterance = new SpeechSynthesisUtterance(text);
    let settled = false;
    let fallbackTimer: number | undefined;

    const cleanup = () => {
      utterance.onend = null;
      utterance.onerror = null;
      if (fallbackTimer !== undefined) window.clearTimeout(fallbackTimer);
      session.setStageCancel(null);
    };

    const finish = () => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve();
    };

    const stop = () => {
      try {
        synth.cancel();
      } catch {}
      finish();
    };

    if (!session.setStageCancel(stop)) {
      stop();
      return;
    }

    utterance.lang = options.lang || 'en-US';
    const useOriginalVoice = options.browserVoiceProfile === 'original';
    utterance.rate = clamp(
      options.rate ?? (useOriginalVoice ? 1 : 0.95),
      0.5,
      2,
    );
    utterance.pitch = clamp(options.pitch ?? 1, 0, 2);
    utterance.volume = clamp(options.volume ?? 1, 0, 1);

    if (options.voiceName) {
      utterance.voice =
        voices.find((voice) => voice.name === options.voiceName) ?? null;
    }
    if (!utterance.voice) {
      utterance.voice = useOriginalVoice
        ? getOriginalEnglishVoice(voices)
        : getBestEnglishVoice(utterance.lang);
    }

    utterance.onend = finish;
    utterance.onerror = finish;
    fallbackTimer = window.setTimeout(
      finish,
      Math.min(Math.max(text.length * 95, 1_200), 8_000) + 1_500,
    );

    try {
      synth.cancel();
      synth.speak(utterance);
    } catch {
      finish();
    }
  });
};

export const cancelEnglishSpeech = (): void => {
  const playback = activePlayback;
  activePlayback = null;
  playback?.cancel();

  if (typeof window !== 'undefined') {
    try {
      window.speechSynthesis?.cancel();
    } catch {}
  }
};

export const speakEnglishAsync = (
  text: string,
  options: SpeechOptions = {},
): Promise<void> => {
  if (typeof text !== 'string' || typeof window === 'undefined') {
    return Promise.resolve();
  }

  const normalizedText = normalizeText(text);
  if (!normalizedText) return Promise.resolve();
  const effectiveOptions = resolveSpeechOptions(options);

  cancelEnglishSpeech();

  return new Promise((resolve) => {
    let completed = false;
    let stageCancel: (() => void) | null = null;

    const finish = () => {
      if (completed) return;
      completed = true;
      if (activePlayback?.cancel === cancel) {
        activePlayback = null;
      }
      resolve();
    };

    const session: PlaybackSession = {
      cancelled: false,
      setStageCancel: (nextCancel) => {
        stageCancel = nextCancel;
        if (session.cancelled && nextCancel) {
          stageCancel = null;
          nextCancel();
          return false;
        }
        return !session.cancelled;
      },
    };

    const cancel = () => {
      if (session.cancelled) return;
      session.cancelled = true;
      const cancelCurrentStage = stageCancel;
      stageCancel = null;
      cancelCurrentStage?.();
      finish();
    };

    activePlayback = { cancel };

    void (async () => {
      try {
        let usedRecordedAudio = false;
        if (shouldUseRecordedAudio(normalizedText, effectiveOptions)) {
          usedRecordedAudio = await playRecordedPronunciation(
            normalizedText,
            effectiveOptions,
            session,
          );
        }
        if (!usedRecordedAudio && !session.cancelled) {
          await speakWithBrowserVoice(
            normalizedText,
            effectiveOptions,
            session,
          );
        }
      } finally {
        finish();
      }
    })();
  });
};

export const speakEnglish = (
  text: string,
  options: SpeechOptions = {},
): void => {
  void speakEnglishAsync(text, options);
};

export const getAvailableEnglishVoices = (): SpeechSynthesisVoice[] => {
  if (typeof window === 'undefined' || !window.speechSynthesis) return [];
  return window.speechSynthesis
    .getVoices()
    .filter((voice) => voice.lang.toLocaleLowerCase('en').startsWith('en'))
    .sort(
      (left, right) =>
        getVoiceScore(right, 'en-US') - getVoiceScore(left, 'en-US'),
    );
};

export const isSpeechSupported = (): boolean =>
  typeof window !== 'undefined' &&
  (typeof Audio !== 'undefined' || 'speechSynthesis' in window);

export const speak = (
  text: string,
  options: SpeechOptions = {},
): void => {
  speakEnglish(text, {
    lang: 'en-US',
    rate: 1,
    pitch: 1,
    volume: 1,
    ...options,
  });
};
