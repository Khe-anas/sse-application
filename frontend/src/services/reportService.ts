import api from './api';

const getFilename = (contentDisposition: string | undefined, fallback: string) => {
  const match = contentDisposition?.match(/filename="?([^"]+)"?/i);
  return match?.[1] || fallback;
};

const downloadReport = async (url: string, fallbackFilename: string) => {
  const response = await api.get<Blob>(url, { responseType: 'blob' });
  const downloadUrl = window.URL.createObjectURL(response.data);
  const link = document.createElement('a');
  link.href = downloadUrl;
  link.download = getFilename(response.headers['content-disposition'], fallbackFilename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(downloadUrl);
};

export const reportService = {
  downloadPdf: (evaluationId: string) =>
    downloadReport(`/reports/${evaluationId}/pdf`, `evaluation-${evaluationId}.pdf`),

  downloadExcel: (evaluationId: string) =>
    downloadReport(`/reports/${evaluationId}/excel`, `evaluation-${evaluationId}.xlsx`),
};
