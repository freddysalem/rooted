import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Card, SectionHeader } from '../components/ui';
import { PlantSprite } from '../components/PlantSprite';
import { useGarden } from '../state/GardenContext';
import { Species, harvestableIn, lightLabel, sowableIn } from '../models/species';
import { getSpecies, progressOf, stageOf } from '../models/planting';
import { Theme } from '../theme';

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
/// right now, what should I be doing?
export function DiscoverScreen() {
  const garden = useGarden();
  const month = new Date().getMonth() + 1;
  const harvesting = harvestableIn(month);
  const sowing = sowableIn(month);

  /// Seasonal jobs, and the ones your own plot is asking for.
  const jobs: string[] = [];
  if (garden.thirsty.length > 0) {
    jobs.push(
      garden.thirsty.length === 1
        ? 'One plant is due a water.'
        : `${garden.thirsty.length} plants are due a water.`
    );
  }
  if (garden.plantings.some((p) => stageOf(p) === 'ready')) {
    jobs.push('Something is ready to harvest - pick it before it goes over.');
  }
  if (garden.plantings.some((p) => getSpecies(p).family === 'fruiting' && progressOf(p) > 0.5)) {
    jobs.push('Pinch out side shoots on the fruiting plants.');
  }
  if (month >= 3 && month <= 5) jobs.push('Check for slugs after rain, in the evening - that is when they are out.');
  else if (month >= 6 && month <= 8) jobs.push('Feed the fruiting plants once a week now they are flowering.');
  else if (month >= 9 && month <= 10) jobs.push('Collect seed from anything that did well this year.');
  else jobs.push('Turn the compost heap. It will be half the size by spring.');
  if (garden.firstEmptyPlot !== null) {
    jobs.push('You have a spare bed. Something quick like radish will fill it in a month.');
  }

  return (
    <ScrollView style={{ backgroundColor: Theme.background }} contentContainerStyle={styles.scroll}>
      <Card>
        <View style={{ gap: 6 }}>
          <Text style={styles.month}>{MONTH_NAMES[month - 1]}</Text>
          <Text style={styles.subtle}>{MONTH_BLURBS[month]}</Text>
        </View>
      </Card>

      {harvesting.length > 0 ? (
        <Carousel
          title="In season now"
          subtitle="Ready to eat somewhere in Britain this month."
          species={harvesting}
        />
      ) : null}

      {sowing.length > 0 ? (
        <Carousel
          title={`Sow in ${MONTH_NAMES[month - 1]}`}
          subtitle="Get these in the ground and they will have time to finish."
          species={sowing}
        />
      ) : null}

      <Card>
        <View style={{ gap: 10 }}>
          <SectionHeader title="This week" subtitle="Small jobs that pay off later." />
          {jobs.map((job, index) => (
            <View key={index} style={styles.job}>
              <View style={styles.dot} />
              <Text style={styles.jobText}>{job}</Text>
            </View>
          ))}
        </View>
      </Card>
    </ScrollView>
  );
}

function Carousel({ title, subtitle, species }: {
  title: string;
  subtitle: string;
  species: Species[];
}) {
  return (
    <Card padding={14}>
      <SectionHeader title={title} subtitle={subtitle} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }}>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {species.map((item) => (
            <View key={item.id} style={{ width: 120 }}>
              <View style={styles.tile}>
                <PlantSprite family={item.family} progress={0.9} seed={item.id.length} height={78} />
              </View>
              <Text style={styles.tileName}>{item.name}</Text>
              <Text style={styles.tileSub}>{lightLabel[item.light]}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </Card>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 18, paddingBottom: 40, gap: 14 },
  month: { fontSize: 26, fontWeight: '700', color: Theme.ink },
  subtle: { fontSize: 14, color: Theme.inkSoft, lineHeight: 20 },
  tile: {
    width: 120,
    height: 92,
    borderRadius: 12,
    backgroundColor: Theme.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  tileName: { fontSize: 14, fontWeight: '600', color: Theme.ink, marginTop: 8 },
  tileSub: { fontSize: 11, color: Theme.inkSoft, marginTop: 2 },
  job: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Theme.leafLight, marginTop: 7 },
  jobText: { flex: 1, fontSize: 14, color: Theme.ink, lineHeight: 20 },
});
