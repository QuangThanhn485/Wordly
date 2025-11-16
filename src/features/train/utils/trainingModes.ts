/**
 * Training modes navigation utility
 * Manages the order and navigation between training modes
 */

export type TrainingMode = 
  | 'flashcards-reading'
  | 'flashcards-listening'
  | 'read-write'
  | 'listen-write';

// Define the order of training modes
const TRAINING_MODE_ORDER: TrainingMode[] = [
  'flashcards-reading',
  'flashcards-listening',
  'read-write',
  'listen-write',
];

/**
 * Get the next training mode in sequence
 * @param currentMode - The current training mode
 * @returns The next training mode, or null if this is the last mode
 */
export function getNextTrainingMode(currentMode: TrainingMode): TrainingMode | null {
  const currentIndex = TRAINING_MODE_ORDER.indexOf(currentMode);
  
  if (currentIndex === -1) {
    console.error(`Unknown training mode: ${currentMode}`);
    return null;
  }
  
  // If this is the last mode, return null
  if (currentIndex === TRAINING_MODE_ORDER.length - 1) {
    return null;
  }
  
  return TRAINING_MODE_ORDER[currentIndex + 1];
}

/**
 * Check if a training mode has a next mode
 * @param currentMode - The current training mode
 * @returns True if there is a next mode, false otherwise
 */
export function hasNextTrainingMode(currentMode: TrainingMode): boolean {
  return getNextTrainingMode(currentMode) !== null;
}

/**
 * Build the URL for a training mode with optional file parameter
 * @param mode - The training mode
 * @param fileName - Optional file name to include in the URL
 * @returns The complete URL path
 */
export function getTrainingModeUrl(mode: TrainingMode, fileName?: string): string {
  const basePath = `/train/${mode}`;
  
  if (fileName) {
    return `${basePath}?file=${encodeURIComponent(fileName)}`;
  }
  
  return basePath;
}

