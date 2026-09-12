import AsyncStorage from '@react-native-async-storage/async-storage';
import { RegionId } from '../models/regions';

/// The groundwork for growers talking to each other.
///
/// There is no server yet, so this module is the shape of one. Everything the rest of the
/// app touches goes through `loadFeed` and `publish`, and both are async and fallible on
/// purpose: when there is a backend, only the insides of these two functions change, and
/// no screen has to be rewritten to cope with a network that is suddenly slow or absent.
///
/// Until then the feed is seeded sample content, and the app says so on screen rather
/// than dressing invented posts up as neighbours. Your own posts are real, stored on this
/// device, and shown alongside so the composer can be built and tested for real.

export type PostKind = 'harvest' | 'tip' | 'question' | 'sowing';

export interface Post {
  id: string;
  kind: PostKind;
  /** Display name. Sample posts use a first name; yours is whatever you set. */
  author: string;
  region: RegionId;
  /** Milliseconds since the epoch. */
  at: number;
  body: string;
  /** Species id this is about, when it is about one. */
  speciesId?: string;
  cheers: number;
  /** True for anything this device wrote. */
  mine: boolean;
}

export const KIND_LABEL: Record<PostKind, string> = {
  harvest: 'Harvest',
  tip: 'Tip',
  question: 'Question',
  sowing: 'Sowing',
};

const STORAGE_KEY = 'plantpartner.community.v1';

interface Stored {
  mine: Post[];
  cheered: string[];
  displayName?: string;
}

async function read(): Promise<Stored> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return { mine: [], cheered: [] };
    const parsed = JSON.parse(raw) as Partial<Stored>;
    return { mine: parsed.mine ?? [], cheered: parsed.cheered ?? [], displayName: parsed.displayName };
  } catch {
    return { mine: [], cheered: [] };
  }
}

async function write(value: Stored): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    // A post that fails to save is lost, which is bad, but not worth crashing the tab for.
  }
}

const DAY = 1000 * 60 * 60 * 24;

/// Seeded sample posts, chosen for the region and the month so the tab is not talking
/// about tomatoes in February. Deterministic: the same day shows the same feed, which
/// makes the screen possible to design against and to screenshot.
const SAMPLES: { kind: PostKind; author: string; body: string; speciesId?: string; months: number[] }[] = [
  { kind: 'sowing', author: 'Priya', body: 'Broad beans in under cloches this weekend. Second year running - last year the November sowing beat the spring one by a month.', speciesId: 'broadbean', months: [10, 11, 2, 3] },
  { kind: 'harvest', author: 'Tom', body: 'First proper courgette glut. Anyone got something to do with them that is not soup?', speciesId: 'courgette', months: [7, 8, 9] },
  { kind: 'tip', author: 'Mairead', body: 'Water tomatoes at the same time every day rather than the same amount. Splitting is almost always irregular watering, not too much of it.', speciesId: 'tomato', months: [6, 7, 8] },
  { kind: 'question', author: 'Ben', body: 'Carrot tops looking lacy and pale. Is that root fly or have I just left them too dry?', speciesId: 'carrot', months: [5, 6, 7, 8] },
  { kind: 'tip', author: 'Yusuf', body: 'Garlic goes in on the shortest day where I am. It wants the cold to split into cloves properly.', speciesId: 'garlic', months: [10, 11, 12, 1] },
  { kind: 'harvest', author: 'Elena', body: 'Pulled the first beetroot of the year. Golf-ball sized and sweeter than the big ones ever are.', speciesId: 'beetroot', months: [6, 7, 8, 9] },
  { kind: 'tip', author: 'Nkechi', body: 'Leave a patch of the plot unweeded near the beans. The hoverflies that live in it deal with blackfly better than I do.', months: [4, 5, 6, 7] },
  { kind: 'sowing', author: 'Callum', body: 'Overwintering salad going into the cold frame today. Slow growth all winter beats nothing all winter.', speciesId: 'lettuce', months: [8, 9, 10] },
  { kind: 'tip', author: 'Rosa', body: 'Mulch now while the soil still has summer warmth in it. Doing it in January just keeps the cold in.', months: [9, 10, 11] },
  { kind: 'question', author: 'Dan', body: 'Kale covered in whitefly. Does anyone actually manage to get rid of them or do you just wait for a frost?', speciesId: 'kale', months: [8, 9, 10, 11] },
];

function sampleFeed(region: RegionId, month: number, now: number): Post[] {
  const inSeason = SAMPLES.filter((sample) => sample.months.includes(month));
  const pool = inSeason.length >= 3 ? inSeason : SAMPLES;
  return pool.slice(0, 4).map((sample, index) => ({
    id: `sample-${month}-${index}`,
    kind: sample.kind,
    author: sample.author,
    region,
    at: now - (index * 7 + 3) * (DAY / 6),
    body: sample.body,
    speciesId: sample.speciesId,
    cheers: 2 + ((index * 5 + month) % 9),
    mine: false,
  }));
}

export interface Feed {
  posts: Post[];
  cheered: Set<string>;
  displayName: string;
  /** False until there is a server behind this. The UI has to say so. */
  live: boolean;
}

export async function loadFeed(region: RegionId, month: number): Promise<Feed> {
  const stored = await read();
  const now = Date.now();
  const mine = stored.mine.filter((post) => post.region === region);
  const posts = [...mine, ...sampleFeed(region, month, now)].sort((a, b) => b.at - a.at);
  return {
    posts,
    cheered: new Set(stored.cheered),
    displayName: stored.displayName ?? 'You',
    live: false,
  };
}

export async function publish(post: {
  kind: PostKind;
  body: string;
  region: RegionId;
  speciesId?: string;
  author: string;
}): Promise<Post> {
  const stored = await read();
  const created: Post = {
    id: `mine-${Date.now().toString(36)}`,
    kind: post.kind,
    author: post.author,
    region: post.region,
    at: Date.now(),
    body: post.body.trim(),
    speciesId: post.speciesId,
    cheers: 0,
    mine: true,
  };
  await write({ ...stored, mine: [created, ...stored.mine].slice(0, 50) });
  return created;
}

export async function remove(id: string): Promise<void> {
  const stored = await read();
  await write({ ...stored, mine: stored.mine.filter((post) => post.id !== id) });
}

export async function toggleCheer(id: string): Promise<Set<string>> {
  const stored = await read();
  const cheered = new Set(stored.cheered);
  if (cheered.has(id)) cheered.delete(id);
  else cheered.add(id);
  await write({ ...stored, cheered: [...cheered] });
  return cheered;
}

export async function setDisplayName(name: string): Promise<void> {
  const stored = await read();
  await write({ ...stored, displayName: name.trim() || 'You' });
}

/// "3 days ago", for a feed where nothing is urgent enough to need a clock.
export function whenLabel(at: number, now = Date.now()): string {
  const minutes = Math.max(Math.round((now - at) / 60000), 0);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return days === 1 ? 'yesterday' : `${days} days ago`;
  const weeks = Math.round(days / 7);
  return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`;
}
