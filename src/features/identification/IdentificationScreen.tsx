import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../app/navigation/routeTypes';
import { ScreenContainer, AppButton, ResultCard, HeaderBar, StatusBadge } from '../../components';
import { useSession } from '../../app/context/SessionContext';
import { RecognitionResult, RecognitionScenario } from '../../domain/recognition';
import { colors, spacing, borderRadius, typography } from '../../theme';
import { Play, RotateCcw, History, Sparkles, Check, SlidersHorizontal } from 'lucide-react-native';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const IdentificationScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { service, addResult } = useSession();

  const [selectedScenario, setSelectedScenario] = useState<RecognitionScenario>('random');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [currentResult, setCurrentResult] = useState<RecognitionResult | null>(null);

  const handleSimulate = async () => {
    if (isLoading) return;

    try {
      setIsLoading(true);
      const result = await service.simulateRecognition(selectedScenario);
      setCurrentResult(result);
      addResult(result);
    } catch {
      // Fallback unexpected error
      const fallbackResult: RecognitionResult = {
        id: `rec-err-${Date.now()}`,
        status: 'error',
        durationMs: 0,
        createdAt: new Date().toISOString(),
        source: 'mock',
        message: 'An unexpected simulation error occurred.',
      };
      setCurrentResult(fallbackResult);
      addResult(fallbackResult);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setCurrentResult(null);
  };

  const scenarios: { key: RecognitionScenario; label: string }[] = [
    { key: 'random', label: 'Random' },
    { key: 'recognized', label: 'Recognized' },
    { key: 'unknown', label: 'Unknown' },
    { key: 'error', label: 'Error' },
  ];

  return (
    <ScreenContainer scrollable>
      <HeaderBar
        title="Identification"
        subtitle="Simulate on-device speaker recognition"
        badge={<StatusBadge status="demo" size="small" />}
      />

      <View style={styles.container}>
        {/* Scenario Selector Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <SlidersHorizontal size={16} color={colors.primaryLight} />
            <Text style={typography.h3}>Test Scenario</Text>
          </View>
          <Text style={typography.caption}>
            Choose an outcome mode to evaluate specific UI states:
          </Text>

          <View style={styles.scenarioGrid}>
            {scenarios.map((sc) => {
              const isSelected = selectedScenario === sc.key;
              return (
                <TouchableOpacity
                  key={sc.key}
                  style={[styles.scenarioChip, isSelected && styles.scenarioChipActive]}
                  onPress={() => setSelectedScenario(sc.key)}
                  disabled={isLoading}
                  activeOpacity={0.7}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: isSelected }}
                >
                  {isSelected && (
                    <Check size={14} color={colors.primaryLight} style={styles.checkIcon} />
                  )}
                  <Text
                    style={[
                      styles.scenarioChipText,
                      isSelected && styles.scenarioChipTextActive,
                    ]}
                  >
                    {sc.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Action Trigger Card */}
        <View style={styles.actionCard}>
          <View style={styles.simulationBanner}>
            <Sparkles size={16} color={colors.warning} />
            <Text style={styles.simulationBannerText}>
              Mock inference runs locally using synthetic fixtures. No audio recorded.
            </Text>
          </View>

          <AppButton
            title={isLoading ? 'Simulating Recognition...' : 'Simulate Identification'}
            onPress={handleSimulate}
            isLoading={isLoading}
            size="large"
            icon={<Play size={18} color={colors.white} />}
            style={styles.simulateButton}
          />

          {isLoading && (
            <Text style={styles.loadingNote}>
              Extracting synthetic acoustic features & matching...
            </Text>
          )}
        </View>

        {/* Result Section */}
        {currentResult && (
          <View style={styles.resultSection}>
            <View style={styles.resultSectionHeader}>
              <Text style={typography.h3}>Current Simulation Result</Text>
            </View>

            <ResultCard result={currentResult} />

            <View style={styles.resultActions}>
              <AppButton
                title="Run Again"
                onPress={handleSimulate}
                variant="primary"
                icon={<RotateCcw size={16} color={colors.white} />}
                disabled={isLoading}
                style={styles.actionBtn}
              />
              <AppButton
                title="View History"
                onPress={() => navigation.navigate('MainTabs', { screen: 'HistoryTab' })}
                variant="secondary"
                icon={<History size={16} color={colors.textPrimary} />}
                disabled={isLoading}
                style={styles.actionBtn}
              />
            </View>

            <TouchableOpacity
              onPress={handleReset}
              style={styles.clearBtn}
              disabled={isLoading}
            >
              <Text style={styles.clearBtnText}>Clear Current Display</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    marginBottom: spacing.lg,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  scenarioGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  scenarioChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  scenarioChipActive: {
    backgroundColor: colors.primaryMuted,
    borderColor: colors.primary,
  },
  scenarioChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  scenarioChipTextActive: {
    color: colors.primaryLight,
    fontWeight: '700',
  },
  checkIcon: {
    marginRight: spacing.xs,
  },
  actionCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    alignItems: 'center',
  },
  simulationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: borderRadius.md,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  simulationBannerText: {
    fontSize: 11,
    color: colors.warning,
    fontWeight: '600',
    flex: 1,
  },
  simulateButton: {
    width: '100%',
  },
  loadingNote: {
    marginTop: spacing.md,
    fontSize: 12,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  resultSection: {
    marginTop: spacing.xl,
  },
  resultSectionHeader: {
    marginBottom: spacing.xs,
  },
  resultActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  actionBtn: {
    flex: 1,
  },
  clearBtn: {
    alignSelf: 'center',
    marginTop: spacing.md,
    padding: spacing.xs,
  },
  clearBtnText: {
    fontSize: 12,
    color: colors.textMuted,
    textDecorationLine: 'underline',
  },
});

