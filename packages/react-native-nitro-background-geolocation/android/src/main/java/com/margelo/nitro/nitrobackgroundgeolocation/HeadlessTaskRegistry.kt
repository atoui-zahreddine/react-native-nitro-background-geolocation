package com.margelo.nitro.nitrobackgroundgeolocation

import android.content.Context

internal object HeadlessTaskRegistry {
    private const val PREFS_NAME = "NitroBackgroundGeolocation"
    private const val KEY_TASK_NAME = "headlessTaskName"

    @JvmStatic
    fun setTaskName(context: Context, taskName: String?) {
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .edit()
            .putString(KEY_TASK_NAME, taskName?.takeIf { it.isNotBlank() })
            .apply()
    }

    @JvmStatic
    fun getTaskName(context: Context): String? {
        return context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .getString(KEY_TASK_NAME, null)
            ?.takeIf { it.isNotBlank() }
    }
}
