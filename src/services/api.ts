// API 配置
// 开发环境使用相对路径（代理到本地 Workers）
// 生产环境使用 Workers URL
// 自动去掉结尾的 / 避免请求失败
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
  login: (email: string, password: string) => request<{user: any, token: string}>('POST', '/auth/login', {email, password}),
  register: (email: string, username: string, password: string) => request<{user: any, token: string}>('POST', '/auth/register', {email, username, password}),
  logout: (token: string) => request<void>('POST', '/auth/logout', undefined, token),
  me: (token: string) => request<any>('GET', '/auth/me', undefined, token),
  updateProfile: (token: string, data: any) => request<any>('PUT', '/auth/profile', data, token),
};

export const bookmarkApi = {
  list: (token: string) => request<any[]>('GET', '/bookmarks', undefined, token),
  listPublic: () => request<any[]>('GET', '/bookmarks?public=1'),
  create: (token: string, data: any) => request<any>('POST', '/bookmarks', data, token),
  get: (token: string, id: string) => request<any>('GET', `/bookmarks/${id}`, undefined, token),
  update: (token: string, id: string, data: any) => request<any>('PUT', `/bookmarks/${id}`, data, token),
  delete: (token: string, id: string) => request<void>('DELETE', `/bookmarks/${id}`, undefined, token),
  search: (token: string, q: string) => request<any[]>('GET', `/bookmarks/search?q=${encodeURIComponent(q)}`, undefined, token),
};

export const categoryApi = {
  list: (token: string, type?: string) => request<any[]>('GET', `/categories${type ? `?type=${type}` : ''}`, undefined, token),
  create: (token: string, data: any) => request<any>('POST', '/categories', data, token),
  update: (token: string, id: string, data: any) => request<any>('PUT', `/categories/${id}`, data, token),
  delete: (token: string, id: string) => request<void>('DELETE', `/categories/${id}`, undefined, token),
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
  approve: (token: string, id: string) => request<any>('PUT', `/submissions/${id}/approve`, undefined, token),
  reject: (token: string, id: string, note?: string) => request<any>('PUT', `/submissions/${id}/reject`, { admin_note: note }, token),
};

export const fetchMetaApi = {
  fetch: (url: string) => request<any>('GET', `/fetch-meta?url=${encodeURIComponent(url)}`),
};
