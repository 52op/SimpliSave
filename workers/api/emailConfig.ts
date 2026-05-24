// 管理员邮件配置 API
import { successResponse, errorResponse } from '../utils/response'
import { getAuthPayload } from '../utils/auth'
import { getEmailConfig, sendEmail } from '../utils/email'
import { buildCodeEmail } from '../utils/emailTemplates'

type Provider = 'resend' | 'sendgrid' | 'mailgun' | 'formail' | 'custom'
const VALID_PROVIDERS: Provider[] = ['resend', 'sendgrid', 'mailgun', 'formail', 'custom']

async function requireAdmin(request: Request, env: any): Promise<boolean> {
  const auth = await getAuthPayload(request, env)
  if (!auth) return false
  // SSO 模式：以 JWT 中的 role 为权威源（GoAuth 是唯一来源）
  if (env.AUTH_MODE === 'sso') return auth.role === 'admin'
  const user = await env.DB.prepare('SELECT role FROM users WHERE id = ?').bind(auth.userId).first<{ role: string }>()
  return user?.role === 'admin'
}

/** GET /api/admin/email-config — 返回所有服务商配置（不含 api_key） */
export async function handleGetEmailConfig(request: Request, env: any): Promise<Response> {
  if (!await requireAdmin(request, env)) return errorResponse('无权限', 403)

  const rows = await env.DB
    .prepare('SELECT id, provider, from_address, domain, region, endpoint_url, enabled, updated_at FROM email_config ORDER BY provider ASC')
    .all()
  return successResponse(rows.results ?? [])
}

/** PUT /api/admin/email-config — 保存某个服务商的配置（UPSERT，不改 enabled） */
export async function handleUpdateEmailConfig(request: Request, env: any): Promise<Response> {
  if (!await requireAdmin(request, env)) return errorResponse('无权限', 403)

  let body: { provider?: Provider; api_key?: string; from_address?: string; domain?: string; region?: string; endpoint_url?: string }
  try {
    body = await request.json() as any
  } catch {
    return errorResponse('请求格式错误', 400)
  }

  const { provider, api_key, from_address, domain, region, endpoint_url } = body
  if (!provider) return errorResponse('provider 为必填项', 400)
  if (!VALID_PROVIDERS.includes(provider)) return errorResponse('无效的 provider', 400)
  if (provider !== 'formail' && !from_address) return errorResponse('from_address 为必填项', 400)
  if (provider === 'mailgun' && !domain) return errorResponse('Mailgun 需要填写 Domain', 400)
  if (provider === 'custom' && !endpoint_url) return errorResponse('自定义服务商需要填写 Endpoint URL', 400)

  const now = Math.floor(Date.now() / 1000)
  const existing = await env.DB
    .prepare('SELECT id, api_key FROM email_config WHERE provider = ?')
    .bind(provider)
    .first<{ id: number; api_key: string }>()

  const finalApiKey = api_key?.trim() || existing?.api_key || ''
  if (!finalApiKey) return errorResponse('API Key 不能为空', 400)

  if (existing) {
    await env.DB.prepare(
      `UPDATE email_config SET api_key=?, from_address=?, domain=?, region=?, endpoint_url=?, updated_at=? WHERE id=?`
    ).bind(finalApiKey, from_address || '', domain ?? null, region ?? 'us', endpoint_url ?? null, now, existing.id).run()
  } else {
    await env.DB.prepare(
      `INSERT INTO email_config (provider, api_key, from_address, domain, region, endpoint_url, enabled, updated_at) VALUES (?, ?, ?, ?, ?, ?, 0, ?)`
    ).bind(provider, finalApiKey, from_address || '', domain ?? null, region ?? 'us', endpoint_url ?? null, now).run()
  }

  return successResponse({ message: '配置已保存' })
}

/** POST /api/admin/email-config/activate — 激活指定服务商（其余全部禁用） */
export async function handleActivateEmailConfig(request: Request, env: any): Promise<Response> {
  if (!await requireAdmin(request, env)) return errorResponse('无权限', 403)

  let body: { provider?: Provider }
  try {
    body = await request.json() as any
  } catch {
    return errorResponse('请求格式错误', 400)
  }

  const { provider } = body
  if (!provider || !VALID_PROVIDERS.includes(provider)) return errorResponse('无效的 provider', 400)

  const row = await env.DB.prepare('SELECT id FROM email_config WHERE provider = ?').bind(provider).first()
  if (!row) return errorResponse('该服务商尚未配置，请先保存配置', 400)

  // 先全部禁用，再启用指定服务商
  await env.DB.prepare('UPDATE email_config SET enabled = 0').run()
  await env.DB.prepare('UPDATE email_config SET enabled = 1 WHERE provider = ?').bind(provider).run()

  return successResponse({ message: `已切换至 ${provider}` })
}

/** POST /api/admin/email-config/test — 发送测试邮件 */
export async function handleTestEmailConfig(request: Request, env: any): Promise<Response> {
  if (!await requireAdmin(request, env)) return errorResponse('无权限', 403)

  let body: { to_email?: string }
  try {
    body = await request.json() as any
  } catch {
    return errorResponse('请求格式错误', 400)
  }

  if (!body.to_email) return errorResponse('请填写收件地址', 400)

  const emailCfg = await getEmailConfig(env.DB)
  if (!emailCfg) return errorResponse('邮件服务未配置或未启用', 503)

  const site = await env.DB.prepare('SELECT site_name FROM site_settings WHERE id = ?').bind('global').first<{ site_name: string }>()
  const siteName = site?.site_name || 'SimpliSave'

  const { subject, html } = buildCodeEmail({ code: '123456', purpose: 'login', siteName })
  try {
    await sendEmail({ to: body.to_email, subject: `[测试] ${subject}`, html }, emailCfg)
  } catch (e: any) {
    return errorResponse(`发送失败：${e.message}`, 500)
  }

  return successResponse({ message: `测试邮件已发送至 ${body.to_email}` })
}
