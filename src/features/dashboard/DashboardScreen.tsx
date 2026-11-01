import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../app/navigation/routeTypes';
import { ScreenContainer, AppButton, StatusBadge, ResultCard } from '../../components';
import { useSession } from '../../app/context/SessionContext';
import { colors, spacing, borderRadius, typography } from '../../theme';
import {
  Sparkles,
  Users,
  Settings,
  ArrowRight,
  Info,
  Layers,
  Cpu,
} from 'lucide-react-native';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const DashboardScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { history, speakers, mode } = useSession();

  const latestResult = history[0];

  return (
    <ScreenContainer scrollable>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <View style={styles.branding}>
          <Text style={typography.h1}>Voice Identify</Text>
          <StatusBadge
            status={mode === 'real' ? 'active' : 'demo'}
            label={mode === 'real' ? 'TFLITE ACTIVE' : 'DEMO MODE'}
          />
        </View>
        <TouchableOpacity
          style={styles.settingsIconButton}
          onPress={() => navigation.navigate('Settings')}
          accessibilityRole="button"
          accessibilityLabel="Open settings"
        >
          <Settings size={22} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {/* Notice Card */}
        <View style={[styles.noticeCard, mode === 'real' && styles.realNoticeCard]}>
          {mode === 'real' ? (
            <Cpu size={18} color={colors.primaryLight} style={styles.noticeIcon} />
          ) : (
            <Info size={18} color={colors.info} style={styles.noticeIcon} />
          )}
          <View style={styles.noticeTextContainer}>
            <Text style={[styles.noticeTitle, mode === 'real' && styles.realNoticeTitle]}>
              {mode === 'real'
                ? 'Phase 2: On-Device TFLite CNN Active'
                : 'Demo Simulation Mode'}
            </Text>
            <Text style={styles.noticeBody}>
              {mode === 'real'
                ? 'Ultra-lightweight CNN (68.7 KB) trained on 2,000 voice segments. Real-time microphone & test sample inference available.'
                : 'All recognition flows use simulated data. Switch to Real AI in the Identification tab to test the trained model.'}
            </Text>
          </View>
        </View>

        {/* Primary Action Card */}
        <View style={styles.heroCard}>
          <View style={styles.heroHeader}>
            <View style={styles.heroIconWrapper}>
              {mode === 'real' ? (
                <Cpu size={24} color={colors.primaryLight} />
              ) : (
                <Sparkles size={24} color={colors.primaryLight} />
              )}
            </View>
            <View style={styles.heroTextContainer}>
              <Text style={typography.h2}>Speaker Recognition</Text>
              <Text style={typography.bodySecondary}>
                {mode === 'real'
                  ? 'Identify Abror, Dzaki, Ishma, or Khairil with 16 kHz acoustic biometrics.'
                  : 'Simulate on-device acoustic identification without recording audio.'}
              </Text>
            </View>
          </View>

          <AppButton
            title={mode === 'real' ? 'Start Recognition' : 'Start Identification'}
            onPress={() => navigation.navigate('MainTabs', { screen: 'IdentifyTab' })}
            size="large"
            icon={<ArrowRight size={18} color={colors.white} />}
            style={styles.heroButton}
          />
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <TouchableOpacity
            style={styles.statCard}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('MainTabs', { screen: 'SpeakersTab' })}
          >
            <View style={styles.statIconWrapper}>
              <Users size={20} color={colors.info} />
            </View>
            <Text style={styles.statNumber}>{speakers.length}</Text>
            <Text style={styles.statLabel}>Enrolled Speakers</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.statCard}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('MainTabs', { screen: 'HistoryTab' })}
          >
            <View style={styles.statIconWrapper}>
              <Layers size={20} color={colors.success} />
            </View>
            <Text style={styles.statNumber}>{history.length}</Text>
            <Text style={styles.statLabel}>Inferences Logged</Text>
          </TouchableOpacity>
        </View>

        {/* Latest Activity Section */}
        <View style={styles.sectionHeader}>
          <Text style={typography.h3}>Latest Recognition</Text>
          {history.length > 0 && (
            <TouchableOpacity
              onPress={() => navigation.navigate('MainTabs', { screen: 'HistoryTab' })}
            >
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          )}
        </View>

        {latestResult ? (
          <ResultCard result={latestResult} />
        ) : (
          <View style={styles.emptyRecentCard}>
            <Text style={typography.bodySecondary}>
              No speaker identification has been run yet. Tap Start Recognition above or pick a quick test sample.
            </Text>
          </View>
        )}
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  branding: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  settingsIconButton: {
    padding: spacing.xs,
    borderRadius: borderRadius.md,
  },
  content: {
    padding: spacing.lg,
    paddingTop: spacing.xs,
  },
  noticeCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.2)',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  realNoticeCard: {
    backgroundColor: 'rgba(14, 165, 233, 0.1)',
    borderColor: 'rgba(14, 165, 233, 0.3)',
  },
  noticeIcon: {
    marginRight: spacing.sm,
    marginTop: 2,
  },
  noticeTextContainer: {
    flex: 1,
  },
  noticeTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.info,
    marginBottom: 2,
  },
  realNoticeTitle: {
    color: colors.primaryLight,
  },
  noticeBody: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  heroCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    marginBottom: spacing.lg,
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  heroIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surfaceHover,
    borderWidth: 1,
    borderColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroTextContainer: {
    flex: 1,
  },
  heroButton: {
    width: '100%',
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    alignItems: 'flex-start',
  },
  statIconWrapper: {
    padding: spacing.xs,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surfaceHover,
    marginBottom: spacing.xs,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  statLabel: {
    ...typography.caption,
    marginTop: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  viewAllText: {
    ...typography.caption,
    color: colors.primaryLight,
    fontWeight: '600',
  },
  emptyRecentCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    alignItems: 'center',
  },
});
