// Time zone of a point from timezone-boundary-builder polygons. Pure.
import { bbox, bboxIntersects, pointInGeometry } from '../../js/geo.js';

export const TZ_RELEASE = '2026e';
export const TZ_URL = `https://github.com/evansiroky/timezone-boundary-builder/releases/download/${TZ_RELEASE}/timezones.geojson.zip`;

/** Keeps only the zones that overlap an area (e.g. a state's bbox), with their own bbox for speed. */
export function zonesIn(featureCollection, area) {
  return featureCollection.features
    .map((f) => ({ tzid: f.properties.tzid, geometry: f.geometry, box: bbox(f.geometry) }))
    .filter((z) => bboxIntersects(z.box, area));
}

/** IANA time zone id containing [lon, lat], or null. */
export function zoneAt(zones, point) {
  const [x, y] = point;
  const hit = zones.find((z) => x >= z.box[0] && x <= z.box[2] && y >= z.box[1] && y <= z.box[3] && pointInGeometry(point, z.geometry));
  return hit ? hit.tzid : null;
}
