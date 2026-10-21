import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  licenceCheck, excludedCategory, stripHtml, cleanThumbUrl, photoProblems, photoRecord, assessment, rankHeroCandidates, validFocus,
} from '../scripts/lib/commons.js';
import { parseEntity, entitiesUrl } from '../scripts/lib/wikidata.js';

const meta = (over = {}) => ({
  License: { value: 'cc-by-sa-4.0' },
  LicenseShortName: { value: 'CC BY-SA 4.0' },
  LicenseUrl: { value: 'https://creativecommons.org/licenses/by-sa/4.0' },
  Artist: { value: '<a href="//commons.wikimedia.org/wiki/User:X">Jane &amp; Joe</a>' },
  Categories: { value: 'San Francisco skylines|Quality images' },
  DateTimeOriginal: { value: '2020-05-01 10:00' },
  ...over,
});
const info = (over = {}, m = {}) => ({
  mime: 'image/jpeg',
  width: 6000,
  height: 4000,
  thumburl: 'https://thumb.wikimedia.org/a/1920px-x.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo',
  thumbwidth: 1920,
  thumbheight: 1280,
  descriptionurl: 'https://commons.wikimedia.org/wiki/File:X.jpg',
  extmetadata: meta(m),
  ...over,
});

test('allowed licences: public domain, CC0, CC BY, CC BY-SA', () => {
  for (const code of ['cc0', 'pd', 'pd-old', 'pd-usgov', 'cc-by-2.5', 'cc-by-sa-3.0', 'cc-by-sa-4.0', 'cc-by-3.0-us', 'cc-by-sa-2.0-de']) {
    assert.ok(licenceCheck({ License: { value: code } }).ok, code);
  }
});

test('refused licences: NC, ND, GFDL-only, unknown', () => {
  for (const code of ['cc-by-nc-2.0', 'cc-by-nd-4.0', 'cc-by-nc-sa-3.0', 'gfdl', 'fal', '', 'copyrighted']) {
    assert.ok(!licenceCheck({ License: { value: code } }).ok, code);
  }
  assert.ok(!licenceCheck(undefined).ok);
});

test('excluded categories: maps, flags, seals, logos, collages', () => {
  assert.equal(excludedCategory('San Francisco skylines|Quality images'), null);
  assert.equal(excludedCategory('Maps of San Francisco|Skylines'), 'Maps of San Francisco');
  assert.ok(excludedCategory('Flags of California'));
  assert.ok(excludedCategory('Seals of cities in California'));
  assert.ok(excludedCategory('Logos'));
  assert.ok(excludedCategory('Photo collages of San Francisco'));
  assert.ok(excludedCategory('AI-generated images'));
  assert.equal(excludedCategory('Mapleton|Sealand Avenue'), null);
  assert.equal(excludedCategory('Seal Beach Municipal Pier|Seal Slough'), null);
  assert.ok(excludedCategory('Locator maps of cities in California'));
  assert.ok(excludedCategory('Photographs of flags of the United States in California'));
  assert.ok(excludedCategory('Culture of San Jose, California|Montages of California'));
  assert.ok(excludedCategory('Photomontages of Los Angeles'));
  assert.equal(excludedCategory(undefined), null);
});

test('HTML is stripped from author names', () => {
  assert.equal(stripHtml('<a href="x">Jane &amp; Joe</a>  <span>(talk)</span>'), 'Jane & Joe (talk)');
  assert.equal(stripHtml('<bdi>A&#39;s</bdi>'), "A's");
});

test('tracking parameters are removed from thumbnail URLs', () => {
  assert.equal(cleanThumbUrl('https://thumb.wikimedia.org/a/x.jpg?utm_source=a&utm_campaign=b&utm_content=c'), 'https://thumb.wikimedia.org/a/x.jpg');
  assert.equal(cleanThumbUrl('https://upload.wikimedia.org/a/x.jpg?keep=1&utm_source=a'), 'https://upload.wikimedia.org/a/x.jpg?keep=1');
});

test('photo problems', () => {
  assert.deepEqual(photoProblems(info()), []);
  assert.deepEqual(photoProblems(null), ['file not found on Commons']);
  assert.match(photoProblems(info({}, { License: { value: 'cc-by-nc-2.0' } })).join(), /licence/);
  assert.match(photoProblems(info({ mime: 'image/svg+xml' })).join(), /not a photo/);
  assert.match(photoProblems(info({}, { Artist: { value: '<span></span>' } })).join(), /no author/);
  assert.match(photoProblems(info({}, { Categories: { value: 'Maps of X' } })).join(), /excluded/);
  assert.match(photoProblems(info({ thumburl: undefined })).join(), /thumbnail/);
  assert.match(photoProblems(info(), 'File:SanJose Infobox Pic Montage.jpg').join(), /collage/);
  assert.match(photoProblems(info(), 'File:Laguna_Beach_photo_collage.jpg').join(), /collage/);
  assert.deepEqual(photoProblems(info(), 'File:Downtown San Jose.jpg'), []);
  assert.match(photoProblems(info(), 'File:CommerceMontageCA.jpg').join(), /collage/);
});

test('photo record has everything needed for the credit line', () => {
  const r = photoRecord('File:X.jpg', info());
  assert.equal(r.file, 'X.jpg');
  assert.equal(r.author, 'Jane & Joe');
  assert.equal(r.licence, 'CC BY-SA 4.0');
  assert.equal(r.licenceUrl, 'https://creativecommons.org/licenses/by-sa/4.0');
  assert.equal(r.page, 'https://commons.wikimedia.org/wiki/File:X.jpg');
  assert.equal(r.src, 'https://thumb.wikimedia.org/a/1920px-x.jpg');
  assert.equal(r.assessment, 'quality');
});

test('assessment levels', () => {
  assert.equal(assessment({ Assessments: { value: 'featured' } }), 'featured');
  assert.equal(assessment({ Assessments: { value: 'poty|featured|quality' } }), 'featured');
  assert.equal(assessment({ Categories: { value: 'A|Quality images|B' } }), 'quality');
  assert.equal(assessment({ Categories: { value: 'Valued images of bridges' } }), 'valued');
  assert.equal(assessment({ Categories: { value: 'Non-quality images' } }), null);
  assert.equal(assessment({}), null);
});

test('hero ranking: featured > quality > valued, then resolution, then year; landscape and wide only', () => {
  const item = (title, i, m) => ({ title, info: info(i, m) });
  const ranked = rankHeroCandidates([
    item('plain-huge', { width: 9000, height: 5000 }, { Categories: { value: 'Skylines' } }),
    item('quality-small', { width: 3000, height: 2000 }),
    item('featured', { width: 4000, height: 2500 }, { Assessments: { value: 'featured' } }),
    item('quality-big-old', { width: 6000, height: 4000 }, { DateTimeOriginal: { value: '2009' } }),
    item('quality-big-new', { width: 6000, height: 4000 }, { DateTimeOriginal: { value: '2021' } }),
    item('portrait', { width: 4000, height: 6000 }, { Assessments: { value: 'featured' } }),
    item('narrow', { width: 2000, height: 1000 }, { Assessments: { value: 'featured' } }),
    item('nc', {}, { Assessments: { value: 'featured' }, License: { value: 'cc-by-nc-2.0' } }),
    { title: 'missing', info: undefined },
  ]).map((c) => c.title);
  assert.deepEqual(ranked, ['featured', 'quality-big-new', 'quality-big-old', 'quality-small', 'plain-huge']);
});

test('focus point validation', () => {
  assert.ok(validFocus([0.5, 0.5]));
  assert.ok(validFocus([0, 1]));
  assert.ok(!validFocus([1.2, 0.5]));
  assert.ok(!validFocus([0.5]));
  assert.ok(!validFocus('0.5,0.5'));
});

test('wikidata entities: preferred claims, deprecated ignored, coordinates as [lon, lat]', () => {
  const snak = (value) => ({ mainsnak: { datavalue: { value } } });
  const e = parseEntity({
    id: 'Q1',
    labels: { en: { value: 'Bridge' } },
    descriptions: { en: { value: 'a bridge' } },
    claims: {
      P18: [{ ...snak('old.jpg'), rank: 'normal' }, { ...snak('best.jpg'), rank: 'preferred' }, { ...snak('bad.jpg'), rank: 'deprecated' }],
      P625: [{ ...snak({ latitude: 37.8199286, longitude: -122.4782551 }), rank: 'normal' }],
      P373: [{ ...snak('Bridges'), rank: 'normal' }],
    },
  });
  assert.deepEqual(e, { qid: 'Q1', label: 'Bridge', description: 'a bridge', image: 'best.jpg', images: ['best.jpg', 'old.jpg'], coords: [-122.47826, 37.81993], commonsCategory: 'Bridges' });
  assert.equal(parseEntity({ id: 'Q2', missing: '' }), null);
  assert.equal(parseEntity({ id: 'Q4', labels: { mul: { value: 'Campbell' } }, claims: {} }).label, 'Campbell');
  assert.equal(parseEntity({ id: 'Q3', claims: {} }).image, null);
  assert.throws(() => entitiesUrl(['Q1', 'X2']));
  assert.throws(() => entitiesUrl([]));
});
