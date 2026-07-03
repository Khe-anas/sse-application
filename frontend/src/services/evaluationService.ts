import api from './api';
import type { Evaluation, PageResponse, StatusEvaluation, Reponse } from '@/types';

export const evaluationService = {
  getAll: async (params?: { status?: StatusEvaluation; organismeId?: string; year?: number; page?: number; size?: number; _ts?: number }): Promise<PageResponse<Evaluation>> => {
    const response = await api.get<PageResponse<Evaluation>>('/evaluations', { params });
    return response.data;
  },

  getById: async (id: string): Promise<Evaluation> => {
    const response = await api.get<Evaluation>(`/evaluations/${id}`);
    return response.data;
  },

  create: async (data: { organismeId: string; year: number; comments?: string }): Promise<Evaluation> => {
    const response = await api.post<Evaluation>('/evaluations', data);
    return response.data;
  },

  submit: async (id: string): Promise<Evaluation> => {
    const response = await api.put<Evaluation>(`/evaluations/${id}/submit`);
    return response.data;
  },

  claimValidation: async (id: string): Promise<Evaluation> => {
    const response = await api.put<Evaluation>(`/evaluations/${id}/claim-validation`);
    return response.data;
  },

  releaseValidation: async (id: string): Promise<void> => {
    await api.put(`/evaluations/${id}/release-validation`);
  },

  validate: async (id: string, comments?: string): Promise<Evaluation> => {
    const response = await api.put<Evaluation>(`/evaluations/${id}/validate`, { comments });
    return response.data;
  },

  reject: async (id: string, reason: string): Promise<Evaluation> => {
    const response = await api.put<Evaluation>(`/evaluations/${id}/reject`, { reason });
    return response.data;
  },

  requestCorrection: async (id: string, reason: string): Promise<Evaluation> => {
    const response = await api.put<Evaluation>(`/evaluations/${id}/request-correction`, { reason });
    return response.data;
  },
};

export const reponseService = {
  getByEvaluation: async (evaluationId: string, principeId?: string): Promise<Reponse[]> => {
    const response = await api.get<Reponse[]>(`/reponses/evaluation/${evaluationId}`, {
      params: principeId ? { principeId } : undefined,
    });
    return response.data;
  },

  saveBatch: async (evaluationId: string, reponses: { critereId: string; niveau?: string; commentaire?: string; preuveLinks?: string[]; correctionAddressed?: boolean }[]): Promise<Reponse[]> => {
    const response = await api.post<Reponse[]>(`/reponses/evaluation/${evaluationId}`, { reponses });
    return response.data;
  },

  uploadProof: async (reponseId: string, file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post<string>(`/reponses/${reponseId}/upload`, formData);
    return response.data;
  },

  deleteProof: async (reponseId: string, fileUrl: string): Promise<void> => {
    const filename = fileUrl.split('/').pop();
    if (!filename) return;
    await api.delete(`/reponses/${reponseId}/files/${encodeURIComponent(filename)}`);
  },
};
