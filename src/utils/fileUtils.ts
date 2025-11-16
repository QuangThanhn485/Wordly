/**
 * File utilities
 */

/**
 * Remove .txt extension from filename
 * @param filename - The filename with or without extension
 * @returns The filename without .txt extension
 */
export const removeFileExtension = (filename: string | null | undefined): string => {
  if (!filename) return '';
  return filename.replace(/\.txt$/i, '');
};

/**
 * Get display name for a file (removes .txt extension)
 * @param filename - The filename
 * @returns Display-friendly filename without extension
 */
export const getDisplayFileName = (filename: string): string => {
  return removeFileExtension(filename);
};

