import api from './api';
import type { DashboardKPIs, RankingItem, GapAnalysisItem } from '@/types';

export interface GlobalScoreDTO {
  id: string;
  organismeId: string;
  year: number;
  score: number;
  maturityLevel: string;
  rank?: number;
}

export const dashboardService = {
  getKPIs: async (): Promise<DashboardKPIs> => {
    const response = await api.get<DashboardKPIs>('/dashboard/global');
    return response.data;
  },

  getRanking: async (year?: number, type?: string): Promise<RankingItem[]> => {
    const response = await api.get<RankingItem[]>('/dashboard/ranking', { params: { year, type } });
    return response.data;
  },

  getGapAnalysis: async (organismeId: string, year?: number): Promise<GapAnalysisItem[]> => {
    const response = await api.get<GapAnalysisItem[]>('/dashboard/gap-analysis', { params: { organismeId, year } });
    return response.data;
  },

  getEvolution: async (organismeId: string): Promise<GlobalScoreDTO[]> => {
    const response = await api.get<GlobalScoreDTO[]>('/dashboard/evolution', { params: { organismeId } });
    return response.data;
  },
};
