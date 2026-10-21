// The reference point of a city: GNIS Populated Place, otherwise the Census internal point of its boundary.
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, readJson } from './files.js';

export function referencePoint(state, city) {
  if (city.point) return city.point;
  const path = `data/boundaries/${state}/${city.slug}.geojson`;
  if (!existsSync(join(ROOT, path))) return null;
  const [lon, lat] = readJson(path).properties.internalPoint;
  return { lon, lat, source: 'census-internal-point' };
}
