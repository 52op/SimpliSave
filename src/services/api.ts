import type { CardGroup, CardGroupDetail, ImagebedConfig, ImagebedSettings, UploadTokenResponse, SiteSettings, Memo, Bookmark, PublicBookmark, User } from '../types';
import { normalizeBookmark, normalizeMemo, normalizePublicBookmark, normalizeUser, serializeTags } from '../utils/data';

// API 配置
const API_URL = import.meta.env.VITE_API_URL || '/api';
const BASE_URL = API_URL.endsWith('/') ? API_URL.slice(0, -1) : API_URL;

function getHeaders(token?: string): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

async function request<T>(method: string, path: string, body?: any, token?: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: getHeaders(token),
    body: body ? JSON.stringify(body) : undefined,
    signal,
  });
  const raw = await res.text();
  const data = raw ? JSON.parse(raw) : {};
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data.data as T;
}

export const authApi = {
  login: async (email: string, password: string) => {
    const result = await request<{ user: User; token: string }>('POST', '/auth/login', { email, password })
    return { ...result, user: normalizeUser(result.user)! }
  },
  register: async (email: string, username: string, password: string) => {
    const result = await request<{ user: User; token: string }>('POST', '/auth/register', { email, username, password })
    return { ...result, user: normalizeUser(result.user)! }
  },
  logout: (token: string) => request<void>('POST', '/auth/logout', undefined, token),
  me: async (token: string) => normalizeUser(await request<User>('GET', '/auth/me', undefined, token))!,
  updateProfile: async (token: string, data: any) => normalizeUser(await request<User>('PUT', '/auth/profile', data, token))!,
};

// 公开导航 API
export const publicBookmarkApi = {
  list: (params?: { category_id?: string; q?: string; group_id?: string }) => {
    const search = new URLSearchParams();
    if (params?.category_id) search.set('category_id', params.category_id);
    if (params?.q) search.set('q', params.q);
    if (params?.group_id) search.set('group_id', params.group_id);
    return request<PublicBookmark[]>('GET', `/public-bookmarks${search.toString() ? `?${search.toString()}` : ''}`).then((items) => items.map(normalizePublicBookmark));
  },
  create: (token: string, data: any) => request<PublicBookmark>('POST', '/public-bookmarks', { ...data, tags: serializeTags(data.tags) }, token).then(normalizePublicBookmark),
  get: (token: string, id: string) => request<PublicBookmark>('GET', `/public-bookmarks/${id}`, undefined, token).then(normalizePublicBookmark),
  getById: (token: string, id: string) => request<PublicBookmark>('GET', `/public-bookmarks/${id}`, undefined, token).then(normalizePublicBookmark),
  update: (token: string, id: string, data: any) => request<PublicBookmark>('PUT', `/public-bookmarks/${id}`, { ...data, tags: serializeTags(data.tags) }, token).then(normalizePublicBookmark),
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
    return request<Bookmark[]>('GET', `/user-bookmarks${search.toString() ? `?${search.toString()}` : ''}`, undefined, token).then((items) => items.map(normalizeBookmark));
  },
  create: (token: string, data: any) => request<Bookmark>('POST', '/user-bookmarks', { ...data, tags: serializeTags(data.tags) }, token).then(normalizeBookmark),
  get: (token: string, id: string) => request<Bookmark>('GET', `/user-bookmarks/${id}`, undefined, token).then(normalizeBookmark),
  update: (token: string, id: string, data: any) => request<Bookmark>('PUT', `/user-bookmarks/${id}`, { ...data, tags: serializeTags(data.tags) }, token).then(normalizeBookmark),
  delete: (token: string, id: string) => request<void>('DELETE', `/user-bookmarks/${id}`, undefined, token),
  export: (token: string) => fetch(`${BASE_URL}/user-bookmarks/export`, { headers: getHeaders(token) }),
  exportHtml: (token: string) => fetch(`${BASE_URL}/user-bookmarks/export-html`, { headers: getHeaders(token) }),
  previewImport: async (token: string, html: string) => {
    const res = await fetch(`${BASE_URL}/user-bookmarks/import/preview`, {
      method: 'POST',
      headers: getHeaders(token),
      body: JSON.stringify({ html }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Preview failed');
    return data.data;
  },
  importHtml: async (token: string, html: string, renameMap?: Record<string, string>) => {
    const res = await fetch(`${BASE_URL}/user-bookmarks/import`, {
      method: 'POST',
      headers: getHeaders(token),
      body: JSON.stringify({ html, rename_map: renameMap }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Import failed');
    return data.data;
  },
  batchMove: (token: string, ids: string[], targetCategoryId: string | null) =>
    request<void>('POST', '/user-bookmarks/batch-move', { ids, target_category_id: targetCategoryId }, token),
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
  list: (token: string) => request<Memo[]>('GET', '/memos', undefined, token).then((items) => items.map(normalizeMemo)),
  create: (token: string, data: any) => request<Memo>('POST', '/memos', { ...data, tags: serializeTags(data.tags) }, token).then(normalizeMemo),
  get: (token: string, id: string) => request<Memo>('GET', `/memos/${id}`, undefined, token).then(normalizeMemo),
  update: (token: string, id: string, data: any) => request<Memo>('PUT', `/memos/${id}`, { ...data, tags: serializeTags(data.tags) }, token).then(normalizeMemo),
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

async function uploadFile(token: string, path: string, body: Blob, contentType: string): Promise<any> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': contentType,
    },
    body,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `Upload failed: ${res.status}` }));
    throw new Error(err.error || err.message || `Upload failed: ${res.status}`);
  }
  return res.json();
}

export const imagebedApi = {
  listConfigs: (token: string) => request<ImagebedConfig[]>('GET', '/imagebed/configs', undefined, token),
  createConfig: (token: string, data: any) => request<ImagebedConfig>('POST', '/imagebed/configs', data, token),
  updateConfig: (token: string, id: string, data: any) => request<ImagebedConfig>('PUT', `/imagebed/configs/${id}`, data, token),
  deleteConfig: (token: string, id: string) => request<void>('DELETE', `/imagebed/configs/${id}`, undefined, token),
  toggleConfig: (token: string, id: string, enabled: number) => request<ImagebedConfig>('POST', `/imagebed/configs/${id}/toggle`, { enabled }, token),
  getSettings: (token: string) => request<ImagebedSettings>('GET', '/imagebed/settings', undefined, token),
  updateSettings: (token: string, data: any) => request<ImagebedSettings>('PUT', '/imagebed/settings', data, token),
  getUploadToken: (token: string, type: string, filename: string) => request<UploadTokenResponse>('POST', '/imagebed/upload-token', { type, filename }, token),
  upload: (token: string, file: Blob, type: string, filename: string) => uploadFile(token, `/imagebed/upload?type=${encodeURIComponent(type)}&filename=${encodeURIComponent(filename)}`, file, file.type),
  getAvailable: (token: string) => request<ImagebedConfig[]>('GET', '/imagebed/available', undefined, token),
};

export const siteSettingsApi = {
  get: () => request<SiteSettings>('GET', '/site-settings'),
  update: (token: string, data: any) => request<SiteSettings>('PUT', '/site-settings', data, token),
};

export const hotTagsApi = {
  list: () => request<string[]>('GET', '/hot-tags'),
};

export const publicMemoApi = {
  get: (id: string) => request<Memo>('GET', `/public-memos/${id}`).then(normalizeMemo),
  verifyPassword: (id: string, password: string) => request<{ verified: boolean }>('POST', `/public-memos/${id}/verify`, { password }),
};

export const publicUserApi = {
  get: (id: string) => request<any>('GET', `/public/users/${id}`),
  listMemos: (id: string) => request<any[]>('GET', `/public/users/${id}/memos`),
};
