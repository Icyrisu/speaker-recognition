import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, borderRadius, typography } from '../theme';
import { RecognitionResult } from '../domain/recognition';
import { StatusBadge } from './StatusBadge';
import { Clock, Cpu, Sparkles, User, AlertCircle, BarChart2, ShieldAlert } from 'lucide-react-native';

interface ResultCardProps {
  result: RecognitionResult;
  compact?: boolean;
}

export const ResultCard: React.FC<ResultCardProps> = ({ result, compact = false }) => {
  const isRecognized = result.status === 'recognized';
  const isUnknown = result.status === 'unknown';
  const isError = result.status === 'error';
  const isRealAI = result.source === 'tflite-device';

  const formattedDate = new Date(result.createdAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  return (
    <View style={[styles.card, compact && styles.cardCompact]}>
      {/* Banner */}
      <View style={[styles.disclaimerBanner, isRealAI && styles.realAiBanner]}>
        {isRealAI ? (
          <Cpu size={12} color={colors.primaryLight} />
        ) : (
          <Sparkles size={12} color={colors.warning} />
        )}
        <Text style={[styles.disclaimerText, isRealAI && styles.realAiBannerText]}>
          {isRealAI
            ? 'ON-DEVICE DUAL-GATE BIOMETRIC VERIFICATION'
            : 'SIMULATED RESULT — NOT REAL AI'}
        </Text>
      </View>

      <View style={styles.content}>
        {/* Header row with Status and Time */}
        <View style={styles.headerRow}>
          <StatusBadge
            status={result.status}
            label={
              isRecognized
                ? 'ACCESS GRANTED'
                : isUnknown
                ? 'ACCESS DENIED'
                : 'ERROR'
            }
            size={compact ? 'small' : 'medium'}
          />
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
                  {result.speakerName || 'Authorized Speaker'}
                </Text>
                <Text style={typography.caption}>
                  ID: {result.speakerId} • {isRealAI ? 'Verified Voiceprint' : 'Simulated Match'}
                </Text>
              </View>
            </View>
          )}

          {isUnknown && (
            <View style={styles.unrecognizedContainer}>
              <View style={styles.unrecognizedHeader}>
                <ShieldAlert size={18} color={colors.warning} />
                <Text style={[typography.h3, { color: colors.warning }]}>
                  Speaker Not Authorized / Unknown
                </Text>
              </View>
              <Text style={typography.bodySecondary}>
                {result.rejectionReason
                  ? result.rejectionReason
                  : isRealAI
                  ? 'Voice biometric did not pass the Dual-Gate threshold (Softmax >= 80% & Voiceprint Centroid Similarity).'
                  : 'Simulation result indicates acoustic patterns do not match enrolled profiles.'}
              </Text>
            </View>
          )}

          {isError && (
            <View style={styles.errorContainer}>
              <View style={styles.errorHeader}>
                <AlertCircle size={16} color={colors.danger} />
                <Text style={[typography.h3, { color: colors.danger }]}>
                  {isRealAI ? 'Inference Error' : 'Simulation Error'}
                </Text>
              </View>
              <Text style={typography.bodySecondary}>{result.message}</Text>
            </View>
          )}
        </View>

        {/* Metrics Footer */}
        {!compact && (
          <View style={styles.metricsFooter}>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>
                {isRealAI ? 'Verify Score' : 'Simulated Conf'}
              </Text>
              <Text style={styles.metricValue}>
                {result.confidence !== undefined ? `${result.confidence}%` : 'N/A'}
              </Text>
            </View>
            {isRealAI && result.cosineSimilarity !== undefined && (
              <>
                <View style={styles.divider} />
                <View style={styles.metricItem}>
                  <Text style={styles.metricLabel}>Centroid Sim</Text>
                  <Text style={styles.metricValue}>{result.cosineSimilarity}%</Text>
                </View>
              </>
            )}
            <View style={styles.divider} />
            <View style={styles.metricItem}>
              <View style={styles.labelWithIcon}>
                <Cpu size={11} color={colors.textMuted} style={styles.metricIcon} />
                <Text style={styles.metricLabel}>
                  {isRealAI ? 'Latency' : 'Process Time'}
                </Text>
              </View>
              <Text style={styles.metricValue}>
                {result.inferenceTimeMs !== undefined
                  ? `${result.inferenceTimeMs + (result.preprocessingTimeMs || 0)}ms`
                  : `${result.durationMs}ms`}
              </Text>
            </View>
          </View>
        )}

        {/* Probability Breakdown for Real AI */}
        {!compact && isRealAI && result.scores && (
          <View style={styles.scoreBreakdownContainer}>
            <View style={styles.scoreHeader}>
              <BarChart2 size={13} color={colors.textMuted} />
              <Text style={styles.scoreHeaderText}>Class & Voiceprint Scores</Text>
            </View>
            <View style={styles.scoresGrid}>
              {Object.entries(result.scores).map(([speaker, score]) => {
                const pct = Math.round(score * 100);
                const isWinner =
                  isRecognized && result.speakerName?.toLowerCase() === speaker.toLowerCase();
                return (
                  <View
                    key={speaker}
                    style={[styles.scoreChip, isWinner && styles.scoreChipWinner]}
                  >
                    <Text
                      style={[styles.scoreChipName, isWinner && styles.scoreChipNameWinner]}
                      numberOfLines={1}
                    >
                      {speaker.toUpperCase()}
                    </Text>
                    <Text
                      style={[styles.scoreChipValue, isWinner && styles.scoreChipValueWinner]}
                    >
                      {pct}%
                    </Text>
                  </View>
                );
              })}
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
  },
  cardCompact: {
    borderRadius: borderRadius.md,
  },
  disclaimerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(245, 158, 11, 0.2)',
  },
  realAiBanner: {
    backgroundColor: 'rgba(14, 165, 233, 0.12)',
    borderBottomColor: 'rgba(14, 165, 233, 0.25)',
  },
  disclaimerText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.warning,
    letterSpacing: 0.5,
  },
  realAiBannerText: {
    color: colors.primaryLight,
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
    gap: spacing.xs,
  },
  timeText: {
    ...typography.caption,
    fontSize: 11,
  },
  identityContainer: {
    marginVertical: spacing.xs,
  },
  speakerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surfaceHover,
    borderWidth: 1,
    borderColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  speakerTextContainer: {
    flex: 1,
  },
  unrecognizedContainer: {
    paddingVertical: spacing.xs,
  },
  unrecognizedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: 4,
  },
  errorContainer: {
    paddingVertical: spacing.xs,
  },
  errorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  metricsFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceBorder,
  },
  metricItem: {
    alignItems: 'center',
    flex: 1,
  },
  labelWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metricIcon: {
    marginRight: 3,
  },
  metricLabel: {
    fontSize: 10,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    fontWeight: '600',
  },
  metricValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 2,
  },
  divider: {
    width: 1,
    height: 24,
    backgroundColor: colors.surfaceBorder,
  },
  scoreBreakdownContainer: {
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceBorder,
  },
  scoreHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  scoreHeaderText: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  scoresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  scoreChip: {
    minWidth: '18%',
    flex: 1,
    backgroundColor: colors.surfaceHover,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xs,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  scoreChipWinner: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: colors.success,
  },
  scoreChipName: {
    fontSize: 9,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  scoreChipNameWinner: {
    color: colors.success,
    fontWeight: '700',
  },
  scoreChipValue: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 1,
  },
  scoreChipValueWinner: {
    color: colors.success,
  },
});
