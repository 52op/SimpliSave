-- SimpliSave D1 Schema v3
-- 卡片组 + 子链接架构
-- Cloudflare D1 (SQLite)

DROP TABLE IF EXISTS bookmark_submissions;
DROP TABLE IF EXISTS public_bookmarks;
DROP TABLE IF EXISTS public_card_groups;
DROP TABLE IF EXISTS user_bookmarks;
DROP TABLE IF EXISTS public_categories;
DROP TABLE IF EXISTS user_categories;
DROP TABLE IF EXISTS tags;
DROP TABLE IF EXISTS memos;
DROP TABLE IF EXISTS users;

CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    avatar_url TEXT,
    role TEXT DEFAULT 'user' CHECK(role IN ('user','admin')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 公开导航分类（管理员维护）
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

-- 卡片组（首页一个卡片 = 一组同类链接）
CREATE TABLE IF NOT EXISTS public_card_groups (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    title TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    icon_url TEXT,
    category_id TEXT REFERENCES public_categories(id) ON DELETE SET NULL,
    sort_order INTEGER DEFAULT 0,
    status TEXT DEFAULT 'active' CHECK(status IN ('active','hidden')),
    created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    source_submission_id TEXT,
    visit_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 公开子链接（卡片组下的具体链接）
CREATE TABLE IF NOT EXISTS public_bookmarks (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    description TEXT,
    icon_url TEXT,
    group_id TEXT REFERENCES public_card_groups(id) ON DELETE CASCADE,
    category_id TEXT REFERENCES public_categories(id) ON DELETE SET NULL,
    tags TEXT DEFAULT '[]',
    sort_order INTEGER DEFAULT 0,
    status TEXT DEFAULT 'active' CHECK(status IN ('active','hidden')),
    visit_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 用户私有收藏分类
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

-- 用户私有收藏夹
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

-- 用户分享申请
CREATE TABLE IF NOT EXISTS bookmark_submissions (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user_bookmark_id TEXT,
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    description TEXT,
    icon_url TEXT,
    suggested_category_id TEXT REFERENCES public_categories(id) ON DELETE SET NULL,
    tags TEXT DEFAULT '[]',
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
    admin_note TEXT,
    approved_public_group_id TEXT REFERENCES public_card_groups(id) ON DELETE SET NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 备忘录
CREATE TABLE IF NOT EXISTS memos (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT DEFAULT '',
    is_pinned INTEGER DEFAULT 0,
    color TEXT DEFAULT '#ffffff',
    cover_image TEXT,
    category_id TEXT REFERENCES user_categories(id) ON DELETE SET NULL,
    tags TEXT DEFAULT '[]',
    archived INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 用户私有标签
CREATE TABLE IF NOT EXISTS tags (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('bookmark','memo')),
    color TEXT DEFAULT '#6b7280',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, name, type)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_public_card_groups_category ON public_card_groups(category_id);
CREATE INDEX IF NOT EXISTS idx_public_card_groups_slug ON public_card_groups(slug);
CREATE INDEX IF NOT EXISTS idx_public_bookmarks_group ON public_bookmarks(group_id);
CREATE INDEX IF NOT EXISTS idx_public_bookmarks_category ON public_bookmarks(category_id);
CREATE INDEX IF NOT EXISTS idx_user_bookmarks_user ON user_bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_user_categories_user ON user_categories(user_id);
CREATE INDEX IF NOT EXISTS idx_public_categories_sort ON public_categories(sort_order);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON bookmark_submissions(status);
CREATE INDEX IF NOT EXISTS idx_memos_user ON memos(user_id);
CREATE INDEX IF NOT EXISTS idx_tags_user ON tags(user_id);
