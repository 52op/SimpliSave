# SimpliSave

现代化网址收藏与备忘录应用，基于 Cloudflare Pages + Workers + D1 构建的全栈应用。

> 📌 **在线演示**: [https://simplisave.pages.dev](https://simplisave.pages.dev)  
> 📌 **原项目**: 重构自 [hao.sztcrs.com](https://hao.sztcrs.com)

[![Deploy to Cloudflare Pages](https://img.shields.io/badge/deploy-cloudflare%20pages-f48120?logo=cloudflare)](https://deploy.workers.cloudflare.com/?url=https://github.com/52op/SimpliSave)
[![License](https://img.shields.io/github/license/52op/SimpliSave)](LICENSE)

## ✨ 功能特性

### 🏠 网址导航首页
- 多搜索引擎切换（百度、Google、必应、搜狗、360）
- 公共书签展示（无需登录即可浏览）
- 常用推荐（按访问次数排序）
- 分类导航标签
- 响应式设计

### 🔖 网址收藏
- 添加/编辑/删除书签
- 分类管理
- 标签系统
- 收藏标记
- 搜索和筛选
- 批量操作

### 📝 备忘录
- Tiptap 富文本编辑器
- 置顶功能
- 颜色标记
- 分类和标签支持
- 搜索功能

### 🔐 用户系统
- 注册/登录
- JWT 认证
- 个人资料管理
- 私人收藏与公共收藏分离

### 🌍 国际化
- 中文 / English 双语支持
- 一键切换语言

## 🛠️ 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| **前端** | React 18 + TypeScript + Vite | SPA 构建 |
| **UI** | TailwindCSS + Lucide React | 响应式组件 |
| **国际化** | i18next + react-i18n | 中英双语 |
| **状态** | Zustand | 轻量全局状态 |
| **后端** | Cloudflare Workers | Serverless API |
| **数据库** | Cloudflare D1 (SQLite) | 持久化 |
| **缓存** | Cloudflare KV | 会话/缓存 |
| **编辑** | Tiptap 2 | 备忘录富文本 |
| **部署** | Cloudflare Pages + GitHub Actions | 全球 CDN |

## 📦 项目结构

```
SimpliSave/
├── public/                    # 静态资源
│   ├── _redirects             # SPA 回退规则
│   └── favicon.ico
├── src/                       # 前端源码
│   ├── App.tsx                # 路由配置
│   ├── main.tsx               # 入口
│   ├── pages/                 # 页面组件
│   │   ├── Home.tsx           # 导航首页
│   │   ├── Bookmarks.tsx      # 书签管理
│   │   ├── Memos.tsx          # 备忘录
│   │   ├── Login.tsx          # 登录
│   │   └── Register.tsx       # 注册
│   ├── components/            # 通用组件
│   ├── services/api.ts        # API 服务
│   ├── stores/                # 状态管理
│   ├── types/                 # TypeScript 类型
│   └── utils/                 # 工具函数
├── workers/                   # Workers API
│   ├── index.ts               # 路由入口
│   ├── api/                   # API 处理
│   └── utils/                 # 工具函数
├── functions/api/             # Pages Functions
├── .github/workflows/         # CI/CD
├── schema.sql                 # 数据库迁移
├── wrangler.toml              # Workers 配置
└── package.json
```

## 🚀 部署到 Cloudflare Pages（使用 GitHub Actions）

### 1. Fork 本项目

点击右上角 **Fork** 按钮，将项目 fork 到你的 GitHub 账号。

### 2. 获取 Cloudflare API Token

1. 访问 https://dash.cloudflare.com/profile/api-tokens
2. 点击 **Create Token**
3. 选择 **Edit Cloudflare Workers** 模板
4. **Permissions** 部分，添加：
   - **Account** → **Cloudflare Pages** → **Edit**
   - **Account** → **D1** → **Edit**
5. 点击 **Continue to summary**
6. 点击 **Create Token**
7. **复制 API Token**（只显示一次！）

### 3. 获取 Account ID

1. 访问 https://dash.cloudflare.com/
2. 右侧边栏找到 **Account ID**
3. 点击复制

### 4. 添加到 GitHub Secrets

1. 访问你的仓库：https://github.com/你的用户名/SimpliSave
2. **Settings** → **Secrets and variables** → **Actions**
3. 点击 **New repository secret**
4. 添加两个密钥：

| Name | Value |
|------|-------|
| `CF_API_TOKEN` | 步骤 2 中复制的 API Token |
| `CF_ACCOUNT_ID` | 步骤 3 中复制的 Account ID |

### 5. 触发部署

推送到 `main` 或 `master` 分支会自动触发部署：

```bash
git push origin main
```

### 6. 创建 D1 数据库

1. 访问 https://dash.cloudflare.com/
2. **Workers & Pages** → **D1**
3. 点击 **Create a database**
4. 命名为 `simplisave-db`
5. 创建后，点击 **Execute SQL**
6. 粘贴 `alldata.sql` 文件内容并执行

### 7. 绑定 D1 数据库

1. 进入 Pages 项目 → **Settings**
2. **Functions** → **D1 database bindings**
3. 点击 **Add binding**
4. 配置：
   - **Variable name**: `DB`
   - **Database**: 选择 `simplisave-db`
5. 点击 **Save**

### 8. 配置环境变量

**Settings** → **Environment variables**：
- `ENVIRONMENT`: `production`
- `JWT_SECRET`: 生成一个随机字符串（例如：`openssl rand -hex 32`）

### 9. 重新部署

1. 回到 **Deployments** 页面
2. 找到最新的部署
3. 点击 **Retry deployment**

### 10. 访问应用

- 首页：`https://simplisave.pages.dev/`
- API：`https://simplisave.pages.dev/api/bookmarks?public=1`

---

## ⚙️ 环境变量

在 Cloudflare Pages Dashboard 配置（**Settings** → **Environment variables**）：

| 变量名 | 说明 | 示例 |
|--------|------|------|
| `JWT_SECRET` | JWT 签名密钥（生产环境必须修改） | `openssl rand -hex 32` 生成 |
| `ENVIRONMENT` | 环境标识 | `production` 或 `development` |

### D1 数据库绑定

在 **Settings** → **Functions** → **D1 database bindings** 添加：

| Variable name | Database |
|---------------|----------|
| `DB` | `simplisave-db` |

---

## 📝 API 接口

### 认证 `/api/auth/*`

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/auth/register` | 用户注册 |
| POST | `/auth/login` | 用户登录 |
| POST | `/auth/logout` | 用户登出 |
| GET | `/auth/me` | 获取当前用户 |
| PUT | `/auth/profile` | 更新个人资料 |

### 书签 `/api/bookmarks/*`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/bookmarks?public=1` | 获取公共书签 |
| GET | `/bookmarks` | 获取个人书签 |
| POST | `/bookmarks` | 创建书签 |
| GET | `/bookmarks/:id` | 获取单个书签 |
| PUT | `/bookmarks/:id` | 更新书签 |
| DELETE | `/bookmarks/:id` | 删除书签 |
| GET | `/bookmarks/search?q=xxx` | 搜索书签 |

### 分类 `/api/categories/*`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/categories?type=bookmark` | 获取分类列表 |
| POST | `/categories` | 创建分类 |
| PUT | `/categories/:id` | 更新分类 |
| DELETE | `/categories/:id` | 删除分类 |

### 标签 `/api/tags/*`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/tags?type=bookmark` | 获取标签列表 |
| POST | `/tags` | 创建标签 |
| DELETE | `/tags/:id` | 删除标签 |

### 备忘录 `/api/memos/*`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/memos` | 获取备忘录列表 |
| POST | `/memos` | 创建备忘录 |
| GET | `/memos/:id` | 获取单个备忘录 |
| PUT | `/memos/:id` | 更新备忘录 |
| DELETE | `/memos/:id` | 删除备忘录 |
| POST | `/memos/:id/pin` | 置顶/取消置顶 |

---

## 🔒 安全建议

1. **JWT_SECRET**: 生产环境必须使用强随机密钥
   ```bash
   openssl rand -hex 32
   ```
2. **HTTPS**: Cloudflare 默认启用 HTTPS
3. **Rate Limiting**: 可在 Workers 中添加限流逻辑
4. **输入验证**: 后端已实现基础验证

## 📄 许可证

MIT License

## 🙏 致谢

- 原项目：[hao.sztcrs.com](https://hao.sztcrs.com)
- [Cloudflare Workers](https://workers.cloudflare.com/)
- [Cloudflare Pages](https://pages.cloudflare.com/)
- [Cloudflare D1](https://developers.cloudflare.com/d1/)
- [Tiptap](https://tiptap.dev/)
- [TailwindCSS](https://tailwindcss.com/)
- [Zustand](https://zustand-demo.pmnd.rs/)

---

**Made with ❤️ by [52op](https://github.com/52op)**
