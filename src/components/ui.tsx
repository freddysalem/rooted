import React, { useState } from 'react';
import {
  ActivityIndicator, Pressable, StyleSheet, Text, TextInput, TextInputProps, TextStyle, View,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { color, motion, radius, shadow, size, space, type } from '../theme';

type IconName = keyof typeof Ionicons.glyphMap;

/// A soft white card. Used for every panel in the app so the whole thing feels like
/// one surface.
export function Card({ children, style, padding = space.lg }: {
  children: React.ReactNode;
  style?: ViewStyle;
  padding?: number;
}) {
  return <View style={[styles.card, { padding }, style]}>{children}</View>;
}

/// Caps the width of a column of cards on wide screens. The plot is the one thing that
/// should stretch; reading widths should not.
export function ContentColumn({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.column, style]}>{children}</View>;
}

export type Tint = 'brand' | 'sun' | 'soil' | 'water' | 'danger' | 'neutral';

const TINTS: Record<Tint, { bg: string; fg: string }> = {
  brand: { bg: color.brandTint, fg: color.brandDeep },
  sun: { bg: color.sunTint, fg: color.sunText },
  soil: { bg: color.soilTint, fg: color.soilText },
  water: { bg: color.waterTint, fg: color.waterText },
  danger: { bg: color.dangerTint, fg: color.dangerText },
  neutral: { bg: color.surfaceSunken, fg: color.textSecondary },
};

/// Small rounded label - "Full sun", "Needs water", "In season". Not pressable.
export function Pill({ text, icon, tint = 'brand' }: {
  text: string;
  icon?: IconName;
  tint?: Tint;
}) {
  const t = TINTS[tint];
  return (
    <View style={[styles.pill, { backgroundColor: t.bg }]}>
      {icon ? <Ionicons name={icon} size={11} color={t.fg} style={{ marginRight: 4 }} /> : null}
      <Text style={[styles.pillText, { color: t.fg }]}>{text}</Text>
    </View>
  );
}

/// A pill you can press. 40pt tall so it is a real target.
export function Chip({ text, icon, tint = 'brand', onPress, accessibilityLabel }: {
  text: string;
  icon?: IconName;
  tint?: Tint;
  onPress: () => void;
  accessibilityLabel?: string;
}) {
  const t = TINTS[tint];
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? text}
      style={({ pressed }) => [
        styles.chip,
        { backgroundColor: t.bg, opacity: pressed ? 0.7 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] },
      ]}
    >
      {icon ? <Ionicons name={icon} size={14} color={t.fg} style={{ marginRight: 6 }} /> : null}
      <Text style={[styles.chipText, { color: t.fg }]}>{text}</Text>
    </Pressable>
  );
}

export function SectionHeader({ title, subtitle, right }: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  return (
    <View style={styles.sectionRow}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={type.heading}>{title}</Text>
        {subtitle ? <Text style={type.caption}>{subtitle}</Text> : null}
      </View>
      {right}
    </View>
  );
}

/// The one button. Solid for the main thing on a screen, quiet for the rest, danger for
/// removing something. Always 48pt tall; darkens rather than fades when pressed.
export function Button({ label, icon, onPress, tone = 'solid', disabled, loading, compact, accessibilityLabel }: {
  label: string;
  icon?: IconName;
  onPress: () => void;
  tone?: 'solid' | 'quiet' | 'danger';
  disabled?: boolean;
  loading?: boolean;
  compact?: boolean;
  accessibilityLabel?: string;
}) {
  const palette = {
    solid: { bg: color.brand, bgPressed: color.brandDeep, fg: color.textOnBrand },
    quiet: { bg: color.surfaceSunken, bgPressed: color.surfacePressed, fg: color.brandDeep },
    danger: { bg: color.dangerTint, bgPressed: '#F5DCCB', fg: color.dangerText },
  }[tone];
  const inactive = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      style={({ pressed }) => [
        styles.button,
        compact && styles.buttonCompact,
        { backgroundColor: pressed && !inactive ? palette.bgPressed : palette.bg, opacity: disabled ? 0.5 : 1 },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={palette.fg} />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={18} color={palette.fg} style={{ marginRight: 8 }} /> : null}
          <Text style={[styles.buttonLabel, { color: palette.fg }]}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

/// A round icon-only button, 44pt. Used for zoom and for clearing a field.
export function IconButton({ icon, onPress, label, tone = 'surface', size: diameter = size.tap }: {
  icon: IconName;
  onPress: () => void;
  label: string;
  tone?: 'surface' | 'quiet';
  size?: number;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={4}
      style={({ pressed }) => [
        styles.iconButton,
        { width: diameter, height: diameter, borderRadius: diameter / 2 },
        tone === 'surface' ? shadow.card : null,
        { backgroundColor: pressed ? color.surfacePressed : tone === 'surface' ? color.surface : color.surfaceSunken },
      ]}
    >
      <Ionicons name={icon} size={20} color={color.brandDeep} />
    </Pressable>
  );
}

/// The bar across the top of a sheet. Title genuinely centred; both actions 44pt.
export function SheetBar({ title, onCancel, cancelLabel = 'Cancel', action, onAction, actionDisabled }: {
  title: string;
  onCancel?: () => void;
  cancelLabel?: string;
  action?: string;
  onAction?: () => void;
  actionDisabled?: boolean;
}) {
  return (
    <View style={styles.sheetBar}>
      <View style={styles.sheetSide}>
        {onCancel ? (
          <Pressable
            onPress={onCancel}
            accessibilityRole="button"
            hitSlop={8}
            style={({ pressed }) => [styles.sheetAction, { opacity: pressed ? 0.6 : 1 }]}
          >
            <Text style={styles.sheetActionText}>{cancelLabel}</Text>
          </Pressable>
        ) : null}
      </View>
      <Text numberOfLines={1} style={[type.bodyStrong, styles.sheetTitle]}>{title}</Text>
      <View style={[styles.sheetSide, { alignItems: 'flex-end' }]}>
        {action && onAction ? (
          <Pressable
            onPress={onAction}
            disabled={actionDisabled}
            accessibilityRole="button"
            accessibilityState={{ disabled: !!actionDisabled }}
            hitSlop={8}
            style={({ pressed }) => [styles.sheetAction, { opacity: pressed ? 0.6 : 1 }]}
          >
            <Text style={[styles.sheetActionText, styles.sheetPrimary, actionDisabled && { color: color.textDisabled }]}>
              {action}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

/// Text field with a label, a focus ring, and a clear button when it has content.
export function Input({ label, value, onChangeText, clearable, style, ...rest }: TextInputProps & {
  label?: string;
  clearable?: boolean;
  value: string;
  onChangeText: (text: string) => void;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ gap: space.xs }}>
      {label ? <Text style={type.label}>{label}</Text> : null}
      <View style={[styles.inputWrap, focused && styles.inputFocused]}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholderTextColor={color.textTertiary}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          accessibilityLabel={label ?? rest.placeholder}
          style={[styles.input, style as TextStyle]}
          {...rest}
        />
        {clearable && value.length > 0 ? (
          <Pressable
            onPress={() => onChangeText('')}
            accessibilityRole="button"
            accessibilityLabel="Clear"
            hitSlop={8}
            style={styles.clear}
          >
            <Ionicons name="close-circle" size={18} color={color.textTertiary} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

/// Nothing here yet. One icon, one line, at most one thing to do about it.
export function EmptyState({ icon, title, body, action }: {
  icon: IconName;
  title: string;
  body?: string;
  action?: React.ReactNode;
}) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Ionicons name={icon} size={22} color={color.brandDeep} />
      </View>
      <Text style={[type.bodyStrong, { textAlign: 'center' }]}>{title}</Text>
      {body ? <Text style={[type.caption, { textAlign: 'center', maxWidth: 280 }]}>{body}</Text> : null}
      {action ? <View style={{ marginTop: space.xs, alignSelf: 'stretch' }}>{action}</View> : null}
    </View>
  );
}

/// A thin progress track. `tone` is the fill colour role.
export function ProgressBar({ fraction, height = 6, tone = color.brand }: {
  fraction: number;
  height?: number;
  tone?: string;
}) {
  const pct = Math.round(Math.min(Math.max(fraction, 0), 1) * 100);
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: pct }}
      style={[styles.track, { height, borderRadius: height / 2 }]}
    >
      <View style={{ width: `${pct}%`, height, borderRadius: height / 2, backgroundColor: tone }} />
    </View>
  );
}

export const pressDuration = motion.press;

const styles = StyleSheet.create({
  card: {
    backgroundColor: color.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.line,
    ...shadow.card,
  },
  column: { width: '100%', maxWidth: size.contentMaxWidth, alignSelf: 'center' },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  pillText: { fontSize: 12, lineHeight: 16, fontWeight: '600' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    height: size.chip,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
  },
  chipText: { fontSize: 14, fontWeight: '600' },
  sectionRow: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: size.button,
    paddingHorizontal: space.lg,
    borderRadius: radius.sm,
  },
  buttonCompact: { height: size.tap, paddingHorizontal: space.md },
  buttonLabel: { fontSize: 15, fontWeight: '600' },
  iconButton: { alignItems: 'center', justifyContent: 'center' },
  sheetBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.sm,
    height: size.tap + space.sm,
  },
  sheetSide: { width: 84, justifyContent: 'center' },
  sheetTitle: { flex: 1, textAlign: 'center', fontSize: 16 },
  sheetAction: { height: size.tap, justifyContent: 'center', paddingHorizontal: space.sm },
  sheetActionText: { fontSize: 16, color: color.brandDeep },
  sheetPrimary: { fontWeight: '700' },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: color.surfaceSunken,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderColor: 'transparent',
    minHeight: size.button,
  },
  inputFocused: { borderColor: color.brand, backgroundColor: color.surface },
  input: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: color.text,
    ...(({ outlineStyle: 'none' } as unknown) as TextStyle),
  },
  clear: { width: size.tap, height: size.tap, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', gap: space.sm, paddingVertical: space.lg, paddingHorizontal: space.md },
  emptyIcon: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: color.brandTint, alignItems: 'center', justifyContent: 'center',
  },
  track: { backgroundColor: color.surfaceSunken, overflow: 'hidden' },
});
