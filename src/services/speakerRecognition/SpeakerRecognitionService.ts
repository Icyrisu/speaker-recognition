import { RecognitionResult, RecognitionScenario } from '../../domain/recognition';
import { SpeakerProfile } from '../../domain/speaker';
import { NativeEnrollmentSampleResult } from '../native/SpeakerRecognitionNative';

export interface SpeakerRecognitionService {
  simulateRecognition(scenario?: RecognitionScenario): Promise<RecognitionResult>;
  getSpeakers(): Promise<SpeakerProfile[]>;
  getSpeakerById(id: string): Promise<SpeakerProfile | null>;
  classifyAssetSample?(sampleName: string): Promise<RecognitionResult>;
  recordAndClassify?(): Promise<RecognitionResult>;
  checkPermission?(): Promise<boolean>;
  requestPermission?(): Promise<boolean>;
  isModelReady?(): Promise<boolean>;
  recordEnrollmentSample?(): Promise<NativeEnrollmentSampleResult>;
  finalizeEnrollment?(displayName: string): Promise<SpeakerProfile>;
  cancelEnrollment?(): Promise<boolean>;
  deleteCustomSpeaker?(speakerId: string): Promise<boolean>;
}
