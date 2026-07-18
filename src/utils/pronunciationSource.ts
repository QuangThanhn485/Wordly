export type EnglishAccent = 'us' | 'uk';

type DictionaryPhonetic = {
  text?: unknown;
  audio?: unknown;
};

type DictionaryMeaning = {
  partOfSpeech?: unknown;
};

type DictionaryEntry = {
  phonetic?: unknown;
  phonetics?: unknown;
  meanings?: unknown;
};

export type PronunciationSelectionOptions = {
  accent?: EnglishAccent;
  phonetic?: string;
  partOfSpeech?: string;
};

export type PronunciationAudioSource = {
  url: string;
  accent: EnglishAccent | null;
  phonetic: string | null;
};

const ALLOWED_AUDIO_HOSTS = new Set([
  'api.dictionaryapi.dev',
  'ssl.gstatic.com',
  'lex-audio.useremarkable.com',
]);

const PART_OF_SPEECH_ALIASES: Record<string, string> = {
  adjective: 'adjective',
  adj: 'adjective',
  'tính từ': 'adjective',
  adverb: 'adverb',
  adv: 'adverb',
  'trạng từ': 'adverb',
  conjunction: 'conjunction',
  conj: 'conjunction',
  'liên từ': 'conjunction',
  interjection: 'interjection',
  int: 'interjection',
  'thán từ': 'interjection',
  noun: 'noun',
  n: 'noun',
  'danh từ': 'noun',
  preposition: 'preposition',
  prep: 'preposition',
  'giới từ': 'preposition',
  pronoun: 'pronoun',
  pron: 'pronoun',
  'đại từ': 'pronoun',
  verb: 'verb',
  v: 'verb',
  'động từ': 'verb',
};

const asRecord = (value: unknown): Record<string, unknown> | null =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;

const normalizePartOfSpeech = (value: string | undefined): string | null => {
  if (!value) return null;
  const normalized = value
    .toLocaleLowerCase('vi')
    .replace(/[.()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return PART_OF_SPEECH_ALIASES[normalized] ?? null;
};

const normalizePhonetic = (value: string | undefined): string => {
  if (!value) return '';
  return value
    .normalize('NFC')
    .toLocaleLowerCase('en')
    .replace(/[\/[\]().\s]/g, '')
    .replace(/ɹ/g, 'r')
    .replace(/ɚ|ɝ/g, 'ər')
    .replace(/ɨ/g, 'ə')
    .replace(/g/g, 'ɡ');
};

const editDistance = (left: string, right: string): number => {
  if (left === right) return 0;
  if (!left) return right.length;
  if (!right) return left.length;

  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  const current = new Array<number>(right.length + 1);

  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    current[0] = leftIndex;
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const substitutionCost =
        left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1;
      current[rightIndex] = Math.min(
        current[rightIndex - 1] + 1,
        previous[rightIndex] + 1,
        previous[rightIndex - 1] + substitutionCost,
      );
    }
    for (let index = 0; index < current.length; index += 1) {
      previous[index] = current[index];
    }
  }

  return previous[right.length];
};

const phoneticSimilarity = (left: string, right: string): number => {
  if (!left || !right) return 0;
  const longestLength = Math.max(left.length, right.length);
  return longestLength === 0
    ? 1
    : 1 - editDistance(left, right) / longestLength;
};

const normalizeAudioUrl = (value: unknown): string | null => {
  if (typeof value !== 'string' || !value.trim()) return null;

  try {
    const url = new URL(
      value.startsWith('//') ? `https:${value}` : value,
    );
    if (url.protocol !== 'https:' || !ALLOWED_AUDIO_HOSTS.has(url.hostname)) {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
};

const inferAccent = (url: string): EnglishAccent | null => {
  const value = url.toLocaleLowerCase('en');
  if (/[-_](us|usa)(?:[-_.]|$)/.test(value)) return 'us';
  if (/[-_](uk|gb)(?:[-_.]|$)/.test(value)) return 'uk';
  return null;
};

export const isRecordedPronunciationCandidate = (text: string): boolean => {
  const normalized = text.trim().replace(/’/g, "'");
  if (normalized.length === 0 || normalized.length > 64) return false;
  return /^[A-Za-z]+(?:['-][A-Za-z]+)*$/.test(normalized);
};

export const selectPronunciationAudio = (
  payload: unknown,
  options: PronunciationSelectionOptions = {},
): PronunciationAudioSource | null => {
  if (!Array.isArray(payload)) return null;

  const requestedAccent = options.accent ?? 'us';
  const requestedPartOfSpeech = normalizePartOfSpeech(options.partOfSpeech);
  const requestedPhonetic = normalizePhonetic(options.phonetic);

  const entries = payload
    .map((value) => asRecord(value) as DictionaryEntry | null)
    .filter((entry): entry is DictionaryEntry => entry !== null);

  const entriesWithRequestedPartOfSpeech = requestedPartOfSpeech
    ? entries.filter((entry) => {
        if (!Array.isArray(entry.meanings)) return false;
        return entry.meanings.some((meaning) => {
          const record = asRecord(meaning) as DictionaryMeaning | null;
          return (
            typeof record?.partOfSpeech === 'string' &&
            normalizePartOfSpeech(record.partOfSpeech) === requestedPartOfSpeech
          );
        });
      })
    : [];

  const scopedEntries =
    requestedPartOfSpeech && entriesWithRequestedPartOfSpeech.length > 0
      ? entriesWithRequestedPartOfSpeech
      : entries;

  const candidates = scopedEntries.flatMap((entry) => {
    if (!Array.isArray(entry.phonetics)) return [];

    const entryPhonetic =
      typeof entry.phonetic === 'string' ? entry.phonetic : undefined;
    return entry.phonetics.flatMap((value) => {
      const phonetic = asRecord(value) as DictionaryPhonetic | null;
      const url = normalizeAudioUrl(phonetic?.audio);
      if (!url) return [];

      const phoneticText =
        typeof phonetic?.text === 'string' && phonetic.text.trim()
          ? phonetic.text
          : entryPhonetic;

      return [{
        url,
        accent: inferAccent(url),
        phonetic: phoneticText?.trim() || null,
        normalizedPhonetic: normalizePhonetic(phoneticText),
      }];
    });
  });

  if (candidates.length === 0) return null;
  const accentCandidates = candidates.filter(
    (candidate) => candidate.accent === requestedAccent,
  );
  if (accentCandidates.length === 0) return null;

  const candidatesWithPhonetics = requestedPhonetic
    ? accentCandidates
        .map((candidate) => ({
          ...candidate,
          similarity: phoneticSimilarity(
            requestedPhonetic,
            candidate.normalizedPhonetic,
          ),
        }))
        .filter((candidate) => candidate.normalizedPhonetic)
    : [];

  const bestSimilarity = candidatesWithPhonetics.reduce(
    (best, candidate) => Math.max(best, candidate.similarity),
    0,
  );

  // A known IPA mismatch is more dangerous than falling back to browser TTS.
  if (
    requestedPhonetic &&
    candidatesWithPhonetics.length > 0 &&
    bestSimilarity < 0.55
  ) {
    return null;
  }

  const scored = accentCandidates.map((candidate, index) => {
    const similarity = requestedPhonetic && candidate.normalizedPhonetic
      ? phoneticSimilarity(requestedPhonetic, candidate.normalizedPhonetic)
      : 0;
    return {
      candidate,
      index,
      score: 100 + similarity * 300,
    };
  });

  scored.sort((left, right) =>
    right.score - left.score || left.index - right.index
  );

  const selected = scored[0]?.candidate;
  return selected
    ? {
        url: selected.url,
        accent: selected.accent,
        phonetic: selected.phonetic,
      }
    : null;
};
