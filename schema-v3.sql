-- SimpliSave v3 Schema
-- Changes: added public_card_groups table, group_id on public_bookmarks

-- Users
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT DEFAULT 'user' CHECK(role IN ('user', 'admin')),
  avatar TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- User sessions / blacklist
CREATE TABLE IF NOT EXISTS user_sessions (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Token blacklist (for logout)
CREATE TABLE IF NOT EXISTS token_blacklist (
  token TEXT PRIMARY KEY,
  expires_at DATETIME NOT NULL
);

-- Public categories (navigation categories on home page)
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
CREATE INDEX IF NOT EXISTS idx_public_categories_sort ON public_categories(sort_order);

-- Card groups (a card on the home page, containing multiple links)
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
CREATE INDEX IF NOT EXISTS idx_public_card_groups_category ON public_card_groups(category_id);
CREATE INDEX IF NOT EXISTS idx_public_card_groups_sort ON public_card_groups(sort_order);
CREATE INDEX IF NOT EXISTS idx_public_card_groups_slug ON public_card_groups(slug);

-- Public bookmarks (individual links within card groups)
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
CREATE INDEX IF NOT EXISTS idx_public_bookmarks_group ON public_bookmarks(group_id);
CREATE INDEX IF NOT EXISTS idx_public_bookmarks_category ON public_bookmarks(category_id);
CREATE INDEX IF NOT EXISTS idx_public_bookmarks_sort ON public_bookmarks(sort_order);

-- User (private) categories
CREATE TABLE IF NOT EXISTS user_categories (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#3b82f6',
  sort_order INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, name)
);

-- User (private) bookmarks
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
  archived INTEGER DEFAULT 0,
  visit_count INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_user_bookmarks_user ON user_bookmarks(user_id);

-- Memos
CREATE TABLE IF NOT EXISTS memos (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT DEFAULT '',
  color TEXT DEFAULT '#ffffff',
  is_pinned INTEGER DEFAULT 0,
  category_id TEXT REFERENCES user_categories(id) ON DELETE SET NULL,
  tags TEXT DEFAULT '[]',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_memos_user ON memos(user_id);

-- Tags
CREATE TABLE IF NOT EXISTS tags (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'bookmark' CHECK(type IN ('bookmark', 'memo')),
  color TEXT DEFAULT '#3b82f6',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, name, type)
);

-- Bookmark submissions (user submits to share to public)
CREATE TABLE IF NOT EXISTS bookmark_submissions (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_bookmark_id TEXT,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  description TEXT,
  icon_url TEXT,
  tags TEXT DEFAULT '[]',
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
  admin_note TEXT,
  approved_public_group_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON bookmark_submissions(status);
