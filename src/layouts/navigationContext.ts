import { loadTrainingSession as loadReadingSession } from '@/features/train/train-start/sessionStorage';
import { loadTrainingSession as loadListeningSession } from '@/features/train/train-listen/sessionStorage';
import { loadTrainingSession as loadReadWriteSession } from '@/features/train/train-read-write/sessionStorage';
import { loadTrainingSession as loadListenWriteSession } from '@/features/train/train-listen-write/sessionStorage';
import { getTopicLabel } from '@/features/vocabulary/utils/storageUtils';

type StoredTrainingSession = {
  topicId: string;
  sourceTopicId?: string;
  topicLabel?: string;
  sourceTopicLabel?: string;
  timestamp?: number;
};

export type TrainingContext = {
  topicId: string | null;
  label: string | null;
};

const getSessionTopicLabel = (
  session: StoredTrainingSession | null,
): string | null => {
  if (!session) return null;
  return (
    session.sourceTopicLabel ||
    session.topicLabel ||
    getTopicLabel(session.sourceTopicId || session.topicId) ||
    null
  );
};

export const getStoredTrainingContext = (pathname: string): TrainingContext => {
  const sessions = {
    reading: loadReadingSession() as StoredTrainingSession | null,
    listening: loadListeningSession() as StoredTrainingSession | null,
    readWrite: loadReadWriteSession() as StoredTrainingSession | null,
    listenWrite: loadListenWriteSession() as StoredTrainingSession | null,
  };

  let current: StoredTrainingSession | null = null;
  if (pathname.startsWith('/train/flashcards-reading')) {
    current = sessions.reading;
  } else if (pathname.startsWith('/train/flashcards-listening')) {
    current = sessions.listening;
  } else if (pathname.startsWith('/train/read-write')) {
    current = sessions.readWrite;
  } else if (pathname.startsWith('/train/listen-write')) {
    current = sessions.listenWrite;
  }

  if (!current) {
    current =
      Object.values(sessions)
        .filter((session): session is StoredTrainingSession => Boolean(session))
        .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))[0] || null;
  }

  return {
    topicId: current?.topicId || null,
    label: getSessionTopicLabel(current),
  };
};
