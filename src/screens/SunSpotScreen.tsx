import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Text as SvgText } from 'react-native-svg';
import Slider from '@react-native-community/slider';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { Card, Pill, PrimaryButton, SectionHeader } from '../components/ui';
import { PlantSprite } from '../components/PlantSprite';
import { useGarden } from '../state/GardenContext';
import { SPECIES, lightLabel, lightMinimumHours } from '../models/species';
import {
  SunSample, angularDistance, compassLabel, lightNeedForHours, sunArc, sunHoursFromArc, sunPosition,
} from '../services/sunPath';
import { Theme } from '../theme';
import * as haptics from '../services/haptics';

const FALLBACK = { latitude: 51.4545, longitude: -2.5879, name: 'Bristol' };

const SUN_STEP_MINUTES = 10;

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/// Stand in the spot, point the phone at it, and the app works out how much sun that
/// patch of ground actually gets - then names the plants that will be happy there.
///
/// No camera is needed for the maths: the compass gives the bearing, the date and your
/// coordinates give the sun's track, and the only judgement call left is how enclosed
/// the spot is, which you set yourself.
export function SunSpotScreen() {
  const garden = useGarden();
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [heading, setHeading] = useState(180);
  const [headingAvailable, setHeadingAvailable] = useState(false);
  const [lockedBearing, setLockedBearing] = useState<number | null>(null);
  const [obstruction, setObstruction] = useState(12);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let headingSubscription: Location.LocationSubscription | null = null;
    let cancelled = false;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted' || cancelled) return;
      try {
        const position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        setCoords({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      } catch {
        // Falls back to the default coordinates below.
      }
      try {
        const subscription = await Location.watchHeadingAsync((value) => {
          const bearing = value.trueHeading >= 0 ? value.trueHeading : value.magHeading;
          setHeading(bearing);
          setHeadingAvailable(true);
        });
        // The screen can be left while this is still resolving - tear it straight
        // back down rather than leaving a live compass behind.
        if (cancelled) subscription.remove();
        else headingSubscription = subscription;
      } catch {
        setHeadingAvailable(false);
      }
    })();
    return () => {
      cancelled = true;
      headingSubscription?.remove();
    };
  }, []);

  const latitude = coords?.latitude ?? FALLBACK.latitude;
  const longitude = coords?.longitude ?? FALLBACK.longitude;
  const bearing = lockedBearing ?? heading;

  // The sun's track depends only on the day and the coordinates, so it is computed
  // once and reused. Only the filtering below follows the compass, which fires many
  // times a second - recomputing the arc on every tick made this screen crawl.
  const mathsArc = useMemo(
    () => sunArc(now, latitude, longitude, SUN_STEP_MINUTES),
    [now, latitude, longitude]
  );
  const arc = useMemo(() => sunArc(now, latitude, longitude, 20), [now, latitude, longitude]);
  const current = useMemo(() => sunPosition(now, latitude, longitude), [now, latitude, longitude]);

  const hours = useMemo(
    () => sunHoursFromArc(mathsArc, bearing, obstruction, SUN_STEP_MINUTES),
    [mathsArc, bearing, obstruction]
  );
  const need = lightNeedForHours(hours);

  const month = now.getMonth() + 1;
  const suited = SPECIES.filter((s) => lightMinimumHours[s.light] <= hours + 0.5);
  const seasonal = suited.filter((s) => s.sowMonths.includes(month));
  const suggestions = (seasonal.length ? seasonal : suited).slice(0, 6);

  const explanation = (() => {
    const name = MONTH_NAMES[month - 1];
    if (need === 'fullSun')
      return `A bright spot in ${name}. Tomatoes, beans and anything that has to ripen will do well here.`;
    if (need === 'partialShade')
      return `Middling light in ${name}. Leaves and roots are happy; fruit will be slow and sparse.`;
    return `Little direct sun in ${name}. Stick to mint, leafy greens and anything you eat before it flowers.`;
  })();

  const obstructionLabel =
    obstruction < 6 ? 'Open field'
    : obstruction < 16 ? 'Ordinary garden'
    : obstruction < 28 ? 'Hemmed in by fences'
    : 'Overshadowed by buildings';

  return (
    <ScrollView style={{ backgroundColor: Theme.background }} contentContainerStyle={styles.scroll}>
      <Card>
        <View style={{ gap: 14, alignItems: 'center' }}>
          <SunDial arc={arc} bearing={bearing} current={current} obstruction={obstruction} />
          <View style={{ width: '100%' }}>
            <PrimaryButton
              label={lockedBearing === null ? 'Lock this direction' : 'Unlock compass'}
              tone={lockedBearing === null ? 'quiet' : 'solid'}
              onPress={() => {
                haptics.tap();
                setLockedBearing(lockedBearing === null ? heading : null);
              }}
            />
          </View>
          {!headingAvailable ? (
            <Text style={styles.note}>
              No compass reading yet - set the direction with the slider below.
            </Text>
          ) : null}
        </View>
      </Card>

      <Card>
        <View style={{ gap: 8 }}>
          <Text style={styles.label}>
            Facing {compassLabel(bearing)} · {Math.round(bearing)}°
          </Text>
          <Text style={styles.hours}>{hours.toFixed(1)} hours of direct sun</Text>
          <View style={{ flexDirection: 'row' }}>
            <Pill text={`Suits ${lightLabel[need].toLowerCase()} plants`} icon="sunny" tint={Theme.sun} />
          </View>
          <Text style={styles.subtle}>{explanation}</Text>
        </View>
      </Card>

      <Card>
        <View style={{ gap: 10 }}>
          <SectionHeader
            title="How enclosed is it?"
            subtitle="How high the walls, fences and trees around the spot reach."
          />
          <Slider
            value={obstruction}
            onValueChange={setObstruction}
            minimumValue={0}
            maximumValue={45}
            step={1}
            minimumTrackTintColor={Theme.leaf}
            maximumTrackTintColor={Theme.leafPale}
            thumbTintColor={Theme.leaf}
          />
          <View style={styles.spread}>
            <Text style={styles.strong}>{obstructionLabel}</Text>
            <Text style={styles.tiny}>{Math.round(obstruction)}° skyline</Text>
          </View>

          <View style={styles.divider} />
          <Text style={styles.strong}>Direction</Text>
          <Slider
            value={bearing}
            onValueChange={setLockedBearing}
            minimumValue={0}
            maximumValue={359}
            step={1}
            minimumTrackTintColor={Theme.sun}
            maximumTrackTintColor={Theme.sunPale}
            thumbTintColor={Theme.sun}
          />
        </View>
      </Card>

      <Card padding={14}>
        <SectionHeader title="Plant this here" subtitle={`Happy with ${hours.toFixed(1)} hours of sun.`} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }}>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {suggestions.map((species) => (
              <View key={species.id} style={{ width: 96, alignItems: 'center' }}>
                <View style={styles.tile}>
                  <PlantSprite family={species.family} progress={0.85} seed={species.id.length} height={70} />
                </View>
                <Text style={styles.tileName}>{species.name}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
        <View style={{ marginTop: 12 }}>
          <PrimaryButton
            label="Save this survey"
            onPress={() => {
              garden.markSunSurveyed();
              haptics.success();
            }}
          />
        </View>
      </Card>

      <View style={styles.locationNote}>
        <Ionicons
          name={coords ? 'location' : 'location-outline'}
          size={12}
          color={Theme.inkSoft}
        />
        <Text style={styles.tiny}>
          {coords
            ? 'Using your location, accurate to the nearest few hundred metres.'
            : `Using ${FALLBACK.name} as a stand-in until location is allowed.`}
        </Text>
      </View>
    </ScrollView>
  );
}

/// The compass rose: where you are pointing, where the sun is, and its whole track today.
function SunDial({ arc, bearing, current, obstruction }: {
  arc: SunSample[];
  bearing: number;
  current: { azimuth: number; elevation: number };
  obstruction: number;
}) {
  const size = 250;
  const centre = size / 2;
  const radius = centre - 26;

  /// Compass bearings run clockwise from north, which is up.
  const point = (r: number, deg: number) => {
    const rad = (deg * Math.PI) / 180;
    return { x: centre + r * Math.sin(rad), y: centre - r * Math.cos(rad) };
  };

  const needle = point(radius, bearing);
  const compassPoints = ['N', 'E', 'S', 'W'];

  return (
    <Svg width={size} height={size}>
      <Circle cx={centre} cy={centre} r={radius} stroke={Theme.leafPale} strokeWidth={1.5} fill="none" />
      <Circle cx={centre} cy={centre} r={radius * 0.45} fill={Theme.surfaceAlt} />

      {/* The sun's track. Each dot is a moment; the ones that clear the skyline and fall
          within the facing arc are the ones that count. */}
      {arc.map((sample, index) => {
        if (sample.position.elevation <= -2) return null;
        const lit =
          sample.position.elevation > obstruction &&
          angularDistance(sample.position.azimuth, bearing) <= 90;
        const r = radius * (1 - (Math.max(sample.position.elevation, 0) / 90) * 0.55);
        const p = point(r, sample.position.azimuth);
        return (
          <Circle
            key={index}
            cx={p.x}
            cy={p.y}
            r={lit ? 3.5 : 2}
            fill={lit ? Theme.sun : Theme.sunPale}
          />
        );
      })}

      <Line x1={centre} y1={centre} x2={needle.x} y2={needle.y} stroke={Theme.leaf} strokeWidth={3} strokeLinecap="round" />
      <Circle cx={centre} cy={centre} r={5} fill={Theme.leaf} />

      {current.elevation > 0
        ? (() => {
            const p = point(radius * (1 - (Math.max(current.elevation, 0) / 90) * 0.55), current.azimuth);
            return <Circle cx={p.x} cy={p.y} r={9} fill={Theme.sun} stroke="#fff" strokeWidth={2} />;
          })()
        : null}

      {compassPoints.map((label, index) => {
        const p = point(radius + 14, index * 90);
        return (
          <SvgText
            key={label}
            x={p.x}
            y={p.y + 4}
            fontSize={12}
            fontWeight="bold"
            fill={Theme.inkSoft}
            textAnchor="middle"
          >
            {label}
          </SvgText>
        );
      })}
    </Svg>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 18, paddingBottom: 40, gap: 14 },
  label: { fontSize: 13, fontWeight: '600', color: Theme.inkSoft },
  hours: { fontSize: 28, fontWeight: '700', color: Theme.leafDeep },
  subtle: { fontSize: 13, color: Theme.inkSoft, lineHeight: 19 },
  strong: { fontSize: 13, fontWeight: '600', color: Theme.ink },
  tiny: { fontSize: 12, color: Theme.inkSoft },
  note: { fontSize: 12, color: Theme.inkSoft, textAlign: 'center' },
  spread: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  divider: { height: 1, backgroundColor: Theme.leafPale, marginVertical: 4 },
  tile: {
    width: 96,
    height: 80,
    borderRadius: 12,
    backgroundColor: Theme.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  tileName: { fontSize: 13, fontWeight: '600', color: Theme.ink, marginTop: 6 },
  locationNote: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 4 },
});
