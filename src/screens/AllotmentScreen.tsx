import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card, PrimaryButton } from '../components/ui';
import { IsoPlot } from '../components/IsoPlot';
import { useGarden } from '../state/GardenContext';
import { Planting } from '../models/planting';
import { COLOUR_UNLOCK_LEVEL, HOME_COLOURS, petsUpTo } from '../models/progress';
import { conditionAlert, conditionIcon, conditionLabel } from '../services/weather';
import { Theme } from '../theme';
import * as haptics from '../services/haptics';
import { AddPlantModal } from './AddPlantModal';
import { PlantDetailModal } from './PlantDetailModal';

/// The home screen: your plot, seen across the ground rather than down onto a grid.
///
/// The plot fills the screen because it is the point of the app - drag to move around it,
/// pinch to get closer, and press any plant to open the same detail sheet as before.
export function AllotmentScreen() {
  const garden = useGarden();
  const [selected, setSelected] = useState<Planting | null>(null);
  const [plotToPlant, setPlotToPlant] = useState<number | null>(null);

  const alert = garden.weather ? conditionAlert(garden.weather.condition) : null;
  const selectedLive = selected ? garden.plantings.find((p) => p.id === selected.id) ?? null : null;

  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  })();

  const thirstyLine = (() => {
    if (garden.plantings.length === 0) return "Your plot is empty - let's plant something.";
    const count = garden.thirsty.length;
    if (count === 0) return 'Nothing needs watering today.';
    return count === 1 ? '1 plant is asking for water.' : `${count} plants are asking for water.`;
  })();

  return (
    <View style={{ flex: 1, backgroundColor: Theme.background }}>
      <View style={styles.header}>
        <Card padding={14}>
          <View style={styles.headerRow}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={styles.greeting}>{greeting}</Text>
              <Text style={styles.subtle}>{thirstyLine}</Text>
            </View>
            {garden.weather ? (
              <View style={{ alignItems: 'center', gap: 2 }}>
                <Ionicons
                  name={conditionIcon[garden.weather.condition] as keyof typeof Ionicons.glyphMap}
                  size={24}
                  color={Theme.sun}
                />
                <Text style={styles.temperature}>{Math.round(garden.weather.temperatureC)}°</Text>
                <Text style={styles.tiny}>{conditionLabel[garden.weather.condition]}</Text>
              </View>
            ) : null}
          </View>
        </Card>

        <Card padding={12}>
          <View style={{ gap: 8 }}>
            <View style={styles.levelRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.levelName}>
                  Level {garden.level.level} · {garden.level.homeName}
                </Text>
                <Text style={styles.tiny}>
                  {garden.progress.next
                    ? nextLevelLine(garden.progress)
                    : 'The farm is complete. Keep it that way.'}
                </Text>
              </View>
              <View style={styles.streakChip}>
                <Ionicons name="flame" size={13} color={Theme.alert} />
                <Text style={styles.streakText}>{garden.streak.days}</Text>
              </View>
            </View>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${Math.round(garden.progress.fraction * 100)}%` }]} />
            </View>
            {garden.level.level >= COLOUR_UNLOCK_LEVEL ? (
              <View style={styles.swatches}>
                {HOME_COLOURS.map((option) => (
                  <Pressable
                    key={option.id}
                    onPress={() => {
                      haptics.selection();
                      garden.setHomeColour(option.id);
                    }}
                    style={[
                      styles.swatch,
                      { backgroundColor: option.wall },
                      garden.homeColour === option.id && styles.swatchOn,
                    ]}
                  />
                ))}
              </View>
            ) : null}
          </View>
        </Card>

        {garden.justLevelled ? (
          <Pressable style={styles.levelUp} onPress={garden.dismissLevel}>
            <Ionicons name="sparkles" size={16} color={Theme.leafDeep} />
            <Text style={styles.levelUpText}>{garden.justLevelled.unlock}</Text>
          </Pressable>
        ) : null}

        {alert ? (
          <View style={styles.alert}>
            <Ionicons name="warning" size={16} color={Theme.alert} />
            <Text style={styles.alertText}>{alert}</Text>
          </View>
        ) : null}

        {garden.thirsty.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 2 }}>
              {garden.thirsty.map((planting) => (
                <Pressable
                  key={planting.id}
                  onPress={() => garden.water(planting)}
                  style={styles.waterChip}
                >
                  <Ionicons name="water" size={12} color={Theme.leafDeep} />
                  <Text style={styles.waterChipText}>Water {planting.nickname}</Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        ) : null}
      </View>

      <View style={styles.plotArea}>
        <IsoPlot
          plantings={garden.plantings}
          isThirsty={garden.needsWater}
          homeTier={garden.level.home}
          homeColour={garden.homeColour}
          pets={petsUpTo(garden.level.level)}
          onOpenPlant={(planting) => {
            haptics.pulse();
            setSelected(planting);
          }}
          onPlantEmpty={(plot) => {
            haptics.selection();
            setPlotToPlant(plot);
          }}
        />

        {garden.plantings.length === 0 ? (
          <View style={styles.emptyOverlay} pointerEvents="box-none">
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>Nothing growing yet</Text>
              <Text style={styles.subtle}>
                Start with a radish. It is up in four weeks and almost impossible to get wrong -
                which is the whole point of the first one.
              </Text>
              <PrimaryButton
                label="Plant something"
                onPress={() => setPlotToPlant(garden.firstEmptyPlot ?? 0)}
              />
            </View>
          </View>
        ) : null}
      </View>

      <PlantDetailModal planting={selectedLive} onClose={() => setSelected(null)} />
      <AddPlantModal plot={plotToPlant} onClose={() => setPlotToPlant(null)} />
    </View>
  );
}

/// What is still missing before the next level lands.
function nextLevelLine(progress: ReturnType<typeof import('../models/progress').levelProgress>) {
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
  header: { paddingHorizontal: 16, paddingBottom: 10, gap: 10 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  greeting: { fontSize: 22, fontWeight: '700', color: Theme.ink },
  subtle: { fontSize: 14, color: Theme.inkSoft, lineHeight: 20 },
  tiny: { fontSize: 11, color: Theme.inkSoft },
  temperature: { fontSize: 20, fontWeight: '700', color: Theme.ink },
  alert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 12,
    backgroundColor: '#F7E5D8',
  },
  alertText: { flex: 1, fontSize: 13, color: Theme.ink, lineHeight: 18 },
  waterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 12,
    backgroundColor: Theme.leafPale,
  },
  waterChipText: { fontSize: 12, fontWeight: '600', color: Theme.leafDeep },
  plotArea: { flex: 1, paddingHorizontal: 16, paddingBottom: 12 },
  emptyOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  emptyCard: {
    gap: 10,
    padding: 18,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.94)',
  },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: Theme.ink },
  levelRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  levelName: { fontSize: 14, fontWeight: '700', color: Theme.ink },
  streakChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 11,
    backgroundColor: '#F7E5D8',
  },
  streakText: { fontSize: 13, fontWeight: '700', color: Theme.ink },
  track: { height: 6, borderRadius: 3, backgroundColor: Theme.surfaceAlt, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3, backgroundColor: Theme.leaf },
  swatches: { flexDirection: 'row', gap: 8, marginTop: 2 },
  swatch: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: 'transparent' },
  swatchOn: { borderColor: Theme.ink },
  levelUp: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 12,
    backgroundColor: Theme.leafPale,
  },
  levelUpText: { flex: 1, fontSize: 13, fontWeight: '600', color: Theme.leafDeep, lineHeight: 18 },
});
