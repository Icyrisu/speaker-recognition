import { NativeModules, PermissionsAndroid, Platform } from 'react-native';

export interface NativeClassificationResult {
  speakerId: string;
  speakerName: string;
  confidence: number;
  cosineSimilarity?: number;
  isRecognized: boolean;
  durationSeconds: number;
  inferenceTimeMs: number;
  preprocessingTimeMs?: number;
  recordingTimeMs?: number;
  rejectionReason?: string;
  scores: Record<string, number>;
}

export interface NativeEnrollmentSampleResult {
  recordedSamples: number;
  rms: number;
  activeFrameRatio: number;
}

export interface NativeCustomSpeaker {
  id: string;
  displayName: string;
  sampleCount: number;
  enrolledAt: string;
  description?: string;
}

const { SpeakerRecognition } = NativeModules;

export class SpeakerRecognitionNative {
  static isAvailable(): boolean {
    return Platform.OS === 'android' && Boolean(SpeakerRecognition);
  }

  static async checkPermission(): Promise<boolean> {
    if (!this.isAvailable()) return false;
    return await SpeakerRecognition.checkPermission();
  }

  static async requestPermission(): Promise<boolean> {
    if (Platform.OS !== 'android') return false;
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        {
          title: 'Microphone Permission Required',
          message:
            'Voice Identify needs access to your microphone to capture 2.5 seconds of voice audio for on-device speaker verification and enrollment.',
          buttonPositive: 'Grant Permission',
          buttonNegative: 'Cancel',
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch {
      return false;
    }
  }

  static async isModelReady(): Promise<boolean> {
    if (!this.isAvailable()) return false;
    return await SpeakerRecognition.isModelReady();
  }

  static async getRegisteredSpeakers(): Promise<string[]> {
    if (!this.isAvailable()) return ['abror', 'dzaki', 'ishma', 'khairil'];
    return await SpeakerRecognition.getRegisteredSpeakers();
  }

  static async getCustomSpeakers(): Promise<NativeCustomSpeaker[]> {
    if (!this.isAvailable() || !SpeakerRecognition.getCustomSpeakers) return [];
    return await SpeakerRecognition.getCustomSpeakers();
  }

  static async recordEnrollmentSample(): Promise<NativeEnrollmentSampleResult> {
    if (!this.isAvailable()) {
      throw new Error('SpeakerRecognition native module is only available on Android');
    }
    return await SpeakerRecognition.recordEnrollmentSample();
  }

  static async finalizeEnrollment(displayName: string): Promise<NativeCustomSpeaker> {
    if (!this.isAvailable()) {
      throw new Error('SpeakerRecognition native module is only available on Android');
    }
    return await SpeakerRecognition.finalizeEnrollment(displayName);
  }

  static async cancelEnrollment(): Promise<boolean> {
    if (!this.isAvailable() || !SpeakerRecognition.cancelEnrollment) return true;
    return await SpeakerRecognition.cancelEnrollment();
  }

  static async deleteCustomSpeaker(speakerId: string): Promise<boolean> {
    if (!this.isAvailable() || !SpeakerRecognition.deleteCustomSpeaker) return false;
    return await SpeakerRecognition.deleteCustomSpeaker(speakerId);
  }

  static async classifyAssetSample(sampleName: string): Promise<NativeClassificationResult> {
    if (!this.isAvailable()) {
      throw new Error('SpeakerRecognition native module is only available on Android');
    }
    return await SpeakerRecognition.classifyAssetSample(sampleName);
  }

  static async recordAndClassify(): Promise<NativeClassificationResult> {
    if (!this.isAvailable()) {
      throw new Error('SpeakerRecognition native module is only available on Android');
    }
    return await SpeakerRecognition.recordAndClassify();
  }
}
