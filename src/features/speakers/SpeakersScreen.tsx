import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../app/navigation/routeTypes';
import { ScreenContainer, HeaderBar, EmptyState } from '../../components';
import { useSession } from '../../app/context/SessionContext';
import { SpeakerProfile } from '../../domain/speaker';
import { colors, spacing, borderRadius, typography } from '../../theme';
import { User, ChevronRight, MicOff, Tag } from 'lucide-react-native';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const SpeakersScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { speakers, isLoadingSpeakers } = useSession();

  const handlePressSpeaker = (speaker: SpeakerProfile) => {
    navigation.navigate('SpeakerDetail', {
      speakerId: speaker.id,
      speakerName: speaker.displayName,
    });
  };

  const renderSpeakerItem = ({ item }: { item: SpeakerProfile }) => {
    return (
      <TouchableOpacity
        style={styles.speakerCard}
        onPress={() => handlePressSpeaker(item)}
        activeOpacity={0.75}
        accessibilityRole="button"
        accessibilityLabel={`View details for ${item.displayName}`}
      >
        <View style={styles.avatar}>
          <User size={22} color={colors.primaryLight} />
        </View>

        <View style={styles.infoContainer}>
          <View style={styles.nameRow}>
            <Text style={typography.h3}>{item.displayName}</Text>
            <Text style={styles.sampleBadge}>{item.sampleCount} samples</Text>
          </View>

          <Text style={typography.caption}>ID: {item.id}</Text>

          {item.tags && item.tags.length > 0 && (
            <View style={styles.tagRow}>
              {item.tags.map((tag) => (
                <View key={tag} style={styles.tagBadge}>
                  <Tag size={10} color={colors.textMuted} style={styles.tagIcon} />
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        <ChevronRight size={20} color={colors.textMuted} />
      </TouchableOpacity>
    );
  };

  return (
    <ScreenContainer>
      <HeaderBar
        title="Speakers"
        subtitle={`${speakers.length} synthetic reference profiles`}
      />

      {speakers.length === 0 && !isLoadingSpeakers ? (
        <EmptyState
          icon={MicOff}
          title="No Profiles Loaded"
          description="Mock speaker profiles could not be loaded from fixture data."
        />
      ) : (
        <FlatList
          data={speakers}
          keyExtractor={(item) => item.id}
          renderItem={renderSpeakerItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  listContent: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  speakerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    marginRight: spacing.md,
  },
  infoContainer: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
    paddingRight: spacing.sm,
  },
  sampleBadge: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.info,
    backgroundColor: colors.infoSurface,
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.xs + 2,
  },
  tagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  tagIcon: {
    marginRight: 3,
  },
  tagText: {
    fontSize: 10,
    color: colors.textSecondary,
  },
});

