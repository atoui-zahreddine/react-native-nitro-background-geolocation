package com.margelo.nitro.nitrobackgroundgeolocation
  
import com.facebook.proguard.annotations.DoNotStrip

@DoNotStrip
class NitroBackgroundGeolocation : HybridNitroBackgroundGeolocationSpec() {
  override fun multiply(a: Double, b: Double): Double {
    return a * b
  }
}
