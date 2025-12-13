import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import English translations
import enCommon from './locales/en/common.json';
import enHome from './locales/en/home.json';
import enNavbar from './locales/en/navbar.json';
import enVocabulary from './locales/en/vocabulary.json';
import enTrain from './locales/en/train.json';
import enResult from './locales/en/result.json';

// Import Vietnamese translations
import viCommon from './locales/vi/common.json';
import viHome from './locales/vi/home.json';
import viNavbar from './locales/vi/navbar.json';
import viVocabulary from './locales/vi/vocabulary.json';
import viTrain from './locales/vi/train.json';
import viResult from './locales/vi/result.json';

export const resources = {
  en: {
    common: enCommon,
    home: enHome,
    navbar: enNavbar,
    vocabulary: enVocabulary,
    train: enTrain,
    result: enResult,
  },
  vi: {
    common: viCommon,
    home: viHome,
    navbar: viNavbar,
    vocabulary: viVocabulary,
    train: viTrain,
    result: viResult,
  },
} as const;

export const defaultNS = 'common';
export const fallbackLng = 'en';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng,
    defaultNS,
    ns: ['common', 'home', 'navbar', 'vocabulary', 'train', 'result'],
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
  });

export default i18n;

