package com.keyvault.personal.vault

import android.app.Activity
import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Handler
import android.os.Looper
import androidx.activity.result.ActivityResult
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.ActivityCallback
import com.getcapacitor.annotation.CapacitorPlugin

@CapacitorPlugin(name = "Vault")
class VaultPlugin : Plugin() {

    private val repository by lazy { VaultRepository(context) }
    private val mainHandler = Handler(Looper.getMainLooper())
    private var pendingClipboardText: String? = null

    @PluginMethod
    fun exists(call: PluginCall) {
        val ret = JSObject()
        ret.put("exists", repository.exists())
        call.resolve(ret)
    }

    @PluginMethod
    fun init(call: PluginCall) {
        val password = call.getString("password")
        if (password.isNullOrEmpty()) {
            call.reject("Password is required")
            return
        }

        try {
            repository.init(password)
            resolveSuccess(call)
        } catch (e: Exception) {
            call.reject(e.message ?: "Init failed")
        }
    }

    @PluginMethod
    fun unlock(call: PluginCall) {
        val password = call.getString("password")
        if (password.isNullOrEmpty()) {
            call.reject("Password is required")
            return
        }

        val success = repository.unlock(password)
        val ret = JSObject()
        ret.put("success", success)
        call.resolve(ret)
    }

    @PluginMethod
    fun lock(call: PluginCall) {
        repository.lock()
        notifyListeners("locked", JSObject())
        resolveSuccess(call)
    }

    @PluginMethod
    fun getData(call: PluginCall) {
        val data = repository.getData()
        val ret = JSObject()
        if (data == null) {
            ret.put("data", null)
        } else {
            ret.put("data", JSObject(data.toString()))
        }
        call.resolve(ret)
    }

    @PluginMethod
    fun saveEntry(call: PluginCall) {
        val entry = call.getObject("entry")
        if (entry == null) {
            call.reject("Entry is required")
            return
        }

        val result = repository.saveEntry(entry)
        resolveOpResult(call, result)
    }

    @PluginMethod
    fun deleteEntry(call: PluginCall) {
        val id = call.getString("id")
        if (id.isNullOrEmpty()) {
            call.reject("Entry id is required")
            return
        }

        val result = repository.deleteEntry(id)
        resolveOpResult(call, result)
    }

    @PluginMethod
    fun exportVault(call: PluginCall) {
        if (repository.isLocked()) {
            call.reject("Locked")
            return
        }

        if (!repository.exists()) {
            call.reject("Vault file does not exist")
            return
        }

        val intent = Intent(Intent.ACTION_CREATE_DOCUMENT).apply {
            addCategory(Intent.CATEGORY_OPENABLE)
            type = "application/octet-stream"
            putExtra(Intent.EXTRA_TITLE, "KeyVault_Backup.kvault")
        }
        startActivityForResult(call, intent, "exportVaultResult")
    }

    @ActivityCallback
    private fun exportVaultResult(call: PluginCall, result: ActivityResult) {
        if (result.resultCode != Activity.RESULT_OK || result.data?.data == null) {
            val ret = JSObject()
            ret.put("success", false)
            call.resolve(ret)
            return
        }

        try {
            val uri = result.data!!.data!!
            context.contentResolver.openOutputStream(uri)?.use { output ->
                repository.getVaultFile().inputStream().use { input ->
                    input.copyTo(output)
                }
            } ?: throw IllegalStateException("Unable to open export destination")

            val ret = JSObject()
            ret.put("success", true)
            call.resolve(ret)
        } catch (e: Exception) {
            val ret = JSObject()
            ret.put("success", false)
            ret.put("error", e.message ?: "Export failed")
            call.resolve(ret)
        }
    }

    @PluginMethod
    fun importVault(call: PluginCall) {
        if (repository.isLocked()) {
            val ret = JSObject()
            ret.put("success", false)
            ret.put("error", "Locked")
            call.resolve(ret)
            return
        }

        val intent = Intent(Intent.ACTION_OPEN_DOCUMENT).apply {
            addCategory(Intent.CATEGORY_OPENABLE)
            type = "*/*"
        }
        startActivityForResult(call, intent, "importVaultResult")
    }

    @ActivityCallback
    private fun importVaultResult(call: PluginCall, result: ActivityResult) {
        if (result.resultCode != Activity.RESULT_OK || result.data?.data == null) {
            val ret = JSObject()
            ret.put("success", false)
            call.resolve(ret)
            return
        }

        try {
            val uri = result.data!!.data!!
            val buffer = context.contentResolver.openInputStream(uri)?.use { input ->
                input.readBytes()
            } ?: throw IllegalStateException("Unable to read import file")

            val importResult = repository.importMerge(buffer)
            val ret = JSObject()
            ret.put("success", importResult.success)
            ret.put("addedCount", importResult.addedCount)
            if (importResult.error != null) {
                ret.put("error", importResult.error)
            }
            call.resolve(ret)
        } catch (e: Exception) {
            val ret = JSObject()
            ret.put("success", false)
            ret.put("error", e.message ?: "Import failed")
            call.resolve(ret)
        }
    }

    @PluginMethod
    fun copyToClipboard(call: PluginCall) {
        val text = call.getString("text")
        if (text == null) {
            call.reject("Text is required")
            return
        }

        val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
        clipboard.setPrimaryClip(ClipData.newPlainText("password", text))

        pendingClipboardText = text
        val clearRunnable = Runnable {
            val current = clipboard.primaryClip?.getItemAt(0)?.coerceToText(context)?.toString()
            if (current == text) {
                clipboard.setPrimaryClip(ClipData.newPlainText("", ""))
            }
            if (pendingClipboardText == text) {
                pendingClipboardText = null
            }
        }

        mainHandler.removeCallbacksAndMessages(null)
        mainHandler.postDelayed(clearRunnable, 30_000)

        val ret = JSObject()
        ret.put("success", true)
        call.resolve(ret)
    }

    private fun resolveSuccess(call: PluginCall) {
        val ret = JSObject()
        ret.put("success", true)
        call.resolve(ret)
    }

    private fun resolveOpResult(call: PluginCall, result: VaultRepository.OpResult) {
        val ret = JSObject()
        ret.put("success", result.success)
        if (result.error != null) {
            ret.put("error", result.error)
        }
        call.resolve(ret)
    }
}
