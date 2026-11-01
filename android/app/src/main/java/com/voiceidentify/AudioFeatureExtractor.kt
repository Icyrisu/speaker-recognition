package com.voiceidentify

import android.content.Context
import java.io.InputStream
import java.nio.ByteBuffer
import java.nio.ByteOrder
import kotlin.math.cos
import kotlin.math.ln
import kotlin.math.sqrt

/**
 * Extracts 2D Log Mel-Spectrogram features from 16kHz mono audio (40,000 samples / 2.5s).
 * Exactly matches scipy.signal.stft + Mel filterbank logic used during model training:
 * - Sampling rate: 16,000 Hz
 * - N_FFT: 512
 * - Hop length: 256
 * - N_MELS: 64
 * - Output shape: [158 frames, 64 mel bins]
 */
class AudioFeatureExtractor(context: Context) {
    private val nFft = 512
    private val hopLength = 256
    private val nMels = 64
    private val numFrames = 158
    private val halfFftPlusOne = nFft / 2 + 1 // 257

    private val dftUtil = DftUtil(nFft)
    private val melFilterBank = Array(nMels) { FloatArray(halfFftPlusOne) }
    private val hannWindow = FloatArray(nFft)
    private val windowScale: Float

    init {
        // 1. Precompute periodic Hann window: win[n] = 0.5 * (1 - cos(2*pi*n / nFft))
        var winSum = 0f
        for (i in 0 until nFft) {
            val w = (0.5f * (1.0f - cos(2.0 * Math.PI * i / nFft).toFloat()))
            hannWindow[i] = w
            winSum += w
        }
        windowScale = 1.0f / winSum // 1.0f / 256.0f

        // 2. Load Mel filterbank weights from assets/mel_filters.bin (shape: 64 x 257 floats)
        loadMelFilterBank(context)
    }

    private fun loadMelFilterBank(context: Context) {
        context.assets.open("mel_filters.bin").use { inputStream: InputStream ->
            val totalBytes = nMels * halfFftPlusOne * 4
            val buffer = ByteArray(totalBytes)
            var bytesRead = 0
            while (bytesRead < totalBytes) {
                val read = inputStream.read(buffer, bytesRead, totalBytes - bytesRead)
                if (read == -1) break
                bytesRead += read
            }
            val byteBuffer = ByteBuffer.wrap(buffer).order(ByteOrder.LITTLE_ENDIAN)
            val floatBuffer = byteBuffer.asFloatBuffer()

            for (m in 0 until nMels) {
                for (f in 0 until halfFftPlusOne) {
                    melFilterBank[m][f] = floatBuffer.get()
                }
            }
        }
    }

    /**
     * Converts a 40,000-sample (2.5s) audio array into a normalized Log Mel-Spectrogram of shape [158, 64].
     */
    fun extractMelSpectrogram(audio: FloatArray): Array<FloatArray> {
        val targetLen = 40000
        val audioSamples = if (audio.size >= targetLen) {
            audio.copyOfRange(0, targetLen)
        } else {
            val padded = FloatArray(targetLen)
            System.arraycopy(audio, 0, padded, 0, audio.size)
            padded
        }

        // Apply boundary zero padding (256 at start, 256 at end) and tail padding (192 at end)
        // Total padded length = 256 + 40000 + 256 + 192 = 40704
        val totalPaddedLen = 40704
        val paddedAudio = FloatArray(totalPaddedLen)
        System.arraycopy(audioSamples, 0, paddedAudio, 256, targetLen)

        val logMelSpec = Array(numFrames) { FloatArray(nMels) }
        val windowedInput = FloatArray(nFft)
        val specMag = FloatArray(halfFftPlusOne)

        var sumLogMel = 0.0
        val totalElements = numFrames * nMels

        // Extract STFT frames and compute Mel energy
        for (t in 0 until numFrames) {
            val startIdx = t * hopLength
            for (i in 0 until nFft) {
                windowedInput[i] = paddedAudio[startIdx + i] * hannWindow[i]
            }

            dftUtil.rfftMagnitudes(windowedInput, windowScale, specMag)

            for (m in 0 until nMels) {
                var melEnergy = 0.0f
                val filterRow = melFilterBank[m]
                for (f in 0 until halfFftPlusOne) {
                    melEnergy += filterRow[f] * specMag[f]
                }
                val logVal = ln(melEnergy + 1e-6f)
                logMelSpec[t][m] = logVal
                sumLogMel += logVal
            }
        }

        // Global normalization per spectrogram: norm = (logMel - mean) / (std + 1e-7)
        val mean = (sumLogMel / totalElements).toFloat()
        var varianceSum = 0.0
        for (t in 0 until numFrames) {
            for (m in 0 until nMels) {
                val diff = logMelSpec[t][m] - mean
                varianceSum += diff * diff
            }
        }
        val std = (sqrt(varianceSum / totalElements) + 1e-7).toFloat()

        for (t in 0 until numFrames) {
            for (m in 0 until nMels) {
                logMelSpec[t][m] = (logMelSpec[t][m] - mean) / std
            }
        }

        return logMelSpec
    }
}

