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
import {
  handleListSearchEngines, handleCreateSearchEngine,
  handleUpdateSearchEngine, handleDeleteSearchEngine
} from './api/searchEngines';
import { handleListMemos, handleCreateMemo, handleGetMemo, handleUpdateMemo, handleDeleteMemo, handlePinMemo } from './api/memos';
import { handleListTags, handleCreateTag, handleDeleteTag } from './api/tags';
import {
  handleListCardGroups, handleGetCardGroupBySlug, handleCreateCardGroup,
  handleUpdateCardGroup, handleDeleteCardGroup, handleVisitCardGroup
} from './api/cardGroups';
import {
  handleListImagebedConfigs, handleCreateImagebedConfig, handleUpdateImagebedConfig,
  handleDeleteImagebedConfig, handleToggleImagebedConfig, handleGetImagebedSettings,
  handleUpdateImagebedSettings, handleGetUploadToken, handleGetAvailableImagebeds
} from './api/imagebed';
import { handleGetSiteSettings, handleUpdateSiteSettings } from './api/siteSettings';
import { handleHotTags } from './api/hotTags';
import { handleGetPublicMemo, handleVerifyPublicMemoPassword, handleListPublicMemosByUser } from './api/publicMemos';
import { handleGetPublicUser } from './api/publicUsers';

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
    if (path.startsWith('/card-groups')) return handleCardGroups(request, env, path);
    if (path.startsWith('/memos')) return handleMemos(request, env, path);
    if (path.startsWith('/tags')) return handleTags(request, env, path);
    if (path.startsWith('/search-engines')) return handleSearchEngines(request, env, path);
    if (path.startsWith('/imagebed')) return handleImagebed(request, env, path);
    if (path.startsWith('/site-settings')) return handleSiteSettings(request, env);
    if (path === '/hot-tags') return handleHotTags();

    const publicMemoVerifyMatch = path.match(/^\/public-memos\/([^\/]+)\/verify$/);
    const publicMemoMatch = path.match(/^\/public-memos\/([^\/]+)$/);
    if (publicMemoVerifyMatch && request.method === 'POST') return handleVerifyPublicMemoPassword(request, env, publicMemoVerifyMatch[1]);
    if (publicMemoMatch && request.method === 'GET') return handleGetPublicMemo(request, env, publicMemoMatch[1]);

    const publicUserMemosMatch = path.match(/^\/public\/users\/([^\/]+)\/memos$/);
    const publicUserMatch = path.match(/^\/public\/users\/([^\/]+)$/);
    if (publicUserMemosMatch && request.method === 'GET') return handleListPublicMemosByUser(request, env, publicUserMemosMatch[1]);
    if (publicUserMatch && request.method === 'GET') return handleGetPublicUser(request, env, publicUserMatch[1]);

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

async function handleCardGroups(request: Request, env: Env, path: string): Promise<Response> {
  const bySlugMatch = path.match(/^\/card-groups\/by-slug\/([^\/]+)$/);
  const visitMatch = path.match(/^\/card-groups\/([^\/]+)\/visit$/);
  const idMatch = path.match(/^\/card-groups\/([^\/]+)$/);

  if (bySlugMatch && request.method === 'GET') return handleGetCardGroupBySlug(request, env, bySlugMatch[1]);
  if (visitMatch && request.method === 'POST') return handleVisitCardGroup(request, env, visitMatch[1]);

  switch (request.method) {
    case 'GET':
      return handleListCardGroups(request, env);
    case 'POST':
      return handleCreateCardGroup(request, env);
    case 'PUT':
      if (!idMatch) return new Response('Bad Request', { status: 400, headers: corsHeaders() });
      return handleUpdateCardGroup(request, env, idMatch[1]);
    case 'DELETE':
      if (!idMatch) return new Response('Bad Request', { status: 400, headers: corsHeaders() });
      return handleDeleteCardGroup(request, env, idMatch[1]);
    default:
      return new Response('Method Not Allowed', { status: 405, headers: corsHeaders() });
  }
}

async function handleSearchEngines(request: Request, env: Env, path: string): Promise<Response> {
  const id = path.match(/^\/search-engines\/([^\/]+)$/)?.[1];

  switch (request.method) {
    case 'GET':
      return handleListSearchEngines(request, env);
    case 'POST':
      return handleCreateSearchEngine(request, env);
    case 'PUT':
      if (!id) return new Response('Bad Request', { status: 400, headers: corsHeaders() });
      return handleUpdateSearchEngine(request, env, id);
    case 'DELETE':
      if (!id) return new Response('Bad Request', { status: 400, headers: corsHeaders() });
      return handleDeleteSearchEngine(request, env, id);
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

async function handleImagebed(request: Request, env: Env, path: string): Promise<Response> {
  const id = path.match(/^\/imagebed\/configs\/([^\/]+)$/)?.[1];
  const toggleMatch = path.match(/^\/imagebed\/configs\/([^\/]+)\/toggle$/);

  if (path === '/imagebed/configs' && request.method === 'GET') return handleListImagebedConfigs(request, env);
  if (path === '/imagebed/configs' && request.method === 'POST') return handleCreateImagebedConfig(request, env);
  if (path === '/imagebed/settings' && request.method === 'GET') return handleGetImagebedSettings(request, env);
  if (path === '/imagebed/settings' && request.method === 'PUT') return handleUpdateImagebedSettings(request, env);
  if (path === '/imagebed/upload-token' && request.method === 'POST') return handleGetUploadToken(request, env);
  if (path === '/imagebed/available' && request.method === 'GET') return handleGetAvailableImagebeds(request, env);
  if (toggleMatch && request.method === 'POST') return handleToggleImagebedConfig(request, env, toggleMatch[1]);

  if (id) {
    switch (request.method) {
      case 'PUT': return handleUpdateImagebedConfig(request, env, id);
      case 'DELETE': return handleDeleteImagebedConfig(request, env, id);
      default: return new Response('Method Not Allowed', { status: 405, headers: corsHeaders() });
    }
  }

  return new Response('Not Found', { status: 404, headers: corsHeaders() });
}

async function handleSiteSettings(request: Request, env: Env): Promise<Response> {
  switch (request.method) {
    case 'GET':
      return handleGetSiteSettings(request, env);
    case 'PUT':
      return handleUpdateSiteSettings(request, env);
    default:
      return new Response('Method Not Allowed', { status: 405, headers: corsHeaders() });
  }
}
