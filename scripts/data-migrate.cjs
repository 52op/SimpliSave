/**
 * Data Migration Script
 * 
 * Converts hao_sztcrs_com.sql (MySQL dump) into SimpliSave v3 D1-compatible SQL.
 *
 * Usage: node scripts/data-migrate.js < hao.sztcrs.com_4BxSy/database/hao_sztcrs_com.sql
 * Or:    node scripts/data-migrate.js --input "../hao.sztcrs.com_4BxSy/database/hao_sztcrs_com.sql"
 *
 * Output: stdout (pipe to file or directly to D1)
 */

const fs = require('fs');
const path = require('path');

// Get input file path
const inputArg = process.argv.find(a => a.startsWith('--input='));
const inputFile = inputArg ? inputArg.split('=')[1] : null;

let sqlContent;
if (inputFile) {
  sqlContent = fs.readFileSync(path.resolve(__dirname, '..', inputFile), 'utf-8');
} else {
  sqlContent = fs.readFileSync(0, 'utf-8'); // stdin
}

// Parse INSERT statements
function parseInsert(sql, tableName) {
  const rows = [];
  const regex = new RegExp(`INSERT INTO\\s+\`${tableName}\`\\s*\\(([^)]+)\\)\\s*VALUES\\s*(.+?);`, 'gs');
  let match;
  while ((match = regex.exec(sql)) !== null) {
    const columns = match[1].split(',').map(c => c.trim().replace(/`/g, ''));
    const valuesBlock = match[2];
    // Split by ),( and handle escaped quotes
    let depth = 0;
    let current = '';
    for (let i = 0; i < valuesBlock.length; i++) {
      const ch = valuesBlock[i];
      if (ch === '(' && depth === 0) { depth = 1; current = ''; continue; }
      if (ch === ')' && depth === 1) {
        if (i + 1 >= valuesBlock.length || valuesBlock[i + 1] === ',' || valuesBlock[i + 1] === ';') {
          depth = 0;
          rows.push(parseValues(current, columns));
          i++; // skip comma or semicolon
          continue;
        }
      }
      if (depth === 1) current += ch;
    }
  }
  return rows;
}

function parseValues(str, columns) {
  const values = [];
  let current = '';
  let inString = false;
  let escape = false;
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (escape) { current += ch; escape = false; continue; }
    if (ch === '\\') { escape = true; continue; }
    if (ch === "'" && !inString) { inString = true; continue; }
    if (ch === "'" && inString) { inString = false; continue; }
    if (ch === ',' && !inString) {
      values.push(current.trim());
      current = '';
      continue;
    }
    if (!inString && (ch === ' ' || ch === '\n' || ch === '\r' || ch === '\t')) continue;
    current += ch;
  }
  if (current.trim()) values.push(current.trim());

  const result = {};
  columns.forEach((col, i) => {
    result[col.trim()] = values[i] !== undefined ? values[i] : null;
  });
  return result;
}

// Strip HTML tags
function stripHtml(html) {
  return html ? html.replace(/<[^>]*>/g, '') : '';
}

// Simple slug generation (ASCII fallback for non-pinyin env)
function simpleSlug(title) {
  const clean = stripHtml(title).trim().toLowerCase();
  // Try to use pinyin-pro if available
  try {
    const { pinyin } = require('pinyin-pro');
    const slug = pinyin(clean, { toneType: 'none', type: 'string', nonZh: 'consecutive' })
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    return slug || 'untitled';
  } catch {
    // Fallback: just use ASCII chars
    const slug = clean.replace(/[^a-z0-9\u4e00-\u9fff]+/g, '-').replace(/^-+|-+$/g, '');
    return slug || 'untitled';
  }
}

// Generate a unique slug
const slugCounts = {};
function uniqueSlug(title) {
  let slug = simpleSlug(title);
  if (!slug || slug === 'untitled') slug = 'link';
  if (slugCounts[slug]) {
    slugCounts[slug]++;
    slug = `${slug}-${slugCounts[slug]}`;
  } else {
    slugCounts[slug] = 1;
  }
  return slug;
}

// Generate UUID
function uuid() {
  const chars = '0123456789abcdef';
  let id = '';
  for (let i = 0; i < 32; i++) id += chars[Math.floor(Math.random() * 16)];
  return id;
}

// Parse data
const groups = parseInsert(sqlContent, 'lylme_groups');
const links = parseInsert(sqlContent, 'lylme_links');

// Map group_id → public_categories.id
const categoryIdMap = {};
const categorySQLs = [];

for (const g of groups) {
  const id = uuid();
  const oldId = g.group_id;
  categoryIdMap[oldId] = id;
  const icon = g.group_icon || null;
  const name = stripHtml(g.group_name || '').trim();
  if (!name) continue;
  categorySQLs.push({
    id,
    name,
    icon: icon && icon !== 'NULL' ? escapeSQL(icon) : 'NULL',
    color: "'#3b82f6'",
    sort_order: g.group_order || '5',
    created_at: 'CURRENT_TIMESTAMP',
    updated_at: 'CURRENT_TIMESTAMP',
  });
}

// Parse links into card_groups + bookmarks
const groupSQLs = [];
const bookmarkSQLs = [];
const submissionSQLs = [];
let sortIdx = 0;

for (const link of links) {
  sortIdx++;
  const groupId = uuid();
  const name = stripHtml(link.name || '').trim();
  if (!name) continue;

  const slug = uniqueSlug(name);
  const categoryId = categoryIdMap[link.group_id] || null;
  const icon = link.icon || null;
  const ps = link.PS || null;

  // Parse url field: split by |, each part is url$title or just url
  const urlField = link.url || '';
  const subLinks = [];
  // Split by | but not inside $ values
  const parts = urlField.split('|');
  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const dollarIdx = trimmed.lastIndexOf('$');
    let subUrl, subTitle;
    if (dollarIdx > 0 && dollarIdx < trimmed.length - 1) {
      // Check if $ is URL separator or part of title
      subUrl = trimmed.substring(0, dollarIdx);
      subTitle = trimmed.substring(dollarIdx + 1);
    } else {
      subUrl = trimmed;
      subTitle = '';
    }
    // Extract hostname as default title
    if (!subTitle) {
      try {
        const hostname = new URL(subUrl.startsWith('http') ? subUrl : 'https://' + subUrl).hostname;
        subTitle = hostname.replace(/^www\./, '');
      } catch {
        subTitle = subUrl.substring(0, 40);
      }
    }
    subLinks.push({ url: subUrl, title: subTitle });
  }

  if (subLinks.length === 0) continue;

  groupSQLs.push({
    id: groupId,
    title: escapeSQL(name),
    slug: escapeSQL(slug),
    description: ps ? escapeSQL(ps) : 'NULL',
    icon_url: icon && icon !== 'NULL' ? escapeSQL(icon) : 'NULL',
    category_id: categoryId ? escapeSQL(categoryId) : 'NULL',
    sort_order: link.link_order || sortIdx,
    status: link.link_status === '1' ? "'active'" : "'hidden'",
    visit_count: '0',
    created_at: 'CURRENT_TIMESTAMP',
    updated_at: 'CURRENT_TIMESTAMP',
  });

  let subSort = 0;
  for (const sl of subLinks) {
    subSort++;
    const bmId = uuid();
    // Extract favicon for sub-link: try google favicon service if no icon specified
    let bmIcon = 'NULL';
    try {
      const u = new URL(sl.url.startsWith('http') ? sl.url : 'https://' + sl.url);
      if (u.hostname) {
        bmIcon = `'https://www.google.com/s2/favicons?domain=${u.hostname}&sz=64'`;
      }
    } catch {}
    bookmarkSQLs.push({
      id: bmId,
      title: escapeSQL(sl.title || name),
      url: escapeSQL(sl.url),
      description: 'NULL',
      icon_url: bmIcon,
      group_id: escapeSQL(groupId),
      category_id: categoryId ? escapeSQL(categoryId) : 'NULL',
      tags: "'[]'",
      sort_order: subSort,
      status: "'active'",
      visit_count: '0',
      created_at: 'CURRENT_TIMESTAMP',
      updated_at: 'CURRENT_TIMESTAMP',
    });
  }
}

function escapeSQL(val) {
  if (val === null || val === undefined || val === 'NULL') return 'NULL';
  const str = String(val).replace(/'/g, "''");
  return `'${str}'`;
}

// Output SQL
console.log('-- SimpliSave v3 Data Migration');
console.log('-- Generated from hao_sztcrs_com.sql');
console.log('-- Run this against D1 database after schema-v3.sql\n');

console.log('-- ======================');
console.log('-- Public Categories');
console.log('-- ======================');
for (const c of categorySQLs) {
  console.log(`INSERT INTO public_categories (id, name, icon, color, sort_order, created_at, updated_at) VALUES (${escapeSQL(c.id)}, ${escapeSQL(c.name)}, ${c.icon}, ${c.color}, ${c.sort_order}, ${c.created_at}, ${c.updated_at});`);
}

console.log('\n-- ======================');
console.log('-- Public Card Groups');
console.log('-- ======================');
for (const g of groupSQLs) {
  console.log(`INSERT INTO public_card_groups (id, title, slug, description, icon_url, category_id, sort_order, status, visit_count, created_at, updated_at) VALUES (${escapeSQL(g.id)}, ${g.title}, ${g.slug}, ${g.description}, ${g.icon_url}, ${g.category_id}, ${g.sort_order}, ${g.status}, ${g.visit_count}, ${g.created_at}, ${g.updated_at});`);
}

console.log('\n-- ======================');
console.log('-- Public Bookmarks (sub-links)');
console.log('-- ======================');
for (const b of bookmarkSQLs) {
  console.log(`INSERT INTO public_bookmarks (id, title, url, description, icon_url, group_id, category_id, tags, sort_order, status, visit_count, created_at, updated_at) VALUES (${escapeSQL(b.id)}, ${b.title}, ${b.url}, ${b.description}, ${b.icon_url}, ${b.group_id}, ${b.category_id}, ${b.tags}, ${b.sort_order}, ${b.status}, ${b.visit_count}, ${b.created_at}, ${b.updated_at});`);
}

console.log('\n-- Done. Total: ' + categorySQLs.length + ' categories, ' + groupSQLs.length + ' card groups, ' + bookmarkSQLs.length + ' sub-links.');
