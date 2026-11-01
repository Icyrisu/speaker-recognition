import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../app/navigation/routeTypes';
import { ScreenContainer, HeaderBar, AppButton } from '../../components';
import { useSession } from '../../app/context/SessionContext';
import { SpeakerProfile } from '../../domain/speaker';
import { colors, spacing, borderRadius, typography } from '../../theme';
import { User, ShieldCheck, Sparkles, Hash, Calendar, Layers, Tag } from 'lucide-react-native';

type SpeakerDetailRouteProp = RouteProp<RootStackParamList, 'SpeakerDetail'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const SpeakerDetailScreen: React.FC = () => {
  const route = useRoute<SpeakerDetailRouteProp>();
  const navigation = useNavigation<NavigationProp>();
  const { service } = useSession();

  const { speakerId, speakerName } = route.params;
  const [speaker, setSpeaker] = useState<SpeakerProfile | null>(null);

  useEffect(() => {
    let isMounted = true;
    service.getSpeakerById(speakerId).then((data) => {
      if (isMounted) {
        setSpeaker(data);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [service, speakerId]);

  return (
    <ScreenContainer>
      <HeaderBar
        title={speakerName || 'Speaker Details'}
        subtitle="Synthetic Profile Metadata"
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Synthetic Banner */}
        <View style={styles.syntheticBanner}>
          <ShieldCheck size={16} color={colors.info} />
          <Text style={styles.syntheticBannerText}>
            SYNTHETIC PROFILE — NO REAL BIOMETRIC DATA STORED
          </Text>
        </View>

        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarLarge}>
            <User size={36} color={colors.primaryLight} />
          </View>
          <Text style={typography.h1}>{speaker?.displayName || speakerName}</Text>
          <Text style={[typography.caption, { color: colors.textSecondary }]}>
            Identifier: {speakerId}
          </Text>

          {speaker?.tags && (
            <View style={styles.tagRow}>
              {speaker.tags.map((t) => (
                <View key={t} style={styles.tagBadge}>
                  <Tag size={10} color={colors.info} style={styles.tagIcon} />
                  <Text style={styles.tagText}>{t}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Metadata Details */}
        <View style={styles.metaSection}>
          <Text style={typography.h3}>Synthetic Audio Metadata</Text>

          <View style={styles.metaRow}>
            <View style={styles.metaIconWrapper}>
              <Layers size={18} color={colors.primaryLight} />
            </View>
            <View style={styles.metaTextWrapper}>
              <Text style={styles.metaLabel}>Mock Audio Samples</Text>
              <Text style={styles.metaValue}>{speaker?.sampleCount ?? 0} Recorded Sessions</Text>
            </View>
          </View>

          <View style={styles.metaRow}>
            <View style={styles.metaIconWrapper}>
              <Calendar size={18} color={colors.primaryLight} />
            </View>
            <View style={styles.metaTextWrapper}>
              <Text style={styles.metaLabel}>Enrolled Timestamp</Text>
              <Text style={styles.metaValue}>
                {speaker ? new Date(speaker.enrolledAt).toLocaleDateString() : 'N/A'}
              </Text>
            </View>
          </View>

          <View style={styles.metaRow}>
            <View style={styles.metaIconWrapper}>
              <Hash size={18} color={colors.primaryLight} />
            </View>
            <View style={styles.metaTextWrapper}>
              <Text style={styles.metaLabel}>Model Embedding Dimension</Text>
              <Text style={styles.metaValue}>128-D (Simulated Vector)</Text>
            </View>
          </View>
        </View>

        {/* Description Section */}
        {speaker?.description && (
          <View style={styles.descSection}>
            <Text style={typography.h3}>Archetype Profile Notes</Text>
            <Text style={[typography.body, styles.descText]}>{speaker.description}</Text>
          </View>
        )}

        {/* Primary CTA */}
        <AppButton
          title="Simulate Match For This Profile"
          onPress={() => {
            navigation.navigate('MainTabs', { screen: 'IdentifyTab' });
          }}
          size="large"
          icon={<Sparkles size={18} color={colors.white} />}
          style={styles.actionBtn}
        />
      </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  syntheticBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.infoSurface,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.25)',
  },
  syntheticBannerText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.info,
    letterSpacing: 0.5,
    flex: 1,
  },
  profileCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    marginBottom: spacing.lg,
  },
  avatarLarge: {
    width: 72,
    height: 72,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.primaryMuted,
    marginBottom: spacing.md,
  },
  tagRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  tagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  tagIcon: {
    marginRight: 4,
  },
  tagText: {
    fontSize: 11,
    color: colors.info,
  },
  metaSection: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  metaTextWrapper: {
    flex: 1,
  },
  metaLabel: {
    fontSize: 11,
    color: colors.textMuted,
  },
  metaValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: 2,
  },
  descSection: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    marginBottom: spacing.xl,
  },
  descText: {
    marginTop: spacing.sm,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  actionBtn: {
    width: '100%',
  },
});

