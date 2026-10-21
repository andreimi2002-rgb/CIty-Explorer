// i18n keys of fact labels, spelled out so tests can check them.
export const FACT_LABEL_KEYS = {
  'population.census2020': 'fact.population.census2020',
  'population.estimate2025': 'fact.population.estimate2025',
  'population.base2020': 'fact.population.base2020',
  'population.change': 'fact.population.change',
  'area.land2025': 'fact.area.land2025',
  'area.water2025': 'fact.area.water2025',
  'area.land2020': 'fact.area.land2020',
  'density.2020': 'fact.density.2020',
  'density.2025': 'fact.density.2025',
  elevation: 'fact.elevation',
  timezone: 'fact.timezone',
  'acs.medianHouseholdIncome': 'fact.acs.medianHouseholdIncome',
  'acs.medianHomeValue': 'fact.acs.medianHomeValue',
  'acs.bachelorsOrHigher': 'fact.acs.bachelorsOrHigher',
  'acs.foreignBorn': 'fact.acs.foreignBorn',
  'acs.poverty': 'fact.acs.poverty',
  'acs.meanCommute': 'fact.acs.meanCommute',
  'climate.monthly': 'fact.climate.monthly',
  'climate.annual': 'fact.climate.annual',
  'climate.station': 'fact.climate.station',
  'climate.stationDistance': 'fact.climate.stationDistance',
  referencePoint: 'fact.referencePoint',
};

/** Human period: "2025-07-01" -> "July 1, 2025"; ranges and plain years unchanged. */
export function formatPeriod(period, locale = 'en-US') {
  if (!period) return null;
  const day = (iso) =>
    new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${iso}T00:00:00Z`));
  if (/^\d{4}-\d{2}-\d{2}$/.test(period)) return day(period);
  const range = period.match(/^(\d{4}-\d{2}-\d{2})\/(\d{4}-\d{2}-\d{2})$/);
  if (range) return `${day(range[1])} – ${day(range[2])}`;
  return period;
}
