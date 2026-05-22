// 验证码工具 - 生成/冷却检查/消费（含防暴力破解）

const MAX_ATTEMPTS = 5
const CODE_TTL_SECS = 600    // 10 分钟
const SEND_COOLDOWN = 60     // 60 秒

export type CodePurpose = 'register' | 'login' | 'change_email'

/** 检查同邮箱+purpose 60s 冷却期 */
export async function checkSendCooldown(
  db: any,
  email: string,
  purpose: CodePurpose
): Promise<{ ok: boolean; cooldownRemaining?: number; error?: string }> {
  const now = Math.floor(Date.now() / 1000)
  const row = await db
    .prepare(
      `SELECT created_at FROM email_verification_codes
       WHERE email = ? AND purpose = ? AND created_at > ?
       ORDER BY created_at DESC LIMIT 1`
    )
    .bind(email, purpose, now - SEND_COOLDOWN)
    .first<{ created_at: number }>()

  if (row) {
    const cooldownRemaining = SEND_COOLDOWN - (now - row.created_at)
    return { ok: false, cooldownRemaining, error: `请等待 ${cooldownRemaining} 秒后再试` }
  }
  return { ok: true }
}

/** 生成 6 位验证码并写入 DB，同时作废旧的未用码 */
export async function createCode(
  db: any,
  email: string,
  purpose: CodePurpose
): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const code = String(Math.floor(100000 + Math.random() * 900000))
  const expiresAt = now + CODE_TTL_SECS

  // 作废同邮箱+purpose 旧的未使用码
  await db
    .prepare(
      `UPDATE email_verification_codes SET used_at = ?
       WHERE email = ? AND purpose = ? AND used_at IS NULL`
    )
    .bind(now, email, purpose)
    .run()

  await db
    .prepare(
      `INSERT INTO email_verification_codes (email, code, purpose, expires_at)
       VALUES (?, ?, ?, ?)`
    )
    .bind(email, code, purpose, expiresAt)
    .run()

  return code
}

/** 验证并消费验证码（含防暴力破解） */
export async function consumeCode(
  db: any,
  email: string,
  code: string,
  purpose: CodePurpose
): Promise<{ ok: boolean; error?: string }> {
  const now = Math.floor(Date.now() / 1000)

  const row = await db
    .prepare(
      `SELECT id, code, attempts FROM email_verification_codes
       WHERE email = ? AND purpose = ? AND used_at IS NULL AND expires_at > ?
       ORDER BY created_at DESC LIMIT 1`
    )
    .bind(email, purpose, now)
    .first<{ id: number; code: string; attempts: number }>()

  if (!row) return { ok: false, error: '验证码无效或已过期' }

  const newAttempts = row.attempts + 1

  // 超过最大尝试次数，强制作废
  if (newAttempts > MAX_ATTEMPTS) {
    await db
      .prepare('UPDATE email_verification_codes SET used_at = ?, attempts = ? WHERE id = ?')
      .bind(now, newAttempts, row.id)
      .run()
    return { ok: false, error: '验证码已失效，请重新获取' }
  }

  // 先更新 attempts
  await db
    .prepare('UPDATE email_verification_codes SET attempts = ? WHERE id = ?')
    .bind(newAttempts, row.id)
    .run()

  // 恒定时间比较
  if (!timingSafeEqual(row.code, code)) {
    if (newAttempts >= MAX_ATTEMPTS) {
      await db
        .prepare('UPDATE email_verification_codes SET used_at = ? WHERE id = ?')
        .bind(now, row.id)
        .run()
      return { ok: false, error: '验证码已失效，请重新获取' }
    }
    const remaining = MAX_ATTEMPTS - newAttempts
    return { ok: false, error: `验证码错误，还剩 ${remaining} 次机会` }
  }

  // 匹配成功，标记已使用
  await db
    .prepare('UPDATE email_verification_codes SET used_at = ? WHERE id = ?')
    .bind(now, row.id)
    .run()

  return { ok: true }
}

/** 恒定时间字符串比较（防时序攻击） */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return diff === 0
}
