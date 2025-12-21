// ===== Word Types (Parts of Speech) =====
export const WORD_TYPES = [
  { value: 'noun', labelKey: 'wordTypes.noun' },
  { value: 'verb', labelKey: 'wordTypes.verb' },
  { value: 'adjective', labelKey: 'wordTypes.adjective' },
  { value: 'adverb', labelKey: 'wordTypes.adverb' },
  { value: 'pronoun', labelKey: 'wordTypes.pronoun' },
  { value: 'preposition', labelKey: 'wordTypes.preposition' },
  { value: 'conjunction', labelKey: 'wordTypes.conjunction' },
  { value: 'interjection', labelKey: 'wordTypes.interjection' },
  { value: 'article', labelKey: 'wordTypes.article' },
  { value: 'determiner', labelKey: 'wordTypes.determiner' },
  { value: 'auxiliary', labelKey: 'wordTypes.auxiliary' },
] as const;

export const TOTAL_LEFT_BAND = 1000;
