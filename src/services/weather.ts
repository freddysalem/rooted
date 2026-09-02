export type WeatherCondition = 'clear' | 'partlyCloudy' | 'cloudy' | 'rain' | 'storm' | 'frost';

export interface WeatherSnapshot {
  temperatureC: number;
  highC: number;
  lowC: number;
  condition: WeatherCondition;
  /** Millimetres in the last 24 hours. */
  rainfallLast24h: number;
  willRainToday: boolean;
  placeName: string;
  /** Set when this came from the stand-in model rather than a live feed. */
  simulated?: boolean;
}

export const conditionLabel: Record<WeatherCondition, string> = {
  clear: 'Clear',
  partlyCloudy: 'Partly cloudy',
  cloudy: 'Overcast',
  rain: 'Rain',
  storm: 'Storm',
  frost: 'Frost',
};

/** Ionicons names. */
export const conditionIcon: Record<WeatherCondition, string> = {
  clear: 'sunny',
  partlyCloudy: 'partly-sunny',
  cloudy: 'cloud',
  rain: 'rainy',
  storm: 'thunderstorm',
  frost: 'snow',
};

/// Warnings worth pushing at the user, per the heat/storm alert idea.
export function conditionAlert(condition: WeatherCondition): string | null {
  if (condition === 'storm') return 'Storm forecast - stake anything tall and move pots against a wall.';
  if (condition === 'frost') return 'Frost tonight - fleece the tender plants or bring them in.';
  return null;
}

/// Deterministic 0-1 from a seed, so the weather does not flicker on every redraw.
function pseudoRandom(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

/// Stand-in weather: a rough British year. Used when there are no coordinates (no
/// location permission, or the web build) and when the live feed fails.
export async function simulatedWeather(placeName = 'Your garden'): Promise<WeatherSnapshot> {
  const now = new Date();
  const month = now.getMonth() + 1;
  const startOfYear = new Date(now.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((now.getTime() - startOfYear.getTime()) / 86400000);

  // A rough British year: cold and wet at the ends, mild and brighter in the middle.
  const seasonal = -Math.cos((dayOfYear / 365) * 2 * Math.PI); // -1 in January, +1 in July
  const baseHigh = 11.5 + seasonal * 8;
  const jitter = pseudoRandom(dayOfYear); // stable for a whole day

  const highC = baseHigh + (jitter - 0.5) * 6;
  const lowC = highC - (4 + jitter * 4);
  const temperatureC = lowC + (highC - lowC) * 0.7;

  const wetness = jitter * (month <= 3 || month >= 10 ? 1.5 : 0.85);
  const rainfallLast24h = wetness > 0.62 ? (wetness - 0.62) * 22 : 0;

  let condition: WeatherCondition;
  if (lowC <= 0.5) condition = 'frost';
  else if (wetness > 0.9) condition = 'storm';
  else if (rainfallLast24h > 0) condition = 'rain';
  else if (wetness > 0.45) condition = 'cloudy';
  else if (wetness > 0.25) condition = 'partlyCloudy';
  else condition = 'clear';

  return {
    temperatureC,
    highC,
    lowC,
    condition,
    rainfallLast24h,
    willRainToday: rainfallLast24h > 0.5,
    placeName,
    simulated: true,
  };
}

/// WMO weather codes, as Open-Meteo reports them.
function conditionFromCode(code: number, lowC: number): WeatherCondition {
  if (lowC <= 0.5) return 'frost';
  if (code >= 95) return 'storm';
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'frost';
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return 'rain';
  if (code === 3 || code === 45 || code === 48) return 'cloudy';
  if (code === 1 || code === 2) return 'partlyCloudy';
  return 'clear';
}

/// Live weather from Open-Meteo (open-meteo.com): no key, no account, free for
/// non-commercial use. With coordinates it fetches the real forecast; without them, or
/// if the request fails or takes more than six seconds, it falls back to the simulation,
/// so every screen above always gets a snapshot.
export async function currentWeather(opts: {
  latitude?: number;
  longitude?: number;
  placeName?: string;
} = {}): Promise<WeatherSnapshot> {
  const { latitude, longitude } = opts;
  const placeName = opts.placeName ?? 'Your garden';
  if (latitude === undefined || longitude === undefined) return simulatedWeather(placeName);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);
  try {
    const url =
      'https://api.open-meteo.com/v1/forecast' +
      `?latitude=${latitude.toFixed(3)}&longitude=${longitude.toFixed(3)}` +
      '&current=temperature_2m,precipitation,weather_code,is_day' +
      '&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code' +
      '&past_days=1&forecast_days=2&timezone=auto';
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`open-meteo ${response.status}`);
    const data = await response.json();
    // With past_days=1, index 0 is yesterday and index 1 is today.
    const highC = Number(data.daily.temperature_2m_max[1]);
    const lowC = Number(data.daily.temperature_2m_min[1]);
    const rainfallLast24h = Number(data.daily.precipitation_sum[0] ?? 0);
    const rainToday = Number(data.daily.precipitation_sum[1] ?? 0);
    return {
      temperatureC: Number(data.current.temperature_2m),
      highC,
      lowC,
      condition: conditionFromCode(Number(data.current.weather_code), lowC),
      rainfallLast24h,
      willRainToday: rainToday > 0.5,
      placeName,
    };
  } catch {
    return simulatedWeather(placeName);
  } finally {
    clearTimeout(timer);
  }
}
