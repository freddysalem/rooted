import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card, ContentColumn, EmptyState, SectionHeader } from '../components/ui';
import { PlantSprite } from '../components/PlantSprite';
import { useGarden } from '../state/GardenContext';
import { BADGES, Badge } from '../models/badges';
import { Medal, medalLabel, tierBlurb, tierColour } from '../models/medals';
import { lookOf, speciesById } from '../models/species';
import { color, radius, size, space, tabular, type } from '../theme';

/// The shelf: what you have actually done, and one line admitting how much is left.
///
/// Only earned things are shown. A grid of grey silhouettes for the 150 crops you have
/// not grown is a list of your failures, and this screen is deliberately private and
/// deliberately not a league table - the comparison that makes people give up gardening
/// is comparison with other gardeners, and the runner-up is comparison with an imaginary
/// completed version of yourself.
export function BadgesScreen() {
  const garden = useGarden();

  const earnedBadges = BADGES.filter((badge) => garden.hasEarned(badge));
  const badgesLeft = BADGES.length - earnedBadges.length;
  const golds = garden.medals.filter((medal) => medal.tier === 'gold').length;
  const nothingYet = earnedBadges.length === 0 && garden.medals.length === 0;

  return (
    <ScrollView style={{ backgroundColor: color.canvas }} contentContainerStyle={styles.scroll}>
      <ContentColumn style={{ gap: size.cardGap }}>
        <Card>
          <View style={{ gap: space.sm }}>
            <Text style={type.label}>Your shelf</Text>
            <Text style={[type.display, tabular]} accessibilityRole="header">
              {earnedBadges.length + garden.medals.length} earned
            </Text>
            <Text style={type.bodyMuted}>
              {golds > 0
                ? `${golds} ${golds === 1 ? 'crop' : 'crops'} taken all the way to harvest.`
                : 'A medal appears for every crop you plant, and climbs as you keep it alive.'}
            </Text>
          </View>
        </Card>

        {/* The one nod to what is missing: a count, not a checklist. */}
        <Card padding={space.md}>
          <View style={styles.leftRow}>
            <View style={styles.leftIcon}>
              <Ionicons name="lock-open-outline" size={20} color={color.brandDeep} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={type.bodyStrong}>Still to unlock</Text>
              <Text style={type.caption}>
                {badgesLeft} {badgesLeft === 1 ? 'badge' : 'badges'} · {garden.cropsUnmedalled} crops you have not grown yet
              </Text>
            </View>
          </View>
        </Card>

        {nothingYet ? (
          <Card>
            <EmptyState
              icon="ribbon"
              title="Nothing on the shelf yet"
              body="Plant something and its medal appears here the same day. Keep it alive and the medal gets better."
            />
          </Card>
        ) : null}

        {garden.medals.length > 0 ? (
          <View style={{ gap: space.sm }}>
            <SectionHeader
              title="Crop medals"
              subtitle="Basic when it goes in, gold when you harvest it. Only your best for each crop is shown."
            />
            <View style={styles.medalGrid}>
              {garden.medals.map((medal) => (
                <CropMedal key={medal.speciesId} medal={medal} />
              ))}
            </View>
          </View>
        ) : null}

        {earnedBadges.length > 0 ? (
          <View style={{ gap: space.sm }}>
            <SectionHeader title="Badges" subtitle="One-off milestones, earned once." />
            <View style={styles.medalGrid}>
              {earnedBadges.map((badge) => (
                <BadgeTile key={badge.id} badge={badge} />
              ))}
            </View>
          </View>
        ) : null}
      </ContentColumn>
    </ScrollView>
  );
}

/// One crop's medal. The plant it is for is drawn on the disc, so the shelf reads as a
/// row of things you grew rather than a row of icons.
function CropMedal({ medal }: { medal: Medal }) {
  const species = speciesById(medal.speciesId);
  const paint = tierColour[medal.tier];
  const label = medalLabel(medal);

  return (
    <View
      style={[styles.tile, { borderColor: paint.rim }]}
      accessibilityLabel={`${species.name}, ${label}. ${tierBlurb[medal.tier]}${medal.tier === 'gold' && medal.count > 1 ? `, grown to harvest ${medal.count} times` : ''}`}
    >
      <View style={[styles.disc, { backgroundColor: paint.face, borderColor: paint.rim }]}>
        <PlantSprite look={lookOf(species)} progress={0.92} seed={species.id.length} height={40} />
        {medal.tier === 'gold' && medal.count > 1 ? (
          <View style={[styles.count, { borderColor: paint.face }]}>
            <Text style={styles.countText}>{medal.count}</Text>
          </View>
        ) : null}
      </View>
      <Text style={[type.bodyStrong, styles.centre]} numberOfLines={1}>{species.name}</Text>
      <Text style={[styles.tierText, { color: paint.ink }]}>{label}</Text>
      <Text style={[type.caption, styles.centre]} numberOfLines={2}>{tierBlurb[medal.tier]}</Text>
    </View>
  );
}

function BadgeTile({ badge }: { badge: Badge }) {
  return (
    <View
      style={[styles.tile, { borderColor: color.sun }]}
      accessibilityLabel={`${badge.name}, earned. ${badge.blurb}`}
    >
      <View style={[styles.disc, { backgroundColor: color.sunTint, borderColor: color.sun }]}>
        <Ionicons name={badge.icon as keyof typeof Ionicons.glyphMap} size={24} color={color.sunText} />
      </View>
      <Text style={[type.bodyStrong, styles.centre]} numberOfLines={1}>{badge.name}</Text>
      <Text style={[type.caption, styles.centre]}>{badge.blurb}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: size.gutter, paddingBottom: space.xxxl },
  leftRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  leftIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.sm,
    backgroundColor: color.brandTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  medalGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: size.cardGap },
  tile: {
    width: '47.5%',
    flexGrow: 1,
    alignItems: 'center',
    gap: 4,
    paddingVertical: space.lg,
    paddingHorizontal: space.md,
    backgroundColor: color.surface,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  disc: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: space.xs,
  },
  count: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    minWidth: 22,
    height: 22,
    paddingHorizontal: 4,
    borderRadius: 11,
    borderWidth: 2,
    backgroundColor: color.brandDeep,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: { fontSize: 12, lineHeight: 15, fontWeight: '800', color: '#FFFFFF' },
  centre: { textAlign: 'center' },
  tierText: { fontSize: 12, lineHeight: 15, fontWeight: '800', letterSpacing: 0.3 },
});
