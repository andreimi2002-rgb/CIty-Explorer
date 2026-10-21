import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  polygons, countPoints, bbox, pointInPolygon, pointInGeometry, ringArea, mainPolygonBbox, roundGeometry, bboxContains, extendBbox,
} from '../js/geo.js';

const square = (x, y, s) => [[[x, y], [x + s, y], [x + s, y + s], [x, y + s], [x, y]]];
const big = square(0, 0, 10);
const island = square(30, 0, 1);
const multi = { type: 'MultiPolygon', coordinates: [island, big] };
const withHole = [big[0], [[4, 4], [6, 4], [6, 6], [4, 6], [4, 4]]];

test('polygons and counts', () => {
  assert.equal(polygons({ type: 'Polygon', coordinates: big }).length, 1);
  assert.equal(polygons(multi).length, 2);
  assert.deepEqual(polygons({ type: 'Point', coordinates: [0, 0] }), []);
  assert.deepEqual(polygons(null), []);
  assert.equal(countPoints(multi), 10);
});

test('bbox of a geometry', () => {
  assert.deepEqual(bbox(multi), [0, 0, 31, 10]);
});

test('point in polygon, holes excluded', () => {
  assert.ok(pointInPolygon([5, 1], big));
  assert.ok(!pointInPolygon([11, 1], big));
  assert.ok(!pointInPolygon([5, 5], withHole));
  assert.ok(pointInPolygon([2, 2], withHole));
  assert.ok(pointInGeometry([30.5, 0.5], multi));
  assert.ok(!pointInGeometry([20, 5], multi));
});

test('ring area', () => {
  assert.equal(ringArea(big[0]), 100);
  assert.equal(ringArea([...big[0]].reverse()), 100);
});

test('map framing uses the polygon with the reference point, otherwise the largest', () => {
  assert.deepEqual(mainPolygonBbox(multi, [5, 5]), [0, 0, 10, 10]);
  assert.deepEqual(mainPolygonBbox(multi, [30.5, 0.5]), [30, 0, 31, 1]);
  assert.deepEqual(mainPolygonBbox(multi, [100, 100]), [0, 0, 10, 10]);
  assert.deepEqual(mainPolygonBbox(multi, null), [0, 0, 10, 10]);
  assert.equal(mainPolygonBbox({ type: 'Point', coordinates: [0, 0] }), null);
});

test('rounding coordinates', () => {
  const g = roundGeometry({ type: 'Polygon', coordinates: [[[1.123456789, 2.987654321], [0, 0], [1, 1], [1.123456789, 2.987654321]]] }, 5);
  assert.deepEqual(g.coordinates[0][0], [1.12346, 2.98765]);
  const m = roundGeometry({ type: 'MultiPolygon', coordinates: [[[[1.000004, 2.000006], [0, 0], [1, 1], [1.000004, 2.000006]]]] });
  assert.deepEqual(m.coordinates[0][0][0], [1, 2.00001]);
});

test('extending a bbox with places', () => {
  assert.deepEqual(extendBbox([0, 0, 10, 10], [[12, 5], null, [-1, 11]]), [-1, 0, 12, 11]);
  assert.deepEqual(extendBbox([0, 0, 10, 10], []), [0, 0, 10, 10]);
});

test('bbox containment with tolerance', () => {
  assert.ok(bboxContains([0, 0, 10, 10], [1, 1, 9, 9]));
  assert.ok(!bboxContains([0, 0, 10, 10], [1, 1, 10.1, 9]));
  assert.ok(bboxContains([0, 0, 10, 10], [1, 1, 10.04, 9], 0.05));
});
