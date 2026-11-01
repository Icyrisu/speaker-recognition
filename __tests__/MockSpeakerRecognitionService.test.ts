import { MockSpeakerRecognitionService } from '../src/services/speakerRecognition/MockSpeakerRecognitionService';

describe('MockSpeakerRecognitionService', () => {
  let service: MockSpeakerRecognitionService;

  beforeEach(() => {
    service = new MockSpeakerRecognitionService();
  });

  it('retrieves mock speaker profiles', async () => {
    const speakers = await service.getSpeakers();
    expect(speakers.length).toBeGreaterThan(0);
    expect(speakers[0]).toHaveProperty('displayName');
    expect(speakers[0]).toHaveProperty('sampleCount');
  });

  it('retrieves a speaker by ID', async () => {
    const speaker = await service.getSpeakerById('spk-001');
    expect(speaker).not.toBeNull();
    expect(speaker?.displayName).toBe('Speaker 01');
  });

  it('simulates a recognized speaker scenario correctly', async () => {
    const result = await service.simulateRecognition('recognized');
    expect(result.status).toBe('recognized');
    expect(result.source).toBe('mock');
    expect(result.speakerId).toBeDefined();
    expect(result.speakerName).toBeDefined();
    expect(result.confidence).toBeGreaterThanOrEqual(80);
    expect(result.durationMs).toBeGreaterThan(0);
  });

  it('simulates an unknown speaker scenario without speaker ID', async () => {
    const result = await service.simulateRecognition('unknown');
    expect(result.status).toBe('unknown');
    expect(result.source).toBe('mock');
    expect(result.speakerId).toBeUndefined();
    expect(result.speakerName).toBeUndefined();
    expect(result.confidence).toBeUndefined();
  });

  it('simulates an error scenario with descriptive message', async () => {
    const result = await service.simulateRecognition('error');
    expect(result.status).toBe('error');
    expect(result.source).toBe('mock');
    expect(result.message).toContain('error');
  });
});

