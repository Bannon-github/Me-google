/*
 * ThemeManager.kt — Android / ARCore stub for the Me-google VR theme system.
 *
 * This mirrors the API surface of the canonical TypeScript reference
 * (platform/quest/api/ThemeManager.ts). It is a documented stub: signatures and the token
 * fallback chain (ADR-003 §6) are fixed here; the Android/AR engineer wires the bodies to
 * Jetpack Compose theming (MaterialTheme / CompositionLocal) and the Style-Dictionary
 * Android outputs produced by `scripts/theme_pipeline.py build`.
 *
 * Fallback chain (ascending priority):
 *   userOverride -> accessibilityOverride -> activeTheme -> me-google-default -> safeDefault
 */
package dev.megoogle.quest.theme

/** DTCG `$type` values plus the Me-google VR extensions. */
enum class TokenType { COLOR, DIMENSION, FONT_FAMILY, FONT_WEIGHT, DURATION, CUBIC_BEZIER, NUMBER, TYPOGRAPHY, TRANSITION, DEPTH, AUDIO, HAPTIC }

/** Accessibility override modes (mirrors OS reduced-motion / high-contrast settings). */
enum class AccessibilityMode { HIGH_CONTRAST, REDUCED_MOTION }

/** A single design token; `value` may be a `{group.token}` alias string until resolved. */
data class ThemeToken(
    val value: Any,
    val type: TokenType? = null,
    val description: String? = null,
    val extensions: Map<String, Any?>? = null,
)

/** Theme manifest metadata (see manifest.json). */
data class ThemeManifest(
    val id: String,
    val name: String,
    val version: String,
    val author: String,
    val description: String,
    val accessibilityLevel: String,
    val targetComfortRating: String,
    val schemaVersion: String,
    val generatedBy: String? = null,
)

/** A fully-loaded theme: manifest, base tokens by category, and accessibility overrides. */
data class Theme(
    val manifest: ThemeManifest,
    val tokens: Map<String, Any>,          // category -> DTCG group tree
    val accessibility: Map<AccessibilityMode, Any>,
)

/** Platform adapter that pushes a resolved, flattened token map to the render layer. */
interface ThemeTarget {
    /** Apply a resolved token map (dotted path -> token). */
    fun apply(flatTokens: Map<String, ThemeToken>)
}

/**
 * Manages install / activate / switch / rollback of VR themes and applies accessibility
 * override layers. See ThemeManager.ts for the authoritative behavioural contract.
 */
class ThemeManager(
    private val target: ThemeTarget,
    private val defaultTheme: Theme? = null,
) {
    /** Load + validate a theme from its manifest path and register it as installed. */
    fun loadTheme(manifestPath: String): Theme = TODO("Wire to Android asset/file loader + schema validation")

    /** Activate a theme; resolve tokens through the fallback chain and apply to [target]. */
    fun activateTheme(theme: Theme): Unit = TODO("Resolve + apply; retain previous for rollback")

    /** Resolve a token by dotted path (e.g. \"color.surface.base\") through the fallback chain. */
    fun getToken(key: String): ThemeToken = TODO("Return resolved token or throw if unresolved")

    /** Enable a high-contrast / reduced-motion override layer and re-apply. */
    fun applyAccessibilityLayer(mode: AccessibilityMode): Unit = TODO("Merge override + re-apply")

    /** Disable any active accessibility override layer and re-apply the base theme. */
    fun clearAccessibilityLayer(): Unit = TODO("Clear mode + re-apply")

    /** Enumerate installed themes. */
    fun listInstalledThemes(): List<Theme> = TODO("Return installed themes")

    /** Non-destructively resolve a theme's tokens for a preview surface. */
    fun previewTheme(theme: Theme): Map<String, ThemeToken> = TODO("Resolve without changing active theme")

    /** Restore the previously active theme (single-level undo). */
    fun rollbackTheme(): Theme? = TODO("Swap active/previous + re-apply")
}
