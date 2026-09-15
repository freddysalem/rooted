import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from './ui';
import { WeatherSnapshot, conditionIcon, conditionLabel, conditionTint } from '../services/weather';
import { color, radius, space, tabular, type } from '../theme';
import * as haptics from '../services/haptics';

/// The sky, in as little height as it can be said in.
///
/// It used to open with "Good evening", which is pleasant and tells you nothing you did
/// not already know. This is a weather tile: today large on the left, the week across the
/// bottom, the one line that actually needs doing today underneath, and the source.
///
/// The source line is not decoration. The numbers come from a forecast model, not the
/// weather station at the end of your road, so they differ from the phone's own weather
/// app by a degree or two - saying where they came from is the difference between a bug
/// report and an informed user.

const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function WeatherTile({ note, weather, onOpenLocation }: {
  /** What needs doing today. One line. */
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
          ? `${Math.round(weather.temperatureC)} degrees, ${conditionLabel[weather.condition]}, in ${weather.placeName}. ${note}`
          : note
      }
      accessibilityHint={onOpenLocation ? 'Press and hold to change the location' : undefined}
    >
      <Card padding={space.md}>
        <View style={{ gap: space.sm }}>
          <View style={styles.topRow}>
            <Ionicons
              name={(weather ? conditionIcon[weather.condition] : 'partly-sunny') as keyof typeof Ionicons.glyphMap}
              size={34}
              color={weather ? conditionTint[weather.condition] : color.textTertiary}
            />
            <Text style={[styles.temperature, tabular]}>
              {weather ? `${Math.round(weather.temperatureC)}°` : '--'}
            </Text>
            <View style={{ flex: 1, gap: 1 }}>
              <Text style={type.captionStrong} numberOfLines={1}>
                {weather ? conditionLabel[weather.condition] : 'Reading the sky'}
              </Text>
              <Text style={[type.caption, tabular]} numberOfLines={1}>
                {weather ? `${Math.round(weather.highC)}° / ${Math.round(weather.lowC)}°` : ' '}
                {weather && weather.rainfallLast24h >= 0.5
                  ? ` · ${weather.rainfallLast24h.toFixed(1)}mm fell`
                  : ''}
              </Text>
            </View>
            {weather ? (
              <Text style={styles.source} numberOfLines={2}>
                {weather.simulated ? 'No live feed' : `${weather.source}\n${weather.placeName}`}
              </Text>
            ) : null}
          </View>

          {week.length > 0 ? (
            <View style={styles.week}>
              {week.map((day, index) => (
                <DayCell key={day.date} day={day} index={index} />
              ))}
            </View>
          ) : null}

          <Text style={[type.caption, styles.note]} numberOfLines={1}>{note}</Text>
        </View>
      </Card>
    </Pressable>
  );
}

function DayCell({ day, index }: { day: WeatherSnapshot['days'][number]; index: number }) {
  const today = index === 0;
  // Labelled "Today", not "Now": this cell carries the day's HIGH, and the big number
  // above it is the current temperature. Calling it "Now" put two different numbers on
  // screen for the same moment.
  // The forecast's own local date, read as a plain calendar day rather than a moment in
  // time, so a garden in Nairobi does not get yesterday's label in a British timezone.
  const [y, m, d] = day.date.split('-').map(Number);
  const weekday = new Date(y, m - 1, d).getDay();
  const wet = day.rainMm >= 0.5;

  return (
    <View
      accessible
      style={[styles.day, today && styles.dayNow]}
      accessibilityLabel={`${today ? 'Today' : DAY_NAMES[weekday]}, ${conditionLabel[day.condition]}, ${Math.round(day.highC)} to ${Math.round(day.lowC)} degrees${wet ? `, ${day.rainMm.toFixed(1)} millimetres of rain` : ''}`}
    >
      <Text style={[styles.dayLabel, today && { color: color.brandDeep }]}>
        {today ? 'Today' : DAY_LETTERS[weekday]}
      </Text>
      <Ionicons
        name={conditionIcon[day.condition] as keyof typeof Ionicons.glyphMap}
        size={15}
        color={conditionTint[day.condition]}
      />
      <Text style={[styles.dayHigh, tabular]}>{Math.round(day.highC)}°</Text>
      {/* Rain is the number a grower acts on; the space is held so the row never jumps. */}
      <Text style={[styles.rain, tabular, !wet && { color: 'transparent' }]}>
        {wet ? `${day.rainMm < 10 ? day.rainMm.toFixed(1) : Math.round(day.rainMm)}mm` : '0'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  topRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  temperature: { fontSize: 26, lineHeight: 30, fontWeight: '700', color: color.text },
  week: { flexDirection: 'row', gap: 2 },
  day: {
    flex: 1,
    alignItems: 'center',
    gap: 1,
    paddingVertical: 4,
    borderRadius: radius.xs,
  },
  dayNow: { backgroundColor: color.brandTint },
  dayLabel: { fontSize: 10, lineHeight: 13, fontWeight: '700', color: color.textSecondary },
  dayHigh: { fontSize: 12, lineHeight: 15, fontWeight: '700', color: color.text },
  rain: { fontSize: 8, lineHeight: 11, fontWeight: '700', color: color.waterText },
  note: { color: color.textSecondary },
  source: { fontSize: 9, lineHeight: 11, color: color.textTertiary, textAlign: 'right', maxWidth: 74 },
});
