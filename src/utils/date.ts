// ===== Date Utilities =====
import i18n from '@/i18n';

/**
 * Format date to locale string
 */
export const formatDate = (
  date: Date | string,
  locale = i18n.language === 'vi' ? 'vi-VN' : 'en-US'
): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString(locale);
};

/**
 * Format datetime to locale string
 */
export const formatDateTime = (
  date: Date | string,
  locale = i18n.language === 'vi' ? 'vi-VN' : 'en-US'
): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString(locale);
};

/**
 * Get relative time (e.g., "2 hours ago")
 */
export const getRelativeTime = (
  date: Date | string,
  locale = i18n.language === 'vi' ? 'vi-VN' : 'en-US'
): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffInMs = now.getTime() - d.getTime();
  const diffInMinutes = Math.floor(diffInMs / 60000);
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);

  if (diffInMinutes < 1) return i18n.t('common:time.justNow');
  if (diffInMinutes < 60) return i18n.t('common:time.minutesAgo', { count: diffInMinutes });
  if (diffInHours < 24) return i18n.t('common:time.hoursAgo', { count: diffInHours });
  if (diffInDays < 7) return i18n.t('common:time.daysAgo', { count: diffInDays });
  
  return formatDate(d, locale);
};

/**
 * Check if date is today
 */
export const isToday = (date: Date | string): boolean => {
  const d = typeof date === 'string' ? new Date(date) : date;
  const today = new Date();
  return (
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear()
  );
};
