"""
Resilient streaming audio slicer and preprocessor.
Decodes MP3/M4A/WAV, resamples to 16kHz Mono, ignores corrupted frames,
filters silence via VAD (RMS), normalizes, and saves 2.5s WAV chunks.
"""

from pathlib import Path
import av
import numpy as np
import soundfile as sf

# Target specifications
TARGET_SR = 16000          # 16 kHz
DURATION_SEC = 2.5         # 2.5 seconds per clip
CHUNK_SAMPLES = int(TARGET_SR * DURATION_SEC) # 40,000 samples
HOP_SAMPLES = int(CHUNK_SAMPLES * 0.5)        # 20,000 samples (50% overlap)
MIN_RMS_THRESHOLD = 300    # Threshold to discard silence / quiet background
MAX_SAMPLES_PER_SPEAKER = 500 # Balanced count per speaker

# Paths
BASE_DIR = Path(__file__).resolve().parent.parent.parent
RAW_AUDIO_DIR = Path(r"D:\15-Side\10_App_Voice\suara")
DATASET_DIR = BASE_DIR / "model" / "dataset"

SPEAKERS = {
    "abror": RAW_AUDIO_DIR / "Abror.mp3",
    "dzaki": RAW_AUDIO_DIR / "Dzaki.mp3",
    "ishma": RAW_AUDIO_DIR / "Ishma.m4a",
    "khairil": RAW_AUDIO_DIR / "Khairil.m4a",
    "unknown": RAW_AUDIO_DIR / "rekaman.m4a",
}


def calculate_rms(audio_chunk: np.ndarray) -> float:
    """Calculates Root Mean Square (RMS) energy of an audio segment."""
    float_chunk = audio_chunk.astype(np.float32)
    return float(np.sqrt(np.mean(float_chunk ** 2)))


def normalize_peak(audio_chunk: np.ndarray, target_peak: float = 0.90) -> np.ndarray:
    """Normalizes audio chunk to target peak amplitude."""
    float_chunk = audio_chunk.astype(np.float32)
    current_peak = np.max(np.abs(float_chunk))
    if current_peak > 0:
        scale = (32767.0 * target_peak) / current_peak
        float_chunk = float_chunk * scale
    return np.clip(float_chunk, -32768, 32767).astype(np.int16)


def process_speaker(speaker_name: str, file_path: Path, max_segments: int):
    """Streams, resamples, filters, and slices audio directly with packet error resilience."""
    if not file_path.exists():
        print(f"File not found: {file_path}")
        return

    out_dir = DATASET_DIR / speaker_name
    out_dir.mkdir(parents=True, exist_ok=True)

    # Check existing count in case of resume
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

                        # Check if we have enough samples for at least one chunk
                        while len(buffer) >= CHUNK_SAMPLES and saved_count < max_segments:
                            chunk = buffer[:CHUNK_SAMPLES]
                            buffer = buffer[HOP_SAMPLES:]

                            rms = calculate_rms(chunk)
                            if rms >= MIN_RMS_THRESHOLD:
                                normalized = normalize_peak(chunk)
                                out_file = out_dir / f"{speaker_name}_{saved_count:04d}.wav"
                                sf.write(str(out_file), normalized, TARGET_SR, subtype="PCM_16")
                                saved_count += 1
                                if saved_count % 100 == 0:
                                    print(f"  -> {speaker_name}: {saved_count}/{max_segments} segments saved...")
                            else:
                                discarded_count += 1

            except av.AVError:
                # Skip corrupted packets without crashing
                continue

    except Exception as e:
        print(f"  Notice: stopped reading {file_path.name}: {e}")

    print(
        f"  [DONE] {speaker_name.upper()}: {saved_count} segments saved ({discarded_count} silence discarded)\n"
    )


def main():
    print("=" * 60)
    print("STARTING ROBUST AUDIO STREAMING & SLICING")
    print(f"Target format: {TARGET_SR}Hz, 16-bit Mono, {DURATION_SEC}s per chunk")
    print(f"Output directory: {DATASET_DIR}")
    print("=" * 60)

    for speaker_name, file_path in SPEAKERS.items():
        limit = 100 if speaker_name == "unknown" else MAX_SAMPLES_PER_SPEAKER
        process_speaker(speaker_name, file_path, limit)

    print("=" * 60)
    print("ALL DATASET SEGMENTS CREATED SUCCESSFULLY!")
    print("=" * 60)


if __name__ == "__main__":
    main()
