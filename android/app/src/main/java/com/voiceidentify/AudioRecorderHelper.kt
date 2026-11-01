package com.voiceidentify

import android.annotation.SuppressLint
import android.content.Context
import android.content.pm.PackageManager
import android.media.AudioFormat
import android.media.AudioRecord
import android.media.MediaRecorder
import androidx.core.content.ContextCompat
import kotlin.math.abs
import kotlin.math.max
import kotlin.math.sqrt

data class AudioValidationResult(
    val isValidSpeech: Boolean,
    val normalizedSamples: FloatArray,
    val rms: Float,
    val activeFrameRatio: Float,
    val rejectionReason: String? = null
)

class AudioRecorderHelper(private val context: Context) {
    private val sampleRate = 16000
    private val targetSampleCount = 40000 // 2.5 seconds at 16kHz

    fun hasRecordPermission(): Boolean {
        return ContextCompat.checkSelfPermission(
            context,
            android.Manifest.permission.RECORD_AUDIO
        ) == PackageManager.PERMISSION_GRANTED
    }

    @SuppressLint("MissingPermission")
    fun recordAudio(): FloatArray {
        if (!hasRecordPermission()) {
            throw SecurityException("android.permission.RECORD_AUDIO permission is not granted")
        }

        val channelConfig = AudioFormat.CHANNEL_IN_MONO
        val audioFormat = AudioFormat.ENCODING_PCM_16BIT
        val minBufferSize = AudioRecord.getMinBufferSize(sampleRate, channelConfig, audioFormat)
        val bufferSize = maxOf(minBufferSize, targetSampleCount * 2)

        // Use VOICE_RECOGNITION source to avoid aggressive OEM AGC / noise-floor pumping
        val audioRecord = AudioRecord(
            MediaRecorder.AudioSource.VOICE_RECOGNITION,
            sampleRate,
            channelConfig,
            audioFormat,
            bufferSize
        )

        if (audioRecord.state != AudioRecord.STATE_INITIALIZED) {
            throw IllegalStateException("Failed to initialize AudioRecord instance")
        }

        val rawShorts = ShortArray(targetSampleCount)
        var totalRead = 0

        try {
            audioRecord.startRecording()
            while (totalRead < targetSampleCount) {
                val read = audioRecord.read(rawShorts, totalRead, targetSampleCount - totalRead)
                if (read > 0) {
                    totalRead += read
                } else if (read < 0) {
                    throw RuntimeException("AudioRecord read error code: $read")
                }
            }
        } finally {
            try {
                audioRecord.stop()
            } catch (_: Exception) {
            }
            audioRecord.release()
        }

        val floatSamples = FloatArray(targetSampleCount)
        for (i in 0 until targetSampleCount) {
            floatSamples[i] = rawShorts[i] / 32768.0f
        }

        return floatSamples
    }

    /**
     * Performs DC offset removal, Voice Activity Detection (VAD) gate, and 0.90 peak normalization.
     * Rejects silence, quiet background noise, and non-speech hum before TFLite inference.
     */
    fun validateAndNormalizeSpeech(
        rawSamples: FloatArray,
        enforceStrictVad: Boolean = true
    ): AudioValidationResult {
        val n = rawSamples.size
        if (n == 0) {
            return AudioValidationResult(false, rawSamples, 0f, 0f, "Empty audio buffer")
        }

        // 1. Remove DC offset
        var sum = 0.0
        for (i in 0 until n) {
            sum += rawSamples[i]
        }
        val mean = (sum / n).toFloat()

        val centered = FloatArray(n)
        var sumSq = 0.0
        var peak = 0.0f
        for (i in 0 until n) {
            val v = rawSamples[i] - mean
            centered[i] = v
            sumSq += v * v
            val av = abs(v)
            if (av > peak) peak = av
        }

        val rms = sqrt(sumSq / n).toFloat()

        // 2. Compute Active Speech Frame Ratio over 100 frames of 400 samples (25ms each)
        val numFrames = 100
        val frameLen = n / numFrames
        val frameThresh = max(0.011f, 0.25f * rms)
        var activeFrames = 0

        for (f in 0 until numFrames) {
            val offset = f * frameLen
            var fSumSq = 0.0
            var zeroCrossings = 0
            for (i in 0 until frameLen) {
                val s = centered[offset + i]
                fSumSq += s * s
                if (i > 0) {
                    val prev = centered[offset + i - 1]
                    if ((s >= 0f && prev < 0f) || (s < 0f && prev >= 0f)) {
                        zeroCrossings++
                    }
                }
            }
            val fRms = sqrt(fSumSq / frameLen).toFloat()
            val zcr = zeroCrossings.toFloat() / frameLen
            // Human voiced/unvoiced speech frame check
            if (fRms >= frameThresh && zcr >= 0.012f && zcr <= 0.42f) {
                activeFrames++
            }
        }

        val activeRatio = activeFrames.toFloat() / numFrames

        if (enforceStrictVad) {
            if (rms < 0.014f || peak < 0.045f) {
                return AudioValidationResult(
                    isValidSpeech = false,
                    normalizedSamples = centered,
                    rms = rms,
                    activeFrameRatio = activeRatio,
                    rejectionReason = "No speech detected (Audio level too quiet / Silence)."
                )
            }
            if (activeRatio < 0.22f) {
                return AudioValidationResult(
                    isValidSpeech = false,
                    normalizedSamples = centered,
                    rms = rms,
                    activeFrameRatio = activeRatio,
                    rejectionReason = "Insufficient continuous voice activity (${(activeRatio * 100).toInt()}% active frames). Please speak continuously for 2.5 seconds."
                )
            }
        }

        // 3. Peak normalize to 0.90 (matching Python training pipeline)
        val normalized = FloatArray(n)
        val scale = if (peak > 1e-4f) 0.90f / peak else 1.0f
        for (i in 0 until n) {
            normalized[i] = (centered[i] * scale).coerceIn(-1.0f, 1.0f)
        }

        return AudioValidationResult(
            isValidSpeech = true,
            normalizedSamples = normalized,
            rms = rms,
            activeFrameRatio = activeRatio,
            rejectionReason = null
        )
    }

    fun loadWavAsset(assetPath: String): FloatArray {
        context.assets.open(assetPath).use { inputStream ->
            val header = ByteArray(44)
            var headerRead = 0
            while (headerRead < 44) {
                val r = inputStream.read(header, headerRead, 44 - headerRead)
                if (r == -1) break
                headerRead += r
            }

            val pcmBytes = ByteArray(targetSampleCount * 2)
            var totalBytes = 0
            while (totalBytes < pcmBytes.size) {
                val r = inputStream.read(pcmBytes, totalBytes, pcmBytes.size - totalBytes)
                if (r == -1) break
                totalBytes += r
            }

            val shortCount = totalBytes / 2
            val floatSamples = FloatArray(targetSampleCount)
            for (i in 0 until minOf(shortCount, targetSampleCount)) {
                val low = pcmBytes[i * 2].toInt() and 0xFF
                val high = pcmBytes[i * 2 + 1].toInt()
                val sampleShort = ((high shl 8) or low).toShort()
                floatSamples[i] = sampleShort / 32768.0f
            }
            return floatSamples
        }
    }
}
