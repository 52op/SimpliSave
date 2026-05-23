# SimpliSave SSO 配置指南

SimpliSave 支持两种认证模式：

- `standalone`（默认）：独立用户系统，使用 HS256 JWT
- `sso`：接入 GoAuth 统一认证，使用 RS256 JWT

本项目通过 **GitHub Actions** 自动部署到 Cloudflare，所有敏感配置通过 GitHub Secrets 注入。**切换认证模式只需增减 Secrets，无需修改任何代码。**

---

## 一、在 GitHub 添加 Secrets

进入仓库 → **Settings → Secrets and variables → Actions → New repository secret**，添加以下变量：

| Secret 名称 | 说明 |
|-------------|------|
| `AUTH_MODE` | 填写 `sso` |
| `SSO_ISSUER` | GoAuth 服务地址，如 `https://auth.example.com` |
| `SSO_PUBLIC_KEY` | GoAuth RSA 公钥 PEM 完整内容（见下方说明） |
| `VITE_AUTH_MODE` | 填写 `sso` |
| `VITE_SSO_URL` | GoAuth 服务地址，与 `SSO_ISSUER` 相同 |

> **获取公钥**：
> ```bash
> curl https://auth.example.com/api/public-key
> ```
> 把返回的完整 PEM 文本（包含 `-----BEGIN PUBLIC KEY-----` 头尾）粘贴到 `SSO_PUBLIC_KEY` Secret 中，**保留原始换行，不要转义**。

添加完成后，push 任意提交触发 Actions，SSO 模式即自动生效。**deploy.yml 已内置条件判断，无需手动修改。**

---

## 二、SSO 登录流程

```
用户访问 SimpliSave，前端检测到 VITE_AUTH_MODE=sso
    ↓
显示"跳转到认证中心登录"按钮
    ↓
用户点击，跳转至 https://auth.example.com/login?redirect=https://save.example.com
    ↓
用户在 GoAuth 登录
    ↓
GoAuth 重定向回 https://save.example.com?token=<JWT>
    ↓
前端 App.tsx 检测到 URL 中的 ?token= 参数
    ↓
调用 loginWithSSOToken(token)，存入 authStore，请求 /api/auth/me 获取用户信息
    ↓
清理 URL 参数，进入系统
```

---

## 三、Cookie 共享（跨子域自动登录）

若 GoAuth 配置了 `cookie_domain = ".example.com"`，且 SimpliSave 部署在 `save.example.com`：

1. 用户在 GoAuth 登录后，`_goauth_token` Cookie 自动携带到 `save.example.com`
2. Workers 后端可直接读取该 Cookie 验证身份，无需跳转回调
3. 前端 authStore 在首次访问时仍需通过 `?token=` 回调来初始化本地状态

---

## 四、环境变量说明

### Workers 后端

| 变量名 | 来源 | 说明 |
|--------|------|------|
| `AUTH_MODE` | GitHub Secret → sed 注入 wrangler.toml | `"sso"` 启用 SSO |
| `SSO_ISSUER` | GitHub Secret → sed 注入 wrangler.toml | GoAuth 服务地址 |
| `SSO_PUBLIC_KEY` | GitHub Secret → wrangler secret put | GoAuth RSA 公钥 PEM |
| `SSO_COOKIE` | 可硬编码在 wrangler.toml | 默认 `_goauth_token` |

### 前端（构建时注入）

| 变量名 | 来源 | 说明 |
|--------|------|------|
| `VITE_AUTH_MODE` | GitHub Secret → .env.production | `"sso"` 切换前端为 SSO 模式 |
| `VITE_SSO_URL` | GitHub Secret → .env.production | GoAuth 服务地址 |

---

## 五、角色说明

| GoAuth 角色 | SimpliSave 权限 |
|-------------|----------------|
| `admin` | 可访问所有数据、管理功能 |
| `user` | 仅可访问自己的数据 |

---

## 六、回退到独立模式

删除以下 GitHub Secrets（或将值清空）：

- `AUTH_MODE`
- `SSO_ISSUER`
- `SSO_PUBLIC_KEY`
- `VITE_AUTH_MODE`
- `VITE_SSO_URL`

重新 push 触发 Actions 部署即可。Workers 后端无 `AUTH_MODE` 变量时自动回退到 `standalone` 模式。
