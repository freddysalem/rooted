import React, { memo, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle, Ellipse, G, Line, Path, Rect } from 'react-native-svg';
import { Homestead, PetSprite, homeFootprint } from './Homestead';
import { PlantSprite } from './PlantSprite';
import { Planting, getSpecies, latestHeight, progressOf, seedOf } from '../models/planting';
import { lookOf } from '../models/species';
import { HomeColourId, HomeTier, Pet } from '../models/progress';
import { WeatherCondition } from '../services/weather';
import { color, radius, space, type } from '../theme';
import * as haptics from '../services/haptics';

/// Your place, under today's actual sky, with today's actual plants standing in it.
///
/// It is a picture, not a screen: nothing here can be pressed except the whole thing,
/// which opens the plot you can move around. The point is that a glance tells you two
/// true things - what the weather is doing, and roughly how full the garden is.

const HEIGHT = 128;
const GROUND = HEIGHT - 22;

/// Sky colour follows the weather, because a bright blue sky over a rain icon is a lie.
const SKY: Record<WeatherCondition, string> = {
  clear: '#BFE4F5',
  partlyCloudy: '#CFE9F5',
  cloudy: '#D3DDE2',
  rain: '#BFCBD3',
  storm: '#A8B3C2',
  frost: '#DCE9F0',
};

const GRASS = '#74C05A';
const MAX_PLANTS = 6;

export const HomeStrip = memo(function HomeStrip({
  tier, colour, pets, homeName, plantings, condition, onOpen,
}: {
  tier: HomeTier;
  colour: HomeColourId;
  pets: Pet[];
  homeName: string;
  plantings: Planting[];
  condition: WeatherCondition;
  onOpen?: () => void;
}) {
  // The houses are drawn at wildly different sizes as they grow, so the band scales each
  // one to fit rather than letting an estate spill over the edges of a shed's frame.
  const layout = useMemo(() => {
    const foot = homeFootprint(tier);
    const room = HEIGHT - 40;
    const fit = Math.min(room / Math.max(foot.height, 1), 1);
    return { fit, houseX: 62 };
  }, [tier]);

  // The newest few, so a big plot shows what has just gone in rather than what went in
  // first and is long since eaten.
  const shown = useMemo(() => plantings.slice(-MAX_PLANTS), [plantings]);
  const sky = SKY[condition];

  return (
    <Pressable
      onPress={() => {
        if (!onOpen) return;
        haptics.tap();
        onOpen();
      }}
      accessibilityRole={onOpen ? 'button' : 'image'}
      accessibilityLabel={`Your ${homeName.toLowerCase()}, with ${plantings.length} ${plantings.length === 1 ? 'plant' : 'plants'} growing`}
      accessibilityHint={onOpen ? 'Opens the plot map' : undefined}
      style={({ pressed }) => [styles.wrap, { backgroundColor: sky }, pressed && { opacity: 0.9 }]}
    >
      <Svg width="100%" height={HEIGHT}>
        <Rect x="0" y="0" width="100%" height={HEIGHT} fill={sky} />
        <Sky condition={condition} />
        <Rect x="0" y={GROUND - 14} width="100%" height={40} fill={GRASS} />
        <Ellipse cx={layout.houseX} cy={GROUND} rx={46} ry={6} fill="#000" opacity={0.1} />
        <Homestead tier={tier} colour={colour} x={layout.houseX} y={GROUND} scale={layout.fit} />
        {pets.map((pet, index) => (
          <PetSprite key={pet} pet={pet} x={124 + index * 46} y={GROUND} />
        ))}
      </Svg>

      {/* The plants are real sprites rather than SVG inside the scene, so they stay
          exactly the drawings used everywhere else in the app. */}
      <View style={styles.row} pointerEvents="none">
        {shown.map((planting) => {
          const species = getSpecies(planting);
          const measured = latestHeight(planting);
          const growth = measured !== null
            ? Math.min(Math.max(measured / Math.max(species.matureHeightCm, 1), 0.02), 1)
            : progressOf(planting);
          return (
            <View key={planting.id} style={styles.plant}>
              <PlantSprite look={lookOf(species)} progress={growth} seed={seedOf(planting)} height={46} />
            </View>
          );
        })}
      </View>

      <Text style={[type.caption, styles.label]}>{homeName}</Text>
      {onOpen ? (
        <View style={styles.open}>
          <Ionicons name="expand-outline" size={13} color={color.text} />
          <Text style={styles.openLabel}>Open the plot</Text>
        </View>
      ) : null}
    </Pressable>
  );
});

/// Whatever is in the sky today. Small, flat shapes - it has to read at a glance and
/// survive being 128 pixels tall.
function Sky({ condition }: { condition: WeatherCondition }) {
  const sunny = condition === 'clear' || condition === 'partlyCloudy';
  const clouded = condition !== 'clear';
  const dark = condition === 'storm';

  return (
    <G>
      {sunny ? (
        <G>
          <Circle cx="88%" cy={30} r={15} fill="#F2CE4C" />
          {condition === 'clear'
            ? Array.from({ length: 8 }, (_, i) => {
                const a = (i / 8) * Math.PI * 2;
                return (
                  <Line
                    key={i}
                    x1={`${88 + Math.cos(a) * 5.5}%`}
                    y1={30 + Math.sin(a) * 20}
                    x2={`${88 + Math.cos(a) * 7.5}%`}
                    y2={30 + Math.sin(a) * 27}
                    stroke="#F2CE4C"
                    strokeWidth={2.5}
                    strokeLinecap="round"
                  />
                );
              })
            : null}
        </G>
      ) : null}

      {clouded ? (
        <G>
          <Cloud x="78%" y={34} scale={1} dark={dark} />
          <Cloud x="58%" y={22} scale={0.72} dark={dark} />
        </G>
      ) : null}

      {condition === 'rain' || condition === 'storm'
        ? Array.from({ length: 7 }, (_, i) => (
            <Line
              key={i}
              x1={`${64 + i * 4}%`}
              y1={48 + (i % 3) * 5}
              x2={`${63 + i * 4}%`}
              y2={60 + (i % 3) * 5}
              stroke="#6FA8D8"
              strokeWidth={2.5}
              strokeLinecap="round"
            />
          ))
        : null}

      {condition === 'storm' ? (
        <Path d="M 0 0 l 7 0 l -4 7 l 6 0 l -11 13 l 3 -10 l -5 0 Z" fill="#F2CE4C" transform="translate(250 44)" />
      ) : null}

      {condition === 'frost'
        ? Array.from({ length: 6 }, (_, i) => (
            <Circle key={i} cx={`${66 + i * 4.5}%`} cy={52 + (i % 3) * 7} r={2.6} fill="#FFFFFF" />
          ))
        : null}
    </G>
  );
}

function Cloud({ x, y, scale, dark }: { x: string; y: number; scale: number; dark: boolean }) {
  const fill = dark ? '#8A94A8' : '#FFFFFF';
  return (
    <G opacity={dark ? 0.95 : 0.92}>
      <Ellipse cx={x} cy={y} rx={26 * scale} ry={11 * scale} fill={fill} />
      <Ellipse cx={x} cy={y - 7 * scale} rx={16 * scale} ry={11 * scale} fill={fill} />
    </G>
  );
}

const styles = StyleSheet.create({
  wrap: {
    height: HEIGHT,
    borderRadius: radius.sm,
    overflow: 'hidden',
    marginBottom: space.md,
  },
  row: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 16,
    height: 56,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
    paddingRight: space.sm,
    // Starts halfway across, so the row never runs back over the house or its label.
    paddingLeft: '42%',
    gap: 4,
  },
  plant: { flex: 1, maxWidth: 42, alignItems: 'center', justifyContent: 'flex-end' },
  label: {
    position: 'absolute',
    left: space.sm,
    bottom: space.xs,
    color: color.text,
    fontWeight: '700',
  },
  open: {
    position: 'absolute',
    right: space.sm,
    top: space.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: space.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: '#FFFFFFCC',
  },
  openLabel: { fontSize: 11, lineHeight: 14, fontWeight: '700', color: color.text },
});
