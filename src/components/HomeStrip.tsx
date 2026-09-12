import React, { memo, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Ellipse, Rect } from 'react-native-svg';
import { Homestead, PetSprite, homeFootprint } from './Homestead';
import { HomeColourId, HomeTier, Pet } from '../models/progress';
import { color, radius, space, type } from '../theme';

/// What levelling up has got you so far, drawn once and left alone.
///
/// The house and the animals used to live in a farm you could roam around. The plot is
/// rows of beds again, so they keep their own band above it: still yours, still visibly
/// bigger every few levels, but static - no camera, no gestures, and one fixed-size
/// drawing whatever else is on the screen.

const HEIGHT = 104;
const GROUND = HEIGHT - 16;
const SKY = '#CFE9F5';
const GRASS = '#74C05A';

export const HomeStrip = memo(function HomeStrip({ tier, colour, pets, homeName }: {
  tier: HomeTier;
  colour: HomeColourId;
  pets: Pet[];
  homeName: string;
}) {
  // The houses are drawn at wildly different sizes as they grow, so the band scales each
  // one to fit rather than letting an estate spill over the edges of a shed's frame.
  const layout = useMemo(() => {
    const foot = homeFootprint(tier);
    const room = HEIGHT - 26;
    const fit = Math.min(room / Math.max(foot.height, 1), 1);
    return { fit, houseX: 74 };
  }, [tier]);

  return (
    <View style={styles.wrap} accessibilityLabel={`Your ${homeName.toLowerCase()}`}>
      <Svg width="100%" height={HEIGHT}>
        <Rect x="0" y="0" width="100%" height={HEIGHT} fill={SKY} />
        <Rect x="0" y={GROUND - 14} width="100%" height={30} fill={GRASS} />
        <Ellipse cx={layout.houseX} cy={GROUND} rx={54} ry={7} fill="#000" opacity={0.1} />
        <Homestead tier={tier} colour={colour} x={layout.houseX} y={GROUND} scale={layout.fit} />
        {pets.map((pet, index) => (
          <PetSprite key={pet} pet={pet} x={168 + index * 58} y={GROUND} />
        ))}
      </Svg>
      <Text style={[type.caption, styles.label]}>{homeName}</Text>
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: {
    height: HEIGHT,
    borderRadius: radius.sm,
    overflow: 'hidden',
    backgroundColor: SKY,
    marginBottom: space.md,
  },
  label: {
    position: 'absolute',
    right: space.sm,
    bottom: space.xs,
    color: color.text,
    fontWeight: '700',
  },
});
