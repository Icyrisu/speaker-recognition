export type RecognitionStatus = 'recognized' | 'unknown' | 'error';

export type RecognitionScenario = 'random' | 'recognized' | 'unknown' | 'error';

export type RecognitionResult = {
  id: string;
  status: RecognitionStatus;
  speakerId?: string;
  speakerName?: string;
  confidence?: number; // Illustrative simulated confidence percentage (0-100)
  durationMs: number;  // Simulated processing time in ms
  createdAt: string;   // ISO timestamp
  source: 'mock';
  message: string;
};

