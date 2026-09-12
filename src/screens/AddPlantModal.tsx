import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated, FlatList, KeyboardAvoidingView, LayoutAnimation, Modal, Platform, Pressable,
  SafeAreaView, StyleSheet, Text, UIManager, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, ContentColumn, EmptyState, Input, Pill, SectionHeader, SheetBar } from '../components/ui';
import { PlantSprite } from '../components/PlantSprite';
import { PlantChoice, PlantChoiceCard } from '../components/PlantChoiceCard';
import { useGarden } from '../state/GardenContext';
import {
  CATEGORY_ORDER, SPECIES, Species, categoryLabel, difficultyLabel, lightLabel, lookOf } from '../models/species';
import { CONTAINERS } from '../services/water';
import { recommendationFor } from '../services/recommend';
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
  // Categories start shut. Twelve open sections is a very long scroll to reach Roots,
  // and the counts on each header are enough to choose from without opening anything.
  const [openCategories, setOpenCategories] = useState<Set<string>>(() => new Set());
  // Asked once, here, because together they decide how much water the reminders tell
  // you to give it - and nobody wants to be asked that on a notification.
  const [choice, setChoice] = useState<PlantChoice>({ containerId: 'bed', indoors: false, surveyId: null });
  const reduceMotion = useReduceMotion();
  const open = plot !== null;

  useEffect(() => {
    if (open) setSelected(initialSpecies);
  }, [open, initialSpecies?.id]);

  // Whatever is chosen, start it on the recommendation rather than on "open ground" -
  // the grower can override it, but the default should be the right answer.
  useEffect(() => {
    if (!selected) return;
    const advice = recommendationFor(selected, garden.region);
    setChoice((current) => ({ ...current, containerId: advice.containerId, indoors: advice.indoors }));
  }, [selected?.id, garden.region]);

  const month = new Date().getMonth() + 1;
  const query = search.trim().toLowerCase();

  const filtered = useMemo(
    () => (query ? SPECIES.filter((s) => s.name.toLowerCase().includes(query)) : SPECIES),
    [query]
  );
  const inSeason = (s: Species) => s.sowMonths.includes(month);

  const pinned = initialSpecies && selected?.id === initialSpecies.id ? initialSpecies : null;

  const sections = useMemo(
    () =>
      CATEGORY_ORDER.map((category) => {
        const rows = filtered
          .filter((s) => s.category === category && s.id !== pinned?.id)
          .sort((a, b) => Number(inSeason(b)) - Number(inSeason(a)));
        return { category, rows };
      }).filter((section) => section.rows.length > 0),
    [filtered, pinned?.id, month]
  );

  const animateLayout = () => {
    if (reduceMotion) return;
    LayoutAnimation.configureNext(LayoutAnimation.create(
      motion.standard, LayoutAnimation.Types.easeInEaseOut, LayoutAnimation.Properties.opacity
    ));
  };

  const toggleCategory = useCallback((category: string) => {
    haptics.selection();
    setOpenCategories((current) => {
      const next = new Set(current);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  }, []);

  // Stable across renders so a memoised row is not invalidated by a fresh closure.
  const choose = useCallback((species: Species) => {
    haptics.selection();
    animateLayout();
    setSelected((current) => (current?.id === species.id ? null : species));
    setNickname('');
  }, [reduceMotion]);

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
    const chosen = CONTAINERS.find((c) => c.id === choice.containerId) ?? CONTAINERS[5];
    garden.plant(selected, nickname, plot, { kind: chosen.kind, litres: chosen.litres }, choice.indoors, choice.surveyId ?? null);
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
            {/* One category per row, so only the sections near the viewport are built.
                The catalogue is 147 plants and every row draws an SVG sprite; mounting
                the lot up front was the whole reason this list stuttered. */}
            <FlatList
              data={sections}
              keyExtractor={(section) => section.category}
              contentContainerStyle={styles.scroll}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              initialNumToRender={2}
              maxToRenderPerBatch={2}
              windowSize={5}
              removeClippedSubviews={Platform.OS === 'android'}
              ItemSeparatorComponent={Separator}
              ListHeaderComponent={
                <ContentColumn style={{ gap: size.cardGap, paddingBottom: size.cardGap }}>
                  <Input
                    value={search}
                    onChangeText={setSearch}
                    placeholder="Search plants"
                    clearable
                    autoCorrect={false}
                    returnKeyType="search"
                  />

                  {pinned ? (
                    <Card>
                      <PlantChoiceCard
                        species={pinned}
                        inSeason={inSeason(pinned)}
                        nickname={nickname}
                        onNickname={setNickname}
                        choice={choice}
                        onChoice={setChoice}
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
                </ContentColumn>
              }
              renderItem={({ item: { category, rows } }) => {
                // A search is its own filter: forcing people to open sections to see what
                // matched would make searching useless.
                const open = openCategories.has(category) || query.length > 0;
                const seasonCount = rows.filter(inSeason).length;
                return (
                  <ContentColumn>
                    <Card padding={space.sm}>
                      <Pressable
                        onPress={() => toggleCategory(category)}
                        accessibilityRole="button"
                        accessibilityState={{ expanded: open }}
                        accessibilityLabel={`${categoryLabel[category]}, ${rows.length} plants`}
                        style={({ pressed }) => [styles.sectionHead, pressed && { backgroundColor: color.surfaceSunken }]}
                      >
                        <View style={{ flex: 1, gap: 2 }}>
                          <Text style={type.bodyStrong}>{categoryLabel[category]}</Text>
                          <Text style={type.caption}>
                            {seasonCount > 0
                              ? `${seasonCount} good to sow in ${MONTH_NAMES[month - 1]} · ${rows.length} in all`
                              : `${rows.length} to choose from`}
                          </Text>
                        </View>
                        {seasonCount > 0 ? <Pill text={`${seasonCount} now`} tint="brand" /> : null}
                        <Ionicons
                          name={open ? 'chevron-up' : 'chevron-down'}
                          size={20}
                          color={color.textTertiary}
                        />
                      </Pressable>

                      {open ? (
                        <View style={{ gap: 2, paddingTop: space.xs }}>
                          {rows.map((species) => {
                            const isSelected = selected?.id === species.id;
                            return (
                              <SpeciesRow
                                key={species.id}
                                species={species}
                                inSeason={inSeason(species)}
                                isSelected={isSelected}
                                nickname={isSelected ? nickname : ''}
                                onNickname={setNickname}
                                onPress={choose}
                                choice={choice}
                                onChoice={setChoice}
                              />
                            );
                          })}
                        </View>
                      ) : null}
                    </Card>
                  </ContentColumn>
                );
              }}
            />

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

const Separator = () => <View style={{ height: size.cardGap }} />;

/// A catalogue row. Selected, it opens up to take a name and show the tip.
///
/// Memoised, and handed the species back through `onPress` rather than a closure, so
/// that typing a nickname re-renders the one open row instead of the whole catalogue.
const SpeciesRow = memo(function SpeciesRow({
  species, inSeason, isSelected, nickname, onNickname, onPress, choice, onChoice,
}: {
  species: Species;
  inSeason: boolean;
  isSelected: boolean;
  nickname: string;
  onNickname: (text: string) => void;
  onPress: (species: Species) => void;
  choice: PlantChoice;
  onChoice: (choice: PlantChoice) => void;
}) {
  const press = useCallback(() => onPress(species), [onPress, species]);
  return (
    <View style={[styles.rowWrap, isSelected && styles.rowWrapSelected]}>
      <Pressable
        onPress={press}
        accessibilityRole="button"
        accessibilityLabel={`${species.name}. ${lightLabel[species.light]}, ${species.daysToHarvest} days${inSeason ? ', good to sow now' : ''}`}
        accessibilityState={{ selected: isSelected, expanded: isSelected }}
        style={({ pressed }) => [styles.row, pressed && !isSelected && { backgroundColor: color.surfaceSunken }]}
      >
        <View style={styles.rowSprite}>
          <PlantSprite look={lookOf(species)} progress={0.8} seed={species.id.length} height={44} />
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
          <PlantChoiceCard
            species={species}
            inSeason={inSeason}
            nickname={nickname}
            onNickname={onNickname}
            choice={choice}
            onChoice={onChoice}
            showHead={false}
          />
        </View>
      ) : null}
    </View>
  );
});

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
          <PlantSprite look={lookOf(species)} progress={0.15} seed={species.id.length} height={90} />
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
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    minHeight: size.tap,
    paddingHorizontal: space.sm,
    paddingVertical: space.xs,
    borderRadius: radius.sm,
  },
  pickCard: { gap: space.md },
  pickHead: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  pickSprite: {
    width: 84,
    height: 84,
    borderRadius: radius.sm,
    backgroundColor: color.sky + '55',
    alignItems: 'center',
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  pickSpriteSoil: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 13, backgroundColor: '#8A7561' },
  pickTitle: { fontSize: 22, lineHeight: 27, fontWeight: '800', color: color.text },
  containerRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  containerChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.sm,
    backgroundColor: color.surfaceSunken,
    minWidth: 104,
  },
  containerChipOn: { backgroundColor: color.brand },
  containerLabel: { fontSize: 14, fontWeight: '700', color: color.text },
  containerDetail: { fontSize: 11, lineHeight: 14, color: color.textTertiary },
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
