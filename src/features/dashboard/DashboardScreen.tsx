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
} from 'lucide-react-native';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const DashboardScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { history, speakers } = useSession();

  const latestResult = history[0];

  return (
    <ScreenContainer scrollable>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <View style={styles.branding}>
          <Text style={typography.h1}>Voice Identify</Text>
          <StatusBadge status="demo" label="DEMO MODE" />
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
        <View style={styles.noticeCard}>
          <Info size={18} color={colors.info} style={styles.noticeIcon} />
          <View style={styles.noticeTextContainer}>
            <Text style={styles.noticeTitle}>Phase 1 UI Prototype</Text>
            <Text style={styles.noticeBody}>
              AI models and audio capture are not yet connected. All recognition flows use simulated data.
            </Text>
          </View>
        </View>

        {/* Primary Action Card */}
        <View style={styles.heroCard}>
          <View style={styles.heroHeader}>
            <View style={styles.heroIconWrapper}>
              <Sparkles size={24} color={colors.primaryLight} />
            </View>
            <View style={styles.heroTextContainer}>
              <Text style={typography.h2}>Speaker Recognition</Text>
              <Text style={typography.bodySecondary}>
                Simulate on-device acoustic identification without recording audio.
              </Text>
            </View>
          </View>

          <AppButton
            title="Start Identification"
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
            <Text style={styles.statLabel}>Sample Profiles</Text>
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
            <Text style={styles.statLabel}>Session Runs</Text>
          </TouchableOpacity>
        </View>

        {/* Latest Activity Section */}
        <View style={styles.sectionHeader}>
          <Text style={typography.h3}>Recent Activity</Text>
          {history.length > 0 && (
            <TouchableOpacity
              onPress={() => navigation.navigate('MainTabs', { screen: 'HistoryTab' })}
            >
              <Text style={[typography.caption, { color: colors.primaryLight }]}>
                View all ({history.length})
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {latestResult ? (
          <ResultCard result={latestResult} />
        ) : (
          <View style={styles.emptyActivityCard}>
            <Text style={typography.bodySecondary}>
              No simulations run in this session yet. Tap "Start Identification" above to test the recognition flow.
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
    gap: spacing.xs,
  },
  settingsIconButton: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  noticeCard: {
    flexDirection: 'row',
    backgroundColor: colors.infoSurface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.25)',
    gap: spacing.sm,
  },
  noticeIcon: {
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
  noticeBody: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 17,
  },
  heroCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    marginTop: spacing.lg,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
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
    backgroundColor: colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(37, 99, 235, 0.3)',
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
    marginTop: spacing.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  statIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  statNumber: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xxl,
    marginBottom: spacing.md,
  },
  emptyActivityCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    alignItems: 'center',
  },
});

