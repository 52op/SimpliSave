// POST /api/email/send-code — 发送邮箱验证码（公开接口）
import { successResponse, errorResponse } from '../utils/response'
import { checkSendCooldown, createCode, type CodePurpose } from '../utils/verifyCode'
import { getEmailConfig, sendEmail } from '../utils/email'
import { buildCodeEmail } from '../utils/emailTemplates'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const VALID_PURPOSES: CodePurpose[] = ['register', 'login', 'change_email']

export async function handleSendCode(request: Request, env: any): Promise<Response> {
  let body: { email?: string; purpose?: string }
  try {
    body = await request.json() as any
  } catch {
    return errorResponse('请求格式错误', 400)
  }

  const { email, purpose } = body
  if (!email || !purpose) return errorResponse('缺少必要参数', 400)
  if (!EMAIL_RE.test(email)) return errorResponse('邮箱格式不正确', 400)
  if (!VALID_PURPOSES.includes(purpose as CodePurpose)) return errorResponse('无效的 purpose', 400)

  const db = env.DB
  const p = purpose as CodePurpose

  // purpose 专属前置检查
  if (p === 'register') {
    const exists = await db.prepare('SELECT id FROM users WHERE email = ?').bind(email).first()
    if (exists) return errorResponse('该邮箱已被注册', 409)
  }
  if (p === 'login') {
    const user = await db.prepare('SELECT id FROM users WHERE email = ?').bind(email).first()
    if (!user) return errorResponse('该邮箱未注册', 404)
  }

  // 冷却检查
  const cooldown = await checkSendCooldown(db, email, p)
  if (!cooldown.ok) {
    return errorResponse(cooldown.error!, 429)
  }

  // 生成验证码
  const code = await createCode(db, email, p)

  // 读取邮件配置
  const emailCfg = await getEmailConfig(db)
  if (!emailCfg) return errorResponse('邮件服务未配置，请联系管理员', 503)

  // 读取站点名称
  const site = await db.prepare('SELECT site_name FROM site_settings WHERE id = ?').bind('global').first<{ site_name: string }>()
  const siteName = site?.site_name || 'SimpliSave'

  // 发送邮件
  const { subject, html } = buildCodeEmail({ code, purpose: p, siteName })
  try {
    await sendEmail({ to: email, subject, html }, emailCfg)
  } catch (e: any) {
    console.error('Email send failed:', e)
    return errorResponse('邮件发送失败，请稍后重试', 500)
  }

  return successResponse({ message: '验证码已发送', expires_in: 600 })
}
