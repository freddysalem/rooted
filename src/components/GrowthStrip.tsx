import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { PlantSprite, stageFor } from './PlantSprite';
import { Species, lookOf } from '../models/species';
import { color, radius, space, tabular, type } from '../theme';

/// What this plant will do, from the day you sow it to the day you pick it.
///
/// Four frames of the same drawing at four points along its life, so the thing you are
/// choosing is a plant that grows rather than an icon. It reads left to right like a
/// packet's sowing chart, with the real number of days under each frame, which also
/// quietly answers the question people actually have: how long am I waiting?

const STOPS = [0.06, 0.32, 0.64, 1] as const;
const CAPTIONS = ['Sown', 'Sprouting', 'Growing', 'Ready'] as const;

export const GrowthStrip = memo(function GrowthStrip({ species, height = 92 }: {
  species: Species;
  height?: number;
}) {
  const look = lookOf(species);
  const seed = species.id.length * 7 + 3;

  return (
    <View accessible style={styles.row} accessibilityLabel={`How ${species.name} grows, sown to ready in ${species.daysToHarvest} days`}>
      {STOPS.map((stop, index) => {
        const day = Math.max(Math.round(species.daysToHarvest * stop), 0);
        return (
          <View key={stop} style={styles.frame}>
            <View style={[styles.stage, { height }]}>
              <View style={styles.sprite}>
                <PlantSprite look={look} progress={stop} seed={seed} height={height * 0.82} />
              </View>
              <View style={styles.soil} />
            </View>
            <Text style={styles.caption} numberOfLines={1}>{CAPTIONS[index]}</Text>
            <Text style={[type.caption, tabular]} numberOfLines={1}>
              {index === 0 ? 'day 0' : `day ${day}`}
            </Text>
          </View>
        );
      })}
    </View>
  );
});

/// Which of the four frames a living plant is currently closest to.
export function frameFor(progress: number): number {
  const stage = stageFor(progress);
  return stage === 'seedling' ? 0 : stage === 'juvenile' ? 1 : stage === 'mature' ? 2 : 3;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: space.sm },
  frame: { flex: 1, alignItems: 'center', gap: 2 },
  stage: {
    width: '100%',
    borderRadius: radius.sm,
    backgroundColor: color.sky + '55',
    alignItems: 'center',
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  sprite: { position: 'absolute', bottom: 10, alignItems: 'center' },
  soil: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 14, backgroundColor: '#8A7561' },
  caption: { fontSize: 12, lineHeight: 15, fontWeight: '700', color: color.text },
});
