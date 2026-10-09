package com.margelo.nitro.nitrobackgroundgeolocation

import com.marianhello.bgloc.Config
import com.marianhello.bgloc.data.HashMapLocationTemplate
import com.marianhello.bgloc.data.LocationTemplateFactory
import com.margelo.nitro.core.AnyMap
import com.margelo.nitro.core.NullType
import java.util.HashMap

/**
 * The converter escapes the Config Contract declares. Hand written on purpose: `postTemplate` is an arbitrary nested map and `httpHeaders`
 * needs a Java `HashMap`, so making them expressible in the contract would
 * distort it to serve the generator.
 *
 * These also own the null-as-value branching. A nullable field cannot use
 * `?.let` — that skips an explicit null and makes "set this to nothing"
 * unreachable — and the variant type is named by nitrogen, so generated code
 * should not have to know it.
 */
object ConfigConverters {

    // Note the type asymmetry: the write side's optional field derives an inline
    // variant (`Variant_NullType_*`), while the read side's required field keeps
    // the declared alias name (`Nullable*`). Same shape, two generated names.
    fun applyHeaders(config: Config, value: Variant_NullType_Map_String__String_?) {
        when (value) {
            is Variant_NullType_Map_String__String_.First ->
                config.setHttpHeaders(null as HashMap<String, String>?)
            is Variant_NullType_Map_String__String_.Second ->
                config.setHttpHeaders(HashMap(value.value))
            null -> Unit // omitted: leave unchanged
        }
    }

    fun applyLocationTemplate(config: Config, value: Variant_NullType_AnyMap?) {
        when (value) {
            is Variant_NullType_AnyMap.First -> config.setTemplate(null)
            is Variant_NullType_AnyMap.Second ->
                config.setTemplate(LocationTemplateFactory.fromHashMap(value.value.toHashMap()))
            null -> Unit
        }
    }

    /**
     * A field the caller never set reads back as its contract default, which for
     * these two is the `null` *value* — never an absent field.
     */
    fun readHeaders(config: Config): NullableHeaders {
        // The getter replaces unset headers with an empty map.
        @Suppress("UNCHECKED_CAST")
        val headers = config.httpHeaders as? Map<String, String>
        if (headers.isNullOrEmpty()) return NullableHeaders.First(NullType.NULL)
        return NullableHeaders.Second(headers.toMap())
    }

    fun readLocationTemplate(config: Config): NullableAnyMap {
        if (!config.hasTemplate()) return NullableAnyMap.First(NullType.NULL)
        val template = config.template as? HashMapLocationTemplate
            ?: return NullableAnyMap.First(NullType.NULL)
        val map = template.toMap() as? Map<*, *>
            ?: return NullableAnyMap.First(NullType.NULL)
        val result = mutableMapOf<String, Any?>()
        for ((key, value) in map) {
            if (key is String) result[key] = value
        }
        return NullableAnyMap.Second(AnyMap.fromMap(result, false))
    }
}
