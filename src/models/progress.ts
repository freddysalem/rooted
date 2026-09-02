/// Levels, and the farm that grows with them.
///
/// The metric is consistency rather than time served: a day counts only when nothing on
/// the plot is left thirsty. Miss a plant that asked for water and the streak goes back to
/// nothing, so the number on screen is a real claim about how the garden has been kept.
///
/// Thresholds double. A week gets you off the shed, a fortnight the cabin, and after that
/// each level costs as much as everything before it - the top of the ladder is meant to be
/// a genuinely long relationship with the app rather than a fortnight of enthusiasm.

export type HomeTier =
  | 'shed' | 'pottingShed' | 'cabin' | 'cottage' | 'farmhouse' | 'bigFarmhouse' | 'estate';

export type Pet = 'chickens' | 'dog' | 'horse';

export interface Level {
  level: number;
  /** Consecutive days with nothing left thirsty. */
  streakDays: number;
  /** Plants ever put in the ground - the expansion half of the metric. */
  plantsGrown: number;
  home: HomeTier;
  homeName: string;
  /** New pets that turn up at this level. */
  pets: Pet[];
  /** One line describing what arrives, shown when the level lands. */
  unlock: string;
}

export const LEVELS: Level[] = [
  { level: 1, streakDays: 0,   plantsGrown: 1,  home: 'shed',          homeName: 'Garden shed',
    pets: [], unlock: 'A shed, a bed, and something growing in it.' },
  { level: 2, streakDays: 7,   plantsGrown: 2,  home: 'pottingShed',   homeName: 'Potting shed',
    pets: [], unlock: 'A week of keeping everything watered. The shed gets a window.' },
  { level: 3, streakDays: 14,  plantsGrown: 3,  home: 'cabin',         homeName: 'Cabin',
    pets: [], unlock: 'A fortnight. A proper cabin with a chimney.' },
  { level: 4, streakDays: 28,  plantsGrown: 5,  home: 'cottage',       homeName: 'Cottage',
    pets: [], unlock: 'A month. A cottage with a porch - and you can now choose its colour.' },
  { level: 5, streakDays: 56,  plantsGrown: 8,  home: 'farmhouse',     homeName: 'Farmhouse',
    pets: ['chickens'], unlock: 'Two months. A farmhouse, and chickens move in.' },
  { level: 6, streakDays: 112, plantsGrown: 12, home: 'bigFarmhouse',  homeName: 'Big farmhouse',
    pets: ['dog'], unlock: 'Four months. The house gains a wing, and a dog.' },
  { level: 7, streakDays: 224, plantsGrown: 18, home: 'estate',        homeName: 'Country estate',
    pets: ['horse'], unlock: 'Eight months of consistency. A stable, and a horse in the paddock.' },
];

/// Colours the house can be painted, once level 4 is reached.
export const HOME_COLOURS = [
  { id: 'red',    name: 'Barn red',   wall: '#B4472F', roof: '#5E4034' },
  { id: 'cream',  name: 'Cream',      wall: '#E8D9B8', roof: '#7A5433' },
  { id: 'sage',   name: 'Sage',       wall: '#8FA97C', roof: '#4F5B43' },
  { id: 'blue',   name: 'Slate blue', wall: '#6E8CA8', roof: '#3F4E5C' },
  { id: 'timber', name: 'Timber',     wall: '#A9784E', roof: '#5E4034' },
] as const;

export type HomeColourId = (typeof HOME_COLOURS)[number]['id'];

export const homeColour = (id: HomeColourId) =>
  HOME_COLOURS.find((c) => c.id === id) ?? HOME_COLOURS[0];

export const COLOUR_UNLOCK_LEVEL = 4;

/// The highest level whose streak *and* planting requirements are both met.
export function levelFor(streakDays: number, plantsGrown: number): Level {
  let earned = LEVELS[0];
  for (const level of LEVELS) {
    if (streakDays >= level.streakDays && plantsGrown >= level.plantsGrown) earned = level;
  }
  return earned;
}

export function nextLevel(level: number): Level | null {
  return LEVELS.find((l) => l.level === level + 1) ?? null;
}

/// Every pet unlocked so far, not just the ones from the current level.
export function petsUpTo(level: number): Pet[] {
  return LEVELS.filter((l) => l.level <= level).flatMap((l) => l.pets);
}

/// How far along the current level you are, on each of the two requirements.
export function levelProgress(streakDays: number, plantsGrown: number) {
  const current = levelFor(streakDays, plantsGrown);
  const next = nextLevel(current.level);
  if (!next) return { current, next: null, fraction: 1, streakLeft: 0, plantsLeft: 0 };

  const streakSpan = next.streakDays - current.streakDays;
  const streakDone = streakSpan <= 0 ? 1 : Math.min((streakDays - current.streakDays) / streakSpan, 1);
  const plantSpan = next.plantsGrown - current.plantsGrown;
  const plantsDone = plantSpan <= 0 ? 1 : Math.min((plantsGrown - current.plantsGrown) / plantSpan, 1);

  return {
    current,
    next,
    // The level lands when both are satisfied, so the bar tracks whichever lags.
    fraction: Math.max(0, Math.min(streakDone, plantsDone)),
    streakLeft: Math.max(next.streakDays - streakDays, 0),
    plantsLeft: Math.max(next.plantsGrown - plantsGrown, 0),
  };
}

// --- the streak itself ----------------------------------------------------

export interface StreakState {
  days: number;
  best: number;
  /** Local date of the last day that counted, as YYYY-MM-DD. */
  lastQualified: string | null;
}

export const emptyStreak: StreakState = { days: 0, best: 0, lastQualified: null };

/// Local calendar day. Streaks are about days as people experience them, not UTC.
export function dateKey(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function previousDateKey(key: string): string {
  const [y, m, d] = key.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() - 1);
  return dateKey(date);
}

/// Move the streak on, given whether today is currently in good standing.
///
/// Nothing is decided until the day is actually missed: while today is still unwatered the
/// streak simply holds, because there is time left to put it right. It only breaks once a
/// whole day has gone by without qualifying.
export function advanceStreak(
  state: StreakState,
  qualifiesToday: boolean,
  today = dateKey()
): StreakState {
  if (state.lastQualified === today) return state;

  if (qualifiesToday) {
    const continuing = state.lastQualified === previousDateKey(today);
    const days = continuing ? state.days + 1 : 1;
    return { days, best: Math.max(state.best, days), lastQualified: today };
  }

  // Yesterday still counted, so today is simply not finished yet.
  if (state.lastQualified === previousDateKey(today)) return state;

  // A day passed with plants left thirsty.
  return state.days === 0 ? state : { ...state, days: 0 };
}
