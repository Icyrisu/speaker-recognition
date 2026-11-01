package com.voiceidentify

import android.content.Context
import java.io.InputStream
import java.nio.ByteBuffer
import java.nio.ByteOrder
import kotlin.math.abs
import kotlin.math.cos
import kotlin.math.ln
import kotlin.math.max
import kotlin.math.sqrt

/**
 * Extracts channel-robust 2D Log Mel-Spectrogram features from 16kHz mono audio (40,000 samples / 2.5s).
 * Mirrors the exact mathematical pipeline in train_model.py:
 * 1. DC Offset removal & 0.90 Peak Normalization
 * 2. 1st-Order High-Pass Pre-emphasis (alpha = 0.97)
 * 3. 512-point STFT (hop 256, periodic Hann window) + 64 Mel filterbanks
 * 4. Top-dB Dynamic Range Floor Clamping (max_log - 4.5 nat)
 * 5. Hybrid Cepstral Mean Subtraction (70% per-bin mean + 30% global mean) + Global Std scaling
 */
class AudioFeatureExtractor(context: Context) {
    private val nFft = 512
    private val hopLength = 256
    private val nMels = 64
    private val numFrames = 158
    private val halfFftPlusOne = nFft / 2 + 1 // 257
    private val preemphCoef = 0.97f
    private val topDbNat = 4.5f
    private val cmsAlpha = 0.70f

    private val dftUtil = DftUtil(nFft)
    private val melFilterBank = Array(nMels) { FloatArray(halfFftPlusOne) }
    private val hannWindow = FloatArray(nFft)
    private val windowScale: Float

    init {
        var winSum = 0f
        for (i in 0 until nFft) {
            val w = (0.5f * (1.0f - cos(2.0 * Math.PI * i / nFft).toFloat()))
            hannWindow[i] = w
            winSum += w
        }
        windowScale = 1.0f / winSum

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

    fun extractMelSpectrogram(audio: FloatArray): Array<FloatArray> {
        val targetLen = 40000
        val raw = if (audio.size >= targetLen) {
            audio.copyOfRange(0, targetLen)
        } else {
            val padded = FloatArray(targetLen)
            System.arraycopy(audio, 0, padded, 0, audio.size)
            padded
        }

        // 1. Ensure DC offset removal & 0.90 peak normalization
        var sum = 0.0
        for (i in 0 until targetLen) sum += raw[i]
        val dcMean = (sum / targetLen).toFloat()

        var peak = 0.0f
        for (i in 0 until targetLen) {
            raw[i] -= dcMean
            val av = abs(raw[i])
            if (av > peak) peak = av
        }
        if (peak > 1e-4f) {
            val scale = 0.90f / peak
            for (i in 0 until targetLen) {
                raw[i] *= scale
            }
        }

        // 2. Apply 1st-Order Pre-emphasis: emph[n] = x[n] - 0.97 * x[n-1]
        val emph = FloatArray(targetLen)
        emph[0] = raw[0]
        for (i in 1 until targetLen) {
            emph[i] = raw[i] - preemphCoef * raw[i - 1]
        }

        // 3. Boundary zero padding (256 at start, 256 + 192 at end -> total 40704)
        val totalPaddedLen = 40704
        val paddedAudio = FloatArray(totalPaddedLen)
        System.arraycopy(emph, 0, paddedAudio, 256, targetLen)

        val logMelSpec = Array(numFrames) { FloatArray(nMels) }
        val windowedInput = FloatArray(nFft)
        val specMag = FloatArray(halfFftPlusOne)

        var maxLogVal = -1e9f

        // 4. STFT & Log-Mel extraction
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
                if (logVal > maxLogVal) maxLogVal = logVal
            }
        }

        // 5. Top-dB Dynamic Range Floor Clamping (clamps silence/pause floor to maxLogVal - 4.5)
        val floorVal = maxLogVal - topDbNat
        var globalSum = 0.0
        val binSums = DoubleArray(nMels)

        for (t in 0 until numFrames) {
            for (m in 0 until nMels) {
                val clamped = max(logMelSpec[t][m], floorVal)
                logMelSpec[t][m] = clamped
                binSums[m] += clamped
                globalSum += clamped
            }
        }

        // 6. Hybrid Cepstral Mean Subtraction (70% per-bin mean + 30% global mean) + Global Std
        val totalElements = numFrames * nMels
        val globalMean = (globalSum / totalElements).toFloat()
        val hybridMeanPerBin = FloatArray(nMels)
        for (m in 0 until nMels) {
            val binMean = (binSums[m] / numFrames).toFloat()
            hybridMeanPerBin[m] = cmsAlpha * binMean + (1.0f - cmsAlpha) * globalMean
        }

        var varianceSum = 0.0
        for (t in 0 until numFrames) {
            for (m in 0 until nMels) {
                val centered = logMelSpec[t][m] - hybridMeanPerBin[m]
                logMelSpec[t][m] = centered
                varianceSum += centered * centered
            }
        }

        val std = (sqrt(varianceSum / totalElements) + 1e-7).toFloat()
        for (t in 0 until numFrames) {
            for (m in 0 until nMels) {
                logMelSpec[t][m] /= std
            }
        }

        return logMelSpec
    }
}
