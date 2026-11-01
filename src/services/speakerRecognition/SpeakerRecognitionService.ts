import { RecognitionResult, RecognitionScenario } from '../../domain/recognition';
import { SpeakerProfile } from '../../domain/speaker';

export interface SpeakerRecognitionService {
  simulateRecognition(scenario?: RecognitionScenario): Promise<RecognitionResult>;
  getSpeakers(): Promise<SpeakerProfile[]>;
  getSpeakerById(id: string): Promise<SpeakerProfile | null>;
}

