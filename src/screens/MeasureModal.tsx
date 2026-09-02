import React, { useEffect, useRef, useState } from 'react';
import {
  Modal, PanResponder, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View,
} from 'react-native';
import { DeviceMotion } from 'expo-sensors';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, ContentColumn, Input, SectionHeader, SheetBar } from '../components/ui';
import { useGarden } from '../state/GardenContext';
import { Planting, latestHeight } from '../models/planting';
import { color, radius, size, space, tabular, type } from '../theme';
import * as haptics from '../services/haptics';

type ReferenceKey = 'creditCard' | 'seedPacket' | 'trowel' | 'custom';

const REFERENCES: { key: ReferenceKey; label: string; cm: number }[] = [
  { key: 'creditCard', label: 'Card', cm: 8.6 },
  { key: 'seedPacket', label: 'Packet', cm: 16 },
  { key: 'trowel', label: 'Trowel', cm: 30 },
  { key: 'custom', label: 'Other', cm: 20 },
];

const MIN_SPAN = 20;
const MAX_SPAN = 200;
const STEP = 5;

/// Photo-based measurement, reduced to the part that actually does the work.
///
/// The trick is a reference object of known size stood in the soil: whatever the camera
/// distance, the ratio between the reference and the plant is fixed, so
/// plant_cm = reference_cm x (plant_on_screen / reference_on_screen). Drag the two
/// markers to match what you see and the arithmetic falls out.
///
/// The device's motion sensor keeps the shot square - a tilted frame skews the ratio and
/// quietly ruins the measurement, so the level has to be honest about it.
export function MeasureModal({ planting, onClose }: { planting: Planting | null; onClose: () => void }) {
  const garden = useGarden();
  const [reference, setReference] = useState<ReferenceKey>('seedPacket');
  const [customCm, setCustomCm] = useState('20');
  const [referenceSpan, setReferenceSpan] = useState(90);
  const [plantSpan, setPlantSpan] = useState(150);
  const [tilt, setTilt] = useState({ roll: 0, pitch: 0, available: false });

  useEffect(() => {
    if (!planting) return;
    let subscription: { remove: () => void } | null = null;
    let cancelled = false;
    (async () => {
      const available = await DeviceMotion.isAvailableAsync();
      if (!available || cancelled) return;
      let listener: { remove: () => void };
      try {
        DeviceMotion.setUpdateInterval(80);
        listener = DeviceMotion.addListener((data) => {
          if (!data.rotation) return;
          setTilt({ roll: data.rotation.gamma, pitch: data.rotation.beta + Math.PI / 2, available: true });
        });
      } catch {
        // The web build reports the sensor as available and then has no listener.
        return;
      }
      // Closing the sheet before the availability check returns used to leave the
      // motion sensor running, one listener per open.
      if (cancelled) listener.remove();
      else subscription = listener;
    })();
    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, [planting?.id]);

  if (!planting) return <Modal visible={false} onRequestClose={onClose}><View /></Modal>;

  const customValue = Number(customCm.replace(',', '.'));
  const customValid = Number.isFinite(customValue) && customValue > 0 && customValue <= 300;
  const referenceCm = reference === 'custom'
    ? (customValid ? customValue : 0)
    : REFERENCES.find((r) => r.key === reference)!.cm;

  const measured = referenceSpan > 8 && referenceCm > 0 ? referenceCm * (plantSpan / referenceSpan) : 0;
  const isLevel = Math.abs(tilt.roll) < 0.06 && Math.abs(tilt.pitch) < 0.06;
  const previous = latestHeight(planting);
  const canSave = measured > 0;

  const save = () => {
    if (!canSave) return;
    garden.recordHeight(measured, planting);
    haptics.success();
    onClose();
  };

  const levelState = !tilt.available ? 'none' : isLevel ? 'level' : 'tilted';
  const levelCopy = {
    none: { title: 'No motion sensor here', body: 'Hold the phone as square to the plant as you can by eye.' },
    level: { title: 'Level - take the shot', body: 'The frame is square, so the ratio will be true.' },
    tilted: { title: 'Straighten up a little', body: 'A tilted frame stretches one side and the ratio stops being true.' },
  }[levelState];
  const bubbleColour = { none: color.textTertiary, level: color.brand, tilted: color.sun }[levelState];

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: color.canvas }}>
        <SheetBar
          title={`Measure ${planting.nickname}`}
          onCancel={onClose}
          action="Save"
          onAction={save}
          actionDisabled={!canSave}
        />

        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <ContentColumn style={{ gap: size.cardGap }}>
            <Card padding={space.md}>
              <View
                style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}
                accessibilityLabel={levelCopy.title}
              >
                <View style={[styles.levelRing, levelState === 'none' && styles.levelRingOff]}>
                  {levelState === 'none' ? (
                    <Ionicons name="remove" size={18} color={color.textTertiary} />
                  ) : (
                    <View
                      style={[
                        styles.bubble,
                        {
                          backgroundColor: bubbleColour,
                          transform: [
                            { translateX: clamp(tilt.roll * 60, -16, 16) },
                            { translateY: clamp(tilt.pitch * 60, -16, 16) },
                          ],
                        },
                      ]}
                    />
                  )}
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={type.bodyStrong}>{levelCopy.title}</Text>
                  <Text style={type.caption}>{levelCopy.body}</Text>
                </View>
              </View>
            </Card>

            <Card>
              <View style={{ gap: space.md }}>
                <SectionHeader
                  title="Reference object"
                  subtitle="Stand something you know the size of in the soil."
                />
                <View style={styles.segment} accessibilityRole="radiogroup" accessibilityLabel="Reference object">
                  {REFERENCES.map((item) => {
                    const on = reference === item.key;
                    return (
                      <Pressable
                        key={item.key}
                        onPress={() => {
                          haptics.selection();
                          setReference(item.key);
                        }}
                        accessibilityRole="radio"
                        accessibilityLabel={item.key === 'custom' ? 'Other length' : `${item.label}, ${item.cm} centimetres`}
                        accessibilityState={{ selected: on }}
                        style={({ pressed }) => [
                          styles.segmentItem,
                          on && styles.segmentActive,
                          pressed && !on && { backgroundColor: color.surfacePressed },
                        ]}
                      >
                        <Text style={[styles.segmentLabel, on && styles.segmentLabelActive]}>{item.label}</Text>
                        {item.key !== 'custom' ? (
                          <Text style={[styles.segmentSub, tabular, on && { color: color.brandDeep }]}>{item.cm} cm</Text>
                        ) : null}
                      </Pressable>
                    );
                  })}
                </View>
                {reference === 'custom' ? (
                  <View style={{ gap: space.xs }}>
                    <Input
                      label="Its length in centimetres"
                      value={customCm}
                      onChangeText={setCustomCm}
                      keyboardType="decimal-pad"
                      placeholder="20"
                      maxLength={5}
                    />
                    {!customValid ? (
                      <Text style={[type.caption, { color: color.dangerText }]}>Enter a length between 1 and 300 cm.</Text>
                    ) : null}
                  </View>
                ) : null}
              </View>
            </Card>

            <Card>
              <View style={{ gap: space.md }}>
                <SectionHeader
                  title="Match the two bars"
                  subtitle="Drag each handle to the height it appears next to the real thing."
                />
                <View style={styles.bars}>
                  <DragBar
                    span={referenceSpan}
                    setSpan={setReferenceSpan}
                    tint={color.sun}
                    tintText={color.sunText}
                    caption="Reference"
                    detail={referenceCm > 0 ? `${formatCm(referenceCm)} cm` : '–'}
                  />
                  <DragBar
                    span={plantSpan}
                    setSpan={setPlantSpan}
                    tint={color.brand}
                    tintText={color.brandDeep}
                    caption="Plant"
                  />
                  <View style={styles.result}>
                    <Text style={type.label}>Measured height</Text>
                    <Text style={[styles.resultValue, tabular]}>
                      {measured > 0 ? `${formatCm(measured)} cm` : '–'}
                    </Text>
                    {previous !== null && measured > 0 ? (
                      <Text style={[type.caption, tabular, { color: measured >= previous ? color.brandDeep : color.dangerText }]}>
                        {measured >= previous
                          ? `Up ${formatCm(measured - previous)} cm on last time`
                          : `Down ${formatCm(previous - measured)} cm on last time`}
                      </Text>
                    ) : previous === null && measured > 0 ? (
                      <Text style={type.caption}>First measurement.</Text>
                    ) : null}
                  </View>
                </View>
              </View>
            </Card>
          </ContentColumn>
        </ScrollView>

        <View style={styles.footer}>
          <ContentColumn>
            <Button
              label={canSave ? `Save ${formatCm(measured)} cm` : 'Set the reference first'}
              icon="checkmark"
              onPress={save}
              disabled={!canSave}
            />
          </ContentColumn>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const clamp = (value: number, low: number, high: number) => Math.min(Math.max(value, low), high);
const formatCm = (value: number) => (value >= 100 ? Math.round(value).toString() : value.toFixed(1));

/// A bar you drag from the bottom up. Its height in points is the only thing the
/// measurement needs. The handle is a 44pt target; screen readers can nudge it.
function DragBar({ span, setSpan, tint, tintText, caption, detail }: {
  span: number;
  setSpan: (value: number) => void;
  tint: string;
  tintText: string;
  caption: string;
  detail?: string;
}) {
  // The pan responder is created once, so it reads the live value through a ref
  // rather than closing over a stale `span`.
  const spanRef = useRef(span);
  spanRef.current = span;
  const setSpanRef = useRef(setSpan);
  setSpanRef.current = setSpan;
  const startSpan = useRef(span);
  const [dragging, setDragging] = useState(false);

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        startSpan.current = spanRef.current;
        setDragging(true);
      },
      onPanResponderMove: (_, gesture) => {
        setSpanRef.current(clamp(startSpan.current - gesture.dy, MIN_SPAN, MAX_SPAN));
      },
      onPanResponderRelease: () => {
        setDragging(false);
        haptics.selection();
      },
      onPanResponderTerminate: () => setDragging(false),
    })
  ).current;

  return (
    <View
      style={styles.barColumn}
      accessibilityRole="adjustable"
      accessibilityLabel={`${caption} bar`}
      accessibilityValue={{ min: MIN_SPAN, max: MAX_SPAN, now: Math.round(span) }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(event) => {
        const delta = event.nativeEvent.actionName === 'increment' ? STEP : -STEP;
        setSpan(clamp(span + delta, MIN_SPAN, MAX_SPAN));
      }}
    >
      <View style={styles.barTrack} {...responder.panHandlers}>
        <View style={[styles.bar, { height: span, backgroundColor: tint + '33', borderColor: tint + '66' }]} />
        <View style={[styles.handleHit, { bottom: span - size.tap / 2 }]}>
          <View style={[styles.handle, { backgroundColor: tint }, dragging && styles.handleActive]}>
            <Ionicons name="reorder-two" size={16} color="#FFF" />
          </View>
        </View>
      </View>
      <Text style={[type.captionStrong, { color: tintText }]}>{caption}</Text>
      {detail ? <Text style={[type.caption, tabular]}>{detail}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: size.gutter, paddingBottom: space.xxl },
  footer: {
    paddingHorizontal: size.gutter,
    paddingVertical: space.md,
    borderTopWidth: 1,
    borderTopColor: color.line,
    backgroundColor: color.surface,
  },
  levelRing: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: color.brandPale,
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelRingOff: { borderStyle: 'dashed', borderColor: color.line },
  bubble: { width: 16, height: 16, borderRadius: 8 },
  segment: {
    flexDirection: 'row',
    backgroundColor: color.surfaceSunken,
    borderRadius: radius.sm,
    padding: 3,
    gap: 2,
  },
  segmentItem: {
    flex: 1,
    minHeight: size.tap,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.xs + 1,
    gap: 1,
  },
  segmentActive: { backgroundColor: color.surface },
  segmentLabel: { fontSize: 14, fontWeight: '500', color: color.textSecondary },
  segmentLabelActive: { color: color.brandDeep, fontWeight: '700' },
  segmentSub: { fontSize: 11, lineHeight: 13, color: color.textTertiary },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: space.lg },
  barColumn: { alignItems: 'center', gap: space.xs, width: 72 },
  barTrack: { height: MAX_SPAN + size.tap / 2, width: 72, justifyContent: 'flex-end', alignItems: 'center' },
  bar: { width: 40, borderRadius: radius.xs, borderWidth: 1 },
  handleHit: {
    position: 'absolute',
    width: size.tap,
    height: size.tap,
    alignItems: 'center',
    justifyContent: 'center',
  },
  handle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  handleActive: { transform: [{ scale: 1.15 }] },
  result: { flex: 1, gap: space.xs, paddingBottom: space.xxl, alignSelf: 'flex-end' },
  resultValue: { fontSize: 30, lineHeight: 36, fontWeight: '700', color: color.brandDeep },
});
