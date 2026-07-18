import {
  getTopicIdFromSearchParams,
  getTopicLabel,
  resolveTopicId,
} from '@/features/vocabulary/utils/storageUtils';

export type TopicSessionReference = {
  topicId: string;
  topicLabel?: string;
  sourceTopicId?: string;
  sourceTopicLabel?: string;
  trainingSource?: string;
};

type LegacySessionReference = {
  topicId?: string;
  topicLabel?: string;
  sourceTopicId?: string;
  sourceTopicLabel?: string;
  fileName?: string;
  sourceFileName?: string;
  trainingSource?: string;
};

export const normalizeSessionTopicReference = <T extends LegacySessionReference>(
  session: T,
): (Omit<T, 'fileName' | 'sourceFileName'> & TopicSessionReference) | null => {
  const topicId = resolveTopicId(session.topicId || session.fileName);
  if (!topicId) return null;

  const sourceTopicId = resolveTopicId(
    session.sourceTopicId || session.sourceFileName,
  );
  const {
    fileName: _legacyFileName,
    sourceFileName: _legacySourceFileName,
    ...rest
  } = session;

  return {
    ...rest,
    topicId,
    topicLabel: session.topicLabel || getTopicLabel(topicId) || undefined,
    sourceTopicId: sourceTopicId || undefined,
    sourceTopicLabel:
      session.sourceTopicLabel ||
      (sourceTopicId ? getTopicLabel(sourceTopicId) : undefined),
  } as Omit<T, 'fileName' | 'sourceFileName'> & TopicSessionReference;
};

export const getTrainingTopicParams = (searchParams: URLSearchParams) => ({
  topicId: getTopicIdFromSearchParams(searchParams),
  sourceTopicId: getTopicIdFromSearchParams(
    searchParams,
    'sourceTopic',
    'sourceFile',
  ),
  trainingSource: searchParams.get('trainingSource'),
});

export const createTrainingSearchParams = (
  session: Pick<
    TopicSessionReference,
    'topicId' | 'sourceTopicId' | 'trainingSource'
  >,
): URLSearchParams => {
  const params = new URLSearchParams({ topic: session.topicId });
  if (session.sourceTopicId) params.set('sourceTopic', session.sourceTopicId);
  if (session.trainingSource) params.set('trainingSource', session.trainingSource);
  return params;
};
