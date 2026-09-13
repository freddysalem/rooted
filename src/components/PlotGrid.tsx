import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { PlantSprite } from './PlantSprite';
import { MilestoneTrack } from './MilestoneTrack';
import { PlotFilters, PlotSort, sortPlantings } from './PlotFilters';
import { Planting, getSpecies, latestHeight, progressOf, seedOf } from '../models/planting';
import { Species, lookOf } from '../models/species';
import { color, radius, size, space, type } from '../theme';
import { useReduceMotion } from '../hooks/useReduceMotion';

/// Your plot, as beds in rows.
///
/// Three across, filled in planting order, with one empty bed waiting at the end. It is a
/// list, so it grows without limit and only builds the rows you can actually see - which
/// is the whole reason it is cheap: a screenful of beds is a screenful of drawing however
/// many plants you have.
///
/// Each bed is a strip of soil with the plant standing on it and its name underneath, so
/// the row reads left to right as things you can press rather than as a picture to
/// explore. Nothing here zooms, pans or holds a camera position.

// Three across: more of the plot on screen at once. The milestone track moved inside the
// bed's own picture to pay for it - there is no room for words under a 100px tile.
const COLUMNS = 3;
const SPRITE_H = 78;
// Thin. It is the ground the plant stands on, not the subject of the picture, and every
// pixel of it is a pixel of plant nobody can see.
const SOIL_H = 13;

/// Must match the floor inside PlantSprite, which never draws a plant at zero size.
const SPRITE_FLOOR = 0.3;

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

/// A FlatList that can drive an Animated.Value from its own scrolling.
///
/// The weather tile above this list slides away on a native-driven transform, and React
/// Native refuses a native onScroll handler on a plain VirtualizedList - it has to be
/// wrapped first. The web build ignores useNativeDriver entirely, which is why this only
/// ever failed on a real phone.
const AnimatedFlatList = Animated.createAnimatedComponent(FlatList) as unknown as typeof FlatList;

type Cell =
  | { key: string; kind: 'planting'; planting: Planting }
  | { key: string; kind: 'empty'; plot: number };

/// How grown this plant looks. A real measurement outranks the calendar - the point of
/// recording a height is that the drawn plant matches the one in the ground.
function growthOf(planting: Planting, species: Species) {
  const measured = latestHeight(planting);
  return measured !== null
    ? clamp(measured / Math.max(species.matureHeightCm, 1), 0.02, 1)
    : progressOf(planting);
}

export function PlotGrid({
  plantings, isThirsty, onOpenPlant, onPlantEmpty, header, onScroll, onHeaderLayout, contentTop = 0,
}: {
  plantings: Planting[];
  isThirsty: (planting: Planting) => boolean;
  onOpenPlant: (planting: Planting) => void;
  onPlantEmpty: (plot: number) => void;
  /** Drawn above the first row and scrolls with it. */
  header?: React.ReactElement | null;
  /** Animated scroll handler, for the collapsing weather tile above. */
  onScroll?: (event: any) => void;
  /** Fires with the height of everything above the first row of beds. */
  onHeaderLayout?: (height: number) => void;
  /** Room left at the top for whatever is floating over the list. */
  contentTop?: number;
}) {
  const [sort, setSort] = useState<PlotSort>('planted');
  // Beds are laid out in planting order, so the rows stay dense even if a plant in the
  // middle was pulled up and left a gap in the stored indices.
  const cells = useMemo<Cell[]>(() => {
    const ordered = sortPlantings(plantings, sort, isThirsty);
    const nextPlot = plantings.reduce((highest, p) => Math.max(highest, p.plot + 1), 0);
    return [
      ...ordered.map((planting) => ({
        key: planting.id,
        kind: 'planting' as const,
        planting,
      })),
      { key: `empty-${nextPlot}`, kind: 'empty' as const, plot: nextPlot },
    ];
  }, [plantings, sort, isThirsty]);

  const renderItem = useCallback(({ item }: { item: Cell }) => (
    item.kind === 'planting' ? (
      <PlantedBed
        planting={item.planting}
        thirsty={isThirsty(item.planting)}
        onPress={onOpenPlant}
      />
    ) : (
      <EmptyBed plot={item.plot} onPress={onPlantEmpty} />
    )
  ), [isThirsty, onOpenPlant, onPlantEmpty]);

  return (
    <AnimatedFlatList
      data={cells}
      keyExtractor={(cell) => cell.key}
      numColumns={COLUMNS}
      renderItem={renderItem}
      columnWrapperStyle={styles.row}
      contentContainerStyle={[styles.content, { paddingTop: contentTop }]}
      ListHeaderComponent={
        <View onLayout={(e) => onHeaderLayout?.(e.nativeEvent.layout.height)}>
          {header}
          {plantings.length > 1 ? <PlotFilters sort={sort} onSort={setSort} /> : null}
        </View>
      }
      onScroll={onScroll}
      scrollEventThrottle={16}
      showsVerticalScrollIndicator={false}
      initialNumToRender={9}
      maxToRenderPerBatch={6}
      windowSize={5}
    />
  );
}

/// A slow breath between two blues. Close enough together that it reads as a glow rather
/// than a flashing warning - this is a plant that would like a drink, not an alarm.
const THIRSTY_DIM = '#7FC0EE';
const THIRSTY_BRIGHT = '#2F93DC';

function useThirstPulse(active: boolean) {
  const wave = useRef(new Animated.Value(0)).current;
  const reduceMotion = useReduceMotion();

  useEffect(() => {
    if (!active || reduceMotion) {
      wave.setValue(reduceMotion && active ? 1 : 0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(wave, { toValue: 1, duration: 1100, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
        Animated.timing(wave, { toValue: 0, duration: 1100, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [active, reduceMotion]);

  return wave.interpolate({ inputRange: [0, 1], outputRange: [THIRSTY_DIM, THIRSTY_BRIGHT] });
}

const PlantedBed = memo(function PlantedBed({ planting, thirsty, onPress }: {
  planting: Planting;
  thirsty: boolean;
  onPress: (planting: Planting) => void;
}) {
  const species = getSpecies(planting);
  const pulse = useThirstPulse(thirsty);
  const growth = growthOf(planting, species);
  const named = planting.nickname.trim().length > 0
    && planting.nickname.trim().toLowerCase() !== species.name.toLowerCase();
  const press = useCallback(() => onPress(planting), [onPress, planting]);

  return (
    <Pressable
      onPress={press}
      accessibilityRole="button"
      accessibilityLabel={`${named ? `${planting.nickname}, ` : ''}${species.name}${thirsty ? ', needs water' : ''}`}
      style={({ pressed }) => [styles.cell, pressed && styles.cellPressed]}
    >
      {/* A plant that wants water gets a breathing blue edge. The droplet badge that
          used to do this job sat underneath the milestone track and could not be seen. */}
      <Animated.View
        style={[
          styles.stage,
          thirsty && { borderWidth: 2, borderColor: pulse },
        ]}
      >
        {/* Over the sky, above the plant: progress without stealing a line of height. */}
        <View style={styles.track} pointerEvents="none">
          <MilestoneTrack planting={planting} compact />
        </View>
        <View style={styles.sprite}>
          <PlantSprite
            look={lookOf(species)}
            progress={growth}
            seed={seedOf(planting)}
            height={SPRITE_H}
          />
        </View>
        <Soil />
      </Animated.View>
      {/* A nickname earns the bold line and the species drops underneath it. Without one,
          "Radish" over "Radish" was just the same word twice. */}
      {named ? (
        <>
          <Text numberOfLines={1} style={styles.name}>{planting.nickname}</Text>
          <Text numberOfLines={1} style={type.caption}>{species.name}</Text>
        </>
      ) : (
        <Text numberOfLines={1} style={styles.name}>{species.name}</Text>
      )}
    </Pressable>
  );
});

const EmptyBed = memo(function EmptyBed({ plot, onPress }: {
  plot: number;
  onPress: (plot: number) => void;
}) {
  const press = useCallback(() => onPress(plot), [onPress, plot]);

  return (
    <Pressable
      onPress={press}
      accessibilityRole="button"
      accessibilityLabel="Empty bed. Plant something here"
      style={({ pressed }) => [styles.cell, pressed && styles.cellPressed]}
    >
      <View style={[styles.stage, styles.stageEmpty]}>
        <Ionicons name="add" size={22} color={color.soilText} />
      </View>
      <Text numberOfLines={1} style={[styles.name, { color: color.textSecondary }]}>Empty</Text>
      <Text numberOfLines={1} style={type.caption}>Plant something</Text>
    </Pressable>
  );
});

/// The strip of earth the plant stands on. Drawn rather than tinted so the beds have some
/// depth to them without the whole screen becoming a picture.
const Soil = memo(function Soil() {
  return (
    <View style={styles.soil} pointerEvents="none">
      <Svg width="100%" height={SOIL_H}>
        <Defs>
          <LinearGradient id="soil" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#A0764C" />
            <Stop offset="1" stopColor="#6F4C31" />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height={SOIL_H} rx={8} fill="url(#soil)" />
      </Svg>
    </View>
  );
});

const styles = StyleSheet.create({
  content: { paddingBottom: space.xl, gap: space.md },
  row: { gap: space.md },
  cell: {
    flex: 1 / COLUMNS,
    gap: 3,
    padding: space.xs,
    borderRadius: radius.sm,
  },
  cellPressed: { backgroundColor: color.surfacePressed },
  stage: {
    height: SPRITE_H + SOIL_H * 0.4,
    borderRadius: radius.sm,
    backgroundColor: color.sky + '55',
    alignItems: 'center',
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  stageEmpty: {
    backgroundColor: color.surfaceSunken,
    borderWidth: 1.5,
    borderColor: color.soilTint,
    borderStyle: 'dashed',
    justifyContent: 'center',
  },
  sprite: { position: 'absolute', bottom: SOIL_H * 0.55, alignItems: 'center' },
  soil: { position: 'absolute', left: 0, right: 0, bottom: 0, height: SOIL_H },
  track: { position: 'absolute', top: 6, left: 8, right: 8, zIndex: 2 },
  name: { fontSize: 13, lineHeight: 16, fontWeight: '700', color: color.text },
});
