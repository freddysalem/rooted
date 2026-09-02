/// Private, collectible, tied to a real growing milestone. Deliberately not a
/// leaderboard - nobody should feel behind because their neighbour has a bigger plot.
export interface Badge {
  id: string;
  name: string;
  blurb: string;
  /** Ionicons name. */
  icon: string;
}

export const BADGES: Badge[] = [
  { id: 'first_sprout', name: 'First Sprout', blurb: 'You planted your very first thing.', icon: 'leaf' },
  { id: 'five_plants', name: 'Green Fingers', blurb: 'Five plants in the ground at once.', icon: 'hand-left' },
  { id: 'full_plot', name: 'Full Plot', blurb: 'Every bed in the allotment is planted.', icon: 'grid' },
  { id: 'faithful', name: 'Faithful', blurb: 'Twenty waterings logged.', icon: 'water' },
  { id: 'harvest', name: 'Harvest Day', blurb: 'Grew something all the way to ready.', icon: 'basket' },
  { id: 'measured', name: 'Tape Measure', blurb: 'Recorded three heights for one plant.', icon: 'resize' },
  { id: 'sun_seeker', name: 'Sun Seeker', blurb: 'Surveyed a spot with the sun tool.', icon: 'sunny' },
  { id: 'variety', name: 'Mixed Bed', blurb: 'Growing four different families at once.', icon: 'flower' },
  { id: 'winter', name: 'Winter Grower', blurb: 'Kept something alive through December.', icon: 'snow' },
  { id: 'pollinator', name: 'Bee Friendly', blurb: 'Planted something the pollinators need.', icon: 'bug' },
];

export const badgeById = (id: string) => BADGES.find((b) => b.id === id);
