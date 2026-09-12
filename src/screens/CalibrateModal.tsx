import React, { useRef, useState } from 'react';
import {
  Modal, PanResponder, Pressable, SafeAreaView, StyleSheet, Text, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, ContentColumn, SheetBar } from '../components/ui';
import { CARD_LONG_CM, CARD_SHORT_CM, ScreenScale, defaultScale } from '../services/measure';
import { color, radius, size, space, tabular, type } from '../theme';
import * as haptics from '../services/haptics';

/// Teaching the app how big its own screen is.
///
/// The user drags one edge of an outline until it matches a bank card laid on the glass.
/// Every ID-1 card is 85.60mm on its long edge, so the number of points that outline ends
/// up spanning is, exactly, that many points per 8.56cm.
///
/// Landscape rather than portrait because a card is wider than most phones are - laid the
/// long way there is room to overshoot, and overshoot is what makes the match feel exact.

const MIN_WIDTH = 120;
const MAX_WIDTH = 900;

export function CalibrateModal({ visible, scale, onSave, onClose }: {
  visible: boolean;
  scale: ScreenScale;
  onSave: (scale: ScreenScale) => void;
  onClose: () => void;
}) {
  const [width, setWidth] = useState(() => scale.pointsPerCm * CARD_LONG_CM);
  const [bezelCm, setBezelCm] = useState(scale.bezelCm);

  const widthRef = useRef(width);
  widthRef.current = width;
  const start = useRef(width);

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => { start.current = widthRef.current; },
      onPanResponderMove: (_, g) => {
        setWidth(Math.min(Math.max(start.current + g.dx, MIN_WIDTH), MAX_WIDTH));
      },
      onPanResponderRelease: () => haptics.selection(),
    })
  ).current;

  const pointsPerCm = width / CARD_LONG_CM;
  const height = pointsPerCm * CARD_SHORT_CM;

  const save = () => {
    onSave({ pointsPerCm, bezelCm, calibrated: true });
    haptics.success();
    onClose();
  };

  const reset = () => {
    const fresh = defaultScale();
    setWidth(fresh.pointsPerCm * CARD_LONG_CM);
    setBezelCm(fresh.bezelCm);
    haptics.selection();
  };

  const nudgeBezel = (delta: number) => {
    setBezelCm((current) => Math.min(Math.max(Math.round((current + delta) * 10) / 10, 0), 2));
    haptics.selection();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: color.canvas }}>
        <SheetBar title="Calibrate the ruler" onCancel={onClose} action="Save" onAction={save} />

        <View style={styles.body}>
          <ContentColumn style={{ gap: size.cardGap }}>
            <Card padding={space.md}>
              <View style={{ gap: space.xs }}>
                <Text style={type.bodyStrong}>Lay a bank card on the screen</Text>
                <Text style={type.caption}>
                  Any bank, credit or loyalty card - they are all the same size by law. Drag the
                  right-hand edge until the outline sits exactly under the card, then save.
                </Text>
              </View>
            </Card>

            <View style={styles.stage}>
              <View
                style={[styles.card, { width, height }]}
                accessibilityRole="adjustable"
                accessibilityLabel="Card outline width"
              >
                <View style={styles.cardChip} />
                <Text style={[styles.cardHint, tabular]}>{CARD_LONG_CM} cm</Text>
                <View style={styles.handle} {...responder.panHandlers}>
                  <Ionicons name="code-outline" size={18} color="#FFF" />
                </View>
              </View>
            </View>

            <Card padding={space.md}>
              <View style={styles.bezelRow}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={type.bodyStrong}>Case below the screen</Text>
                  <Text style={type.caption}>
                    The few millimetres between the bottom of the glass and the bottom edge the
                    phone actually stands on.
                  </Text>
                </View>
                <View style={styles.stepper}>
                  <Pressable
                    onPress={() => nudgeBezel(-0.1)}
                    accessibilityRole="button"
                    accessibilityLabel="Less"
                    style={({ pressed }) => [styles.stepperButton, pressed && { opacity: 0.6 }]}
                  >
                    <Ionicons name="remove" size={18} color={color.brandDeep} />
                  </Pressable>
                  <Text style={[styles.stepperValue, tabular]}>{bezelCm.toFixed(1)}</Text>
                  <Pressable
                    onPress={() => nudgeBezel(0.1)}
                    accessibilityRole="button"
                    accessibilityLabel="More"
                    style={({ pressed }) => [styles.stepperButton, pressed && { opacity: 0.6 }]}
                  >
                    <Ionicons name="add" size={18} color={color.brandDeep} />
                  </Pressable>
                </View>
              </View>
            </Card>

            <Button label="Back to the standard size" tone="quiet" onPress={reset} />
          </ContentColumn>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, padding: size.gutter, gap: size.cardGap },
  stage: {
    flex: 1,
    justifyContent: 'center',
    paddingLeft: space.xs,
  },
  card: {
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: color.brand,
    backgroundColor: color.brandTint,
    justifyContent: 'center',
    paddingLeft: space.md,
    gap: space.sm,
  },
  cardChip: {
    width: 34,
    height: 26,
    borderRadius: 5,
    backgroundColor: color.sun,
    opacity: 0.9,
  },
  cardHint: { fontSize: 13, fontWeight: '600', color: color.brandDeep },
  handle: {
    position: 'absolute',
    right: -size.tap / 2,
    top: '50%',
    marginTop: -size.tap / 2,
    width: size.tap,
    height: size.tap,
    borderRadius: size.tap / 2,
    backgroundColor: color.brand,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  bezelRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: color.surfaceSunken,
    borderRadius: radius.sm,
    padding: 3,
    gap: 2,
  },
  stepperButton: {
    width: size.tap - 6,
    height: size.tap - 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.xs,
    backgroundColor: color.surface,
  },
  stepperValue: { minWidth: 42, textAlign: 'center', fontSize: 15, fontWeight: '700', color: color.text },
});
