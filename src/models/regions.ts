/// Regional crop knowledge. Kept apart from the app logic so a new region is a data
/// file, not a code change: name the native crops, name the ones worth saving, and give
/// the app a stand-in location for its weather when there is no GPS.

export type RegionId = 'uk' | 'kenya';

export interface Region {
  id: RegionId;
  label: string;
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
