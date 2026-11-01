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
        try {
            val array = Arguments.createArray().apply {
                pushString("abror")
                pushString("dzaki")
                pushString("ishma")
                pushString("khairil")
            }
            promise.resolve(array)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun classifyAssetSample(sampleName: String, promise: Promise) {
        executor.execute {
            try {
                val assetPath = if (sampleName.startsWith("test_samples/")) sampleName else "test_samples/$sampleName"
                val audio = recorderHelper.loadWavAsset(assetPath)
                val extractor = getOrInitFeatureExtractor()
                val cls = getOrInitClassifier()

                val prepStart = System.currentTimeMillis()
                val mel = extractor.extractMelSpectrogram(audio)
                val prepTime = System.currentTimeMillis() - prepStart

                val result = cls.classify(mel)

                val response = Arguments.createMap().apply {
                    putString("speakerId", result.speakerId)
                    putString("speakerName", result.speakerName)
                    putDouble("confidence", result.confidence.toDouble())
                    putBoolean("isRecognized", result.isRecognized)
                    putDouble("durationSeconds", 2.5)
                    putDouble("inferenceTimeMs", result.inferenceTimeMs.toDouble())
                    putDouble("preprocessingTimeMs", prepTime.toDouble())

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
                val audio = recorderHelper.recordAudio()
                val recordTime = System.currentTimeMillis() - recordStart

                val extractor = getOrInitFeatureExtractor()
                val cls = getOrInitClassifier()

                val prepStart = System.currentTimeMillis()
                val mel = extractor.extractMelSpectrogram(audio)
                val prepTime = System.currentTimeMillis() - prepStart

                val result = cls.classify(mel)

                val response = Arguments.createMap().apply {
                    putString("speakerId", result.speakerId)
                    putString("speakerName", result.speakerName)
                    putDouble("confidence", result.confidence.toDouble())
                    putBoolean("isRecognized", result.isRecognized)
                    putDouble("durationSeconds", 2.5)
                    putDouble("recordingTimeMs", recordTime.toDouble())
                    putDouble("preprocessingTimeMs", prepTime.toDouble())
                    putDouble("inferenceTimeMs", result.inferenceTimeMs.toDouble())

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

