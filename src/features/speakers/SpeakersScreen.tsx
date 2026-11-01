import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../app/navigation/routeTypes';
import { ScreenContainer, HeaderBar, EmptyState, AppButton } from '../../components';
import { useSession } from '../../app/context/SessionContext';
import { SpeakerProfile } from '../../domain/speaker';
import { colors, spacing, borderRadius, typography } from '../../theme';
import {
  User,
  ChevronRight,
  MicOff,
  Tag,
  UserPlus,
  Mic,
  CheckCircle2,
  X,
  ShieldCheck,
} from 'lucide-react-native';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const SpeakersScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { speakers, isLoadingSpeakers, service, refreshSpeakers, mode } = useSession();

  const [isEnrolling, setIsEnrolling] = useState<boolean>(false);
  const [newSpeakerName, setNewSpeakerName] = useState<string>('');
  const [recordedCount, setRecordedCount] = useState<number>(0);
  const [isRecordingSample, setIsRecordingSample] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const requiredSamples = 3;

  const handlePressSpeaker = (speaker: SpeakerProfile) => {
    navigation.navigate('SpeakerDetail', {
      speakerId: speaker.id,
      speakerName: speaker.displayName,
    });
  };

  const handleStartEnrollment = async () => {
    if (service.cancelEnrollment) {
      await service.cancelEnrollment();
    }
    setNewSpeakerName('');
    setRecordedCount(0);
    setIsEnrolling(true);
  };

  const handleCancelEnrollment = async () => {
    if (service.cancelEnrollment) {
      await service.cancelEnrollment();
    }
    setIsEnrolling(false);
    setRecordedCount(0);
    setNewSpeakerName('');
  };

  const handleRecordSample = async () => {
    if (isRecordingSample || !service.recordEnrollmentSample) return;

    try {
      if (service.checkPermission && service.requestPermission) {
        const hasPerm = await service.checkPermission();
        if (!hasPerm) {
          const granted = await service.requestPermission();
          if (!granted) {
            Alert.alert('Permission Required', 'Microphone permission is required to enroll a new voice.');
            return;
          }
        }
      }

      setIsRecordingSample(true);
      const res = await service.recordEnrollmentSample();
      setRecordedCount(res.recordedSamples);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to capture voice sample.';
      Alert.alert('Voice Sample Rejected', msg);
    } finally {
      setIsRecordingSample(false);
    }
  };

  const handleFinalizeEnrollment = async () => {
    if (!newSpeakerName.trim()) {
      Alert.alert('Name Required', 'Please enter a name for the new authorized speaker.');
      return;
    }
    if (recordedCount < requiredSamples) {
      Alert.alert(
        'More Samples Needed',
        `Please record all ${requiredSamples} voice samples (2.5s each) for reliable biometric verification.`
      );
      return;
    }
    if (!service.finalizeEnrollment) return;

    try {
      setIsSaving(true);
      const created = await service.finalizeEnrollment(newSpeakerName.trim());
      await refreshSpeakers();
      setIsEnrolling(false);
      setNewSpeakerName('');
      setRecordedCount(0);
      Alert.alert(
        'Speaker Enrolled',
        `${created.displayName} has been enrolled on-device and is now authorized for voice verification.`
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not save speaker enrollment.';
      Alert.alert('Enrollment Error', msg);
    } finally {
      setIsSaving(false);
    }
  };

  const renderSpeakerItem = ({ item }: { item: SpeakerProfile }) => {
    return (
      <TouchableOpacity
        style={[styles.speakerCard, item.isCustomEnrolled && styles.customSpeakerCard]}
        onPress={() => handlePressSpeaker(item)}
        activeOpacity={0.75}
        accessibilityRole="button"
        accessibilityLabel={`View details for ${item.displayName}`}
      >
        <View style={[styles.avatar, item.isCustomEnrolled && styles.customAvatar]}>
          <User size={22} color={item.isCustomEnrolled ? colors.success : colors.primaryLight} />
        </View>

        <View style={styles.infoContainer}>
          <View style={styles.nameRow}>
            <Text style={typography.h3}>{item.displayName}</Text>
            <Text style={styles.sampleBadge}>
              {item.isCustomEnrolled ? `${item.sampleCount} voiceprints` : `${item.sampleCount} segments`}
            </Text>
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
        title="Authorized Speakers"
        subtitle={`${speakers.length} enrolled biometric access profiles`}
      />

      <FlatList
        data={speakers}
        keyExtractor={(item) => item.id}
        renderItem={renderSpeakerItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.headerSection}>
            {mode === 'real' && !isEnrolling && (
              <View style={styles.enrollBannerCard}>
                <View style={styles.enrollBannerRow}>
                  <ShieldCheck size={20} color={colors.primaryLight} />
                  <View style={styles.enrollBannerTextCol}>
                    <Text style={typography.h3}>Add New Authorized Speaker</Text>
                    <Text style={styles.enrollBannerSub}>
                      Enroll a new voice directly on this phone by recording 3 voice samples (2.5s each).
                    </Text>
                  </View>
                </View>
                <AppButton
                  title="Enroll New Voice"
                  onPress={handleStartEnrollment}
                  icon={<UserPlus size={16} color={colors.white} />}
                  style={styles.enrollBtn}
                />
              </View>
            )}

            {isEnrolling && (
              <View style={styles.enrollModalCard}>
                <View style={styles.enrollModalHeader}>
                  <View style={styles.enrollModalTitleRow}>
                    <UserPlus size={18} color={colors.primaryLight} />
                    <Text style={typography.h3}>On-Device Voice Enrollment</Text>
                  </View>
                  <TouchableOpacity
                    onPress={handleCancelEnrollment}
                    disabled={isRecordingSample || isSaving}
                  >
                    <X size={20} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>

                <Text style={styles.enrollStepLabel}>1. Enter Speaker Name:</Text>
                <TextInput
                  style={styles.nameInput}
                  placeholder="e.g. Kholil"
                  placeholderTextColor={colors.textMuted}
                  value={newSpeakerName}
                  onChangeText={setNewSpeakerName}
                  editable={!isRecordingSample && !isSaving}
                />

                <Text style={styles.enrollStepLabel}>
                  2. Record {requiredSamples} Voice Samples (2.5s continuous speech each):
                </Text>

                <View style={styles.progressDotsRow}>
                  {[1, 2, 3].map((step) => {
                    const done = recordedCount >= step;
                    return (
                      <View
                        key={step}
                        style={[styles.progressBadge, done && styles.progressBadgeDone]}
                      >
                        <CheckCircle2
                          size={14}
                          color={done ? colors.success : colors.textMuted}
                        />
                        <Text
                          style={[
                            styles.progressBadgeText,
                            done && styles.progressBadgeTextDone,
                          ]}
                        >
                          Sample {step}/3
                        </Text>
                      </View>
                    );
                  })}
                </View>

                {recordedCount < requiredSamples ? (
                  <AppButton
                    title={
                      isRecordingSample
                        ? 'Listening (2.5s)... Speak Continuously'
                        : `Record Sample (${recordedCount + 1}/${requiredSamples})`
                    }
                    onPress={handleRecordSample}
                    isLoading={isRecordingSample}
                    variant={isRecordingSample ? 'danger' : 'primary'}
                    icon={<Mic size={16} color={colors.white} />}
                    style={styles.enrollActionBtn}
                  />
                ) : (
                  <AppButton
                    title={isSaving ? 'Saving Voiceprint...' : 'Save & Authorize Speaker'}
                    onPress={handleFinalizeEnrollment}
                    isLoading={isSaving}
                    variant="primary"
                    icon={<CheckCircle2 size={16} color={colors.white} />}
                    style={styles.enrollActionBtn}
                  />
                )}
              </View>
            )}
          </View>
        }
        ListEmptyComponent={
          !isLoadingSpeakers ? (
            <EmptyState
              icon={MicOff}
              title="No Profiles Loaded"
              description="Speaker profiles could not be loaded."
            />
          ) : undefined
        }
      />
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  listContent: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  headerSection: {
    marginBottom: spacing.xs,
  },
  enrollBannerCard: {
    backgroundColor: 'rgba(14, 165, 233, 0.08)',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(14, 165, 233, 0.28)',
    gap: spacing.md,
  },
  enrollBannerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  enrollBannerTextCol: {
    flex: 1,
  },
  enrollBannerSub: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 17,
  },
  enrollBtn: {
    width: '100%',
  },
  enrollModalCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.primary,
    gap: spacing.sm,
  },
  enrollModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  enrollModalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  enrollStepLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  nameInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.textPrimary,
    fontSize: 14,
  },
  progressDotsRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginVertical: spacing.xs,
  },
  progressBadge: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  progressBadgeDone: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderColor: colors.success,
  },
  progressBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
  },
  progressBadgeTextDone: {
    color: colors.success,
  },
  enrollActionBtn: {
    marginTop: spacing.xs,
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
  customSpeakerCard: {
    borderColor: 'rgba(16, 185, 129, 0.4)',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  customAvatar: {
    borderColor: colors.success,
  },
  infoContainer: {
    flex: 1,
    marginRight: spacing.sm,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  sampleBadge: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primaryLight,
    backgroundColor: colors.primaryMuted,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  tagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
  },
  tagIcon: {
    marginRight: 4,
  },
  tagText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },
});
