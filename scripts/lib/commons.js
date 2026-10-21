// Wikimedia Commons: licence and category checks, photo records, hero candidate ranking. Pure functions.

export const COMMONS_API = 'https://commons.wikimedia.org/w/api.php';

/** Licences allowed by AGENTS.md: public domain, CC0, CC BY, CC BY-SA (any version). Never NC or ND. */
export function licenceCheck(meta) {
  const code = String(meta?.License?.value || '').toLowerCase().trim();
  const short = stripHtml(meta?.LicenseShortName?.value || '');
  const url = String(meta?.LicenseUrl?.value || '');
  const ok =
    code === 'cc0' ||
    code === 'pd' ||
    code.startsWith('pd-') ||
    /^cc-by(-sa)?-\d(\.\d)?(-[a-z]+)?$/.test(code);
  if (!ok) return { ok: false, reason: `licence "${code || short || 'unknown'}" is not public domain, CC0, CC BY or CC BY-SA` };
  return { ok: true, code, short: short || code, url: url || null };
}

// Maps, flags, seals, logos and collages are never used as photos.
const EXCLUDED = /\b(maps?|flags?|seals?|coats? of arms|logos?|collages?|diagrams?|ai[- ]generated)\b/i;

export function excludedCategory(categories) {
  const hit = String(categories || '')
    .split('|')
    .find((c) => EXCLUDED.test(c));
  return hit || null;
}

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'", nbsp: ' ' };

/** Plain text from Commons HTML snippets (artist, licence). */
export function stripHtml(html) {
  return String(html)
    .replace(/<[^>]*>/g, '')
    .replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (_, e) => ENTITIES[e])
    .replace(/\s+/g, ' ')
    .trim();
}

/** Thumbnail URL without Commons' tracking parameters. */
export function cleanThumbUrl(url) {
  const u = new URL(url);
  for (const k of [...u.searchParams.keys()]) if (k.startsWith('utm_')) u.searchParams.delete(k);
  return u.href;
}

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);

/** Problems with a Commons file for use as a photo; empty means usable. */
export function photoProblems(info) {
  if (!info) return ['file not found on Commons'];
  const problems = [];
  const meta = info.extmetadata || {};
  const lic = licenceCheck(meta);
  if (!lic.ok) problems.push(lic.reason);
  const cat = excludedCategory(meta.Categories?.value);
  if (cat) problems.push(`excluded category "${cat}"`);
  if (!ALLOWED_MIME.has(info.mime)) problems.push(`type ${info.mime} is not a photo`);
  if (!stripHtml(meta.Artist?.value || '')) problems.push('no author');
  if (!info.thumburl) problems.push('no thumbnail');
  return problems;
}

/** The photo record stored in data/photos (everything the page needs for display and credit). */
export function photoRecord(title, info) {
  const meta = info.extmetadata;
  const lic = licenceCheck(meta);
  return {
    file: title.replace(/^File:/, ''),
    page: info.descriptionurl,
    src: cleanThumbUrl(info.thumburl),
    width: info.thumbwidth,
    height: info.thumbheight,
    originalWidth: info.width,
    originalHeight: info.height,
    author: stripHtml(meta.Artist.value),
    licence: lic.short,
    licenceCode: lic.code,
    licenceUrl: lic.url,
    assessment: assessment(meta),
  };
}

/** Commons quality assessment: "featured", "quality", "valued" or null. */
export function assessment(meta) {
  const a = String(meta?.Assessments?.value || '').toLowerCase();
  const cats = String(meta?.Categories?.value || '');
  if (/featured/.test(a) || /^Featured pictures/m.test(cats.replaceAll('|', '\n'))) return 'featured';
  if (/quality/.test(a) || /(^|\|)Quality images(\||$)/.test(cats)) return 'quality';
  if (/valued/.test(a) || /(^|\|)Valued images/.test(cats)) return 'valued';
  return null;
}

const RANK = { featured: 3, quality: 2, valued: 1 };

/**
 * Hero candidates: usable photos, landscape, at least minWidth wide; sorted by
 * assessment, then resolution, then year taken (newer first).
 */
export function rankHeroCandidates(items, { minWidth = 2400 } = {}) {
  return items
    .filter(({ info }) => info && photoProblems(info).length === 0)
    .filter(({ info }) => info.width >= minWidth && info.width > info.height)
    .map(({ title, info }) => ({
      title,
      info,
      assessment: assessment(info.extmetadata),
      year: Number(String(info.extmetadata?.DateTimeOriginal?.value || '').match(/\d{4}/)?.[0]) || 0,
    }))
    .sort(
      (a, b) =>
        (RANK[b.assessment] || 0) - (RANK[a.assessment] || 0) ||
        b.info.width * b.info.height - a.info.width * a.info.height ||
        b.year - a.year,
    );
}

/** Valid focus point: [x, y] with both between 0 and 1. */
export function validFocus(focus) {
  return Array.isArray(focus) && focus.length === 2 && focus.every((v) => typeof v === 'number' && v >= 0 && v <= 1);
}
