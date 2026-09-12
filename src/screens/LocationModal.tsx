import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, ContentColumn, EmptyState, Input, SheetBar } from '../components/ui';
import { useGarden } from '../state/GardenContext';
import { Place, searchPlaces } from '../services/places';
import { REGIONS, regionForCountry } from '../models/regions';
import { color, radius, size, space, type } from '../theme';
import * as haptics from '../services/haptics';

/// Standing the app somewhere else.
///
/// Rooted reads the phone's own position, which is right for everybody using it and
/// useless on a stage in Bristol when the thing you need to show is a Nairobi plot. So
/// this exists, reachable by holding the weather tile: type a place, and the weather and
/// the crop library both move there until you put it back.
///
/// Deliberately undiscoverable. It is a demo tool, not a feature - a garden that can be
/// anywhere is a garden the watering advice cannot be trusted for.
export function LocationModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const garden = useGarden();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Place[]>([]);
  const [searching, setSearching] = useState(false);
  const run = useRef(0);

  useEffect(() => {
    if (!open) { setQuery(''); setResults([]); }
  }, [open]);

  // One search per pause in typing, and only the newest one is allowed to land.
  useEffect(() => {
    const text = query.trim();
    if (text.length < 2) { setResults([]); setSearching(false); return; }
    const ticket = ++run.current;
    setSearching(true);
    const timer = setTimeout(async () => {
      const found = await searchPlaces(text);
      if (ticket !== run.current) return;
      setResults(found);
      setSearching(false);
    }, 350);
    return () => clearTimeout(timer);
  }, [query]);

  const choose = (place: Place) => {
    haptics.success();
    garden.setDemoPlace(place);
    onClose();
  };

  const useMyLocation = () => {
    haptics.selection();
    garden.setDemoPlace(null);
    onClose();
  };

  return (
    <Modal visible={open} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: color.canvas }}>
        <SheetBar title="Where is this garden?" onCancel={onClose} />
        <FlatList
          data={results}
          keyExtractor={(place) => `${place.label}-${place.latitude}-${place.longitude}`}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            <ContentColumn style={{ gap: size.cardGap, paddingBottom: size.cardGap }}>
              <Card>
                <View style={{ gap: space.sm }}>
                  <Text style={type.bodyStrong}>Reading from</Text>
                  <View style={styles.currentRow}>
                    <Ionicons
                      name={garden.usingDeviceLocation ? 'locate' : 'flag'}
                      size={18}
                      color={color.brandDeep}
                    />
                    <Text style={[type.body, { flex: 1 }]}>{garden.placeLabel}</Text>
                  </View>
                  <Text style={type.caption}>
                    {garden.usingDeviceLocation
                      ? 'This phone’s own position. Weather and crops follow it.'
                      : garden.demoPlace
                        ? `Set by hand for the demo. ${REGIONS[garden.region].label}’s crop library is showing.`
                        : 'No location yet, so Bristol is standing in. Grant location in Sun spot, or pick a place below.'}
                  </Text>
                  {!garden.usingDeviceLocation ? (
                    <Button label="Use my location" icon="locate" tone="quiet" onPress={useMyLocation} />
                  ) : null}
                </View>
              </Card>

              <Input
                value={query}
                onChangeText={setQuery}
                placeholder="Search for a town or city"
                clearable
                autoCorrect={false}
                autoCapitalize="words"
                returnKeyType="search"
              />

              {searching ? (
                <View style={styles.searching}>
                  <ActivityIndicator color={color.brand} />
                </View>
              ) : null}

              {!searching && query.trim().length >= 2 && results.length === 0 ? (
                <Card>
                  <EmptyState
                    icon="search"
                    title={`Nothing found for "${query.trim()}"`}
                    body="Try the nearest larger town, or check the spelling."
                  />
                </Card>
              ) : null}
            </ContentColumn>
          }
          renderItem={({ item }) => {
            const library = regionForCountry(item.countryCode);
            return (
              <ContentColumn>
                <Pressable
                  onPress={() => choose(item)}
                  accessibilityRole="button"
                  accessibilityLabel={`Set the garden to ${item.label}`}
                  style={({ pressed }) => [styles.result, pressed && { backgroundColor: color.surfacePressed }]}
                >
                  <Ionicons name="location-outline" size={20} color={color.textSecondary} />
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={type.bodyStrong}>{item.name}</Text>
                    <Text style={type.caption}>{item.label}</Text>
                  </View>
                  {library ? (
                    <Text style={styles.library}>{REGIONS[library].label}</Text>
                  ) : null}
                </Pressable>
              </ContentColumn>
            );
          }}
        />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingVertical: space.md, gap: 2 },
  currentRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  searching: { paddingVertical: space.md, alignItems: 'center' },
  result: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.md,
    backgroundColor: color.surface,
    borderRadius: radius.sm,
    minHeight: size.tap,
  },
  library: {
    ...type.label,
    color: color.brandDeep,
    backgroundColor: color.brandTint,
    paddingHorizontal: space.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
});
