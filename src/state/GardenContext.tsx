import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import {
  Planting, FULL_PLOT_TARGET, daysBetween, getSpecies, progressOf, stageOf,
} from '../models/planting';
import { Species } from '../models/species';
import { Badge, BADGES, badgeById } from '../models/badges';
import { WeatherSnapshot, currentWeather } from '../services/weather';
import {
  HomeColourId, Level, StreakState, advanceStreak, emptyStreak, levelFor, levelProgress,
} from '../models/progress';
import { REGIONS, RegionId, nearestRegion, regionForCountry } from '../models/regions';
import { Place } from '../services/places';
import * as haptics from '../services/haptics';
import * as reminders from '../services/reminders';
import { Container, DEFAULT_CONTAINER, WaterAdvice, waterFor } from '../services/water';

const STORAGE_KEY = 'plantpartner.garden.v1';

interface PersistedState {
  plantings: Planting[];
  earnedBadgeIDs: string[];
  hasSurveyedSun: boolean;
  streak?: StreakState;
  /** Every plant ever put in, so pulling one up does not cost you progress. */
  plantsEverGrown?: number;
  homeColour?: HomeColourId;
  /** A place typed into the demo switch. Absent means "use the phone's own location". */
  demoPlace?: Place | null;
}

interface GardenValue {
  ready: boolean;
  plantings: Planting[];
  weather: WeatherSnapshot | null;
  /** True when the snapshot came from the live feed rather than the simulation. */
  weatherIsLive: boolean;
  refreshWeather: () => void;
  justEarned: Badge | null;
  dismissBadge: () => void;

  plantingInPlot: (plot: number) => Planting | undefined;
  firstEmptyPlot: number | null;
  thirsty: Planting[];

  needsWater: (planting: Planting) => boolean;
  wateringInterval: (planting: Planting) => number;
  wateringAdvice: (planting: Planting) => string;
  totalWaterings: number;

  plant: (species: Species, nickname: string, plot: number, container?: Container, indoors?: boolean) => void;
  setContainer: (container: Container, planting: Planting) => void;
  /** How much water this one wants right now, and why. */
  waterAdvice: (planting: Planting) => WaterAdvice;
  remindersOn: boolean;
  enableReminders: () => Promise<boolean>;
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
  /** Which crop library and, when there is no GPS, which sky the app shows. */
  /** Which crop library applies, worked out from where the garden actually is. */
  region: RegionId;
  /** True when the region was a guess because we have no library for that country. */
  regionIsGuess: boolean;
  /** Where the weather is being read: the phone's position, or the demo override. */
  placeLabel: string;
  usingDeviceLocation: boolean;
  /** The demo switch. Null puts it back on the phone's own location. */
  demoPlace: Place | null;
  setDemoPlace: (place: Place | null) => void;
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
  const [demoPlace, setDemoPlaceState] = useState<Place | null>(null);
  const [weatherIsLive, setWeatherIsLive] = useState(false);
  const coords = useRef<{ latitude: number; longitude: number } | null>(null);
  // The country the phone is standing in, once it has been asked. Drives the crop
  // library; null until a reverse geocode succeeds.
  const [deviceCountry, setDeviceCountry] = useState<string | null>(null);
  const [usingDeviceLocation, setUsingDeviceLocation] = useState(false);
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
          setDemoPlaceState(parsed.demoPlace ?? null);
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
  }, []);

  // Real weather needs a position. Only a permission that has already been granted is
  // used here - asking is the Sun spot screen's job, once it has explained itself.
  //
  // The demo switch wins when it is set, so the app can be stood in Nairobi on a stage
  // in Bristol. Otherwise it is the phone's own position, and only if neither is
  // available does Bristol stand in - and the tile says so.
  const refreshWeather = useCallback(() => {
    (async () => {
      if (!demoPlace && !coords.current) {
        try {
          const { status } = await Location.getForegroundPermissionsAsync();
          if (status === 'granted') {
            const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            coords.current = { latitude: position.coords.latitude, longitude: position.coords.longitude };
            // The country decides which crop library to show, so it is worth one call.
            try {
              const [spot] = await Location.reverseGeocodeAsync(coords.current);
              if (spot?.isoCountryCode) setDeviceCountry(spot.isoCountryCode);
            } catch {
              // Not supported on web, and never worth failing the forecast over.
            }
          }
        } catch {
          // No position: fall through to the stand-in below.
        }
      }

      const onDevice = !demoPlace && coords.current !== null;
      setUsingDeviceLocation(onDevice);

      const place = demoPlace ?? coords.current ?? REGIONS.uk.demoLocation;
      const placeName = demoPlace
        ? demoPlace.name
        : coords.current
          ? 'Your garden'
          : REGIONS.uk.demoLocation.name;
      const snapshot = await currentWeather({ ...place, placeName });
      setWeather(snapshot);
      setWeatherIsLive(!snapshot.simulated);
    })().catch(() => {});
  }, [demoPlace]);

  /// The demo switch. Setting a place drops any cached device position so the next
  /// refresh cannot quietly fall back to it.
  const setDemoPlace = useCallback((place: Place | null) => {
    setDemoPlaceState(place);
    if (place) coords.current = null;
  }, []);

  // Which crop library applies. A country we have written a list for wins; otherwise we
  // fall back to the nearest one and admit that it is a guess.
  const { region, regionIsGuess } = useMemo(() => {
    const country = demoPlace?.countryCode ?? deviceCountry ?? undefined;
    const named = regionForCountry(country);
    if (named) return { region: named, regionIsGuess: false };
    const here = demoPlace ?? coords.current ?? REGIONS.uk.demoLocation;
    return {
      region: nearestRegion(here.latitude, here.longitude),
      // With no country at all we are simply defaulting, not guessing at a foreign one.
      regionIsGuess: Boolean(country),
    };
  }, [demoPlace, deviceCountry, weather]);

  const placeLabel = demoPlace?.label ?? weather?.placeName ?? REGIONS.uk.demoLocation.name;

  useEffect(() => {
    if (!ready) return;
    refreshWeather();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') refreshWeather();
    });
    return () => sub.remove();
  }, [ready, refreshWeather]);

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
      demoPlace,
    };
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(payload)).catch(() => {});
  }, [plantings, hasSurveyedSun, ready, streak, plantsEverGrown, homeColour, demoPlace]);

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
        // Only the sky's own plants get credit for the rain; see water.ts.
        if (!planting.indoors) {
          if (weather.rainfallLast24h >= 4) interval += 2;
          else if (weather.rainfallLast24h >= 1) interval += 1;
        }
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

  const plant = useCallback((species: Species, nickname: string, plot: number, container?: Container, indoors = false) => {
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
          container: container ?? DEFAULT_CONTAINER,
          indoors,
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

  const setContainer = useCallback((container: Container, planting: Planting) => {
    setPlantings((current) =>
      current.map((p) => (p.id === planting.id ? { ...p, container } : p))
    );
  }, []);

  const markSunSurveyed = useCallback(() => setHasSurveyedSun(true), []);

  const waterAdvice = useCallback(
    (planting: Planting) => waterFor(planting, getSpecies(planting), weather),
    [weather]
  );

  const [remindersOn, setRemindersOn] = useState(false);
  useEffect(() => {
    reminders.permissionStatus().then((status) => setRemindersOn(status === 'granted'));
  }, []);

  const enableReminders = useCallback(async () => {
    const granted = await reminders.askPermission();
    setRemindersOn(granted);
    return granted;
  }, []);

  // Rescheduled whenever anything that changes a due date changes: the plants, what they
  // are growing in, when they were last watered, or the weather that stretches the gap.
  useEffect(() => {
    if (!ready || !remindersOn) return;
    reminders.rescheduleAll(plantings, weather, wateringInterval);
  }, [ready, remindersOn, plantings, weather, wateringInterval]);

  const hasEarned = useCallback((badge: Badge) => earnedBadgeIDs.has(badge.id), [earnedBadgeIDs]);
  const earnedCount = useMemo(
    () => BADGES.filter((b) => earnedBadgeIDs.has(b.id)).length,
    [earnedBadgeIDs]
  );

  const dismissBadge = useCallback(() => setJustEarned(null), []);
  const dismissLevel = useCallback(() => setJustLevelled(null), []);

  // Memoised deliberately. Every screen stays mounted behind the tab bar, so an
  // identity change here re-renders all four of them - and each one is full of SVG
  // sprites. Rebuilding this object on every render was making watering a plant cost
  // a re-render of the entire app.
  const value: GardenValue = useMemo(
    () => ({
      ready, plantings, weather, weatherIsLive, refreshWeather, justEarned, dismissBadge,
      plantingInPlot, firstEmptyPlot, thirsty,
      needsWater, wateringInterval, wateringAdvice, totalWaterings,
      plant, water, recordHeight, updateNotes, removePlanting, markSunSurveyed,
      setContainer, waterAdvice, remindersOn, enableReminders,
      hasEarned, earnedCount,
      streak, plantsEverGrown, level, progress,
      justLevelled, dismissLevel,
      homeColour, setHomeColour,
      region, regionIsGuess, placeLabel, usingDeviceLocation, demoPlace, setDemoPlace,
    }),
    [
      ready, plantings, weather, weatherIsLive, refreshWeather, justEarned, dismissBadge,
      plantingInPlot, firstEmptyPlot, thirsty,
      needsWater, wateringInterval, wateringAdvice, totalWaterings,
      plant, water, recordHeight, updateNotes, removePlanting, markSunSurveyed,
      setContainer, waterAdvice, remindersOn, enableReminders,
      hasEarned, earnedCount,
      streak, plantsEverGrown, level, progress,
      justLevelled, dismissLevel, homeColour,
      region, regionIsGuess, placeLabel, usingDeviceLocation, demoPlace, setDemoPlace,
    ]
  );

  return <GardenContext.Provider value={value}>{children}</GardenContext.Provider>;
}

export function useGarden(): GardenValue {
  const context = useContext(GardenContext);
  if (!context) throw new Error('useGarden must be used inside a GardenProvider');
  return context;
}

export { progressOf };
