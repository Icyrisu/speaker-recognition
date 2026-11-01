"""
Speaker Verification & Open-Set Access Control Training Pipeline.
Features:
1. Pre-emphasis + Top-dB Noise Floor Clamping + Hybrid Cepstral Mean Subtraction (CMS)
   to eliminate microphone/channel shortcut bias (e.g., Dzaki.mp3 vs phone mic).
2. Zero-leakage Contiguous Temporal Split (strictly separated Train / Val / Test windows).
3. 5-Class Open-Set Training (abror, dzaki, ishma, khairil, unknown) with SpecAugment & Channel Tilt Augmentation.
4. Dual-Head TFLite Export: outputs [5 Softmax Probabilities + 64-D Speaker Embedding] (shape: [1, 69])
   enabling both strict 2-factor verification AND on-device enrollment of new speakers in the mobile app!
"""

import json
from pathlib import Path
import numpy as np
import scipy.signal as signal
import soundfile as sf
import tensorflow as tf
from sklearn.metrics import classification_report, confusion_matrix

# Audio & Feature Configuration
SAMPLE_RATE = 16000
N_FFT = 512
HOP_LENGTH = 256
N_MELS = 64
F_MIN = 80.0
F_MAX = 7600.0
TOP_DB_NAT = 4.5        # ~40 dB dynamic range floor clamp in natural log units
CMS_ALPHA = 0.70        # 70% per-frequency-bin mean subtraction + 30% global mean
PREEMPH_COEF = 0.97     # 1st-order high-pass pre-emphasis coefficient

EPOCHS = 28
BATCH_SIZE = 32
EMBEDDING_DIM = 64

BASE_DIR = Path(__file__).resolve().parent.parent.parent
DATASET_DIR = BASE_DIR / "model" / "dataset"
EXPORTED_DIR = BASE_DIR / "model" / "exported"
EXPORTED_DIR.mkdir(parents=True, exist_ok=True)

CLASSES = ["abror", "dzaki", "ishma", "khairil", "unknown"]
AUTHORIZED_SPEAKERS = ["abror", "dzaki", "ishma", "khairil"]
CLASS_TO_IDX = {c: i for i, c in enumerate(CLASSES)}


def get_mel_filter_bank(n_mels=N_MELS, n_fft=N_FFT, sr=SAMPLE_RATE, f_min=F_MIN, f_max=F_MAX):
    """Generates standard Mel filterbank matrix of shape (n_mels, n_fft//2 + 1)."""
    def hz_to_mel(hz):
        return 2595.0 * np.log10(1.0 + hz / 700.0)

    def mel_to_hz(mel):
        return 700.0 * (10.0 ** (mel / 2595.0) - 1.0)

    mel_min = hz_to_mel(f_min)
    mel_max = hz_to_mel(f_max)
    mel_points = np.linspace(mel_min, mel_max, n_mels + 2)
    hz_points = mel_to_hz(mel_points)
    bin_points = np.floor((n_fft + 1) * hz_points / sr).astype(int)

    fbank = np.zeros((n_mels, int(n_fft // 2 + 1)), dtype=np.float32)
    for i in range(1, n_mels + 1):
        for j in range(bin_points[i - 1], bin_points[i]):
            fbank[i - 1, j] = (j - bin_points[i - 1]) / max(1, bin_points[i] - bin_points[i - 1])
        for j in range(bin_points[i], bin_points[i + 1]):
            fbank[i - 1, j] = (bin_points[i + 1] - j) / max(1, bin_points[i + 1] - bin_points[i])
    return fbank


MEL_FBANK = get_mel_filter_bank()


def audio_to_mel_spectrogram(audio: np.ndarray) -> np.ndarray:
    """
    Converts 1D 16kHz audio waveform (40,000 samples) into a channel-robust
    2D Log Mel-Spectrogram of shape (N_MELS=64, T=158).
    Exact same steps are mirrored in Android AudioFeatureExtractor.kt.
    """
    x = np.asarray(audio, dtype=np.float32)
    # 1. Remove DC offset & Peak Normalize to 0.90
    x = x - np.mean(x)
    peak = np.max(np.abs(x))
    if peak > 1e-4:
        x = x * (0.90 / peak)

    # 2. Pre-emphasis filter: y[n] = x[n] - 0.97 * x[n-1]
    emph = np.empty_like(x)
    emph[0] = x[0]
    emph[1:] = x[1:] - PREEMPH_COEF * x[:-1]

    # 3. STFT (512-point periodic Hann window, hop 256)
    _, _, zxx = signal.stft(
        emph, fs=SAMPLE_RATE, nperseg=N_FFT, noverlap=N_FFT - HOP_LENGTH, nfft=N_FFT
    )
    spec = np.abs(zxx)  # (257, 158)

    # 4. Mel Filterbank + Log compression
    mel = np.dot(MEL_FBANK, spec)  # (64, 158)
    log_mel = np.log(mel + 1e-6)

    # 5. Top-dB Dynamic Range Clamping (erases room noise floor differences during pauses)
    max_log = np.max(log_mel)
    log_mel = np.maximum(log_mel, max_log - TOP_DB_NAT)

    # 6. Hybrid Cepstral Mean Subtraction (70% per-bin mean + 30% global mean) + Global Std
    bin_mean = np.mean(log_mel, axis=1, keepdims=True)  # (64, 1)
    global_mean = np.mean(log_mel)
    centered = log_mel - (CMS_ALPHA * bin_mean + (1.0 - CMS_ALPHA) * global_mean)
    std = np.std(centered) + 1e-7
    norm_mel = centered / std

    return norm_mel.astype(np.float32)


def load_temporal_split_dataset():
    """
    Loads dataset using Contiguous Temporal Block Split to prevent overlapping window leakage:
    - Authorized Speakers (500 sequential files each):
      * Train: indices [0 .. 349]   (350 files)
      * Val:   indices [355 .. 424] (70 files, 5-chunk buffer gap)
      * Test:  indices [430 .. 499] (70 files, 5-chunk buffer gap)
    - Unknown Class (3 structured parts: [0..249] speech, [250..409] impostors, [410..499] noise):
      * Splits each part 70% Train / 15% Val / 15% Test temporally.
    """
    print("Loading dataset with Zero-Leakage Contiguous Temporal Split from:", DATASET_DIR)
    x_train, y_train = [], []
    x_val, y_val = [], []
    x_test, y_test = [], []

    for class_name in CLASSES:
        speaker_dir = DATASET_DIR / class_name
        files = sorted(list(speaker_dir.glob("*.wav")))
        label = CLASS_TO_IDX[class_name]
        print(f"  Extracting features for {class_name.upper():8s} ({len(files)} files)...")

        features = []
        for f in files:
            audio, _ = sf.read(str(f))
            if len(audio) == 40000:
                mel = audio_to_mel_spectrogram(audio)  # (64, 158)
                features.append(np.transpose(mel, (1, 0)))  # (158, 64)

        features = np.expand_dims(np.array(features, dtype=np.float32), axis=-1)  # (N, 158, 64, 1)
        n = len(features)

        if class_name != "unknown" and n >= 500:
            tr = features[:350]
            va = features[355:425]
            te = features[430:500]
        else:
            # Stratified temporal split across the 3 unknown sub-blocks (speech, impostors, noise)
            blocks = [(0, min(250, n)), (min(250, n), min(410, n)), (min(410, n), n)]
            tr_list, va_list, te_list = [], [], []
            for start, end in blocks:
                blk = features[start:end]
                bn = len(blk)
                if bn == 0:
                    continue
                i_tr = int(bn * 0.70)
                i_va = int(bn * 0.85)
                tr_list.append(blk[:i_tr])
                va_list.append(blk[i_tr:i_va])
                te_list.append(blk[i_va:])
            tr = np.concatenate(tr_list, axis=0)
            va = np.concatenate(va_list, axis=0)
            te = np.concatenate(te_list, axis=0)

        x_train.append(tr)
        y_train.append(np.full(len(tr), label, dtype=np.int32))
        x_val.append(va)
        y_val.append(np.full(len(va), label, dtype=np.int32))
        x_test.append(te)
        y_test.append(np.full(len(te), label, dtype=np.int32))

    x_train = np.concatenate(x_train, axis=0)
    y_train = np.concatenate(y_train, axis=0)
    x_val = np.concatenate(x_val, axis=0)
    y_val = np.concatenate(y_val, axis=0)
    x_test = np.concatenate(x_test, axis=0)
    y_test = np.concatenate(y_test, axis=0)

    return (x_train, y_train), (x_val, y_val), (x_test, y_test)


def augment_training_data(x_train: np.ndarray, y_train: np.ndarray):
    """
    Applies channel-invariance augmentations (SpecAugment + Random Mic Spectral Tilt + Noise)
    so the CNN learns speaker vocal tract dynamics rather than static microphone EQ.
    """
    rng = np.random.default_rng(42)
    aug_x = [x_train]
    aug_y = [y_train]

    n, t_steps, n_mels, _ = x_train.shape
    augmented = np.copy(x_train)

    for i in range(n):
        spec = augmented[i, :, :, 0]

        # 1. Random Microphone Spectral Tilt (-0.35 to +0.35 slope across 64 Mel bins)
        tilt_slope = rng.uniform(-0.35, 0.35)
        tilt_curve = np.linspace(-tilt_slope, tilt_slope, n_mels, dtype=np.float32)
        spec = spec + tilt_curve[np.newaxis, :]

        # 2. SpecAugment: Random Frequency Masking (mask 4 to 8 Mel bins)
        f_mask_len = int(rng.integers(4, 9))
        f0 = int(rng.integers(0, n_mels - f_mask_len))
        spec[:, f0 : f0 + f_mask_len] = 0.0

        # 3. SpecAugment: Random Time Masking (mask 12 to 24 frames)
        t_mask_len = int(rng.integers(12, 25))
        t0 = int(rng.integers(0, t_steps - t_mask_len))
        spec[t0 : t0 + t_mask_len, :] = 0.0

        # 4. Slight Gaussian acoustic jitter
        spec = spec + rng.normal(0.0, 0.06, size=spec.shape).astype(np.float32)

        # Re-normalize
        spec = (spec - np.mean(spec)) / (np.std(spec) + 1e-7)
        augmented[i, :, :, 0] = spec

    aug_x.append(augmented)
    aug_y.append(y_train)

    x_combined = np.concatenate(aug_x, axis=0)
    y_combined = np.concatenate(aug_y, axis=0)

    # Shuffle training set
    perm = rng.permutation(len(x_combined))
    return x_combined[perm], y_combined[perm]


def build_verification_cnn(input_shape=(158, 64, 1), num_classes=5):
    """
    Builds a Depthwise Separable 2D CNN with a dedicated 64-D Speaker Embedding bottleneck
    followed by a 5-class classification head.
    """
    inputs = tf.keras.Input(shape=input_shape, name="mel_spectrogram_input")

    # Block 1
    x = tf.keras.layers.Conv2D(32, (3, 3), strides=(2, 2), padding="same", use_bias=False)(inputs)
    x = tf.keras.layers.BatchNormalization()(x)
    x = tf.keras.layers.ReLU(6.0)(x)

    # Block 2 (Depthwise Separable)
    x = tf.keras.layers.DepthwiseConv2D((3, 3), padding="same", use_bias=False)(x)
    x = tf.keras.layers.BatchNormalization()(x)
    x = tf.keras.layers.ReLU(6.0)(x)
    x = tf.keras.layers.Conv2D(64, (1, 1), padding="same", use_bias=False)(x)
    x = tf.keras.layers.BatchNormalization()(x)
    x = tf.keras.layers.ReLU(6.0)(x)
    x = tf.keras.layers.MaxPooling2D((2, 2))(x)

    # Block 3 (Depthwise Separable)
    x = tf.keras.layers.DepthwiseConv2D((3, 3), padding="same", use_bias=False)(x)
    x = tf.keras.layers.BatchNormalization()(x)
    x = tf.keras.layers.ReLU(6.0)(x)
    x = tf.keras.layers.Conv2D(128, (1, 1), padding="same", use_bias=False)(x)
    x = tf.keras.layers.BatchNormalization()(x)
    x = tf.keras.layers.ReLU(6.0)(x)
    x = tf.keras.layers.MaxPooling2D((2, 2))(x)

    # Block 4 (Depthwise Separable)
    x = tf.keras.layers.DepthwiseConv2D((3, 3), padding="same", use_bias=False)(x)
    x = tf.keras.layers.BatchNormalization()(x)
    x = tf.keras.layers.ReLU(6.0)(x)
    x = tf.keras.layers.Conv2D(128, (1, 1), padding="same", use_bias=False)(x)
    x = tf.keras.layers.BatchNormalization()(x)
    x = tf.keras.layers.ReLU(6.0)(x)

    # Dual Statistical Pooling (Average + Max pooling captures both mean timbre and formant peaks)
    avg_pool = tf.keras.layers.GlobalAveragePooling2D()(x)
    max_pool = tf.keras.layers.GlobalMaxPooling2D()(x)
    pooled = tf.keras.layers.Concatenate()([avg_pool, max_pool])

    x = tf.keras.layers.Dense(128, activation="relu")(pooled)
    x = tf.keras.layers.BatchNormalization()(x)
    x = tf.keras.layers.Dropout(0.30)(x)

    # 64-D Biometric Speaker Embedding Layer (no activation so vectors span full hypersphere)
    embedding = tf.keras.layers.Dense(
        EMBEDDING_DIM, activation=None, name="speaker_embedding"
    )(x)
    x_emb = tf.keras.layers.BatchNormalization()(embedding)
    x_emb = tf.keras.layers.ReLU()(x_emb)
    x_emb = tf.keras.layers.Dropout(0.20)(x_emb)

    probs = tf.keras.layers.Dense(
        num_classes, activation="softmax", name="speaker_probabilities"
    )(x_emb)

    train_model = tf.keras.Model(inputs=inputs, outputs=probs, name="SpeakerTrainModel")
    return train_model


def l2_normalize(vecs: np.ndarray) -> np.ndarray:
    norms = np.linalg.norm(vecs, axis=-1, keepdims=True) + 1e-8
    return vecs / norms


def main():
    print("=" * 68)
    print("STEP 1: LOADING ZERO-LEAKAGE TEMPORAL DATASET (5 CLASSES)")
    print("=" * 68)
    (x_train, y_train), (x_val, y_val), (x_test, y_test) = load_temporal_split_dataset()

    print(f"Raw Train set: {len(x_train)} samples")
    print(f"Val set:       {len(x_val)} samples")
    print(f"Test set:      {len(x_test)} samples")

    x_train_aug, y_train_aug = augment_training_data(x_train, y_train)
    print(f"Augmented Train set: {len(x_train_aug)} samples (with Mic Tilt & SpecAugment)")

    print("\n" + "=" * 68)
    print("STEP 2: BUILDING & TRAINING SPEAKER VERIFICATION CNN")
    print("=" * 68)
    tf.keras.utils.set_random_seed(42)
    model = build_verification_cnn(input_shape=(158, 64, 1), num_classes=len(CLASSES))
    model.summary()

    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=0.001),
        loss="sparse_categorical_crossentropy",
        metrics=["accuracy"],
    )

    callbacks = [
        tf.keras.callbacks.EarlyStopping(
            monitor="val_loss", patience=6, restore_best_weights=True
        ),
        tf.keras.callbacks.ReduceLROnPlateau(
            monitor="val_loss", factor=0.5, patience=3, min_lr=1e-5
        ),
    ]

    model.fit(
        x_train_aug,
        y_train_aug,
        validation_data=(x_val, y_val),
        epochs=EPOCHS,
        batch_size=BATCH_SIZE,
        callbacks=callbacks,
        verbose=1,
    )

    # Create Combined Export Model that outputs [5 probabilities, 64 embedding] -> shape (None, 69)
    emb_layer_output = model.get_layer("speaker_embedding").output
    prob_layer_output = model.get_layer("speaker_probabilities").output
    combined_output = tf.keras.layers.Concatenate(axis=-1, name="combined_output")(
        [prob_layer_output, emb_layer_output]
    )
    export_model = tf.keras.Model(
        inputs=model.input, outputs=combined_output, name="SpeakerVerificationExportModel"
    )

    # Compute L2-normalized Speaker Embedding Centroids from clean training set
    print("\n" + "=" * 68)
    print("STEP 3: COMPUTING VOICEPRINT CENTROIDS & SIMILARITY THRESHOLDS")
    print("=" * 68)
    train_combined = export_model.predict(x_train, verbose=0)
    train_embs = l2_normalize(train_combined[:, 5:])

    centroids = {}
    centroid_thresholds = {}
    for idx, spk in enumerate(AUTHORIZED_SPEAKERS):
        spk_embs = train_embs[y_train == idx]
        mean_vec = np.mean(spk_embs, axis=0)
        centroid = mean_vec / (np.linalg.norm(mean_vec) + 1e-8)
        centroids[spk] = [round(float(v), 6) for v in centroid]

        # Cosine similarities of genuine training samples to their own centroid
        own_sims = np.dot(spk_embs, centroid)
        # Cosine similarities of impostors/unknowns to this speaker's centroid
        imp_embs = train_embs[y_train == CLASS_TO_IDX["unknown"]]
        imp_sims = np.dot(imp_embs, centroid)

        p10_own = float(np.percentile(own_sims, 10))
        p95_imp = float(np.percentile(imp_sims, 95))
        # Set strict threshold halfway between 95th percentile impostor and 10th percentile genuine, min 0.72
        thresh = max(0.72, round((p10_own + p95_imp) / 2.0, 3))
        centroid_thresholds[spk] = thresh
        print(
            f"  Speaker {spk.upper():8s} | Genuine Sim (mean={np.mean(own_sims):.3f}, p10={p10_own:.3f}) "
            f"| Impostor p95={p95_imp:.3f} -> Threshold={thresh:.3f}"
        )

    # Evaluate on Unseen Contiguous Test Set with Dual-Gate Verification
    print("\n" + "=" * 68)
    print("STEP 4: CONFUSION MATRIX & OPEN-SET ACCESS CONTROL EVALUATION")
    print("=" * 68)
    test_combined = export_model.predict(x_test, verbose=0)
    test_probs = test_combined[:, :5]
    test_embs = l2_normalize(test_combined[:, 5:])

    raw_preds = np.argmax(test_probs, axis=1)
    print("\n[A] Raw 5-Class Softmax Confusion Matrix (Unseen Contiguous Test Set):")
    print("    Rows = Ground Truth, Cols = Predicted [abror, dzaki, ishma, khairil, unknown]")
    cm_raw = confusion_matrix(y_test, raw_preds)
    print(cm_raw)
    print("\nClassification Report (Raw 5-Class):")
    print(classification_report(y_test, raw_preds, target_names=[c.upper() for c in CLASSES], digits=4))

    # Dual-Gate Verification Decision (Softmax Prob >= 0.80 AND Unknown Prob < 0.20 AND Centroid Cosine >= Threshold)
    verified_preds = []
    for i in range(len(x_test)):
        probs = test_probs[i]
        emb = test_embs[i]
        pred_idx = int(np.argmax(probs))
        max_prob = float(probs[pred_idx])
        unk_prob = float(probs[4])

        if pred_idx == 4 or max_prob < 0.80 or unk_prob >= 0.25:
            verified_preds.append(4)  # Rejected as unknown
        else:
            spk_name = CLASSES[pred_idx]
            c_vec = np.array(centroids[spk_name], dtype=np.float32)
            cos_sim = float(np.dot(emb, c_vec))
            if cos_sim >= centroid_thresholds[spk_name]:
                verified_preds.append(pred_idx)
            else:
                verified_preds.append(4)  # Rejected by Voiceprint Centroid Gate!

    verified_preds = np.array(verified_preds, dtype=np.int32)
    cm_verified = confusion_matrix(y_test, verified_preds)
    print("[B] Dual-Gate Verified Confusion Matrix (Softmax + Voiceprint Centroid Gate):")
    print("    Rows = Ground Truth, Cols = Verified [abror, dzaki, ishma, khairil, REJECTED/UNKNOWN]")
    print(cm_verified)

    # Calculate Access Control Security Metrics (FAR & TAR)
    unk_mask = y_test == 4
    auth_mask = y_test < 4
    false_accepts = np.sum(verified_preds[unk_mask] < 4)
    total_impostors = np.sum(unk_mask)
    far = (false_accepts / max(1, total_impostors)) * 100.0

    correct_auth = np.sum(verified_preds[auth_mask] == y_test[auth_mask])
    total_auth = np.sum(auth_mask)
    tar = (correct_auth / max(1, total_auth)) * 100.0

    print("\n" + "-" * 68)
    print(f"ACCESS CONTROL SECURITY SUMMARY (UNSEEN TEST SET):")
    print(f"  * Authorized True Identification Rate (TAR): {correct_auth}/{total_auth} ({tar:.2f}%)")
    print(f"  * Impostor / Noise False Accept Rate (FAR):  {false_accepts}/{total_impostors} ({far:.2f}%)")
    print("-" * 68)

    # Save Keras and Pure FP32 Opcode-v1 TFLite Model
    print("\n" + "=" * 68)
    print("STEP 5: EXPORTING DUAL-HEAD TFLITE MODEL & VOICEPRINT CENTROIDS")
    print("=" * 68)
    keras_path = EXPORTED_DIR / "speaker_model.keras"
    export_model.save(str(keras_path))
    print(f"Saved Keras model to: {keras_path}")

    converter = tf.lite.TFLiteConverter.from_keras_model(export_model)
    converter.optimizations = []  # Pure FP32 for universal Android TFLite Opcode v1 support
    tflite_bytes = converter.convert()

    tflite_path = EXPORTED_DIR / "speaker_model.tflite"
    tflite_path.write_bytes(tflite_bytes)
    print(f"Saved TFLite model to: {tflite_path} ({len(tflite_bytes) / 1024:.1f} KB)")

    config = {
        "model_file": "speaker_model.tflite",
        "input_shape": [1, 158, 64, 1],
        "output_shape": [1, 69],
        "input_type": "float32",
        "sample_rate": SAMPLE_RATE,
        "n_fft": N_FFT,
        "hop_length": HOP_LENGTH,
        "n_mels": N_MELS,
        "top_db_nat": TOP_DB_NAT,
        "cms_alpha": CMS_ALPHA,
        "preemph_coef": PREEMPH_COEF,
        "classes": CLASSES,
        "authorized_speakers": AUTHORIZED_SPEAKERS,
        "embedding_dim": EMBEDDING_DIM,
        "confidence_threshold": 0.80,
        "custom_enrollment_cosine_threshold": 0.82,
        "centroid_thresholds": centroid_thresholds,
        "centroids": centroids,
        "test_tar_percent": round(tar, 2),
        "test_far_percent": round(far, 2),
    }
    config_path = EXPORTED_DIR / "model_config.json"
    with open(config_path, "w") as f:
        json.dump(config, f, indent=2)
    print(f"Saved model configuration & voiceprint centroids to: {config_path}")
    print("=" * 68)


if __name__ == "__main__":
    main()
