import {
  isRecordedPronunciationCandidate,
  selectPronunciationAudio,
} from './pronunciationSource';

const dictionaryPayload = [
  {
    phonetic: '/riːd/',
    phonetics: [
      {
        text: '/ɹiːd/',
        audio: 'https://api.dictionaryapi.dev/media/pronunciations/en/read-1-us.ogg',
      },
    ],
    meanings: [{ partOfSpeech: 'verb' }],
  },
  {
    phonetic: '/red/',
    phonetics: [
      {
        text: '/ɹɛd/',
        audio: 'https://api.dictionaryapi.dev/media/pronunciations/en/read-2-us.mp3',
      },
    ],
    meanings: [{ partOfSpeech: 'verb' }],
  },
];

describe('pronunciation source selection', () => {
  it('selects the recording that best matches the supplied IPA', () => {
    expect(
      selectPronunciationAudio(dictionaryPayload, {
        accent: 'us',
        phonetic: '/red/',
        partOfSpeech: 'verb',
      })?.url,
    ).toContain('read-2-us.mp3');
  });

  it('rejects unsafe audio hosts', () => {
    expect(
      selectPronunciationAudio([
        {
          phonetics: [
            {
              text: '/kæt/',
              audio: 'https://example.com/untrusted.mp3',
            },
          ],
        },
      ]),
    ).toBeNull();
  });

  it('falls back instead of using a recording from the wrong part of speech', () => {
    expect(
      selectPronunciationAudio(
        [
          {
            phonetic: '/ˈrekərd/',
            phonetics: [
              {
                text: '/ˈrekərd/',
                audio:
                  'https://api.dictionaryapi.dev/media/pronunciations/en/record-1-us.mp3',
              },
            ],
            meanings: [{ partOfSpeech: 'noun' }],
          },
          {
            phonetic: '/rɪˈkɔːrd/',
            phonetics: [],
            meanings: [{ partOfSpeech: 'verb' }],
          },
        ],
        {
          accent: 'us',
          phonetic: '/rɪˈkɔːrd/',
          partOfSpeech: 'verb',
        },
      ),
    ).toBeNull();
  });

  it('prefers the requested accent when IPA is not supplied', () => {
    expect(
      selectPronunciationAudio(
        [
          {
            phonetics: [
              {
                text: '/kæt/',
                audio:
                  'https://api.dictionaryapi.dev/media/pronunciations/en/cat-uk.mp3',
              },
              {
                text: '/kæt/',
                audio:
                  'https://api.dictionaryapi.dev/media/pronunciations/en/cat-us.mp3',
              },
            ],
          },
        ],
        { accent: 'us' },
      )?.url,
    ).toContain('cat-us.mp3');
  });

  it('falls back instead of playing a different requested accent', () => {
    expect(
      selectPronunciationAudio(
        [
          {
            phonetics: [
              {
                text: '/ədˈvɜːrtɪsmənt/',
                audio:
                  'https://api.dictionaryapi.dev/media/pronunciations/en/advertisement-us.mp3',
              },
            ],
          },
        ],
        { accent: 'uk' },
      ),
    ).toBeNull();
  });

  it('only sends dictionary-like words to the recording service', () => {
    expect(isRecordedPronunciationCandidate('cathedral')).toBe(true);
    expect(isRecordedPronunciationCandidate("mother-in-law")).toBe(true);
    expect(isRecordedPronunciationCandidate('ice cream')).toBe(false);
    expect(isRecordedPronunciationCandidate('xin chào')).toBe(false);
  });
});
