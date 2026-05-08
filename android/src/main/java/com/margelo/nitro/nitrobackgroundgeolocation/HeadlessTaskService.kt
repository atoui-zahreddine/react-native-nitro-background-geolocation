package com.margelo.nitro.nitrobackgroundgeolocation

import android.content.Context
import android.content.Intent
import com.facebook.react.HeadlessJsTaskService
import com.facebook.react.bridge.Arguments
import com.facebook.react.jstasks.HeadlessJsTaskConfig

/**
 * A service that allows background JS execution for geolocation events
 * when the React Activity is not in the foreground.
 *
 * It receives the headless task name, event name, and serialized event params
 * via intent extras and delegates execution to React Native's HeadlessJsTaskService.
 */
class HeadlessTaskService : HeadlessJsTaskService() {

    override fun getTaskConfig(intent: Intent): HeadlessJsTaskConfig? {
        val extras = intent.extras ?: return null

        val taskName = extras.getString(EXTRA_TASK_NAME) ?: return null
        val eventName = extras.getString(EXTRA_EVENT_NAME) ?: ""
        val eventParams = extras.getString(EXTRA_EVENT_PARAMS) ?: "{}"

        val eventData = Arguments.createMap().apply {
            putString("event", eventName)
            putString("params", eventParams)
        }

        return HeadlessJsTaskConfig(
            taskName,
            eventData,
            TASK_TIMEOUT_MS,
            ALLOW_FOREGROUND
        )
    }

    companion object {
        private const val EXTRA_TASK_NAME = "taskName"
        private const val EXTRA_EVENT_NAME = "eventName"
        private const val EXTRA_EVENT_PARAMS = "eventParams"
        private const val TASK_TIMEOUT_MS = 30000L
        private const val ALLOW_FOREGROUND = true

        /**
         * Creates an Intent that can be used to start the [HeadlessTaskService].
         *
         * @param context Android context
         * @param taskName the name of the JS headless task to execute
         * @param eventName the geolocation event name (e.g. "location", "stationary")
         * @param eventParams JSON-serialized event parameters
         */
        fun createIntent(
            context: Context,
            taskName: String,
            eventName: String,
            eventParams: String
        ): Intent {
            return Intent(context, HeadlessTaskService::class.java).apply {
                putExtra(EXTRA_TASK_NAME, taskName)
                putExtra(EXTRA_EVENT_NAME, eventName)
                putExtra(EXTRA_EVENT_PARAMS, eventParams)
            }
        }
    }
}
