import React from 'react';
import { View, Text, StyleSheet, ViewStyle, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '../theme';

/// A soft white card. Used for every panel in the app so the whole thing feels like
/// one surface.
export function Card({ children, style, padding = 16 }: {
  children: React.ReactNode;
  style?: ViewStyle;
  padding?: number;
}) {
  return <View style={[styles.card, { padding }, style]}>{children}</View>;
}

/// Small rounded label - "Full sun", "Needs water", "In season".
export function Pill({ text, icon, tint = Theme.leaf }: {
  text: string;
  icon?: keyof typeof Ionicons.glyphMap;
  tint?: string;
}) {
  return (
    <View style={[styles.pill, { backgroundColor: tint + '22' }]}>
      {icon ? <Ionicons name={icon} size={11} color={tint} style={{ marginRight: 4 }} /> : null}
      <Text style={[styles.pillText, { color: tint }]}>{text}</Text>
    </View>
  );
}

export function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={{ gap: 2 }}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
    </View>
  );
}

export function PrimaryButton({ label, icon, onPress, tone = 'solid', disabled }: {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  tone?: 'solid' | 'quiet';
  disabled?: boolean;
}) {
  const solid = tone === 'solid';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: solid ? Theme.leaf : Theme.surfaceAlt,
          opacity: disabled ? 0.45 : pressed ? 0.8 : 1,
        },
      ]}
    >
      {icon ? (
        <Ionicons name={icon} size={16} color={solid ? '#fff' : Theme.leafDeep} style={{ marginRight: 6 }} />
      ) : null}
      <Text style={[styles.buttonLabel, { color: solid ? '#fff' : Theme.leafDeep }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Theme.surface,
    borderRadius: Theme.cardRadius,
    borderWidth: 1,
    borderColor: Theme.leafPale + '8C',
    shadowColor: Theme.leafDeep,
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
  },
  pillText: { fontSize: 12, fontWeight: '600' },
  sectionTitle: { fontSize: 19, fontWeight: '700', color: Theme.ink },
  sectionSubtitle: { fontSize: 13, color: Theme.inkSoft, lineHeight: 18 },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 14,
  },
  buttonLabel: { fontSize: 15, fontWeight: '600' },
});
