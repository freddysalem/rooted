import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../components/ui';
import { useGarden } from '../state/GardenContext';
import { BADGES, Badge } from '../models/badges';
import { Theme } from '../theme';

/// Deliberately private and deliberately not a league table. The comparison that makes
/// people give up gardening is comparison with other gardeners.
export function BadgesScreen() {
  const garden = useGarden();

  return (
    <ScrollView style={{ backgroundColor: Theme.background }} contentContainerStyle={styles.scroll}>
      <Card>
        <View style={{ gap: 6 }}>
          <Text style={styles.count}>
            {garden.earnedCount} of {BADGES.length}
          </Text>
          <Text style={styles.subtle}>
            Yours alone. Nobody else can see these, and there is no leaderboard to fall down.
          </Text>
        </View>
      </Card>

      <View style={styles.grid}>
        {BADGES.map((badge) => (
          <BadgeTile key={badge.id} badge={badge} earned={garden.hasEarned(badge)} />
        ))}
      </View>
    </ScrollView>
  );
}

function BadgeTile({ badge, earned }: { badge: Badge; earned: boolean }) {
  return (
    <View style={styles.tileWrap}>
      <View style={[styles.tile, { borderColor: earned ? Theme.sun + '59' : Theme.leafPale + '80' }]}>
        <View style={[styles.medal, { backgroundColor: earned ? Theme.sunPale : Theme.surfaceAlt }]}>
          <Ionicons
            name={badge.icon as keyof typeof Ionicons.glyphMap}
            size={24}
            color={earned ? Theme.sun : Theme.inkSoft + '59'}
          />
        </View>
        <Text style={[styles.name, { color: earned ? Theme.ink : Theme.inkSoft }]}>{badge.name}</Text>
        <Text style={styles.blurb}>{badge.blurb}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 18, paddingBottom: 40, gap: 14 },
  count: { fontSize: 26, fontWeight: '700', color: Theme.ink },
  subtle: { fontSize: 14, color: Theme.inkSoft, lineHeight: 20 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -6 },
  tileWrap: { width: '50%', paddingHorizontal: 6, marginBottom: 12 },
  tile: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 16,
    paddingHorizontal: 10,
    backgroundColor: Theme.surface,
    borderRadius: Theme.cardRadius,
    borderWidth: 1,
  },
  medal: { width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 14, fontWeight: '600', textAlign: 'center' },
  blurb: { fontSize: 11, color: Theme.inkSoft, textAlign: 'center', lineHeight: 15 },
});
