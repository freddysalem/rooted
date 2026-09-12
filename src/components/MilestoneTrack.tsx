import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Planting, daysSincePlanting, getSpecies, progressOf } from '../models/planting';
import { color, radius, space, tabular } from '../theme';

/// How far along, as three dots: where it started, what happens next, and the day you
/// get to eat it.
///
///     Sown        Sprouting        Harvest
///      ●━━━━━━━━━━━━●--------------○
///    day 0          day 38         day 120
///
/// Only ever three: the stages between the next one and the harvest are left out on
/// purpose, because a plant's owner cares about the next thing that will happen and the
/// last thing that will happen, and nothing in between.

/// Where each stage begins, as a fraction of the way to harvest. Matches stageOf().
/// 'Ready' is deliberately absent: it lands at the same moment as the harvest, and two
/// dots a few days apart both meaning "done" read as a mistake.
/// Labels are short on purpose: a bed is about half a phone wide, and "Established"
/// truncates to "Establis..." in the space a dot can be given.
const STAGES: { at: number; label: string }[] = [
  { at: 0, label: 'Sown' },
  { at: 0.08, label: 'Sprouting' },
  { at: 0.3, label: 'Growing' },
  { at: 0.6, label: 'Settled' },
];

export function MilestoneTrack({ planting, compact = false }: {
  planting: Planting;
  /** Dots only. For the beds in the plot, where the track sits over the sky above the
      plant and there is no room for words at all - the full version with the labels and
      the day numbers is on the plant's own sheet. */
  compact?: boolean;
}) {
  const species = getSpecies(planting);
  const total = Math.max(species.daysToHarvest, 1);
  const day = daysSincePlanting(planting);
  const p = progressOf(planting);

  // The next milestone worth naming. Once everything is passed, the last dot is the
  // harvest itself and the track has two dots rather than three.
  const next = STAGES.find((stage) => stage.at > p + 0.0001) ?? null;
  const done = next === null;

  const dots = done
    ? [
        { label: 'Sown', day: 0 },
        { label: p >= 1 ? 'Ready' : 'Harvest', day: total },
      ]
    : [
        { label: 'Sown', day: 0 },
        { label: next.label, day: Math.round(next.at * total) },
        { label: 'Harvest', day: total },
      ];

  // Two segments, filled from real progress: up to the next milestone, then on to the end.
  const nextAt = next?.at ?? 1;
  const firstFill = Math.min(p / Math.max(nextAt, 0.0001), 1);
  const secondFill = p <= nextAt ? 0 : (p - nextAt) / Math.max(1 - nextAt, 0.0001);

  const remaining = Math.max(total - day, 0);
  const headline = done
    ? 'Ready to pick'
    : `${Math.max(dots[1].day - day, 0)} days to ${dots[1].label.toLowerCase()} · ${remaining} to harvest`;

  if (compact) {
    return (
      <View style={styles.track} accessibilityLabel={`Day ${day} of ${total}. ${headline}`}>
        <Dot filled small />
        <Segment fill={firstFill} />
        {dots.length === 3 ? <Dot filled={p >= nextAt} small /> : null}
        {dots.length === 3 ? <Segment fill={secondFill} /> : null}
        <Dot filled={p >= 1} hollow={p < 1} small />
      </View>
    );
  }

  return (
    <View style={styles.wrap} accessibilityLabel={`Day ${day} of ${total}. ${headline}`}>
      <View style={styles.labels}>
        {dots.map((dot, i) => (
          <Text
            key={dot.label}
            numberOfLines={1}
            style={[
              styles.label,
              i === 0 && styles.labelStart,
              i === dots.length - 1 && styles.labelEnd,
              // The milestone you are heading for is the one worth reading.
              i === 1 && dots.length === 3 && styles.labelNext,
            ]}
          >
            {dot.label}
          </Text>
        ))}
      </View>

      <View style={styles.track}>
        <Dot filled />
        <Segment fill={firstFill} />
        {dots.length === 3 ? <Dot filled={p >= nextAt} /> : null}
        {dots.length === 3 ? <Segment fill={secondFill} /> : null}
        <Dot filled={p >= 1} hollow={p < 1} />
      </View>

      {(
        <View style={styles.labels}>
          {dots.map((dot, i) => (
            <Text
              key={dot.label}
              numberOfLines={1}
              style={[
                styles.day,
                tabular,
                i === 0 && styles.labelStart,
                i === dots.length - 1 && styles.labelEnd,
              ]}
            >
              day {dot.day}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
}

function Dot({ filled, hollow = false, small = false }: {
  filled: boolean;
  hollow?: boolean;
  small?: boolean;
}) {
  return (
    <View
      style={[
        styles.dot,
        small && styles.dotSmall,
        filled && styles.dotFilled,
        hollow && styles.dotHollow,
      ]}
    />
  );
}

/// One length of track. The filled part is real progress; the rest is dashed-looking
/// pale so it reads as "not yet" rather than "empty".
function Segment({ fill }: { fill: number }) {
  return (
    <View style={styles.segment}>
      <View style={[styles.segmentFill, { flex: Math.max(Math.min(fill, 1), 0) }]} />
      <View style={{ flex: Math.max(1 - Math.max(Math.min(fill, 1), 0), 0) }} />
    </View>
  );
}

const DOT = 8;

const styles = StyleSheet.create({
  wrap: { gap: 3 },
  labels: { flexDirection: 'row', justifyContent: 'space-between' },
  label: {
    fontSize: 9,
    lineHeight: 12,
    fontWeight: '700',
    color: color.textTertiary,
    letterSpacing: 0.2,
    flex: 1,
    textAlign: 'center',
  },
  labelNext: { color: color.brandDeep },
  labelStart: { textAlign: 'left' },
  labelEnd: { textAlign: 'right' },
  day: { fontSize: 9, lineHeight: 12, color: color.textTertiary, flex: 1, textAlign: 'center' },
  track: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  dot: {
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    backgroundColor: color.brandPale,
  },
  dotSmall: { width: 6, height: 6, borderRadius: 3 },
  dotFilled: { backgroundColor: color.brand },
  dotHollow: {
    backgroundColor: color.surface,
    borderWidth: 1.5,
    borderColor: color.brandPale,
  },
  segment: { flex: 1, flexDirection: 'row', height: 3, borderRadius: 2, overflow: 'hidden', backgroundColor: color.brandPale },
  segmentFill: { backgroundColor: color.brand },
});
