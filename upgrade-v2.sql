-- SimpliSave v2 数据库升级 SQL
-- 从旧结构迁移到：公开导航 / 私有收藏 / 分享审核 分离架构
-- 适用于已有 users / bookmarks / categories / submissions / memos / tags 的旧库
-- 在 Cloudflare D1 中执行

-- ============================================
-- 1. users 表添加 role 字段
-- 如已存在会报 duplicate column，可忽略
-- ============================================
ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user';

-- 将管理员邮箱设置为 admin
UPDATE users SET role = 'admin' WHERE email = 'letvar@qq.com';

-- ============================================
-- 2. 创建新表
-- ============================================
CREATE TABLE IF NOT EXISTS public_categories (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    name TEXT NOT NULL UNIQUE,
    icon TEXT,
    color TEXT DEFAULT '#3b82f6',
    sort_order INTEGER DEFAULT 0,
    created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_categories (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    icon TEXT,
    color TEXT DEFAULT '#3b82f6',
    sort_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, name)
);

CREATE TABLE IF NOT EXISTS public_bookmarks (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    description TEXT,
    icon_url TEXT,
    category_id TEXT REFERENCES public_categories(id) ON DELETE SET NULL,
    tags TEXT DEFAULT '[]',
    sort_order INTEGER DEFAULT 0,
    visit_count INTEGER DEFAULT 0,
    status TEXT DEFAULT 'active' CHECK(status IN ('active','hidden')),
    source_submission_id TEXT,
    created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_bookmarks (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    description TEXT,
    icon_url TEXT,
    category_id TEXT REFERENCES user_categories(id) ON DELETE SET NULL,
    tags TEXT DEFAULT '[]',
    is_favorite INTEGER DEFAULT 0,
    visit_count INTEGER DEFAULT 0,
    archived INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bookmark_submissions (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user_bookmark_id TEXT REFERENCES user_bookmarks(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    description TEXT,
    icon_url TEXT,
    suggested_category_id TEXT REFERENCES public_categories(id) ON DELETE SET NULL,
    tags TEXT DEFAULT '[]',
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
    admin_note TEXT,
    approved_public_bookmark_id TEXT REFERENCES public_bookmarks(id) ON DELETE SET NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 3. 迁移旧分类数据
-- 旧 categories(type='bookmark')：
--   is_public=1 的管理员分类 → public_categories
--   其余 → user_categories
-- ============================================

-- 公开分类：管理员(user_id = admin_user_001) 且旧 bookmarks 中存在 is_public=1 引用的分类
INSERT OR IGNORE INTO public_categories (id, name, icon, color, sort_order, created_by, created_at, updated_at)
SELECT c.id, c.name, c.icon, c.color, c.sort_order, c.user_id, c.created_at, c.created_at
FROM categories c
WHERE c.type = 'bookmark'
  AND EXISTS (
    SELECT 1 FROM bookmarks b
    WHERE b.category_id = c.id AND b.is_public = 1
  );

-- 私有分类：所有 bookmark 分类复制到 user_categories（按 user_id 保留）
INSERT OR IGNORE INTO user_categories (id, user_id, name, icon, color, sort_order, created_at, updated_at)
SELECT c.id, c.user_id, c.name, c.icon, c.color, c.sort_order, c.created_at, c.created_at
FROM categories c
WHERE c.type = 'bookmark';

-- ============================================
-- 4. 迁移旧 bookmarks 数据
-- is_public=1 → public_bookmarks
-- 其余 / 所有用户私有 → user_bookmarks
-- 说明：如果管理员同时把公开导航也放在旧 bookmarks 里，公开数据进 public_bookmarks；
--      私有收藏仍进 user_bookmarks
-- ============================================

INSERT OR IGNORE INTO public_bookmarks (
    id, title, url, description, icon_url, category_id, tags, sort_order,
    visit_count, status, created_by, created_at, updated_at
)
SELECT
    b.id,
    b.title,
    b.url,
    b.description,
    b.icon_url,
    b.category_id,
    b.tags,
    0,
    b.visit_count,
    'active',
    b.user_id,
    b.created_at,
    b.updated_at
FROM bookmarks b
WHERE b.is_public = 1;

INSERT OR IGNORE INTO user_bookmarks (
    id, user_id, title, url, description, icon_url, category_id, tags,
    is_favorite, visit_count, archived, created_at, updated_at
)
SELECT
    b.id || '_private',
    b.user_id,
    b.title,
    b.url,
    b.description,
    b.icon_url,
    b.category_id,
    b.tags,
    b.is_favorite,
    b.visit_count,
    b.archived,
    b.created_at,
    b.updated_at
FROM bookmarks b;

-- ============================================
-- 5. 迁移旧 submissions 表 → bookmark_submissions
-- 旧表如为 submissions 且字段不同，则复制能对应的字段
-- ============================================

INSERT OR IGNORE INTO bookmark_submissions (
    id, user_id, title, url, description, icon_url, status, admin_note, created_at, updated_at
)
SELECT
    s.id,
    s.user_id,
    s.title,
    s.url,
    s.description,
    s.icon_url,
    CASE WHEN s.status IN ('pending','approved','rejected') THEN s.status ELSE 'pending' END,
    s.admin_note,
    s.created_at,
    COALESCE(s.updated_at, s.created_at)
FROM submissions s;

-- ============================================
-- 6. 备忘录分类迁移
-- memo 原本引用 categories(type='memo')，迁移到 user_categories
-- 如果同 id 已存在则跳过
-- ============================================
INSERT OR IGNORE INTO user_categories (id, user_id, name, icon, color, sort_order, created_at, updated_at)
SELECT c.id, c.user_id, c.name, c.icon, c.color, c.sort_order, c.created_at, c.created_at
FROM categories c
WHERE c.type = 'memo';

-- ============================================
-- 7. 新索引
-- ============================================
CREATE INDEX IF NOT EXISTS idx_public_bookmarks_category ON public_bookmarks(category_id);
CREATE INDEX IF NOT EXISTS idx_public_bookmarks_status ON public_bookmarks(status);
CREATE INDEX IF NOT EXISTS idx_public_bookmarks_sort ON public_bookmarks(sort_order);
CREATE INDEX IF NOT EXISTS idx_user_bookmarks_user ON user_bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_user_bookmarks_category ON user_bookmarks(category_id);
CREATE INDEX IF NOT EXISTS idx_user_bookmarks_favorite ON user_bookmarks(user_id, is_favorite);
CREATE INDEX IF NOT EXISTS idx_user_categories_user ON user_categories(user_id);
CREATE INDEX IF NOT EXISTS idx_public_categories_sort ON public_categories(sort_order);
CREATE INDEX IF NOT EXISTS idx_bookmark_submissions_user ON bookmark_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_bookmark_submissions_status ON bookmark_submissions(status);

-- ============================================
-- 8. 升级完成后的检查 SQL（可手动执行）
-- SELECT COUNT(*) FROM public_bookmarks;
-- SELECT COUNT(*) FROM user_bookmarks;
-- SELECT COUNT(*) FROM bookmark_submissions;
-- ============================================
