// Cloudflare Worker entry point
import { corsHeaders, handleCors } from './utils/response';
import {
  handleRegister, handleLogin, handleLogout, handleGetMe, handleUpdateProfile
} from './api/auth';
import {
   handleListBookmarks, handleCreateBookmark, handleGetBookmark, handleUpdateBookmark, handleDeleteBookmark, handleSearchBookmarks
 } from './api/bookmarks';
import {
  handleListMemos, handleCreateMemo, handleGetMemo, handleUpdateMemo, handleDeleteMemo, handlePinMemo
} from './api/memos';
import {
  handleListCategories, handleCreateCategory, handleUpdateCategory, handleDeleteCategory
} from './api/categories';
import {
  handleListTags, handleCreateTag, handleDeleteTag
} from './api/tags';

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
    
    // Route handlers
    if (path.startsWith('/auth')) {
      return handleAuth(request, env, path);
    } else if (path.startsWith('/bookmarks')) {
      return handleBookmarks(request, env, path);
    } else if (path.startsWith('/memos')) {
      return handleMemos(request, env, path);
    } else if (path.startsWith('/categories')) {
      return handleCategories(request, env, path);
    } else if (path.startsWith('/tags')) {
      return handleTags(request, env, path);
    }
    
    return new Response('Not Found', { status: 404, headers: corsHeaders() });
  }
};

async function handleAuth(request: Request, env: Env, path: string): Promise<Response> {
  switch (path) {
    case '/auth/register': return await handleRegister(request, env);
    case '/auth/login': return await handleLogin(request, env);
    case '/auth/logout': return await handleLogout(request, env);
    case '/auth/me': return await handleGetMe(request, env);
    case '/auth/profile': return await handleUpdateProfile(request, env);
    default: return new Response('Not Found', { status: 404, headers: corsHeaders() });
  }
}

async function handleBookmarks(request: Request, env: Env, path: string): Promise<Response> {
   const id = path.match(/^\/bookmarks\/([^\/]+)$/)?.[1];

   // Search endpoint
   if (path === '/bookmarks/search') {
     return handleSearchBookmarks(request, env);
   }

   switch (request.method) {
     case 'GET':
       if (id) return await handleGetBookmark(request, env, id);
       return await handleListBookmarks(request, env);
     case 'POST':
       return await handleCreateBookmark(request, env);
     case 'PUT':
       if (!id) return new Response('Bad Request', { status: 400, headers: corsHeaders() });
       return await handleUpdateBookmark(request, env, id);
     case 'DELETE':
       if (!id) return new Response('Bad Request', { status: 400, headers: corsHeaders() });
       return await handleDeleteBookmark(request, env, id);
     default:
       return new Response('Method Not Allowed', { status: 405, headers: corsHeaders() });
   }
 }

async function handleMemos(request: Request, env: Env, path: string): Promise<Response> {
  const id = path.match(/^\/memos\/([^\/]+)$/)?.[1];
  const pinMatch = path.match(/^\/memos\/([^\/]+)\/pin$/);
  
  if (pinMatch) {
    return await handlePinMemo(request, env, pinMatch[1]);
  }
  
  switch (request.method) {
    case 'GET':
      if (id) return await handleGetMemo(request, env, id);
      return await handleListMemos(request, env);
    case 'POST':
      return await handleCreateMemo(request, env);
    case 'PUT':
      if (!id) return new Response('Bad Request', { status: 400, headers: corsHeaders() });
      return await handleUpdateMemo(request, env, id);
    case 'DELETE':
      if (!id) return new Response('Bad Request', { status: 400, headers: corsHeaders() });
      return await handleDeleteMemo(request, env, id);
    default:
      return new Response('Method Not Allowed', { status: 405, headers: corsHeaders() });
  }
}

async function handleCategories(request: Request, env: Env, path: string): Promise<Response> {
  const id = path.match(/^\/categories\/([^\/]+)$/)?.[1];
  
  switch (request.method) {
    case 'GET':
      return await handleListCategories(request, env);
    case 'POST':
      return await handleCreateCategory(request, env);
    case 'PUT':
      if (!id) return new Response('Bad Request', { status: 400, headers: corsHeaders() });
      return await handleUpdateCategory(request, env, id);
    case 'DELETE':
      if (!id) return new Response('Bad Request', { status: 400, headers: corsHeaders() });
      return await handleDeleteCategory(request, env, id);
    default:
      return new Response('Method Not Allowed', { status: 405, headers: corsHeaders() });
  }
}

async function handleTags(request: Request, env: Env, path: string): Promise<Response> {
  const id = path.match(/^\/tags\/([^\/]+)$/)?.[1];
  
  switch (request.method) {
    case 'GET':
      return await handleListTags(request, env);
    case 'POST':
      return await handleCreateTag(request, env);
    case 'DELETE':
      if (!id) return new Response('Bad Request', { status: 400, headers: corsHeaders() });
      return await handleDeleteTag(request, env, id);
    default:
      return new Response('Method Not Allowed', { status: 405, headers: corsHeaders() });
  }
}
