import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ScreenContainer, HeaderBar, StatusBadge } from '../../components';
import { useSession } from '../../app/context/SessionContext';
import { colors, spacing, borderRadius, typography } from '../../theme';
import {
  ShieldAlert,
  Mic,
  Cpu,
  GitBranch,
  Terminal,
  Wifi,
  FileCode,
  Sparkles,
  CheckCircle2,
} from 'lucide-react-native';

export const SettingsScreen: React.FC = () => {
  const navigation = useNavigation();
  const { mode, setMode } = useSession();

  return (
    <ScreenContainer>
      <HeaderBar
        title="Settings & System"
        subtitle="Voice Identify Architecture & Engine Mode"
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Engine Mode Switcher Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Cpu size={20} color={colors.primaryLight} />
            <Text style={typography.h3}>Recognition Engine Mode</Text>
          </View>
          <Text style={typography.bodySecondary}>
            Choose whether to run real on-device TensorFlow Lite inference or simulated mock flows.
          </Text>

          <View style={styles.modeOptionGrid}>
            <TouchableOpacity
              style={[styles.modeCard, mode === 'real' && styles.modeCardActive]}
              onPress={() => setMode('real')}
              activeOpacity={0.8}
            >
              <View style={styles.modeCardHeader}>
                <Cpu size={18} color={mode === 'real' ? colors.primaryLight : colors.textMuted} />
                <Text style={[styles.modeCardTitle, mode === 'real' && styles.modeCardTitleActive]}>
                  Real On-Device AI
                </Text>
                {mode === 'real' && <CheckCircle2 size={16} color={colors.primaryLight} />}
              </View>
              <Text style={styles.modeCardDesc}>
                Uses TFLite CNN model (68.7 KB) with 16 kHz Log Mel-Spectrogram feature extraction.
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modeCard, mode === 'mock' && styles.modeCardActive]}
              onPress={() => setMode('mock')}
              activeOpacity={0.8}
            >
              <View style={styles.modeCardHeader}>
                <Sparkles size={18} color={mode === 'mock' ? colors.warning : colors.textMuted} />
                <Text style={[styles.modeCardTitle, mode === 'mock' && styles.modeCardTitleActive]}>
                  Demo Simulation
                </Text>
                {mode === 'mock' && <CheckCircle2 size={16} color={colors.warning} />}
              </View>
              <Text style={styles.modeCardDesc}>
                Runs purely synthetic fixtures for UI testing without microphone access.
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Active Model Specifications */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <ShieldAlert size={20} color={colors.primaryLight} />
            <Text style={typography.h3}>TFLite Model Specifications</Text>
          </View>
          <View style={styles.badgeWrapper}>
            <StatusBadge
              status={mode === 'real' ? 'active' : 'demo'}
              label={mode === 'real' ? 'TFLITE ACTIVE' : 'DEMO MODE'}
            />
          </View>

          <View style={styles.techRow}>
            <Cpu size={16} color={colors.textMuted} />
            <Text style={styles.techLabel}>Architecture:</Text>
            <Text style={styles.techValue}>Depthwise Separable 2D CNN</Text>
          </View>

          <View style={styles.techRow}>
            <FileCode size={16} color={colors.textMuted} />
            <Text style={styles.techLabel}>Model Size:</Text>
            <Text style={styles.techValue}>68.7 KB (Quantized FP32)</Text>
          </View>

          <View style={styles.techRow}>
            <Mic size={16} color={colors.textMuted} />
            <Text style={styles.techLabel}>Audio Format:</Text>
            <Text style={styles.techValue}>16,000 Hz, 16-bit Mono (2.5s window)</Text>
          </View>

          <View style={styles.techRow}>
            <Terminal size={16} color={colors.textMuted} />
            <Text style={styles.techLabel}>Spectrogram:</Text>
            <Text style={styles.techValue}>Log Mel-Spectrogram (158 × 64)</Text>
          </View>

          <View style={styles.techRow}>
            <CheckCircle2 size={16} color={colors.success} />
            <Text style={styles.techLabel}>Test Accuracy:</Text>
            <Text style={[styles.techValue, { color: colors.success }]}>100.0% (4 Enrolled Speakers)</Text>
          </View>
        </View>

        {/* Technical Stack */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Terminal size={20} color={colors.primaryLight} />
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
            <Text style={styles.techValue}>TypeScript (Strict mode) & Kotlin</Text>
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
    marginBottom: spacing.xs,
  },
  badgeWrapper: {
    marginVertical: spacing.sm,
  },
  modeOptionGrid: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  modeCard: {
    backgroundColor: colors.surfaceHover,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  modeCardActive: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(14, 165, 233, 0.08)',
  },
  modeCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: 4,
  },
  modeCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSecondary,
    flex: 1,
  },
  modeCardTitleActive: {
    color: colors.textPrimary,
  },
  modeCardDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
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
