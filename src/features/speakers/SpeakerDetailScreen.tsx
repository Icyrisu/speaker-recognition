import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../app/navigation/routeTypes';
import { ScreenContainer, HeaderBar, AppButton } from '../../components';
import { useSession } from '../../app/context/SessionContext';
import { SpeakerProfile } from '../../domain/speaker';
import { colors, spacing, borderRadius, typography } from '../../theme';
import {
  User,
  ShieldCheck,
  Sparkles,
  Hash,
  Calendar,
  Layers,
  Tag,
  Trash2,
} from 'lucide-react-native';

type SpeakerDetailRouteProp = RouteProp<RootStackParamList, 'SpeakerDetail'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const SpeakerDetailScreen: React.FC = () => {
  const route = useRoute<SpeakerDetailRouteProp>();
  const navigation = useNavigation<NavigationProp>();
  const { service, refreshSpeakers } = useSession();

  const { speakerId, speakerName } = route.params;
  const [speaker, setSpeaker] = useState<SpeakerProfile | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

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

  const handleDeleteCustomSpeaker = () => {
    if (!speaker?.isCustomEnrolled || !service.deleteCustomSpeaker) return;

    Alert.alert(
      'Revoke Speaker Access',
      `Are you sure you want to remove ${speaker.displayName}'s enrolled voiceprint from this device?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Revoke Access',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsDeleting(true);
              await service.deleteCustomSpeaker!(speaker.id);
              await refreshSpeakers();
              navigation.goBack();
            } catch {
              Alert.alert('Error', 'Failed to remove custom speaker.');
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  };

  return (
    <ScreenContainer>
      <HeaderBar
        title={speakerName || 'Speaker Details'}
        subtitle="Biometric Voiceprint Profile"
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Status Banner */}
        <View style={styles.syntheticBanner}>
          <ShieldCheck size={16} color={colors.info} />
          <Text style={styles.syntheticBannerText}>
            {speaker?.isCustomEnrolled
              ? 'ON-DEVICE ENROLLED VOICEPRINT CENTROID (64-D L2)'
              : 'BASE ENROLLED SPEAKER PROFILE (CNN + CENTROID)'}
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
          <Text style={typography.h3}>Biometric Profile Metadata</Text>

          <View style={styles.metaRow}>
            <View style={styles.metaIconWrapper}>
              <Layers size={18} color={colors.primaryLight} />
            </View>
            <View style={styles.metaTextWrapper}>
              <Text style={styles.metaLabel}>Enrolled Voice Segments</Text>
              <Text style={styles.metaValue}>
                {speaker?.sampleCount ?? 0}{' '}
                {speaker?.isCustomEnrolled ? 'Voiceprint Embeddings' : 'Training Segments (2.5s)'}
              </Text>
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
              <Text style={styles.metaLabel}>Verification Method</Text>
              <Text style={styles.metaValue}>
                {speaker?.isCustomEnrolled
                  ? '64-D L2 Cosine Similarity (>= 82%)'
                  : 'Dual-Gate: Softmax (>= 80%) + Centroid Cosine'}
              </Text>
            </View>
          </View>
        </View>

        {/* Description Card */}
        <View style={styles.descriptionCard}>
          <Text style={typography.h3}>Profile Summary</Text>
          <Text style={[typography.bodySecondary, styles.descriptionText]}>
            {speaker?.description || 'Authorized speaker profile for voice biometric access control.'}
          </Text>
        </View>

        {/* Actions */}
        <View style={styles.actionsSection}>
          <AppButton
            title="Test Speaker Verification"
            onPress={() => navigation.navigate('MainTabs', { screen: 'IdentifyTab' })}
            size="large"
            icon={<Sparkles size={18} color={colors.white} />}
          />

          {speaker?.isCustomEnrolled && (
            <AppButton
              title={isDeleting ? 'Revoking Access...' : 'Revoke Access / Delete Voiceprint'}
              onPress={handleDeleteCustomSpeaker}
              isLoading={isDeleting}
              variant="danger"
              icon={<Trash2 size={16} color={colors.white} />}
              style={styles.deleteBtn}
            />
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
    gap: spacing.lg,
  },
  syntheticBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.infoSurface,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.3)',
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  syntheticBannerText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.info,
    letterSpacing: 0.4,
    flex: 1,
  },
  profileCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  avatarLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 2,
    borderColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  tagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  tagIcon: {
    marginRight: 4,
  },
  tagText: {
    fontSize: 12,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  metaSection: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    gap: spacing.md,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  metaIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  metaTextWrapper: {
    flex: 1,
  },
  metaLabel: {
    ...typography.caption,
  },
  metaValue: {
    ...typography.body,
    fontWeight: '600',
  },
  descriptionCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  descriptionText: {
    marginTop: spacing.xs,
    lineHeight: 20,
  },
  actionsSection: {
    marginTop: spacing.xs,
    gap: spacing.md,
  },
  deleteBtn: {
    marginTop: spacing.xs,
  },
});
