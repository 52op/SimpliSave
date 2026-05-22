// 邮件模板 - 4 种场景

const BASE_STYLE = 'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#f4f4f5;margin:0;padding:24px;'
const CARD = 'max-width:520px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.08);'
const HEADER_STYLE = 'background:#18181b;padding:20px 32px;'
const BODY_STYLE = 'padding:32px;'
const FOOTER_STYLE = 'padding:16px 32px;border-top:1px solid #f4f4f5;color:#a1a1aa;font-size:12px;'

function wrap(siteName: string, bodyHtml: string, footerText = '此邮件由系统自动发送，请勿回复。'): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="${BASE_STYLE}">
  <div style="${CARD}">
    <div style="${HEADER_STYLE}">
      <span style="color:#fff;font-size:18px;font-weight:600;">${siteName}</span>
    </div>
    <div style="${BODY_STYLE}">${bodyHtml}</div>
    <div style="${FOOTER_STYLE}">${footerText}</div>
  </div>
</body></html>`
}

export type CodePurpose = 'register' | 'login' | 'change_email'

/** 验证码邮件（注册/登录/改邮箱） */
export function buildCodeEmail(params: {
  code: string
  purpose: CodePurpose
  siteName: string
}): { subject: string; html: string } {
  const actionMap: Record<CodePurpose, string> = {
    register: '完成注册',
    login: '登录账号',
    change_email: '修改邮箱',
  }
  const action = actionMap[params.purpose]
  const body = `
    <p style="color:#3f3f46;font-size:15px;margin:0 0 20px;">您正在 <strong>${action}</strong>，请使用以下验证码：</p>
    <div style="background:#f4f4f5;border-radius:10px;padding:20px;text-align:center;margin:0 0 24px;">
      <span style="font-size:40px;font-weight:700;letter-spacing:10px;color:#18181b;font-family:monospace;">${params.code}</span>
    </div>
    <p style="color:#71717a;font-size:13px;margin:0 0 6px;">验证码 <strong>10 分钟</strong>内有效，每个验证码仅限使用 1 次。</p>
    <p style="color:#71717a;font-size:13px;margin:0;">如非本人操作，请忽略此邮件。</p>
  `
  return {
    subject: `${params.code} 是您的 ${params.siteName} 验证码`,
    html: wrap(params.siteName, body),
  }
}

/** 注册成功欢迎邮件 */
export function buildWelcomeEmail(params: {
  name: string
  siteName: string
  siteUrl: string
}): { subject: string; html: string } {
  const body = `
    <p style="color:#3f3f46;font-size:16px;margin:0 0 16px;">Hi <strong>${params.name}</strong>，欢迎加入 ${params.siteName}！</p>
    <p style="color:#52525b;font-size:14px;margin:0 0 24px;">您的账号已成功创建，现在可以开始探索和收藏优质内容了。</p>
    <a href="${params.siteUrl}" style="display:inline-block;background:#18181b;color:#fff;text-decoration:none;padding:10px 24px;border-radius:8px;font-size:14px;font-weight:500;">立即探索</a>
  `
  return {
    subject: `欢迎加入 ${params.siteName}`,
    html: wrap(params.siteName, body),
  }
}

/** 审核通过通知 */
export function buildApprovalEmail(params: {
  name: string
  title: string
  url: string
  publicLink: string
  siteName: string
}): { subject: string; html: string } {
  const body = `
    <p style="color:#3f3f46;font-size:15px;margin:0 0 16px;">Hi <strong>${params.name}</strong>，好消息！</p>
    <p style="color:#52525b;font-size:14px;margin:0 0 12px;">您提交的书签已通过审核，现已在 ${params.siteName} 上线：</p>
    <div style="border:1px solid #e4e4e7;border-radius:8px;padding:16px;margin:0 0 24px;">
      <p style="margin:0 0 6px;font-weight:600;color:#18181b;">${params.title}</p>
      <a href="${params.url}" style="color:#6366f1;font-size:13px;word-break:break-all;">${params.url}</a>
    </div>
    <a href="${params.publicLink}" style="display:inline-block;background:#18181b;color:#fff;text-decoration:none;padding:10px 24px;border-radius:8px;font-size:14px;">查看详情</a>
  `
  return {
    subject: `「${params.title}」已通过审核 ✓`,
    html: wrap(params.siteName, body),
  }
}

/** 审核拒绝通知 */
export function buildRejectionEmail(params: {
  name: string
  title: string
  reason: string
  siteName: string
}): { subject: string; html: string } {
  const body = `
    <p style="color:#3f3f46;font-size:15px;margin:0 0 16px;">Hi <strong>${params.name}</strong>，</p>
    <p style="color:#52525b;font-size:14px;margin:0 0 12px;">很遗憾，您提交的书签未能通过本次审核：</p>
    <div style="border:1px solid #e4e4e7;border-radius:8px;padding:16px;margin:0 0 16px;">
      <p style="margin:0;font-weight:600;color:#18181b;">${params.title}</p>
    </div>
    <p style="color:#52525b;font-size:14px;margin:0 0 8px;font-weight:500;">拒绝原因：</p>
    <div style="background:#fef2f2;border-left:3px solid #f87171;padding:12px 16px;border-radius:0 6px 6px 0;margin:0 0 24px;">
      <p style="color:#7f1d1d;font-size:14px;margin:0;">${params.reason}</p>
    </div>
    <p style="color:#71717a;font-size:13px;margin:0;">您可以根据上述原因修改后重新提交。感谢您对 ${params.siteName} 的支持。</p>
  `
  return {
    subject: `「${params.title}」审核未通过`,
    html: wrap(params.siteName, body),
  }
}
