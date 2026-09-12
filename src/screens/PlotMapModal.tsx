import React from 'react';
import { Dimensions, Modal, Platform, Pressable, StatusBar, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { IsoPlot } from '../components/IsoPlot';
import { useGarden } from '../state/GardenContext';
import { Planting } from '../models/planting';
import { petsUpTo } from '../models/progress';
import { color, radius, size, space, type } from '../theme';
import * as haptics from '../services/haptics';

/// The plot as ground you look across rather than a list you scroll.
///
/// This used to be the home screen and was cut back to rows of beds, which is the right
/// home screen - it is quick, it lists, and it never loses a plant behind a shed. But the
/// map is the part that makes a plot feel like a place, so it lives here: one tap from
/// the picture of your garden, drag and pinch to move around it, and press any plant to
/// open the same sheet as everywhere else.

/// How far down the controls have to start to clear the clock and the battery.
///
/// A full-screen Modal covers the status bar, and React Native's own SafeAreaView does
/// not inset inside one - which put the close button underneath the battery, where it
/// could not be pressed. Measured rather than guessed: tall iPhones have a notch or an
/// island, the shorter ones a 20pt bar.
const TOP_INSET = (() => {
  if (Platform.OS === 'android') return (StatusBar.currentHeight ?? 24) + 8;
  const { height, width } = Dimensions.get('window');
  const longest = Math.max(height, width);
  return longest >= 812 ? 60 : 28;
})();

export function PlotMapModal({ open, onClose, onOpenPlant, onPlantEmpty }: {
  open: boolean;
  onClose: () => void;
  onOpenPlant: (planting: Planting) => void;
  onPlantEmpty: (plot: number) => void;
}) {
  const garden = useGarden();
  const pets = React.useMemo(() => petsUpTo(garden.level.level), [garden.level.level]);

  return (
    <Modal visible={open} animationType="slide" onRequestClose={onClose} presentationStyle="fullScreen">
      <View style={styles.root}>
        <View style={{ flex: 1 }}>
          <IsoPlot
            plantings={garden.plantings}
            isThirsty={garden.needsWater}
            onOpenPlant={onOpenPlant}
            onPlantEmpty={onPlantEmpty}
            homeTier={garden.level.home}
            homeColour={garden.homeColour}
            pets={pets}
          />
        </View>

        <View style={styles.titleBar} pointerEvents="box-none">
          <View style={styles.title}>
            <Text style={type.captionStrong}>{garden.level.homeName}</Text>
            <Text style={type.caption}>
              {garden.plantings.length} {garden.plantings.length === 1 ? 'plant' : 'plants'} · drag to move, pinch to zoom
            </Text>
          </View>

          <Pressable
            onPress={() => { haptics.selection(); onClose(); }}
            accessibilityRole="button"
            accessibilityLabel="Close the plot map"
            hitSlop={10}
            style={({ pressed }) => [styles.close, pressed && { backgroundColor: color.surfacePressed }]}
          >
            <Ionicons name="close" size={22} color={color.text} />
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.canvas },
  titleBar: {
    position: 'absolute',
    top: TOP_INSET,
    left: size.gutter,
    right: size.gutter,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.md,
  },
  title: {
    gap: 2,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: radius.sm,
    backgroundColor: '#FFFFFFD8',
  },
  close: {
    marginLeft: 'auto',
    width: size.tap,
    height: size.tap,
    borderRadius: size.tap / 2,
    backgroundColor: color.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
