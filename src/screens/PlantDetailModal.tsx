import React, { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Polyline } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import {
  Button, Card, ContentColumn, Input, Pill, ProgressBar, SectionHeader, SheetBar,
} from '../components/ui';
import { PlantSprite } from '../components/PlantSprite';
import { TraitChips } from '../components/TraitChips';
import { MilestoneTrack } from '../components/MilestoneTrack';
import { surveyLightLabel } from '../models/survey';
import { useGarden } from '../state/GardenContext';
import { CONTAINERS, DEFAULT_CONTAINER, containerLabel, inEverydayTerms } from '../services/water';
import {
  Planting, daysBetween, daysSincePlanting, daysUntilHarvest, getSpecies, heightGain,
  latestHeight, progressOf, seedOf, sortedHeights, stageLabel, stageOf,
} from '../models/planting';
import { lightLabel, lightMinimumHours, lookOf } from '../models/species';
import { color, radius, size, space, tabular, type } from '../theme';
import * as haptics from '../services/haptics';
import { confirmDestructive } from '../services/confirm';
import { MeasureModal } from './MeasureModal';

const NOTES_SAVE_DELAY = 600;

/// Everything about one plant. Takes the live record from the store so it stays current
/// while you water and measure from inside the sheet.
export function PlantDetailModal({ planting, onClose }: {
  planting: Planting | null;
  onClose: () => void;
}) {
  const garden = useGarden();
  const [notes, setNotes] = useState('');
  const [notesState, setNotesState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [measuring, setMeasuring] = useState(false);
  const [justWatered, setJustWatered] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirty = useRef(false);

  useEffect(() => {
    setNotes(planting?.notes ?? '');
    setNotesState('idle');
    setJustWatered(false);
    dirty.current = false;
  }, [planting?.id]);

  // Notes save a moment after you stop typing, not on every keystroke, and say so.
  const editNotes = (text: string) => {
    setNotes(text);
    dirty.current = true;
    setNotesState('saving');
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      if (planting) garden.updateNotes(text, planting);
      dirty.current = false;
      setNotesState('saved');
    }, NOTES_SAVE_DELAY);
  };

  const flushNotes = () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    if (dirty.current && planting) garden.updateNotes(notes, planting);
    dirty.current = false;
  };

  const close = () => {
    flushNotes();
    onClose();
  };

  if (!planting) return <Modal visible={false} onRequestClose={onClose}><View /></Modal>;

  const species = getSpecies(planting);
  const progress = progressOf(planting);
  const spot = garden.surveys.find((survey) => survey.id === planting.surveyId) ?? null;
  const needsMoreLight = spot ? spot.sunHours + 0.5 < lightMinimumHours[species.light] : false;
  const heights = sortedHeights(planting);
  const gain = heightGain(planting);
  const latest = latestHeight(planting);
  const thirsty = garden.needsWater(planting);
  const advice = garden.waterAdvice(planting);
  const ready = stageOf(planting) === 'ready';

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

  const water = () => {
    garden.water(planting);
    setJustWatered(true);
    setTimeout(() => setJustWatered(false), 1800);
  };

  const confirmRemoval = () => {
    confirmDestructive({
      title: ready ? 'Harvest and clear the bed?' : 'Clear this bed?',
      message: 'Your badges stay earned either way.',
      actionLabel: `Remove ${planting.nickname}`,
      onConfirm: () => {
        haptics.tap();
        garden.removePlanting(planting);
        close();
      },
    });
  };

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={close}>
      <SafeAreaView style={{ flex: 1, backgroundColor: color.canvas }}>
        <SheetBar title={planting.nickname} action="Done" onAction={close} />

        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
          <ContentColumn style={{ gap: size.cardGap }}>
            <Card>
              <View style={{ alignItems: 'center', gap: space.md }}>
                <View style={styles.hero} accessibilityLabel={`${planting.nickname}, drawn at ${Math.round(progress * 100)} percent grown`}>
                  <PlantSprite
                    look={lookOf(species)}
                    progress={progress}
                    seed={seedOf(planting)}
                    height={120}
                  />
                  <View style={styles.heroSoil} />
                </View>

                <View style={{ alignItems: 'center', gap: 2 }}>
                  <Text style={type.title} accessibilityRole="header">{planting.nickname}</Text>
                  <Text style={type.bodyMuted}>{species.name}</Text>
                </View>

                {/* The full track, with the words the bed in the plot has no room for. */}
                <MilestoneTrack planting={planting} />

                <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
                  <Pill text={stageLabel[stageOf(planting)]} icon="leaf" tint="brand" />
                  <Pill text={lightLabel[species.light]} icon="sunny" tint="sun" />
                  {thirsty ? <Pill text="Needs water" icon="water" tint="water" /> : null}
                </View>

                <View style={{ width: '100%', gap: space.sm }}>
                  <ProgressBar fraction={Math.max(progress, 0.03)} height={8} />
                  <View style={styles.spread}>
                    <Text style={[type.caption, tabular]}>Day {daysSincePlanting(planting)}</Text>
                    <Text style={[type.caption, tabular]}>
                      {daysUntilHarvest(planting) === 0
                        ? 'Ready now'
                        : `${daysUntilHarvest(planting)} days to harvest`}
                    </Text>
                  </View>
                </View>

                {/* Pots get moved. When one does, the app has to be told, or it goes on
                    giving advice for a spot the plant left. */}
                <View style={{ gap: space.sm }}>
                  <Text style={type.label}>Standing in</Text>
                  <View style={styles.containerRow}>
                    <Pressable
                      onPress={() => garden.setPlantingSpot(planting, null)}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: !planting.surveyId }}
                      accessibilityLabel="Not a measured spot"
                      style={({ pressed }) => [
                        styles.containerChip,
                        !planting.surveyId && styles.containerChipOn,
                        pressed && planting.surveyId ? { backgroundColor: color.surfacePressed } : null,
                      ]}
                    >
                      <Text style={[styles.containerLabel, !planting.surveyId && { color: color.textOnBrand }]}>
                        Not measured
                      </Text>
                    </Pressable>
                    {garden.surveys.map((survey) => {
                      const on = planting.surveyId === survey.id;
                      return (
                        <Pressable
                          key={survey.id}
                          onPress={() => garden.setPlantingSpot(planting, survey.id)}
                          accessibilityRole="radio"
                          accessibilityState={{ selected: on }}
                          accessibilityLabel={`${survey.name}, ${survey.sunHours.toFixed(1)} hours of sun`}
                          style={({ pressed }) => [
                            styles.containerChip,
                            on && styles.containerChipOn,
                            pressed && !on && { backgroundColor: color.surfacePressed },
                          ]}
                        >
                          <Text style={[styles.containerLabel, on && { color: color.textOnBrand }]} numberOfLines={1}>
                            {survey.name}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                  {spot ? (
                    <Text style={type.caption}>
                      {spot.name} gets {spot.sunHours.toFixed(1)} hours of sun, measured on{' '}
                      {new Date(spot.takenOn).toLocaleDateString()}. {surveyLightLabel(spot.sunHours)}.
                      {needsMoreLight ? ` ${species.name} would rather have ${lightMinimumHours[species.light]}.` : ''}
                    </Text>
                  ) : garden.surveys.length === 0 ? (
                    <Text style={type.caption}>
                      Measure a spot under Sun spot and you can tell the app exactly where this
                      one is standing.
                    </Text>
                  ) : null}
                </View>
              </View>
            </Card>

            <Card>
              <View style={{ gap: space.md }}>
                <SectionHeader title="Water" subtitle={garden.wateringAdvice(planting)} />

                {/* How much, not just when. The amount comes from how much soil this one
                    has to wet, which is why the app asked where it was going in. */}
                <View style={styles.amount}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={styles.amountValue}>
                      {advice.skip ? 'Nothing today' : advice.amount}
                    </Text>
                    <Text style={type.caption}>
                      {advice.because || `${inEverydayTerms(advice.millilitres)} · ${containerLabel(planting.container)}`}
                    </Text>
                  </View>
                  <Ionicons
                    name={advice.skip ? 'rainy-outline' : 'water'}
                    size={26}
                    color={advice.skip ? color.textTertiary : color.waterText}
                  />
                </View>

                <Button
                  label={justWatered ? 'Watered' : 'Water now'}
                  icon={justWatered ? 'checkmark' : 'water'}
                  tone={thirsty && !justWatered ? 'solid' : 'quiet'}
                  onPress={water}
                  disabled={justWatered}
                />

                <View style={styles.spread}>
                  <Text style={type.caption}>{lastWateredText}</Text>
                  <Text style={[type.caption, tabular]}>Every {garden.wateringInterval(planting)} days</Text>
                </View>

                <View style={styles.containerRow}>
                  {CONTAINERS.map((option) => {
                    const on = (planting.container?.litres ?? DEFAULT_CONTAINER.litres) === option.litres
                      && (planting.container?.kind ?? DEFAULT_CONTAINER.kind) === option.kind;
                    return (
                      <Pressable
                        key={option.id}
                        onPress={() => {
                          haptics.selection();
                          garden.setContainer({ kind: option.kind, litres: option.litres }, planting);
                        }}
                        accessibilityRole="radio"
                        accessibilityState={{ selected: on }}
                        accessibilityLabel={`${option.label}, ${option.detail}`}
                        style={({ pressed }) => [
                          styles.containerChip,
                          on && styles.containerChipOn,
                          pressed && !on && { backgroundColor: color.surfacePressed },
                        ]}
                      >
                        <Text style={[styles.containerLabel, on && { color: color.textOnBrand }]}>
                          {option.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </Card>

            <Card>
              <View style={{ gap: space.md }}>
                <SectionHeader
                  title="Growth"
                  subtitle="Stand something you know the size of next to it and match two bars. The app works out the rest."
                />
                {heights.length === 0 ? (
                  <View style={styles.noMeasurements}>
                    <Ionicons name="resize-outline" size={18} color={color.textTertiary} />
                    <Text style={type.caption}>No measurements yet. The first one sets the scale.</Text>
                  </View>
                ) : (
                  <View style={{ gap: space.sm }}>
                    <HeightChart values={heights.map((h) => h.centimetres)} />
                    <View style={styles.spread}>
                      {latest !== null ? (
                        <Text style={[type.captionStrong, tabular]}>Now {Math.round(latest)} cm</Text>
                      ) : <View />}
                      {gain !== null && gain > 0 ? (
                        <Text style={[type.caption, tabular, { color: color.brandDeep }]}>
                          +{Math.round(gain)} cm since first measured
                        </Text>
                      ) : null}
                    </View>
                  </View>
                )}
                <Button
                  label={heights.length === 0 ? 'Measure it' : 'Record a height'}
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
              <View style={{ gap: space.sm }}>
                <SectionHeader title="Care" />
                <Text style={type.body}>{species.tip}</Text>
                <TraitChips traits={species.traits} />
                {pruningReminder ? (
                  <View style={styles.reminder}>
                    <Ionicons name="cut-outline" size={16} color={color.brandDeep} />
                    <Text style={[type.caption, { flex: 1, color: color.brandDeep }]}>{pruningReminder}</Text>
                  </View>
                ) : null}
              </View>
            </Card>

            <Card>
              <View style={{ gap: space.sm }}>
                <SectionHeader
                  title="Diary"
                  subtitle="What you tried, and whether it worked."
                  right={
                    notesState !== 'idle' ? (
                      <Text style={[type.caption, { color: notesState === 'saved' ? color.brandDeep : color.textTertiary }]}>
                        {notesState === 'saved' ? 'Saved' : 'Saving…'}
                      </Text>
                    ) : null
                  }
                />
                <Input
                  value={notes}
                  onChangeText={editNotes}
                  onBlur={flushNotes}
                  multiline
                  placeholder="Notes..."
                  style={styles.notes}
                  accessibilityLabel="Diary notes"
                />
              </View>
            </Card>

            <Button
              label={ready ? 'Harvest and clear the bed' : 'Remove from plot'}
              icon={ready ? 'basket-outline' : 'trash-outline'}
              tone="danger"
              onPress={confirmRemoval}
            />
          </ContentColumn>
        </ScrollView>

        <MeasureModal
          planting={measuring ? planting : null}
          onClose={() => setMeasuring(false)}
        />
      </SafeAreaView>
    </Modal>
  );
}

/// A plain line of measurements over time, with the latest point emphasised.
function HeightChart({ values }: { values: number[] }) {
  const width = 260;
  const height = 90;
  const inset = 6;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = Math.max(max - min, 1);

  const points = values.map((value, index) => {
    const x = values.length === 1 ? width / 2 : inset + ((width - inset * 2) * index) / (values.length - 1);
    const y = inset + (height - inset * 2) - ((value - min) / range) * (height - inset * 2);
    return { x, y };
  });
  const last = points[points.length - 1];

  return (
    <Svg
      width="100%"
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      accessibilityLabel={`Height over ${values.length} measurements, from ${Math.round(values[0])} to ${Math.round(values[values.length - 1])} centimetres`}
    >
      <Line x1={0} y1={height - inset} x2={width} y2={height - inset} stroke={color.line} strokeWidth={1} />
      <Polyline
        points={points.map((p) => `${p.x},${p.y}`).join(' ')}
        fill="none"
        stroke={color.brand}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {points.map((p, index) => (
        <Circle key={index} cx={p.x} cy={p.y} r={3} fill={color.brand} />
      ))}
      <Circle cx={last.x} cy={last.y} r={6} fill={color.surface} stroke={color.brand} strokeWidth={2.5} />
    </Svg>
  );
}

const styles = StyleSheet.create({
  amount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.md,
    borderRadius: radius.sm,
    backgroundColor: color.waterTint,
  },
  amountValue: { fontSize: 24, lineHeight: 29, fontWeight: '800', color: color.waterText },
  containerRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  containerChip: {
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: radius.pill,
    backgroundColor: color.surfaceSunken,
  },
  containerChipOn: { backgroundColor: color.brand },
  containerLabel: { fontSize: 13, fontWeight: '600', color: color.textSecondary },
  scroll: { padding: size.gutter, paddingBottom: space.xxxl },
  hero: {
    width: '100%',
    height: 150,
    borderRadius: radius.lg,
    backgroundColor: color.sky + '80',
    alignItems: 'center',
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  heroSoil: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 22,
    backgroundColor: '#8A7561',
  },
  spread: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  noMeasurements: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  reminder: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.sm,
    padding: space.md,
    borderRadius: radius.sm,
    backgroundColor: color.brandTint,
  },
  notes: { minHeight: 96, textAlignVertical: 'top', paddingTop: 12 },
});
