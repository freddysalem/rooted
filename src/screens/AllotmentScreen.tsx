import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, ContentColumn, EmptyState, ProgressBar } from '../components/ui';
import { PlotGrid } from '../components/PlotGrid';
import { HomeStrip } from '../components/HomeStrip';
import { WeatherTile } from '../components/WeatherTile';
import { useGarden } from '../state/GardenContext';
import { Planting } from '../models/planting';
import { COLOUR_UNLOCK_LEVEL, HOME_COLOURS, levelProgress, petsUpTo } from '../models/progress';
import { conditionAlert, conditionIcon, conditionLabel } from '../services/weather';
import { color, motion, radius, size, space, tabular, type } from '../theme';
import * as haptics from '../services/haptics';
import { useReduceMotion } from '../hooks/useReduceMotion';
import { AddPlantModal } from './AddPlantModal';
import { PlantDetailModal } from './PlantDetailModal';
import { LocationModal } from './LocationModal';
import { PlotMapModal } from './PlotMapModal';

/// The home screen: your plot, seen across the ground rather than down onto a grid.
///
/// The plot fills the screen because it is the point of the app - drag to move around it,
/// pinch to get closer, and press any plant to open the same detail sheet as before.
export function AllotmentScreen() {
  const garden = useGarden();
  const [selected, setSelected] = useState<Planting | null>(null);
  const [plotToPlant, setPlotToPlant] = useState<number | null>(null);
  const [locationOpen, setLocationOpen] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);

  // The weather tile holds still while the level card, the scene and the filters scroll
  // up behind it - and then, once there is nothing left of them, it goes too, so a long
  // plot gets the whole screen. Both heights are measured rather than guessed, because
  // the header changes size with the garden.
  const scrollY = useRef(new Animated.Value(0)).current;
  const [weatherHeight, setWeatherHeight] = useState(0);
  const [headerHeight, setHeaderHeight] = useState(0);
  const holdFor = Math.max(headerHeight - space.md, 0);
  const weatherShift = scrollY.interpolate({
    inputRange: [0, holdFor, holdFor + Math.max(weatherHeight, 1)],
    outputRange: [0, 0, -Math.max(weatherHeight, 1)],
    extrapolate: 'clamp',
  });

  const openPlant = useCallback((planting: Planting) => {
    haptics.pulse();
    setSelected(planting);
  }, []);
  // Hoisted, because HomeStrip is memoised and an inline arrow gives it a new prop
  // identity on every render - which redraws the house, the sky and up to six sprites
  // every time the weather refreshes or a plant is watered.
  const openMap = useCallback(() => setMapOpen(true), []);
  const closeMap = useCallback(() => setMapOpen(false), []);

  const plantEmpty = useCallback((plot: number) => {
    haptics.selection();
    setPlotToPlant(plot);
  }, []);

  const alert = garden.weather ? conditionAlert(garden.weather.condition) : null;
  const selectedLive = selected ? garden.plantings.find((p) => p.id === selected.id) ?? null : null;
  const empty = garden.ready && garden.plantings.length === 0;
  // Stable identity, or the plot's world geometry is recomputed on every render.
  const pets = useMemo(() => petsUpTo(garden.level.level), [garden.level.level]);

  const thirstyLine = (() => {
    if (!garden.ready) return 'Loading your plot...';
    if (garden.plantings.length === 0) return "Your plot is empty - plant something.";
    const count = garden.thirsty.length;
    if (count === 0) return 'Nothing needs watering today.';
    return count === 1 ? '1 plant is due a water.' : `${count} plants are due a water.`;
  })();

  const streakLabel = garden.streak.days === 0
    ? 'No streak yet'
    : garden.streak.days === 1 ? '1 day streak' : `${garden.streak.days} day streak`;
  const streakShort = garden.streak.days === 0 ? 'No streak' : `${garden.streak.days}d streak`;

  return (
    <View style={{ flex: 1, backgroundColor: color.canvas }}>
      <View style={styles.plotArea}>
        <PlotGrid
          plantings={garden.plantings}
          isThirsty={garden.needsWater}
          contentTop={weatherHeight}
          onHeaderLayout={setHeaderHeight}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: true }
          )}
          header={
            <View style={{ gap: size.cardGap }}>
        <Card padding={space.md}>
          <View style={{ gap: space.sm }}>
            <View style={styles.levelRow}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={type.bodyStrong}>
                  Level {garden.level.level} · {garden.level.homeName}
                </Text>
                <Text style={type.caption}>
                  {garden.progress.next
                    ? nextLevelLine(garden.progress)
                    : 'The farm is complete.'}
                </Text>
              </View>
              <View accessible style={styles.streakChip} accessibilityLabel={streakLabel}>
                <Ionicons
                  name={garden.streak.days > 0 ? 'flame' : 'flame-outline'}
                  size={14}
                  color={garden.streak.days > 0 ? color.dangerText : color.textTertiary}
                />
                <Text style={[styles.streakText, tabular, garden.streak.days === 0 && { color: color.textSecondary }]}>
                  {streakShort}
                </Text>
              </View>
            </View>
            <ProgressBar fraction={garden.progress.fraction} />
            {garden.level.level >= COLOUR_UNLOCK_LEVEL ? (
              <View style={styles.swatches} accessibilityRole="radiogroup" accessibilityLabel="House colour">
                {HOME_COLOURS.map((option) => {
                  const on = garden.homeColour === option.id;
                  return (
                    <Pressable
                      key={option.id}
                      onPress={() => {
                        haptics.selection();
                        garden.setHomeColour(option.id);
                      }}
                      accessibilityRole="radio"
                      accessibilityLabel={option.name}
                      accessibilityState={{ selected: on }}
                      hitSlop={6}
                      style={({ pressed }) => [styles.swatchHit, pressed && { opacity: 0.7 }]}
                    >
                      <View style={[styles.swatch, { backgroundColor: option.wall }, on && styles.swatchOn]} />
                    </Pressable>
                  );
                })}
              </View>
            ) : null}
          </View>
        </Card>

        {garden.justLevelled ? (
          <Pressable
            style={({ pressed }) => [styles.banner, styles.levelUp, pressed && { opacity: 0.8 }]}
            onPress={garden.dismissLevel}
            accessibilityRole="button"
            accessibilityLabel={`Level up. ${garden.justLevelled.unlock}. Dismiss`}
          >
            <Ionicons name="sparkles" size={18} color={color.brandDeep} />
            <Text style={[type.captionStrong, { flex: 1, color: color.brandDeep }]}>{garden.justLevelled.unlock}</Text>
            <Ionicons name="close" size={18} color={color.brandDeep} />
          </Pressable>
        ) : null}

        {alert ? (
          <View style={[styles.banner, styles.alert]} accessibilityRole="alert">
            <Ionicons name="warning" size={18} color={color.dangerText} />
            <Text style={[type.caption, { flex: 1, color: color.text }]}>{alert}</Text>
          </View>
        ) : null}

        {empty ? (
          <Card padding={space.sm}>
            <EmptyState
              icon="leaf"
              title="Nothing growing yet"
              body="Start with a radish. Ready in four weeks and hard to get wrong."
              action={
                <Button
                  label="Plant something"
                  icon="add"
                  onPress={() => setPlotToPlant(garden.firstEmptyPlot ?? 0)}
                />
              }
            />
          </Card>
        ) : null}

        {garden.thirsty.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.chipRow}
            contentContainerStyle={styles.chipRowContent}
          >
            {garden.thirsty.map((planting) => (
              <WaterChip key={planting.id} planting={planting} onWater={() => garden.water(planting)} />
            ))}
          </ScrollView>
        ) : null}

              <HomeStrip
                tier={garden.level.home}
                colour={garden.homeColour}
                pets={pets}
                homeName={garden.level.homeName}
                plantings={garden.plantings}
                condition={garden.weather?.condition ?? 'partlyCloudy'}
                onOpen={openMap}
              />
              {/* The watering-reminder prompt used to sit here. Expo Go cannot reliably
                  grant notification permission, so the card asked for something it could
                  not deliver and then would not go away. The scheduling itself is intact
                  in services/reminders.ts and runs as soon as permission exists in a real
                  build - it just no longer takes up the home screen promising it. */}
            </View>
          }
          onOpenPlant={openPlant}
          onPlantEmpty={plantEmpty}
        />

        <Animated.View
          style={[styles.header, { transform: [{ translateY: weatherShift }] }]}
          onLayout={(e) => setWeatherHeight(e.nativeEvent.layout.height)}
          pointerEvents="box-none"
        >
          <WeatherTile
            note={thirstyLine}
            weather={garden.weather}
            onOpenLocation={() => setLocationOpen(true)}
          />
        </Animated.View>
      </View>

      <LocationModal open={locationOpen} onClose={() => setLocationOpen(false)} />
      <PlotMapModal
        open={mapOpen}
        onClose={closeMap}
        onOpenPlant={(planting) => { setMapOpen(false); openPlant(planting); }}
        onPlantEmpty={(plot) => { setMapOpen(false); plantEmpty(plot); }}
      />
      <PlantDetailModal planting={selectedLive} onClose={() => setSelected(null)} />
      <AddPlantModal plot={plotToPlant} onClose={() => setPlotToPlant(null)} />
    </View>
  );
}

/// One-tap watering from the home screen. The chip shrinks away as the water lands
/// rather than vanishing, so the eye can follow what just happened.
function WaterChip({ planting, onWater }: { planting: Planting; onWater: () => void }) {
  const fade = useRef(new Animated.Value(1)).current;
  const reduceMotion = useReduceMotion();
  const done = useRef(false);

  const press = () => {
    if (done.current) return;
    done.current = true;
    haptics.tap();
    if (reduceMotion) {
      onWater();
      return;
    }
    Animated.timing(fade, { toValue: 0, duration: motion.quick, useNativeDriver: true }).start(onWater);
  };

  return (
    <Animated.View style={{ opacity: fade, transform: [{ scale: fade.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) }] }}>
      <Pressable
        onPress={press}
        accessibilityRole="button"
        accessibilityLabel={`Water ${planting.nickname}`}
        style={({ pressed }) => [styles.waterChip, pressed && { backgroundColor: '#D3E7F7' }]}
      >
        <Ionicons name="water" size={15} color={color.waterText} />
        {/* The droplet already says "water". The name is the only new information. */}
        <Text style={styles.waterChipText}>{planting.nickname}</Text>
      </Pressable>
    </Animated.View>
  );
}

/// What is still missing before the next level lands.
function nextLevelLine(progress: ReturnType<typeof levelProgress>) {
  if (!progress.next) return '';
  const bits: string[] = [];
  if (progress.streakLeft > 0) {
    bits.push(progress.streakLeft === 1 ? '1 more day' : `${progress.streakLeft} more days`);
  }
  if (progress.plantsLeft > 0) {
    bits.push(progress.plantsLeft === 1 ? '1 more plant' : `${progress.plantsLeft} more plants`);
  }
  if (bits.length === 0) return `Ready for the ${progress.next.homeName.toLowerCase()}.`;
  return `${bits.join(' and ')} to the ${progress.next.homeName.toLowerCase()}.`;
}

const styles = StyleSheet.create({
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: size.gutter,
    paddingTop: space.sm,
    paddingBottom: space.sm,
    gap: size.cardGap,
  },
  weather: { alignItems: 'center', minWidth: 76, gap: 2 },
  levelRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  streakChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    paddingHorizontal: 10,
    height: 32,
    borderRadius: radius.pill,
    backgroundColor: color.dangerTint,
  },
  streakText: { fontSize: 13, fontWeight: '700', color: color.text },
  swatches: { flexDirection: 'row', gap: space.sm, marginTop: space.xs },
  swatchHit: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  swatch: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: 'transparent' },
  swatchOn: { borderColor: color.text, transform: [{ scale: 1.15 }] },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.md,
    minHeight: size.tap,
    borderRadius: radius.sm,
  },
  levelUp: { backgroundColor: color.brandTint },
  alert: { backgroundColor: color.dangerTint },
  chipRow: { marginHorizontal: -size.gutter },
  chipRowContent: { flexDirection: 'row', gap: space.sm, paddingHorizontal: size.gutter },
  waterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: size.chip,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    backgroundColor: color.waterTint,
  },
  waterChipText: { fontSize: 14, fontWeight: '600', color: color.waterText },
  plotArea: { flex: 1, paddingHorizontal: size.gutter, paddingBottom: space.md },
});
