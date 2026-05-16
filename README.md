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

### 📝 备忘录
- Tiptap 富文本编辑器
- 置顶功能
- 颜色标记
- 分类和标签支持

### 🔐 用户系统
- 注册/登录
- JWT 认证
- 私人收藏与公共收藏分离

### 🌍 国际化
- 中文 / English 双语支持

## 🛠️ 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| **前端** | React 18 + TypeScript + Vite | SPA 构建 |
| **UI** | TailwindCSS + Lucide React | 响应式组件 |
| **后端** | Cloudflare Workers | Serverless API |
| **数据库** | Cloudflare D1 (SQLite) | 持久化 |
| **部署** | GitHub Actions | 自动部署 |

## 📦 项目架构

```
SimpliSave/
├── src/                       # 前端源码
│   ├── pages/                 # 页面组件
│   ├── components/            # 通用组件
│   ├── services/api.ts        # API 服务（访问 Workers）
│   └── stores/                # 状态管理
├── workers/                   # Workers API 源码
│   ├── index.ts               # 路由入口
│   ├── api/                   # API 处理
│   └── utils/                 # 工具函数
├── .github/workflows/         # CI/CD
├── schema.sql                 # 数据库结构
├── alldata.sql                # 完整数据
└── package.json
```

**部署架构**：
- **Cloudflare Pages**：部署前端静态文件
- **Cloudflare Workers**：部署 API 后端
- **Cloudflare D1**：数据库

## 🚀 部署指南（使用 GitHub Actions）

### 1. Fork 本项目

点击右上角 **Fork** 按钮。

### 2. 获取 Cloudflare API Token

1. 访问 https://dash.cloudflare.com/profile/api-tokens
2. 点击 **Create Token**
3. 选择 **Edit Cloudflare Workers** 模板
4. **Permissions**：
   - **Account** → **Cloudflare Pages** → **Edit**
   - **Account** → **Workers** → **Edit**
   - **Account** → **D1** → **Edit**
5. 点击 **Continue to summary** → **Create Token**
6. **复制 API Token**

### 3. 获取 Account ID

1. 访问 https://dash.cloudflare.com/
2. 右侧边栏找到 **Account ID**
3. 复制

### 4. 创建 D1 数据库

1. 访问 https://dash.cloudflare.com/
2. **Workers & Pages** → **D1**
3. 点击 **Create a database**
4. 命名为 `simplisave-db`
5. 创建后，进入数据库 → **Settings**
6. 复制 **Database ID**

### 5. 添加 GitHub Secrets

访问你的仓库：https://github.com/你的用户名/SimpliSave/settings/secrets/actions

添加以下 secrets：

| Name | Value | 说明 |
|------|-------|------|
| `CF_API_TOKEN` | 步骤 2 复制 | Cloudflare API Token |
| `CF_ACCOUNT_ID` | 步骤 3 复制 | 账户 ID |
| `D1_DATABASE_ID` | 步骤 4 复制 | 数据库 ID |
| `JWT_SECRET` | `openssl rand -hex 32` 生成 | JWT 签名密钥 |

### 6. 触发部署

```bash
# 修改任意文件触发部署
git commit --allow-empty -m "chore: 触发首次部署"
git push
```

### 7. 配置 D1 数据库

1. 访问 https://dash.cloudflare.com/
2. **Workers & Pages** → **D1** → `simplisave-db`
3. 点击 **Execute SQL**
4. 粘贴 `alldata.sql` 文件内容并执行

### 8. 配置 Workers 绑定

部署完成后：
1. **Workers & Pages** → `simplisave-api` → **Settings**
2. **D1 database bindings** → 确认 `DB` 绑定到 `simplisave-db`
3. 如果没有，点击 **Add binding** 添加

### 9. 验证部署

- 首页：`https://simplisave.pages.dev/`
- API：`https://simplisave-api.xxx.workers.dev/bookmarks?public=1`

---

## ⚙️ 环境变量

### Workers 环境变量（在 Workers 设置中配置）

| 变量名 | 说明 |
|--------|------|
| `JWT_SECRET` | JWT 签名密钥 |
| `ENVIRONMENT` | `production` |

### D1 数据库绑定

在 Workers 设置 → **D1 database bindings**：
- **Variable name**: `DB`
- **Database**: `simplisave-db`

---

## 📝 API 接口

### 认证 `/auth/*`

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/auth/register` | 用户注册 |
| POST | `/auth/login` | 用户登录 |
| GET | `/auth/me` | 获取当前用户 |

### 书签 `/bookmarks/*`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/bookmarks?public=1` | 获取公共书签 |
| GET | `/bookmarks` | 获取个人书签 |
| POST | `/bookmarks` | 创建书签 |
| PUT | `/bookmarks/:id` | 更新书签 |
| DELETE | `/bookmarks/:id` | 删除书签 |
| GET | `/bookmarks/search?q=xxx` | 搜索书签 |

### 备忘录 `/memos/*`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/memos` | 获取列表 |
| POST | `/memos` | 创建 |
| PUT | `/memos/:id` | 更新 |
| DELETE | `/memos/:id` | 删除 |

---

## 🔧 故障排查

### Q: Pages 显示 Not Found
A: 确认 `functions/` 目录已删除，改用单独的 Workers API。

### Q: API 返回 404
A: 检查 Workers 是否部署成功，访问 Workers URL 测试。

### Q: 数据库连接失败
A: 检查 Workers 的 D1 绑定是否正确。

### Q: 登录失败
A: 检查 `JWT_SECRET` 环境变量是否配置。

---

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
