"""
Resilient streaming audio slicer and preprocessor with Voice Activity Detection (VAD)
and open-set impostor/background dataset generation.
Decodes MP3/M4A/WAV, resamples to 16kHz Mono, removes DC offset,
filters silence via RMS + Active Frame Ratio, normalizes peak, and saves 2.5s WAV chunks.
"""

from pathlib import Path
import av
import numpy as np
import scipy.signal as signal
import soundfile as sf

# Target specifications
TARGET_SR = 16000                             # 16 kHz
DURATION_SEC = 2.5                            # 2.5 seconds per clip
CHUNK_SAMPLES = int(TARGET_SR * DURATION_SEC) # 40,000 samples
HOP_SAMPLES = int(CHUNK_SAMPLES * 0.5)        # 20,000 samples
MIN_RMS_THRESHOLD = 500                       # Strict RMS threshold (~ -36 dBFS)
MIN_ACTIVE_FRAME_RATIO = 0.30                 # At least 30% of frames must contain active voice
MAX_SAMPLES_PER_SPEAKER = 500                 # Balanced 500 segments per class

# Paths
BASE_DIR = Path(__file__).resolve().parent.parent.parent
RAW_AUDIO_DIR = Path(r"D:\15-Side\10_App_Voice\suara")
DATASET_DIR = BASE_DIR / "model" / "dataset"

SPEAKERS = {
    "abror": RAW_AUDIO_DIR / "Abror.mp3",
    "dzaki": RAW_AUDIO_DIR / "Dzaki.mp3",
    "ishma": RAW_AUDIO_DIR / "Ishma.m4a",
    "khairil": RAW_AUDIO_DIR / "Khairil.m4a",
}
UNKNOWN_RAW = RAW_AUDIO_DIR / "rekaman.m4a"


def compute_vad_metrics(audio_chunk: np.ndarray) -> tuple[float, float]:
    """Computes overall RMS and active speech frame ratio (25ms frames)."""
    float_chunk = audio_chunk.astype(np.float32)
    float_chunk = float_chunk - np.mean(float_chunk)
    rms = float(np.sqrt(np.mean(float_chunk ** 2)))
    if rms < 1.0:
        return 0.0, 0.0

    # 100 frames of 400 samples (25ms each)
    frames = float_chunk.reshape(100, 400)
    frame_rms = np.sqrt(np.mean(frames ** 2, axis=1))
    active_thresh = max(350.0, 0.25 * rms)
    active_ratio = float(np.mean(frame_rms >= active_thresh))
    return rms, active_ratio


def normalize_peak(audio_chunk: np.ndarray, target_peak: float = 0.90) -> np.ndarray:
    """Removes DC offset and normalizes audio chunk to target peak amplitude."""
    float_chunk = audio_chunk.astype(np.float32)
    float_chunk = float_chunk - np.mean(float_chunk)
    current_peak = np.max(np.abs(float_chunk))
    if current_peak > 0:
        scale = (32767.0 * target_peak) / current_peak
        float_chunk = float_chunk * scale
    return np.clip(float_chunk, -32768, 32767).astype(np.int16)


def process_speaker(speaker_name: str, file_path: Path, max_segments: int):
    """Streams, resamples, filters via VAD, and slices audio with packet error resilience."""
    if not file_path.exists():
        print(f"File not found: {file_path}")
        return

    out_dir = DATASET_DIR / speaker_name
    out_dir.mkdir(parents=True, exist_ok=True)

    existing_files = list(out_dir.glob("*.wav"))
    if len(existing_files) >= max_segments:
        print(f"[{speaker_name.upper()}] Already has {len(existing_files)} segments. Skipping.")
        return

    print(f"Processing {speaker_name.upper()} ({file_path.name})...")
    container = av.open(str(file_path))
    resampler = av.AudioResampler(format="s16", layout="mono", rate=TARGET_SR)

    saved_count = len(existing_files)
    discarded_count = 0
    buffer = np.array([], dtype=np.int16)

    try:
        for packet in container.demux(audio=0):
            if saved_count >= max_segments:
                break
            try:
                for frame in packet.decode():
                    for r_frame in resampler.resample(frame):
                        arr = r_frame.to_ndarray().squeeze()
                        buffer = np.concatenate((buffer, arr)) if buffer.size else arr

                        while len(buffer) >= CHUNK_SAMPLES and saved_count < max_segments:
                            chunk = buffer[:CHUNK_SAMPLES]
                            buffer = buffer[HOP_SAMPLES:]

                            rms, active_ratio = compute_vad_metrics(chunk)
                            if rms >= MIN_RMS_THRESHOLD and active_ratio >= MIN_ACTIVE_FRAME_RATIO:
                                normalized = normalize_peak(chunk)
                                out_file = out_dir / f"{speaker_name}_{saved_count:04d}.wav"
                                sf.write(str(out_file), normalized, TARGET_SR, subtype="PCM_16")
                                saved_count += 1
                                if saved_count % 100 == 0:
                                    print(f"  -> {speaker_name}: {saved_count}/{max_segments} segments saved...")
                            else:
                                discarded_count += 1

            except av.AVError:
                continue

    except Exception as e:
        print(f"  Notice: stopped reading {file_path.name}: {e}")

    print(
        f"  [DONE] {speaker_name.upper()}: {saved_count} segments saved ({discarded_count} low-energy/silence discarded)\n"
    )


def build_diverse_unknown_dataset(target_count: int = 500):
    """
    Builds a comprehensive 500-sample 'unknown' class containing:
    1. 250 real speech segments from rekaman.m4a (external speaker/conversation)
    2. 160 pitch/formant-shifted impostor segments (simulating new speakers on the same microphones)
    3. 90 realistic ambient noise, room hum, pink/brown noise, and mic tap patterns
    """
    unk_dir = DATASET_DIR / "unknown"
    unk_dir.mkdir(parents=True, exist_ok=True)

    existing = sorted(list(unk_dir.glob("*.wav")))
    if len(existing) >= target_count:
        print(f"[UNKNOWN] Already has {len(existing)} segments. Skipping.")
        return

    # Clear partial unknown files to build a clean structured 500-sample unknown set
    for f in existing:
        f.unlink()

    saved = 0

    # Part 1: 250 segments from rekaman.m4a
    if UNKNOWN_RAW.exists():
        print("Building UNKNOWN Part 1/3: Extracting 250 real speech segments from rekaman.m4a...")
        container = av.open(str(UNKNOWN_RAW))
        resampler = av.AudioResampler(format="s16", layout="mono", rate=TARGET_SR)
        buffer = np.array([], dtype=np.int16)
        try:
            for packet in container.demux(audio=0):
                if saved >= 250:
                    break
                try:
                    for frame in packet.decode():
                        for r_frame in resampler.resample(frame):
                            arr = r_frame.to_ndarray().squeeze()
                            buffer = np.concatenate((buffer, arr)) if buffer.size else arr
                            while len(buffer) >= CHUNK_SAMPLES and saved < 250:
                                chunk = buffer[:CHUNK_SAMPLES]
                                buffer = buffer[CHUNK_SAMPLES:]  # Non-overlapping
                                rms, active_ratio = compute_vad_metrics(chunk)
                                if rms >= MIN_RMS_THRESHOLD and active_ratio >= 0.25:
                                    norm = normalize_peak(chunk)
                                    sf.write(str(unk_dir / f"unknown_{saved:04d}.wav"), norm, TARGET_SR, subtype="PCM_16")
                                    saved += 1
                except av.AVError:
                    continue
        except Exception as e:
            print(f"  Notice on rekaman.m4a: {e}")
    print(f"  -> Saved {saved} real unknown speech segments.")

    # Part 2: 160 pitch/formant-shifted impostor voices (40 from each speaker's recording channel)
    # Shifting pitch/formants by +28%, -24%, +35%, -30% creates distinct vocal tract lengths
    # while keeping the exact same microphone channel characteristics (defeating channel shortcut learning!)
    print("Building UNKNOWN Part 2/3: Generating 160 formant-shifted impostor voice segments...")
    shift_factors = [1.26, 0.76, 1.34, 0.72]
    for spk_idx, spk_name in enumerate(SPEAKERS.keys()):
        spk_files = sorted(list((DATASET_DIR / spk_name).glob("*.wav")))
        for i in range(40):
            if saved >= 410 or i >= len(spk_files):
                break
            audio, _ = sf.read(str(spk_files[i * 5]), dtype="int16")
            factor = shift_factors[(spk_idx + i) % len(shift_factors)]
            # Resample to shift formants & fundamental pitch F0
            resampled = signal.resample(audio.astype(np.float32), int(CHUNK_SAMPLES / factor))
            if len(resampled) >= CHUNK_SAMPLES:
                impostor = resampled[:CHUNK_SAMPLES]
            else:
                impostor = np.pad(resampled, (0, CHUNK_SAMPLES - len(resampled)), mode="wrap")
            norm = normalize_peak(impostor)
            sf.write(str(unk_dir / f"unknown_{saved:04d}.wav"), norm, TARGET_SR, subtype="PCM_16")
            saved += 1
    print(f"  -> Total unknown segments after impostor synthesis: {saved}")

    # Part 3: 90 ambient noise / hum / babble / mic-tap segments
    print("Building UNKNOWN Part 3/3: Generating 90 multi-profile noise & non-speech segments...")
    rng = np.random.default_rng(42)
    while saved < target_count:
        mode = saved % 3
        t = np.arange(CHUNK_SAMPLES, dtype=np.float32) / TARGET_SR
        if mode == 0:
            # Pink/Brown room hiss + AC hum (50Hz / 60Hz harmonics)
            white = rng.standard_normal(CHUNK_SAMPLES).astype(np.float32)
            b, a = signal.butter(2, [100 / 8000, 3500 / 8000], btype="band")
            filtered = signal.lfilter(b, a, white)
            hum = 0.3 * np.sin(2 * np.pi * 50 * t) + 0.15 * np.sin(2 * np.pi * 100 * t)
            sig = filtered + hum
        elif mode == 1:
            # Intermittent mic taps / handling thumps + background noise
            sig = rng.standard_normal(CHUNK_SAMPLES).astype(np.float32) * 0.05
            for _ in range(rng.integers(2, 6)):
                pos = rng.integers(1000, CHUNK_SAMPLES - 2000)
                decay = np.exp(-np.arange(1500) / rng.uniform(150, 400))
                thump = decay * np.sin(2 * np.pi * rng.uniform(80, 250) * np.arange(1500) / TARGET_SR)
                sig[pos : pos + 1500] += thump * rng.uniform(0.5, 1.0)
        else:
            # Multi-speaker unintelligible distant babble simulation
            sig = np.zeros(CHUNK_SAMPLES, dtype=np.float32)
            for spk_name in SPEAKERS.keys():
                spk_files = sorted(list((DATASET_DIR / spk_name).glob("*.wav")))
                if spk_files:
                    f_idx = int(rng.integers(0, len(spk_files)))
                    a_clip, _ = sf.read(str(spk_files[f_idx]), dtype="float32")
                    sig += np.roll(a_clip, int(rng.integers(0, CHUNK_SAMPLES))) * 0.25
            # Low-pass muffle like distant room babble
            b, a = signal.butter(2, 900 / 8000, btype="low")
            sig = signal.lfilter(b, a, sig)

        norm = normalize_peak(sig * 10000.0)
        sf.write(str(unk_dir / f"unknown_{saved:04d}.wav"), norm, TARGET_SR, subtype="PCM_16")
        saved += 1

    print(f"  [DONE] UNKNOWN dataset complete: {saved} segments saved.\n")


def main():
    print("=" * 60)
    print("STARTING ROBUST AUDIO STREAMING, VAD & IMPOSTOR SLICING")
    print(f"Target format: {TARGET_SR}Hz, 16-bit Mono, {DURATION_SEC}s per chunk")
    print(f"Output directory: {DATASET_DIR}")
    print("=" * 60)

    for speaker_name, file_path in SPEAKERS.items():
        process_speaker(speaker_name, file_path, MAX_SAMPLES_PER_SPEAKER)

    build_diverse_unknown_dataset(MAX_SAMPLES_PER_SPEAKER)

    print("=" * 60)
    print("ALL DATASET SEGMENTS (4 SPEAKERS + UNKNOWN/IMPOSTOR) READY!")
    print("=" * 60)


if __name__ == "__main__":
    main()
