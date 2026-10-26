package com.keyvault.personal.vault

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject
import java.io.File

class VaultRepository(private val context: Context) {
    private val vaultFile = File(context.filesDir, "vault.dat")
    private var masterKey: ByteArray? = null
    private var cachedData: JSONObject? = null

    fun exists(): Boolean = vaultFile.exists()

    fun isLocked(): Boolean = masterKey == null

    fun init(password: String) {
        val salt = VaultCrypto.generateSalt()
        masterKey = VaultCrypto.deriveKey(password, salt)
        cachedData = JSONObject().put("version", 1).put("entries", JSONArray())
        saveToFile(salt)
    }

    fun unlock(password: String): Boolean {
        if (!exists()) return false

        return try {
            val parts = VaultCrypto.parseVaultFile(vaultFile.readBytes())
            val key = VaultCrypto.deriveKey(password, parts.salt)
            val decrypted = VaultCrypto.decrypt(parts.ciphertext, parts.iv, parts.authTag, key)
            masterKey = key
            cachedData = migrateEntries(JSONObject(decrypted))
            true
        } catch (_: Exception) {
            lock()
            false
        }
    }

    fun lock() {
        VaultCrypto.zeroize(masterKey)
        masterKey = null
        cachedData = null
    }

    fun getData(): JSONObject? {
        if (isLocked()) return null
        return cachedData
    }

    fun saveEntry(entry: JSONObject): OpResult {
        if (isLocked()) return OpResult(false, "Locked")

        val data = cachedData ?: return OpResult(false, "No data")
        val entries = data.getJSONArray("entries")
        val entryId = entry.getString("id")
        var found = false

        for (i in 0 until entries.length()) {
            if (entries.getJSONObject(i).getString("id") == entryId) {
                entries.put(i, entry)
                found = true
                break
            }
        }

        if (!found) {
            entries.put(entry)
        }

        saveToFile()
        return OpResult(true)
    }

    fun deleteEntry(id: String): OpResult {
        if (isLocked()) return OpResult(false, "Locked")

        val data = cachedData ?: return OpResult(false, "No data")
        val entries = data.getJSONArray("entries")
        val next = JSONArray()

        for (i in 0 until entries.length()) {
            val entry = entries.getJSONObject(i)
            if (entry.getString("id") != id) {
                next.put(entry)
            }
        }

        data.put("entries", next)
        saveToFile()
        return OpResult(true)
    }

    fun importMerge(buffer: ByteArray): ImportResult {
        if (isLocked()) return ImportResult(false, error = "Locked")

        return try {
            if (buffer.size < VaultCrypto.HEADER_LENGTH) {
                throw IllegalArgumentException("Invalid backup file")
            }

            val parts = VaultCrypto.parseVaultFile(buffer)
            val key = masterKey ?: throw IllegalStateException("Vault is locked")
            val decrypted = VaultCrypto.decrypt(parts.ciphertext, parts.iv, parts.authTag, key)
            val imported = JSONObject(decrypted)
            val current = cachedData ?: throw IllegalStateException("No current data to merge into")

            val importedEntries = imported.getJSONArray("entries")
            val currentEntries = current.getJSONArray("entries")
            var addedCount = 0

            for (i in 0 until importedEntries.length()) {
                val impEntry = importedEntries.getJSONObject(i)
                val impSite = impEntry.optString("site", "").lowercase()
                val impUrl = impEntry.optString("url", "").lowercase()
                var duplicate = false

                for (j in 0 until currentEntries.length()) {
                    val existing = currentEntries.getJSONObject(j)
                    val existingSite = existing.optString("site", "").lowercase()
                    val existingUrl = existing.optString("url", "").lowercase()
                    if (existingSite == impSite && existingUrl == impUrl) {
                        duplicate = true
                        break
                    }
                }

                if (!duplicate) {
                    currentEntries.put(impEntry)
                    addedCount++
                }
            }

            if (addedCount > 0) {
                saveToFile()
            }

            ImportResult(true, addedCount)
        } catch (e: Exception) {
            val message = e.message ?: "Import failed"
            if (
                message.contains("Unsupported state", ignoreCase = true) ||
                message.contains("authenticate", ignoreCase = true) ||
                message.contains("Tag mismatch", ignoreCase = true)
            ) {
                ImportResult(
                    false,
                    error = "Failed to decrypt backup. It might have a different master password."
                )
            } else {
                ImportResult(false, error = message)
            }
        }
    }

    fun getVaultFile(): File = vaultFile

    private fun saveToFile(saltOverride: ByteArray? = null) {
        val data = cachedData ?: throw IllegalStateException("Cannot save empty vault")
        val key = masterKey ?: throw IllegalStateException("Vault is locked")

        val salt = saltOverride ?: VaultCrypto.parseVaultFile(vaultFile.readBytes()).salt
        val (iv, ciphertext, authTag) = VaultCrypto.encrypt(data.toString(), key)
        val bytes = VaultCrypto.serializeVaultFile(salt, iv, authTag, ciphertext)

        val tmp = File(vaultFile.parentFile, "${vaultFile.name}.tmp")
        tmp.writeBytes(bytes)
        if (vaultFile.exists() && !vaultFile.delete()) {
            throw IllegalStateException("Failed to replace vault file")
        }
        if (!tmp.renameTo(vaultFile)) {
            tmp.copyTo(vaultFile, overwrite = true)
            tmp.delete()
        }
    }

    private fun migrateEntries(parsed: JSONObject): JSONObject {
        if (!parsed.has("entries")) {
            return JSONObject().put("version", 1).put("entries", JSONArray())
        }

        val entries = parsed.getJSONArray("entries")
        for (i in 0 until entries.length()) {
            val entry = entries.getJSONObject(i)
            if (!entry.has("accounts")) {
                val accounts = JSONArray()
                val account = JSONObject()
                    .put("id", "${entry.getString("id")}-default")
                    .put("username", entry.optString("username", ""))
                    .put("password", entry.optString("password", ""))
                    .put("bindings", JSONArray())
                    .put("notes", entry.optString("notes", ""))
                accounts.put(account)
                entry.put("accounts", accounts)
            }
        }

        return parsed
    }

    data class OpResult(val success: Boolean, val error: String? = null)

    data class ImportResult(val success: Boolean, val addedCount: Int = 0, val error: String? = null)
}
