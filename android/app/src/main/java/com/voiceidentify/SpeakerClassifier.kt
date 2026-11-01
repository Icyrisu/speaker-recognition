package com.voiceidentify

import android.content.Context
import org.tensorflow.lite.Interpreter
import java.io.FileInputStream
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.nio.channels.FileChannel

data class ClassificationResult(
    val speakerId: String,
    val speakerName: String,
    val confidence: Float,
    val isRecognized: Boolean,
    val scores: Map<String, Float>,
    val inferenceTimeMs: Long
)

class SpeakerClassifier(private val context: Context) {
    private var interpreter: Interpreter? = null
    private val classLabels = listOf("abror", "dzaki", "ishma", "khairil")
    private val speakerDisplayNames = mapOf(
        "abror" to "Abror",
        "dzaki" to "Dzaki",
        "ishma" to "Ishma",
        "khairil" to "Khairil"
    )
    private val recognitionThreshold = 0.70f

    init {
        loadModel()
    }

    private fun loadModel() {
        val assetFileDescriptor = context.assets.openFd("speaker_model.tflite")
        val inputStream = FileInputStream(assetFileDescriptor.fileDescriptor)
        val fileChannel = inputStream.channel
        val startOffset = assetFileDescriptor.startOffset
        val declaredLength = assetFileDescriptor.declaredLength
        val modelByteBuffer = fileChannel.map(FileChannel.MapMode.READ_ONLY, startOffset, declaredLength)

        val options = Interpreter.Options().apply {
            setNumThreads(2)
        }
        interpreter = Interpreter(modelByteBuffer, options)
    }

    fun isReady(): Boolean = interpreter != null

    fun classify(melSpectrogram: Array<FloatArray>): ClassificationResult {
        val tflite = interpreter ?: throw IllegalStateException("TFLite Interpreter is not initialized")
        val startTime = System.currentTimeMillis()

        // Input shape: [1, 158, 64, 1]
        val numFrames = 158
        val numMels = 64
        val inputBuffer = ByteBuffer.allocateDirect(1 * numFrames * numMels * 1 * 4)
        inputBuffer.order(ByteOrder.nativeOrder())

        for (t in 0 until numFrames) {
            for (m in 0 until numMels) {
                inputBuffer.putFloat(melSpectrogram[t][m])
            }
        }
        inputBuffer.rewind()

        // Output shape: [1, 4]
        val outputBuffer = ByteBuffer.allocateDirect(1 * 4 * 4)
        outputBuffer.order(ByteOrder.nativeOrder())

        tflite.run(inputBuffer, outputBuffer)
        outputBuffer.rewind()

        val probabilities = FloatArray(4)
        var maxProb = -1.0f
        var maxIdx = -1
        val scoreMap = mutableMapOf<String, Float>()

        for (i in 0 until 4) {
            val prob = outputBuffer.float
            probabilities[i] = prob
            scoreMap[classLabels[i]] = prob
            if (prob > maxProb) {
                maxProb = prob
                maxIdx = i
            }
        }

        val inferenceTime = System.currentTimeMillis() - startTime
        val isRecognized = maxProb >= recognitionThreshold && maxIdx != -1

        val predictedClass = if (isRecognized) classLabels[maxIdx] else "unknown"
        val speakerName = if (isRecognized) speakerDisplayNames[predictedClass] ?: predictedClass.replaceFirstChar { it.uppercase() } else "Unrecognized Voice"
        val speakerId = if (isRecognized) "spk_$predictedClass" else "spk_unknown"

        return ClassificationResult(
            speakerId = speakerId,
            speakerName = speakerName,
            confidence = maxProb,
            isRecognized = isRecognized,
            scores = scoreMap,
            inferenceTimeMs = inferenceTime
        )
    }

    fun close() {
        interpreter?.close()
        interpreter = null
    }
}

