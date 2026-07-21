import api from './api';
import { downloadBlob, filenameFromContentDisposition } from '@/utils/download';

const downloadReport = async (url: string, fallbackFilename: string) => {
  const response = await api.get<Blob>(url, { responseType: 'blob' });
  downloadBlob(
    response.data,
    filenameFromContentDisposition(response.headers['content-disposition'], fallbackFilename)
  );
};

export const reportService = {
  downloadPdf: (evaluationId: string) =>
    downloadReport(`/reports/${evaluationId}/pdf`, `evaluation-${evaluationId}.pdf`),

  downloadExcel: (evaluationId: string) =>
    downloadReport(`/reports/${evaluationId}/excel`, `evaluation-${evaluationId}.xlsx`),
};
