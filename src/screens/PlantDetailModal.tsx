import React, { useEffect, useState } from 'react';
import {
  Alert, Modal, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import Svg, { Circle, Polyline } from 'react-native-svg';
import { Card, Pill, PrimaryButton, SectionHeader } from '../components/ui';
import { PlantSprite } from '../components/PlantSprite';
import { useGarden } from '../state/GardenContext';
import {
  Planting, daysBetween, daysSincePlanting, daysUntilHarvest, getSpecies, heightGain,
  latestHeight, progressOf, seedOf, sortedHeights, stageLabel, stageOf,
} from '../models/planting';
import { lightLabel } from '../models/species';
import { Theme } from '../theme';
import * as haptics from '../services/haptics';
import { MeasureModal } from './MeasureModal';

/// Everything about one plant. Takes the live record from the store so it stays current
/// while you water and measure from inside the sheet.
export function PlantDetailModal({ planting, onClose }: {
  planting: Planting | null;
  onClose: () => void;
}) {
  const garden = useGarden();
  const [notes, setNotes] = useState('');
  const [measuring, setMeasuring] = useState(false);

  useEffect(() => {
    setNotes(planting?.notes ?? '');
  }, [planting?.id]);

  if (!planting) return <Modal visible={false} onRequestClose={onClose}><View /></Modal>;

  const species = getSpecies(planting);
  const progress = progressOf(planting);
  const heights = sortedHeights(planting);
  const gain = heightGain(planting);
  const latest = latestHeight(planting);

  const lastWateredText = (() => {
    if (!planting.lastWatered) return 'Not watered yet';
    const days = daysBetween(planting.lastWatered);
    if (days === 0) return 'Watered today';
    return days === 1 ? 'Watered yesterday' : `Watered ${days} days ago`;
  })();

  /// Seasonal jobs, driven off the plant's own stage rather than a generic calendar.
  const pruningReminder = (() => {
    if (species.family === 'fruiting' && progress > 0.5)
      return 'Pinch out the side shoots now so the plant puts its energy into fruit.';
    if (species.family === 'herb' && progress > 0.4)
      return 'Keep cutting it back. Herbs get woody the moment you stop picking.';
    if (species.family === 'leafy' && progress > 0.6)
      return 'Take the outer leaves first and leave the centre to keep going.';
    if (species.family === 'root' && progress > 0.9)
      return 'Lift one and check the size before you pull the whole row.';
    if (species.family === 'flower' && progress > 0.8)
      return 'Leave the seed head standing - the birds will thank you in January.';
    return null;
  })();

  const confirmRemoval = () => {
    Alert.alert(
      'Clear this bed?',
      'Your badges stay earned either way.',
      [
        { text: 'Keep it', style: 'cancel' },
        {
          text: `Remove ${planting.nickname}`,
          style: 'destructive',
          onPress: () => {
            garden.removePlanting(planting);
            onClose();
          },
        },
      ]
    );
  };

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: Theme.background }}>
        <View style={styles.bar}>
          <View style={{ width: 50 }} />
          <Text style={styles.barTitle}>{planting.nickname}</Text>
          <Pressable onPress={onClose}><Text style={styles.barPrimary}>Done</Text></Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Card>
            <View style={{ alignItems: 'center', gap: 12 }}>
              <View style={styles.hero}>
                <PlantSprite
                  family={species.family}
                  progress={progress}
                  seed={seedOf(planting)}
                  height={150}
                />
                <View style={styles.heroSoil} />
              </View>

              <View style={{ alignItems: 'center', gap: 3 }}>
                <Text style={styles.name}>{planting.nickname}</Text>
                <Text style={styles.subtle}>{species.name}</Text>
              </View>

              <View style={{ flexDirection: 'row', gap: 6 }}>
                <Pill text={stageLabel[stageOf(planting)]} icon="leaf" />
                <Pill text={lightLabel[species.light]} icon="sunny" tint="sun" />
              </View>

              <View style={{ width: '100%', gap: 6 }}>
                <View style={styles.track}>
                  <View style={[styles.fill, { width: `${Math.max(progress * 100, 4)}%` }]} />
                </View>
                <View style={styles.spread}>
                  <Text style={styles.tiny}>Day {daysSincePlanting(planting)}</Text>
                  <Text style={styles.tiny}>
                    {daysUntilHarvest(planting) === 0
                      ? 'Ready now'
                      : `${daysUntilHarvest(planting)} days to harvest`}
                  </Text>
                </View>
              </View>
            </View>
          </Card>

          <Card>
            <View style={{ gap: 10 }}>
              <SectionHeader title="Water" subtitle={garden.wateringAdvice(planting)} />
              <PrimaryButton
                label="Water now"
                icon="water"
                tone={garden.needsWater(planting) ? 'solid' : 'quiet'}
                onPress={() => garden.water(planting)}
              />
              <View style={styles.spread}>
                <Text style={styles.tiny}>{lastWateredText}</Text>
                <Text style={styles.tiny}>Every {garden.wateringInterval(planting)} days</Text>
              </View>
            </View>
          </Card>

          <Card>
            <View style={{ gap: 12 }}>
              <SectionHeader
                title="Growth"
                subtitle="Photograph it next to something you know the size of - a trowel, a seed packet - and the app works out the rest."
              />
              {heights.length === 0 ? (
                <Text style={styles.tiny}>No measurements yet.</Text>
              ) : (
                <View style={{ gap: 8 }}>
                  <HeightChart values={heights.map((h) => h.centimetres)} />
                  <View style={styles.spread}>
                    {latest !== null ? (
                      <Text style={styles.strong}>Now {Math.round(latest)} cm</Text>
                    ) : <View />}
                    {gain !== null && gain > 0 ? (
                      <Text style={styles.gain}>+{Math.round(gain)} cm since first measured</Text>
                    ) : null}
                  </View>
                </View>
              )}
              <PrimaryButton
                label="Record a height"
                icon="resize"
                tone="quiet"
                onPress={() => {
                  haptics.selection();
                  setMeasuring(true);
                }}
              />
            </View>
          </Card>

          <Card>
            <View style={{ gap: 8 }}>
              <SectionHeader title="Care" />
              <Text style={styles.body}>{species.tip}</Text>
              {pruningReminder ? <Text style={styles.reminder}>✂  {pruningReminder}</Text> : null}
            </View>
          </Card>

          <Card>
            <View style={{ gap: 8 }}>
              <SectionHeader title="Diary" subtitle="What you tried, and whether it worked" />
              <TextInput
                value={notes}
                onChangeText={(text) => {
                  setNotes(text);
                  garden.updateNotes(text, planting);
                }}
                multiline
                placeholder="Notes..."
                placeholderTextColor={Theme.inkSoft}
                style={styles.notes}
              />
            </View>
          </Card>

          <Pressable onPress={confirmRemoval} style={{ paddingVertical: 12 }}>
            <Text style={styles.remove}>
              {stageOf(planting) === 'ready' ? 'Harvest and clear the bed' : 'Remove from plot'}
            </Text>
          </Pressable>
        </ScrollView>

        <MeasureModal
          planting={measuring ? planting : null}
          onClose={() => setMeasuring(false)}
        />
      </SafeAreaView>
    </Modal>
  );
}

/// A plain line of measurements over time.
function HeightChart({ values }: { values: number[] }) {
  const width = 260;
  const height = 90;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = Math.max(max - min, 1);

  const points = values.map((value, index) => {
    const x = values.length === 1 ? width / 2 : (width * index) / (values.length - 1);
    const y = height - ((value - min) / range) * height;
    return { x, y };
  });

  return (
    <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
      <Polyline
        points={points.map((p) => `${p.x},${p.y}`).join(' ')}
        fill="none"
        stroke={Theme.leaf}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {points.map((p, index) => (
        <Circle key={index} cx={p.x} cy={p.y} r={3} fill={Theme.leaf} />
      ))}
    </Svg>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  barTitle: { fontSize: 16, fontWeight: '700', color: Theme.ink },
  barPrimary: { fontSize: 15, fontWeight: '700', color: Theme.leafDeep },
  scroll: { padding: 18, paddingBottom: 40, gap: 14 },
  hero: {
    width: '100%',
    height: 190,
    borderRadius: 16,
    backgroundColor: Theme.sky + '80',
    alignItems: 'center',
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  heroSoil: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 26,
    backgroundColor: Theme.soil,
  },
  name: { fontSize: 24, fontWeight: '700', color: Theme.ink },
  subtle: { fontSize: 14, color: Theme.inkSoft },
  tiny: { fontSize: 12, color: Theme.inkSoft },
  strong: { fontSize: 13, fontWeight: '600', color: Theme.ink },
  gain: { fontSize: 12, color: Theme.leaf },
  body: { fontSize: 14, color: Theme.ink, lineHeight: 20 },
  reminder: { fontSize: 13, color: Theme.inkSoft, lineHeight: 19 },
  track: { height: 10, borderRadius: 5, backgroundColor: Theme.surfaceAlt, overflow: 'hidden' },
  fill: { height: 10, borderRadius: 5, backgroundColor: Theme.leaf },
  spread: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  notes: {
    minHeight: 80,
    backgroundColor: Theme.surfaceAlt,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: Theme.ink,
    textAlignVertical: 'top',
  },
  remove: { textAlign: 'center', fontSize: 14, fontWeight: '600', color: Theme.alert },
});
