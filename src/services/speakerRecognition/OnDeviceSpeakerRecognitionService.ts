import { RecognitionResult, RecognitionScenario } from '../../domain/recognition';
import { SpeakerProfile } from '../../domain/speaker';
import { mockSpeakers } from '../../data/mockSpeakers';
import { SpeakerRecognitionService } from './SpeakerRecognitionService';
import {
  NativeEnrollmentSampleResult,
  SpeakerRecognitionNative,
} from '../native/SpeakerRecognitionNative';

export class OnDeviceSpeakerRecognitionService implements SpeakerRecognitionService {
  private baseSpeakers: SpeakerProfile[] = mockSpeakers;

  async getSpeakers(): Promise<SpeakerProfile[]> {
    try {
      const customList = await SpeakerRecognitionNative.getCustomSpeakers();
      const customProfiles: SpeakerProfile[] = customList.map((c) => ({
        id: c.id,
        displayName: c.displayName,
        sampleCount: c.sampleCount,
        description:
          c.description ||
          `On-device enrolled speaker voiceprint (${c.sampleCount} recorded samples, 64-D L2 centroid).`,
        enrolledAt: c.enrolledAt || new Date().toISOString(),
        tags: ['Custom Enrolled', 'Voiceprint Centroid', '16 kHz'],
        isCustomEnrolled: true,
      }));
      return [...this.baseSpeakers, ...customProfiles];
    } catch {
      return [...this.baseSpeakers];
    }
  }

  async getSpeakerById(id: string): Promise<SpeakerProfile | null> {
    const all = await this.getSpeakers();
    const speaker = all.find((s) => s.id === id);
    return speaker ? { ...speaker } : null;
  }

  async isModelReady(): Promise<boolean> {
    return await SpeakerRecognitionNative.isModelReady();
  }

  async checkPermission(): Promise<boolean> {
    return await SpeakerRecognitionNative.checkPermission();
  }

  async requestPermission(): Promise<boolean> {
    return await SpeakerRecognitionNative.requestPermission();
  }

  async recordEnrollmentSample(): Promise<NativeEnrollmentSampleResult> {
    return await SpeakerRecognitionNative.recordEnrollmentSample();
  }

  async finalizeEnrollment(displayName: string): Promise<SpeakerProfile> {
    const created = await SpeakerRecognitionNative.finalizeEnrollment(displayName);
    return {
      id: created.id,
      displayName: created.displayName,
      sampleCount: created.sampleCount,
      description: `On-device enrolled speaker voiceprint (${created.sampleCount} samples, 64-D L2 centroid).`,
      enrolledAt: created.enrolledAt,
      tags: ['Custom Enrolled', 'Voiceprint Centroid', '16 kHz'],
      isCustomEnrolled: true,
    };
  }

  async cancelEnrollment(): Promise<boolean> {
    return await SpeakerRecognitionNative.cancelEnrollment();
  }

  async deleteCustomSpeaker(speakerId: string): Promise<boolean> {
    return await SpeakerRecognitionNative.deleteCustomSpeaker(speakerId);
  }

  async classifyAssetSample(sampleName: string): Promise<RecognitionResult> {
    const res = await SpeakerRecognitionNative.classifyAssetSample(sampleName);
    const id = `rec-tflite-${Date.now()}`;
    const timestamp = new Date().toISOString();
    const confidencePct = Math.round(res.confidence * 100);
    const cosSimPct = res.cosineSimilarity !== undefined ? Math.round(res.cosineSimilarity * 100) : undefined;

    return {
      id,
      status: res.isRecognized ? 'recognized' : 'unknown',
      speakerId: res.isRecognized ? res.speakerId : undefined,
      speakerName: res.isRecognized ? res.speakerName : undefined,
      confidence: confidencePct,
      cosineSimilarity: cosSimPct,
      durationMs: res.inferenceTimeMs + (res.preprocessingTimeMs || 0),
      createdAt: timestamp,
      source: 'tflite-device',
      rejectionReason: res.rejectionReason,
      message: res.isRecognized
        ? `Access Granted: Verified as ${res.speakerName} (${confidencePct}% confidence, ${cosSimPct ?? confidencePct}% voiceprint match).`
        : res.rejectionReason || `Access Denied: Voice does not match authorized speakers.`,
      scores: res.scores,
      inferenceTimeMs: res.inferenceTimeMs,
      preprocessingTimeMs: res.preprocessingTimeMs,
      sampleName,
    };
  }

  async recordAndClassify(): Promise<RecognitionResult> {
    const res = await SpeakerRecognitionNative.recordAndClassify();
    const id = `rec-tflite-${Date.now()}`;
    const timestamp = new Date().toISOString();
    const confidencePct = Math.round(res.confidence * 100);
    const cosSimPct = res.cosineSimilarity !== undefined ? Math.round(res.cosineSimilarity * 100) : undefined;

    return {
      id,
      status: res.isRecognized ? 'recognized' : 'unknown',
      speakerId: res.isRecognized ? res.speakerId : undefined,
      speakerName: res.isRecognized ? res.speakerName : undefined,
      confidence: confidencePct,
      cosineSimilarity: cosSimPct,
      durationMs: Math.round(res.durationSeconds * 1000),
      createdAt: timestamp,
      source: 'tflite-device',
      rejectionReason: res.rejectionReason,
      message: res.isRecognized
        ? `Access Granted: Live voice verified as ${res.speakerName} (${confidencePct}% score, ${cosSimPct ?? confidencePct}% centroid match).`
        : res.rejectionReason || `Access Denied: Unrecognized speaker or insufficient biometric similarity.`,
      scores: res.scores,
      inferenceTimeMs: res.inferenceTimeMs,
      preprocessingTimeMs: res.preprocessingTimeMs,
      recordingTimeMs: res.recordingTimeMs,
    };
  }

  async simulateRecognition(_scenario?: RecognitionScenario): Promise<RecognitionResult> {
    return await this.classifyAssetSample('sample_abror.wav');
  }
}

export const onDeviceSpeakerService = new OnDeviceSpeakerRecognitionService();
