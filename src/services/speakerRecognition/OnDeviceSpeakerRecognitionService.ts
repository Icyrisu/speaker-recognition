import { RecognitionResult, RecognitionScenario } from '../../domain/recognition';
import { SpeakerProfile } from '../../domain/speaker';
import { mockSpeakers } from '../../data/mockSpeakers';
import { SpeakerRecognitionService } from './SpeakerRecognitionService';
import { SpeakerRecognitionNative } from '../native/SpeakerRecognitionNative';

export class OnDeviceSpeakerRecognitionService implements SpeakerRecognitionService {
  private speakers: SpeakerProfile[] = mockSpeakers;

  async getSpeakers(): Promise<SpeakerProfile[]> {
    return [...this.speakers];
  }

  async getSpeakerById(id: string): Promise<SpeakerProfile | null> {
    const speaker = this.speakers.find((s) => s.id === id);
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

  async classifyAssetSample(sampleName: string): Promise<RecognitionResult> {
    const res = await SpeakerRecognitionNative.classifyAssetSample(sampleName);
    const id = `rec-tflite-${Date.now()}`;
    const timestamp = new Date().toISOString();
    const confidencePct = Math.round(res.confidence * 100);

    return {
      id,
      status: res.isRecognized ? 'recognized' : 'unknown',
      speakerId: res.isRecognized ? res.speakerId : undefined,
      speakerName: res.isRecognized ? res.speakerName : undefined,
      confidence: confidencePct,
      durationMs: res.inferenceTimeMs + (res.preprocessingTimeMs || 0),
      createdAt: timestamp,
      source: 'tflite-device',
      message: res.isRecognized
        ? `Identified as ${res.speakerName} with ${confidencePct}% confidence by on-device CNN.`
        : `Unrecognized voice (${confidencePct}% confidence below 70% threshold).`,
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

    return {
      id,
      status: res.isRecognized ? 'recognized' : 'unknown',
      speakerId: res.isRecognized ? res.speakerId : undefined,
      speakerName: res.isRecognized ? res.speakerName : undefined,
      confidence: confidencePct,
      durationMs: Math.round(res.durationSeconds * 1000),
      createdAt: timestamp,
      source: 'tflite-device',
      message: res.isRecognized
        ? `Live microphone identified as ${res.speakerName} (${confidencePct}% confidence).`
        : `Live voice unrecognized (${confidencePct}% confidence below threshold).`,
      scores: res.scores,
      inferenceTimeMs: res.inferenceTimeMs,
      preprocessingTimeMs: res.preprocessingTimeMs,
      recordingTimeMs: res.recordingTimeMs,
    };
  }

  async simulateRecognition(_scenario?: RecognitionScenario): Promise<RecognitionResult> {
    // Fallback simulation if called in mock mode
    return await this.classifyAssetSample('sample_abror.wav');
  }
}

export const onDeviceSpeakerService = new OnDeviceSpeakerRecognitionService();

