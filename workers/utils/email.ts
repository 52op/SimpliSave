// 邮件发送工具 - 支持 Resend / SendGrid / Mailgun / Formail / 自定义

export interface EmailProviderConfig {
  provider: 'resend' | 'sendgrid' | 'mailgun' | 'formail' | 'custom'
  api_key: string
  from_address: string
  domain?: string | null
  region?: string | null
  endpoint_url?: string | null
}

export interface EmailMessage {
  to: string
  subject: string
  html: string
}

/** 从 DB 读取当前启用的邮件配置 */
export async function getEmailConfig(db: any): Promise<EmailProviderConfig | null> {
  const row = await db
    .prepare(
      'SELECT provider, api_key, from_address, domain, region, endpoint_url FROM email_config WHERE enabled = 1 ORDER BY updated_at DESC LIMIT 1'
    )
    .first()
  return row ?? null
}

/** 统一发信入口 */
export async function sendEmail(msg: EmailMessage, config: EmailProviderConfig): Promise<void> {
  switch (config.provider) {
    case 'resend':   return sendViaResend(msg, config)
    case 'sendgrid': return sendViaSendGrid(msg, config)
    case 'mailgun':  return sendViaMailgun(msg, config)
    case 'formail':  return sendViaFormail(msg, config)
    case 'custom':   return sendViaCustom(msg, config)
    default: throw new Error(`Unsupported email provider: ${config.provider}`)
  }
}

async function sendViaResend(msg: EmailMessage, cfg: EmailProviderConfig): Promise<void> {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${cfg.api_key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: cfg.from_address,
      to: [msg.to],
      subject: msg.subject,
      html: msg.html,
    }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Resend error ${res.status}: ${text}`)
  }
}

async function sendViaSendGrid(msg: EmailMessage, cfg: EmailProviderConfig): Promise<void> {
  const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${cfg.api_key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: msg.to }] }],
      from: { email: cfg.from_address },
      subject: msg.subject,
      content: [{ type: 'text/html', value: msg.html }],
    }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`SendGrid error ${res.status}: ${text}`)
  }
}

async function sendViaMailgun(msg: EmailMessage, cfg: EmailProviderConfig): Promise<void> {
  const domain = cfg.domain
  if (!domain) throw new Error('Mailgun requires a domain')
  const base = cfg.region === 'eu'
    ? `https://api.eu.mailgun.net/v3/${domain}/messages`
    : `https://api.mailgun.net/v3/${domain}/messages`

  const form = new FormData()
  form.append('from', cfg.from_address)
  form.append('to', msg.to)
  form.append('subject', msg.subject)
  form.append('html', msg.html)

  const res = await fetch(base, {
    method: 'POST',
    headers: { 'Authorization': `Basic ${btoa(`api:${cfg.api_key}`)}` },
    body: form,
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Mailgun error ${res.status}: ${text}`)
  }
}

/** Formail — from 由后台决定，无需传 from_address */
async function sendViaFormail(msg: EmailMessage, cfg: EmailProviderConfig): Promise<void> {
  const endpoint = (cfg.endpoint_url?.replace(/\/$/, '') || 'https://formail.it0731.cn') + '/v1/emails'
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${cfg.api_key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      to: msg.to,
      subject: msg.subject,
      html: msg.html,
    }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Formail error ${res.status}: ${text}`)
  }
}

/** 自定义 HTTP API — 兼容 Resend 风格：POST endpoint_url，Bearer 鉴权，JSON body 含 from/to/subject/html */
async function sendViaCustom(msg: EmailMessage, cfg: EmailProviderConfig): Promise<void> {
  if (!cfg.endpoint_url) throw new Error('Custom provider requires an endpoint URL')
  const res = await fetch(cfg.endpoint_url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${cfg.api_key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: cfg.from_address,
      to: [msg.to],
      subject: msg.subject,
      html: msg.html,
    }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Custom provider error ${res.status}: ${text}`)
  }
}
