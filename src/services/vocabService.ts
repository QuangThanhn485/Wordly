import { get, post, put, del } from './api';
import type { PaginatedResponse } from '@/types';
import type { VocabItem, FolderNode } from '@/features/vocabulary/types';

// ===== Vocabulary API Endpoints =====

export type CreateVocabRequest = Omit<VocabItem, 'id'>;
export type UpdateVocabRequest = Partial<VocabItem>;

export type VocabListParams = {
  page?: number;
  limit?: number;
  search?: string;
  type?: string;
  folderId?: string;
};

/**
 * Get all vocabulary items
 */
export const getVocabularyList = async (
  params?: VocabListParams
): Promise<PaginatedResponse<VocabItem>> => {
  return await get<PaginatedResponse<VocabItem>>('/vocabulary', { params });
};

/**
 * Get vocabulary by ID
 */
export const getVocabularyById = async (id: string): Promise<VocabItem> => {
  return await get<VocabItem>(`/vocabulary/${id}`);
};

/**
 * Create new vocabulary
 */
export const createVocabulary = async (data: CreateVocabRequest): Promise<VocabItem> => {
  return await post<VocabItem>('/vocabulary', data);
};

/**
 * Update vocabulary
 */
export const updateVocabulary = async (id: string, data: UpdateVocabRequest): Promise<VocabItem> => {
  return await put<VocabItem>(`/vocabulary/${id}`, data);
};

/**
 * Delete vocabulary
 */
export const deleteVocabulary = async (id: string): Promise<void> => {
  return await del<void>(`/vocabulary/${id}`);
};

/**
 * Get folder tree
 */
export const getFolderTree = async (): Promise<FolderNode> => {
  return await get<FolderNode>('/vocabulary/folders');
};

/**
 * Import vocabulary from file
 */
export const importVocabulary = async (file: File, folderId?: string): Promise<VocabItem[]> => {
  const formData = new FormData();
  formData.append('file', file);
  if (folderId) formData.append('folderId', folderId);

  return await post<VocabItem[]>('/vocabulary/import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

/**
 * Export vocabulary to file
 */
export const exportVocabulary = async (fileId: string): Promise<Blob> => {
  return await get<Blob>(`/vocabulary/export/${fileId}`, {
    responseType: 'blob',
  });
};

// Export as default
export default {
  getVocabularyList,
  getVocabularyById,
  createVocabulary,
  updateVocabulary,
  deleteVocabulary,
  getFolderTree,
  importVocabulary,
  exportVocabulary,
};

