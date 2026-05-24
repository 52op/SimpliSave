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
    created_by TEXT,
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
    created_by TEXT,
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
    created_by TEXT,
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
    type TEXT NOT NULL DEFAULT 'bookmark' CHECK (type IN ('bookmark', 'memo')),
    parent_id TEXT REFERENCES user_categories(id) ON DELETE SET NULL,
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
CREATE INDEX IF NOT EXISTS idx_user_categories_parent ON user_categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_public_categories_sort ON public_categories(sort_order);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON bookmark_submissions(status);
CREATE INDEX IF NOT EXISTS idx_memos_user ON memos(user_id);
CREATE INDEX IF NOT EXISTS idx_tags_user ON tags(user_id);

-- 卡片组增加置顶推荐字段
ALTER TABLE public_card_groups ADD COLUMN is_featured INTEGER DEFAULT 0;

-- 搜索引擎（管理员维护，首页下拉切换）
CREATE TABLE IF NOT EXISTS search_engines (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    param TEXT NOT NULL,
    icon_url TEXT,
    color TEXT DEFAULT '#3b82f6',
    sort_order INTEGER DEFAULT 0,
    is_site_search INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 插入默认搜索引擎
INSERT OR IGNORE INTO search_engines (id, name, url, param, icon_url, color, sort_order) VALUES
  ('se-bing',   '必应',   'https://www.bing.com/search',   'q',     'https://www.bing.com/favicon.ico', '#008373', 1),
  ('se-google', 'Google', 'https://www.google.com/search', 'q',     'https://www.google.com/favicon.ico', '#4285f4', 2),
  ('se-sogou',  '搜狗',   'https://www.sogou.com/web',     'query', 'https://www.sogou.com/favicon.ico', '#fb6120', 3),
  ('se-360',    '360',    'https://www.so.com/s',          'q',     'https://www.so.com/favicon.ico', '#07a95a', 4),
  ('se-baidu',  '百度',   'https://www.baidu.com/s',      'wd',    'https://www.baidu.com/favicon.ico', '#2932e1', 5);

-- Default admin user (password: 52op)
INSERT OR IGNORE INTO users (id, email, name, password_hash, role) VALUES (
  'admin-default',
  'letvar@it0731.cn',
  'admin',
  'duKAchVjk-QsGmgzBHuEvLw9-ZDgjnA9cZROYxHNnLg',
  'admin'
);

-- 图床配置表（支持多云床 S3 兼容存储）
CREATE TABLE IF NOT EXISTS imagebed_configs (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    name TEXT NOT NULL,
    endpoint TEXT NOT NULL,
    access_key TEXT NOT NULL,
    secret_key TEXT NOT NULL,
    bucket TEXT NOT NULL,
    region TEXT,
    custom_domain TEXT,
    path_template TEXT DEFAULT '{year}/{month}/{day}/{time}_{md5}.{ext}',
    include_bucket INTEGER DEFAULT 1,
    enabled INTEGER DEFAULT 1,
    is_default INTEGER DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 图片文件记录表（记录每次上传的图片，支持管理和删除）
CREATE TABLE IF NOT EXISTS imagebed_files (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id TEXT NOT NULL,
    config_id TEXT NOT NULL,
    object_key TEXT NOT NULL,
    public_url TEXT NOT NULL,
    file_type TEXT NOT NULL DEFAULT 'memo',
    file_size INTEGER,
    content_type TEXT,
    bed_name TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_imagebed_files_user_id ON imagebed_files(user_id);
CREATE INDEX IF NOT EXISTS idx_imagebed_files_created_at ON imagebed_files(created_at DESC);

-- 图片上传尺寸限制设置表
CREATE TABLE IF NOT EXISTS imagebed_settings (
    id TEXT PRIMARY KEY DEFAULT 'global',
    icon_max_width INTEGER DEFAULT 128,
    icon_max_height INTEGER DEFAULT 128,
    icon_quality INTEGER DEFAULT 80,
    cover_max_width INTEGER DEFAULT 800,
    cover_max_height INTEGER DEFAULT 600,
    cover_quality INTEGER DEFAULT 85,
    memo_max_width INTEGER DEFAULT 1200,
    memo_max_height INTEGER DEFAULT 1200,
    memo_quality INTEGER DEFAULT 85,
    avatar_max_width INTEGER DEFAULT 256,
    avatar_max_height INTEGER DEFAULT 256,
    avatar_quality INTEGER DEFAULT 85,
    max_file_size_mb INTEGER DEFAULT 10,
    allowed_formats TEXT DEFAULT 'image/jpeg,image/png,image/webp,image/gif',
    convert_to_webp INTEGER DEFAULT 1,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 站点设置表（单行配置）
CREATE TABLE IF NOT EXISTS site_settings (
    id TEXT PRIMARY KEY DEFAULT 'global',
    site_name TEXT DEFAULT 'SimpliSave',
    description TEXT DEFAULT '一个简约的书签与备忘管理工具',
    keywords TEXT DEFAULT '书签,收藏,备忘,导航',
    logo_url TEXT DEFAULT 'https://b2-letvar-cos.letvar.ip-ddns.com/simplisave-it0731/2026/05/24_1779601178_1779601166295.webp',
    favicon_url TEXT DEFAULT 'https://b2-letvar-cos.letvar.ip-ddns.com/simplisave-it0731/2026/05/24_1779601178_1779601166295.webp',
    footer_html TEXT DEFAULT '&copy; 2026 <strong><a href="https://github.com/52op/SimpliSave" target="_blank" rel="noopener">SimpliSave</a></strong>. All rights reserved. ',
    ga_id TEXT,
    beian TEXT,
    custom_head_html TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 插入默认站点设置
INSERT OR IGNORE INTO site_settings (id) VALUES ('global');

-- Migration v4: User public profile fields
ALTER TABLE users ADD COLUMN bio TEXT;
ALTER TABLE users ADD COLUMN website TEXT;
ALTER TABLE users ADD COLUMN github TEXT;
ALTER TABLE users ADD COLUMN twitter TEXT;
ALTER TABLE users ADD COLUMN weibo TEXT;
ALTER TABLE users ADD COLUMN show_bio INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN show_website INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN show_github INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN show_twitter INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN show_weibo INTEGER DEFAULT 0;

-- Migration v4: Memo public sharing
ALTER TABLE memos ADD COLUMN is_public INTEGER DEFAULT 0;
ALTER TABLE memos ADD COLUMN share_password TEXT;

-- Migration v5: Email system
CREATE TABLE IF NOT EXISTS email_config (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  provider     TEXT    NOT NULL CHECK(provider IN ('resend','sendgrid','mailgun')),
  api_key      TEXT    NOT NULL,
  from_address TEXT    NOT NULL,
  domain       TEXT,
  region       TEXT    DEFAULT 'us',
  enabled      INTEGER NOT NULL DEFAULT 1,
  created_at   INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at   INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Migration v6: 扩展邮件服务商支持 formail / custom，新增 endpoint_url 字段
-- 重建 email_config 表以更新 CHECK 约束
CREATE TABLE IF NOT EXISTS email_config_v2 (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  provider     TEXT    NOT NULL CHECK(provider IN ('resend','sendgrid','mailgun','formail','custom')),
  api_key      TEXT    NOT NULL,
  from_address TEXT    NOT NULL DEFAULT '',
  domain       TEXT,
  region       TEXT    DEFAULT 'us',
  endpoint_url TEXT,
  enabled      INTEGER NOT NULL DEFAULT 1,
  created_at   INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at   INTEGER NOT NULL DEFAULT (unixepoch())
);
INSERT OR IGNORE INTO email_config_v2 (id, provider, api_key, from_address, domain, region, enabled, created_at, updated_at)
  SELECT id, provider, api_key, from_address, domain, region, enabled, created_at, updated_at FROM email_config;
DROP TABLE IF EXISTS email_config;
ALTER TABLE email_config_v2 RENAME TO email_config;

-- Migration v7: 每个服务商独立一行（UNIQUE provider），enabled=1 表示当前激活的服务商
-- 重建表加唯一约束，并清理重复行（保留每个 provider 最新一行）
CREATE TABLE IF NOT EXISTS email_config_v3 (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  provider     TEXT    NOT NULL UNIQUE CHECK(provider IN ('resend','sendgrid','mailgun','formail','custom')),
  api_key      TEXT    NOT NULL DEFAULT '',
  from_address TEXT    NOT NULL DEFAULT '',
  domain       TEXT,
  region       TEXT    DEFAULT 'us',
  endpoint_url TEXT,
  enabled      INTEGER NOT NULL DEFAULT 0,
  created_at   INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at   INTEGER NOT NULL DEFAULT (unixepoch())
);
INSERT OR IGNORE INTO email_config_v3 (provider, api_key, from_address, domain, region, endpoint_url, enabled, created_at, updated_at)
  SELECT provider, api_key, from_address, domain, region, endpoint_url, enabled, created_at, updated_at
  FROM email_config
  GROUP BY provider
  HAVING updated_at = MAX(updated_at);
DROP TABLE IF EXISTS email_config;
ALTER TABLE email_config_v3 RENAME TO email_config;

CREATE TABLE IF NOT EXISTS email_verification_codes (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  email      TEXT    NOT NULL,
  code       TEXT    NOT NULL,
  purpose    TEXT    NOT NULL CHECK(purpose IN ('register','login','change_email')),
  attempts   INTEGER NOT NULL DEFAULT 0,
  expires_at INTEGER NOT NULL,
  used_at    INTEGER,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS idx_evc_email_purpose
  ON email_verification_codes(email, purpose, created_at DESC);
