import { RecognitionResult, RecognitionScenario } from '../../domain/recognition';
import { SpeakerProfile } from '../../domain/speaker';

export interface SpeakerRecognitionService {
  simulateRecognition(scenario?: RecognitionScenario): Promise<RecognitionResult>;
  getSpeakers(): Promise<SpeakerProfile[]>;
  getSpeakerById(id: string): Promise<SpeakerProfile | null>;
  classifyAssetSample?(sampleName: string): Promise<RecognitionResult>;
  recordAndClassify?(): Promise<RecognitionResult>;
  checkPermission?(): Promise<boolean>;
  requestPermission?(): Promise<boolean>;
  isModelReady?(): Promise<boolean>;
}
