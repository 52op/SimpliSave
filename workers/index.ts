// Cloudflare Worker entry point
import { corsHeaders, handleCors } from './utils/response';
import { handleRegister, handleLogin, handleLogout, handleGetMe, handleUpdateProfile } from './api/auth';
import {
  handleListPublicBookmarks, handleCreatePublicBookmark, handleGetPublicBookmark,
  handleUpdatePublicBookmark, handleDeletePublicBookmark
} from './api/publicBookmarks';
import {
  handleListUserBookmarks, handleCreateUserBookmark, handleGetUserBookmark,
  handleUpdateUserBookmark, handleDeleteUserBookmark, handleExportUserBookmarks
} from './api/userBookmarks';
import { handleImportUserBookmarks, handleExportUserBookmarksHtml } from './api/importExport';
import {
  handleListUserCategories, handleCreateUserCategory, handleUpdateUserCategory, handleDeleteUserCategory,
  handleListPublicCategories, handleCreatePublicCategory, handleUpdatePublicCategory, handleDeletePublicCategory
} from './api/categories';
import { handleCreateSubmission, handleListSubmissions, handleApproveSubmission, handleRejectSubmission } from './api/submissions';
import { handleFetchMeta } from './api/fetchMeta';
import { handleListMemos, handleCreateMemo, handleGetMemo, handleUpdateMemo, handleDeleteMemo, handlePinMemo } from './api/memos';
import { handleListTags, handleCreateTag, handleDeleteTag } from './api/tags';

interface Env {
  DB: D1Database;
  JWT_SECRET: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const corsResponse = handleCors(request);
    if (corsResponse) return corsResponse;

    const url = new URL(request.url);
    const path = url.pathname.replace(/^\/api/, '');

    if (path.startsWith('/auth')) return handleAuth(request, env, path);
    if (path.startsWith('/public-bookmarks')) return handlePublicBookmarks(request, env, path);
    if (path.startsWith('/user-bookmarks')) return handleUserBookmarks(request, env, path);
    if (path.startsWith('/public-categories')) return handlePublicCategories(request, env, path);
    if (path.startsWith('/user-categories')) return handleUserCategories(request, env, path);
    if (path.startsWith('/submissions')) return handleSubmissions(request, env, path);
    if (path.startsWith('/fetch-meta')) return handleFetchMeta(request, env);
    if (path.startsWith('/memos')) return handleMemos(request, env, path);
    if (path.startsWith('/tags')) return handleTags(request, env, path);

    return new Response('Not Found', { status: 404, headers: corsHeaders() });
  }
};

async function handleAuth(request: Request, env: Env, path: string): Promise<Response> {
  switch (path) {
    case '/auth/register': return handleRegister(request, env);
    case '/auth/login': return handleLogin(request, env);
    case '/auth/logout': return handleLogout(request, env);
    case '/auth/me': return handleGetMe(request, env);
    case '/auth/profile': return handleUpdateProfile(request, env);
    default: return new Response('Not Found', { status: 404, headers: corsHeaders() });
  }
}

async function handlePublicBookmarks(request: Request, env: Env, path: string): Promise<Response> {
  const id = path.match(/^\/public-bookmarks\/([^\/]+)$/)?.[1];

  switch (request.method) {
    case 'GET':
      if (id) return handleGetPublicBookmark(request, env, id);
      return handleListPublicBookmarks(request, env);
    case 'POST':
      return handleCreatePublicBookmark(request, env);
    case 'PUT':
      if (!id) return new Response('Bad Request', { status: 400, headers: corsHeaders() });
      return handleUpdatePublicBookmark(request, env, id);
    case 'DELETE':
      if (!id) return new Response('Bad Request', { status: 400, headers: corsHeaders() });
      return handleDeletePublicBookmark(request, env, id);
    default:
      return new Response('Method Not Allowed', { status: 405, headers: corsHeaders() });
  }
}

async function handleUserBookmarks(request: Request, env: Env, path: string): Promise<Response> {
  const id = path.match(/^\/user-bookmarks\/([^\/]+)$/)?.[1];

  if (path === '/user-bookmarks/export') {
    return handleExportUserBookmarks(request, env);
  }
  if (path === '/user-bookmarks/export-html') {
    return handleExportUserBookmarksHtml(request, env);
  }
  if (path === '/user-bookmarks/import' && request.method === 'POST') {
    return handleImportUserBookmarks(request, env);
  }

  switch (request.method) {
    case 'GET':
      if (id) return handleGetUserBookmark(request, env, id);
      return handleListUserBookmarks(request, env);
    case 'POST':
      return handleCreateUserBookmark(request, env);
    case 'PUT':
      if (!id) return new Response('Bad Request', { status: 400, headers: corsHeaders() });
      return handleUpdateUserBookmark(request, env, id);
    case 'DELETE':
      if (!id) return new Response('Bad Request', { status: 400, headers: corsHeaders() });
      return handleDeleteUserBookmark(request, env, id);
    default:
      return new Response('Method Not Allowed', { status: 405, headers: corsHeaders() });
  }
}

async function handlePublicCategories(request: Request, env: Env, path: string): Promise<Response> {
  const id = path.match(/^\/public-categories\/([^\/]+)$/)?.[1];

  switch (request.method) {
    case 'GET':
      return handleListPublicCategories(request, env);
    case 'POST':
      return handleCreatePublicCategory(request, env);
    case 'PUT':
      if (!id) return new Response('Bad Request', { status: 400, headers: corsHeaders() });
      return handleUpdatePublicCategory(request, env, id);
    case 'DELETE':
      if (!id) return new Response('Bad Request', { status: 400, headers: corsHeaders() });
      return handleDeletePublicCategory(request, env, id);
    default:
      return new Response('Method Not Allowed', { status: 405, headers: corsHeaders() });
  }
}

async function handleUserCategories(request: Request, env: Env, path: string): Promise<Response> {
  const id = path.match(/^\/user-categories\/([^\/]+)$/)?.[1];

  switch (request.method) {
    case 'GET':
      return handleListUserCategories(request, env);
    case 'POST':
      return handleCreateUserCategory(request, env);
    case 'PUT':
      if (!id) return new Response('Bad Request', { status: 400, headers: corsHeaders() });
      return handleUpdateUserCategory(request, env, id);
    case 'DELETE':
      if (!id) return new Response('Bad Request', { status: 400, headers: corsHeaders() });
      return handleDeleteUserCategory(request, env, id);
    default:
      return new Response('Method Not Allowed', { status: 405, headers: corsHeaders() });
  }
}

async function handleSubmissions(request: Request, env: Env, path: string): Promise<Response> {
  const approveMatch = path.match(/^\/submissions\/([^\/]+)\/approve$/);
  const rejectMatch = path.match(/^\/submissions\/([^\/]+)\/reject$/);

  if (approveMatch) return handleApproveSubmission(request, env, approveMatch[1]);
  if (rejectMatch) return handleRejectSubmission(request, env, rejectMatch[1]);

  switch (request.method) {
    case 'GET':
      return handleListSubmissions(request, env);
    case 'POST':
      return handleCreateSubmission(request, env);
    default:
      return new Response('Method Not Allowed', { status: 405, headers: corsHeaders() });
  }
}

async function handleMemos(request: Request, env: Env, path: string): Promise<Response> {
  const id = path.match(/^\/memos\/([^\/]+)$/)?.[1];
  const pinMatch = path.match(/^\/memos\/([^\/]+)\/pin$/);

  if (pinMatch) return handlePinMemo(request, env, pinMatch[1]);

  switch (request.method) {
    case 'GET':
      if (id) return handleGetMemo(request, env, id);
      return handleListMemos(request, env);
    case 'POST':
      return handleCreateMemo(request, env);
    case 'PUT':
      if (!id) return new Response('Bad Request', { status: 400, headers: corsHeaders() });
      return handleUpdateMemo(request, env, id);
    case 'DELETE':
      if (!id) return new Response('Bad Request', { status: 400, headers: corsHeaders() });
      return handleDeleteMemo(request, env, id);
    default:
      return new Response('Method Not Allowed', { status: 405, headers: corsHeaders() });
  }
}

async function handleTags(request: Request, env: Env, path: string): Promise<Response> {
  const id = path.match(/^\/tags\/([^\/]+)$/)?.[1];

  switch (request.method) {
    case 'GET':
      return handleListTags(request, env);
    case 'POST':
      return handleCreateTag(request, env);
    case 'DELETE':
      if (!id) return new Response('Bad Request', { status: 400, headers: corsHeaders() });
      return handleDeleteTag(request, env, id);
    default:
      return new Response('Method Not Allowed', { status: 405, headers: corsHeaders() });
  }
}
