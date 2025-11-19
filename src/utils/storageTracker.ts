/**
 * Utility to track localStorage changes by timestamp
 * This helps detect if data has changed since last backup without storing full backup data
 */

const LAST_CHANGE_TIMESTAMP_KEY = 'wordly_last_change_timestamp';

/**
 * Update the last change timestamp in localStorage
 * If a timestamp is provided, use it; otherwise default to current time
 */
export const updateLastChangeTimestamp = (timestamp?: number): void => {
  try {
    const value = typeof timestamp === 'number' ? timestamp : Date.now();
    localStorage.setItem(LAST_CHANGE_TIMESTAMP_KEY, value.toString());
  } catch (error) {
    console.error('Error updating last change timestamp:', error);
  }
};

/**
 * Get the last change timestamp
 */
export const getLastChangeTimestamp = (): number | null => {
  try {
    const timestamp = localStorage.getItem(LAST_CHANGE_TIMESTAMP_KEY);
    return timestamp ? parseInt(timestamp, 10) : null;
  } catch (error) {
    console.error('Error getting last change timestamp:', error);
    return null;
  }
};

const TRACKED_KEY_PREFIXES = ['wordly_vocab_file:'];
const TRACKED_KEY_EXACT = new Set([
  'wordly_vocab_map',
  'wordly_vocab_index',
  'wordly_vocab_counts',
  'wordly_tree',
  'wordly_mistakes_stats',
]);

const shouldTrackKey = (key: string): boolean => {
  if (key === LAST_CHANGE_TIMESTAMP_KEY || !key.startsWith('wordly_')) return false;
  if (TRACKED_KEY_EXACT.has(key)) return true;
  return TRACKED_KEY_PREFIXES.some((prefix) => key.startsWith(prefix));
};

/**
 * Wrapper for localStorage.setItem that also updates the change timestamp
 */
export const trackedSetItem = (key: string, value: string): void => {
  try {
    localStorage.setItem(key, value);
    if (shouldTrackKey(key)) {
      updateLastChangeTimestamp();
    }
  } catch (error) {
    console.error('Error in trackedSetItem:', error);
    throw error;
  }
};

/**
 * Wrapper for localStorage.removeItem that also updates the change timestamp
 */
export const trackedRemoveItem = (key: string): void => {
  try {
    localStorage.removeItem(key);
    if (shouldTrackKey(key)) {
      updateLastChangeTimestamp();
    }
  } catch (error) {
    console.error('Error in trackedRemoveItem:', error);
    throw error;
  }
};

