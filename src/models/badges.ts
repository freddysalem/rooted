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
  { id: 'first_sprout', name: 'First Sprout', blurb: 'Your first plant in the ground.', icon: 'leaf' },
  { id: 'five_plants', name: 'Green Fingers', blurb: 'Five plants in the ground at once.', icon: 'hand-left' },
  { id: 'full_plot', name: 'Full Plot', blurb: 'Twelve plants in the ground at once.', icon: 'grid' },
  { id: 'faithful', name: 'Faithful', blurb: 'Twenty waterings logged.', icon: 'water' },
  { id: 'harvest', name: 'Harvest Day', blurb: 'Grew something all the way to harvest.', icon: 'basket' },
  { id: 'measured', name: 'Tape Measure', blurb: 'Recorded three heights for one plant.', icon: 'resize' },
  { id: 'sun_seeker', name: 'Sun Seeker', blurb: 'Measured a spot on Sun spot.', icon: 'sunny' },
  { id: 'variety', name: 'Mixed Bed', blurb: 'Growing four different kinds of plant at once.', icon: 'flower' },
  { id: 'winter', name: 'Winter Grower', blurb: 'Kept something alive through December.', icon: 'snow' },
  { id: 'pollinator', name: 'Bee Friendly', blurb: 'Planted something the pollinators need.', icon: 'bug' },
];

export const badgeById = (id: string) => BADGES.find((b) => b.id === id);
