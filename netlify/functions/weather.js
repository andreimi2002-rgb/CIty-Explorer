// GET /api/weather?lat=..&lon=.. — current weather from MET Norway, cached on Netlify's CDN
// until MET's Expires time so MET receives few requests.
import { parseCoords, metUrl, summarize, cacheSeconds, USER_AGENT, SOURCE } from '../lib/met.js';

const json = (body, status, headers = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', ...headers } });

const NO_STORE = { 'Cache-Control': 'no-store' };

export default async function handler(req) {
  const coords = parseCoords(new URL(req.url).searchParams);
  if (coords.error) return json({ error: coords.error }, 400, NO_STORE);

  let res;
  try {
    res = await fetch(metUrl(coords), { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(8000) });
  } catch (err) {
    return json({ error: 'weather service did not answer' }, 504, { 'Cache-Control': 'public, max-age=30' });
  }
  if (!res.ok) return json({ error: `weather service answered ${res.status}` }, 502, { 'Cache-Control': 'public, max-age=60' });

  let summary;
  try {
    summary = summarize(await res.json());
  } catch (err) {
    return json({ error: 'unexpected weather data' }, 502, { 'Cache-Control': 'public, max-age=60' });
  }

  const ttl = cacheSeconds(res.headers.get('expires'));
  return json({ ...summary, location: coords, source: SOURCE }, 200, {
    'Cache-Control': 'public, max-age=60',
    'Netlify-CDN-Cache-Control': `public, s-maxage=${ttl}, stale-while-revalidate=120`,
    'Netlify-Vary': 'query=lat|lon',
  });
}

export const config = { path: '/api/weather' };
