import api from './api';
import { downloadBlob } from '@/utils/download';

const getFileName = (fileUrl: string) => fileUrl.split('/').pop() || 'fichier';

const getApiPath = (fileUrl: string) => {
  if (fileUrl.startsWith('/api/')) return fileUrl.slice(4);
  return fileUrl;
};

export const fileService = {
  getObjectUrl: async (fileUrl: string): Promise<string> => {
    const response = await api.get<Blob>(getApiPath(fileUrl), {
      responseType: 'blob',
    });
    return window.URL.createObjectURL(response.data);
  },

  download: async (fileUrl: string): Promise<void> => {
    const response = await api.get<Blob>(getApiPath(fileUrl), {
      responseType: 'blob',
    });

    downloadBlob(response.data, getFileName(fileUrl));
  },
};
