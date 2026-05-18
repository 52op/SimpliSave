import type { CardGroup, CardGroupDetail, ImagebedConfig, ImagebedSettings, UploadTokenResponse, SiteSettings } from '../types';

// API 配置
const API_URL = import.meta.env.VITE_API_URL || '/api';
const BASE_URL = API_URL.endsWith('/') ? API_URL.slice(0, -1) : API_URL;

function getHeaders(token?: string): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

async function request<T>(method: string, path: string, body?: any, token?: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: getHeaders(token),
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data.data as T;
}

export const authApi = {
  login: (email: string, password: string) => request<{ user: any; token: string }>('POST', '/auth/login', { email, password }),
  register: (email: string, username: string, password: string) => request<{ user: any; token: string }>('POST', '/auth/register', { email, username, password }),
  logout: (token: string) => request<void>('POST', '/auth/logout', undefined, token),
  me: (token: string) => request<any>('GET', '/auth/me', undefined, token),
  updateProfile: (token: string, data: any) => request<any>('PUT', '/auth/profile', data, token),
};

// 公开导航 API
export const publicBookmarkApi = {
  list: (params?: { category_id?: string; q?: string; group_id?: string }) => {
    const search = new URLSearchParams();
    if (params?.category_id) search.set('category_id', params.category_id);
    if (params?.q) search.set('q', params.q);
    if (params?.group_id) search.set('group_id', params.group_id);
    return request<any[]>('GET', `/public-bookmarks${search.toString() ? `?${search.toString()}` : ''}`);
  },
  create: (token: string, data: any) => request<any>('POST', '/public-bookmarks', data, token),
  get: (token: string, id: string) => request<any>('GET', `/public-bookmarks/${id}`, undefined, token),
  getById: (token: string, id: string) => request<any>('GET', `/public-bookmarks/${id}`, undefined, token),
  update: (token: string, id: string, data: any) => request<any>('PUT', `/public-bookmarks/${id}`, data, token),
  delete: (token: string, id: string) => request<void>('DELETE', `/public-bookmarks/${id}`, undefined, token),
};

// 卡片组 API
export const cardGroupApi = {
  list: (params?: { category_id?: string }) => {
    const search = new URLSearchParams();
    if (params?.category_id) search.set('category_id', params.category_id);
    return request<CardGroup[]>('GET', `/card-groups${search.toString() ? `?${search.toString()}` : ''}`);
  },
  getBySlug: (slug: string) => request<CardGroupDetail>('GET', `/card-groups/by-slug/${encodeURIComponent(slug)}`),
  create: (token: string, data: any) => request<CardGroup>('POST', '/card-groups', data, token),
  update: (token: string, id: string, data: any) => request<CardGroup>('PUT', `/card-groups/${id}`, data, token),
  delete: (token: string, id: string) => request<void>('DELETE', `/card-groups/${id}`, undefined, token),
  visit: (id: string) => request<void>('POST', `/card-groups/${id}/visit`),
};

// 私有收藏夹 API
export const userBookmarkApi = {
  list: (token: string, params?: { category_id?: string; q?: string; favorites?: boolean; archived?: boolean }) => {
    const search = new URLSearchParams();
    if (params?.category_id) search.set('category_id', params.category_id);
    if (params?.q) search.set('q', params.q);
    if (params?.favorites) search.set('favorites', '1');
    if (params?.archived) search.set('archived', '1');
    return request<any[]>('GET', `/user-bookmarks${search.toString() ? `?${search.toString()}` : ''}`, undefined, token);
  },
  create: (token: string, data: any) => request<any>('POST', '/user-bookmarks', data, token),
  get: (token: string, id: string) => request<any>('GET', `/user-bookmarks/${id}`, undefined, token),
  update: (token: string, id: string, data: any) => request<any>('PUT', `/user-bookmarks/${id}`, data, token),
  delete: (token: string, id: string) => request<void>('DELETE', `/user-bookmarks/${id}`, undefined, token),
  export: (token: string) => fetch(`${BASE_URL}/user-bookmarks/export`, { headers: getHeaders(token) }),
  exportHtml: (token: string) => fetch(`${BASE_URL}/user-bookmarks/export-html`, { headers: getHeaders(token) }),
  importHtml: async (token: string, html: string) => {
    const res = await fetch(`${BASE_URL}/user-bookmarks/import`, {
      method: 'POST',
      headers: getHeaders(token),
      body: JSON.stringify({ html }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Import failed');
    return data.data;
  },
};

export const publicCategoryApi = {
  list: () => request<any[]>('GET', '/public-categories'),
  create: (token: string, data: any) => request<any>('POST', '/public-categories', data, token),
  update: (token: string, id: string, data: any) => request<any>('PUT', `/public-categories/${id}`, data, token),
  delete: (token: string, id: string) => request<void>('DELETE', `/public-categories/${id}`, undefined, token),
};

export const userCategoryApi = {
  list: (token: string) => request<any[]>('GET', '/user-categories', undefined, token),
  create: (token: string, data: any) => request<any>('POST', '/user-categories', data, token),
  update: (token: string, id: string, data: any) => request<any>('PUT', `/user-categories/${id}`, data, token),
  delete: (token: string, id: string) => request<void>('DELETE', `/user-categories/${id}`, undefined, token),
};

export const memoApi = {
  list: (token: string) => request<any[]>('GET', '/memos', undefined, token),
  create: (token: string, data: any) => request<any>('POST', '/memos', data, token),
  get: (token: string, id: string) => request<any>('GET', `/memos/${id}`, undefined, token),
  update: (token: string, id: string, data: any) => request<any>('PUT', `/memos/${id}`, data, token),
  delete: (token: string, id: string) => request<void>('DELETE', `/memos/${id}`, undefined, token),
  pin: (token: string, id: string) => request<any>('POST', `/memos/${id}/pin`, undefined, token),
};

export const tagApi = {
  list: (token: string, type?: string) => request<any[]>('GET', `/tags${type ? `?type=${type}` : ''}`, undefined, token),
  create: (token: string, data: any) => request<any>('POST', '/tags', data, token),
  delete: (token: string, id: string) => request<void>('DELETE', `/tags/${id}`, undefined, token),
};

export const submissionApi = {
  list: (token: string, status?: string) => request<any[]>('GET', `/submissions${status ? `?status=${status}` : ''}`, undefined, token),
  create: (token: string, data: any) => request<any>('POST', '/submissions', data, token),
  approve: (token: string, id: string, targetGroupId?: string) => request<any>('PUT', `/submissions/${id}/approve`, targetGroupId ? { target_group_id: targetGroupId } : undefined, token),
  reject: (token: string, id: string, note?: string) => request<any>('PUT', `/submissions/${id}/reject`, { admin_note: note }, token),
};

export const searchEngineApi = {
  list: (activeOnly?: boolean) => {
    const search = activeOnly ? '?active_only=1' : '';
    return request<any[]>('GET', `/search-engines${search}`);
  },
  create: (token: string, data: any) => request<any>('POST', '/search-engines', data, token),
  update: (token: string, id: string, data: any) => request<any>('PUT', `/search-engines/${id}`, data, token),
  delete: (token: string, id: string) => request<void>('DELETE', `/search-engines/${id}`, undefined, token),
};

export const fetchMetaApi = {
  fetch: (url: string) => request<any>('GET', `/fetch-meta?url=${encodeURIComponent(url)}`),
};

export const imagebedApi = {
  listConfigs: (token: string) => request<ImagebedConfig[]>('GET', '/imagebed/configs', undefined, token),
  createConfig: (token: string, data: any) => request<ImagebedConfig>('POST', '/imagebed/configs', data, token),
  updateConfig: (token: string, id: string, data: any) => request<ImagebedConfig>('PUT', `/imagebed/configs/${id}`, data, token),
  deleteConfig: (token: string, id: string) => request<void>('DELETE', `/imagebed/configs/${id}`, undefined, token),
  toggleConfig: (token: string, id: string, enabled: number) => request<ImagebedConfig>('POST', `/imagebed/configs/${id}/toggle`, { enabled }, token),
  getSettings: (token: string) => request<ImagebedSettings>('GET', '/imagebed/settings', undefined, token),
  updateSettings: (token: string, data: any) => request<ImagebedSettings>('PUT', '/imagebed/settings', data, token),
  getUploadToken: (token: string, type: string, filename: string) => request<UploadTokenResponse>('POST', '/imagebed/upload-token', { type, filename }, token),
  getAvailable: (token: string) => request<ImagebedConfig[]>('GET', '/imagebed/available', undefined, token),
};

export const siteSettingsApi = {
  get: () => request<SiteSettings>('GET', '/site-settings'),
  update: (token: string, data: any) => request<SiteSettings>('PUT', '/site-settings', data, token),
};

export const hotTagsApi = {
  list: () => request<string[]>('GET', '/hot-tags'),
};
