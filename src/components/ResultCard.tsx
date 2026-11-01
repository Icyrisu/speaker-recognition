import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, borderRadius, typography } from '../theme';
import { RecognitionResult } from '../domain/recognition';
import { StatusBadge } from './StatusBadge';
import { Clock, Cpu, Sparkles, User, AlertCircle } from 'lucide-react-native';

interface ResultCardProps {
  result: RecognitionResult;
  compact?: boolean;
}

export const ResultCard: React.FC<ResultCardProps> = ({ result, compact = false }) => {
  const isRecognized = result.status === 'recognized';
  const isUnknown = result.status === 'unknown';
  const isError = result.status === 'error';

  const formattedDate = new Date(result.createdAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  return (
    <View style={[styles.card, compact && styles.cardCompact]}>
      {/* Disclaimer Banner */}
      <View style={styles.disclaimerBanner}>
        <Sparkles size={12} color={colors.warning} />
        <Text style={styles.disclaimerText}>
          SIMULATED RESULT — NOT REAL AI
        </Text>
      </View>

      <View style={styles.content}>
        {/* Header row with Status and Time */}
        <View style={styles.headerRow}>
          <StatusBadge status={result.status} size={compact ? 'small' : 'medium'} />
          <View style={styles.timeRow}>
            <Clock size={12} color={colors.textMuted} />
            <Text style={styles.timeText}>{formattedDate}</Text>
          </View>
        </View>

        {/* Identity section */}
        <View style={styles.identityContainer}>
          {isRecognized && (
            <View style={styles.speakerRow}>
              <View style={styles.avatar}>
                <User size={compact ? 16 : 22} color={colors.primaryLight} />
              </View>
              <View style={styles.speakerTextContainer}>
                <Text style={compact ? typography.h3 : typography.h2}>
                  {result.speakerName || 'Speaker'}
                </Text>
                <Text style={typography.caption}>
                  ID: {result.speakerId} • Match Profile
                </Text>
              </View>
            </View>
          )}

          {isUnknown && (
            <View style={styles.unrecognizedContainer}>
              <Text style={[typography.h3, { color: colors.warning }]}>
                Speaker Not Recognized
              </Text>
              <Text style={typography.bodySecondary}>
                Simulation result indicates acoustic patterns do not match enrolled profiles.
              </Text>
            </View>
          )}

          {isError && (
            <View style={styles.errorContainer}>
              <View style={styles.errorHeader}>
                <AlertCircle size={16} color={colors.danger} />
                <Text style={[typography.h3, { color: colors.danger }]}>
                  Simulation Error
                </Text>
              </View>
              <Text style={typography.bodySecondary}>{result.message}</Text>
            </View>
          )}
        </View>

        {/* Metrics Footer (Simulated) */}
        {!compact && (
          <View style={styles.metricsFooter}>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Simulated Confidence</Text>
              <Text style={styles.metricValue}>
                {result.confidence ? `${result.confidence}%` : 'N/A'}
              </Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.metricItem}>
              <View style={styles.labelWithIcon}>
                <Cpu size={11} color={colors.textMuted} style={styles.metricIcon} />
                <Text style={styles.metricLabel}>Process Time</Text>
              </View>
              <Text style={styles.metricValue}>{result.durationMs} ms</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Source</Text>
              <Text style={[styles.metricValue, { color: colors.info }]}>Mock Fixture</Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    overflow: 'hidden',
    marginVertical: spacing.sm,
  },
  cardCompact: {
    marginVertical: spacing.xs,
  },
  disclaimerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(245, 158, 11, 0.25)',
  },
  disclaimerText: {
    color: colors.warning,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  content: {
    padding: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  identityContainer: {
    marginBottom: spacing.sm,
  },
  speakerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  speakerTextContainer: {
    flex: 1,
  },
  unrecognizedContainer: {
    gap: spacing.xs,
  },
  errorContainer: {
    gap: spacing.xs,
  },
  errorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  metricsFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.md,
    marginTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceBorder,
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  labelWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metricIcon: {
    marginRight: 3,
  },
  metricLabel: {
    fontSize: 11,
    color: colors.textMuted,
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  divider: {
    width: 1,
    height: 24,
    backgroundColor: colors.surfaceBorder,
  },
});

