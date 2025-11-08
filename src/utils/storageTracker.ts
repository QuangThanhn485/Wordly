/**
 * Utility to track localStorage changes by timestamp
 * This helps detect if data has changed since last backup without storing full backup data
 */

const LAST_CHANGE_TIMESTAMP_KEY = 'wordly_last_change_timestamp';

/**
 * Update the last change timestamp in localStorage
 */
export const updateLastChangeTimestamp = (): void => {
  try {
    localStorage.setItem(LAST_CHANGE_TIMESTAMP_KEY, Date.now().toString());
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

/**
 * Wrapper for localStorage.setItem that also updates the change timestamp
 */
export const trackedSetItem = (key: string, value: string): void => {
  try {
    localStorage.setItem(key, value);
    // Only track changes for wordly_ keys
    if (key.startsWith('wordly_') && key !== LAST_CHANGE_TIMESTAMP_KEY) {
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
    // Only track changes for wordly_ keys
    if (key.startsWith('wordly_') && key !== LAST_CHANGE_TIMESTAMP_KEY) {
      updateLastChangeTimestamp();
    }
  } catch (error) {
    console.error('Error in trackedRemoveItem:', error);
    throw error;
  }
};

