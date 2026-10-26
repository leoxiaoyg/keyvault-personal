package com.keyvault.personal.vault

import java.security.SecureRandom
import javax.crypto.Cipher
import javax.crypto.SecretKeyFactory
import javax.crypto.spec.GCMParameterSpec
import javax.crypto.spec.PBEKeySpec
import javax.crypto.spec.SecretKeySpec

object VaultCrypto {
    const val SALT_LENGTH = 16
    const val IV_LENGTH = 12
    const val AUTH_TAG_LENGTH = 16
    const val HEADER_LENGTH = SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH
    private const val PBKDF2_ITERATIONS = 100_000
    private const val KEY_LENGTH = 32
    private const val GCM_TAG_BITS = 128

    data class VaultFileParts(
        val salt: ByteArray,
        val iv: ByteArray,
        val authTag: ByteArray,
        val ciphertext: ByteArray
    )

    fun deriveKey(password: String, salt: ByteArray): ByteArray {
        val spec = PBEKeySpec(password.toCharArray(), salt, PBKDF2_ITERATIONS, KEY_LENGTH * 8)
        val factory = SecretKeyFactory.getInstance("PBKDF2WithHmacSHA512")
        return factory.generateSecret(spec).encoded
    }

    fun generateSalt(): ByteArray = ByteArray(SALT_LENGTH).also { SecureRandom().nextBytes(it) }

    fun parseVaultFile(buffer: ByteArray): VaultFileParts {
        if (buffer.size < HEADER_LENGTH) {
            throw IllegalArgumentException("Invalid vault file: too short")
        }
        return VaultFileParts(
            salt = buffer.copyOfRange(0, SALT_LENGTH),
            iv = buffer.copyOfRange(SALT_LENGTH, SALT_LENGTH + IV_LENGTH),
            authTag = buffer.copyOfRange(SALT_LENGTH + IV_LENGTH, HEADER_LENGTH),
            ciphertext = buffer.copyOfRange(HEADER_LENGTH, buffer.size)
        )
    }

    fun serializeVaultFile(salt: ByteArray, iv: ByteArray, authTag: ByteArray, ciphertext: ByteArray): ByteArray {
        return salt + iv + authTag + ciphertext
    }

    fun encrypt(plaintext: String, masterKey: ByteArray): Triple<ByteArray, ByteArray, ByteArray> {
        val iv = ByteArray(IV_LENGTH).also { SecureRandom().nextBytes(it) }
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        val keySpec = SecretKeySpec(masterKey, "AES")
        cipher.init(Cipher.ENCRYPT_MODE, keySpec, GCMParameterSpec(GCM_TAG_BITS, iv))

        val encryptedWithTag = cipher.doFinal(plaintext.toByteArray(Charsets.UTF_8))
        val ciphertext = encryptedWithTag.copyOfRange(0, encryptedWithTag.size - AUTH_TAG_LENGTH)
        val authTag = encryptedWithTag.copyOfRange(encryptedWithTag.size - AUTH_TAG_LENGTH, encryptedWithTag.size)
        return Triple(iv, ciphertext, authTag)
    }

    fun decrypt(ciphertext: ByteArray, iv: ByteArray, authTag: ByteArray, masterKey: ByteArray): String {
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        val keySpec = SecretKeySpec(masterKey, "AES")
        cipher.init(Cipher.DECRYPT_MODE, keySpec, GCMParameterSpec(GCM_TAG_BITS, iv))

        val combined = ByteArray(ciphertext.size + authTag.size)
        System.arraycopy(ciphertext, 0, combined, 0, ciphertext.size)
        System.arraycopy(authTag, 0, combined, ciphertext.size, authTag.size)

        return String(cipher.doFinal(combined), Charsets.UTF_8)
    }

    fun zeroize(key: ByteArray?) {
        key?.fill(0)
    }
}
