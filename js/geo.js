// Small GeoJSON helpers (Polygon / MultiPolygon, [lon, lat]). Pure, shared by the browser and the offline scripts.

/** The polygons of a geometry as a list of ring arrays. */
export function polygons(geometry) {
  if (!geometry) return [];
  if (geometry.type === 'Polygon') return [geometry.coordinates];
  if (geometry.type === 'MultiPolygon') return geometry.coordinates;
  return [];
}

export function countPoints(geometry) {
  return polygons(geometry).reduce((n, poly) => n + poly.reduce((m, ring) => m + ring.length, 0), 0);
}

/** [minLon, minLat, maxLon, maxLat] of a geometry or of one polygon's rings. */
export function bbox(geometryOrRings) {
  const rings = Array.isArray(geometryOrRings) ? geometryOrRings : polygons(geometryOrRings).flat();
  let b = [Infinity, Infinity, -Infinity, -Infinity];
  for (const ring of rings) {
    for (const [x, y] of ring) b = [Math.min(b[0], x), Math.min(b[1], y), Math.max(b[2], x), Math.max(b[3], y)];
  }
  return b;
}

/** Ray casting on one ring. */
function inRing([x, y], ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** True when the point is inside a polygon (outer ring) and not in one of its holes. */
export function pointInPolygon(point, polygonRings) {
  const [outer, ...holes] = polygonRings;
  return inRing(point, outer) && !holes.some((h) => inRing(point, h));
}

export function pointInGeometry(point, geometry) {
  return polygons(geometry).some((p) => pointInPolygon(point, p));
}

/** Planar area of the outer ring in squared degrees; only used to compare polygons of one city. */
export function ringArea(ring) {
  let a = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) a += (ring[j][0] + ring[i][0]) * (ring[j][1] - ring[i][1]);
  return Math.abs(a / 2);
}

/**
 * Bounding box to frame a city on the map: the polygon containing the reference point,
 * otherwise the largest polygon. Keeps far-away islands (e.g. the Farallons) from shrinking the city.
 */
export function mainPolygonBbox(geometry, point) {
  const polys = polygons(geometry);
  if (!polys.length) return null;
  const hit = point && polys.find((p) => pointInPolygon(point, p));
  const main = hit || polys.reduce((a, b) => (ringArea(b[0]) > ringArea(a[0]) ? b : a));
  return bbox(main);
}

/** Rounds every coordinate (5 decimals is about 1 m). */
export function roundGeometry(geometry, decimals = 5) {
  const f = 10 ** decimals;
  const r = (v) => Math.round(v * f) / f;
  return {
    type: geometry.type,
    coordinates:
      geometry.type === 'Polygon'
        ? geometry.coordinates.map((ring) => ring.map(([x, y]) => [r(x), r(y)]))
        : geometry.coordinates.map((poly) => poly.map((ring) => ring.map(([x, y]) => [r(x), r(y)]))),
  };
}

/** Grows a bbox to include the given [lon, lat] points (null points are ignored). */
export function extendBbox(box, points) {
  return points
    .filter(Boolean)
    .reduce((b, [x, y]) => [Math.min(b[0], x), Math.min(b[1], y), Math.max(b[2], x), Math.max(b[3], y)], box);
}

export function bboxContains(outer, inner, tolerance = 0) {
  return (
    inner[0] >= outer[0] - tolerance &&
    inner[1] >= outer[1] - tolerance &&
    inner[2] <= outer[2] + tolerance &&
    inner[3] <= outer[3] + tolerance
  );
}
