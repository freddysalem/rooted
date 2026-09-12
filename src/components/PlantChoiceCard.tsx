import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Input, Pill } from './ui';
import { PlantSprite } from './PlantSprite';
import { GrowthStrip } from './GrowthStrip';
import { TraitChips } from './TraitChips';
import { Species, difficultyLabel, lightLabel, lookOf } from '../models/species';
import { CONTAINERS } from '../services/water';
import { color, radius, space, type } from '../theme';
import * as haptics from '../services/haptics';

/// Everything you need to decide on one plant, and the two things the app needs from
/// you before it can give honest watering advice.
///
/// This used to exist twice: a full version for a plant arriving from Discover, and a
/// thinner one for a plant picked out of the catalogue list - so the same strawberry
/// told you different things depending on which door you came through. It is one
/// component now, used by both.

export interface PlantChoice {
  containerId: string;
  indoors: boolean;
}

export function PlantChoiceCard({
  species, inSeason, nickname, onNickname, choice, onChoice, showHead = true,
}: {
  species: Species;
  inSeason: boolean;
  nickname: string;
  onNickname: (text: string) => void;
  choice: PlantChoice;
  onChoice: (choice: PlantChoice) => void;
  /** Off when the row above the card already names the plant. */
  showHead?: boolean;
}) {
  return (
    <View style={styles.card}>
      {showHead ? (
      <View style={styles.head}>
        <View style={styles.sprite}>
          <PlantSprite look={lookOf(species)} progress={0.9} seed={species.id.length} height={74} />
          <View style={styles.spriteSoil} />
        </View>
        <View style={{ flex: 1, gap: space.xs }}>
          <Text style={styles.title}>{species.name}</Text>
          <View style={styles.pills}>
            {inSeason ? <Pill text="In season" tint="brand" /> : null}
            <Pill text={lightLabel[species.light]} icon="sunny" tint="sun" />
            <Pill text={difficultyLabel(species.difficulty)} icon="speedometer" tint="soil" />
          </View>
        </View>
      </View>
      ) : null}

      {/* The point of the screen: what this plant will actually do, and when. */}
      <GrowthStrip species={species} />

      <Text style={type.body}>{species.tip}</Text>
      <TraitChips traits={species.traits} />

      <View style={{ gap: space.sm }}>
        <Text style={type.label}>Where will it grow?</Text>
        <Text style={type.caption}>
          How much soil the roots get is what decides how much water it wants.
        </Text>
        <View style={styles.containerRow}>
          {CONTAINERS.map((option) => {
            const on = choice.containerId === option.id;
            return (
              <Pressable
                key={option.id}
                onPress={() => { haptics.selection(); onChoice({ ...choice, containerId: option.id }); }}
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
                accessibilityLabel={`${option.label}, ${option.detail}`}
                style={({ pressed }) => [
                  styles.containerChip,
                  on && styles.containerChipOn,
                  pressed && !on && { backgroundColor: color.surfacePressed },
                ]}
              >
                <Text style={[styles.containerLabel, on && { color: color.textOnBrand }]}>
                  {option.label}
                </Text>
                <Text style={[styles.containerDetail, on && { color: color.brandPale }]}>
                  {option.detail}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Rain is half the watering advice, and it only lands on plants that are outside. */}
      <View style={{ gap: space.sm }}>
        <Text style={type.label}>Under a roof, or open to the sky?</Text>
        <View style={styles.placeRow}>
          <PlaceOption
            icon="cloud-outline"
            label="Outdoors"
            detail="Rain counts towards its watering"
            on={!choice.indoors}
            onPress={() => onChoice({ ...choice, indoors: false })}
          />
          <PlaceOption
            icon="home-outline"
            label="Indoors"
            detail="Windowsill, greenhouse or porch"
            on={choice.indoors}
            onPress={() => onChoice({ ...choice, indoors: true })}
          />
        </View>
        <Text style={type.caption}>
          {choice.indoors
            ? 'Nothing the sky does will water this one, so the reminders will never tell you to skip it.'
            : 'After heavy rain the app will tell you to leave it alone.'}
        </Text>
      </View>

      <Input
        label="Name it (optional)"
        value={nickname}
        onChangeText={onNickname}
        placeholder={species.name}
        maxLength={24}
        autoCapitalize="words"
        returnKeyType="done"
      />
    </View>
  );
}

function PlaceOption({ icon, label, detail, on, onPress }: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  detail: string;
  on: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={() => { haptics.selection(); onPress(); }}
      accessibilityRole="radio"
      accessibilityState={{ selected: on }}
      accessibilityLabel={`${label}. ${detail}`}
      style={({ pressed }) => [
        styles.place,
        on && styles.placeOn,
        pressed && !on && { backgroundColor: color.surfacePressed },
      ]}
    >
      <Ionicons name={icon} size={20} color={on ? color.textOnBrand : color.textSecondary} />
      <Text style={[styles.containerLabel, on && { color: color.textOnBrand }]}>{label}</Text>
      <Text style={[styles.containerDetail, on && { color: color.brandPale }]}>{detail}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { gap: space.md },
  head: { flexDirection: 'row', gap: space.md, alignItems: 'center' },
  title: { ...type.title },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  sprite: {
    width: 84,
    height: 84,
    borderRadius: radius.sm,
    backgroundColor: color.sky,
    alignItems: 'center',
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  spriteSoil: { height: 12, alignSelf: 'stretch', backgroundColor: '#8A6242' },
  containerRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
  containerChip: {
    paddingVertical: space.sm,
    paddingHorizontal: space.md,
    borderRadius: radius.sm,
    backgroundColor: color.surfaceSunken,
    gap: 2,
  },
  containerChipOn: { backgroundColor: color.brand },
  containerLabel: { ...type.bodyStrong },
  containerDetail: { ...type.caption },
  placeRow: { flexDirection: 'row', gap: space.xs },
  place: {
    flex: 1,
    padding: space.md,
    borderRadius: radius.sm,
    backgroundColor: color.surfaceSunken,
    gap: 2,
  },
  placeOn: { backgroundColor: color.brand },
});
