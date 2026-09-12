import { Planting, progressOf } from './planting';
import { SPECIES, speciesById } from './species';

/// A medal per crop, earned by growing it rather than by collecting it.
///
/// Basic for getting it in the ground, bronze once it is up, silver once it is properly
/// growing, gold when you took it all the way to harvest. After that the gold counts:
/// grow three strawberries to harvest and the medal reads Gold 3.
///
/// Only the highest tier is ever shown. Nobody wants a shelf of bronze medals for a crop
/// they have since taken to gold - the medal is a statement about the best you have done
/// with that plant, not a log of every attempt.

export type MedalTier = 'basic' | 'bronze' | 'silver' | 'gold';

export const TIER_ORDER: MedalTier[] = ['basic', 'bronze', 'silver', 'gold'];

export const tierLabel: Record<MedalTier, string> = {
  basic: 'Basic',
  bronze: 'Bronze',
  silver: 'Silver',
  gold: 'Gold',
};

export const tierBlurb: Record<MedalTier, string> = {
  basic: 'In the ground',
  bronze: 'Up and sprouting',
  silver: 'Growing well',
  gold: 'Grown to harvest',
};

/// Medal colours. Deliberately metallic rather than the app's greens, so a shelf of them
/// reads as a shelf of medals.
export const tierColour: Record<MedalTier, { face: string; rim: string; ink: string }> = {
  basic: { face: '#DDE3DA', rim: '#C2CCBE', ink: '#4A5548' },
  bronze: { face: '#D9A272', rim: '#B57F4E', ink: '#5B3A1C' },
  silver: { face: '#D6DCE2', rim: '#AEB8C2', ink: '#3E4750' },
  gold: { face: '#EFC65A', rim: '#CFA22F', ink: '#5C4310' },
};

/// What one planting has earned so far, from how far it has got.
export function tierForProgress(progress: number): MedalTier {
  if (progress >= 0.95) return 'gold';
  if (progress >= 0.3) return 'silver';
  if (progress >= 0.08) return 'bronze';
  return 'basic';
}

export function isAtLeast(tier: MedalTier, floor: MedalTier): boolean {
  return TIER_ORDER.indexOf(tier) >= TIER_ORDER.indexOf(floor);
}

/// The stored half: kept because pulling a plant up must not delete the fact that you
/// once grew it. `goldIds` holds the plantings that made it, so three separate
/// strawberry plants count three times and one plant cannot count twice.
export interface MedalRecord {
  best: MedalTier;
  goldIds: string[];
}

export type MedalBook = Record<string, MedalRecord>;

/// Fold the current plot into what is already recorded. Never downgrades: a medal is
/// the best you have done with that crop.
export function updateMedals(book: MedalBook, plantings: Planting[]): MedalBook {
  let changed = false;
  const next: MedalBook = { ...book };

  for (const planting of plantings) {
    const tier = tierForProgress(progressOf(planting));
    const current = next[planting.speciesID] ?? { best: 'basic', goldIds: [] };
    const best = isAtLeast(tier, current.best) ? tier : current.best;
    const goldIds = tier === 'gold' && !current.goldIds.includes(planting.id)
      ? [...current.goldIds, planting.id]
      : current.goldIds;

    if (best !== current.best || goldIds.length !== current.goldIds.length || !next[planting.speciesID]) {
      next[planting.speciesID] = { best, goldIds };
      changed = true;
    }
  }

  return changed ? next : book;
}

export interface Medal {
  speciesId: string;
  name: string;
  tier: MedalTier;
  /** Only meaningful at gold: how many of this crop you have taken all the way. */
  count: number;
}

/// Every medal earned, best first. Gold with the highest count leads.
export function medalsFrom(book: MedalBook): Medal[] {
  return Object.entries(book)
    .map(([speciesId, record]) => ({
      speciesId,
      name: speciesById(speciesId).name,
      tier: record.best,
      count: record.goldIds.length,
    }))
    .sort((a, b) => {
      const byTier = TIER_ORDER.indexOf(b.tier) - TIER_ORDER.indexOf(a.tier);
      if (byTier !== 0) return byTier;
      if (b.count !== a.count) return b.count - a.count;
      return a.name.localeCompare(b.name);
    });
}

/// How a medal is written on the shelf: "Gold 3" once there is more than one.
export function medalLabel(medal: Medal): string {
  if (medal.tier === 'gold' && medal.count > 1) return `Gold ${medal.count}`;
  return tierLabel[medal.tier];
}

/// Crops with no medal yet, counted rather than listed - the point of the tile above the
/// shelf is "there is more to grow", not a checklist of 165 things you have not done.
export function cropsLeft(book: MedalBook, inRegion: (speciesId: string) => boolean): number {
  return SPECIES.filter((species) => inRegion(species.id) && !book[species.id]).length;
}
