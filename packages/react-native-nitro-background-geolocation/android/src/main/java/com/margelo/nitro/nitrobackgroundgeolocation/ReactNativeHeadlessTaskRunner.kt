package com.margelo.nitro.nitrobackgroundgeolocation

import android.os.Bundle
import com.marianhello.bgloc.headless.AbstractTaskRunner
import com.marianhello.bgloc.headless.Task
import org.json.JSONArray
import org.json.JSONObject

class ReactNativeHeadlessTaskRunner : AbstractTaskRunner() {
    override fun runTask(task: Task) {
        val context = mContext ?: run {
            task.onError("Cannot run headless task without Android context.")
            return
        }
        val taskName = HeadlessTaskRegistry.getTaskName(context)
        if (taskName.isNullOrBlank()) {
            task.onError("Cannot run headless task because no task name is registered.")
            return
        }

        try {
            val taskBundle = task.bundle
            val params = bundleToJson(taskBundle.getBundle("params")).toString()
            val intent = HeadlessTaskService.createIntent(
                context,
                taskName,
                task.name,
                params
            )
            context.startService(intent)
            task.onResult(params)
        } catch (e: Exception) {
            task.onError("Failed to run React Native headless task: ${e.message}")
        }
    }

    private fun bundleToJson(bundle: Bundle?): JSONObject {
        val json = JSONObject()
        if (bundle == null) return json

        for (key in bundle.keySet()) {
            json.put(key, bundleValueToJson(bundle.get(key)))
        }

        return json
    }

    private fun bundleValueToJson(value: Any?): Any? {
        return when (value) {
            null -> JSONObject.NULL
            is Bundle -> bundleToJson(value)
            is Array<*> -> JSONArray(value.map { bundleValueToJson(it) })
            is BooleanArray -> JSONArray(value.map { it })
            is IntArray -> JSONArray(value.map { it })
            is LongArray -> JSONArray(value.map { it })
            is FloatArray -> JSONArray(value.map { it })
            is DoubleArray -> JSONArray(value.map { it })
            is ArrayList<*> -> JSONArray(value.map { bundleValueToJson(it) })
            else -> value
        }
    }
}
