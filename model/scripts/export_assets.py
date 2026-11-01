"""
Export script to package model, mel filterbank, and test samples
directly into the Android assets directory:
android/app/src/main/assets/
"""

import os
import shutil
import json
from pathlib import Path
import numpy as np
import scipy.signal as signal
import soundfile as sf
import tensorflow as tf

BASE_DIR = Path(__file__).resolve().parent.parent.parent
DATASET_DIR = BASE_DIR / "model" / "dataset"
EXPORTED_DIR = BASE_DIR / "model" / "exported"
ASSETS_DIR = BASE_DIR / "android" / "app" / "src" / "main" / "assets"
ASSETS_DIR.mkdir(parents=True, exist_ok=True)
TEST_SAMPLES_DIR = ASSETS_DIR / "test_samples"
TEST_SAMPLES_DIR.mkdir(parents=True, exist_ok=True)

SAMPLE_RATE = 16000
N_FFT = 512
HOP_LENGTH = 256
N_MELS = 64
F_MIN = 80.0
F_MAX = 7600.0
CLASSES = ["abror", "dzaki", "ishma", "khairil"]

def get_mel_filter_bank():
    def hz_to_mel(hz):
        return 2595.0 * np.log10(1.0 + hz / 700.0)

    def mel_to_hz(mel):
        return 700.0 * (10.0 ** (mel / 2595.0) - 1.0)

    mel_min = hz_to_mel(F_MIN)
    mel_max = hz_to_mel(F_MAX)
    mel_points = np.linspace(mel_min, mel_max, N_MELS + 2)
    hz_points = mel_to_hz(mel_points)
    bin_points = np.floor((N_FFT + 1) * hz_points / SAMPLE_RATE).astype(int)

    fbank = np.zeros((N_MELS, int(N_FFT // 2 + 1)), dtype=np.float32)
    for i in range(1, N_MELS + 1):
        for j in range(bin_points[i - 1], bin_points[i]):
            fbank[i - 1, j] = (j - bin_points[i - 1]) / max(1, bin_points[i] - bin_points[i - 1])
        for j in range(bin_points[i], bin_points[i + 1]):
            fbank[i - 1, j] = (bin_points[i + 1] - j) / max(1, bin_points[i + 1] - bin_points[i])
    return fbank

def main():
    print("=== Exporting Android Assets ===")

    # 1. Copy TFLite model and config
    tflite_src = EXPORTED_DIR / "speaker_model.tflite"
    tflite_dst = ASSETS_DIR / "speaker_model.tflite"
    shutil.copyfile(tflite_src, tflite_dst)
    print(f"Copied TFLite model: {tflite_dst} ({tflite_dst.stat().st_size} bytes)")

    config_src = EXPORTED_DIR / "model_config.json"
    config_dst = ASSETS_DIR / "model_config.json"
    shutil.copyfile(config_src, config_dst)
    print(f"Copied Config: {config_dst}")

    # 2. Export Mel Filterbank as raw binary float32 (shape: 64 x 257 = 16448 floats)
    mel_fbank = get_mel_filter_bank()
    mel_bin_path = ASSETS_DIR / "mel_filters.bin"
    mel_fbank.tofile(str(mel_bin_path))
    print(f"Exported Mel filterbank: {mel_bin_path} (shape: {mel_fbank.shape}, {mel_bin_path.stat().st_size} bytes)")

    # 3. Export 1 test sample per speaker and 1 unknown sample
    sample_mapping = {
        "abror": "sample_abror.wav",
        "dzaki": "sample_dzaki.wav",
        "ishma": "sample_ishma.wav",
        "khairil": "sample_khairil.wav",
        "unknown": "sample_unknown.wav"
    }

    test_vectors = {}

    # Initialize TFLite interpreter for verification
    interpreter = tf.lite.Interpreter(model_path=str(tflite_dst))
    interpreter.allocate_tensors()
    input_details = interpreter.get_input_details()
    output_details = interpreter.get_output_details()

    for cls_name, dst_name in sample_mapping.items():
        src_dir = DATASET_DIR / cls_name
        files = sorted(list(src_dir.glob("*.wav")))
        if not files:
            print(f"Warning: No files for {cls_name}")
            continue
        
        # Pick file index 50 (from test set partition)
        sample_file = files[min(50, len(files) - 1)]
        dst_path = TEST_SAMPLES_DIR / dst_name
        shutil.copyfile(sample_file, dst_path)

        # Compute log mel spec and test TFLite inference
        audio, sr = sf.read(str(sample_file))
        _, _, zxx = signal.stft(audio, fs=SAMPLE_RATE, nperseg=N_FFT, noverlap=N_FFT - HOP_LENGTH, nfft=N_FFT)
        spec = np.abs(zxx)
        mel = np.dot(mel_fbank, spec)
        log_mel = np.log(mel + 1e-6)
        mean = np.mean(log_mel)
        std = np.std(log_mel) + 1e-7
        norm_mel = (log_mel - mean) / std
        input_data = np.transpose(norm_mel, (1, 0)) # (158, 64)
        input_data = np.expand_dims(input_data, axis=0) # (1, 158, 64)
        input_data = np.expand_dims(input_data, axis=-1).astype(np.float32) # (1, 158, 64, 1)

        interpreter.set_tensor(input_details[0]['index'], input_data)
        interpreter.invoke()
        output = interpreter.get_tensor(output_details[0]['index'])[0]
        pred_idx = int(np.argmax(output))
        pred_label = CLASSES[pred_idx]
        pred_conf = float(output[pred_idx])

        test_vectors[dst_name] = {
            "ground_truth": cls_name,
            "pred_label": pred_label,
            "pred_confidence": round(pred_conf, 4),
            "scores": {c: round(float(output[i]), 4) for i, c in enumerate(CLASSES)}
        }
        print(f"Sample '{dst_name}': GT={cls_name.upper()} -> Pred={pred_label.upper()} ({pred_conf*100:.1f}%)")

    vectors_json = ASSETS_DIR / "test_vectors.json"
    with open(vectors_json, "w") as f:
        json.dump(test_vectors, f, indent=2)
    print(f"Saved test vectors summary: {vectors_json}")
    print("=== Assets Export Complete ===")

if __name__ == "__main__":
    main()

