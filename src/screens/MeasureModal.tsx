import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  LayoutChangeEvent, Modal, PanResponder, Pressable, SafeAreaView, StyleSheet, Text, View,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { DeviceMotion } from 'expo-sensors';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, ContentColumn } from '../components/ui';
import { CalibrateModal } from './CalibrateModal';
import { useGarden } from '../state/GardenContext';
import { Planting, getSpecies, latestHeight } from '../models/planting';
import { ScreenScale, defaultScale, loadScale, saveScale } from '../services/measure';
import { color, radius, size, space, tabular, type } from '../theme';
import * as haptics from '../services/haptics';

/// Recording how tall a plant has got.
///
/// **Phone ruler.** Stand the handset on the soil beside the plant and put the line where
/// the plant's top is. The phone is the ruler, held against the thing being measured.
///
/// Two things make or break this and the first version got both wrong.
///
/// The first is where zero is. It has to be the bottom edge of the handset - the edge
/// actually resting on the soil - which means the ruler must run to the very bottom of
/// the glass with nothing beneath it, plus the few millimetres of case below that. The
/// old layout put a soil bar, a footer and the home-indicator inset under the track and
/// still measured from the track's own bottom, so every reading came out about 2cm short
/// and the tallest thing it could measure was around 6cm of a 14cm phone.
///
/// The second is that you cannot aim precisely at a small handle while crouched over a
/// bed holding a phone upright in one hand - and pressing hard enough to catch a 30pt
/// grip is enough to tip the phone out of plumb, which skews the reading anyway. So the
/// whole screen is the control: touch at the plant's height and the line goes there.
/// Everything else floats on top and lets touches through, and the fine adjustment is
/// buttons rather than fingers on glass.
///
/// **Tape measure** is for anything taller than the phone: a number you have already read
/// off a tape, coarse on the slider and exact on the buttons.

type Mode = 'ruler' | 'tape';

const TAPE_MAX = 300;

/// Upright enough for the reading to stand up: within about six degrees of plumb. Leaning
/// the phone back makes a plant measure taller than it is.
const PLUMB_TOLERANCE = 0.11;

const formatCm = (value: number) => (value >= 100 ? Math.round(value).toString() : value.toFixed(1));
const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

export function MeasureModal({ planting, onClose }: { planting: Planting | null; onClose: () => void }) {
  const garden = useGarden();
  const [mode, setMode] = useState<Mode>('ruler');
  const [scale, setScale] = useState<ScreenScale>(defaultScale);
  const [calibrating, setCalibrating] = useState(false);
  const [tilt, setTilt] = useState({ roll: 0, plumb: 0, available: false });
  const [tapeCm, setTapeCm] = useState(20);

  // Measured from the very bottom of the glass, because that is where the ruler's zero is.
  const [trackHeight, setTrackHeight] = useState(0);
  const [markFromBottom, setMarkFromBottom] = useState(0);

  useEffect(() => { loadScale().then(setScale); }, []);

  useEffect(() => {
    if (!planting) return;
    let subscription: { remove: () => void } | null = null;
    let cancelled = false;
    (async () => {
      const available = await DeviceMotion.isAvailableAsync();
      if (!available || cancelled) return;
      let listener: { remove: () => void };
      try {
        DeviceMotion.setUpdateInterval(120);
        listener = DeviceMotion.addListener((data) => {
          if (!data.rotation) return;
          // beta is pitch: a quarter turn from flat is a phone stood on its end.
          setTilt({
            roll: data.rotation.gamma,
            plumb: data.rotation.beta - Math.PI / 2,
            available: true,
          });
        });
      } catch {
        // The web build reports the sensor as available and then has no listener.
        return;
      }
      if (cancelled) listener.remove();
      else subscription = listener;
    })();
    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, [planting?.id]);

  const previous = planting ? latestHeight(planting) : null;

  // Start where this plant left off, so a weekly measurement is a nudge rather than a hunt.
  useEffect(() => {
    if (!planting || !trackHeight) return;
    const start = previous ?? 10;
    setTapeCm(clamp(start, 1, TAPE_MAX));
    setMarkFromBottom(clamp((start - scale.bezelCm) * scale.pointsPerCm, 0, trackHeight));
  }, [planting?.id, scale.pointsPerCm, trackHeight]);

  if (!planting) return <Modal visible={false} onRequestClose={onClose}><View /></Modal>;

  const species = getSpecies(planting);
  const ceiling = trackHeight / scale.pointsPerCm + scale.bezelCm;
  const rulerCm = markFromBottom / scale.pointsPerCm + scale.bezelCm;
  const measured = mode === 'ruler' ? rulerCm : tapeCm;
  const isPlumb = Math.abs(tilt.plumb) < PLUMB_TOLERANCE && Math.abs(tilt.roll) < PLUMB_TOLERANCE;
  const atCeiling = mode === 'ruler' && trackHeight > 0 && markFromBottom >= trackHeight - 3;

  const save = () => {
    if (measured <= 0) return;
    garden.recordHeight(measured, planting);
    haptics.success();
    onClose();
  };

  const nudge = (deltaCm: number) => {
    haptics.selection();
    if (mode === 'tape') {
      setTapeCm((current) => clamp(Math.round((current + deltaCm) * 10) / 10, 0.5, TAPE_MAX));
      return;
    }
    setMarkFromBottom((current) =>
      clamp(current + deltaCm * scale.pointsPerCm, 0, trackHeight)
    );
  };

  return (
    <Modal visible animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <View style={styles.root}>
        {mode === 'ruler' ? (
          <Ruler
            scale={scale}
            trackHeight={trackHeight}
            onTrackHeight={setTrackHeight}
            markFromBottom={markFromBottom}
            onMark={setMarkFromBottom}
            ceiling={ceiling}
          />
        ) : null}

        {/* Floats over the ruler and lets touches through, so the line can still be set
            behind it - a tall plant needs the line exactly where these controls are. */}
        <SafeAreaView style={styles.overlay} pointerEvents="box-none">
          <View style={styles.bar} pointerEvents="box-none">
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close"
              hitSlop={10}
              style={({ pressed }) => [styles.close, pressed && { opacity: 0.7 }]}
            >
              <Ionicons name="close" size={20} color={color.textSecondary} />
            </Pressable>

            <Text numberOfLines={1} style={styles.title}>{planting.nickname || species.name}</Text>

            <Pressable
              onPress={save}
              accessibilityRole="button"
              accessibilityLabel={`Save ${formatCm(measured)} centimetres`}
              hitSlop={10}
              style={({ pressed }) => [styles.save, pressed && { opacity: 0.85 }]}
            >
              <Text style={styles.saveText}>Save</Text>
            </Pressable>
          </View>

          <View style={styles.panel} pointerEvents="box-none">
            <View style={styles.modeRow} pointerEvents="auto">
              <ModeTab label="Phone ruler" icon="phone-portrait-outline" on={mode === 'ruler'}
                onPress={() => { haptics.selection(); setMode('ruler'); }} />
              <ModeTab label="Tape measure" icon="resize-outline" on={mode === 'tape'}
                onPress={() => { haptics.selection(); setMode('tape'); }} />
            </View>

            <View style={styles.readout} pointerEvents="box-none">
              <Text style={[styles.value, tabular]}>{formatCm(measured)}</Text>
              <Text style={styles.unit}>cm</Text>
              <View style={{ flex: 1 }} />
              <View style={styles.nudges} pointerEvents="auto">
                <NudgeButton label="−1" onPress={() => nudge(-1)} />
                <NudgeButton label="−0.1" onPress={() => nudge(-0.1)} />
                <NudgeButton label="+0.1" onPress={() => nudge(0.1)} />
                <NudgeButton label="+1" onPress={() => nudge(1)} />
              </View>
            </View>

            {previous !== null ? (
              <Text style={[type.caption, tabular]}>
                {measured >= previous
                  ? `Up ${formatCm(measured - previous)} cm on ${formatCm(previous)} cm last time`
                  : `Down ${formatCm(previous - measured)} cm on ${formatCm(previous)} cm last time`}
              </Text>
            ) : (
              <Text style={type.caption}>First measurement for this plant.</Text>
            )}

            {mode === 'ruler' ? (
              <View style={[styles.status, isPlumb && styles.statusGood]} pointerEvents="none">
                <Ionicons
                  name={!tilt.available ? 'information-circle-outline' : isPlumb ? 'checkmark-circle' : 'warning-outline'}
                  size={16}
                  color={!tilt.available ? color.textTertiary : isPlumb ? color.brandDeep : color.sunText}
                />
                <Text style={[type.caption, { flex: 1 }]}>
                  {!tilt.available
                    ? 'Stand the phone on the soil, then touch the screen level with the top of the plant.'
                    : isPlumb
                      ? 'Upright. Touch the screen level with the top of the plant.'
                      : 'Stand it straight up - leaning makes the plant measure taller than it is.'}
                </Text>
              </View>
            ) : null}
          </View>
        </SafeAreaView>

        {mode === 'tape' ? (
          <SafeAreaView style={styles.tapeSheet}>
            <ContentColumn style={{ gap: space.md }}>
              <Text style={type.caption}>
                Measure from the soil to the highest growing point - not the tip of a leaf that
                happens to be leaning up.
              </Text>
              <Slider
                style={{ width: '100%', height: 40 }}
                minimumValue={0.5}
                maximumValue={TAPE_MAX}
                step={0.5}
                value={tapeCm}
                onValueChange={setTapeCm}
                onSlidingComplete={() => haptics.selection()}
                minimumTrackTintColor={color.brand}
                maximumTrackTintColor={color.line}
                thumbTintColor={color.brand}
                accessibilityLabel="Height in centimetres"
              />
            </ContentColumn>
          </SafeAreaView>
        ) : (
          <>
            <View style={styles.soilEdge} pointerEvents="none">
              <Text style={styles.soilLabel}>rest this edge on the soil</Text>
            </View>

            {atCeiling ? (
              <View style={styles.ceilingNote} pointerEvents="box-none">
                <Card padding={space.md}>
                  <View style={{ gap: space.sm }}>
                    <Text style={type.bodyStrong}>Taller than the phone</Text>
                    <Text style={type.caption}>
                      The line is at the top of the glass, so this one has outgrown it. Measure
                      with a tape and type the number instead.
                    </Text>
                    <Button
                      label="Switch to tape measure"
                      tone="quiet"
                      compact
                      onPress={() => { setTapeCm(Math.max(Math.round(ceiling), 1)); setMode('tape'); }}
                    />
                  </View>
                </Card>
              </View>
            ) : null}

            <Pressable
              onPress={() => setCalibrating(true)}
              accessibilityRole="button"
              style={({ pressed }) => [styles.calibrate, pressed && { opacity: 0.6 }]}
            >
              <Ionicons name="options-outline" size={14} color={color.brandDeep} />
              <Text style={styles.calibrateLabel}>
                {scale.calibrated ? 'Recalibrate' : `Reaches ${formatCm(ceiling)} cm · check accuracy`}
              </Text>
            </Pressable>
          </>
        )}

        <CalibrateModal
          visible={calibrating}
          scale={scale}
          onSave={(next) => { setScale(next); saveScale(next); }}
          onClose={() => setCalibrating(false)}
        />
      </View>
    </Modal>
  );
}

/// The full-bleed ruler. Zero is the bottom of the glass; the case below it is added on
/// afterwards from the calibration.
function Ruler({ scale, trackHeight, onTrackHeight, markFromBottom, onMark, ceiling }: {
  scale: ScreenScale;
  trackHeight: number;
  onTrackHeight: (value: number) => void;
  markFromBottom: number;
  onMark: (value: number) => void;
  ceiling: number;
}) {
  const top = useRef(0);
  const container = useRef<View>(null);
  const heightRef = useRef(trackHeight);
  heightRef.current = trackHeight;
  const onMarkRef = useRef(onMark);
  onMarkRef.current = onMark;
  const lastCm = useRef(-1);
  const perCm = useRef(scale.pointsPerCm);
  perCm.current = scale.pointsPerCm;

  const set = (pageY: number) => {
    const next = clamp(heightRef.current - (pageY - top.current), 0, heightRef.current);
    onMarkRef.current(next);
    // A tick at every centimetre, because you cannot read the number closely while the
    // phone is standing in the soil and your eye is on the plant.
    const cm = Math.round(next / perCm.current);
    if (cm !== lastCm.current) {
      lastCm.current = cm;
      haptics.selection();
    }
  };

  // The whole surface is the control, so there is nothing to aim at.
  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (event) => set(event.nativeEvent.pageY),
      onPanResponderMove: (event) => set(event.nativeEvent.pageY),
      onPanResponderRelease: () => haptics.tap(),
    })
  ).current;

  const onLayout = (event: LayoutChangeEvent) => {
    onTrackHeight(event.nativeEvent.layout.height);
    container.current?.measureInWindow((_x, y) => { top.current = y; });
  };

  const ticks = useMemo(() => {
    const out: { cm: number; y: number; major: boolean }[] = [];
    if (!trackHeight) return out;
    for (let cm = 1; cm <= Math.floor(ceiling); cm++) {
      const y = (cm - scale.bezelCm) * scale.pointsPerCm;
      if (y < 0 || y > trackHeight) continue;
      out.push({ cm, y, major: cm % 5 === 0 });
    }
    return out;
  }, [trackHeight, ceiling, scale.pointsPerCm, scale.bezelCm]);

  return (
    <View
      ref={container}
      style={StyleSheet.absoluteFill}
      onLayout={onLayout}
      accessibilityLabel="Plant height ruler"
      {...responder.panHandlers}
    >
      <View style={[styles.fill, { height: markFromBottom }]} pointerEvents="none" />

      {ticks.map((tick) => (
        <View key={tick.cm} style={[styles.tick, { bottom: tick.y }]} pointerEvents="none">
          <View style={[styles.tickLine, tick.major && styles.tickLineMajor]} />
          {tick.major ? <Text style={[styles.tickLabel, tabular]}>{tick.cm}</Text> : null}
          <View style={{ flex: 1 }} />
          {tick.major ? <Text style={[styles.tickLabel, tabular]}>{tick.cm}</Text> : null}
          <View style={[styles.tickLine, tick.major && styles.tickLineMajor]} />
        </View>
      ))}

      <View style={[styles.mark, { bottom: markFromBottom }]} pointerEvents="none">
        <View style={styles.markArrow}>
          <Ionicons name="caret-forward" size={18} color={color.brand} />
        </View>
        <View style={styles.markLine} />
        <View style={[styles.markArrow, { transform: [{ scaleX: -1 }] }]}>
          <Ionicons name="caret-forward" size={18} color={color.brand} />
        </View>
      </View>
    </View>
  );
}

function ModeTab({ label, icon, on, onPress }: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  on: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected: on }}
      accessibilityLabel={label}
      style={({ pressed }) => [styles.modeTab, on && styles.modeTabOn, pressed && !on && { opacity: 0.7 }]}
    >
      <Ionicons name={icon} size={15} color={on ? color.brandDeep : color.textSecondary} />
      <Text style={[styles.modeLabel, on && styles.modeLabelOn]}>{label}</Text>
    </Pressable>
  );
}

function NudgeButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label} centimetres`}
      hitSlop={4}
      style={({ pressed }) => [styles.nudge, pressed && { backgroundColor: color.surfacePressed }]}
    >
      <Text style={styles.nudgeLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.canvas },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0 },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: size.gutter,
    paddingTop: space.sm,
  },
  close: {
    width: size.tap,
    height: size.tap,
    borderRadius: size.tap / 2,
    backgroundColor: color.surfaceSunken,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '700', color: color.text },
  save: {
    minHeight: size.tap - 6,
    justifyContent: 'center',
    paddingHorizontal: 18,
    borderRadius: radius.pill,
    backgroundColor: color.brand,
  },
  saveText: { fontSize: 15, fontWeight: '700', color: color.textOnBrand },

  panel: {
    margin: size.gutter,
    padding: space.md,
    borderRadius: radius.md,
    backgroundColor: color.surface + 'F2',
    borderWidth: 1,
    borderColor: color.line,
    gap: space.sm,
  },
  modeRow: { flexDirection: 'row', backgroundColor: color.surfaceSunken, borderRadius: radius.sm, padding: 3, gap: 2 },
  modeTab: {
    flex: 1,
    flexDirection: 'row',
    minHeight: size.tap - 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: radius.xs,
  },
  modeTabOn: { backgroundColor: color.surface },
  modeLabel: { fontSize: 13, fontWeight: '600', color: color.textSecondary },
  modeLabelOn: { color: color.brandDeep, fontWeight: '700' },

  readout: { flexDirection: 'row', alignItems: 'flex-end', gap: 4 },
  value: { fontSize: 46, lineHeight: 50, fontWeight: '800', color: color.brandDeep },
  unit: { fontSize: 15, fontWeight: '700', color: color.textSecondary, paddingBottom: 6 },
  nudges: { flexDirection: 'row', gap: 4 },
  nudge: {
    minWidth: 42,
    minHeight: size.tap - 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    borderRadius: radius.xs,
    backgroundColor: color.surfaceSunken,
  },
  nudgeLabel: { fontSize: 14, fontWeight: '700', color: color.text },

  status: { flexDirection: 'row', alignItems: 'center', gap: space.sm, padding: space.sm, borderRadius: radius.sm, backgroundColor: color.sunTint },
  statusGood: { backgroundColor: color.brandTint },

  fill: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: color.brandTint + '66' },
  tick: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', alignItems: 'center', gap: 4 },
  tickLine: { width: 10, height: 1, backgroundColor: color.line },
  tickLineMajor: { width: 22, height: 1.5, backgroundColor: color.textTertiary },
  tickLabel: { fontSize: 11, lineHeight: 13, color: color.textTertiary },

  mark: { position: 'absolute', left: 0, right: 0, height: 20, marginBottom: -10, flexDirection: 'row', alignItems: 'center' },
  markLine: { flex: 1, height: 2.5, backgroundColor: color.brand },
  markArrow: { width: 18, alignItems: 'center' },

  soilEdge: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 22,
    backgroundColor: '#8A7561',
    alignItems: 'center',
    justifyContent: 'center',
  },
  soilLabel: { fontSize: 10, fontWeight: '700', color: '#FFF', opacity: 0.9, letterSpacing: 0.3 },

  calibrate: {
    position: 'absolute',
    bottom: 34,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    minHeight: size.tap - 10,
    borderRadius: radius.pill,
    backgroundColor: color.surface + 'E6',
  },
  calibrateLabel: { fontSize: 12, fontWeight: '600', color: color.brandDeep },

  ceilingNote: { position: 'absolute', left: size.gutter, right: size.gutter, bottom: 86 },
  tapeSheet: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: size.gutter },
});
