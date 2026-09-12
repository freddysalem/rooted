/// Regional crop knowledge. Kept apart from the app logic so a new region is a data
/// file, not a code change: name the native crops, name the ones worth saving, and give
/// the app a stand-in location for its weather when there is no GPS.

export type RegionId = 'uk' | 'kenya';

export interface Region {
  id: RegionId;
  label: string;
  /** ISO 3166-1 alpha-2 codes this library is written for. */
  countries: string[];
  /** One line on why growing here matters. */
  note: string;
  /** Where the weather comes from when location is off - and where the demo lands. */
  demoLocation: { name: string; latitude: number; longitude: number };
  nativeSpeciesIds: string[];
  /** Crops that are disappearing from plots and plates, and one line on why they matter. */
  atRisk: { speciesId: string; why: string }[];
}

export const REGIONS: Record<RegionId, Region> = {
  uk: {
    id: 'uk',
    label: 'Britain',
    countries: ['GB', 'IE', 'IM', 'JE', 'GG'],
    note: 'Britain grows only six in ten of its own dinners, and the share is falling. Every bed helps.',
    demoLocation: { name: 'Bristol', latitude: 51.4545, longitude: -2.5879 },
    nativeSpeciesIds: ['broadbean', 'kale', 'leek', 'apple', 'rhubarb', 'parsnip', 'blackcurrant', 'watercress', 'pea', 'blackberry'],
    atRisk: [
      { speciesId: 'skirret', why: 'A Tudor root vegetable, sweet and nutty, all but gone from British plots.' },
      { speciesId: 'goodkinghenry', why: 'Poor-man\'s asparagus. A perennial green that fed cottage gardens for centuries.' },
      { speciesId: 'seakale', why: 'Native to our shingle beaches and once forced in every kitchen garden.' },
      { speciesId: 'medlar', why: 'A medieval orchard fruit; a handful of old trees are all that is left.' },
      { speciesId: 'apple', why: 'Two thousand British varieties exist; supermarkets sell about ten.' },
    ],
  },
  kenya: {
    id: 'kenya',
    label: 'Kenya',
    countries: ['KE', 'UG', 'TZ'],
    note: 'In Kibera, more than eight in ten households are food insecure. Sack gardens already feed families; this is what to put in them.',
    demoLocation: { name: 'Nairobi', latitude: -1.2921, longitude: 36.8219 },
    nativeSpeciesIds: ['amaranth', 'spiderplant', 'africannightshade', 'cowpea', 'jutemallow', 'africaneggplant', 'pigeonpea', 'fingermillet', 'sweetpotato', 'collards'],
    atRisk: [
      { speciesId: 'spiderplant', why: 'Saga. Rich in iron and vitamin A, drought-hardy, and pushed off plates by exotic greens.' },
      { speciesId: 'africannightshade', why: 'Managu. One of a thousand indigenous African greens; only a handful are still widely grown.' },
      { speciesId: 'jutemallow', why: 'Mrenda. Seed is getting hard to find as it falls out of the market.' },
      { speciesId: 'cowpea', why: 'Kunde. Grown for its leaves as much as its beans, and increasingly neglected for both.' },
      { speciesId: 'fingermillet', why: 'A climate-resilient staple losing ground to maize.' },
    ],
  },
};

export const REGION_ORDER: RegionId[] = ['uk', 'kenya'];

/// Crops that belong in a Nairobi plot: the indigenous vegetables above, plus the
/// staples that are actually grown there. Everything not listed here is treated as a
/// temperate crop and only offered in Britain.
///
/// Kept as one editable list on purpose - adding a region should stay a data change.
export const KENYA_SPECIES: string[] = [
  // Indigenous leafy vegetables and pulses - the heart of the Kenyan library.
  'amaranth', 'spiderplant', 'africannightshade', 'cowpea', 'jutemallow',
  'africaneggplant', 'pigeonpea', 'fingermillet', 'sweetpotato', 'collards',
  'ethiopiankale', 'pumpkinleaf', 'cassava', 'arrowroot', 'moringa',
  // Staples and market crops grown across the Kenyan highlands.
  'corn', 'runnerbean', 'tomato', 'onion', 'garlic', 'carrot', 'cabbage', 'kale',
  'spinach', 'potato', 'pepper', 'pumpkin', 'courgette', 'cucumber', 'okra',
  'banana', 'avocado', 'mango', 'papaya', 'passionfruit', 'sugarcane', 'sorghum',
  'pearlmillet', 'sesame', 'basil', 'mint', 'rosemary', 'lemongrass', 'sunflower',
];

/// The indigenous crops that have no business appearing in a British sowing calendar -
/// their months are written for two rainy seasons, not for a British spring.
const KENYA_ONLY = new Set([
  'amaranth', 'spiderplant', 'africannightshade', 'cowpea', 'jutemallow',
  'africaneggplant', 'pigeonpea', 'fingermillet', 'ethiopiankale', 'pumpkinleaf',
  'cassava', 'arrowroot', 'moringa', 'sorghum', 'pearlmillet', 'sesame', 'lemongrass',
  'sugarcane', 'papaya', 'passionfruit', 'mango', 'okra', 'banana',
]);

const KENYA_SET = new Set(KENYA_SPECIES);

/// Is this crop worth offering to someone gardening in this region?
export function growsInRegion(speciesId: string, region: RegionId): boolean {
  return region === 'kenya' ? KENYA_SET.has(speciesId) : !KENYA_ONLY.has(speciesId);
}

/// Which library to use for a country. Unknown countries fall back to the nearest
/// region rather than showing nothing, and the caller is told it was a guess.
export function regionForCountry(countryCode?: string): RegionId | null {
  if (!countryCode) return null;
  const code = countryCode.toUpperCase();
  for (const region of Object.values(REGIONS)) {
    if (region.countries.includes(code)) return region.id;
  }
  return null;
}

/// Great-circle distance in kilometres, for picking the closest library when the
/// country is not one we have written a crop list for.
function distanceKm(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLon = toRad(bLon - aLon);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

export function nearestRegion(latitude: number, longitude: number): RegionId {
  let best: RegionId = 'uk';
  let bestKm = Infinity;
  for (const region of Object.values(REGIONS)) {
    const km = distanceKm(latitude, longitude, region.demoLocation.latitude, region.demoLocation.longitude);
    if (km < bestKm) { bestKm = km; best = region.id; }
  }
  return best;
}
