import { getUserId, getUserRole } from '../utils/auth';
import { successResponse, errorResponse } from '../utils/response';
import { s3PutObject } from '../utils/s3';

function parsePathTemplate(template: string, filename: string, ext: string, type: string, userId: string): string {
  const now = new Date();
  const year = now.getFullYear().toString();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  const time = Math.floor(now.getTime() / 1000).toString();
  const nameWithoutExt = filename.replace(/\.[^.]+$/, '');
  const md5Hash = nameWithoutExt;

  return template
    .replace(/\{year\}/g, year)
    .replace(/\{month\}/g, month)
    .replace(/\{day\}/g, day)
    .replace(/\{time\}/g, time)
    .replace(/\{filename\}/g, nameWithoutExt)
    .replace(/\{ext\}/g, ext)
    .replace(/\{md5\}/g, md5Hash)
    .replace(/\{uuid\}/g, crypto.randomUUID())
    .replace(/\{type\}/g, type)
    .replace(/\{user_id\}/g, userId.substring(0, 8));
}

export async function handleListImagebedConfigs(request: Request, env: any): Promise<Response> {
  const role = await getUserRole(request, env);
  if (role !== 'admin') return errorResponse('Admin only', 403);

  const configs = await env.DB.prepare(
    'SELECT id, name, endpoint, bucket, region, custom_domain, path_template, include_bucket, enabled, is_default, sort_order, created_at, updated_at FROM imagebed_configs ORDER BY sort_order ASC, created_at DESC'
  ).all();
  return successResponse(configs.results);
}

export async function handleCreateImagebedConfig(request: Request, env: any): Promise<Response> {
  const role = await getUserRole(request, env);
  if (role !== 'admin') return errorResponse('Admin only', 403);

  const body = await request.json() as any;
  if (!body.name || !body.endpoint || !body.access_key || !body.secret_key || !body.bucket) {
    return errorResponse('name, endpoint, access_key, secret_key, bucket are required', 400);
  }

  const result = await env.DB.prepare(
    `INSERT INTO imagebed_configs (name, endpoint, access_key, secret_key, bucket, region, custom_domain, path_template, include_bucket, enabled, is_default, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    body.name, body.endpoint, body.access_key, body.secret_key, body.bucket,
    body.region || null, body.custom_domain || null, body.path_template || '{year}/{month}/{day}/{time}_{md5}.{ext}',
    body.include_bucket !== undefined ? body.include_bucket : 1,
    body.enabled !== undefined ? body.enabled : 1, body.is_default || 0, body.sort_order || 0
  ).run();

  if (!result.success) return errorResponse('Failed to create imagebed config', 500);

  const config = await env.DB.prepare('SELECT id, name, endpoint, bucket, region, custom_domain, path_template, include_bucket, enabled, is_default, sort_order, created_at, updated_at FROM imagebed_configs ORDER BY created_at DESC LIMIT 1').first();
  return successResponse(config, 201);
}

export async function handleUpdateImagebedConfig(request: Request, env: any, id: string): Promise<Response> {
  const role = await getUserRole(request, env);
  if (role !== 'admin') return errorResponse('Admin only', 403);

  const body = await request.json() as any;
  const updates: string[] = [];
  const values: any[] = [];

  if (body.name) { updates.push('name = ?'); values.push(body.name); }
  if (body.endpoint) { updates.push('endpoint = ?'); values.push(body.endpoint); }
  if (body.access_key) { updates.push('access_key = ?'); values.push(body.access_key); }
  if (body.secret_key) { updates.push('secret_key = ?'); values.push(body.secret_key); }
  if (body.bucket) { updates.push('bucket = ?'); values.push(body.bucket); }
  if (body.region !== undefined) { updates.push('region = ?'); values.push(body.region); }
  if (body.custom_domain !== undefined) { updates.push('custom_domain = ?'); values.push(body.custom_domain); }
  if (body.path_template) { updates.push('path_template = ?'); values.push(body.path_template); }
  if (body.include_bucket !== undefined) { updates.push('include_bucket = ?'); values.push(body.include_bucket); }
  if (body.enabled !== undefined) { updates.push('enabled = ?'); values.push(body.enabled); }
  if (body.is_default !== undefined) { updates.push('is_default = ?'); values.push(body.is_default); }
  if (body.sort_order !== undefined) { updates.push('sort_order = ?'); values.push(body.sort_order); }

  if (updates.length === 0) return errorResponse('No fields to update', 400);
  updates.push('updated_at = CURRENT_TIMESTAMP');
  values.push(id);

  await env.DB.prepare(`UPDATE imagebed_configs SET ${updates.join(', ')} WHERE id = ?`).bind(...values).run();

  const config = await env.DB.prepare('SELECT id, name, endpoint, bucket, region, custom_domain, path_template, include_bucket, enabled, is_default, sort_order, created_at, updated_at FROM imagebed_configs WHERE id = ?').bind(id).first();
  return successResponse(config);
}

export async function handleDeleteImagebedConfig(request: Request, env: any, id: string): Promise<Response> {
  const role = await getUserRole(request, env);
  if (role !== 'admin') return errorResponse('Admin only', 403);

  const result = await env.DB.prepare('DELETE FROM imagebed_configs WHERE id = ?').bind(id).run();
  if (!result.success) return errorResponse('Failed to delete imagebed config', 500);
  return successResponse({ message: 'Imagebed config deleted' });
}

export async function handleToggleImagebedConfig(request: Request, env: any, id: string): Promise<Response> {
  const role = await getUserRole(request, env);
  if (role !== 'admin') return errorResponse('Admin only', 403);

  const body = await request.json() as any;
  const enabled = body.enabled !== undefined ? body.enabled : 1;

  await env.DB.prepare('UPDATE imagebed_configs SET enabled = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').bind(enabled, id).run();

  const config = await env.DB.prepare('SELECT id, name, endpoint, bucket, region, custom_domain, path_template, include_bucket, enabled, is_default, sort_order, created_at, updated_at FROM imagebed_configs WHERE id = ?').bind(id).first();
  return successResponse(config);
}

export async function handleGetImagebedSettings(request: Request, env: any): Promise<Response> {
  const userId = await getUserId(request, env);
  if (!userId) return errorResponse('Unauthorized', 401);

  const settings = await env.DB.prepare('SELECT * FROM imagebed_settings WHERE id = ?').bind('global').first();
  if (!settings) {
    return successResponse({
      icon_max_width: 128, icon_max_height: 128, icon_quality: 80,
      cover_max_width: 800, cover_max_height: 600, cover_quality: 85,
      memo_max_width: 1200, memo_max_height: 1200, memo_quality: 85,
      avatar_max_width: 256, avatar_max_height: 256, avatar_quality: 85,
      max_file_size_mb: 10,
      allowed_formats: 'image/jpeg,image/png,image/webp,image/gif',
      convert_to_webp: 1,
    });
  }
  return successResponse(settings);
}

export async function handleUpdateImagebedSettings(request: Request, env: any): Promise<Response> {
  const role = await getUserRole(request, env);
  if (role !== 'admin') return errorResponse('Admin only', 403);

  const body = await request.json() as any;
  const updates: string[] = [];
  const values: any[] = [];

  const fields = [
    'icon_max_width', 'icon_max_height', 'icon_quality',
    'cover_max_width', 'cover_max_height', 'cover_quality',
    'memo_max_width', 'memo_max_height', 'memo_quality',
    'avatar_max_width', 'avatar_max_height', 'avatar_quality',
    'max_file_size_mb', 'allowed_formats', 'convert_to_webp',
  ];

  for (const field of fields) {
    if (body[field] !== undefined) {
      updates.push(`${field} = ?`);
      values.push(body[field]);
    }
  }

  if (updates.length === 0) return errorResponse('No fields to update', 400);

  const colNames = updates.map(u => u.split(' = ')[0]);
  const colPlaceholders = updates.map(() => '?').join(', ');

  values.unshift('global');

  await env.DB.prepare(
    `INSERT INTO imagebed_settings (id, ${colNames.join(', ')})
     VALUES (?, ${colPlaceholders})
     ON CONFLICT(id) DO UPDATE SET ${colNames.map(c => `${c} = excluded.${c}`).join(', ')}, updated_at = CURRENT_TIMESTAMP`
  ).bind(...values).run();

  const settings = await env.DB.prepare('SELECT * FROM imagebed_settings WHERE id = ?').bind('global').first();
  return successResponse(settings);
}

export async function handleGetUploadToken(request: Request, env: any): Promise<Response> {
  const userId = await getUserId(request, env);
  if (!userId) return errorResponse('Unauthorized', 401);

  const body = await request.json() as any;
  if (!body.type || !body.filename) {
    return errorResponse('type and filename are required', 400);
  }

  const type = body.type;
  const filename = body.filename;
  const ext = filename.split('.').pop()?.toLowerCase() || 'bin';

  const configs = await env.DB.prepare(
    'SELECT * FROM imagebed_configs WHERE enabled = 1 ORDER BY is_default DESC, sort_order ASC'
  ).all();

  if (!configs.results || configs.results.length === 0) {
    return errorResponse('No enabled imagebed configs found', 404);
  }

  const randomIndex = Math.floor(Math.random() * configs.results.length);
  const config = configs.results[randomIndex];

  const finalExt = (ext !== 'gif') ? 'webp' : ext;
  const objectKey = parsePathTemplate(config.path_template, filename, finalExt, type, userId);

  const uploadPath = config.include_bucket ? `${config.bucket}/${objectKey}` : objectKey;
  const baseUrl = config.custom_domain || config.endpoint;
  const publicUrl = `${baseUrl.replace(/\/+$/, '')}/${uploadPath}`;

  return successResponse({
    upload_url: `${config.endpoint}/${config.bucket}/${objectKey}`,
    public_url: publicUrl,
    access_key: config.access_key,
    secret_key: config.secret_key,
    bucket: config.bucket,
    region: config.region || 'auto',
    bed_name: config.name,
  });
}

export async function handleGetAvailableImagebeds(request: Request, env: any): Promise<Response> {
  const userId = await getUserId(request, env);
  if (!userId) return errorResponse('Unauthorized', 401);

  const configs = await env.DB.prepare(
    'SELECT id, name, endpoint, bucket, region, custom_domain, path_template, include_bucket, is_default FROM imagebed_configs WHERE enabled = 1 ORDER BY is_default DESC, sort_order ASC'
  ).all();
  return successResponse(configs.results);
}

export async function handleUploadImage(request: Request, env: any): Promise<Response> {
  const userId = await getUserId(request, env);
  if (!userId) return errorResponse('Unauthorized', 401);

  const url = new URL(request.url);
  const type = url.searchParams.get('type') || 'memo';
  const filename = url.searchParams.get('filename') || `upload_${Date.now()}.bin`;

  const body = await request.arrayBuffer();
  if (!body || body.byteLength === 0) return errorResponse('Empty file', 400);

  const contentType = request.headers.get('Content-Type') || 'application/octet-stream';

  const configs = await env.DB.prepare(
    'SELECT * FROM imagebed_configs WHERE enabled = 1 ORDER BY is_default DESC, sort_order ASC'
  ).all();

  if (!configs.results || configs.results.length === 0) {
    return errorResponse('No enabled imagebed configs found', 404);
  }

  const randomIndex = Math.floor(Math.random() * configs.results.length);
  const config: any = configs.results[randomIndex];

  const ext = filename.split('.').pop()?.toLowerCase() || 'bin';
  const webpSettings = await env.DB.prepare('SELECT convert_to_webp FROM imagebed_settings WHERE id = ?').bind('global').first() as any;
  const convertToWebP = webpSettings ? webpSettings.convert_to_webp === 1 : true;
  const finalExt = convertToWebP && ext !== 'gif' ? 'webp' : ext;
  const objectKey = parsePathTemplate(config.path_template, filename, finalExt, type, userId);

  const s3Response = await s3PutObject(
    config.endpoint, config.access_key, config.secret_key,
    config.region || 'auto', config.bucket, objectKey,
    body, contentType,
  );

  if (!s3Response.ok) {
    const errText = await s3Response.text();
    return errorResponse(`S3 upload failed: ${s3Response.status} ${errText}`, 502);
  }

  const uploadPath = config.include_bucket ? `${config.bucket}/${objectKey}` : objectKey;
  const baseUrl = config.custom_domain || config.endpoint;
  const publicUrl = `${baseUrl.replace(/\/+$/, '')}/${uploadPath}`;

  return successResponse({ public_url: publicUrl, bed_name: config.name, object_key: objectKey });
}
