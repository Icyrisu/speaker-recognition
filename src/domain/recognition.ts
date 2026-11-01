export type RecognitionStatus = 'recognized' | 'unknown' | 'error';

export type RecognitionScenario = 'random' | 'recognized' | 'unknown' | 'error';

export type RecognitionSource = 'mock' | 'tflite-device';

export type RecognitionResult = {
  id: string;
  status: RecognitionStatus;
  speakerId?: string;
  speakerName?: string;
  confidence?: number; // Confidence percentage (0-100)
  durationMs: number;  // Processing or sample duration in ms
  createdAt: string;   // ISO timestamp
  source: RecognitionSource;
  message: string;
  scores?: Record<string, number>;
  inferenceTimeMs?: number;
  preprocessingTimeMs?: number;
  recordingTimeMs?: number;
  sampleName?: string;
};
