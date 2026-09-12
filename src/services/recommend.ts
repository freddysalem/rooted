import { Species } from '../models/species';
import { RegionId, growsInRegion } from '../models/regions';
import { CONTAINERS } from './water';

/// What this plant would rather have.
///
/// The planting sheet asks two questions - how much soil, and under a roof or not - and
/// most people have no idea what the right answer is for a parsnip. So the app answers
/// them, marks its answer "recommended", and lets you choose something else anyway.
///
/// Everything here comes from data already in the catalogue: how tall the plant gets,
/// how thirsty it is, and whether the crop belongs to the region you are gardening in.
/// Nothing is invented, and where the app does not know, it says nothing.

export interface Recommendation {
  /** Id from CONTAINERS. */
  containerId: string;
  indoors: boolean;
  /** One sentence, shown under the choice. */
  why: string;
}

/// Root room, by how big the thing gets. A parsnip in a yoghurt pot is a parsnip you
/// will not be eating.
export function recommendedContainer(species: Species): string {
  const height = species.matureHeightCm;
  if (species.family === 'tree' || species.family === 'cane' || height >= 150) return 'bed';
  if (species.family === 'root' && height >= 40) return 'bed';
  if (height >= 80) return 'sack';
  if (height >= 45) return 'potLarge';
  if (height >= 25) return 'potMedium';
  return 'potSmall';
}

/// Under a roof or open to the sky. Only two things move this: a crop from a much warmer
/// climate being grown in a temperate one, and a plant that needs full sun, which will
/// always do better outside than on a windowsill.
export function recommendedIndoors(species: Species, region: RegionId): boolean {
  // A tropical crop in a British garden wants the greenhouse or the windowsill.
  const outOfPlace = region === 'uk' && !growsInRegion(species.id, 'uk');
  return outOfPlace;
}

export function recommendationFor(species: Species, region: RegionId): Recommendation {
  const containerId = recommendedContainer(species);
  const indoors = recommendedIndoors(species, region);
  const container = CONTAINERS.find((c) => c.id === containerId);

  const size = species.matureHeightCm >= 150
    ? `${species.name} gets to about ${species.matureHeightCm}cm, so it needs the room`
    : species.matureHeightCm <= 25
      ? `${species.name} stays small, so a small pot is plenty`
      : `${species.name} reaches about ${species.matureHeightCm}cm`;

  const roof = indoors
    ? 'It is not a British outdoor crop, so a greenhouse or a bright windowsill will do far better than a bed.'
    : 'Outdoors, where the rain can help.';

  return {
    containerId,
    indoors,
    why: `${size} - ${container?.label.toLowerCase() ?? 'open ground'}. ${roof}`,
  };
}
