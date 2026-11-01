package com.voiceidentify

import kotlin.math.cos
import kotlin.math.sin
import kotlin.math.sqrt

/**
 * Radix-2 Cooley-Tukey Real FFT utility for power-of-two window lengths (default 512).
 * Precomputes bit-reversal indices and trigonometric twiddle factors.
 */
class DftUtil(private val n: Int = 512) {
    private val cosTable = FloatArray(n / 2)
    private val sinTable = FloatArray(n / 2)
    private val bitRev = IntArray(n)

    init {
        require(n > 0 && (n and (n - 1)) == 0) { "N must be a power of 2, got $n" }
        val levels = 31 - Integer.numberOfLeadingZeros(n)
        for (i in 0 until n) {
            var rev = 0
            for (j in 0 until levels) {
                rev = (rev shl 1) or ((i shr j) and 1)
            }
            bitRev[i] = rev
        }
        val angleStep = -2.0 * Math.PI / n
        for (i in 0 until n / 2) {
            cosTable[i] = cos(angleStep * i).toFloat()
            sinTable[i] = sin(angleStep * i).toFloat()
        }
    }

    /**
     * Computes the one-sided magnitude spectrum for real input of size N.
     * Output array must have length (N / 2 + 1) = 257 for N=512.
     */
    fun rfftMagnitudes(input: FloatArray, scale: Float, outMag: FloatArray) {
        require(input.size == n) { "Input size must be $n" }
        require(outMag.size >= n / 2 + 1) { "outMag size must be at least ${n / 2 + 1}" }

        val re = FloatArray(n)
        val im = FloatArray(n)

        // Bit-reversal permutation
        for (i in 0 until n) {
            re[bitRev[i]] = input[i]
        }

        // Cooley-Tukey Radix-2 Butterfly stages
        var size = 2
        while (size <= n) {
            val half = size / 2
            val step = n / size
            var i = 0
            while (i < n) {
                var k = 0
                for (j in 0 until half) {
                    val c = cosTable[k]
                    val s = sinTable[k]
                    val tr = c * re[i + j + half] - s * im[i + j + half]
                    val ti = s * re[i + j + half] + c * im[i + j + half]

                    re[i + j + half] = re[i + j] - tr
                    im[i + j + half] = im[i + j] - ti
                    re[i + j] += tr
                    im[i + j] += ti

                    k += step
                }
                i += size
            }
            size = size shl 1
        }

        // Extract one-sided magnitude spectrum: |FFT[k]| * scale
        val outLen = n / 2 + 1
        for (i in 0 until outLen) {
            val r = re[i] * scale
            val m = im[i] * scale
            outMag[i] = sqrt(r * r + m * m)
        }
    }
}

