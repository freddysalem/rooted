import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Planting, daysUntilHarvest, getSpecies } from '../models/planting';
import { color, radius, space, type } from '../theme';
import * as haptics from '../services/haptics';

/// How the beds are ordered.
///
/// Planting order is the default because it is the one that matches the plot in your
/// head - bed three is where you put the radishes. The rest are questions you actually
/// ask a garden: what needs me today, what is nearly done, where is the thing called X.
export type PlotSort = 'planted' | 'thirsty' | 'harvest' | 'az';

const OPTIONS: { id: PlotSort; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'planted', label: 'Plot order', icon: 'grid-outline' },
  { id: 'thirsty', label: 'Needs water', icon: 'water-outline' },
  { id: 'harvest', label: 'Closest to harvest', icon: 'basket-outline' },
  { id: 'az', label: 'A-Z', icon: 'text-outline' },
];

export function sortPlantings(
  plantings: Planting[],
  sort: PlotSort,
  isThirsty: (planting: Planting) => boolean
): Planting[] {
  const list = [...plantings];
  const name = (p: Planting) => (p.nickname.trim() || getSpecies(p).name).toLowerCase();

  switch (sort) {
    case 'thirsty':
      // Thirsty first, then the ones due soonest - within the thirsty group, the plant
      // that has gone longest without a drink comes first.
      return list.sort((a, b) => {
        const dry = Number(isThirsty(b)) - Number(isThirsty(a));
        if (dry !== 0) return dry;
        const last = (p: Planting) => new Date(p.lastWatered ?? p.plantedOn).getTime();
        return last(a) - last(b);
      });
    case 'harvest':
      return list.sort((a, b) => daysUntilHarvest(a) - daysUntilHarvest(b));
    case 'az':
      return list.sort((a, b) => name(a).localeCompare(name(b)));
    default:
      return list.sort((a, b) => a.plot - b.plot);
  }
}

export function PlotFilters({ sort, onSort }: { sort: PlotSort; onSort: (sort: PlotSort) => void }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      accessibilityRole="radiogroup"
      accessibilityLabel="Sort the plot"
    >
      {OPTIONS.map((option) => {
        const on = sort === option.id;
        return (
          <Pressable
            key={option.id}
            onPress={() => { haptics.selection(); onSort(option.id); }}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            accessibilityLabel={option.label}
            hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
            style={({ pressed }) => [
              styles.chip,
              on && styles.chipOn,
              pressed && !on && { backgroundColor: color.surfacePressed },
            ]}
          >
            <Ionicons
              name={option.icon}
              size={14}
              color={on ? color.textOnBrand : color.textSecondary}
            />
            <Text style={[styles.label, on && styles.labelOn]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: space.xs, paddingBottom: space.md },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: space.sm,
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.line,
  },
  chipOn: { backgroundColor: color.brand, borderColor: color.brand },
  label: { ...type.captionStrong, color: color.textSecondary },
  labelOn: { color: color.textOnBrand },
});
