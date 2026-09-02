import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card, ContentColumn, ProgressBar } from '../components/ui';
import { useGarden } from '../state/GardenContext';
import { BADGES, Badge } from '../models/badges';
import { FULL_PLOT_TARGET, getSpecies } from '../models/planting';
import { color, radius, size, space, tabular, type } from '../theme';

/// Deliberately private and deliberately not a league table. The comparison that makes
/// people give up gardening is comparison with other gardeners.
export function BadgesScreen() {
  const garden = useGarden();

  // How far along each locked badge is, where there is a number to show.
  const families = new Set(garden.plantings.map((p) => getSpecies(p).family)).size;
  const mostHeights = Math.max(0, ...garden.plantings.map((p) => p.heights.length));
  const progressFor = (badge: Badge): { now: number; of: number } | null => {
    switch (badge.id) {
      case 'five_plants': return { now: garden.plantings.length, of: 5 };
      case 'full_plot': return { now: garden.plantings.length, of: FULL_PLOT_TARGET };
      case 'faithful': return { now: garden.totalWaterings, of: 20 };
      case 'measured': return { now: mostHeights, of: 3 };
      case 'variety': return { now: families, of: 4 };
      default: return null;
    }
  };

  const rows: Badge[][] = [];
  for (let i = 0; i < BADGES.length; i += 2) rows.push(BADGES.slice(i, i + 2));

  return (
    <ScrollView style={{ backgroundColor: color.canvas }} contentContainerStyle={styles.scroll}>
      <ContentColumn style={{ gap: size.cardGap }}>
        <Card>
          <View style={{ gap: space.sm }}>
            <Text style={type.label}>Badges</Text>
            <Text style={[type.display, tabular]} accessibilityRole="header">
              {garden.earnedCount} of {BADGES.length}
            </Text>
            <ProgressBar fraction={garden.earnedCount / BADGES.length} tone={color.sun} />
            <Text style={type.bodyMuted}>
              Yours alone. Nobody else can see these, and there is no leaderboard to fall down.
            </Text>
          </View>
        </Card>

        <View style={{ gap: size.cardGap }}>
          {rows.map((pair, index) => (
            <View key={index} style={styles.row}>
              {pair.map((badge) => (
                <BadgeTile
                  key={badge.id}
                  badge={badge}
                  earned={garden.hasEarned(badge)}
                  progress={progressFor(badge)}
                />
              ))}
              {pair.length === 1 ? <View style={{ flex: 1 }} /> : null}
            </View>
          ))}
        </View>
      </ContentColumn>
    </ScrollView>
  );
}

function BadgeTile({ badge, earned, progress }: {
  badge: Badge;
  earned: boolean;
  progress: { now: number; of: number } | null;
}) {
  const showProgress = !earned && progress !== null;
  return (
    <View
      style={[styles.tile, earned ? styles.tileEarned : styles.tileLocked]}
      accessibilityLabel={`${badge.name}, ${earned ? 'earned' : 'not yet earned'}. ${badge.blurb}${showProgress ? ` ${progress.now} of ${progress.of}.` : ''}`}
    >
      <View style={[styles.medal, { backgroundColor: earned ? color.sunTint : color.surfaceSunken }]}>
        <Ionicons
          name={badge.icon as keyof typeof Ionicons.glyphMap}
          size={24}
          color={earned ? color.sunText : color.textTertiary}
        />
        {earned ? (
          <View style={styles.tick}>
            <Ionicons name="checkmark" size={11} color="#FFF" />
          </View>
        ) : null}
      </View>
      <Text style={[type.bodyStrong, { textAlign: 'center' }, !earned && { color: color.textSecondary }]}>
        {badge.name}
      </Text>
      <Text style={[type.caption, { textAlign: 'center' }]}>{badge.blurb}</Text>
      {showProgress ? (
        <View style={styles.progress}>
          <ProgressBar fraction={progress.now / progress.of} height={4} tone={color.brand} />
          <Text style={[type.caption, tabular, { textAlign: 'center' }]}>
            {Math.min(progress.now, progress.of)} of {progress.of}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: size.gutter, paddingBottom: space.xxxl },
  row: { flexDirection: 'row', gap: size.cardGap, alignItems: 'stretch' },
  tile: {
    flex: 1,
    alignItems: 'center',
    gap: space.sm,
    paddingVertical: space.lg,
    paddingHorizontal: space.md,
    backgroundColor: color.surface,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  tileEarned: { borderColor: color.sun },
  tileLocked: { borderColor: color.line },
  medal: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  tick: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: color.brand,
    borderWidth: 2,
    borderColor: color.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progress: { width: '100%', gap: space.xs, marginTop: 'auto' },
});
