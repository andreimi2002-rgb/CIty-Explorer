// Polite HTTP for offline scripts: identifying User-Agent, one request at a time, retries on 429/5xx.

export const USER_AGENT =
  'CityExplorer/0.2 (https://city-explorer-pro.netlify.app; https://github.com/andreimi2002-rgb/CIty-Explorer)';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let last = 0;

async function politeFetch(url, init, { delayMs = 1000, retries = 4 } = {}) {
  for (let attempt = 0; ; attempt++) {
    const wait = last + delayMs - Date.now();
    if (wait > 0) await sleep(wait);
    last = Date.now();
    const res = await fetch(url, { ...init, headers: { 'User-Agent': USER_AGENT, ...(init?.headers || {}) } });
    if ((res.status === 429 || res.status >= 500) && attempt < retries) {
      const retryAfter = Number(res.headers.get('retry-after'));
      await sleep(Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 2000 * 2 ** attempt);
      continue;
    }
    return res;
  }
}

export async function getJson(url, options) {
  const res = await politeFetch(url, { headers: { Accept: 'application/json' } }, options);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Not JSON from ${url}: ${text.slice(0, 120)}`);
  }
}

/** Checks that a URL answers 200 with the expected content type prefix (e.g. "image/"). */
export async function checkUrl(url, typePrefix, options) {
  const res = await politeFetch(url, { method: 'HEAD' }, options);
  const type = res.headers.get('content-type') || '';
  return { ok: res.status === 200 && type.startsWith(typePrefix), status: res.status, type };
}
