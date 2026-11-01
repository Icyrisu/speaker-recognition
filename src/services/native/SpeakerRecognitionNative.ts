import { NativeModules, PermissionsAndroid, Platform } from 'react-native';

export interface NativeClassificationResult {
  speakerId: string;
  speakerName: string;
  confidence: number;
  isRecognized: boolean;
  durationSeconds: number;
  inferenceTimeMs: number;
  preprocessingTimeMs?: number;
  recordingTimeMs?: number;
  scores: Record<string, number>;
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
            'Voice Identify needs access to your microphone to capture 2.5 seconds of voice audio for on-device speaker recognition.',
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

