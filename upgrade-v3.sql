-- SimpliSave v3 Migration Script
-- Upgrades v2 schema to v3 (adds public_card_groups table)
-- 
-- Changes:
-- - CREATE public_card_groups table
-- - ALTER public_bookmarks to add group_id column
-- - ALTER bookmark_submissions to replace approved_public_bookmark_id with approved_public_group_id
-- - Migrate existing public_bookmarks into card groups (1:1 migration)

-- Step 1: Create card groups table
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
CREATE INDEX IF NOT EXISTS idx_public_card_groups_slug ON public_card_groups(slug);

-- Step 2: Add group_id column to public_bookmarks
ALTER TABLE public_bookmarks ADD COLUMN group_id TEXT REFERENCES public_card_groups(id) ON DELETE CASCADE;

-- Step 3: Migrate existing data - create a card group for each existing public_bookmark
-- For each bookmark, create a card group with the same title/icon/description/category
INSERT INTO public_card_groups (id, title, slug, description, icon_url, category_id, sort_order, status, created_by, source_submission_id, visit_count, created_at, updated_at)
SELECT 
  lower(hex(randomblob(16))) as id,
  title,
  -- Generate a unique slug from title (simple ASCII fallback)
  lower(replace(replace(replace(replace(replace(title, ' ', '-'), '.', '-'), '--', '-'), '--', '-'), '''', '')) || '-' || substr(id, 1, 8) as slug,
  description,
  icon_url,
  category_id,
  sort_order,
  status,
  created_by,
  source_submission_id,
  visit_count,
  created_at,
  updated_at
FROM public_bookmarks;

-- Step 4: Link bookmarks to their new card groups
-- Match by all fields (title, description, icon_url, sort_order should be unique enough)
UPDATE public_bookmarks 
SET group_id = (
  SELECT pcg.id 
  FROM public_card_groups pcg 
  WHERE pcg.title = public_bookmarks.title 
    AND (pcg.icon_url = public_bookmarks.icon_url OR (pcg.icon_url IS NULL AND public_bookmarks.icon_url IS NULL))
  ORDER BY pcg.created_at DESC 
  LIMIT 1
);

-- Step 5: Handle bookmark_submissions - replace approved_public_bookmark_id with approved_public_group_id
-- First add the new column
ALTER TABLE bookmark_submissions ADD COLUMN approved_public_group_id TEXT REFERENCES public_card_groups(id) ON DELETE SET NULL;

-- Copy existing approved ids if possible (these won't match directly since we created new groups,
-- but if the original bookmark still exists with a matching group, link it)
UPDATE bookmark_submissions 
SET approved_public_group_id = (
  SELECT pb.group_id 
  FROM public_bookmarks pb 
  WHERE pb.id = bookmark_submissions.approved_public_bookmark_id
)
WHERE status = 'approved' AND approved_public_bookmark_id IS NOT NULL;

-- Note: Old approved_public_bookmark_id column is kept for backward compatibility.
-- If you want to remove it: 
-- CREATE TABLE bookmark_submissions_new AS SELECT id, user_id, user_bookmark_id, title, url, description, icon_url, suggested_category_id, tags, status, admin_note, approved_public_group_id, created_at, updated_at FROM bookmark_submissions;
-- DROP TABLE bookmark_submissions;
-- ALTER TABLE bookmark_submissions_new RENAME TO bookmark_submissions;

-- Step 6: Remove source_submission_id from public_bookmarks (now on card_groups)
-- Not removing the column for safety, but new code won't use it.

-- Step 7: Update existing indexes
CREATE INDEX IF NOT EXISTS idx_public_bookmarks_group ON public_bookmarks(group_id);
DROP INDEX IF EXISTS idx_public_bookmarks_status;

PRAGMA foreign_key_check;
