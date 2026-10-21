// MET Norway symbol codes (icons/weather/legend.csv) and their i18n keys. A symbol_code is
// "<code>" or "<code>_day|_night|_polartwilight"; the icon file is "<symbol_code>.svg".
export const WEATHER_SYMBOL_KEYS = {
  clearsky: 'weather.symbol.clearsky',
  fair: 'weather.symbol.fair',
  partlycloudy: 'weather.symbol.partlycloudy',
  cloudy: 'weather.symbol.cloudy',
  lightrainshowers: 'weather.symbol.lightrainshowers',
  rainshowers: 'weather.symbol.rainshowers',
  heavyrainshowers: 'weather.symbol.heavyrainshowers',
  lightrainshowersandthunder: 'weather.symbol.lightrainshowersandthunder',
  rainshowersandthunder: 'weather.symbol.rainshowersandthunder',
  heavyrainshowersandthunder: 'weather.symbol.heavyrainshowersandthunder',
  lightsleetshowers: 'weather.symbol.lightsleetshowers',
  sleetshowers: 'weather.symbol.sleetshowers',
  heavysleetshowers: 'weather.symbol.heavysleetshowers',
  lightssleetshowersandthunder: 'weather.symbol.lightssleetshowersandthunder',
  sleetshowersandthunder: 'weather.symbol.sleetshowersandthunder',
  heavysleetshowersandthunder: 'weather.symbol.heavysleetshowersandthunder',
  lightsnowshowers: 'weather.symbol.lightsnowshowers',
  snowshowers: 'weather.symbol.snowshowers',
  heavysnowshowers: 'weather.symbol.heavysnowshowers',
  lightssnowshowersandthunder: 'weather.symbol.lightssnowshowersandthunder',
  snowshowersandthunder: 'weather.symbol.snowshowersandthunder',
  heavysnowshowersandthunder: 'weather.symbol.heavysnowshowersandthunder',
  lightrain: 'weather.symbol.lightrain',
  rain: 'weather.symbol.rain',
  heavyrain: 'weather.symbol.heavyrain',
  lightrainandthunder: 'weather.symbol.lightrainandthunder',
  rainandthunder: 'weather.symbol.rainandthunder',
  heavyrainandthunder: 'weather.symbol.heavyrainandthunder',
  lightsleet: 'weather.symbol.lightsleet',
  sleet: 'weather.symbol.sleet',
  heavysleet: 'weather.symbol.heavysleet',
  lightsleetandthunder: 'weather.symbol.lightsleetandthunder',
  sleetandthunder: 'weather.symbol.sleetandthunder',
  heavysleetandthunder: 'weather.symbol.heavysleetandthunder',
  lightsnow: 'weather.symbol.lightsnow',
  snow: 'weather.symbol.snow',
  heavysnow: 'weather.symbol.heavysnow',
  lightsnowandthunder: 'weather.symbol.lightsnowandthunder',
  snowandthunder: 'weather.symbol.snowandthunder',
  heavysnowandthunder: 'weather.symbol.heavysnowandthunder',
  fog: 'weather.symbol.fog',
};

/** { code, key, icon } for a MET symbol_code, or null if unknown. */
export function weatherSymbol(symbolCode) {
  if (typeof symbolCode !== 'string' || !/^[a-z]+(_(day|night|polartwilight))?$/.test(symbolCode)) return null;
  const code = symbolCode.split('_')[0];
  const key = WEATHER_SYMBOL_KEYS[code];
  return key ? { code, key, icon: `/icons/weather/${symbolCode}.svg` } : null;
}
