import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from './ui';
import { WeatherSnapshot, conditionIcon, conditionLabel, conditionTint } from '../services/weather';
import { color, radius, size, space, tabular, type } from '../theme';
import * as haptics from '../services/haptics';

/// The first thing on the home screen: who you are, what needs doing, and what the sky
/// is going to do about it for the next week.
///
/// The source line at the bottom is not decoration. The numbers come from a forecast
/// model, not from the weather station at the end of your road, so they will differ from
/// the phone's own weather app by a degree or two - saying where they came from is the
/// difference between a bug report and an informed user.

const DAY_LETTERS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function WeatherTile({ greeting, note, weather, onOpenLocation }: {
  greeting: string;
  note: string;
  weather: WeatherSnapshot | null;
  /** Long-press. The demo switch, deliberately not advertised. */
  onOpenLocation?: () => void;
}) {
  const week = weather?.days ?? [];

  return (
    <Pressable
      onLongPress={() => {
        if (!onOpenLocation) return;
        haptics.selection();
        onOpenLocation();
      }}
      delayLongPress={600}
      accessibilityRole="summary"
      accessibilityLabel={
        weather
          ? `${greeting}. ${note} ${Math.round(weather.temperatureC)} degrees, ${conditionLabel[weather.condition]}, in ${weather.placeName}.`
          : `${greeting}. ${note}`
      }
      accessibilityHint={onOpenLocation ? 'Press and hold to change the location' : undefined}
    >
      <Card>
        <View style={{ gap: space.md }}>
          <View style={styles.headRow}>
            <View style={{ flex: 1, gap: space.xs }}>
              <Text style={type.title} accessibilityRole="header">{greeting}</Text>
              <Text style={type.bodyMuted}>{note}</Text>
            </View>

            {weather ? (
              <View style={styles.today}>
                <Ionicons
                  name={conditionIcon[weather.condition] as keyof typeof Ionicons.glyphMap}
                  size={48}
                  color={conditionTint[weather.condition]}
                />
                <Text style={[styles.temperature, tabular]}>{Math.round(weather.temperatureC)}°</Text>
                <Text style={type.caption} numberOfLines={1}>{conditionLabel[weather.condition]}</Text>
                <Text style={[type.caption, tabular, { color: color.textTertiary }]}>
                  {Math.round(weather.highC)}° / {Math.round(weather.lowC)}°
                </Text>
              </View>
            ) : (
              <View style={styles.today} />
            )}
          </View>

          {week.length > 0 ? (
            <View style={{ gap: space.xs }}>
              <View style={styles.rule} />
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.week}
              >
                {week.map((day, index) => (
                  <DayCell key={day.date} day={day} index={index} />
                ))}
              </ScrollView>
            </View>
          ) : null}

          {weather ? (
            <Text style={styles.source}>
              {weather.simulated
                ? `${weather.source} · no live feed reached`
                : `${weather.source} · ${weather.placeName}`}
            </Text>
          ) : null}
        </View>
      </Card>
    </Pressable>
  );
}

function DayCell({ day, index }: { day: WeatherSnapshot['days'][number]; index: number }) {
  const today = index === 0;
  // The forecast's own local date, read as a plain calendar day rather than a moment in
  // time, so a garden in Nairobi does not get yesterday's label in a British timezone.
  const [y, m, d] = day.date.split('-').map(Number);
  const label = today ? 'Today' : DAY_LETTERS[new Date(y, m - 1, d).getDay()];
  const wet = day.rainMm >= 0.5;

  return (
    <View
      style={[styles.day, today && styles.dayNow]}
      accessibilityLabel={`${label}, ${conditionLabel[day.condition]}, ${Math.round(day.highC)} to ${Math.round(day.lowC)} degrees${wet ? `, ${day.rainMm.toFixed(1)} millimetres of rain` : ''}`}
    >
      <Text style={[styles.dayLabel, today && { color: color.brandDeep }]}>{label}</Text>
      <Ionicons
        name={conditionIcon[day.condition] as keyof typeof Ionicons.glyphMap}
        size={20}
        color={conditionTint[day.condition]}
      />
      <Text style={[styles.dayHigh, tabular]}>{Math.round(day.highC)}°</Text>
      <Text style={[styles.dayLow, tabular]}>{Math.round(day.lowC)}°</Text>
      {/* Rain is the number a grower actually acts on, so it gets its own line. */}
      <Text style={[styles.rain, tabular, !wet && { color: 'transparent' }]}>
        {wet ? `${day.rainMm.toFixed(day.rainMm >= 10 ? 0 : 1)}mm` : '0'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  headRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  today: { minWidth: 92, alignItems: 'center', gap: 2 },
  temperature: { fontSize: 30, lineHeight: 34, fontWeight: '700', color: color.text },
  rule: { height: 1, backgroundColor: color.line },
  week: { gap: 2, paddingVertical: space.xs },
  day: {
    alignItems: 'center',
    gap: 3,
    paddingVertical: space.sm,
    paddingHorizontal: 4,
    borderRadius: radius.sm,
    minWidth: 46,
  },
  dayNow: { backgroundColor: color.brandTint },
  dayLabel: { fontSize: 12, lineHeight: 15, fontWeight: '700', color: color.textSecondary },
  dayHigh: { fontSize: 14, lineHeight: 18, fontWeight: '700', color: color.text },
  dayLow: { fontSize: 12, lineHeight: 15, fontWeight: '500', color: color.textTertiary },
  rain: { fontSize: 11, lineHeight: 14, fontWeight: '600', color: color.waterText },
  source: { fontSize: 11, lineHeight: 14, color: color.textTertiary, alignSelf: 'flex-start' },
});
