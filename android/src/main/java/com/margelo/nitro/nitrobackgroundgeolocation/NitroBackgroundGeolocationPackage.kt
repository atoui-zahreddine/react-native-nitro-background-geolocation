package com.margelo.nitro.nitrobackgroundgeolocation

import com.facebook.react.BaseReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfoProvider

class NitroBackgroundGeolocationPackage : BaseReactPackage() {
    override fun getModule(name: String, reactContext: ReactApplicationContext): NativeModule? {
        // Provide the application context so the HybridObject can create
        // the BackgroundGeolocationFacade without needing a constructor argument.
        NitroBackgroundGeolocation.appContext = reactContext.applicationContext
        return null
    }

    override fun getReactModuleInfoProvider(): ReactModuleInfoProvider {
        return ReactModuleInfoProvider { HashMap() }
    }

    companion object {
        init {
            System.loadLibrary("nitrobackgroundgeolocation")
        }
    }
}
