import React, { memo, useEffect, useRef, useState } from 'react';
import { InteractionManager } from 'react-native';
import { Animated, Image, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { GardenProvider, useGarden } from './src/state/GardenContext';
import { AllotmentScreen } from './src/screens/AllotmentScreen';
import { DiscoverScreen } from './src/screens/DiscoverScreen';
import { SunSpotScreen } from './src/screens/SunSpotScreen';
import { BadgesScreen } from './src/screens/BadgesScreen';
import { AccountModal } from './src/screens/AccountModal';
import { useReduceMotion } from './src/hooks/useReduceMotion';
import { VisibilityProvider } from './src/components/Visibility';
import { color, motion, radius, shadow, size, space, type } from './src/theme';
import * as haptics from './src/services/haptics';

type TabKey = 'allotment' | 'discover' | 'sun' | 'badges';

const TABS: { key: TabKey; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'allotment', label: 'Allotment', icon: 'leaf' },
  { key: 'discover', label: 'Discover', icon: 'sparkles' },
  { key: 'sun', label: 'Sun spot', icon: 'sunny' },
  { key: 'badges', label: 'Badges', icon: 'ribbon' },
];

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
  const [accountOpen, setAccountOpen] = useState(false);
  // A tab mounts the first time it is opened and then stays mounted, so the plot keeps
  // its zoom, lists keep their scroll position, and the compass is not re-requested.
  const [visited, setVisited] = useState<Set<TabKey>>(() => new Set(['allotment']));

  // Build the other three while nobody is waiting, one at a time.
  //
  // Mounting on first press is what made a tab feel slow, and it only ever felt slow
  // once. Doing it after launch moves that cost somewhere nobody is looking - but all
  // three at once is a long enough block to be felt as a stutter, so they go in one per
  // beat instead.
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    const task = InteractionManager.runAfterInteractions(() => {
      TABS.forEach((item, index) => {
        if (index === 0) return;
        timers.push(setTimeout(() => {
          setVisited((current) => (current.has(item.key) ? current : new Set(current).add(item.key)));
        }, index * 260));
      });
    });
    return () => {
      task.cancel();
      timers.forEach(clearTimeout);
    };
  }, []);

  const choose = (next: TabKey) => {
    if (next === tab) return;
    haptics.selection();
    setVisited((current) => (current.has(next) ? current : new Set(current).add(next)));
    setTab(next);
  };

  return (
    <SafeAreaView style={styles.root}>
      {/* The name, on every screen, small enough to forget about - and the mark itself
          as the way in to whatever an account turns out to be. */}
      <View style={styles.topBar}>
        <View style={styles.topSpacer} />
        <Text style={styles.wordmark} accessibilityRole="header">ROOTED</Text>
        <Pressable
          onPress={() => { haptics.selection(); setAccountOpen(true); }}
          accessibilityRole="button"
          accessibilityLabel="You"
          hitSlop={8}
          style={({ pressed }) => [styles.account, pressed && { opacity: 0.6 }]}
        >
          <Image
            source={require('./assets/splash-icon.png')}
            style={styles.accountMark}
            resizeMode="contain"
            accessibilityIgnoresInvertColors
          />
        </Pressable>
      </View>

      <View style={{ flex: 1 }}>
        <TabPane active={tab === 'allotment'} mounted={visited.has('allotment')}>
          <AllotmentScreen />
        </TabPane>
        <TabPane active={tab === 'discover'} mounted={visited.has('discover')}>
          <DiscoverScreen />
        </TabPane>
        <TabPane active={tab === 'sun'} mounted={visited.has('sun')}>
          <SunSpotScreen active={tab === 'sun'} />
        </TabPane>
        <TabPane active={tab === 'badges'} mounted={visited.has('badges')}>
          <BadgesScreen />
        </TabPane>
      </View>

      <View style={styles.tabBar} accessibilityRole="tablist">
        {TABS.map((item) => {
          const active = tab === item.key;
          return (
            <Pressable
              key={item.key}
              onPress={() => choose(item.key)}
              accessibilityRole="tab"
              accessibilityLabel={item.label}
              accessibilityState={{ selected: active }}
              style={({ pressed }) => [styles.tab, pressed && { opacity: 0.6 }]}
            >
              <Ionicons
                name={active ? item.icon : (`${item.icon}-outline` as keyof typeof Ionicons.glyphMap)}
                size={24}
                color={active ? color.brand : color.textSecondary}
              />
              <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <BadgeToast />
      <AccountModal open={accountOpen} onClose={() => setAccountOpen(false)} />
    </SafeAreaView>
  );
}

/// One tab's content, kept alive behind the tab bar.
///
/// Hidden panes are transparent rather than `display: none`, and that distinction is the
/// whole reason switching is quick. `display: none` takes a pane out of layout, so
/// building it in advance buys nothing: the first time you press the tab, the entire
/// screen has to be measured and positioned before anything can appear. Left transparent,
/// each pane is measured once, during the quiet moment after launch, and switching is
/// afterwards only a change of opacity - no layout, no rebuild, and scroll positions and
/// plot zoom all survive untouched.
///
/// There is deliberately no cross-fade either. A fade cannot begin until the incoming
/// pane is ready, so it does not cover the switch, it queues behind it.
const TabPane = memo(function TabPane({ active, mounted, children }: {
  active: boolean;
  mounted: boolean;
  children: React.ReactNode;
}) {
  if (!mounted) return null;
  return (
    <View
      style={[StyleSheet.absoluteFill, active ? styles.paneOn : styles.paneOff]}
      pointerEvents={active ? 'auto' : 'none'}
      accessibilityElementsHidden={!active}
      importantForAccessibility={active ? 'auto' : 'no-hide-descendants'}
    >
      <VisibilityProvider value={active}>{children}</VisibilityProvider>
    </View>
  );
});

/// Badges are private, so this is the whole celebration - a quiet note to yourself.
/// Tap it to send it away early.
function BadgeToast() {
  const { justEarned, dismissBadge } = useGarden();
  const slide = useRef(new Animated.Value(-140)).current;
  const reduceMotion = useReduceMotion();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hide = () => {
    if (timer.current) clearTimeout(timer.current);
    Animated.timing(slide, {
      toValue: -140,
      duration: reduceMotion ? 0 : motion.quick,
      useNativeDriver: true,
    }).start(() => dismissBadge());
  };

  useEffect(() => {
    if (!justEarned) return;
    slide.setValue(-140);
    if (reduceMotion) slide.setValue(0);
    else Animated.spring(slide, { toValue: 0, useNativeDriver: true, speed: 14, bounciness: 6 }).start();
    timer.current = setTimeout(hide, 3200);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [justEarned?.id]);

  if (!justEarned) return null;

  return (
    <Animated.View style={[styles.toastWrap, { transform: [{ translateY: slide }] }]} pointerEvents="box-none">
      <Pressable
        onPress={hide}
        accessibilityRole="alert"
        accessibilityLabel={`Badge earned: ${justEarned.name}`}
        style={styles.toast}
      >
        <View style={styles.toastMedal}>
          <Ionicons name={justEarned.icon as keyof typeof Ionicons.glyphMap} size={20} color={color.sunText} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={type.label}>Badge earned</Text>
          <Text style={type.bodyStrong}>{justEarned.name}</Text>
        </View>
        <Ionicons name="close" size={18} color={color.textTertiary} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.canvas },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: size.gutter,
    paddingTop: space.xs,
    paddingBottom: space.xs,
  },
  topSpacer: { width: 32 },
  wordmark: {
    flex: 1,
    textAlign: 'center',
    fontSize: 15,
    lineHeight: 19,
    fontWeight: '800',
    letterSpacing: 2.4,
    color: color.brandDeep,
  },
  account: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.surface,
  },
  accountMark: { width: 26, height: 26 },
  paneOn: { opacity: 1, zIndex: 1 },
  paneOff: { opacity: 0, zIndex: 0 },
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: color.line,
    backgroundColor: color.surface,
    paddingTop: space.xs,
    paddingBottom: space.xs,
  },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2, minHeight: size.tap + 4 },
  tabLabel: { fontSize: 11, lineHeight: 14, fontWeight: '500', color: color.textSecondary },
  tabLabelActive: { color: color.brand, fontWeight: '700' },
  toastWrap: {
    position: 'absolute',
    top: space.sm,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: size.gutter,
  },
  toast: {
    width: '100%',
    maxWidth: size.contentMaxWidth,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.md,
    borderRadius: radius.md,
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.line,
    ...shadow.raised,
  },
  toastMedal: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: color.sunTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
