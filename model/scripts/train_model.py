"""
Training script for 4-speaker identification (Abror, Dzaki, Ishma, Khairil).
Extracts Log Mel-Spectrograms, trains a lightweight Depthwise Separable CNN,
evaluates on test & unknown sets, and exports to speaker_model.tflite.
"""

import os
import json
from pathlib import Path
import numpy as np
import scipy.signal as signal
import soundfile as sf
import tensorflow as tf
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, confusion_matrix

# Configuration
SAMPLE_RATE = 16000
N_FFT = 512
HOP_LENGTH = 256
N_MELS = 64
F_MIN = 80.0
F_MAX = 7600.0
EPOCHS = 20
BATCH_SIZE = 32

BASE_DIR = Path(__file__).resolve().parent.parent.parent
DATASET_DIR = BASE_DIR / "model" / "dataset"
EXPORTED_DIR = BASE_DIR / "model" / "exported"
EXPORTED_DIR.mkdir(parents=True, exist_ok=True)

CLASSES = ["abror", "dzaki", "ishma", "khairil"]
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
    """Converts 1D audio waveform into 2D Log Mel-Spectrogram (N_MELS, T)."""
    _, _, zxx = signal.stft(audio, fs=SAMPLE_RATE, nperseg=N_FFT, noverlap=N_FFT - HOP_LENGTH, nfft=N_FFT)
    spec = np.abs(zxx)  # Shape: (257, T)
    mel = np.dot(MEL_FBANK, spec)  # Shape: (64, T)
    log_mel = np.log(mel + 1e-6)
    # Normalize per spectrogram
    mean = np.mean(log_mel)
    std = np.std(log_mel) + 1e-7
    norm_mel = (log_mel - mean) / std
    return norm_mel.astype(np.float32)


def load_dataset():
    """Loads all WAV files and extracts Log Mel-Spectrograms."""
    print("Loading dataset from:", DATASET_DIR)
    x_data = []
    y_data = []

    for class_name in CLASSES:
        speaker_dir = DATASET_DIR / class_name
        files = sorted(list(speaker_dir.glob("*.wav")))
        label = CLASS_TO_IDX[class_name]
        print(f"  Extracting features for {class_name.upper()} ({len(files)} files)...")

        for f in files:
            audio, sr = sf.read(str(f))
            if len(audio) != 40000:
                continue
            mel = audio_to_mel_spectrogram(audio)
            x_data.append(mel)
            y_data.append(label)

    x_data = np.array(x_data)  # Shape: (N, 64, 158)
    # Transpose to (N, Time, Mels, Channels) = (N, 158, 64, 1)
    x_data = np.transpose(x_data, (0, 2, 1))
    x_data = np.expand_dims(x_data, axis=-1)
    y_data = np.array(y_data, dtype=np.int32)

    print(f"Dataset loaded: X={x_data.shape}, y={y_data.shape}")
    return x_data, y_data


def build_lightweight_cnn(input_shape=(158, 64, 1), num_classes=4):
    """Builds an ultra-lightweight depthwise separable CNN model (~150k params)."""
    inputs = tf.keras.Input(shape=input_shape, name="mel_spectrogram_input")

    # Initial Conv Block
    x = tf.keras.layers.Conv2D(32, (3, 3), strides=(2, 2), padding="same", use_bias=False)(inputs)
    x = tf.keras.layers.BatchNormalization()(x)
    x = tf.keras.layers.ReLU(6.0)(x)

    # Depthwise Separable Block 1
    x = tf.keras.layers.DepthwiseConv2D((3, 3), padding="same", use_bias=False)(x)
    x = tf.keras.layers.BatchNormalization()(x)
    x = tf.keras.layers.ReLU(6.0)(x)
    x = tf.keras.layers.Conv2D(64, (1, 1), padding="same", use_bias=False)(x)
    x = tf.keras.layers.BatchNormalization()(x)
    x = tf.keras.layers.ReLU(6.0)(x)
    x = tf.keras.layers.MaxPooling2D((2, 2))(x)

    # Depthwise Separable Block 2
    x = tf.keras.layers.DepthwiseConv2D((3, 3), padding="same", use_bias=False)(x)
    x = tf.keras.layers.BatchNormalization()(x)
    x = tf.keras.layers.ReLU(6.0)(x)
    x = tf.keras.layers.Conv2D(128, (1, 1), padding="same", use_bias=False)(x)
    x = tf.keras.layers.BatchNormalization()(x)
    x = tf.keras.layers.ReLU(6.0)(x)
    x = tf.keras.layers.MaxPooling2D((2, 2))(x)

    # Depthwise Separable Block 3
    x = tf.keras.layers.DepthwiseConv2D((3, 3), padding="same", use_bias=False)(x)
    x = tf.keras.layers.BatchNormalization()(x)
    x = tf.keras.layers.ReLU(6.0)(x)
    x = tf.keras.layers.Conv2D(128, (1, 1), padding="same", use_bias=False)(x)
    x = tf.keras.layers.BatchNormalization()(x)
    x = tf.keras.layers.ReLU(6.0)(x)

    # Global Pooling & Dense Classifier
    x = tf.keras.layers.GlobalAveragePooling2D()(x)
    x = tf.keras.layers.Dense(128, activation="relu")(x)
    x = tf.keras.layers.Dropout(0.35)(x)
    outputs = tf.keras.layers.Dense(num_classes, activation="softmax", name="speaker_probabilities")(x)

    model = tf.keras.Model(inputs=inputs, outputs=outputs, name="SpeakerRecognitionModel")
    return model


def main():
    print("=" * 60)
    print("STEP 1: LOADING & EXTRACTING FEATURES")
    print("=" * 60)
    x_data, y_data = load_dataset()

    # Split: 80% Train, 10% Val, 10% Test
    x_train, x_temp, y_train, y_temp = train_test_split(
        x_data, y_data, test_size=0.20, random_state=42, stratify=y_data
    )
    x_val, x_test, y_val, y_test = train_test_split(
        x_temp, y_temp, test_size=0.50, random_state=42, stratify=y_temp
    )

    print(f"Train set: {len(x_train)} samples")
    print(f"Val set:   {len(x_val)} samples")
    print(f"Test set:  {len(x_test)} samples")

    print("\n" + "=" * 60)
    print("STEP 2: BUILDING MODEL ARCHITECTURE")
    print("=" * 60)
    model = build_lightweight_cnn(input_shape=(158, 64, 1), num_classes=len(CLASSES))
    model.summary()

    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=0.001),
        loss="sparse_categorical_crossentropy",
        metrics=["accuracy"],
    )

    callbacks = [
        tf.keras.callbacks.EarlyStopping(patience=5, restore_best_weights=True, monitor="val_accuracy"),
        tf.keras.callbacks.ReduceLROnPlateau(factor=0.5, patience=2, monitor="val_loss", min_lr=1e-5),
    ]

    print("\n" + "=" * 60)
    print(f"STEP 3: TRAINING FOR UP TO {EPOCHS} EPOCHS")
    print("=" * 60)
    history = model.fit(
        x_train,
        y_train,
        validation_data=(x_val, y_val),
        epochs=EPOCHS,
        batch_size=BATCH_SIZE,
        callbacks=callbacks,
        verbose=1,
    )

    print("\n" + "=" * 60)
    print("STEP 4: EVALUATING TEST SET ACCURACY")
    print("=" * 60)
    test_loss, test_acc = model.evaluate(x_test, y_test, verbose=0)
    print(f"Test Accuracy: {test_acc * 100:.2f}% | Test Loss: {test_loss:.4f}")

    y_pred_probs = model.predict(x_test, verbose=0)
    y_pred = np.argmax(y_pred_probs, axis=1)

    print("\nClassification Report:")
    print(classification_report(y_test, y_pred, target_names=CLASSES))

    print("Confusion Matrix:")
    print(confusion_matrix(y_test, y_pred))

    # Evaluate Unknown Audio Rejection
    unknown_dir = DATASET_DIR / "unknown"
    unknown_files = list(unknown_dir.glob("*.wav"))
    if unknown_files:
        print("\n" + "=" * 60)
        print(f"STEP 5: EVALUATING UNKNOWN VOICE REJECTION ({len(unknown_files)} files)")
        print("=" * 60)
        x_unk = []
        for f in unknown_files:
            audio, _ = sf.read(str(f))
            if len(audio) == 40000:
                x_unk.append(audio_to_mel_spectrogram(audio))
        x_unk = np.array(x_unk)
        x_unk = np.transpose(x_unk, (0, 2, 1))
        x_unk = np.expand_dims(x_unk, axis=-1)

        unk_probs = model.predict(x_unk, verbose=0)
        max_unk_conf = np.max(unk_probs, axis=1)
        threshold = 0.70
        rejected_count = np.sum(max_unk_conf < threshold)
        print(f"Confidence Threshold: {threshold * 100:.0f}%")
        print(f"Correctly Rejected as Unknown: {rejected_count}/{len(x_unk)} ({rejected_count/len(x_unk)*100:.1f}%)")
        print(f"Average confidence on unknown audio: {np.mean(max_unk_conf)*100:.1f}%")

    # Export to Keras and TFLite
    print("\n" + "=" * 60)
    print("STEP 6: EXPORTING MODEL TO TFLITE")
    print("=" * 60)
    keras_path = EXPORTED_DIR / "speaker_model.keras"
    model.save(str(keras_path))
    print(f"Saved Keras model to: {keras_path}")

    # TFLite Conversion
    converter = tf.lite.TFLiteConverter.from_keras_model(model)
    converter.optimizations = [tf.lite.Optimize.DEFAULT]  # Standard size/speed optimization
    tflite_bytes = converter.convert()

    tflite_path = EXPORTED_DIR / "speaker_model.tflite"
    tflite_path.write_bytes(tflite_bytes)
    print(f"Saved optimized TFLite model to: {tflite_path} ({len(tflite_bytes) / 1024:.1f} KB)")

    # Save model config metadata
    config = {
        "model_file": "speaker_model.tflite",
        "input_shape": [1, 158, 64, 1],
        "input_type": "float32",
        "sample_rate": SAMPLE_RATE,
        "classes": CLASSES,
        "confidence_threshold": 0.70,
        "test_accuracy": float(test_acc),
    }
    config_path = EXPORTED_DIR / "model_config.json"
    config_path.write_text(json.dumps(config, indent=2))
    print(f"Saved model config to: {config_path}")

    print("\n" + "=" * 60)
    print("ALL TRAINING & EXPORT TASKS COMPLETED!")
    print("=" * 60)


if __name__ == "__main__":
    main()

