package com.voiceidentify

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.util.concurrent.Executors

class SpeakerRecognitionModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    private val executor = Executors.newSingleThreadExecutor()
    private var featureExtractor: AudioFeatureExtractor? = null
    private var classifier: SpeakerClassifier? = null
    private val recorderHelper = AudioRecorderHelper(reactContext)
    private val pendingEnrollmentEmbeddings = mutableListOf<FloatArray>()

    override fun getName(): String = "SpeakerRecognition"

    private fun getOrInitClassifier(): SpeakerClassifier {
        if (classifier == null) {
            classifier = SpeakerClassifier(reactContext)
        }
        return classifier!!
    }

    private fun getOrInitFeatureExtractor(): AudioFeatureExtractor {
        if (featureExtractor == null) {
            featureExtractor = AudioFeatureExtractor(reactContext)
        }
        return featureExtractor!!
    }

    @ReactMethod
    fun checkPermission(promise: Promise) {
        try {
            val granted = recorderHelper.hasRecordPermission()
            promise.resolve(granted)
        } catch (e: Exception) {
            promise.reject("PERMISSION_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun isModelReady(promise: Promise) {
        executor.execute {
            try {
                val ready = getOrInitClassifier().isReady()
                promise.resolve(ready)
            } catch (e: Exception) {
                promise.reject("MODEL_ERROR", e.message, e)
            }
        }
    }

    @ReactMethod
    fun getRegisteredSpeakers(promise: Promise) {
        executor.execute {
            try {
                val cls = getOrInitClassifier()
                val array = Arguments.createArray().apply {
                    pushString("abror")
                    pushString("dzaki")
                    pushString("ishma")
                    pushString("khairil")
                    for (custom in cls.getCustomEnrolledSpeakers()) {
                        pushString(custom.displayName)
                    }
                }
                promise.resolve(array)
            } catch (e: Exception) {
                promise.reject("ERROR", e.message, e)
            }
        }
    }

    @ReactMethod
    fun getCustomSpeakers(promise: Promise) {
        executor.execute {
            try {
                val cls = getOrInitClassifier()
                val list = Arguments.createArray()
                for (custom in cls.getCustomEnrolledSpeakers()) {
                    val map = Arguments.createMap().apply {
                        putString("id", custom.id)
                        putString("displayName", custom.displayName)
                        putInt("sampleCount", custom.sampleCount)
                        putString("enrolledAt", custom.enrolledAt)
                        putString(
                            "description",
                            "On-device enrolled speaker voiceprint (${custom.sampleCount} samples, 64-D L2 centroid)."
                        )
                    }
                    list.pushMap(map)
                }
                promise.resolve(list)
            } catch (e: Exception) {
                promise.reject("CUSTOM_SPEAKERS_ERROR", e.message, e)
            }
        }
    }

    @ReactMethod
    fun cancelEnrollment(promise: Promise) {
        executor.execute {
            pendingEnrollmentEmbeddings.clear()
            promise.resolve(true)
        }
    }

    @ReactMethod
    fun recordEnrollmentSample(promise: Promise) {
        executor.execute {
            try {
                if (!recorderHelper.hasRecordPermission()) {
                    promise.reject("PERMISSION_DENIED", "Microphone permission (RECORD_AUDIO) is not granted")
                    return@execute
                }

                val rawAudio = recorderHelper.recordAudio()
                val validation = recorderHelper.validateAndNormalizeSpeech(rawAudio, enforceStrictVad = true)

                if (!validation.isValidSpeech) {
                    promise.reject(
                        "VAD_REJECTED",
                        validation.rejectionReason ?: "No clear speech detected. Please speak clearly into the microphone."
                    )
                    return@execute
                }

                val extractor = getOrInitFeatureExtractor()
                val cls = getOrInitClassifier()
                val mel = extractor.extractMelSpectrogram(validation.normalizedSamples)
                val embedding = cls.extractEmbedding(mel)

                pendingEnrollmentEmbeddings.add(embedding)

                val res = Arguments.createMap().apply {
                    putInt("recordedSamples", pendingEnrollmentEmbeddings.size)
                    putDouble("rms", validation.rms.toDouble())
                    putDouble("activeFrameRatio", validation.activeFrameRatio.toDouble())
                }
                promise.resolve(res)
            } catch (e: Exception) {
                promise.reject("ENROLL_SAMPLE_ERROR", e.message, e)
            }
        }
    }

    @ReactMethod
    fun finalizeEnrollment(displayName: String, promise: Promise) {
        executor.execute {
            try {
                if (displayName.isBlank()) {
                    promise.reject("INVALID_NAME", "Speaker name cannot be empty.")
                    return@execute
                }
                if (pendingEnrollmentEmbeddings.isEmpty()) {
                    promise.reject("NO_SAMPLES", "Please record at least 1 voice sample before saving.")
                    return@execute
                }

                val cls = getOrInitClassifier()
                val entry = cls.enrollCustomSpeaker(displayName, pendingEnrollmentEmbeddings.toList())
                pendingEnrollmentEmbeddings.clear()

                val res = Arguments.createMap().apply {
                    putString("id", entry.id)
                    putString("displayName", entry.displayName)
                    putInt("sampleCount", entry.sampleCount)
                    putString("enrolledAt", entry.enrolledAt)
                }
                promise.resolve(res)
            } catch (e: Exception) {
                promise.reject("FINALIZE_ENROLL_ERROR", e.message, e)
            }
        }
    }

    @ReactMethod
    fun deleteCustomSpeaker(speakerId: String, promise: Promise) {
        executor.execute {
            try {
                val cls = getOrInitClassifier()
                val deleted = cls.deleteCustomSpeaker(speakerId)
                promise.resolve(deleted)
            } catch (e: Exception) {
                promise.reject("DELETE_SPEAKER_ERROR", e.message, e)
            }
        }
    }

    @ReactMethod
    fun classifyAssetSample(sampleName: String, promise: Promise) {
        executor.execute {
            try {
                val assetPath = if (sampleName.startsWith("test_samples/")) sampleName else "test_samples/$sampleName"
                val rawAudio = recorderHelper.loadWavAsset(assetPath)
                val validation = recorderHelper.validateAndNormalizeSpeech(rawAudio, enforceStrictVad = false)
                val extractor = getOrInitFeatureExtractor()
                val cls = getOrInitClassifier()

                val prepStart = System.currentTimeMillis()
                val mel = extractor.extractMelSpectrogram(validation.normalizedSamples)
                val prepTime = System.currentTimeMillis() - prepStart

                val result = cls.classify(mel)

                val response = Arguments.createMap().apply {
                    putString("speakerId", result.speakerId)
                    putString("speakerName", result.speakerName)
                    putDouble("confidence", result.confidence.toDouble())
                    putDouble("cosineSimilarity", result.cosineSimilarity.toDouble())
                    putBoolean("isRecognized", result.isRecognized)
                    putDouble("durationSeconds", 2.5)
                    putDouble("inferenceTimeMs", result.inferenceTimeMs.toDouble())
                    putDouble("preprocessingTimeMs", prepTime.toDouble())
                    if (result.rejectionReason != null) {
                        putString("rejectionReason", result.rejectionReason)
                    }

                    val scoreMap = Arguments.createMap()
                    for ((k, v) in result.scores) {
                        scoreMap.putDouble(k, v.toDouble())
                    }
                    putMap("scores", scoreMap)
                }

                promise.resolve(response)
            } catch (e: Exception) {
                promise.reject("CLASSIFY_ASSET_ERROR", "Failed to classify asset sample: ${e.message}", e)
            }
        }
    }

    @ReactMethod
    fun recordAndClassify(promise: Promise) {
        executor.execute {
            try {
                if (!recorderHelper.hasRecordPermission()) {
                    promise.reject("PERMISSION_DENIED", "Microphone permission (RECORD_AUDIO) is not granted")
                    return@execute
                }

                val recordStart = System.currentTimeMillis()
                val rawAudio = recorderHelper.recordAudio()
                val recordTime = System.currentTimeMillis() - recordStart

                // Step 1: Strict VAD & Silence Gate before running neural network
                val validation = recorderHelper.validateAndNormalizeSpeech(rawAudio, enforceStrictVad = true)
                if (!validation.isValidSpeech) {
                    val emptyScores = Arguments.createMap().apply {
                        putDouble("abror", 0.0)
                        putDouble("dzaki", 0.0)
                        putDouble("ishma", 0.0)
                        putDouble("khairil", 0.0)
                        putDouble("unknown", 1.0)
                    }
                    val rejectedResponse = Arguments.createMap().apply {
                        putString("speakerId", "spk_unknown")
                        putString("speakerName", "No Speech / Silence")
                        putDouble("confidence", 0.0)
                        putDouble("cosineSimilarity", 0.0)
                        putBoolean("isRecognized", false)
                        putDouble("durationSeconds", 2.5)
                        putDouble("recordingTimeMs", recordTime.toDouble())
                        putDouble("preprocessingTimeMs", 2.0)
                        putDouble("inferenceTimeMs", 0.0)
                        putString(
                            "rejectionReason",
                            validation.rejectionReason ?: "Silence or background noise rejected by VAD gate."
                        )
                        putMap("scores", emptyScores)
                    }
                    promise.resolve(rejectedResponse)
                    return@execute
                }

                val extractor = getOrInitFeatureExtractor()
                val cls = getOrInitClassifier()

                val prepStart = System.currentTimeMillis()
                val mel = extractor.extractMelSpectrogram(validation.normalizedSamples)
                val prepTime = System.currentTimeMillis() - prepStart

                val result = cls.classify(mel)

                val response = Arguments.createMap().apply {
                    putString("speakerId", result.speakerId)
                    putString("speakerName", result.speakerName)
                    putDouble("confidence", result.confidence.toDouble())
                    putDouble("cosineSimilarity", result.cosineSimilarity.toDouble())
                    putBoolean("isRecognized", result.isRecognized)
                    putDouble("durationSeconds", 2.5)
                    putDouble("recordingTimeMs", recordTime.toDouble())
                    putDouble("preprocessingTimeMs", prepTime.toDouble())
                    putDouble("inferenceTimeMs", result.inferenceTimeMs.toDouble())
                    if (result.rejectionReason != null) {
                        putString("rejectionReason", result.rejectionReason)
                    }

                    val scoreMap = Arguments.createMap()
                    for ((k, v) in result.scores) {
                        scoreMap.putDouble(k, v.toDouble())
                    }
                    putMap("scores", scoreMap)
                }

                promise.resolve(response)
            } catch (e: Exception) {
                promise.reject("RECORD_CLASSIFY_ERROR", "Failed to record and classify: ${e.message}", e)
            }
        }
    }
}
