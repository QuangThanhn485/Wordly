// Icon + theme-palette accent for each training mode. Localized mode names come
// from the shared result helper, so this only owns the visual identity.
import { BookOpen, Headphones, Edit, Mic, Sparkles, RotateCcw, type LucideIcon } from 'lucide-react';
import type { TrainingHistoryKind } from '@/features/train/utils/trainingHistory';

export type ModePaletteKey = 'primary' | 'info' | 'success' | 'warning';

export type ModeMeta = {
  Icon: LucideIcon;
  palette: ModePaletteKey;
};

const MODE_META: Record<string, ModeMeta> = {
  'flashcards-reading': { Icon: BookOpen, palette: 'primary' },
  'flashcards-listening': { Icon: Headphones, palette: 'info' },
  'read-write': { Icon: Edit, palette: 'success' },
  'listen-write': { Icon: Mic, palette: 'warning' },
};

export const getModeMeta = (mode: string): ModeMeta =>
  MODE_META[mode] ?? { Icon: BookOpen, palette: 'primary' };

export const TRAINING_MODES: string[] = [
  'flashcards-reading',
  'flashcards-listening',
  'read-write',
  'listen-write',
];

export type KindMeta = {
  Icon: LucideIcon;
  palette: ModePaletteKey;
  labelKey: string;
};

/** Visual identity for a "new" (first learned) vs "review" (learned before) run. */
export const getKindMeta = (kind: TrainingHistoryKind): KindMeta =>
  kind === 'review'
    ? { Icon: RotateCcw, palette: 'info', labelKey: 'session.review' }
    : { Icon: Sparkles, palette: 'success', labelKey: 'session.new' };
