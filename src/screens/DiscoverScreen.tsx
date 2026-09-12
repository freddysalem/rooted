import React, { memo, useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card, Chip, ContentColumn, Pill } from '../components/ui';
import { PlantSprite, seedFromString } from '../components/PlantSprite';
import { TraitChips } from '../components/TraitChips';
import { Community } from '../components/Community';
import { useGarden } from '../state/GardenContext';
import { Species, harvestableIn, lightLabel, sowableIn, speciesById, lookOf } from '../models/species';
import { getSpecies, progressOf, stageOf } from '../models/planting';
import { REGIONS, Region, RegionId, growsInRegion } from '../models/regions';
import { DishMatch, dishSpeciesNames, dishTagLabel, dishesForGarden, starterCombos } from '../models/dishes';
import { CORRECTIONS_MADE, REVIEWED_ON, REVIEW_CAVEAT, SOURCES, SPECIES_REVIEWED } from '../models/sources';
import { color, radius, size, space, type } from '../theme';
import * as haptics from '../services/haptics';
import { AddPlantModal } from './AddPlantModal';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const MONTH_BLURBS: Record<number, string> = {
  1: 'The quiet month. Order seed, chit potatoes on a windowsill, and let the frost break up the soil for you.',
  2: 'Things stir. Sow the first broad beans and get the beds cleared before everything happens at once.',
  3: 'The season opens. Almost everything can be started now, indoors if not out.',
  4: 'The busiest sowing month of the year. Watch for a late frost - it catches people every spring.',
  5: 'Plant out the tender things once the frosts are properly done. Water new transplants daily for a week.',
  6: 'Everything is growing at once. Keep on top of the weeding now and the rest of the summer is easy.',
  7: 'Peak watering. Early morning is worth twice what the same water is worth at midday.',
  8: 'Harvest and keep harvesting - courgettes and beans stop producing the moment you let them go over.',
  9: 'The soft landing. Sow overwintering greens and plant garlic at the end of the month.',
  10: 'Clear the spent beds, but leave some seed heads standing for the birds.',
  11: 'Mulch what is left and let the worms do the digging for you over winter.',
  12: 'Kale, leeks and patience. Plan next year while this one is still fresh in your mind.',
};

/// What the month is good for, where you are. The whole tab answers one question: if I
/// went outside right now, what should I be doing? Anything it names, you can act on.
export function DiscoverScreen() {
  const garden = useGarden();
  const [planting, setPlanting] = useState<Species | null>(null);
  const [plantingBed, setPlantingBed] = useState(false);
  const [openSection, setOpenSection] = useState<SectionId | null>(null);
  const month = new Date().getMonth() + 1;
  const region = REGIONS[garden.region];
  // Only what is worth growing where this garden is. A British plot has no business
  // being told to sow managu, and a Nairobi one should not be waiting on a British
  // spring - the region comes from the phone's own location, not a toggle.
  const here = useCallback((s: Species) => growsInRegion(s.id, garden.region), [garden.region]);
  const harvesting = useMemo(() => harvestableIn(month).filter(here), [month, here]);
  const sowing = useMemo(() => sowableIn(month).filter(here), [month, here]);
  const grown = garden.plantings.map((p) => p.speciesID);
  const dishes = dishesForGarden(grown).slice(0, 5);

  const choose = (species: Species) => {
    haptics.selection();
    setPlanting(species);
  };

  /// Seasonal jobs, and the ones your own plot is asking for.
  const jobs: { text: string; action?: React.ReactNode }[] = [];
  if (garden.thirsty.length > 0) {
    jobs.push({
      text: garden.thirsty.length === 1
        ? 'One plant is due a water.'
        : `${garden.thirsty.length} plants are due a water.`,
      action: (
        <View style={styles.chips}>
          {garden.thirsty.slice(0, 4).map((p) => (
            <Chip key={p.id} text={`Water ${p.nickname}`} icon="water" tint="water" onPress={() => garden.water(p)} />
          ))}
        </View>
      ),
    });
  }
  if (garden.plantings.some((p) => stageOf(p) === 'ready')) {
    jobs.push({ text: 'Something is ready to harvest - pick it before it goes over.' });
  }
  if (garden.plantings.some((p) => getSpecies(p).family === 'fruiting' && progressOf(p) > 0.5)) {
    jobs.push({ text: 'Pinch out side shoots on the fruiting plants.' });
  }
  if (month >= 3 && month <= 5) jobs.push({ text: 'Check for slugs after rain, in the evening - that is when they are out.' });
  else if (month >= 6 && month <= 8) jobs.push({ text: 'Feed the fruiting plants once a week now they are flowering.' });
  else if (month >= 9 && month <= 10) jobs.push({ text: 'Collect seed from anything that did well this year.' });
  else jobs.push({ text: 'Turn the compost heap. It will be half the size by spring.' });
  if (garden.firstEmptyPlot !== null) {
    jobs.push({
      text: 'You have a spare bed. Something quick like radish will fill it in a month.',
      action: (
        <View style={styles.chips}>
          <Chip text="Plant something" icon="add" onPress={() => { haptics.selection(); setPlantingBed(true); }} />
        </View>
      ),
    });
  }

  const data: SectionData = {
    month, region, harvesting, sowing, dishes, jobs, choose,
    regionId: garden.region,
    plantSomething: () => { haptics.selection(); setPlantingBed(true); },
  };

  return (
    <ScrollView style={{ backgroundColor: color.canvas }} contentContainerStyle={styles.scroll}>
      <ContentColumn style={{ gap: size.cardGap }}>
        <Card>
          <View style={{ gap: space.xs }}>
            <Text style={type.label}>This month in {garden.placeLabel}</Text>
            <Text style={type.title} accessibilityRole="header">{MONTH_NAMES[month - 1]}</Text>
            <Text style={type.bodyMuted}>{garden.region === 'uk' ? MONTH_BLURBS[month] : region.note}</Text>
            {garden.regionIsGuess ? (
              <Text style={type.caption}>
                No crop library for {garden.placeLabel} yet, so this is {region.label}'s - the
                closest one we have written.
              </Text>
            ) : null}
          </View>
        </Card>

        {/* One open at a time. Collapsed, every heading in the screen fits without
            scrolling, which is the whole point: this is a menu of things to look at,
            not a column to wade through. */}
        {SECTIONS.filter((section) => section.count(data) > 0).map((section) => (
          <Panel
            key={section.id}
            title={section.title(data)}
            count={section.count(data)}
            countLabel={section.countLabel}
            icon={section.icon}
            open={openSection === section.id}
            onToggle={() => {
              haptics.selection();
              setOpenSection((current) => (current === section.id ? null : section.id));
            }}
          >
            {section.render(data)}
          </Panel>
        ))}
      </ContentColumn>

      <AddPlantModal
        plot={planting || plantingBed ? garden.firstEmptyPlot : null}
        initialSpecies={planting}
        onClose={() => { setPlanting(null); setPlantingBed(false); }}
      />
    </ScrollView>
  );
}

// --- the sections, as data -------------------------------------------------

type SectionId = 'season' | 'sow' | 'native' | 'risk' | 'cook' | 'growers' | 'week' | 'sources';

interface SectionData {
  month: number;
  regionId: RegionId;
  region: Region;
  harvesting: Species[];
  sowing: Species[];
  dishes: DishMatch[];
  jobs: { text: string; action?: React.ReactNode }[];
  choose: (species: Species) => void;
  plantSomething: () => void;
}

interface Section {
  id: SectionId;
  icon: keyof typeof Ionicons.glyphMap;
  title: (d: SectionData) => string;
  /** Shown on the closed row, and a zero hides the section entirely. */
  count: (d: SectionData) => number;
  countLabel?: string;
  render: (d: SectionData) => React.ReactNode;
}

const SECTIONS: Section[] = [
  {
    id: 'season',
    icon: 'restaurant-outline',
    title: () => 'In season now',
    count: (d) => d.harvesting.length,
    render: (d) => (
      <Strip
        subtitle="Ready to eat somewhere near you this month."
        species={d.harvesting}
        onChoose={d.choose}
      />
    ),
  },
  {
    id: 'sow',
    icon: 'leaf-outline',
    title: (d) => `Sow in ${MONTH_NAMES[d.month - 1]}`,
    count: (d) => d.sowing.length,
    render: (d) => (
      <Strip
        subtitle="Get these in the ground and they will have time to finish. Tap one to plant it."
        species={d.sowing}
        onChoose={d.choose}
      />
    ),
  },
  {
    id: 'native',
    icon: 'flag-outline',
    title: (d) => `Native to ${d.region.label}`,
    count: (d) => d.region.nativeSpeciesIds.length,
    render: (d) => (
      <Strip
        subtitle="Grown here long before the supermarket. Suited to the soil and the weather."
        species={d.region.nativeSpeciesIds.map(speciesById)}
        onChoose={d.choose}
      />
    ),
  },
  {
    id: 'risk',
    icon: 'alert-circle-outline',
    title: () => 'At risk, worth growing',
    count: (d) => d.region.atRisk.length,
    render: (d) => (
      <View style={{ gap: space.sm }}>
        <Text style={type.caption}>
          Disappearing from plots and plates. Every bed that grows one keeps it going.
        </Text>
        {d.region.atRisk.map(({ speciesId, why }) => {
          const species = speciesById(speciesId);
          return (
            <Pressable
              key={speciesId}
              onPress={() => d.choose(species)}
              accessibilityRole="button"
              accessibilityLabel={`Plant ${species.name}. ${why}`}
              style={({ pressed }) => [styles.riskRow, pressed && { backgroundColor: color.surfacePressed }]}
            >
              <View style={styles.riskSprite}>
                <PlantSprite look={lookOf(species)} progress={0.85} seed={seedFromString(species.id)} height={44} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, flexWrap: 'wrap' }}>
                  <Text style={type.bodyStrong}>{species.name}</Text>
                  <Pill text="At risk" icon="alert-circle-outline" tint="danger" />
                </View>
                <Text style={type.caption}>{why}</Text>
                <TraitChips traits={species.traits} />
              </View>
              <Ionicons name="add-circle-outline" size={24} color={color.textTertiary} />
            </Pressable>
          );
        })}
      </View>
    ),
  },
  {
    id: 'cook',
    icon: 'nutrition-outline',
    title: () => "Cook what you've grown",
    count: (d) => (d.dishes.length ? d.dishes.length : starterCombos.length),
    countLabel: 'dishes',
    render: (d) => (
      <View style={{ gap: space.sm }}>
        <Text style={type.caption}>
          {d.dishes.length
            ? 'Dishes your plot can already supply, most complete first.'
            : 'Grow these together and you have a dish, not just a crop.'}
        </Text>
        {d.dishes.length
          ? d.dishes.map((match) => <DishRow key={match.dish.id} match={match} onSow={d.choose} />)
          : starterCombos.map(({ dish, growThese }) => (
              <View key={dish.id} style={styles.dish}>
                <Text style={type.bodyStrong}>{dish.name}</Text>
                <Text style={type.caption}>{dish.blurb}</Text>
                <Text style={[type.caption, { color: color.brandDeep }]}>
                  Grow {dishSpeciesNames(growThese).join(', ')}.
                </Text>
                <View style={styles.chips}>
                  {growThese.map((id) => (
                    <Chip key={id} text={`Sow ${speciesById(id).name}`} icon="add" onPress={() => d.choose(speciesById(id))} />
                  ))}
                </View>
              </View>
            ))}
      </View>
    ),
  },
  {
    id: 'growers',
    icon: 'people-outline',
    title: () => 'From other growers',
    count: () => 1,
    countLabel: '',
    render: (d) => <Community region={d.regionId} month={d.month} bare />,
  },
  {
    id: 'week',
    icon: 'calendar-outline',
    title: () => 'This week',
    count: (d) => d.jobs.length,
    countLabel: 'jobs',
    render: (d) => (
      <View style={{ gap: space.md }}>
        <Text style={type.caption}>Small jobs that pay off later.</Text>
        {d.jobs.map((job, index) => (
          <View key={index} style={styles.job}>
            <View style={styles.dot} />
            <View style={{ flex: 1, gap: space.sm }}>
              <Text style={type.body}>{job.text}</Text>
              {job.action}
            </View>
          </View>
        ))}
      </View>
    ),
  },
  {
    id: 'sources',
    icon: 'document-text-outline',
    title: () => 'Where this comes from',
    count: () => 1,
    countLabel: '',
    render: () => <SourceNote />,
  },
];

/// One collapsible section. Closed it is a single row - a name, an icon and how many
/// things are inside. Open it shows its contents and everything else stays closed.
function Panel({ title, count, countLabel, icon, open, onToggle, children }: {
  title: string;
  count: number;
  countLabel?: string;
  icon: keyof typeof Ionicons.glyphMap;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <Card padding={space.sm}>
      <Pressable
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`${title}${countLabel === '' ? '' : `, ${count} ${countLabel ?? 'plants'}`}`}
        style={({ pressed }) => [styles.panelHead, pressed && { backgroundColor: color.surfaceSunken }]}
      >
        <Ionicons name={icon} size={18} color={open ? color.brandDeep : color.textSecondary} />
        <Text style={[type.bodyStrong, { flex: 1 }, open && { color: color.brandDeep }]} numberOfLines={1}>
          {title}
        </Text>
        {countLabel === '' ? null : <Pill text={String(count)} tint={open ? 'brand' : 'neutral'} />}
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={color.textTertiary} />
      </Pressable>
      {open ? <View style={{ paddingTop: space.sm }}>{children}</View> : null}
    </Card>
  );
}

/// The horizontal shelf of plants, unchanged - it is what the sections open into.
function Strip({ subtitle, species, onChoose }: {
  subtitle: string;
  species: Species[];
  onChoose: (species: Species) => void;
}) {
  return (
    <View style={{ gap: space.sm }}>
      <Text style={type.caption}>{subtitle}</Text>
      <FlatList
        horizontal
        data={species}
        keyExtractor={(item) => item.id}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: space.sm, paddingVertical: 2 }}
        initialNumToRender={4}
        windowSize={3}
        renderItem={({ item }) => <CarouselTile species={item} onChoose={onChoose} />}
      />
    </View>
  );
}

/// Where the numbers come from. Last thing on the screen, because nobody opens an app to
/// read a bibliography - but it is in the app rather than in a slide, because the app is
/// what gives the advice.
function SourceNote() {
  const [open, setOpen] = useState(false);

  return (
    <Card>
      <View style={{ gap: space.sm }}>
        <Text style={type.label}>Where this comes from</Text>
        <Text style={type.body}>
          All {SPECIES_REVIEWED} plants in the library were reviewed on {REVIEWED_ON} against
          published horticultural sources, and {CORRECTIONS_MADE} records were corrected.
        </Text>

        <Pressable
          onPress={() => { haptics.selection(); setOpen((current) => !current); }}
          accessibilityRole="button"
          accessibilityState={{ expanded: open }}
          accessibilityLabel={open ? 'Hide the sources' : 'Show the sources'}
          style={({ pressed }) => [styles.sourceToggle, pressed && { backgroundColor: color.surfacePressed }]}
        >
          <Text style={[type.captionStrong, { color: color.brandDeep }]}>
            {open ? 'Hide the sources' : `Show all ${SOURCES.length} sources`}
          </Text>
          <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color={color.brandDeep} />
        </Pressable>

        {open ? (
          <View style={{ gap: space.sm }}>
            {SOURCES.map((source) => (
              <View key={source.url} style={{ gap: 2 }}>
                <Text style={type.captionStrong}>{source.name}</Text>
                <Text style={type.caption}>{source.usedFor}</Text>
                <Text style={[type.caption, { color: color.textTertiary }]}>{source.url}</Text>
              </View>
            ))}
            <Text style={[type.caption, { color: color.textTertiary }]}>{REVIEW_CAVEAT}</Text>
            <Text style={[type.caption, { color: color.textTertiary }]}>
              Weather from Open-Meteo (open-meteo.com), free for non-commercial use.
            </Text>
          </View>
        ) : null}
      </View>
    </Card>
  );
}

function DishRow({ match, onSow }: { match: DishMatch; onSow: (species: Species) => void }) {
  const { dish, growing, missing } = match;
  const complete = missing.length === 0;
  return (
    <View style={styles.dish}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, flexWrap: 'wrap' }}>
        <Text style={[type.bodyStrong, { flex: 1 }]}>{dish.name}</Text>
        {dish.tags.slice(0, 2).map((tag) => <Pill key={tag} text={dishTagLabel[tag]} tint="neutral" />)}
      </View>
      <Text style={type.caption}>{dish.blurb}</Text>
      <Text style={[type.caption, { color: complete ? color.brandDeep : color.text }]}>
        {complete
          ? `You grow all ${dish.speciesIds.length} ingredients. Go and pick them.`
          : `You grow ${growing.length} of ${dish.speciesIds.length} ingredients. Sow ${dishSpeciesNames(missing).join(' and ')} to complete it.`}
      </Text>
      {!complete ? (
        <View style={styles.chips}>
          {missing.slice(0, 3).map((id) => (
            <Chip key={id} text={`Sow ${speciesById(id).name}`} icon="add" onPress={() => onSow(speciesById(id))} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const CarouselTile = memo(function CarouselTile({ species, onChoose }: {
  species: Species;
  onChoose: (species: Species) => void;
}) {
  const press = useCallback(() => onChoose(species), [onChoose, species]);
  return (
    <Pressable
      onPress={press}
      accessibilityRole="button"
      accessibilityLabel={`Plant ${species.name}. ${lightLabel[species.light]}`}
      style={({ pressed }) => [styles.tileWrap, pressed && { transform: [{ scale: 0.96 }] }]}
    >
      <View style={styles.tile}>
        <PlantSprite look={lookOf(species)} progress={0.9} seed={seedFromString(species.id)} height={78} />
      </View>
      <Text style={type.bodyStrong} numberOfLines={1}>{species.name}</Text>
      <Text style={type.caption} numberOfLines={1}>{lightLabel[species.light]}</Text>
      <TraitChips traits={species.traits} compact />
    </Pressable>
  );
});

const styles = StyleSheet.create({
  panelHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingVertical: space.sm,
    paddingHorizontal: space.sm,
    borderRadius: radius.sm,
    minHeight: size.tap,
  },
  sourceToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingVertical: space.xs,
    paddingHorizontal: space.sm,
    borderRadius: radius.sm,
  },
  scroll: { padding: size.gutter, paddingBottom: space.xxxl },
  carousel: { marginHorizontal: -space.lg, marginTop: space.md },
  carouselContent: { paddingHorizontal: space.lg, gap: space.sm },
  tileWrap: { width: 132, gap: 2 },
  tile: {
    width: 132,
    height: 92,
    borderRadius: radius.sm,
    backgroundColor: color.surfaceSunken,
    alignItems: 'center',
    justifyContent: 'flex-end',
    overflow: 'hidden',
    marginBottom: space.xs,
  },
  riskRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.sm, borderRadius: radius.sm },
  riskSprite: {
    width: 48, height: 48, borderRadius: radius.xs, backgroundColor: color.surfaceSunken,
    alignItems: 'center', justifyContent: 'flex-end', overflow: 'hidden',
  },
  dish: { gap: space.xs, padding: space.md, borderRadius: radius.sm, backgroundColor: color.surfaceSunken },
  job: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: color.brand, marginTop: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
});
