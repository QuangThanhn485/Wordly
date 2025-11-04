// speechUtils.ts
// Enhanced speech utilities for English pronunciation

/**
 * Enhanced English speech synthesis with better voice selection
 * Falls back to Web Speech API if cloud services are not available
 */

export interface SpeechOptions {
  lang?: string;
  rate?: number;
  pitch?: number;
  volume?: number;
  voiceName?: string;
}

/**
 * Get the best available English voice from Web Speech API
 */
export const getBestEnglishVoice = (): SpeechSynthesisVoice | null => {
  const synth = window.speechSynthesis;
  if (!synth) return null;

  const voices = synth.getVoices();

  // Priority order for voice selection (best quality first)
  const voicePriorities = [
    // Google voices (usually best quality)
    (v: SpeechSynthesisVoice) => v.name.includes('Google') && v.lang.startsWith('en'),
    // Microsoft voices
    (v: SpeechSynthesisVoice) => v.name.includes('Microsoft') && v.lang.startsWith('en'),
    // US English voices
    (v: SpeechSynthesisVoice) => v.lang === 'en-US',
    // GB English voices
    (v: SpeechSynthesisVoice) => v.lang === 'en-GB',
    // Any English
    (v: SpeechSynthesisVoice) => v.lang.startsWith('en'),
  ];

  for (const priority of voicePriorities) {
    const voice = voices.find(priority);
    if (voice) return voice;
  }

  return voices.find((v) => v.lang.startsWith('en')) || null;
};

/**
 * Speak English text with enhanced voice selection
 * This is the main function to use for all English pronunciation
 * @param text Text to speak
 * @param options Speech options
 */
export const speakEnglish = (
  text: string,
  options: SpeechOptions = {}
): void => {
  if (!text || typeof text !== 'string') return;
  const synth = window.speechSynthesis;
  if (!synth) {
    console.warn('Speech synthesis not supported');
    return;
  }

  // Wait for voices to be loaded
  const loadVoices = () => {
    const voices = synth.getVoices();
    if (voices.length === 0) {
      // Voices might not be loaded yet, wait a bit
      setTimeout(loadVoices, 100);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = options.lang || 'en-US';
    utterance.rate = options.rate ?? 1.0;
    utterance.pitch = options.pitch ?? 1.0;
    utterance.volume = options.volume ?? 1.0;

    // Select best voice
    if (options.voiceName) {
      const voice = voices.find((v) => v.name === options.voiceName);
      if (voice) utterance.voice = voice;
    } else {
      const bestVoice = getBestEnglishVoice();
      if (bestVoice) utterance.voice = bestVoice;
    }

    // Cancel any ongoing speech
    try {
      synth.cancel();
    } catch (e) {
      // Ignore errors
    }

    // Speak
    synth.speak(utterance);
  };

  // Ensure voices are loaded
  if (synth.getVoices().length === 0) {
    synth.addEventListener('voiceschanged', loadVoices, { once: true });
    loadVoices();
  } else {
    loadVoices();
  }
};

/**
 * Get list of available English voices
 */
export const getAvailableEnglishVoices = (): SpeechSynthesisVoice[] => {
  const synth = window.speechSynthesis;
  if (!synth) return [];
  return synth.getVoices().filter((v) => v.lang.startsWith('en'));
};

/**
 * Check if speech synthesis is supported
 */
export const isSpeechSupported = (): boolean => {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
};

/**
 * Simple speak function - alias for speakEnglish with default options
 * Use this for quick pronunciation in vocabulary lists
 * @param text Text to speak
 */
export const speak = (text: string): void => {
  speakEnglish(text, {
    lang: 'en-US',
    rate: 1.0,
    pitch: 1.0,
    volume: 1.0,
  });
};

