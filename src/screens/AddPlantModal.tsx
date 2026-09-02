import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated, KeyboardAvoidingView, LayoutAnimation, Modal, Platform, Pressable, SafeAreaView,
  ScrollView, StyleSheet, Text, UIManager, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, ContentColumn, EmptyState, Input, Pill, SectionHeader, SheetBar } from '../components/ui';
import { PlantSprite } from '../components/PlantSprite';
import { TraitChips } from '../components/TraitChips';
import { useGarden } from '../state/GardenContext';
import {
  CATEGORY_ORDER, SPECIES, Species, categoryLabel, difficultyLabel, lightLabel,
} from '../models/species';
import { color, motion, radius, size, space, type } from '../theme';
import * as haptics from '../services/haptics';
import { useReduceMotion } from '../hooks/useReduceMotion';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/// Choosing what to grow. One list, filed by category, with whatever suits the month
/// you are actually in floated to the top of each section and marked - a seed catalogue
/// in January order is no use to anyone in July.
///
/// Tap a row and it opens in place: name it, read the tip, and press the button at the
/// bottom. Nothing jumps.
export function AddPlantModal({ plot, onClose, initialSpecies = null }: {
  plot: number | null;
  onClose: () => void;
  /** Pre-chosen from Discover or Sun spot. Shown pinned at the top. */
  initialSpecies?: Species | null;
}) {
  const garden = useGarden();
  const [selected, setSelected] = useState<Species | null>(null);
  const [nickname, setNickname] = useState('');
  const [search, setSearch] = useState('');
  const [planted, setPlanted] = useState<Species | null>(null);
  const reduceMotion = useReduceMotion();
  const open = plot !== null;

  useEffect(() => {
    if (open) setSelected(initialSpecies);
  }, [open, initialSpecies?.id]);

  const month = new Date().getMonth() + 1;
  const query = search.trim().toLowerCase();

  const filtered = useMemo(
    () => (query ? SPECIES.filter((s) => s.name.toLowerCase().includes(query)) : SPECIES),
    [query]
  );
  const inSeason = (s: Species) => s.sowMonths.includes(month);

  const pinned = initialSpecies && selected?.id === initialSpecies.id ? initialSpecies : null;

  const sections = CATEGORY_ORDER.map((category) => {
    const rows = filtered
      .filter((s) => s.category === category && s.id !== pinned?.id)
      .sort((a, b) => Number(inSeason(b)) - Number(inSeason(a)));
    return { category, rows };
  }).filter((section) => section.rows.length > 0);

  const animateLayout = () => {
    if (reduceMotion) return;
    LayoutAnimation.configureNext(LayoutAnimation.create(
      motion.standard, LayoutAnimation.Types.easeInEaseOut, LayoutAnimation.Properties.opacity
    ));
  };

  const choose = (species: Species) => {
    haptics.selection();
    animateLayout();
    setSelected((current) => (current?.id === species.id ? null : species));
    setNickname('');
  };

  const reset = () => {
    setSelected(null);
    setNickname('');
    setSearch('');
    setPlanted(null);
  };

  const close = () => {
    reset();
    onClose();
  };

  const confirm = () => {
    if (!selected || plot === null) return;
    garden.plant(selected, nickname, plot);
    setPlanted(selected);
    setTimeout(close, reduceMotion ? 600 : 1300);
  };

  const buttonLabel = selected ? `Plant ${nickname.trim() || selected.name}` : 'Choose a plant';

  return (
    <Modal visible={open} animationType="slide" presentationStyle="pageSheet" onRequestClose={close}>
      <SafeAreaView style={{ flex: 1, backgroundColor: color.canvas }}>
        <SheetBar title="Plant something" onCancel={close} />

        {planted ? (
          <PlantedMoment species={planted} nickname={nickname.trim() || planted.name} />
        ) : (
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView
              contentContainerStyle={styles.scroll}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
            >
              <ContentColumn style={{ gap: size.cardGap }}>
                <Input
                  value={search}
                  onChangeText={setSearch}
                  placeholder="Search plants"
                  clearable
                  autoCorrect={false}
                  returnKeyType="search"
                />

                {pinned ? (
                  <Card padding={space.sm}>
                    <View style={{ paddingHorizontal: space.sm, paddingTop: space.xs, paddingBottom: space.sm }}>
                      <SectionHeader title="Your pick" subtitle="Change your mind below if you like." />
                    </View>
                    <SpeciesRow
                      species={pinned}
                      inSeason={inSeason(pinned)}
                      isSelected
                      nickname={nickname}
                      onNickname={setNickname}
                      onPress={() => choose(pinned)}
                    />
                  </Card>
                ) : null}

                {sections.length === 0 ? (
                  <Card>
                    <EmptyState
                      icon="search"
                      title={`No plants match "${search.trim()}"`}
                      body="Try a shorter word, or clear the search to browse the whole catalogue."
                      action={<Button label="Clear search" tone="quiet" onPress={() => setSearch('')} />}
                    />
                  </Card>
                ) : null}

                {sections.map(({ category, rows }) => (
                  <Card key={category} padding={space.sm}>
                    <View style={{ paddingHorizontal: space.sm, paddingTop: space.xs, paddingBottom: space.sm }}>
                      <SectionHeader
                        title={categoryLabel[category]}
                        subtitle={
                          rows.some(inSeason)
                            ? `${rows.filter(inSeason).length} good to sow in ${MONTH_NAMES[month - 1]}`
                            : `${rows.length} to choose from`
                        }
                      />
                    </View>
                    <View style={{ gap: 2 }}>
                      {rows.map((species) => (
                        <SpeciesRow
                          key={species.id}
                          species={species}
                          inSeason={inSeason(species)}
                          isSelected={selected?.id === species.id}
                          nickname={nickname}
                          onNickname={setNickname}
                          onPress={() => choose(species)}
                        />
                      ))}
                    </View>
                  </Card>
                ))}
              </ContentColumn>
            </ScrollView>

            <View style={styles.footer}>
              <ContentColumn>
                <Button label={buttonLabel} icon={selected ? 'leaf' : undefined} onPress={confirm} disabled={!selected} />
              </ContentColumn>
            </View>
          </KeyboardAvoidingView>
        )}
      </SafeAreaView>
    </Modal>
  );
}

/// A catalogue row. Selected, it opens up to take a name and show the tip.
function SpeciesRow({ species, inSeason, isSelected, nickname, onNickname, onPress }: {
  species: Species;
  inSeason: boolean;
  isSelected: boolean;
  nickname: string;
  onNickname: (text: string) => void;
  onPress: () => void;
}) {
  return (
    <View style={[styles.rowWrap, isSelected && styles.rowWrapSelected]}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${species.name}. ${lightLabel[species.light]}, ${species.daysToHarvest} days${inSeason ? ', good to sow now' : ''}`}
        accessibilityState={{ selected: isSelected, expanded: isSelected }}
        style={({ pressed }) => [styles.row, pressed && !isSelected && { backgroundColor: color.surfaceSunken }]}
      >
        <View style={styles.rowSprite}>
          <PlantSprite family={species.family} progress={0.8} seed={species.id.length} height={44} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, flexWrap: 'wrap' }}>
            <Text style={type.bodyStrong}>{species.name}</Text>
            {inSeason ? <Pill text="In season" tint="brand" /> : null}
          </View>
          <Text style={type.caption} numberOfLines={1}>
            {lightLabel[species.light]} · {species.daysToHarvest} days · {difficultyLabel(species.difficulty)}
          </Text>
        </View>
        <Ionicons
          name={isSelected ? 'checkmark-circle' : 'add-circle-outline'}
          size={24}
          color={isSelected ? color.brand : color.textTertiary}
        />
      </Pressable>

      {isSelected ? (
        <View style={styles.expanded}>
          <Input
            label="Name it (optional)"
            value={nickname}
            onChangeText={onNickname}
            placeholder={species.name}
            maxLength={24}
            autoCapitalize="words"
            returnKeyType="done"
          />
          <Text style={type.caption}>Plants you have named are plants you remember to water.</Text>
          <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
            <Pill text={lightLabel[species.light]} icon="sunny" tint="sun" />
            <Pill text={`${species.daysToHarvest} days to harvest`} icon="calendar" tint="neutral" />
            <Pill text={difficultyLabel(species.difficulty)} icon="speedometer" tint="soil" />
          </View>
          <Text style={type.body}>{species.tip}</Text>
          <TraitChips traits={species.traits} />
        </View>
      ) : null}
    </View>
  );
}

/// The half-second after planting. Enough to register that it happened.
function PlantedMoment({ species, nickname }: { species: Species; nickname: string }) {
  const pop = useRef(new Animated.Value(0)).current;
  const reduceMotion = useReduceMotion();
  useEffect(() => {
    if (reduceMotion) { pop.setValue(1); return; }
    Animated.spring(pop, { toValue: 1, useNativeDriver: true, speed: 16, bounciness: 8 }).start();
  }, []);
  return (
    <View style={styles.planted} accessibilityRole="alert" accessibilityLabel={`${nickname} planted`}>
      <Animated.View style={{ transform: [{ scale: pop }], alignItems: 'center', gap: space.md }}>
        <View style={styles.plantedSprite}>
          <PlantSprite family={species.family} progress={0.15} seed={species.id.length} height={90} />
          <View style={styles.plantedSoil} />
        </View>
        <Text style={type.title}>{nickname} is in the ground</Text>
        <Text style={type.caption}>Water it in, then leave it be.</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: size.gutter, paddingBottom: space.xxl },
  footer: {
    paddingHorizontal: size.gutter,
    paddingTop: space.md,
    paddingBottom: space.md,
    borderTopWidth: 1,
    borderTopColor: color.line,
    backgroundColor: color.surface,
  },
  rowWrap: { borderRadius: radius.sm, overflow: 'hidden' },
  rowWrapSelected: { backgroundColor: color.brandTint },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.sm,
    paddingHorizontal: space.sm,
    minHeight: 60,
    borderRadius: radius.sm,
  },
  rowSprite: {
    width: 48,
    height: 48,
    borderRadius: radius.xs,
    backgroundColor: color.surfaceSunken,
    alignItems: 'center',
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  expanded: { paddingHorizontal: space.md, paddingBottom: space.lg, gap: space.sm },
  planted: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xxxl },
  plantedSprite: {
    width: 140, height: 120, borderRadius: radius.lg, backgroundColor: color.sky + '80',
    alignItems: 'center', justifyContent: 'flex-end', overflow: 'hidden',
  },
  plantedSoil: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 18, backgroundColor: '#8A7561' },
});
