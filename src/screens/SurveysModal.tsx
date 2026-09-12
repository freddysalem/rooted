import React, { useState } from 'react';
import { FlatList, Modal, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, ContentColumn, EmptyState, Input, Pill, SheetBar } from '../components/ui';
import { useGarden } from '../state/GardenContext';
import { SunSurvey, aspectLabel, surveyLightLabel } from '../models/survey';
import { confirmDestructive } from '../services/confirm';
import { color, radius, size, space, tabular, type } from '../theme';
import * as haptics from '../services/haptics';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function takenLabel(iso: string): string {
  const date = new Date(iso);
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

/// Every spot you have measured, side by side.
///
/// Sun hours are a reading for a particular day of the year, not a permanent property of
/// a place, so each one keeps its date and says so. Comparing March with July is the
/// whole point - but only if you can see which was which.
export function SurveysModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const garden = useGarden();
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState('');

  const startRename = (survey: SunSurvey) => {
    haptics.selection();
    setEditing(survey.id);
    setDraft(survey.name);
  };

  const commit = (survey: SunSurvey) => {
    garden.renameSurvey(survey.id, draft);
    setEditing(null);
  };

  const remove = (survey: SunSurvey) => {
    confirmDestructive({
      title: `Delete "${survey.name}"?`,
      message: 'The reading goes with it. You can always measure the spot again.',
      actionLabel: 'Delete',
      onConfirm: () => garden.removeSurvey(survey.id),
    });
  };

  return (
    <Modal visible={open} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: color.canvas }}>
        <SheetBar title="Your sun spots" onCancel={onClose} />
        <FlatList
          data={garden.surveys}
          keyExtractor={(survey) => survey.id}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <ContentColumn>
              <Card>
                <EmptyState
                  icon="sunny"
                  title="No spots measured yet"
                  body="Stand where you would plant, point the phone at it, and save the reading. Measure a few and you can compare them here."
                  action={<Button label="Close" tone="quiet" onPress={onClose} />}
                />
              </Card>
            </ContentColumn>
          }
          ItemSeparatorComponent={() => <View style={{ height: space.xs }} />}
          renderItem={({ item }) => (
            <ContentColumn>
              <Card padding={space.md}>
                <View style={{ gap: space.sm }}>
                  <View style={styles.head}>
                    <View style={{ flex: 1, gap: 2 }}>
                      {editing === item.id ? (
                        <Input
                          value={draft}
                          onChangeText={setDraft}
                          placeholder={item.name}
                          maxLength={28}
                          autoFocus
                          returnKeyType="done"
                          onSubmitEditing={() => commit(item)}
                          onBlur={() => commit(item)}
                        />
                      ) : (
                        <Text style={type.bodyStrong}>{item.name}</Text>
                      )}
                      <Text style={type.caption}>
                        {takenLabel(item.takenOn)} · {item.placeName}
                      </Text>
                    </View>

                    <Pressable
                      onPress={() => startRename(item)}
                      accessibilityRole="button"
                      accessibilityLabel={`Rename ${item.name}`}
                      hitSlop={8}
                      style={({ pressed }) => [styles.icon, pressed && { backgroundColor: color.surfacePressed }]}
                    >
                      <Ionicons name="pencil" size={16} color={color.textSecondary} />
                    </Pressable>
                    <Pressable
                      onPress={() => remove(item)}
                      accessibilityRole="button"
                      accessibilityLabel={`Delete ${item.name}`}
                      hitSlop={8}
                      style={({ pressed }) => [styles.icon, pressed && { backgroundColor: color.surfacePressed }]}
                    >
                      <Ionicons name="trash-outline" size={16} color={color.dangerText} />
                    </Pressable>
                  </View>

                  <View style={styles.stats}>
                    <Pill text={surveyLightLabel(item.sunHours)} icon="sunny" tint="sun" />
                    <Pill text={`${item.sunHours.toFixed(1)} hours`} icon="time" tint="neutral" />
                    <Pill text={`${aspectLabel(item.bearing)}-facing`} icon="compass" tint="soil" />
                  </View>

                  <Text style={[type.caption, tabular]}>
                    {item.obstruction < 6 ? 'Open field'
                      : item.obstruction < 16 ? 'Ordinary garden'
                      : item.obstruction < 28 ? 'Hemmed in by fences'
                      : 'Overshadowed by buildings'}
                    {' · '}{Math.round(item.obstruction)}° of horizon blocked
                  </Text>
                </View>
              </Card>
            </ContentColumn>
          )}
        />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingVertical: space.md, gap: space.xs },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  icon: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
