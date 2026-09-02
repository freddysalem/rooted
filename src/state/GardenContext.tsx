import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Planting, FULL_PLOT_TARGET, daysBetween, getSpecies, progressOf, stageOf,
} from '../models/planting';
import { Species } from '../models/species';
import { Badge, BADGES, badgeById } from '../models/badges';
import { WeatherSnapshot, currentWeather } from '../services/weather';
import {
  HomeColourId, Level, StreakState, advanceStreak, emptyStreak, levelFor, levelProgress,
} from '../models/progress';
import * as haptics from '../services/haptics';

const STORAGE_KEY = 'plantpartner.garden.v1';

interface PersistedState {
  plantings: Planting[];
  earnedBadgeIDs: string[];
  hasSurveyedSun: boolean;
  streak?: StreakState;
  /** Every plant ever put in, so pulling one up does not cost you progress. */
  plantsEverGrown?: number;
  homeColour?: HomeColourId;
}

interface GardenValue {
  ready: boolean;
  plantings: Planting[];
  weather: WeatherSnapshot | null;
  justEarned: Badge | null;
  dismissBadge: () => void;

  plantingInPlot: (plot: number) => Planting | undefined;
  firstEmptyPlot: number | null;
  thirsty: Planting[];

  needsWater: (planting: Planting) => boolean;
  wateringInterval: (planting: Planting) => number;
  wateringAdvice: (planting: Planting) => string;
  totalWaterings: number;

  plant: (species: Species, nickname: string, plot: number) => void;
  water: (planting: Planting) => void;
  recordHeight: (centimetres: number, planting: Planting) => void;
  updateNotes: (notes: string, planting: Planting) => void;
  removePlanting: (planting: Planting) => void;
  markSunSurveyed: () => void;

  hasEarned: (badge: Badge) => boolean;
  earnedCount: number;

  streak: StreakState;
  plantsEverGrown: number;
  level: Level;
  progress: ReturnType<typeof levelProgress>;
  justLevelled: Level | null;
  dismissLevel: () => void;
  homeColour: HomeColourId;
  setHomeColour: (colour: HomeColourId) => void;
}

const GardenContext = createContext<GardenValue | null>(null);

const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;

/// Badges are sticky: once earned they stay earned, even if you pull the plant up.
function computeBadges(
  plantings: Planting[],
  hasSurveyedSun: boolean,
  already: Set<string>
): Set<string> {
  const earned = new Set(already);
  const families = new Set(plantings.map((p) => getSpecies(p).family));
  const totalWaterings = plantings.reduce((sum, p) => sum + p.wateringCount, 0);
  const pollinatorFriendly = ['sunflower', 'strawberry', 'courgette', 'runnerbean', 'rosemary', 'chives', 'mint'];

  const award = (id: string, condition: boolean) => {
    if (condition) earned.add(id);
  };

  award('first_sprout', plantings.length > 0);
  award('five_plants', plantings.length >= 5);
  award('full_plot', plantings.length >= FULL_PLOT_TARGET);
  award('faithful', totalWaterings >= 20);
  award('harvest', plantings.some((p) => stageOf(p) === 'ready'));
  award('measured', plantings.some((p) => p.heights.length >= 3));
  award('sun_seeker', hasSurveyedSun);
  award('variety', families.size >= 4);
  award('winter', new Date().getMonth() + 1 === 12 && plantings.length > 0);
  award('pollinator', plantings.some((p) => pollinatorFriendly.includes(p.speciesID)));

  return earned;
}

export function GardenProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [plantings, setPlantings] = useState<Planting[]>([]);
  const [earnedBadgeIDs, setEarnedBadgeIDs] = useState<Set<string>>(new Set());
  const [hasSurveyedSun, setHasSurveyedSun] = useState(false);
  const [weather, setWeather] = useState<WeatherSnapshot | null>(null);
  const [justEarned, setJustEarned] = useState<Badge | null>(null);
  const [streak, setStreak] = useState<StreakState>(emptyStreak);
  const [plantsEverGrown, setPlantsEverGrown] = useState(0);
  const [homeColour, setHomeColour] = useState<HomeColourId>('red');
  const [justLevelled, setJustLevelled] = useState<Level | null>(null);
  const knownLevel = useRef(1);

  // Guards the badge diff so the celebration only fires for genuinely new badges,
  // never for the whole set restored from disk on launch.
  const knownBadges = useRef<Set<string>>(new Set());

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed: PersistedState = JSON.parse(raw);
          setPlantings(parsed.plantings ?? []);
          const restored = new Set(parsed.earnedBadgeIDs ?? []);
          setEarnedBadgeIDs(restored);
          knownBadges.current = new Set(restored);
          setHasSurveyedSun(parsed.hasSurveyedSun ?? false);
          setStreak(parsed.streak ?? emptyStreak);
          // Gardens saved before levels existed still deserve credit for what is planted.
          setPlantsEverGrown(parsed.plantsEverGrown ?? (parsed.plantings ?? []).length);
          setHomeColour(parsed.homeColour ?? 'red');
          knownLevel.current = levelFor(
            (parsed.streak ?? emptyStreak).days,
            parsed.plantsEverGrown ?? (parsed.plantings ?? []).length
          ).level;
        }
      } catch {
        // A corrupt file should not stop the app opening - start fresh instead.
      }
      setReady(true);
    })();
    currentWeather().then(setWeather).catch(() => {});
  }, []);

  // Re-derive badges whenever the plot changes, then persist the lot.
  useEffect(() => {
    if (!ready) return;
    const earned = computeBadges(plantings, hasSurveyedSun, knownBadges.current);
    const fresh = [...earned].filter((id) => !knownBadges.current.has(id));
    if (fresh.length > 0) {
      knownBadges.current = earned;
      setEarnedBadgeIDs(earned);
      const badge = badgeById(fresh[0]);
      if (badge) {
        setJustEarned(badge);
        haptics.success();
      }
    }
    const payload: PersistedState = {
      plantings,
      earnedBadgeIDs: [...earned],
      hasSurveyedSun,
      streak,
      plantsEverGrown,
      homeColour,
    };
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(payload)).catch(() => {});
  }, [plantings, hasSurveyedSun, ready, streak, plantsEverGrown, homeColour]);

  const plantingInPlot = useCallback(
    (plot: number) => plantings.find((p) => p.plot === plot),
    [plantings]
  );

  // Unbounded: the next bed is simply the lowest index nobody is using.
  const firstEmptyPlot = useMemo(() => {
    for (let i = 0; ; i++) {
      if (!plantings.some((p) => p.plot === i)) return i;
    }
  }, [plantings]);

  /// The species' usual interval, nudged by what the sky is doing.
  const wateringInterval = useCallback(
    (planting: Planting) => {
      let interval = getSpecies(planting).waterEveryDays;
      if (weather) {
        if (weather.rainfallLast24h >= 4) interval += 2;
        else if (weather.rainfallLast24h >= 1) interval += 1;
        if (weather.highC >= 26) interval -= 1;
      }
      return Math.max(interval, 1);
    },
    [weather]
  );

  const needsWater = useCallback(
    (planting: Planting) => {
      const since = planting.lastWatered ?? planting.plantedOn;
      return daysBetween(since) >= wateringInterval(planting);
    },
    [wateringInterval]
  );

  const wateringAdvice = useCallback(
    (planting: Planting) => {
      if (!weather) return needsWater(planting) ? 'Due a water.' : 'Happy for now.';
      if (weather.rainfallLast24h >= 4) {
        return `${Math.round(weather.rainfallLast24h)}mm of rain overnight - the sky has done this one for you.`;
      }
      if (weather.highC >= 26) {
        return `Reaching ${Math.round(weather.highC)}°C today. Water early or late, never in full midday sun.`;
      }
      if (needsWater(planting)) return 'Due a water today.';
      const since = planting.lastWatered ?? planting.plantedOn;
      const left = Math.max(wateringInterval(planting) - daysBetween(since), 0);
      return left <= 1 ? 'Check again tomorrow.' : `Happy for another ${left} days.`;
    },
    [weather, needsWater, wateringInterval]
  );

  const thirsty = useMemo(() => plantings.filter(needsWater), [plantings, needsWater]);
  const totalWaterings = useMemo(
    () => plantings.reduce((sum, p) => sum + p.wateringCount, 0),
    [plantings]
  );

  // A day counts once nothing is left thirsty. Evaluated on every change rather than on
  // a timer, so watering the last plant lands the day immediately.
  useEffect(() => {
    if (!ready) return;
    const qualifies = plantings.length > 0 && thirsty.length === 0;
    setStreak((current) => {
      const next = advanceStreak(current, qualifies);
      return next === current ? current : next;
    });
  }, [ready, plantings, thirsty.length]);

  const level = useMemo(() => levelFor(streak.days, plantsEverGrown), [streak.days, plantsEverGrown]);
  const progress = useMemo(
    () => levelProgress(streak.days, plantsEverGrown),
    [streak.days, plantsEverGrown]
  );

  // Only celebrate a level the first time it is reached, never on reload.
  useEffect(() => {
    if (!ready) return;
    if (level.level > knownLevel.current) {
      knownLevel.current = level.level;
      setJustLevelled(level);
      haptics.success();
    } else if (level.level < knownLevel.current) {
      knownLevel.current = level.level;
    }
  }, [ready, level]);

  const plant = useCallback((species: Species, nickname: string, plot: number) => {
    setPlantings((current) => {
      if (current.some((p) => p.plot === plot)) return current;
      const trimmed = nickname.trim();
      return [
        ...current,
        {
          id: uid(),
          speciesID: species.id,
          nickname: trimmed.length ? trimmed : species.name,
          plantedOn: new Date().toISOString(),
          lastWatered: null,
          wateringCount: 0,
          plot,
          heights: [],
          notes: '',
        },
      ];
    });
    setPlantsEverGrown((n) => n + 1);
    haptics.success();
  }, []);

  const water = useCallback((planting: Planting) => {
    setPlantings((current) =>
      current.map((p) =>
        p.id === planting.id
          ? { ...p, lastWatered: new Date().toISOString(), wateringCount: p.wateringCount + 1 }
          : p
      )
    );
    haptics.tap();
  }, []);

  const recordHeight = useCallback((centimetres: number, planting: Planting) => {
    setPlantings((current) =>
      current.map((p) =>
        p.id === planting.id
          ? { ...p, heights: [...p.heights, { id: uid(), date: new Date().toISOString(), centimetres }] }
          : p
      )
    );
  }, []);

  const updateNotes = useCallback((notes: string, planting: Planting) => {
    setPlantings((current) => current.map((p) => (p.id === planting.id ? { ...p, notes } : p)));
  }, []);

  const removePlanting = useCallback((planting: Planting) => {
    setPlantings((current) => current.filter((p) => p.id !== planting.id));
  }, []);

  const markSunSurveyed = useCallback(() => setHasSurveyedSun(true), []);

  const hasEarned = useCallback((badge: Badge) => earnedBadgeIDs.has(badge.id), [earnedBadgeIDs]);
  const earnedCount = useMemo(
    () => BADGES.filter((b) => earnedBadgeIDs.has(b.id)).length,
    [earnedBadgeIDs]
  );

  const value: GardenValue = {
    ready, plantings, weather, justEarned,
    dismissBadge: () => setJustEarned(null),
    plantingInPlot, firstEmptyPlot, thirsty,
    needsWater, wateringInterval, wateringAdvice, totalWaterings,
    plant, water, recordHeight, updateNotes, removePlanting, markSunSurveyed,
    hasEarned, earnedCount,
    streak, plantsEverGrown, level, progress,
    justLevelled, dismissLevel: () => setJustLevelled(null),
    homeColour, setHomeColour,
  };

  return <GardenContext.Provider value={value}>{children}</GardenContext.Provider>;
}

export function useGarden(): GardenValue {
  const context = useContext(GardenContext);
  if (!context) throw new Error('useGarden must be used inside a GardenProvider');
  return context;
}

export { progressOf };
