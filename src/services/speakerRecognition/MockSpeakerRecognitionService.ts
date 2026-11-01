import { RecognitionResult, RecognitionScenario } from '../../domain/recognition';
import { SpeakerProfile } from '../../domain/speaker';
import { mockSpeakers } from '../../data/mockSpeakers';
import { SpeakerRecognitionService } from './SpeakerRecognitionService';

export class MockSpeakerRecognitionService implements SpeakerRecognitionService {
  private speakers: SpeakerProfile[] = mockSpeakers;

  async getSpeakers(): Promise<SpeakerProfile[]> {
    // Artificial small delay for realistic asynchronous UI feel
    await this.delay(100);
    return [...this.speakers];
  }

  async getSpeakerById(id: string): Promise<SpeakerProfile | null> {
    await this.delay(50);
    const speaker = this.speakers.find((s) => s.id === id);
    return speaker ? { ...speaker } : null;
  }

  async simulateRecognition(scenario: RecognitionScenario = 'random'): Promise<RecognitionResult> {
    // Simulated realistic processing duration between 1000ms - 1500ms
    const simulatedDuration = 1000 + Math.floor(Math.random() * 500);
    await this.delay(simulatedDuration);

    let effectiveScenario = scenario;
    if (effectiveScenario === 'random') {
      const rand = Math.random();
      if (rand < 0.65) {
        effectiveScenario = 'recognized';
      } else if (rand < 0.85) {
        effectiveScenario = 'unknown';
      } else {
        effectiveScenario = 'error';
      }
    }

    const timestamp = new Date().toISOString();
    const id = `rec-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    if (effectiveScenario === 'recognized') {
      const randomSpeaker = this.speakers[Math.floor(Math.random() * this.speakers.length)];
      const simulatedConfidence = 86 + Math.floor(Math.random() * 12); // 86% - 97% illustrative mock value

      return {
        id,
        status: 'recognized',
        speakerId: randomSpeaker.id,
        speakerName: randomSpeaker.displayName,
        confidence: simulatedConfidence,
        durationMs: simulatedDuration,
        createdAt: timestamp,
        source: 'mock',
        message: `Recognized as ${randomSpeaker.displayName} (simulation).`,
      };
    }

    if (effectiveScenario === 'unknown') {
      return {
        id,
        status: 'unknown',
        speakerId: undefined,
        speakerName: undefined,
        confidence: undefined,
        durationMs: simulatedDuration,
        createdAt: timestamp,
        source: 'mock',
        message: 'Speaker not recognized (simulation). Acoustic patterns do not match enrolled profiles.',
      };
    }

    // effectiveScenario === 'error'
    return {
      id,
      status: 'error',
      speakerId: undefined,
      speakerName: undefined,
      confidence: undefined,
      durationMs: simulatedDuration,
      createdAt: timestamp,
      source: 'mock',
      message: 'Simulated inference error: Unable to evaluate acoustic signal features.',
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export const defaultSpeakerService = new MockSpeakerRecognitionService();

