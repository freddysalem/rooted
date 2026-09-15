import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Input, Pill } from './ui';
import { PlantSprite } from './PlantSprite';
import { GrowthStrip } from './GrowthStrip';
import { TraitChips } from './TraitChips';
import { Species, difficultyLabel, lightLabel, lookOf } from '../models/species';
import { CONTAINERS } from '../services/water';
import { recommendationFor } from '../services/recommend';
import { SunSurvey, surveyLightLabel } from '../models/survey';
import { useGarden } from '../state/GardenContext';
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
  /** Which measured spot it is going in, if the grower has surveyed any. */
  surveyId?: string | null;
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
  const garden = useGarden();
  const advice = recommendationFor(species, garden.region);
  const surveys = garden.surveys;
  const chosenSpot = surveys.find((s) => s.id === choice.surveyId) ?? null;

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
            const best = advice.containerId === option.id;
            return (
              <Pressable
                key={option.id}
                onPress={() => { haptics.selection(); onChoice({ ...choice, containerId: option.id }); }}
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
                accessibilityLabel={`${option.label}, ${option.detail}${best ? ', recommended' : ''}`}
                style={({ pressed }) => [
                  styles.containerChip,
                  on && styles.containerChipOn,
                  pressed && !on && { backgroundColor: color.surfacePressed },
                ]}
              >
                <Text style={[styles.containerLabel, on && { color: color.textOnBrand }]}>
                  {option.label}
                  {best ? <Text style={[styles.recommended, on && { color: color.brandPale }]}>  Recommended</Text> : null}
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
        <Text style={type.label}>Indoors or outdoors?</Text>
        <View style={styles.placeRow}>
          <PlaceOption
            icon="cloud-outline"
            label="Outdoors"
            detail="Rain counts towards its watering"
            on={!choice.indoors}
            best={!advice.indoors}
            onPress={() => onChoice({ ...choice, indoors: false })}
          />
          <PlaceOption
            icon="home-outline"
            label="Indoors"
            detail="Windowsill, greenhouse or porch"
            on={choice.indoors}
            best={advice.indoors}
            onPress={() => onChoice({ ...choice, indoors: true })}
          />
        </View>
        <Text style={type.caption}>{advice.why}</Text>
        <Text style={type.caption}>
          {choice.indoors
            ? 'Rain never reaches it, so it always needs watering by hand.'
            : 'After heavy rain the app will tell you to leave it alone.'}
        </Text>
      </View>

      {/* Where it is standing, measured. Sun hours are the difference between a
          tomato that ripens and one that sulks, so if the grower has surveyed any
          spots they get to say which one this is going into - and the advice for
          this plant is written against that reading from then on. */}
      {surveys.length > 0 ? (
        <View style={{ gap: space.sm }}>
          <Text style={type.label}>Which spot?</Text>
          <View style={styles.spotRow}>
            <SpotOption
              label="Not measured"
              detail="Use the plant's own light needs"
              on={!choice.surveyId}
              onPress={() => onChoice({ ...choice, surveyId: null })}
            />
            {surveys.map((survey) => (
              <SpotOption
                key={survey.id}
                label={survey.name}
                detail={`${surveyLightLabel(survey.sunHours)} · ${survey.sunHours.toFixed(1)}h`}
                on={choice.surveyId === survey.id}
                onPress={() => onChoice({ ...choice, surveyId: survey.id })}
              />
            ))}
          </View>
          {chosenSpot ? <Text style={type.caption}>{spotVerdict(species, chosenSpot)}</Text> : null}
        </View>
      ) : null}

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

/// Does this plant actually want what this spot gets? Said plainly, and never as a
/// refusal - people grow tomatoes in shade and get three tomatoes, and that is their
/// business. It is worth knowing beforehand though.
function spotVerdict(species: Species, survey: SunSurvey): string {
  const needs = species.light === 'fullSun' ? 6 : species.light === 'partialShade' ? 3 : 0;
  const hours = survey.sunHours;
  if (hours + 0.5 >= needs) return `${survey.name} gets ${hours.toFixed(1)} hours, which suits ${species.name.toLowerCase()}.`;
  if (hours >= needs - 2) return `${survey.name} is a little short of what ${species.name.toLowerCase()} likes - expect it to be slower.`;
  return `${survey.name} gets ${hours.toFixed(1)} hours and ${species.name.toLowerCase()} wants about ${needs}. It will grow, but leggy and late.`;
}

function SpotOption({ label, detail, on, onPress }: {
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
        styles.containerChip,
        on && styles.containerChipOn,
        pressed && !on && { backgroundColor: color.surfacePressed },
      ]}
    >
      <Text style={[styles.containerLabel, on && { color: color.textOnBrand }]} numberOfLines={1}>{label}</Text>
      <Text style={[styles.containerDetail, on && { color: color.brandPale }]} numberOfLines={1}>{detail}</Text>
    </Pressable>
  );
}

function PlaceOption({ icon, label, detail, on, best, onPress }: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  detail: string;
  on: boolean;
  best?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={() => { haptics.selection(); onPress(); }}
      accessibilityRole="radio"
      accessibilityState={{ selected: on }}
      accessibilityLabel={`${label}. ${detail}${best ? '. Recommended' : ''}`}
      style={({ pressed }) => [
        styles.place,
        on && styles.placeOn,
        pressed && !on && { backgroundColor: color.surfacePressed },
      ]}
    >
      <Ionicons name={icon} size={20} color={on ? color.textOnBrand : color.textSecondary} />
      <Text style={[styles.containerLabel, on && { color: color.textOnBrand }]}>
        {label}
        {best ? <Text style={[styles.recommended, on && { color: color.brandPale }]}>  Recommended</Text> : null}
      </Text>
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
  recommended: { fontSize: 10, lineHeight: 13, fontWeight: '700', color: color.brandDeep },
  spotRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
});
