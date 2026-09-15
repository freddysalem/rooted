import React, { useEffect, useMemo, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Text as SvgText } from 'react-native-svg';
import Slider from '@react-native-community/slider';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, Chip, ContentColumn, Input, Pill, SectionHeader } from '../components/ui';
import { PlantSprite, seedFromString } from '../components/PlantSprite';
import { useGarden } from '../state/GardenContext';
import { SPECIES, Species, lightLabel, lightMinimumHours, lookOf } from '../models/species';
import {
  SunSample, angularDistance, compassLabel, lightNeedForHours, sunArc, sunHoursFromArc, sunPosition,
} from '../services/sunPath';
import { aspectLabel } from '../models/survey';
import { color, radius, size, space, tabular, type } from '../theme';
import * as haptics from '../services/haptics';
import { AddPlantModal } from './AddPlantModal';
import { SurveysModal } from './SurveysModal';

const FALLBACK = { latitude: 51.4545, longitude: -2.5879, name: 'Bristol' };

const SUN_STEP_MINUTES = 10;

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

type LocationState = 'unknown' | 'asking' | 'granted' | 'denied';

/// Stand in the spot, point the phone at it, and the app works out how much sun that
/// patch of ground actually gets - then names the plants that will be happy there.
///
/// No camera is needed for the maths: the compass gives the bearing, the date and your
/// coordinates give the sun's track, and the only judgement call left is how enclosed
/// the spot is, which you set yourself.
export function SunSpotScreen({ active = true }: { active?: boolean }) {
  const garden = useGarden();
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationState, setLocationState] = useState<LocationState>('unknown');
  const [heading, setHeading] = useState(180);
  const [headingAvailable, setHeadingAvailable] = useState(false);
  const [lockedBearing, setLockedBearing] = useState<number | null>(null);
  const [obstruction, setObstruction] = useState(12);
  const [now, setNow] = useState(new Date());
  const [saved, setSaved] = useState(false);
  const [planting, setPlanting] = useState<Species | null>(null);
  const [surveysOpen, setSurveysOpen] = useState(false);
  // Naming happens at the moment of saving, while you are still standing in the spot.
  const [naming, setNaming] = useState(false);
  const [spotName, setSpotName] = useState('');

  useEffect(() => {
    if (!active) return;
    // Catch up straight away, so coming back to the tab never shows a stale sun.
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, [active]);

  // Only use location if it has already been allowed. Asking is a deliberate tap below,
  // so nobody is hit with a permission prompt before they know what the screen is for.
  useEffect(() => {
    let cancelled = false;
    Location.getForegroundPermissionsAsync()
      .then(({ status }) => {
        if (cancelled) return;
        if (status === 'granted') setLocationState('granted');
        else if (status === 'denied') setLocationState('denied');
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const askForLocation = async () => {
    setLocationState('asking');
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationState(status === 'granted' ? 'granted' : 'denied');
    } catch {
      setLocationState('denied');
    }
  };

  // Position once, heading continuously - but only while this tab is on screen.
  useEffect(() => {
    if (locationState !== 'granted' || !active || naming) return;
    let headingSubscription: Location.LocationSubscription | null = null;
    let cancelled = false;
    (async () => {
      try {
        const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (!cancelled) setCoords({ latitude: position.coords.latitude, longitude: position.coords.longitude });
      } catch {
        // Falls back to the default coordinates below.
      }
      try {
        const subscription = await Location.watchHeadingAsync((value) => {
          const bearing = value.trueHeading >= 0 ? value.trueHeading : value.magHeading;
          setHeading(bearing);
          setHeadingAvailable(true);
        });
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
  }, [locationState, active, naming]);

  const latitude = coords?.latitude ?? FALLBACK.latitude;
  const longitude = coords?.longitude ?? FALLBACK.longitude;
  // While the survey is being named, everything holds still. You have already taken the
  // reading; the compass swinging about as you type - and the sun hours changing under
  // you as the phone turns - would mean saving a different spot from the one measured.
  const frozen = useRef<{ bearing: number; obstruction: number } | null>(null);
  const scroller = useRef<ScrollView>(null);
  const bearing = naming && frozen.current ? frozen.current.bearing : (lockedBearing ?? heading);
  const locked = lockedBearing !== null;

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
  // The compass fires many times a second. None of this depends on the bearing, so it has
  // no business re-filtering all 165 species every time the phone moves in your hand.
  const suggestions = useMemo(() => {
    const suited = SPECIES.filter((s) => lightMinimumHours[s.light] <= hours + 0.5);
    const seasonal = suited.filter((s) => s.sowMonths.includes(month));
    return (seasonal.length ? seasonal : suited).slice(0, 8);
  }, [hours, month]);

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

  const startSurvey = () => {
    haptics.selection();
    frozen.current = { bearing: lockedBearing ?? heading, obstruction };
    setSaved(false);
    setNaming(true);
    // The name field is near the bottom of a long screen; without this the keyboard
    // comes up over it and you type blind.
    setTimeout(() => scroller.current?.scrollToEnd({ animated: true }), 120);
  };

  const cancelSurvey = () => {
    haptics.selection();
    frozen.current = null;
    setNaming(false);
    setSpotName('');
  };

  const saveSurvey = () => {
    const fallbackName = `${aspectLabel(bearing)}-facing spot`;
    garden.saveSurvey({
      name: spotName.trim() || fallbackName,
      bearing,
      obstruction,
      sunHours: hours,
      latitude,
      longitude,
      placeName: coords ? 'Your garden' : FALLBACK.name,
    });
    setSaved(true);
    setNaming(false);
    setSpotName('');
    frozen.current = null;
  };

  const locationNote = (() => {
    if (locationState === 'granted' && coords) return 'Using your location, accurate to the nearest few hundred metres.';
    if (locationState === 'granted') return 'Finding your location...';
    if (locationState === 'denied') return `Location is off for Rooted, so ${FALLBACK.name} is standing in.`;
    return `Using ${FALLBACK.name} as a stand-in. Allow location for your own garden.`;
  })();

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
    <ScrollView
      style={{ backgroundColor: color.canvas }}
      contentContainerStyle={styles.scroll}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      ref={scroller}
    >
      <ContentColumn style={{ gap: size.cardGap }}>
        <View style={styles.intro}>
          <Text style={type.title} accessibilityRole="header">Sun spot</Text>
          <Text style={type.bodyMuted}>Stand where you'd plant, point the phone at it, and see how much sun it gets.</Text>
        </View>

        <Pressable
          onPress={() => { haptics.selection(); setSurveysOpen(true); }}
          accessibilityRole="button"
          accessibilityLabel={`View your saved spots. ${garden.surveys.length} saved`}
          style={({ pressed }) => [styles.surveysTile, pressed && { backgroundColor: color.surfacePressed }]}
        >
          <Ionicons name="bookmarks-outline" size={20} color={color.brandDeep} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={type.bodyStrong}>View surveys</Text>
            <Text style={type.caption}>
              {garden.surveys.length === 0
                ? 'Nothing saved yet - measure a spot below.'
                : `${garden.surveys.length} ${garden.surveys.length === 1 ? 'spot' : 'spots'} saved`}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={color.textTertiary} />
        </Pressable>

        <Card>
          <View style={{ gap: space.md, alignItems: 'center' }}>
            <SunDial arc={arc} bearing={bearing} current={current} obstruction={obstruction} />

            <View style={styles.readoutRow}>
              <View style={{ flex: 1 }}>
                <Text style={type.label}>Facing</Text>
                <Text style={[type.heading, tabular]}>
                  {compassLabel(bearing)} · {Math.round(bearing)}°
                </Text>
              </View>
              {headingAvailable ? (
                <Button
                  label={locked ? 'Unlock' : 'Lock'}
                  icon={locked ? 'lock-closed' : 'lock-open-outline'}
                  tone={locked ? 'solid' : 'quiet'}
                  compact
                  onPress={() => {
                    haptics.tap();
                    setLockedBearing(locked ? null : heading);
                  }}
                  accessibilityLabel={locked ? 'Unlock the compass' : 'Lock this direction'}
                />
              ) : null}
            </View>

            <View style={{ width: '100%', gap: space.xs }}>
              <Slider
                value={bearing}
                onValueChange={setLockedBearing}
                minimumValue={0}
                maximumValue={359}
                step={1}
                minimumTrackTintColor={color.sun}
                maximumTrackTintColor={color.sunTint}
                thumbTintColor={color.sun}
                accessibilityLabel="Direction"
                accessibilityHint="Drag to set the compass bearing"
              />
              <Text style={[type.caption, { textAlign: 'center' }]}>
                {headingAvailable
                  ? locked ? 'Direction locked. Unlock to follow the compass again.' : 'Drag to set the direction by hand; it locks the compass.'
                  : 'No compass here. Drag to set the direction you are facing.'}
              </Text>
            </View>
          </View>
        </Card>

        <Card>
          <View style={{ gap: space.sm }}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: space.sm, flexWrap: 'wrap' }}>
              <Text style={[styles.hours, tabular]}>{hours.toFixed(1)} hours</Text>
              <Text style={type.bodyMuted}>of direct sun today</Text>
            </View>
            <View style={{ flexDirection: 'row' }}>
              <Pill text={`Suits ${lightLabel[need].toLowerCase()} plants`} icon="sunny" tint="sun" />
            </View>
            <Text style={type.bodyMuted}>{explanation}</Text>
          </View>
        </Card>

        <Card>
          <View style={{ gap: space.sm }}>
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
              minimumTrackTintColor={color.brand}
              maximumTrackTintColor={color.brandPale}
              thumbTintColor={color.brand}
              accessibilityLabel="How enclosed the spot is"
              accessibilityValue={{ min: 0, max: 45, now: Math.round(obstruction), text: obstructionLabel }}
            />
            <View style={styles.spread}>
              <Text style={type.captionStrong}>{obstructionLabel}</Text>
              <Text style={[type.caption, tabular]}>{Math.round(obstruction)}° skyline</Text>
            </View>
          </View>
        </Card>

        <Card>
          <SectionHeader title="Plant this here" subtitle={`Happy with ${hours.toFixed(1)} hours of sun. Tap one to plant it.`} />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.carousel}
            contentContainerStyle={styles.carouselContent}
          >
            {suggestions.map((species) => (
              <Pressable
                key={species.id}
                onPress={() => {
                  haptics.selection();
                  setPlanting(species);
                }}
                accessibilityRole="button"
                accessibilityLabel={`Plant ${species.name}`}
                style={({ pressed }) => [styles.tileWrap, pressed && { transform: [{ scale: 0.96 }] }]}
              >
                <View style={styles.tile}>
                  <PlantSprite look={lookOf(species)} progress={0.85} seed={seedFromString(species.id)} height={70} />
                </View>
                <Text style={[type.captionStrong, { textAlign: 'center' }]} numberOfLines={1}>{species.name}</Text>
              </Pressable>
            ))}
          </ScrollView>
          <View style={{ marginTop: space.md, gap: space.sm }}>
            {naming ? (
              <>
                <View style={styles.frozenNote}>
                  <Ionicons name="snow-outline" size={15} color={color.waterText} />
                  <Text style={[type.caption, { flex: 1, color: color.waterText }]}>
                    Reading held at {hours.toFixed(1)} hours, {compassLabel(bearing)}.
                  </Text>
                </View>
                <Input
                  label="Name this spot"
                  value={spotName}
                  onChangeText={setSpotName}
                  placeholder={`${aspectLabel(bearing)}-facing spot`}
                  maxLength={28}
                  autoFocus
                  returnKeyType="done"
                  onSubmitEditing={saveSurvey}
                />
                <Text style={type.caption}>
                  Something you will recognise later - "by the back fence", "the balcony end".
                </Text>
                <Button label="Save this spot" icon="bookmark" onPress={saveSurvey} />
                <Button label="Cancel" tone="quiet" onPress={cancelSurvey} />
              </>
            ) : (
              <Button label="Create a survey" icon="add" onPress={startSurvey} />
            )}
            {saved ? (
              <Text style={[type.caption, { textAlign: 'center', color: color.brandDeep }]}>
                Saved. Measure another spot and you can compare them.
              </Text>
            ) : null}
          </View>
        </Card>

        <View style={styles.locationNote}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
            <Ionicons
              name={coords ? 'location' : 'location-outline'}
              size={14}
              color={color.textSecondary}
            />
            <Text style={[type.caption, { flex: 1 }]}>{locationNote}</Text>
          </View>
          {locationState === 'unknown' || locationState === 'asking' ? (
            <View style={{ flexDirection: 'row' }}>
              <Chip
                text={locationState === 'asking' ? 'Asking...' : 'Use my location'}
                icon="navigate"
                tint="brand"
                onPress={askForLocation}
              />
            </View>
          ) : null}
        </View>
      </ContentColumn>

      <SurveysModal open={surveysOpen} onClose={() => setSurveysOpen(false)} />
      <AddPlantModal
        plot={planting ? garden.firstEmptyPlot : null}
        initialSpecies={planting}
        onClose={() => setPlanting(null)}
      />
    </ScrollView>
    </KeyboardAvoidingView>
  );
}

/// The compass rose: where you are pointing, where the sun is, and its whole track today.
function SunDial({ arc, bearing, current, obstruction }: {
  arc: SunSample[];
  bearing: number;
  current: { azimuth: number; elevation: number };
  obstruction: number;
}) {
  const sizePx = 240;
  const centre = sizePx / 2;
  const radiusPx = centre - 26;

  /// Compass bearings run clockwise from north, which is up.
  const point = (r: number, deg: number) => {
    const rad = (deg * Math.PI) / 180;
    return { x: centre + r * Math.sin(rad), y: centre - r * Math.cos(rad) };
  };

  const needle = point(radiusPx, bearing);
  const compassPoints = ['N', 'E', 'S', 'W'];

  return (
    <Svg
      width={sizePx}
      height={sizePx}
      accessibilityLabel={`Compass showing the sun's path today, facing ${compassLabel(bearing)}`}
    >
      <Circle cx={centre} cy={centre} r={radiusPx} stroke={color.line} strokeWidth={1.5} fill="none" />
      <Circle cx={centre} cy={centre} r={radiusPx * 0.45} fill={color.surfaceSunken} />

      {/* The sun's track. Each dot is a moment; the ones that clear the skyline and fall
          within the facing arc are the ones that count. */}
      {arc.map((sample, index) => {
        if (sample.position.elevation <= -2) return null;
        const lit =
          sample.position.elevation > obstruction &&
          angularDistance(sample.position.azimuth, bearing) <= 90;
        const r = radiusPx * (1 - (Math.max(sample.position.elevation, 0) / 90) * 0.55);
        const p = point(r, sample.position.azimuth);
        return (
          <Circle
            key={index}
            cx={p.x}
            cy={p.y}
            r={lit ? 3.5 : 2}
            fill={lit ? color.sun : color.sunTint}
          />
        );
      })}

      <Line x1={centre} y1={centre} x2={needle.x} y2={needle.y} stroke={color.brand} strokeWidth={3} strokeLinecap="round" />
      <Circle cx={centre} cy={centre} r={5} fill={color.brand} />

      {current.elevation > 0
        ? (() => {
            const p = point(radiusPx * (1 - (Math.max(current.elevation, 0) / 90) * 0.55), current.azimuth);
            return <Circle cx={p.x} cy={p.y} r={9} fill={color.sun} stroke="#fff" strokeWidth={2} />;
          })()
        : null}

      {compassPoints.map((label, index) => {
        const p = point(radiusPx + 14, index * 90);
        return (
          <SvgText
            key={label}
            x={p.x}
            y={p.y + 4}
            fontSize={12}
            fontWeight="bold"
            fill={color.textSecondary}
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
  frozenNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    padding: space.sm,
    borderRadius: radius.sm,
    backgroundColor: color.waterTint,
  },
  surveysTile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.md,
    borderRadius: radius.md,
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.line,
    minHeight: size.tap,
  },
  scroll: { padding: size.gutter, paddingBottom: space.xxxl },
  intro: { gap: space.xs, paddingHorizontal: space.xs, paddingBottom: space.xs },
  readoutRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, width: '100%' },
  hours: { fontSize: 28, lineHeight: 34, fontWeight: '700', color: color.brandDeep },
  spread: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  carousel: { marginHorizontal: -space.lg, marginTop: space.md },
  carouselContent: { paddingHorizontal: space.lg, gap: space.sm },
  tileWrap: { width: 96, gap: space.xs },
  tile: {
    width: 96,
    height: 80,
    borderRadius: radius.sm,
    backgroundColor: color.surfaceSunken,
    alignItems: 'center',
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  locationNote: { gap: space.sm, paddingHorizontal: space.xs },
});
