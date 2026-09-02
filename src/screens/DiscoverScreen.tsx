import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card, Chip, ContentColumn, Pill, SectionHeader } from '../components/ui';
import { PlantSprite, seedFromString } from '../components/PlantSprite';
import { TraitChips } from '../components/TraitChips';
import { useGarden } from '../state/GardenContext';
import { Species, harvestableIn, lightLabel, sowableIn, speciesById } from '../models/species';
import { getSpecies, progressOf, stageOf } from '../models/planting';
import { REGIONS, REGION_ORDER } from '../models/regions';
import { DishMatch, dishSpeciesNames, dishTagLabel, dishesForGarden, starterCombos } from '../models/dishes';
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
  const month = new Date().getMonth() + 1;
  const region = REGIONS[garden.region];
  const harvesting = harvestableIn(month);
  const sowing = sowableIn(month);
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

  return (
    <ScrollView style={{ backgroundColor: color.canvas }} contentContainerStyle={styles.scroll}>
      <ContentColumn style={{ gap: size.cardGap }}>
        <View style={styles.regionRow} accessibilityRole="radiogroup" accessibilityLabel="Region">
          {REGION_ORDER.map((id) => {
            const on = garden.region === id;
            return (
              <Pressable
                key={id}
                onPress={() => { haptics.selection(); garden.setRegion(id); }}
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
                style={({ pressed }) => [styles.regionItem, on && styles.regionOn, pressed && !on && { backgroundColor: color.surfacePressed }]}
              >
                <Ionicons name="location-outline" size={14} color={on ? color.textOnBrand : color.textSecondary} />
                <Text style={[styles.regionLabel, on && styles.regionLabelOn]}>{REGIONS[id].label}</Text>
              </Pressable>
            );
          })}
        </View>

        <Card>
          <View style={{ gap: space.xs }}>
            <Text style={type.label}>This month in {region.label}</Text>
            <Text style={type.title} accessibilityRole="header">{MONTH_NAMES[month - 1]}</Text>
            <Text style={type.bodyMuted}>{garden.region === 'uk' ? MONTH_BLURBS[month] : region.note}</Text>
          </View>
        </Card>

        {harvesting.length > 0 ? (
          <Carousel title="In season now" subtitle="Ready to eat somewhere near you this month." species={harvesting} onChoose={choose} />
        ) : null}

        {sowing.length > 0 ? (
          <Carousel
            title={`Sow in ${MONTH_NAMES[month - 1]}`}
            subtitle="Get these in the ground and they will have time to finish. Tap one to plant it."
            species={sowing}
            onChoose={choose}
          />
        ) : null}

        <Carousel
          title={`Native to ${region.label}`}
          subtitle="Grown here long before the supermarket. Suited to the soil and the weather."
          species={region.nativeSpeciesIds.map(speciesById)}
          onChoose={choose}
        />

        <Card>
          <SectionHeader title="At risk, worth growing" subtitle="Disappearing from plots and plates. Every bed that grows one keeps it going." />
          <View style={{ gap: space.sm, marginTop: space.md }}>
            {region.atRisk.map(({ speciesId, why }) => {
              const species = speciesById(speciesId);
              return (
                <Pressable
                  key={speciesId}
                  onPress={() => choose(species)}
                  accessibilityRole="button"
                  accessibilityLabel={`Plant ${species.name}. ${why}`}
                  style={({ pressed }) => [styles.riskRow, pressed && { backgroundColor: color.surfacePressed }]}
                >
                  <View style={styles.riskSprite}>
                    <PlantSprite family={species.family} progress={0.85} seed={seedFromString(species.id)} height={44} />
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, flexWrap: 'wrap' }}>
                      <Text style={type.bodyStrong}>{species.name}</Text>
                      <Pill text="At risk" icon="alert-circle-outline" tint="danger" />
                    </View>
                    <Text style={type.caption}>{why}</Text>
                    <TraitChips traits={species.traits} max={3} />
                  </View>
                  <Ionicons name="add-circle-outline" size={24} color={color.textTertiary} />
                </Pressable>
              );
            })}
          </View>
        </Card>

        <Card>
          <SectionHeader
            title="Cook what you've grown"
            subtitle={dishes.length ? 'Dishes your plot can already supply, most complete first.' : 'Grow these together and you have a dish, not just a crop.'}
          />
          <View style={{ gap: space.sm, marginTop: space.md }}>
            {dishes.length
              ? dishes.map((match) => <DishRow key={match.dish.id} match={match} onSow={choose} />)
              : starterCombos.map(({ dish, growThese }) => (
                  <View key={dish.id} style={styles.dish}>
                    <Text style={type.bodyStrong}>{dish.name}</Text>
                    <Text style={type.caption}>{dish.blurb}</Text>
                    <Text style={[type.caption, { color: color.brandDeep }]}>
                      Grow {dishSpeciesNames(growThese).join(', ')}.
                    </Text>
                    <View style={styles.chips}>
                      {growThese.map((id) => (
                        <Chip key={id} text={`Sow ${speciesById(id).name}`} icon="add" onPress={() => choose(speciesById(id))} />
                      ))}
                    </View>
                  </View>
                ))}
          </View>
        </Card>

        <Card>
          <View style={{ gap: space.md }}>
            <SectionHeader title="This week" subtitle="Small jobs that pay off later." />
            {jobs.map((job, index) => (
              <View key={index} style={styles.job}>
                <View style={styles.dot} />
                <View style={{ flex: 1, gap: space.sm }}>
                  <Text style={type.body}>{job.text}</Text>
                  {job.action}
                </View>
              </View>
            ))}
          </View>
        </Card>
      </ContentColumn>

      <AddPlantModal
        plot={planting || plantingBed ? garden.firstEmptyPlot : null}
        initialSpecies={planting}
        onClose={() => { setPlanting(null); setPlantingBed(false); }}
      />
    </ScrollView>
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

function Carousel({ title, subtitle, species, onChoose }: {
  title: string;
  subtitle: string;
  species: Species[];
  onChoose: (species: Species) => void;
}) {
  return (
    <Card>
      <SectionHeader title={title} subtitle={subtitle} />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.carousel}
        contentContainerStyle={styles.carouselContent}
      >
        {species.map((item) => (
          <Pressable
            key={item.id}
            onPress={() => onChoose(item)}
            accessibilityRole="button"
            accessibilityLabel={`Plant ${item.name}. ${lightLabel[item.light]}`}
            style={({ pressed }) => [styles.tileWrap, pressed && { transform: [{ scale: 0.96 }] }]}
          >
            <View style={styles.tile}>
              <PlantSprite family={item.family} progress={0.9} seed={seedFromString(item.id)} height={78} />
            </View>
            <Text style={type.bodyStrong} numberOfLines={1}>{item.name}</Text>
            <Text style={type.caption} numberOfLines={1}>{lightLabel[item.light]}</Text>
            <TraitChips traits={item.traits} max={2} compact />
          </Pressable>
        ))}
      </ScrollView>
    </Card>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: size.gutter, paddingBottom: space.xxxl },
  regionRow: { flexDirection: 'row', backgroundColor: color.surfaceSunken, borderRadius: radius.sm, padding: 3, gap: 2 },
  regionItem: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    minHeight: size.tap, borderRadius: radius.xs + 1,
  },
  regionOn: { backgroundColor: color.brand },
  regionLabel: { fontSize: 14, fontWeight: '600', color: color.textSecondary },
  regionLabelOn: { color: color.textOnBrand },
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
