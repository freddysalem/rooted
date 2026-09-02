import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated, Easing, LayoutChangeEvent, PanResponder, Pressable, StyleSheet, Text, View,
} from 'react-native';
import Svg, { Circle, Ellipse, G, Path, Polygon, Rect } from 'react-native-svg';
import { PlantSprite } from './PlantSprite';
import { Homestead, PetSprite, homeFootprint } from './Homestead';
import { Planting, getSpecies, latestHeight, plotLayout, progressOf, seedOf } from '../models/planting';
import { HomeColourId, HomeTier, Pet } from '../models/progress';
import { Species } from '../models/species';
import { Theme } from '../theme';

/// The farm, drawn as ground you look across rather than a grid you look down on.
///
/// Everything hangs off one projection: a bed at (column, row) lands at a fixed point on a
/// flat diamond, and the things standing on it stay upright. That is the whole trick - the
/// ground is in perspective, the plants and buildings on it are not.
///
/// The plot has no fixed extent. It is exactly as large as what you have planted, plus one
/// empty bed waiting, and the field, the world and the framing all resize to match.

const TILE_W = 132;
const TILE_H = 66;
const FIELD_DEPTH = 16;   // the raised lip of soil, drawn as a side wall
const PAD = 96;           // grass beyond the furthest thing in the scene
const GRASS = '#74C05A';

const MIN_SCALE = 0.4;
const MAX_SCALE = 2.4;
const DRAG_SLOP = 4;      // below this a touch is a tap, not a drag
const LABEL_SCALE = 0.72; // below this, names are dropped - a full plot is a wall of text

/// Must match the floor inside PlantSprite, which never draws a plant at zero size.
const SPRITE_FLOOR = 0.3;

function iso(col: number, row: number) {
  return { x: (col - row) * (TILE_W / 2), y: (col + row) * (TILE_H / 2) };
}

// Where the buildings and animals stand, in the same grid coordinates as the beds, so
// they keep their place relative to the field however far it spreads.
const HOUSE_AT = iso(-1.9, -0.6);
const PET_AT: Record<Pet, { x: number; y: number }> = {
  chickens: iso(-2.1, 0.7),
  dog: iso(-1.9, 2.1),
  horse: iso(-3.4, 2.8),
};

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

const diamond = (cx: number, cy: number, w = TILE_W, h = TILE_H) =>
  `${cx},${cy - h / 2} ${cx + w / 2},${cy} ${cx},${cy + h / 2} ${cx - w / 2},${cy}`;

/// Works out how big everything is for a given number of beds.
function buildWorld(tileCount: number, tier: HomeTier, pets: Pet[]) {
  const { columns, rows } = plotLayout(tileCount);

  const corners = {
    top: iso(-0.5, -0.5),
    right: iso(columns - 0.5, -0.5),
    bottom: iso(columns - 0.5, rows - 0.5),
    left: iso(-0.5, rows - 0.5),
  };

  const foot = homeFootprint(tier);
  const points = [...Object.values(corners), HOUSE_AT, ...pets.map((p) => PET_AT[p])];
  const minX = Math.min(...points.map((p) => p.x));
  const maxX = Math.max(...points.map((p) => p.x));
  const minY = Math.min(...points.map((p) => p.y));
  const maxY = Math.max(...points.map((p) => p.y));

  // Symmetric padding keeps the scene centred in the world, which is what makes
  // "recentre" land on something sensible at every size.
  const padX = PAD + foot.width / 2;
  const padY = PAD + foot.height;

  return {
    columns,
    rows,
    corners,
    originX: padX - minX,
    originY: padY - minY,
    worldW: maxX - minX + padX * 2,
    worldH: maxY - minY + padY * 2 + FIELD_DEPTH,
    contentW: maxX - minX + foot.width,
    contentH: maxY - minY + foot.height + FIELD_DEPTH,
  };
}

type World = ReturnType<typeof buildWorld>;

/// How tall this plant should stand on screen.
///
/// A measurement, if there is one, outranks the calendar - the point of recording a real
/// height is that the drawn plant matches the real one rather than an average of it.
function spriteMetrics(planting: Planting, species: Species) {
  const measured = latestHeight(planting);
  const growth = measured !== null
    ? clamp(measured / Math.max(species.matureHeightCm, 1), 0.02, 1)
    : progressOf(planting);
  const fullHeight = 30 + 44 * Math.sqrt(clamp(species.matureHeightCm / 240, 0.05, 1));
  return { fullHeight, growth };
}

function scatter(seed: number) {
  const x = Math.sin(seed * 127.1) * 43758.5453;
  return x - Math.floor(x);
}

export function IsoPlot({
  plantings, isThirsty, onOpenPlant, onPlantEmpty, homeTier, homeColour, pets,
}: {
  plantings: Planting[];
  isThirsty: (planting: Planting) => boolean;
  onOpenPlant: (planting: Planting) => void;
  onPlantEmpty: (plot: number) => void;
  homeTier: HomeTier;
  homeColour: HomeColourId;
  pets: Pet[];
}) {
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const [labelled, setLabelled] = useState(true);
  const labelledRef = useRef(true);

  // Beds are laid out in planting order, so the block fills densely even if a plant in
  // the middle was pulled up and left a gap in the stored indices.
  const ordered = useMemo(() => [...plantings].sort((a, b) => a.plot - b.plot), [plantings]);
  const world = useMemo(
    () => buildWorld(ordered.length + 1, homeTier, pets),
    [ordered.length, homeTier, pets]
  );

  const positionOf = (index: number) => {
    const col = index % world.columns;
    const row = Math.floor(index / world.columns);
    const p = iso(col, row);
    return { x: world.originX + p.x, y: world.originY + p.y, depth: col + row };
  };

  const scale = useRef(new Animated.Value(1)).current;
  const tx = useRef(new Animated.Value(0)).current;
  const ty = useRef(new Animated.Value(0)).current;
  const state = useRef({ scale: 1, tx: 0, ty: 0 });
  const gesture = useRef({ scale: 1, tx: 0, ty: 0, distance: 0, focal: { x: 0, y: 0 } });

  const showLabels = (value: number) => {
    const next = value >= LABEL_SCALE;
    if (next !== labelledRef.current) {
      labelledRef.current = next;
      setLabelled(next);
    }
  };

  const apply = (next: { scale: number; tx: number; ty: number }) => {
    const limited = limit(next, viewport, world);
    state.current = limited;
    scale.setValue(limited.scale);
    tx.setValue(limited.tx);
    ty.setValue(limited.ty);
    showLabels(limited.scale);
  };

  const zoomBy = (factor: number) => {
    const current = state.current;
    const target = clamp(current.scale * factor, MIN_SCALE, MAX_SCALE);
    const k = target / current.scale;
    apply({ scale: target, tx: current.tx * k, ty: current.ty * k });
  };

  const fit = (size = viewport) => {
    if (!size.width || !size.height) return;
    const next = clamp(
      Math.min((size.width * 0.94) / world.contentW, (size.height * 0.88) / world.contentH),
      MIN_SCALE,
      MAX_SCALE
    );
    state.current = { scale: next, tx: 0, ty: 0 };
    scale.setValue(next);
    tx.setValue(0);
    ty.setValue(0);
    showLabels(next);
  };

  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setViewport({ width, height });
    if (!state.current.tx && !state.current.ty && state.current.scale === 1) {
      fit({ width, height });
    }
  };

  // Planting the first bed of a new row changes the whole field, so reframe on it.
  const lastFit = useRef('');
  useEffect(() => {
    const key = `${world.columns}x${world.rows}-${homeTier}`;
    if (viewport.width && lastFit.current && lastFit.current !== key) fit();
    lastFit.current = key;
  }, [world.columns, world.rows, homeTier, viewport.width]);

  const responder = useMemo(
    () =>
      PanResponder.create({
        // Taps must reach the plants underneath, so the container only takes over once
        // the finger has actually travelled, or a second finger lands.
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (event, g) =>
          event.nativeEvent.touches.length > 1 ||
          Math.abs(g.dx) > DRAG_SLOP ||
          Math.abs(g.dy) > DRAG_SLOP,
        onPanResponderGrant: (event) => {
          const touches = event.nativeEvent.touches;
          gesture.current = {
            ...state.current,
            distance: touches.length > 1 ? touchDistance(touches) : 0,
            focal: touches.length > 1 ? touchMidpoint(touches) : { x: 0, y: 0 },
          };
        },
        onPanResponderMove: (event, g) => {
          const touches = event.nativeEvent.touches;
          const start = gesture.current;

          if (touches.length > 1) {
            const distance = touchDistance(touches);
            if (!start.distance || !distance) return;
            const target = clamp(start.scale * (distance / start.distance), MIN_SCALE, MAX_SCALE);
            const k = target / start.scale;
            const u = {
              x: start.focal.x - viewport.width / 2,
              y: start.focal.y - viewport.height / 2,
            };
            apply({
              scale: target,
              tx: u.x - k * (u.x - start.tx),
              ty: u.y - k * (u.y - start.ty),
            });
            return;
          }

          apply({ scale: start.scale, tx: start.tx + g.dx, ty: start.ty + g.dy });
        },
      }),
    [viewport.width, viewport.height, world]
  );

  const addIndex = ordered.length;
  const addAt = positionOf(addIndex);

  // Painter's order: further back first, so nearer things overlap them.
  const drawOrder = useMemo(
    () => ordered.map((planting, index) => ({ planting, index })).sort(
      (a, b) => positionOf(a.index).depth - positionOf(b.index).depth
    ),
    [ordered, world]
  );

  return (
    <View style={styles.viewport} onLayout={onLayout} {...responder.panHandlers}>
      <Animated.View
        style={[
          { width: world.worldW, height: world.worldH },
          { transform: [{ translateX: tx }, { translateY: ty }, { scale }] },
        ]}
      >
        <Ground
          world={world}
          plantedCount={ordered.length}
          addAt={addAt}
          homeTier={homeTier}
          homeColour={homeColour}
          pets={pets}
          positionOf={positionOf}
        />

        {drawOrder.map(({ planting, index }) => {
          const { x, y } = positionOf(index);
          return (
            <PlantOnPlot
              key={planting.id}
              planting={planting}
              x={x}
              y={y}
              thirsty={isThirsty(planting)}
              labelled={labelled}
              onPress={() => onOpenPlant(planting)}
            />
          );
        })}

        <Pressable
          onPress={() => onPlantEmpty(addIndex)}
          style={[styles.hit, { left: addAt.x - TILE_W / 2, top: addAt.y - TILE_H / 2 }]}
        />
      </Animated.View>

      <View style={styles.controls}>
        <Pressable style={styles.round} onPress={() => zoomBy(1.35)} hitSlop={6}>
          <Text style={styles.roundText}>+</Text>
        </Pressable>
        <Pressable style={styles.round} onPress={() => zoomBy(1 / 1.35)} hitSlop={6}>
          <Text style={styles.roundText}>-</Text>
        </Pressable>
        <Pressable style={styles.recentre} onPress={() => fit()} hitSlop={6}>
          <Text style={styles.recentreText}>Recentre</Text>
        </Pressable>
      </View>
    </View>
  );
}

/// Stops the farm being flung somewhere you cannot get it back from.
function limit(
  next: { scale: number; tx: number; ty: number },
  viewport: { width: number; height: number },
  world: World
) {
  const scaled = { w: world.worldW * next.scale, h: world.worldH * next.scale };
  const slackX = Math.max(0, (scaled.w - viewport.width) / 2) + viewport.width / 3;
  const slackY = Math.max(0, (scaled.h - viewport.height) / 2) + viewport.height / 3;
  return {
    scale: next.scale,
    tx: clamp(next.tx, -slackX, slackX),
    ty: clamp(next.ty, -slackY, slackY),
  };
}

type Touch = { pageX: number; pageY: number };
const touchDistance = (touches: Touch[]) =>
  Math.hypot(touches[0].pageX - touches[1].pageX, touches[0].pageY - touches[1].pageY);
const touchMidpoint = (touches: Touch[]) => ({
  x: (touches[0].pageX + touches[1].pageX) / 2,
  y: (touches[0].pageY + touches[1].pageY) / 2,
});

/// Grass, trees, the house, the animals, and one bed per plant.
function Ground({ world, plantedCount, addAt, homeTier, homeColour, pets, positionOf }: {
  world: World;
  plantedCount: number;
  addAt: { x: number; y: number };
  homeTier: HomeTier;
  homeColour: HomeColourId;
  pets: Pet[];
  positionOf: (index: number) => { x: number; y: number; depth: number };
}) {
  const { originX, originY, corners, worldW, worldH } = world;
  const at = (p: { x: number; y: number }) => ({ x: originX + p.x, y: originY + p.y });

  const c = {
    top: at(corners.top), right: at(corners.right),
    bottom: at(corners.bottom), left: at(corners.left),
  };
  const field = `${c.top.x},${c.top.y} ${c.right.x},${c.right.y} ${c.bottom.x},${c.bottom.y} ${c.left.x},${c.left.y}`;
  const wall = `${c.left.x},${c.left.y} ${c.bottom.x},${c.bottom.y} ${c.right.x},${c.right.y} `
    + `${c.right.x},${c.right.y + FIELD_DEPTH} ${c.bottom.x},${c.bottom.y + FIELD_DEPTH} ${c.left.x},${c.left.y + FIELD_DEPTH}`;

  const house = at(HOUSE_AT);

  return (
    <Svg width={worldW} height={worldH} style={StyleSheet.absoluteFill}>
      <Rect x={0} y={0} width={worldW} height={worldH} fill={GRASS} />
      <Scenery worldW={worldW} worldH={worldH} />

      <Homestead tier={homeTier} colour={homeColour} x={house.x} y={house.y} />
      {pets.map((pet) => {
        const spot = at(PET_AT[pet]);
        return <PetSprite key={pet} pet={pet} x={spot.x} y={spot.y} />;
      })}

      <Polygon points={wall} fill="#6F4C31" />
      <Polygon points={field} fill="#A0764C" stroke="#75502F" strokeWidth={2} />

      {Array.from({ length: plantedCount }, (_, index) => {
        const { x, y } = positionOf(index);
        return (
          <G key={`bed-${index}`}>
            <Polygon
              points={diamond(x, y, TILE_W - 10, TILE_H - 5)}
              fill="#9C6F47"
              stroke="#7A5433"
              strokeWidth={1.5}
            />
            <Polygon points={diamond(x, y, TILE_W - 46, TILE_H - 23)} fill="#8A5F3C" opacity={0.5} />
            <Ellipse cx={x} cy={y + 3} rx={16} ry={7} fill="#000" opacity={0.14} />
          </G>
        );
      })}

      {/* The next bed along, waiting to be claimed. */}
      <G opacity={0.62}>
        <Polygon
          points={diamond(addAt.x, addAt.y, TILE_W - 10, TILE_H - 5)}
          fill="#C9C4B4"
          stroke="#8C8577"
          strokeWidth={1.5}
          strokeDasharray="6 5"
        />
        <Rect x={addAt.x - 11} y={addAt.y - 2.5} width={22} height={5} rx={2.5} fill="#6E6A5E" />
        <Rect x={addAt.x - 2.5} y={addAt.y - 11} width={5} height={22} rx={2.5} fill="#6E6A5E" />
      </G>
    </Svg>
  );
}

/// Trees and bushes around the edge, so the farm sits in something rather than floating.
function Scenery({ worldW, worldH }: { worldW: number; worldH: number }) {
  const items = [];
  const edges = [
    { count: 7, at: (t: number, i: number) => ({ x: 40 + t * (worldW - 80), y: 30 + scatter(i) * 34 }) },
    { count: 7, at: (t: number, i: number) => ({ x: 40 + t * (worldW - 80), y: worldH - 30 - scatter(i) * 34 }) },
    { count: 5, at: (t: number, i: number) => ({ x: 30 + scatter(i) * 34, y: 60 + t * (worldH - 120) }) },
    { count: 5, at: (t: number, i: number) => ({ x: worldW - 30 - scatter(i) * 34, y: 60 + t * (worldH - 120) }) },
  ];

  let n = 0;
  for (const edge of edges) {
    for (let i = 0; i < edge.count; i++) {
      n += 1;
      const { x, y } = edge.at((i + 0.5) / edge.count, n * 3 + 1);
      const size = 13 + scatter(n * 11 + 3) * 11;
      const tree = scatter(n * 13 + 9) > 0.5;
      items.push(
        <G key={`s${n}`}>
          <Ellipse cx={x} cy={y + size * 0.55} rx={size * 0.8} ry={size * 0.28} fill="#000" opacity={0.12} />
          {tree ? (
            <G>
              <Rect x={x - 2.5} y={y - size * 0.1} width={5} height={size * 0.7} rx={2} fill="#7A5433" />
              <Circle cx={x} cy={y - size * 0.35} r={size * 0.72} fill="#3F8F3C" />
              <Circle cx={x - size * 0.3} cy={y - size * 0.15} r={size * 0.5} fill="#4EA349" />
            </G>
          ) : (
            <G>
              <Ellipse cx={x} cy={y} rx={size * 0.62} ry={size * 0.48} fill="#4EA349" />
              <Ellipse cx={x - size * 0.22} cy={y - size * 0.12} rx={size * 0.36} ry={size * 0.3} fill="#5CB755" />
            </G>
          )}
        </G>
      );
    }
  }
  return <G>{items}</G>;
}

function PlantOnPlot({ planting, x, y, thirsty, labelled, onPress }: {
  planting: Planting;
  x: number;
  y: number;
  thirsty: boolean;
  labelled: boolean;
  onPress: () => void;
}) {
  const species = getSpecies(planting);
  const { fullHeight, growth } = spriteMetrics(planting, species);
  // Mirrors the sprite's own internal scale, so the marker tracks the top of the plant
  // as it grows rather than hovering over empty space above a seedling.
  const drawnHeight = fullHeight * (SPRITE_FLOOR + (1 - SPRITE_FLOOR) * clamp(growth, 0, 1));

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.plant,
        { left: x - TILE_W / 2, top: y - fullHeight + TILE_H * 0.18, width: TILE_W },
      ]}
    >
      {thirsty ? <WaterMarker top={fullHeight - drawnHeight - 26} /> : null}
      <PlantSprite
        family={species.family}
        progress={growth}
        seed={seedOf(planting)}
        height={fullHeight}
      />
      {labelled ? (
        <Text numberOfLines={1} style={styles.name}>{planting.nickname}</Text>
      ) : null}
    </Pressable>
  );
}

/// The hovering drop. It bobs so it reads as a prompt rather than part of the plant.
function WaterMarker({ top }: { top: number }) {
  const bob = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(bob, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [bob]);

  const lift = bob.interpolate({ inputRange: [0, 1], outputRange: [0, -6] });

  return (
    <Animated.View style={[styles.marker, { top }, { transform: [{ translateY: lift }] }]}>
      <Svg width={26} height={32} viewBox="0 0 26 32">
        <Ellipse cx={13} cy={30} rx={6} ry={2} fill="#000" opacity={0.16} />
        <Path
          d="M13 1 C13 1 3 13.5 3 19.2 A10 10 0 0 0 23 19.2 C23 13.5 13 1 13 1 Z"
          fill="#4FA8E8"
          stroke="#2E86C8"
          strokeWidth={1.5}
        />
        <Ellipse cx={9.5} cy={18} rx={2.4} ry={3.4} fill="#FFF" opacity={0.5} />
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  viewport: {
    flex: 1,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: GRASS,
    justifyContent: 'center',
    alignItems: 'center',
  },
  hit: { position: 'absolute', width: TILE_W, height: TILE_H },
  plant: { position: 'absolute', alignItems: 'center' },
  marker: { position: 'absolute', zIndex: 2 },
  name: {
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
    color: '#FFF',
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  controls: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  round: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  roundText: { fontSize: 19, fontWeight: '700', color: Theme.leafDeep, lineHeight: 22 },
  recentre: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  recentreText: { fontSize: 12, fontWeight: '700', color: Theme.leafDeep },
});
