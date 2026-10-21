// GET /api/weather?lat=..&lon=.. — current weather from MET Norway, cached on Netlify's CDN
// until MET's Expires time so MET receives few requests.
import { parseCoords, metUrl, summarize, cacheSeconds, USER_AGENT, SOURCE } from '../lib/met.js';

const json = (body, status, headers = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', ...headers } });

const NO_STORE = { 'Cache-Control': 'no-store' };

// Two tries, both within Netlify's 10-second limit for a function: a slow or failing first answer
// from MET (timeout, 5xx, 429) gets one more chance.
const ATTEMPT_TIMEOUTS_MS = [4500, 4000];

async function fetchMet(url) {
  let last = null;
  for (const timeout of ATTEMPT_TIMEOUTS_MS) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(timeout) });
      if (res.ok || (res.status < 500 && res.status !== 429)) return res;
      last = res;
    } catch {
      last = null;
    }
  }
  return last; // null: no answer at all
}

export default async function handler(req) {
  const coords = parseCoords(new URL(req.url).searchParams);
  if (coords.error) return json({ error: coords.error }, 400, NO_STORE);

  const res = await fetchMet(metUrl(coords));
  // Errors are never cached, so a retry a few seconds later reaches MET again.
  if (!res) return json({ error: 'weather service did not answer' }, 504, NO_STORE);
  if (!res.ok) return json({ error: `weather service answered ${res.status}` }, 502, NO_STORE);

  let summary;
  try {
    summary = summarize(await res.json());
  } catch (err) {
    return json({ error: 'unexpected weather data' }, 502, NO_STORE);
  }

  const ttl = cacheSeconds(res.headers.get('expires'));
  return json({ ...summary, location: coords, source: SOURCE }, 200, {
    'Cache-Control': 'public, max-age=60',
    'Netlify-CDN-Cache-Control': `public, s-maxage=${ttl}, stale-while-revalidate=120`,
    'Netlify-Vary': 'query=lat|lon',
  });
}

export const config = { path: '/api/weather' };
