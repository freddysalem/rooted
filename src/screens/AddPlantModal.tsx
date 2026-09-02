import React, { useMemo, useState } from 'react';
import {
  Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card, Pill, SectionHeader } from '../components/ui';
import { PlantSprite } from '../components/PlantSprite';
import { useGarden } from '../state/GardenContext';
import {
  CATEGORY_ORDER, SPECIES, Species, categoryLabel, difficultyLabel, familyLabel, lightLabel,
} from '../models/species';
import { Theme } from '../theme';
import * as haptics from '../services/haptics';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/// Choosing what to grow. Sorted so that whatever suits the month you are actually in
/// comes first - a seed catalogue in January order is no use to anyone in July.
export function AddPlantModal({ plot, onClose }: { plot: number | null; onClose: () => void }) {
  const garden = useGarden();
  const [selected, setSelected] = useState<Species | null>(null);
  const [nickname, setNickname] = useState('');
  const [search, setSearch] = useState('');

  const month = new Date().getMonth() + 1;

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return SPECIES;
    return SPECIES.filter((s) => s.name.toLowerCase().includes(query));
  }, [search]);

  const inSeason = filtered.filter((s) => s.sowMonths.includes(month));

  const close = () => {
    setSelected(null);
    setNickname('');
    setSearch('');
    onClose();
  };

  const confirm = () => {
    if (selected && plot !== null) {
      garden.plant(selected, nickname, plot);
      close();
    }
  };

  return (
    <Modal visible={plot !== null} animationType="slide" presentationStyle="pageSheet" onRequestClose={close}>
      <SafeAreaView style={{ flex: 1, backgroundColor: Theme.background }}>
        <View style={styles.bar}>
          <Pressable onPress={close}><Text style={styles.barAction}>Cancel</Text></Pressable>
          <Text style={styles.barTitle}>Plant something</Text>
          <Pressable onPress={confirm} disabled={!selected}>
            <Text style={[styles.barAction, styles.barPrimary, !selected && { opacity: 0.35 }]}>Plant</Text>
          </Pressable>
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search plants"
              placeholderTextColor={Theme.inkSoft}
              style={styles.search}
            />

            {selected ? (
              <Card>
                <View style={{ gap: 10 }}>
                  <SectionHeader
                    title="Name it"
                    subtitle="Plants you have named are plants you remember to water."
                  />
                  <TextInput
                    value={nickname}
                    onChangeText={setNickname}
                    placeholder={selected.name}
                    placeholderTextColor={Theme.inkSoft}
                    style={styles.input}
                  />
                  <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                    <Pill text={lightLabel[selected.light]} icon="sunny" tint={Theme.sun} />
                    <Pill text={`${selected.daysToHarvest} days`} icon="calendar" />
                    <Pill text={difficultyLabel(selected.difficulty)} icon="speedometer" tint={Theme.soil} />
                  </View>
                  <Text style={styles.tip}>{selected.tip}</Text>
                </View>
              </Card>
            ) : null}

            {inSeason.length > 0 ? (
              <Card padding={14}>
                <SectionHeader
                  title="Good to sow now"
                  subtitle={`${MONTH_NAMES[month - 1]} is the right time for these.`}
                />
                <View style={{ gap: 8, marginTop: 12 }}>
                  {inSeason.map((species) => (
                    <SpeciesRow
                      key={species.id}
                      species={species}
                      isSelected={selected?.id === species.id}
                      onPress={() => {
                        haptics.selection();
                        setSelected(species);
                        setNickname('');
                      }}
                    />
                  ))}
                </View>
              </Card>
            ) : null}

            {CATEGORY_ORDER.map((category) => {
              const inCategory = filtered.filter((item) => item.category === category);
              if (inCategory.length === 0) return null;
              return (
                <Card key={category} padding={14}>
                  <SectionHeader
                    title={categoryLabel[category]}
                    subtitle={`${inCategory.length} to choose from`}
                  />
                  <View style={{ gap: 8, marginTop: 12 }}>
                    {inCategory.map((species) => (
                      <SpeciesRow
                        key={species.id}
                        species={species}
                        isSelected={selected?.id === species.id}
                        onPress={() => {
                          haptics.selection();
                          setSelected(species);
                          setNickname('');
                        }}
                      />
                    ))}
                  </View>
                </Card>
              );
            })}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

function SpeciesRow({ species, isSelected, onPress }: {
  species: Species;
  isSelected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.row, isSelected && { backgroundColor: Theme.leafPale + '59' }]}
    >
      <View style={styles.rowSprite}>
        <PlantSprite family={species.family} progress={0.8} seed={species.id.length} height={42} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{species.name}</Text>
        <Text style={styles.rowSubtitle}>
          {familyLabel[species.family]} · {lightLabel[species.light]} · {species.daysToHarvest} days
        </Text>
      </View>
      <Ionicons
        name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
        size={20}
        color={isSelected ? Theme.leaf : Theme.leafPale}
      />
    </Pressable>
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
  barTitle: { fontSize: 16, fontWeight: '700', color: Theme.ink },
  barAction: { fontSize: 15, color: Theme.leafDeep },
  barPrimary: { fontWeight: '700' },
  scroll: { padding: 18, paddingBottom: 40, gap: 14 },
  search: {
    backgroundColor: Theme.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Theme.leafPale,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: Theme.ink,
  },
  input: {
    backgroundColor: Theme.surfaceAlt,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: Theme.ink,
  },
  tip: { fontSize: 13, color: Theme.inkSoft, lineHeight: 19 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 8,
    borderRadius: 12,
  },
  rowSprite: {
    width: 46,
    height: 46,
    borderRadius: 8,
    backgroundColor: Theme.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  rowTitle: { fontSize: 15, fontWeight: '600', color: Theme.ink },
  rowSubtitle: { fontSize: 12, color: Theme.inkSoft, marginTop: 2 },
});
