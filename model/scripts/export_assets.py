"""
Export script to package the trained Dual-Head TFLite model, model_config.json
(with voiceprint centroids), mel filterbank, and unseen test samples
directly into the Android assets directory:
android/app/src/main/assets/
"""

import json
import shutil
import sys
from pathlib import Path
import numpy as np
import soundfile as sf
import tensorflow as tf

BASE_DIR = Path(__file__).resolve().parent.parent.parent
sys.path.append(str(BASE_DIR / "model" / "scripts"))
from train_model import (
    CLASSES,
    DATASET_DIR,
    EXPORTED_DIR,
    audio_to_mel_spectrogram,
    get_mel_filter_bank,
    l2_normalize,
)

ASSETS_DIR = BASE_DIR / "android" / "app" / "src" / "main" / "assets"
ASSETS_DIR.mkdir(parents=True, exist_ok=True)
TEST_SAMPLES_DIR = ASSETS_DIR / "test_samples"
TEST_SAMPLES_DIR.mkdir(parents=True, exist_ok=True)


def main():
    print("=== Exporting Android Assets (Dual-Head Verification + Centroids) ===")

    # 1. Copy TFLite model and config (which includes voiceprint centroids)
    tflite_src = EXPORTED_DIR / "speaker_model.tflite"
    tflite_dst = ASSETS_DIR / "speaker_model.tflite"
    shutil.copyfile(tflite_src, tflite_dst)
    print(f"Copied TFLite model: {tflite_dst} ({tflite_dst.stat().st_size} bytes)")

    config_src = EXPORTED_DIR / "model_config.json"
    config_dst = ASSETS_DIR / "model_config.json"
    shutil.copyfile(config_src, config_dst)
    print(f"Copied Config & Centroids: {config_dst}")

    with open(config_dst, "r") as f:
        config = json.load(f)

    centroids = config["centroids"]
    centroid_thresholds = config["centroid_thresholds"]

    # 2. Export Mel Filterbank as raw binary float32 (shape: 64 x 257 = 16448 floats)
    mel_fbank = get_mel_filter_bank()
    mel_bin_path = ASSETS_DIR / "mel_filters.bin"
    mel_fbank.tofile(str(mel_bin_path))
    print(f"Exported Mel filterbank: {mel_bin_path} (shape: {mel_fbank.shape}, {mel_bin_path.stat().st_size} bytes)")

    # 3. Export 1 unseen test sample per speaker (from index 450 in the unseen Test block!)
    sample_mapping = {
        "abror": ("sample_abror.wav", 450),
        "dzaki": ("sample_dzaki.wav", 450),
        "ishma": ("sample_ishma.wav", 450),
        "khairil": ("sample_khairil.wav", 450),
        "unknown": ("sample_unknown.wav", 230),
    }

    test_vectors = {}

    interpreter = tf.lite.Interpreter(model_path=str(tflite_dst))
    interpreter.allocate_tensors()
    input_details = interpreter.get_input_details()
    output_details = interpreter.get_output_details()

    for cls_name, (dst_name, file_idx) in sample_mapping.items():
        src_dir = DATASET_DIR / cls_name
        files = sorted(list(src_dir.glob("*.wav")))
        if not files:
            print(f"Warning: No files for {cls_name}")
            continue

        sample_file = files[min(file_idx, len(files) - 1)]
        dst_path = TEST_SAMPLES_DIR / dst_name
        shutil.copyfile(sample_file, dst_path)

        audio, _ = sf.read(str(sample_file))
        norm_mel = audio_to_mel_spectrogram(audio)  # (64, 158)
        input_data = np.transpose(norm_mel, (1, 0))  # (158, 64)
        input_data = np.expand_dims(input_data, axis=(0, -1)).astype(np.float32)  # (1, 158, 64, 1)

        interpreter.set_tensor(input_details[0]["index"], input_data)
        interpreter.invoke()
        output = interpreter.get_tensor(output_details[0]["index"])[0]  # (69,)

        probs = output[:5]
        emb = l2_normalize(output[5:])

        pred_idx = int(np.argmax(probs))
        pred_label = CLASSES[pred_idx]
        pred_conf = float(probs[pred_idx])
        unk_prob = float(probs[4])

        cos_sim = 0.0
        verified_label = "unknown"
        if pred_idx < 4 and pred_conf >= 0.80 and unk_prob < 0.25:
            c_vec = np.array(centroids[pred_label], dtype=np.float32)
            cos_sim = float(np.dot(emb, c_vec))
            if cos_sim >= centroid_thresholds[pred_label]:
                verified_label = pred_label

        test_vectors[dst_name] = {
            "ground_truth": cls_name,
            "raw_pred": pred_label,
            "verified_label": verified_label,
            "pred_confidence": round(pred_conf, 4),
            "centroid_cosine_sim": round(cos_sim, 4),
            "scores": {c: round(float(probs[i]), 4) for i, c in enumerate(CLASSES)},
        }
        print(
            f"Sample '{dst_name:18s}': GT={cls_name.upper():8s} -> Verified={verified_label.upper():8s} "
            f"(Prob={pred_conf*100:.1f}%, CosineSim={cos_sim*100:.1f}%)"
        )

    vectors_json = ASSETS_DIR / "test_vectors.json"
    with open(vectors_json, "w") as f:
        json.dump(test_vectors, f, indent=2)
    print(f"Saved test vectors summary: {vectors_json}")
    print("=== Assets Export Complete ===")


if __name__ == "__main__":
    main()
