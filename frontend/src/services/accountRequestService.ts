import api from './api';
import type { AccountRequest, AccountRequestStatus, PageResponse, TypeOrganisme, User } from '@/types';

export interface AccountRequestSubmitForm {
  companyName: string;
  type: TypeOrganisme;
  responsibleFirstName: string;
  responsibleLastName: string;
  companyEmail: string;
  phone?: string;
  fax?: string;
  address?: string;
  sector?: string;
  otherSector?: string;
  companyRole: string;
  position: string;
  logo?: File;
}

export interface ApproveAccountRequestResponse {
  request: AccountRequest;
  user: User;
  emailJobId?: string;
  activationExpiresAt?: string;
}

export const accountRequestService = {
  submit: async (data: AccountRequestSubmitForm): Promise<AccountRequest> => {
    const formData = new FormData();
    formData.append('companyName', data.companyName);
    formData.append('type', data.type);
    formData.append('responsibleFirstName', data.responsibleFirstName);
    formData.append('responsibleLastName', data.responsibleLastName);
    formData.append('companyEmail', data.companyEmail);

    if (data.phone) formData.append('phone', data.phone);
    if (data.fax) formData.append('fax', data.fax);
    if (data.address) formData.append('address', data.address);
    if (data.sector) formData.append('sector', data.sector);
    if (data.sector === 'OTHER' && data.otherSector) formData.append('otherSector', data.otherSector);
    formData.append('companyRole', data.companyRole);
    formData.append('position', data.position);
    if (data.logo) formData.append('logo', data.logo);

    const response = await api.post<AccountRequest>('/account-requests', formData);
    return response.data;
  },

  getAll: async (params?: {
    status?: AccountRequestStatus;
    search?: string;
    page?: number;
    size?: number;
  }): Promise<PageResponse<AccountRequest>> => {
    const response = await api.get<PageResponse<AccountRequest>>('/admin/account-requests', { params });
    return response.data;
  },

  getById: async (id: string): Promise<AccountRequest> => {
    const response = await api.get<AccountRequest>(`/admin/account-requests/${id}`);
    return response.data;
  },

  claim: async (id: string): Promise<AccountRequest> => {
    const response = await api.put<AccountRequest>(`/admin/account-requests/${id}/claim`);
    return response.data;
  },

  approve: async (
    id: string,
    data: { adminComment?: string }
  ): Promise<ApproveAccountRequestResponse> => {
    const response = await api.put<ApproveAccountRequestResponse>(`/admin/account-requests/${id}/approve`, data);
    return response.data;
  },

  reject: async (id: string, data: { adminComment: string }): Promise<AccountRequest> => {
    const response = await api.put<AccountRequest>(`/admin/account-requests/${id}/reject`, data);
    return response.data;
  },
};
