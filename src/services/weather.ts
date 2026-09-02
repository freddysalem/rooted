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

/// Stand-in weather source.
///
/// Swapping in a real feed is a drop-in replacement: anything that returns a
/// `WeatherSnapshot` works, and every screen above it stays identical. On the native
/// build this is where Apple's WeatherKit would sit; from Expo Go an HTTP forecast API
/// is the equivalent, and neither changes a line of UI.
export async function currentWeather(placeName = 'Your garden'): Promise<WeatherSnapshot> {
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
  };
}
