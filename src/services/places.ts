/// Looking a place up by name, for the demo switch.
///
/// Open-Meteo's geocoder, same provider as the forecast: no key, no account, CORS-enabled.
/// It hands back coordinates and an ISO country code, which is all the app needs - the
/// coordinates drive the weather and the country decides which crop library to show.

export interface Place {
  name: string;
  /** "Nairobi, Kenya" - what the tile shows. */
  label: string;
  latitude: number;
  longitude: number;
  /** ISO 3166-1 alpha-2, e.g. 'KE'. Absent if the geocoder did not say. */
  countryCode?: string;
}

const ENDPOINT = 'https://geocoding-api.open-meteo.com/v1/search';

export async function searchPlaces(query: string, limit = 6): Promise<Place[]> {
  const name = query.trim();
  if (name.length < 2) return [];

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);
  try {
    const url = `${ENDPOINT}?name=${encodeURIComponent(name)}&count=${limit}&language=en&format=json`;
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`geocoding ${response.status}`);
    const data = await response.json();
    const results: any[] = data.results ?? [];
    return results.map((r) => ({
      name: r.name,
      // The region line is what tells two Bristols apart.
      label: [r.name, r.admin1, r.country].filter(Boolean).join(', '),
      latitude: Number(r.latitude),
      longitude: Number(r.longitude),
      countryCode: r.country_code,
    }));
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}
