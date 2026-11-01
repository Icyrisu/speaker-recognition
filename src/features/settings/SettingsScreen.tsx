import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ScreenContainer, HeaderBar, StatusBadge } from '../../components';
import { colors, spacing, borderRadius, typography } from '../../theme';
import {
  ShieldAlert,
  MicOff,
  Cpu,
  GitBranch,
  Terminal,
  Wifi,
  FileCode,
} from 'lucide-react-native';

export const SettingsScreen: React.FC = () => {
  const navigation = useNavigation();

  return (
    <ScreenContainer>
      <HeaderBar
        title="Settings & About"
        subtitle="Voice Identify Architecture & Scope"
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Status Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <ShieldAlert size={20} color={colors.warning} />
            <Text style={typography.h3}>System Status</Text>
          </View>
          <View style={styles.badgeWrapper}>
            <StatusBadge status="demo" label="DEMO MODE ACTIVE" />
          </View>
          <Text style={typography.bodySecondary}>
            Phase 1 is strictly dedicated to UI architecture, design tokens, navigation, and mock flow validation.
          </Text>
        </View>

        {/* Phase 1 Boundaries Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MicOff size={20} color={colors.info} />
            <Text style={typography.h3}>Phase 1 Boundaries</Text>
          </View>
          <View style={styles.bulletItem}>
            <Text style={styles.bulletDot}>•</Text>
            <Text style={styles.bulletText}>
              <Text style={styles.bulletBold}>No Audio Permission:</Text> Microphone capture (`RECORD_AUDIO`) is disabled.
            </Text>
          </View>
          <View style={styles.bulletItem}>
            <Text style={styles.bulletDot}>•</Text>
            <Text style={styles.bulletText}>
              <Text style={styles.bulletBold}>No On-Device ML:</Text> TensorFlow Lite, ONNX, and MobileNet binaries are not bundled.
            </Text>
          </View>
          <View style={styles.bulletItem}>
            <Text style={styles.bulletDot}>•</Text>
            <Text style={styles.bulletText}>
              <Text style={styles.bulletBold}>No Cloud / Backend:</Text> All simulation runs strictly in-memory; no network calls or tracking.
            </Text>
          </View>
        </View>

        {/* Technical Stack */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Cpu size={20} color={colors.primaryLight} />
            <Text style={typography.h3}>Technical Foundation</Text>
          </View>

          <View style={styles.techRow}>
            <Terminal size={16} color={colors.textMuted} />
            <Text style={styles.techLabel}>Framework:</Text>
            <Text style={styles.techValue}>React Native Community CLI (0.88)</Text>
          </View>

          <View style={styles.techRow}>
            <FileCode size={16} color={colors.textMuted} />
            <Text style={styles.techLabel}>Language:</Text>
            <Text style={styles.techValue}>TypeScript (Strict mode)</Text>
          </View>

          <View style={styles.techRow}>
            <Wifi size={16} color={colors.textMuted} />
            <Text style={styles.techLabel}>Debugging:</Text>
            <Text style={styles.techValue}>ADB Wireless Debugging & Metro</Text>
          </View>

          <View style={styles.techRow}>
            <GitBranch size={16} color={colors.textMuted} />
            <Text style={styles.techLabel}>Icon System:</Text>
            <Text style={styles.techValue}>Lucide Vector Icons (No emoji)</Text>
          </View>
        </View>

        {/* Future Roadmap Note */}
        <View style={styles.card}>
          <Text style={typography.h3}>Phase 2 Roadmap</Text>
          <Text style={[typography.bodySecondary, { marginTop: spacing.xs }]}>
            Following user approval, subsequent milestones will integrate audio preprocessing (MFCC), MobileNet model training, and on-device model deployment via TFLite.
          </Text>
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
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  badgeWrapper: {
    marginVertical: spacing.xs,
  },
  bulletItem: {
    flexDirection: 'row',
    marginTop: spacing.sm,
    paddingRight: spacing.sm,
  },
  bulletDot: {
    fontSize: 16,
    color: colors.primaryLight,
    marginRight: spacing.sm,
    lineHeight: 20,
  },
  bulletText: {
    flex: 1,
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 19,
  },
  bulletBold: {
    fontWeight: '700',
    color: colors.textPrimary,
  },
  techRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs + 2,
    gap: spacing.sm,
  },
  techLabel: {
    fontSize: 13,
    color: colors.textMuted,
  },
  techValue: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
    flex: 1,
  },
});

