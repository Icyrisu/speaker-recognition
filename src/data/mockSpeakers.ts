import { SpeakerProfile } from '../domain/speaker';

export const mockSpeakers: SpeakerProfile[] = [
  {
    id: 'spk-001',
    displayName: 'Speaker 01',
    sampleCount: 15,
    description: 'Synthetic profile representing voice archetype A with standard pitch contours.',
    enrolledAt: '2026-10-15T08:30:00Z',
    tags: ['Standard', 'Archetype A'],
  },
  {
    id: 'spk-002',
    displayName: 'Speaker 02',
    sampleCount: 22,
    description: 'Synthetic profile representing voice archetype B with lower resonant formants.',
    enrolledAt: '2026-10-16T11:45:00Z',
    tags: ['Resonant', 'Archetype B'],
  },
  {
    id: 'spk-003',
    displayName: 'Speaker 03',
    sampleCount: 12,
    description: 'Synthetic profile representing voice archetype C with rapid phonetic cadences.',
    enrolledAt: '2026-10-18T14:20:00Z',
    tags: ['Fast Cadence', 'Archetype C'],
  },
  {
    id: 'spk-004',
    displayName: 'Speaker 04',
    sampleCount: 18,
    description: 'Synthetic profile representing voice archetype D with harmonic frequency balance.',
    enrolledAt: '2026-10-20T09:10:00Z',
    tags: ['Harmonic', 'Archetype D'],
  },
  {
    id: 'spk-005',
    displayName: 'Speaker 05',
    sampleCount: 25,
    description: 'Synthetic profile representing baseline calibration reference.',
    enrolledAt: '2026-10-22T16:00:00Z',
    tags: ['Baseline', 'Reference'],
  },
];

