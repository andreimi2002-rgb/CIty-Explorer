import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { read } from './helpers.js';
import { parseCoords, metUrl, summarize, cacheSeconds, USER_AGENT } from '../netlify/lib/met.js';
import handler, { config } from '../netlify/functions/weather.js';

const fixture = JSON.parse(read('tests/fixtures/met-compact.json'));
const realFetch = globalThis.fetch;
afterEach(() => (globalThis.fetch = realFetch));

const params = (q) => new URLSearchParams(q);

test('coordinates: required, numeric, in range, at most 4 decimals', () => {
  assert.deepEqual(parseCoords(params('lat=37.745963&lon=-122.456631')), { lat: 37.746, lon: -122.4566 });
  assert.match(parseCoords(params('lat=37')).error, /required/);
  assert.match(parseCoords(params('lat=&lon=1')).error, /required/);
  assert.match(parseCoords(params('lat=abc&lon=1')).error, /numbers/);
  assert.match(parseCoords(params('lat=91&lon=1')).error, /range/);
  assert.match(parseCoords(params('lat=1&lon=-181')).error, /range/);
  assert.equal(metUrl({ lat: 37.746, lon: -122.4566 }), 'https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=37.746&lon=-122.4566');
});

test('summary of a real MET response', () => {
  const first = Date.parse(fixture.properties.timeseries[0].time);
  const s = summarize(fixture, first + 10 * 60 * 1000);
  assert.equal(s.time, fixture.properties.timeseries[0].time);
  assert.equal(s.temperatureC, fixture.properties.timeseries[0].data.instant.details.air_temperature);
  assert.equal(s.updatedAt, fixture.properties.meta.updated_at);
  assert.match(s.symbol, /^[a-z]+(_(day|night|polartwilight))?$/);
  assert.ok(s.windSpeedMs >= 0);
});

test('summary picks the step that has started', () => {
  const second = Date.parse(fixture.properties.timeseries[1].time);
  assert.equal(summarize(fixture, second + 1000).time, fixture.properties.timeseries[1].time);
  assert.equal(summarize(fixture, 0).time, fixture.properties.timeseries[0].time);
});

test('summary refuses broken responses', () => {
  assert.throws(() => summarize({}), /timeseries/);
  assert.throws(() => summarize({ properties: { timeseries: [{ time: 'x', data: {} }] } }), /temperature/);
});

test('cache time follows Expires within limits', () => {
  const now = Date.parse('2026-10-21T13:00:00Z');
  assert.equal(cacheSeconds('Wed, 21 Oct 2026 13:30:00 GMT', now), 1800);
  assert.equal(cacheSeconds('Wed, 21 Oct 2026 13:00:10 GMT', now), 60);
  assert.equal(cacheSeconds('Wed, 21 Oct 2026 16:00:00 GMT', now), 3600);
  assert.equal(cacheSeconds(null, now), 600);
  assert.equal(cacheSeconds('garbage', now), 600);
});

test('function: path, User-Agent, success with CDN cache headers', async () => {
  assert.equal(config.path, '/api/weather');
  let seen;
  globalThis.fetch = async (url, init) => {
    seen = { url, ua: init.headers['User-Agent'] };
    return new Response(JSON.stringify(fixture), { status: 200, headers: { Expires: new Date(Date.now() + 1200e3).toUTCString() } });
  };
  const res = await handler(new Request('https://x.test/api/weather?lat=37.74596&lon=-122.45663'));
  assert.equal(res.status, 200);
  assert.equal(seen.url, 'https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=37.746&lon=-122.4566');
  assert.equal(seen.ua, USER_AGENT);
  assert.match(res.headers.get('netlify-cdn-cache-control'), /s-maxage=1(19\d|200)\b/);
  assert.equal(res.headers.get('netlify-vary'), 'query=lat|lon');
  const body = await res.json();
  assert.equal(typeof body.temperatureC, 'number');
  assert.deepEqual(body.location, { lat: 37.746, lon: -122.4566 });
  assert.equal(body.source.licence, 'CC BY 4.0');
});

test('function: bad input is refused without calling MET', async () => {
  globalThis.fetch = async () => assert.fail('MET must not be called');
  const res = await handler(new Request('https://x.test/api/weather?lat=abc&lon=1'));
  assert.equal(res.status, 400);
  assert.equal(res.headers.get('cache-control'), 'no-store');
});

test('function: MET errors become 502/504 and are not cached', async () => {
  globalThis.fetch = async () => new Response('busy', { status: 503 });
  let res = await handler(new Request('https://x.test/api/weather?lat=1&lon=1'));
  assert.equal(res.status, 502);
  assert.match((await res.json()).error, /503/);

  globalThis.fetch = async () => new Response('<html>', { status: 200 });
  res = await handler(new Request('https://x.test/api/weather?lat=1&lon=1'));
  assert.equal(res.status, 502);

  globalThis.fetch = async () => {
    throw new Error('timeout');
  };
  res = await handler(new Request('https://x.test/api/weather?lat=1&lon=1'));
  assert.equal(res.status, 504);
  assert.equal(res.headers.get('cache-control'), 'no-store');
});

test('function: one retry after a timeout, a 5xx or a 429; none after a 4xx', async () => {
  const run = async (answers) => {
    let calls = 0;
    globalThis.fetch = async () => {
      const a = answers[calls++];
      if (a === 'throw') throw new Error('timeout');
      return a === 200 ? new Response(JSON.stringify(fixture), { status: 200 }) : new Response('x', { status: a });
    };
    const res = await handler(new Request('https://x.test/api/weather?lat=1&lon=1'));
    return { status: res.status, calls };
  };
  assert.deepEqual(await run(['throw', 200]), { status: 200, calls: 2 });
  assert.deepEqual(await run([503, 200]), { status: 200, calls: 2 });
  assert.deepEqual(await run([429, 429]), { status: 502, calls: 2 });
  assert.deepEqual(await run(['throw', 'throw']), { status: 504, calls: 2 });
  assert.deepEqual(await run([404]), { status: 502, calls: 1 });
  assert.deepEqual(await run([200]), { status: 200, calls: 1 });
});
