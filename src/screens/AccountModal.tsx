import React from 'react';
import { Modal, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card, ContentColumn, Pill, SheetBar } from '../components/ui';
import { useGarden } from '../state/GardenContext';
import { color, radius, size, space, tabular, type } from '../theme';

/// The space where an account will go.
///
/// There are no accounts yet - nothing in Rooted leaves the phone - so this says so
/// plainly and shows what the app does know about you, which is everything an account
/// would eventually sync. It exists now so the door is in the right place later.

const COMING: { icon: keyof typeof Ionicons.glyphMap; title: string; body: string }[] = [
  {
    icon: 'cloud-upload-outline',
    title: 'Your garden, on any phone',
    body: 'Sign in once and the plot, the streak and the medals follow you to a new handset.',
  },
  {
    icon: 'people-outline',
    title: 'Growers near you',
    body: 'The community tab is a preview running on this phone. An account is what turns it into real neighbours.',
  },
  {
    icon: 'share-social-outline',
    title: 'Share a plot',
    body: 'A shared garden for a class, an allotment society or a household.',
  },
];

export function AccountModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const garden = useGarden();

  return (
    <Modal visible={open} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: color.canvas }}>
        <SheetBar title="You" onCancel={onClose} />
        <ScrollView contentContainerStyle={styles.scroll}>
          <ContentColumn style={{ gap: size.cardGap }}>
            <Card>
              <View style={{ gap: space.md }}>
                <View style={styles.headRow}>
                  <View style={styles.avatar}>
                    <Ionicons name="leaf" size={26} color={color.brandDeep} />
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={type.title}>This phone</Text>
                    <Text style={type.caption}>No account needed, and none to make yet.</Text>
                  </View>
                </View>

                <View style={styles.stats}>
                  <Stat value={garden.plantsEverGrown} label="planted" />
                  <Stat value={garden.streak.days} label="day streak" />
                  <Stat value={garden.medals.length} label="medals" />
                  <Stat value={garden.surveys.length} label="sun spots" />
                </View>
              </View>
            </Card>

            <Card>
              <View style={{ gap: space.md }}>
                <View style={styles.headRow}>
                  <Ionicons name="lock-closed-outline" size={18} color={color.brandDeep} />
                  <Text style={[type.bodyStrong, { flex: 1 }]}>Everything stays here</Text>
                </View>
                <Text style={type.body}>
                  Your garden, your readings and your notes are stored on this phone and sent
                  nowhere. The only thing Rooted fetches is the weather for the place you are
                  standing in.
                </Text>
              </View>
            </Card>

            <View style={{ gap: space.sm }}>
              {COMING.map((item) => (
                <Card key={item.title} padding={space.md}>
                  <View style={styles.comingRow}>
                    <View style={styles.comingIcon}>
                      <Ionicons name={item.icon} size={20} color={color.textSecondary} />
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, flexWrap: 'wrap' }}>
                        <Text style={type.bodyStrong}>{item.title}</Text>
                        <Pill text="Later" tint="neutral" />
                      </View>
                      <Text style={type.caption}>{item.body}</Text>
                    </View>
                  </View>
                </Card>
              ))}
            </View>
          </ContentColumn>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={[type.title, tabular]}>{value}</Text>
      <Text style={type.caption}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingVertical: space.md, paddingBottom: space.xxxl },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: color.brandTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stats: { flexDirection: 'row', gap: space.xs },
  stat: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    paddingVertical: space.sm,
    borderRadius: radius.sm,
    backgroundColor: color.surfaceSunken,
  },
  comingRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  comingIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.sm,
    backgroundColor: color.surfaceSunken,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
