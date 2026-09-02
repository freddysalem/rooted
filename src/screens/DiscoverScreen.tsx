import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Card, Chip, ContentColumn, SectionHeader } from '../components/ui';
import { PlantSprite, seedFromString } from '../components/PlantSprite';
import { useGarden } from '../state/GardenContext';
import { Species, harvestableIn, lightLabel, sowableIn } from '../models/species';
import { getSpecies, progressOf, stageOf } from '../models/planting';
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

/// What the month is good for. The whole tab answers one question: if I went outside
/// right now, what should I be doing? Anything it names, you can act on from here.
export function DiscoverScreen() {
  const garden = useGarden();
  const [planting, setPlanting] = useState<Species | null>(null);
  const [plantingBed, setPlantingBed] = useState(false);
  const month = new Date().getMonth() + 1;
  const harvesting = harvestableIn(month);
  const sowing = sowableIn(month);

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
        <Card>
          <View style={{ gap: space.xs }}>
            <Text style={type.label}>This month</Text>
            <Text style={type.title} accessibilityRole="header">{MONTH_NAMES[month - 1]}</Text>
            <Text style={type.bodyMuted}>{MONTH_BLURBS[month]}</Text>
          </View>
        </Card>

        {harvesting.length > 0 ? (
          <Carousel
            title="In season now"
            subtitle="Ready to eat somewhere in Britain this month."
            species={harvesting}
            onChoose={choose}
          />
        ) : null}

        {sowing.length > 0 ? (
          <Carousel
            title={`Sow in ${MONTH_NAMES[month - 1]}`}
            subtitle="Get these in the ground and they will have time to finish. Tap one to plant it."
            species={sowing}
            onChoose={choose}
          />
        ) : null}

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
          </Pressable>
        ))}
      </ScrollView>
    </Card>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: size.gutter, paddingBottom: space.xxxl },
  carousel: { marginHorizontal: -space.lg, marginTop: space.md },
  carouselContent: { paddingHorizontal: space.lg, gap: space.sm },
  tileWrap: { width: 120, gap: 2 },
  tile: {
    width: 120,
    height: 92,
    borderRadius: radius.sm,
    backgroundColor: color.surfaceSunken,
    alignItems: 'center',
    justifyContent: 'flex-end',
    overflow: 'hidden',
    marginBottom: space.xs,
  },
  job: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: color.brand, marginTop: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
});
