import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../app/navigation/routeTypes';
import { ScreenContainer, AppButton, ResultCard, HeaderBar, StatusBadge } from '../../components';
import { useSession } from '../../app/context/SessionContext';
import { RecognitionResult, RecognitionScenario } from '../../domain/recognition';
import { colors, spacing, borderRadius, typography } from '../../theme';
import {
  Mic,
  RotateCcw,
  History,
  Sparkles,
  Check,
  SlidersHorizontal,
  Cpu,
  Volume2,
  Radio,
} from 'lucide-react-native';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const IdentificationScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { service, addResult, mode, setMode, speakers } = useSession();

  const [selectedScenario, setSelectedScenario] = useState<RecognitionScenario>('random');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [currentResult, setCurrentResult] = useState<RecognitionResult | null>(null);

  const sampleButtons = [
    { label: 'Abror', file: 'sample_abror.wav' },
    { label: 'Dzaki', file: 'sample_dzaki.wav' },
    { label: 'Ishma', file: 'sample_ishma.wav' },
    { label: 'Khairil', file: 'sample_khairil.wav' },
    { label: 'Unknown', file: 'sample_unknown.wav' },
  ];

  // Handle Live Microphone Recording
  const handleRecordLive = async () => {
    if (isLoading || isRecording) return;

    try {
      if (service.checkPermission && service.requestPermission) {
        const hasPerm = await service.checkPermission();
        if (!hasPerm) {
          const granted = await service.requestPermission();
          if (!granted) {
            Alert.alert(
              'Permission Required',
              'Microphone access is required to record 2.5s of audio for speaker recognition.'
            );
            return;
          }
        }
      }

      setIsRecording(true);
      setIsLoading(true);

      if (service.recordAndClassify) {
        const result = await service.recordAndClassify();
        setCurrentResult(result);
        addResult(result);
      } else {
        throw new Error('Real on-device recording is not supported in current mode');
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Unknown recording error';
      Alert.alert('Recording Failed', errMsg);
      const fallbackResult: RecognitionResult = {
        id: `rec-err-${Date.now()}`,
        status: 'error',
        durationMs: 0,
        createdAt: new Date().toISOString(),
        source: 'tflite-device',
        message: `Microphone capture failed: ${errMsg}`,
      };
      setCurrentResult(fallbackResult);
      addResult(fallbackResult);
    } finally {
      setIsRecording(false);
      setIsLoading(false);
    }
  };

  // Handle Quick Test Audio Sample
  const handleTestSample = async (sampleFile: string) => {
    if (isLoading || isRecording) return;

    try {
      setIsLoading(true);
      if (service.classifyAssetSample) {
        const result = await service.classifyAssetSample(sampleFile);
        setCurrentResult(result);
        addResult(result);
      } else {
        throw new Error('Asset classification not supported');
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Sample test failed';
      Alert.alert('Test Failed', errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Mock Simulation
  const handleSimulate = async () => {
    if (isLoading) return;

    try {
      setIsLoading(true);
      const result = await service.simulateRecognition(selectedScenario);
      setCurrentResult(result);
      addResult(result);
    } catch {
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
        subtitle={
          mode === 'real'
            ? 'Real on-device TFLite CNN speaker biometric'
            : 'Simulate on-device speaker recognition'
        }
        badge={<StatusBadge status={mode === 'real' ? 'active' : 'demo'} size="small" />}
      />

      <View style={styles.container}>
        {/* Mode Switcher Tabs */}
        <View style={styles.modeTabsContainer}>
          <TouchableOpacity
            style={[styles.modeTab, mode === 'real' && styles.modeTabActive]}
            onPress={() => setMode('real')}
            disabled={isLoading || isRecording}
          >
            <Cpu size={15} color={mode === 'real' ? colors.primaryLight : colors.textMuted} />
            <Text style={[styles.modeTabText, mode === 'real' && styles.modeTabTextActive]}>
              Real AI (TFLite)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.modeTab, mode === 'mock' && styles.modeTabActive]}
            onPress={() => setMode('mock')}
            disabled={isLoading || isRecording}
          >
            <Sparkles size={15} color={mode === 'mock' ? colors.warning : colors.textMuted} />
            <Text style={[styles.modeTabText, mode === 'mock' && styles.modeTabTextActive]}>
              Demo Simulation
            </Text>
          </TouchableOpacity>
        </View>

        {/* REAL AI MODE VIEW */}
        {mode === 'real' && (
          <>
            {/* Real AI Model Specs Card */}
            <View style={styles.modelInfoCard}>
              <View style={styles.cardHeader}>
                <Cpu size={16} color={colors.primaryLight} />
                <Text style={typography.h3}>Dual-Gate Speaker Verification</Text>
              </View>
              <Text style={styles.modelDescription}>
                5-Class CNN + 64-D Voiceprint Centroids • VAD Silence Gate • Strict Access Control
              </Text>
              <View style={styles.speakerPillsContainer}>
                {speakers.map((spk) => (
                  <View key={spk.id} style={styles.speakerPill}>
                    <Text style={styles.speakerPillText}>{spk.displayName}</Text>
                  </View>
                ))}
                <TouchableOpacity
                  style={[styles.speakerPill, { borderColor: colors.success }]}
                  onPress={() => navigation.navigate('MainTabs', { screen: 'SpeakersTab' })}
                >
                  <Text style={[styles.speakerPillText, { color: colors.success }]}>
                    + Enroll Voice
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Live Microphone Recording Card */}
            <View style={styles.actionCard}>
              <View style={styles.cardHeader}>
                <Mic size={16} color={colors.danger} />
                <Text style={typography.h3}>Live Microphone Capture</Text>
              </View>
              <Text style={styles.cardSubtitle}>
                Records exactly 2.5 seconds of audio, extracts Mel-Spectrogram, and identifies voice biometric.
              </Text>

              <AppButton
                title={
                  isRecording
                    ? 'Listening (2.5s)... Speak Now'
                    : isLoading
                    ? 'Extracting Features & Inferring...'
                    : 'Record Voice (2.5s)'
                }
                onPress={handleRecordLive}
                isLoading={isLoading}
                size="large"
                variant={isRecording ? 'danger' : 'primary'}
                icon={
                  isRecording ? (
                    <Radio size={18} color={colors.white} />
                  ) : (
                    <Mic size={18} color={colors.white} />
                  )
                }
                style={styles.mainActionButton}
              />
            </View>

            {/* Quick Test Audio Samples Card */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Volume2 size={16} color={colors.primaryLight} />
                <Text style={typography.h3}>Quick Test Audio Samples</Text>
              </View>
              <Text style={styles.cardSubtitle}>
                Tap any sample to run actual on-device CNN inference on bundled audio:
              </Text>

              <View style={styles.sampleGrid}>
                {sampleButtons.map((sample) => (
                  <TouchableOpacity
                    key={sample.file}
                    style={styles.sampleButton}
                    onPress={() => handleTestSample(sample.file)}
                    disabled={isLoading || isRecording}
                    activeOpacity={0.7}
                  >
                    <Volume2 size={13} color={colors.primaryLight} />
                    <Text style={styles.sampleButtonText}>{sample.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </>
        )}

        {/* MOCK DEMO MODE VIEW */}
        {mode === 'mock' && (
          <>
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <SlidersHorizontal size={16} color={colors.primaryLight} />
                <Text style={typography.h3}>Simulation Outcome</Text>
              </View>
              <Text style={typography.caption}>
                Select mock outcome to evaluate specific UI states:
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
                style={styles.mainActionButton}
              />
            </View>
          </>
        )}

        {/* Result Section */}
        {currentResult && (
          <View style={styles.resultSection}>
            <View style={styles.resultSectionHeader}>
              <Text style={typography.h3}>
                {mode === 'real' ? 'On-Device AI Classification Result' : 'Current Simulation Result'}
              </Text>
            </View>

            <ResultCard result={currentResult} />

            <View style={styles.resultActions}>
              <AppButton
                title="View History"
                onPress={() => navigation.navigate('MainTabs', { screen: 'HistoryTab' })}
                variant="secondary"
                icon={<History size={16} color={colors.textPrimary} />}
                disabled={isLoading || isRecording}
                style={styles.actionBtn}
              />
              <AppButton
                title="Clear Display"
                onPress={handleReset}
                variant="outline"
                icon={<RotateCcw size={16} color={colors.textSecondary} />}
                disabled={isLoading || isRecording}
                style={styles.actionBtn}
              />
            </View>
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
  modeTabsContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: 3,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  modeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  modeTabActive: {
    backgroundColor: colors.surfaceHover,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  modeTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
  },
  modeTabTextActive: {
    color: colors.textPrimary,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    marginBottom: spacing.lg,
  },
  modelInfoCard: {
    backgroundColor: 'rgba(14, 165, 233, 0.08)',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(14, 165, 233, 0.25)',
    marginBottom: spacing.lg,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  cardSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    lineHeight: 17,
  },
  modelDescription: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  speakerPillsContainer: {
    flexDirection: 'row',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  speakerPill: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primary,
    paddingVertical: 2,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.full,
  },
  speakerPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primaryLight,
  },
  actionCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    marginBottom: spacing.lg,
  },
  mainActionButton: {
    width: '100%',
  },
  sampleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  sampleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceHover,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  sampleButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
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
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceHover,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  scenarioChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceSelected,
  },
  checkIcon: {
    marginRight: spacing.xs,
  },
  scenarioChipText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  scenarioChipTextActive: {
    color: colors.primaryLight,
  },
  simulationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  simulationBannerText: {
    fontSize: 11,
    color: colors.warning,
    flex: 1,
    lineHeight: 15,
  },
  resultSection: {
    marginTop: spacing.xs,
    marginBottom: spacing.xl,
  },
  resultSectionHeader: {
    marginBottom: spacing.sm,
  },
  resultActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  actionBtn: {
    flex: 1,
  },
});
