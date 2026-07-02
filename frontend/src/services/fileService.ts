import api from './api';

const getFileName = (fileUrl: string) => fileUrl.split('/').pop() || 'fichier';

const getApiPath = (fileUrl: string) => {
  if (fileUrl.startsWith('/api/')) return fileUrl.slice(4);
  return fileUrl;
};

export const fileService = {
  download: async (fileUrl: string): Promise<void> => {
    const response = await api.get<Blob>(getApiPath(fileUrl), {
      responseType: 'blob',
    });

    const downloadUrl = window.URL.createObjectURL(response.data);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = getFileName(fileUrl);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(downloadUrl);
  },
};
