// Slug generation utility
import { pinyin } from 'pinyin-pro';

export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '');
}

export function generateSlug(title: string): string {
  const clean = stripHtml(title).trim();
  // Convert Chinese to pinyin, keep ASCII chars
  const slug = pinyin(clean, { toneType: 'none', type: 'string', nonZh: 'consecutive' })
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'untitled';
}
