package com.voiceidentify

import android.annotation.SuppressLint
import android.content.Context
import android.content.pm.PackageManager
import android.media.AudioFormat
import android.media.AudioRecord
import android.media.MediaRecorder
import androidx.core.content.ContextCompat

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

        val audioRecord = AudioRecord(
            MediaRecorder.AudioSource.MIC,
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
            } catch (e: Exception) {
                // Ignore stop error
            }
            audioRecord.release()
        }

        // Convert PCM 16-bit signed shorts [-32768, 32767] to floats [-1.0f, 1.0f]
        val floatSamples = FloatArray(targetSampleCount)
        for (i in 0 until targetSampleCount) {
            floatSamples[i] = rawShorts[i] / 32768.0f
        }

        return floatSamples
    }

    fun loadWavAsset(assetPath: String): FloatArray {
        context.assets.open(assetPath).use { inputStream ->
            // Skip 44-byte WAV header
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

