package com.voiceidentify

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject
import org.tensorflow.lite.Interpreter
import java.io.File
import java.io.FileInputStream
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.nio.channels.FileChannel
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone
import kotlin.math.max
import kotlin.math.sqrt

data class ClassificationResult(
    val speakerId: String,
    val speakerName: String,
    val confidence: Float,
    val cosineSimilarity: Float,
    val isRecognized: Boolean,
    val scores: Map<String, Float>,
    val inferenceTimeMs: Long,
    val rejectionReason: String? = null
)

data class CustomSpeakerEntry(
    val id: String,
    val displayName: String,
    val sampleCount: Int,
    val enrolledAt: String,
    val centroid: FloatArray
)

class SpeakerClassifier(private val context: Context) {
    private var interpreter: Interpreter? = null
    private val classLabels = listOf("abror", "dzaki", "ishma", "khairil", "unknown")
    private val authorizedLabels = listOf("abror", "dzaki", "ishma", "khairil")
    private val speakerDisplayNames = mapOf(
        "abror" to "Abror",
        "dzaki" to "Dzaki",
        "ishma" to "Ishma",
        "khairil" to "Khairil"
    )

    private val embeddingDim = 64
    private var confidenceThreshold = 0.80f
    private var customCosineThreshold = 0.82f
    private val baseCentroids = mutableMapOf<String, FloatArray>()
    private val centroidThresholds = mutableMapOf<String, Float>()
    private val customSpeakers = mutableListOf<CustomSpeakerEntry>()
    private val customStorageFile = File(context.filesDir, "custom_enrolled_speakers.json")

    init {
        loadModel()
        loadModelConfig()
        loadCustomSpeakers()
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

    private fun loadModelConfig() {
        try {
            val jsonStr = context.assets.open("model_config.json").bufferedReader().use { it.readText() }
            val json = JSONObject(jsonStr)
            confidenceThreshold = json.optDouble("confidence_threshold", 0.80).toFloat()
            customCosineThreshold = json.optDouble("custom_enrollment_cosine_threshold", 0.82).toFloat()

            val threshObj = json.optJSONObject("centroid_thresholds")
            if (threshObj != null) {
                for (spk in authorizedLabels) {
                    if (threshObj.has(spk)) {
                        centroidThresholds[spk] = threshObj.getDouble(spk).toFloat()
                    }
                }
            }

            val centroidsObj = json.optJSONObject("centroids")
            if (centroidsObj != null) {
                for (spk in authorizedLabels) {
                    val arr = centroidsObj.optJSONArray(spk)
                    if (arr != null && arr.length() == embeddingDim) {
                        val vec = FloatArray(embeddingDim)
                        for (i in 0 until embeddingDim) {
                            vec[i] = arr.getDouble(i).toFloat()
                        }
                        baseCentroids[spk] = l2Normalize(vec)
                    }
                }
            }
        } catch (_: Exception) {
            // Fallback defaults if config has old format
        }
    }

    private fun loadCustomSpeakers() {
        customSpeakers.clear()
        if (!customStorageFile.exists()) return
        try {
            val jsonStr = customStorageFile.readText()
            val arr = JSONArray(jsonStr)
            for (i in 0 until arr.length()) {
                val obj = arr.getJSONObject(i)
                val id = obj.getString("id")
                val name = obj.getString("displayName")
                val count = obj.optInt("sampleCount", 3)
                val enrolledAt = obj.optString("enrolledAt", "")
                val cArr = obj.getJSONArray("centroid")
                if (cArr.length() == embeddingDim) {
                    val vec = FloatArray(embeddingDim)
                    for (j in 0 until embeddingDim) {
                        vec[j] = cArr.getDouble(j).toFloat()
                    }
                    customSpeakers.add(
                        CustomSpeakerEntry(
                            id = id,
                            displayName = name,
                            sampleCount = count,
                            enrolledAt = enrolledAt,
                            centroid = l2Normalize(vec)
                        )
                    )
                }
            }
        } catch (_: Exception) {
        }
    }

    private fun saveCustomSpeakers() {
        val arr = JSONArray()
        for (spk in customSpeakers) {
            val obj = JSONObject()
            obj.put("id", spk.id)
            obj.put("displayName", spk.displayName)
            obj.put("sampleCount", spk.sampleCount)
            obj.put("enrolledAt", spk.enrolledAt)
            val cArr = JSONArray()
            for (v in spk.centroid) {
                cArr.put(v.toDouble())
            }
            obj.put("centroid", cArr)
            arr.put(obj)
        }
        customStorageFile.writeText(arr.toString(2))
    }

    private fun l2Normalize(vec: FloatArray): FloatArray {
        var sumSq = 0.0f
        for (v in vec) sumSq += v * v
        val norm = sqrt(sumSq) + 1e-8f
        return FloatArray(vec.size) { i -> vec[i] / norm }
    }

    private fun cosineSimilarity(a: FloatArray, b: FloatArray): Float {
        var dot = 0.0f
        val len = minOf(a.size, b.size)
        for (i in 0 until len) {
            dot += a[i] * b[i]
        }
        return dot.coerceIn(-1.0f, 1.0f)
    }

    fun isReady(): Boolean = interpreter != null

    fun getCustomEnrolledSpeakers(): List<CustomSpeakerEntry> = customSpeakers.toList()

    fun extractEmbedding(melSpectrogram: Array<FloatArray>): FloatArray {
        val (_, embedding, _) = runForwardPass(melSpectrogram)
        return embedding
    }

    fun enrollCustomSpeaker(displayName: String, embeddings: List<FloatArray>): CustomSpeakerEntry {
        require(embeddings.isNotEmpty()) { "At least 1 voice embedding is required for enrollment" }
        val avg = FloatArray(embeddingDim)
        for (emb in embeddings) {
            val normEmb = l2Normalize(emb)
            for (i in 0 until embeddingDim) {
                avg[i] += normEmb[i]
            }
        }
        val centroid = l2Normalize(avg)
        val cleanSlug = displayName.trim().lowercase(Locale.US).replace(Regex("[^a-z0-9]+"), "_")
        val id = "spk_custom_${cleanSlug}_${System.currentTimeMillis() % 100000}"
        val isoFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US).apply {
            timeZone = TimeZone.getTimeZone("UTC")
        }
        val entry = CustomSpeakerEntry(
            id = id,
            displayName = displayName.trim(),
            sampleCount = embeddings.size,
            enrolledAt = isoFormat.format(Date()),
            centroid = centroid
        )
        // Replace existing custom speaker with same displayName if re-enrolling
        customSpeakers.removeAll { it.displayName.equals(displayName.trim(), ignoreCase = true) }
        customSpeakers.add(entry)
        saveCustomSpeakers()
        return entry
    }

    fun deleteCustomSpeaker(speakerId: String): Boolean {
        val removed = customSpeakers.removeAll { it.id == speakerId }
        if (removed) {
            saveCustomSpeakers()
        }
        return removed
    }

    private fun runForwardPass(melSpectrogram: Array<FloatArray>): Triple<FloatArray, FloatArray, Long> {
        val tflite = interpreter ?: throw IllegalStateException("TFLite Interpreter is not initialized")
        val startTime = System.currentTimeMillis()

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

        // Inspect output tensor size dynamically (supports [1, 69] dual-head or [1, 5])
        val outShape = tflite.getOutputTensor(0).shape()
        val outCols = if (outShape.size >= 2) outShape[1] else 5
        val outputBuffer = ByteBuffer.allocateDirect(1 * outCols * 4)
        outputBuffer.order(ByteOrder.nativeOrder())

        tflite.run(inputBuffer, outputBuffer)
        outputBuffer.rewind()

        val numProbs = if (outCols >= 69) 5 else outCols
        val probs = FloatArray(numProbs)
        for (i in 0 until numProbs) {
            probs[i] = outputBuffer.float
        }

        val rawEmb = FloatArray(embeddingDim)
        if (outCols >= 5 + embeddingDim) {
            for (i in 0 until embeddingDim) {
                rawEmb[i] = outputBuffer.float
            }
        }

        val elapsed = System.currentTimeMillis() - startTime
        return Triple(probs, l2Normalize(rawEmb), elapsed)
    }

    fun classify(melSpectrogram: Array<FloatArray>): ClassificationResult {
        val (probs, embedding, inferenceTime) = runForwardPass(melSpectrogram)

        val scoreMap = mutableMapOf<String, Float>()
        var bestAuthIdx = 0
        var bestAuthProb = -1.0f

        for (i in probs.indices) {
            val label = if (i < classLabels.size) classLabels[i] else "class_$i"
            scoreMap[label] = probs[i]
            if (i < 4 && probs[i] > bestAuthProb) {
                bestAuthProb = probs[i]
                bestAuthIdx = i
            }
        }

        val unknownProb = if (probs.size >= 5) probs[4] else 0.0f

        // 1. Check Custom Enrolled Speakers first via Voiceprint Cosine Similarity
        var bestCustomSpeaker: CustomSpeakerEntry? = null
        var bestCustomSim = -1.0f
        for (custom in customSpeakers) {
            val sim = cosineSimilarity(embedding, custom.centroid)
            scoreMap[custom.displayName.lowercase(Locale.US)] = max(0f, sim)
            if (sim > bestCustomSim) {
                bestCustomSim = sim
                bestCustomSpeaker = custom
            }
        }

        // Compute cosine similarity to the winning base speaker centroid
        val bestBaseLabel = authorizedLabels[bestAuthIdx]
        val baseCentroid = baseCentroids[bestBaseLabel]
        val baseCosSim = if (baseCentroid != null) cosineSimilarity(embedding, baseCentroid) else bestAuthProb
        val reqBaseCosThresh = centroidThresholds[bestBaseLabel] ?: 0.74f

        // If a custom speaker matches strongly (>= customCosineThreshold) and beats base speaker similarity
        if (bestCustomSpeaker != null && bestCustomSim >= customCosineThreshold && bestCustomSim >= baseCosSim) {
            return ClassificationResult(
                speakerId = bestCustomSpeaker.id,
                speakerName = bestCustomSpeaker.displayName,
                confidence = bestCustomSim,
                cosineSimilarity = bestCustomSim,
                isRecognized = true,
                scores = scoreMap,
                inferenceTimeMs = inferenceTime,
                rejectionReason = null
            )
        }

        // 2. Dual-Gate Verification for the 4 Base Authorized Speakers
        val passesSoftmaxGate = bestAuthProb >= confidenceThreshold && unknownProb < 0.25f
        val passesCentroidGate = baseCosSim >= reqBaseCosThresh

        if (passesSoftmaxGate && passesCentroidGate) {
            val blendedConfidence = (0.6f * bestAuthProb + 0.4f * baseCosSim).coerceIn(0f, 1f)
            return ClassificationResult(
                speakerId = "spk_$bestBaseLabel",
                speakerName = speakerDisplayNames[bestBaseLabel] ?: bestBaseLabel,
                confidence = blendedConfidence,
                cosineSimilarity = baseCosSim,
                isRecognized = true,
                scores = scoreMap,
                inferenceTimeMs = inferenceTime,
                rejectionReason = null
            )
        }

        // 3. Otherwise -> Strictly Reject (Access Denied / Unknown Impostor)
        val reason = when {
            unknownProb >= 0.25f -> "Voice pattern matched Unknown/Impostor class (${(unknownProb * 100).toInt()}% impostor score)."
            bestAuthProb < confidenceThreshold -> "Confidence (${(bestAuthProb * 100).toInt()}%) is below the ${(confidenceThreshold * 100).toInt()}% security threshold."
            else -> "Biometric voiceprint similarity (${(baseCosSim * 100).toInt()}%) failed centroid verification for ${speakerDisplayNames[bestBaseLabel]} (requires >= ${(reqBaseCosThresh * 100).toInt()}%)."
        }

        return ClassificationResult(
            speakerId = "spk_unknown",
            speakerName = "Unrecognized Speaker",
            confidence = max(bestAuthProb, max(0f, bestCustomSim)),
            cosineSimilarity = max(baseCosSim, max(0f, bestCustomSim)),
            isRecognized = false,
            scores = scoreMap,
            inferenceTimeMs = inferenceTime,
            rejectionReason = reason
        )
    }

    fun close() {
        interpreter?.close()
        interpreter = null
    }
}
