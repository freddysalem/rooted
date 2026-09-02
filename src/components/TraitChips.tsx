import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PlantTrait, traitIcon, traitLabel } from '../models/species';
import { color, radius, space } from '../theme';

/// What a plant is good for, as small chips. `max` caps the row on tiles; leave it off
/// to show the lot on a detail sheet.
export function TraitChips({ traits, max, compact }: {
  traits?: PlantTrait[];
  max?: number;
  compact?: boolean;
}) {
  if (!traits || traits.length === 0) return null;
  const shown = max ? traits.slice(0, max) : traits;
  return (
    <View style={styles.row} accessibilityLabel={`Good for: ${traits.map((t) => traitLabel[t]).join(', ')}`}>
      {shown.map((trait) => (
        <View key={trait} style={[styles.chip, compact && styles.chipCompact]}>
          <Ionicons name={traitIcon[trait] as keyof typeof Ionicons.glyphMap} size={compact ? 10 : 12} color={color.brandDeep} />
          <Text style={[styles.text, compact && styles.textCompact]} numberOfLines={1}>{traitLabel[trait]}</Text>
        </View>
      ))}
      {max && traits.length > max ? (
        <Text style={[styles.text, styles.more]}>+{traits.length - max}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space.xs, marginTop: 2 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill,
    backgroundColor: color.brandTint,
  },
  chipCompact: { paddingHorizontal: 6, paddingVertical: 2 },
  text: { fontSize: 12, lineHeight: 16, fontWeight: '600', color: color.brandDeep },
  textCompact: { fontSize: 11, lineHeight: 14 },
  more: { color: color.textSecondary, fontWeight: '500' },
});
