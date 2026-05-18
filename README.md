# SimpliSave

现代化网址收藏与备忘录应用，基于 Cloudflare Pages + Workers + D1 构建的全栈应用。

> 📌 **在线演示**: [https://master.simplisave.pages.dev](https://master.simplisave.pages.dev)  
> 📌 **原项目**: 重构自 [so.sztcrs.com](https://so.sztcrs.com)

[![Deploy to Cloudflare Pages](https://img.shields.io/badge/deploy-cloudflare%20pages-f48120?logo=cloudflare)](https://deploy.workers.cloudflare.com/?url=https://github.com/52op/SimpliSave)
[![License](https://img.shields.io/github/license/52op/SimpliSave)](LICENSE)

## ✨ 功能特性

### 🏠 公开导航
- 多搜索引擎切换（百度、Google、必应、搜狗、360）
- 只展示管理员维护的**公开导航**
- 分类导航标签
- 常用推荐（按访问次数排序）
- 响应式设计

### 🔖 私人收藏夹
- 只管理当前用户自己的**私有收藏**
- 添加 / 编辑 / 删除收藏
- 收藏 / 归档
- 私有分类管理
- 标签系统
- 搜索和筛选
- 导出 JSON
- 导出浏览器书签 HTML
- 导入浏览器书签 HTML
- 从私有收藏发起“申请分享到公开导航”

### ✅ 分享审核流
- 用户提交链接申请公开分享
- 管理员审核通过 / 拒绝
- 审核通过后自动进入公开导航
- 原私有收藏保留不变

### 📝 备忘录
- Tiptap 富文本编辑器
- 修复输入时光标丢失问题
- 置顶功能
- 颜色标记
- 分类和标签支持

### 🛠️ 辅助功能
- 网页信息抓取（标题 / 描述 / 图标）
- 图标加载失败自动显示标题首字符
- 管理员公开分类管理页
- 管理员审核页

## 🛠️ 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| **前端** | React 18 + TypeScript + Vite | SPA 构建 |
| **UI** | TailwindCSS + Lucide React | 响应式组件 |
| **后端** | Cloudflare Workers | Serverless API |
| **数据库** | Cloudflare D1 (SQLite) | 持久化 |
| **部署** | GitHub Actions + Cloudflare | 自动部署 |

## 📦 项目架构

```text
SimpliSave/
├── src/
│   ├── pages/
│   │   ├── Home.tsx                    # 公开导航首页
│   │   ├── Bookmarks.tsx               # 私人收藏夹
│   │   ├── Memos.tsx                   # 备忘录
│   │   └── admin/
│   │       ├── AdminCategories.tsx     # 公开分类管理
│   │       └── AdminSubmissions.tsx    # 分享审核
│   ├── components/
│   │   └── Favicon.tsx                 # 图标降级组件
│   ├── services/api.ts                 # 前端 API 层
│   └── stores/
├── workers/
│   ├── api/
│   │   ├── publicBookmarks.ts          # 公开导航 API
│   │   ├── userBookmarks.ts            # 私人收藏 API
│   │   ├── submissions.ts              # 审核流 API
│   │   ├── categories.ts               # 公开/私有分类 API
│   │   ├── importExport.ts             # HTML 导入导出 API
│   │   └── fetchMeta.ts                # 网页信息抓取 API
│   └── index.ts
├── schema.sql                          # v3 数据库结构
└── package.json
```

## 🧠 数据模型

### 公开导航
- `public_card_groups`（卡片组）
- `public_bookmarks`（子链接）
- `public_categories`

### 私人收藏夹
- `user_bookmarks`
- `user_categories`

### 分享审核
- `bookmark_submissions`

### 其他
- `users`
- `memos`
- `tags`

## 🚀 部署指南（GitHub Actions + Cloudflare）

## 1. Fork 本项目

点击右上角 **Fork**。

## 2. 获取 Cloudflare API Token

1. 访问 https://dash.cloudflare.com/profile/api-tokens
2. 点击 **Create Token**
3. 选择 **Edit Cloudflare Workers** 模板
4. 权限至少包括：
   - **Account → Cloudflare Pages → Edit**
   - **Account → Workers → Edit**
   - **Account → D1 → Edit**
5. 创建 Token 并复制

## 3. 获取 Account ID

登录 Cloudflare Dashboard，在右侧边栏复制 **Account ID**。

## 4. 创建 D1 数据库

1. **Workers & Pages → D1**
2. 创建数据库 `simplisave-db`
3. 进入数据库设置，复制 **Database ID**

## 5. 添加 GitHub Secrets

仓库地址：
`https://github.com/你的用户名/SimpliSave/settings/secrets/actions`

添加：

| Name | 说明 |
|------|------|
| `CF_API_TOKEN` | Cloudflare API Token |
| `CF_ACCOUNT_ID` | Cloudflare Account ID |
| `D1_DATABASE_ID` | D1 Database ID |
| `JWT_SECRET` | JWT 签名密钥 |
| `WORKERS_URL` | 首次部署 Workers 后填写实际地址 |

> `JWT_SECRET` 可使用：
>
> ```bash
> openssl rand -hex 32
> ```

## 6. 首次部署 Workers

推送代码后，GitHub Actions 会先尝试部署 Workers。

```bash
git push
```

部署成功后，在 Cloudflare Dashboard 中打开 `simplisave-api`，复制 Workers URL，类似：

```text
https://simplisave-api.xxx.workers.dev
```

将它填写到 GitHub Secret：`WORKERS_URL`

然后2选1:
方法1.在GITHUB Actions里面找到deploy-pages脚本重行运行一次
方法2.再次推送触发 Pages 使用正确后端地址重新构建：

```bash
git commit --allow-empty -m "chore: trigger redeploy"
git push
```

## 7. 初始化数据库

### 新库初始化（推荐）
执行：
- `schema.sql`：创建 v3 表结构

> 建议在 Cloudflare D1 的 **Query** 中执行。
- 将sql粘贴到Query中，点Run按钮右边下拉三角，选择 **Run all statement**

## 8. 配置 Workers 绑定

打开 `simplisave-api` Worker：

- **D1 database bindings**
  - Variable name: `DB`
  - Database: `simplisave-db`

- **Environment variables / Secrets**
  - `JWT_SECRET`
  - `ENVIRONMENT=production`

## 9. 验证

### 前端
- 在workers 和 pages页面找到你的pages域名类似于 : `https://simplisave.pages.dev/`

### Workers API
- `https://<your-workers-url>/public-bookmarks`

## 📘 数据库脚本说明

| 文件 | 用途 |
|------|------|
| `schema.sql` | v3 完整建表结构 |

## 📝 API 概览

### 认证
- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/me`
- `PUT /auth/profile`

### 公开导航（卡片组）
- `GET /card-groups` — 列出卡片组
- `GET /card-groups/by-slug/:slug` — 卡片组详情（含子链接）
- `POST /card-groups`（管理员）
- `PUT /card-groups/:id`（管理员）
- `DELETE /card-groups/:id`（管理员）
- `POST /card-groups/:id/visit` — 记录访问

### 公开子链接
- `GET /public-bookmarks?group_id=...`
- `POST /public-bookmarks`（管理员）
- `PUT /public-bookmarks/:id`（管理员）
- `DELETE /public-bookmarks/:id`（管理员）

### 私人收藏夹
- `GET /user-bookmarks`
- `POST /user-bookmarks`
- `PUT /user-bookmarks/:id`
- `DELETE /user-bookmarks/:id`
- `GET /user-bookmarks/export`
- `GET /user-bookmarks/export-html`
- `POST /user-bookmarks/import`

### 分类
- `GET /public-categories`
- `POST /public-categories`（管理员）
- `GET /user-categories`
- `POST /user-categories`

### 分享审核
- `POST /submissions`
- `GET /submissions`（管理员）
- `PUT /submissions/:id/approve`（管理员）
- `PUT /submissions/:id/reject`（管理员）

### 备忘录
- `GET /memos`
- `POST /memos`
- `PUT /memos/:id`
- `DELETE /memos/:id`
- `POST /memos/:id/pin`

### 辅助
- `GET /fetch-meta?url=...`

## 🔧 常见问题

### Pages 正常但没有后端数据
确认：
1. `WORKERS_URL` 已正确填写到 GitHub Secrets
2. Worker 已绑定 D1
3. Pages 已重新构建

### 导入浏览器 HTML 无数据
确认导入文件是浏览器导出的标准书签 HTML。

### 图标不显示
已内置降级逻辑，会自动显示标题首字符。

### 管理员菜单不显示
确认数据库里该用户 `role='admin'`。

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
