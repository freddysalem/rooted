import React, { useEffect, useRef, useState } from 'react';
import {
  Modal, PanResponder, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { DeviceMotion } from 'expo-sensors';
import { Card, SectionHeader } from '../components/ui';
import { useGarden } from '../state/GardenContext';
import { Planting, latestHeight } from '../models/planting';
import { Theme } from '../theme';
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
      DeviceMotion.setUpdateInterval(80);
      const listener = DeviceMotion.addListener((data) => {
        if (!data.rotation) return;
        setTilt({ roll: data.rotation.gamma, pitch: data.rotation.beta + Math.PI / 2, available: true });
      });
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

  const referenceCm = reference === 'custom'
    ? Number(customCm) || 20
    : REFERENCES.find((r) => r.key === reference)!.cm;

  const measured = referenceSpan > 8 ? referenceCm * (plantSpan / referenceSpan) : 0;
  const isLevel = Math.abs(tilt.roll) < 0.06 && Math.abs(tilt.pitch) < 0.06;
  const previous = latestHeight(planting);

  const save = () => {
    if (measured <= 0) return;
    garden.recordHeight(measured, planting);
    haptics.success();
    onClose();
  };

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: Theme.background }}>
        <View style={styles.bar}>
          <Pressable onPress={onClose}><Text style={styles.barAction}>Cancel</Text></Pressable>
          <Text style={styles.barTitle}>Measure {planting.nickname}</Text>
          <Pressable onPress={save} disabled={measured <= 0}>
            <Text style={[styles.barAction, styles.barPrimary, measured <= 0 && { opacity: 0.35 }]}>
              Save
            </Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Card padding={14}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <View style={styles.levelRing}>
                <View
                  style={[
                    styles.bubble,
                    {
                      backgroundColor: isLevel ? Theme.leaf : Theme.sun,
                      transform: [
                        { translateX: clamp(tilt.roll * 60, -16, 16) },
                        { translateY: clamp(tilt.pitch * 60, -16, 16) },
                      ],
                    },
                  ]}
                />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.strong}>
                  {!tilt.available
                    ? 'No motion sensor here'
                    : isLevel ? 'Level - take the shot' : 'Straighten up a little'}
                </Text>
                <Text style={styles.tiny}>
                  A tilted frame stretches one side and the ratio stops being true.
                </Text>
              </View>
            </View>
          </Card>

          <Card>
            <View style={{ gap: 10 }}>
              <SectionHeader
                title="Reference object"
                subtitle="Stand something you know the size of in the soil."
              />
              <View style={styles.segment}>
                {REFERENCES.map((item) => (
                  <Pressable
                    key={item.key}
                    onPress={() => {
                      haptics.selection();
                      setReference(item.key);
                    }}
                    style={[styles.segmentItem, reference === item.key && styles.segmentActive]}
                  >
                    <Text
                      style={[
                        styles.segmentLabel,
                        reference === item.key && { color: Theme.leafDeep, fontWeight: '700' },
                      ]}
                    >
                      {item.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
              {reference === 'custom' ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <TextInput
                    value={customCm}
                    onChangeText={setCustomCm}
                    keyboardType="decimal-pad"
                    style={styles.input}
                  />
                  <Text style={styles.tiny}>cm</Text>
                </View>
              ) : null}
            </View>
          </Card>

          <Card>
            <View style={{ gap: 12 }}>
              <SectionHeader
                title="Match the two bars"
                subtitle="Drag each one to the height it appears in your photo."
              />
              <View style={{ flexDirection: 'row', gap: 28, height: 250, alignItems: 'flex-end' }}>
                <DragBar
                  span={referenceSpan}
                  setSpan={setReferenceSpan}
                  tint={Theme.sun}
                  caption="Reference"
                  detail={`${Math.round(referenceCm)} cm`}
                />
                <DragBar
                  span={plantSpan}
                  setSpan={setPlantSpan}
                  tint={Theme.leaf}
                  caption="Plant"
                  detail={measured > 0 ? `${Math.round(measured)} cm` : '-'}
                />
              </View>
            </View>
          </Card>

          <Card>
            <View style={{ gap: 6 }}>
              <Text style={styles.label}>Measured height</Text>
              <Text style={styles.result}>{measured > 0 ? `${measured.toFixed(1)} cm` : '-'}</Text>
              {previous !== null && measured > 0 ? (
                <Text style={{ fontSize: 13, color: measured >= previous ? Theme.leaf : Theme.alert }}>
                  {measured >= previous
                    ? `Up ${(measured - previous).toFixed(1)} cm on last time`
                    : `Down ${(previous - measured).toFixed(1)} cm on last time`}
                </Text>
              ) : null}
            </View>
          </Card>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const clamp = (value: number, low: number, high: number) => Math.min(Math.max(value, low), high);

/// A bar you drag from the bottom up. Its height in points is the only thing the
/// measurement needs.
function DragBar({ span, setSpan, tint, caption, detail }: {
  span: number;
  setSpan: (value: number) => void;
  tint: string;
  caption: string;
  detail: string;
}) {
  // The pan responder is created once, so it reads the live value through a ref
  // rather than closing over a stale `span`.
  const spanRef = useRef(span);
  spanRef.current = span;
  const setSpanRef = useRef(setSpan);
  setSpanRef.current = setSpan;
  const startSpan = useRef(span);

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        startSpan.current = spanRef.current;
      },
      onPanResponderMove: (_, gesture) => {
        setSpanRef.current(clamp(startSpan.current - gesture.dy, MIN_SPAN, MAX_SPAN));
      },
      onPanResponderRelease: () => haptics.selection(),
    })
  ).current;

  return (
    <View style={{ alignItems: 'center', gap: 6 }}>
      <View style={{ height: 200, justifyContent: 'flex-end' }} {...responder.panHandlers}>
        <View style={{ width: 34, height: span, borderRadius: 8, backgroundColor: tint + '2E' }} />
        <View
          style={{
            position: 'absolute',
            bottom: span - 10,
            left: 7,
            width: 20,
            height: 20,
            borderRadius: 10,
            backgroundColor: tint,
          }}
        />
      </View>
      <Text style={styles.caption}>{caption}</Text>
      <Text style={styles.tiny}>{detail}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  barTitle: { fontSize: 15, fontWeight: '700', color: Theme.ink },
  barAction: { fontSize: 15, color: Theme.leafDeep },
  barPrimary: { fontWeight: '700' },
  scroll: { padding: 18, paddingBottom: 40, gap: 14 },
  levelRing: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 2,
    borderColor: Theme.leafPale,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubble: { width: 14, height: 14, borderRadius: 7 },
  strong: { fontSize: 15, fontWeight: '600', color: Theme.ink },
  tiny: { fontSize: 12, color: Theme.inkSoft, lineHeight: 17 },
  label: { fontSize: 13, fontWeight: '600', color: Theme.inkSoft },
  result: { fontSize: 32, fontWeight: '700', color: Theme.leafDeep },
  caption: { fontSize: 12, fontWeight: '600', color: Theme.ink },
  segment: {
    flexDirection: 'row',
    backgroundColor: Theme.surfaceAlt,
    borderRadius: 10,
    padding: 3,
  },
  segmentItem: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  segmentActive: { backgroundColor: Theme.surface },
  segmentLabel: { fontSize: 13, color: Theme.inkSoft },
  input: {
    flex: 1,
    backgroundColor: Theme.surfaceAlt,
    borderRadius: 10,
    padding: 10,
    fontSize: 15,
    color: Theme.ink,
  },
});
