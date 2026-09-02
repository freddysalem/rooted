import React, { useEffect, useState } from 'react';
import { Animated, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { GardenProvider, useGarden } from './src/state/GardenContext';
import { AllotmentScreen } from './src/screens/AllotmentScreen';
import { DiscoverScreen } from './src/screens/DiscoverScreen';
import { SunSpotScreen } from './src/screens/SunSpotScreen';
import { BadgesScreen } from './src/screens/BadgesScreen';
import { Theme } from './src/theme';

type TabKey = 'allotment' | 'discover' | 'sun' | 'badges';

const TABS: { key: TabKey; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'allotment', label: 'Allotment', icon: 'leaf' },
  { key: 'discover', label: 'Discover', icon: 'sparkles' },
  { key: 'sun', label: 'Sun spot', icon: 'sunny' },
  { key: 'badges', label: 'Badges', icon: 'ribbon' },
];

const TITLES: Record<TabKey, string> = {
  allotment: 'Allotment',
  discover: 'Discover',
  sun: 'Sun spot',
  badges: 'Badges',
};

export default function App() {
  return (
    <GardenProvider>
      <StatusBar style="dark" />
      <Shell />
    </GardenProvider>
  );
}

function Shell() {
  const [tab, setTab] = useState<TabKey>('allotment');

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.titleBar}>
        <Text style={styles.title}>{TITLES[tab]}</Text>
      </View>

      <View style={{ flex: 1 }}>
        {tab === 'allotment' ? <AllotmentScreen /> : null}
        {tab === 'discover' ? <DiscoverScreen /> : null}
        {tab === 'sun' ? <SunSpotScreen /> : null}
        {tab === 'badges' ? <BadgesScreen /> : null}
      </View>

      <View style={styles.tabBar}>
        {TABS.map((item) => {
          const active = tab === item.key;
          return (
            <Pressable key={item.key} onPress={() => setTab(item.key)} style={styles.tab}>
              <Ionicons
                name={active ? item.icon : (`${item.icon}-outline` as keyof typeof Ionicons.glyphMap)}
                size={22}
                color={active ? Theme.leaf : Theme.inkSoft}
              />
              <Text style={[styles.tabLabel, active && { color: Theme.leaf, fontWeight: '600' }]}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <BadgeToast />
    </SafeAreaView>
  );
}

/// Badges are private, so this is the whole celebration - a quiet note to yourself.
function BadgeToast() {
  const { justEarned, dismissBadge } = useGarden();
  const slide = React.useRef(new Animated.Value(-120)).current;

  useEffect(() => {
    if (!justEarned) return;
    Animated.spring(slide, { toValue: 0, useNativeDriver: true, speed: 14, bounciness: 6 }).start();
    const timer = setTimeout(() => {
      Animated.timing(slide, { toValue: -120, duration: 220, useNativeDriver: true }).start(
        dismissBadge
      );
    }, 2800);
    return () => clearTimeout(timer);
  }, [justEarned?.id]);

  if (!justEarned) return null;

  return (
    <Animated.View style={[styles.toast, { transform: [{ translateY: slide }] }]}>
      <View style={styles.toastMedal}>
        <Ionicons
          name={justEarned.icon as keyof typeof Ionicons.glyphMap}
          size={20}
          color={Theme.sun}
        />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.toastKicker}>Badge earned</Text>
        <Text style={styles.toastName}>{justEarned.name}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Theme.background },
  titleBar: { alignItems: 'center', paddingVertical: 10 },
  title: { fontSize: 16, fontWeight: '700', color: Theme.ink },
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: Theme.leafPale,
    backgroundColor: Theme.surface,
    paddingTop: 8,
    paddingBottom: 6,
  },
  tab: { flex: 1, alignItems: 'center', gap: 3 },
  tabLabel: { fontSize: 10, color: Theme.inkSoft },
  toast: {
    position: 'absolute',
    top: 8,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 16,
    backgroundColor: Theme.surface,
    shadowColor: Theme.leafDeep,
    shadowOpacity: 0.16,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 },
    elevation: 6,
  },
  toastMedal: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Theme.sunPale,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toastKicker: { fontSize: 11, fontWeight: '600', color: Theme.inkSoft },
  toastName: { fontSize: 16, fontWeight: '700', color: Theme.ink },
});
