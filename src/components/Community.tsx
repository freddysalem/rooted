import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, Pill, SectionHeader } from './ui';
import {
  Feed, KIND_LABEL, Post, PostKind, loadFeed, publish, remove, toggleCheer, whenLabel,
} from '../services/community';
import { REGIONS, RegionId } from '../models/regions';
import { speciesById } from '../models/species';
import { color, radius, size, space, type } from '../theme';
import * as haptics from '../services/haptics';

/// Growers near you, and the beginnings of talking to them.
///
/// Deliberately honest about what it is. The sample posts carry a badge and the composer
/// says where a post actually goes, because a feed of invented neighbours presented as
/// real would be a worse thing to ship than no feed at all. Everything else - composing,
/// cheering, deleting, the empty states, the region switch - is real and works, so when
/// there is a server to point at, this screen is already finished.

const KINDS: PostKind[] = ['harvest', 'tip', 'question', 'sowing'];

const KIND_ICON: Record<PostKind, keyof typeof Ionicons.glyphMap> = {
  harvest: 'basket-outline',
  tip: 'bulb-outline',
  question: 'help-circle-outline',
  sowing: 'leaf-outline',
};

export function Community({ region, month }: { region: RegionId; month: number }) {
  const [feed, setFeed] = useState<Feed | null>(null);
  const [composing, setComposing] = useState(false);
  const [kind, setKind] = useState<PostKind>('tip');
  const [body, setBody] = useState('');

  const refresh = useCallback(() => {
    loadFeed(region, month).then(setFeed);
  }, [region, month]);

  useEffect(refresh, [refresh]);

  const send = async () => {
    if (body.trim().length < 4 || !feed) return;
    await publish({ kind, body, region, author: feed.displayName });
    haptics.success();
    setBody('');
    setComposing(false);
    refresh();
  };

  const cheer = async (post: Post) => {
    haptics.tap();
    const cheered = await toggleCheer(post.id);
    setFeed((current) => (current ? { ...current, cheered } : current));
  };

  const drop = async (post: Post) => {
    haptics.selection();
    await remove(post.id);
    refresh();
  };

  return (
    <Card>
      <View style={{ gap: space.md }}>
        <SectionHeader
          title="Growers near you"
          subtitle={`What people in ${REGIONS[region].label} are doing this month.`}
          right={<Pill text="Preview" tint="neutral" />}
        />

        <View style={styles.notice}>
          <Ionicons name="information-circle-outline" size={16} color={color.textSecondary} />
          <Text style={[type.caption, { flex: 1 }]}>
            Sample posts, to show what this will look like. Nothing is sent anywhere yet -
            anything you write stays on this phone.
          </Text>
        </View>

        {composing ? (
          <View style={styles.composer}>
            <View style={styles.kindRow}>
              {KINDS.map((item) => {
                const on = kind === item;
                return (
                  <Pressable
                    key={item}
                    onPress={() => { haptics.selection(); setKind(item); }}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: on }}
                    accessibilityLabel={KIND_LABEL[item]}
                    style={({ pressed }) => [styles.kind, on && styles.kindOn, pressed && !on && { opacity: 0.6 }]}
                  >
                    <Ionicons
                      name={KIND_ICON[item]}
                      size={14}
                      color={on ? color.textOnBrand : color.textSecondary}
                    />
                    <Text style={[styles.kindLabel, on && styles.kindLabelOn]}>{KIND_LABEL[item]}</Text>
                  </Pressable>
                );
              })}
            </View>
            <TextInput
              value={body}
              onChangeText={setBody}
              placeholder="What happened on your plot this week?"
              placeholderTextColor={color.textTertiary}
              multiline
              maxLength={280}
              style={styles.input}
              accessibilityLabel="Your post"
            />
            <View style={styles.composerActions}>
              <Text style={type.caption}>{280 - body.length} left</Text>
              <View style={{ flex: 1 }} />
              <Button
                label="Cancel"
                tone="quiet"
                compact
                onPress={() => { setComposing(false); setBody(''); }}
              />
              <Button label="Post" compact icon="send" onPress={send} disabled={body.trim().length < 4} />
            </View>
          </View>
        ) : (
          <Button
            label="Share something from your plot"
            tone="quiet"
            icon="create-outline"
            onPress={() => { haptics.selection(); setComposing(true); }}
          />
        )}

        <View style={{ gap: space.sm }}>
          {feed?.posts.map((post) => (
            <PostRow
              key={post.id}
              post={post}
              cheered={feed.cheered.has(post.id)}
              onCheer={() => cheer(post)}
              onDelete={() => drop(post)}
            />
          ))}
        </View>
      </View>
    </Card>
  );
}

function PostRow({ post, cheered, onCheer, onDelete }: {
  post: Post;
  cheered: boolean;
  onCheer: () => void;
  onDelete: () => void;
}) {
  const species = post.speciesId ? speciesById(post.speciesId) : null;
  const count = post.cheers + (cheered ? 1 : 0);

  return (
    <View style={[styles.post, post.mine && styles.postMine]}>
      <View style={styles.postHead}>
        <View style={[styles.avatar, post.mine && styles.avatarMine]}>
          <Text style={styles.avatarLetter}>{post.author.slice(0, 1).toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={type.bodyStrong} numberOfLines={1}>
            {post.author}{post.mine ? ' · you' : ''}
          </Text>
          <Text style={type.caption}>{KIND_LABEL[post.kind]} · {whenLabel(post.at)}</Text>
        </View>
        {post.mine ? (
          <Pressable
            onPress={onDelete}
            accessibilityRole="button"
            accessibilityLabel="Delete your post"
            hitSlop={8}
            style={({ pressed }) => pressed && { opacity: 0.5 }}
          >
            <Ionicons name="trash-outline" size={16} color={color.textTertiary} />
          </Pressable>
        ) : null}
      </View>

      <Text style={type.body}>{post.body}</Text>

      <View style={styles.postFoot}>
        {species ? <Pill text={species.name} tint="brand" /> : null}
        <View style={{ flex: 1 }} />
        <Pressable
          onPress={onCheer}
          accessibilityRole="button"
          accessibilityLabel={cheered ? 'Remove your cheer' : 'Cheer this on'}
          accessibilityState={{ selected: cheered }}
          hitSlop={6}
          style={({ pressed }) => [styles.cheer, cheered && styles.cheerOn, pressed && { opacity: 0.6 }]}
        >
          <Ionicons
            name={cheered ? 'happy' : 'happy-outline'}
            size={15}
            color={cheered ? color.brandDeep : color.textSecondary}
          />
          <Text style={[styles.cheerCount, cheered && { color: color.brandDeep }]}>{count}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    padding: space.sm,
    borderRadius: radius.sm,
    backgroundColor: color.surfaceSunken,
  },
  composer: { gap: space.sm },
  kindRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  kind: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: radius.pill,
    backgroundColor: color.surfaceSunken,
  },
  kindOn: { backgroundColor: color.brand },
  kindLabel: { fontSize: 13, fontWeight: '600', color: color.textSecondary },
  kindLabelOn: { color: color.textOnBrand },
  input: {
    minHeight: 84,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: color.line,
    backgroundColor: color.surface,
    padding: space.md,
    fontSize: 15,
    lineHeight: 21,
    color: color.text,
    textAlignVertical: 'top',
  },
  composerActions: { flexDirection: 'row', alignItems: 'center', gap: space.sm },

  post: {
    gap: space.sm,
    padding: space.md,
    borderRadius: radius.sm,
    backgroundColor: color.surfaceSunken,
  },
  postMine: { backgroundColor: color.brandTint },
  postHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: color.soilTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarMine: { backgroundColor: color.brand },
  avatarLetter: { fontSize: 14, fontWeight: '800', color: color.soilText },
  postFoot: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  cheer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    minHeight: size.tap - 12,
    borderRadius: radius.pill,
    backgroundColor: color.surface,
  },
  cheerOn: { backgroundColor: color.brandPale },
  cheerCount: { fontSize: 13, fontWeight: '700', color: color.textSecondary },
});
