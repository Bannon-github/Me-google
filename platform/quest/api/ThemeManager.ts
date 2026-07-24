/**
 * ThemeManager.ts — cross-platform reference implementation of the Me-google VR theme
 * system for Meta Quest (WebXR target).
 *
 * This is the canonical implementation; {@link ../ThemeManager.kt} (Android/ARCore) and
 * {@link ../ThemeManager.swift} (visionOS) mirror this API surface. See
 * `docs/adr/ADR-003-theme-system-architecture.md` for the design rationale and the token
 * fallback chain.
 *
 * Themes are DTCG-aligned design-token documents. Tokens carry `$value` / `$type` /
 * `$description`; `{group.token}` strings are aliases resolved to the referenced value.
 * VR-specific token types (`depth`, `audio`, `haptic`) extend the DTCG core vocabulary.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

// ---------------------------------------------------------------------------
// Token type vocabulary (DTCG core + VR extensions)
// ---------------------------------------------------------------------------

/** DTCG `$type` values plus the Me-google VR extensions. */
export type TokenType =
  | 'color'
  | 'dimension'
  | 'fontFamily'
  | 'fontWeight'
  | 'duration'
  | 'cubicBezier'
  | 'number'
  | 'typography'
  | 'transition'
  | 'depth'
  | 'audio'
  | 'haptic';

/** A DTCG colour value: gamma-encoded sRGB components in [0,1] plus a hex string. */
export interface ColorValue {
  colorSpace: 'srgb';
  /** Gamma-encoded sRGB channels, each in [0,1]. */
  components: [number, number, number];
  hex: string;
}

/** A DTCG dimension value. `px` maps to Android dp / iOS pt; `rem` is a font multiple. */
export interface DimensionValue {
  value: number;
  unit: 'px' | 'rem';
}

/** A DTCG duration value. */
export interface DurationValue {
  value: number;
  unit: 'ms' | 's';
}

/** A DTCG cubic-bezier easing curve `[P1x, P1y, P2x, P2y]`. */
export type CubicBezierValue = [number, number, number, number];

/** Any resolved token value. */
export type TokenValue =
  | ColorValue
  | DimensionValue
  | DurationValue
  | CubicBezierValue
  | string
  | string[]
  | number
  | Record<string, unknown>;

/** A single design token in its authored (possibly aliased) form. */
export interface ThemeToken<V = TokenValue> {
  /** The token value, or a `{group.token}` alias string. */
  $value: V | string;
  $type?: TokenType;
  $description?: string;
  $extensions?: Record<string, unknown>;
}

/** A DTCG group: nested groups and tokens; may carry an inheritable `$type`. */
export interface TokenGroup {
  $type?: TokenType;
  $description?: string;
  $extensions?: Record<string, unknown>;
  [key: string]: TokenGroup | ThemeToken | TokenType | string | Record<string, unknown> | undefined;
}

/** The token categories every theme must define. */
export type TokenCategory =
  | 'color'
  | 'typography'
  | 'spacing'
  | 'depth'
  | 'motion'
  | 'audio'
  | 'haptics';

/** Accessibility override modes. */
export type AccessibilityMode = 'high-contrast' | 'reduced-motion';

/** Theme manifest metadata (see `manifest.json`). */
export interface ThemeManifest {
  id: string;
  name: string;
  version: string;
  author: string;
  description: string;
  accessibilityLevel: 'A' | 'AA' | 'AAA';
  targetComfortRating: 'Comfortable' | 'Moderate' | 'Intense';
  schemaVersion: string;
  generatedBy?: string | null;
  license?: string;
  checksums?: Record<string, string>;
}

/** A fully-loaded theme: manifest, base tokens per category, and accessibility overrides. */
export interface Theme {
  manifest: ThemeManifest;
  tokens: Record<TokenCategory, TokenGroup>;
  accessibility: Partial<Record<AccessibilityMode, TokenGroup>>;
}

/** Platform adapter — how resolved tokens are pushed to the render layer. */
export interface ThemeTarget {
  /**
   * Apply a resolved, flattened token map to the platform variable layer.
   * The WebXR default writes CSS custom properties (`--mg-<dotted-path>`).
   */
  apply(flatTokens: Map<string, ThemeToken>): void;
}

/** Loads raw JSON for a theme by manifest path (injectable for testing / platform I/O). */
export type ThemeLoaderFn = (manifestPath: string) => Promise<{
  manifest: ThemeManifest;
  tokens: Record<TokenCategory, TokenGroup>;
  accessibility: Partial<Record<AccessibilityMode, TokenGroup>>;
}>;

// ---------------------------------------------------------------------------
// Default WebXR target: CSS custom properties
// ---------------------------------------------------------------------------

/**
 * Default {@link ThemeTarget} for the WebXR platform. Writes each token to a CSS custom
 * property named `--mg-<dotted.path>` (dots replaced by dashes) on `:root`. Colours are
 * written as hex; dimensions/durations as `value+unit`; scalars verbatim. No-ops when
 * `document` is unavailable (e.g. in a test/worker context).
 */
export class CssVariableTarget implements ThemeTarget {
  apply(flatTokens: Map<string, ThemeToken>): void {
    const root: any =
      typeof document !== 'undefined' ? (document as any).documentElement : undefined;
    if (!root || !root.style) return;
    for (const [path, token] of flatTokens) {
      root.style.setProperty(`--mg-${path.replace(/\./g, '-')}`, cssValueOf(token.$value));
    }
  }
}

/** Serialise a resolved token value to a CSS string. */
function cssValueOf(value: ThemeToken['$value']): string {
  if (value && typeof value === 'object') {
    if ('hex' in (value as ColorValue)) return (value as ColorValue).hex;
    if ('value' in (value as DimensionValue) && 'unit' in (value as DimensionValue)) {
      const d = value as DimensionValue;
      return `${d.value}${d.unit}`;
    }
    if (Array.isArray(value)) return `cubic-bezier(${(value as number[]).join(', ')})`;
  }
  return String(value);
}

// ---------------------------------------------------------------------------
// ThemeManager
// ---------------------------------------------------------------------------

const RESERVED = new Set(['$value', '$type', '$description', '$extensions']);

/**
 * Manages installation, activation, switching, and rollback of VR themes, and applies
 * accessibility override layers. Implements the ADR-003 token fallback chain:
 *
 * user override → accessibility override → active theme → me-google-default → safe default.
 */
export class ThemeManager {
  private readonly installed = new Map<string, Theme>();
  private active: Theme | null = null;
  private previous: Theme | null = null;
  private activeMode: AccessibilityMode | null = null;
  private userOverrides: TokenGroup = {};
  private resolvedCache: Map<string, ThemeToken> | null = null;

  /**
   * @param target        Platform adapter that applies tokens (defaults to CSS variables).
   * @param loader        Async loader for raw theme JSON given a manifest path.
   * @param defaultTheme  The `me-google-default` theme — the guaranteed fallback floor.
   */
  constructor(
    private readonly target: ThemeTarget = new CssVariableTarget(),
    private readonly loader?: ThemeLoaderFn,
    private defaultTheme?: Theme,
  ) {
    if (defaultTheme) this.installed.set(defaultTheme.manifest.id, defaultTheme);
  }

  /**
   * Load and validate a theme from its manifest path, registering it as installed.
   *
   * @param manifestPath Path to the theme's `manifest.json`.
   * @returns The loaded {@link Theme}.
   * @throws If no loader was provided, or the theme fails structural validation.
   */
  async loadTheme(manifestPath: string): Promise<Theme> {
    if (!this.loader) {
      throw new Error('ThemeManager: no ThemeLoaderFn provided to loadTheme()');
    }
    const raw = await this.loader(manifestPath);
    const theme: Theme = {
      manifest: raw.manifest,
      tokens: raw.tokens,
      accessibility: raw.accessibility ?? {},
    };
    this.validate(theme);
    this.installed.set(theme.manifest.id, theme);
    return theme;
  }

  /**
   * Activate a theme: resolve its tokens through the fallback chain and push them to the
   * platform target. The previously active theme is retained for {@link rollbackTheme}.
   *
   * @param theme The theme to activate (must already be loaded/installed).
   */
  activateTheme(theme: Theme): void {
    this.installed.set(theme.manifest.id, theme);
    this.previous = this.active;
    this.active = theme;
    this.resolvedCache = null;
    this.target.apply(this.resolved());
  }

  /**
   * Resolve a token by dotted path (e.g. `color.surface.base`) through the fallback chain.
   *
   * @param key Dotted token path.
   * @returns The resolved {@link ThemeToken}.
   * @throws If the token cannot be resolved at any level of the chain.
   */
  getToken(key: string): ThemeToken {
    const token = this.resolved().get(key);
    if (!token) throw new Error(`ThemeManager: unresolved token "${key}"`);
    return token;
  }

  /**
   * Enable an accessibility override layer (high-contrast or reduced-motion). The layer is
   * merged on top of the active theme and re-applied. Pass the same mode again is
   * idempotent; use {@link clearAccessibilityLayer} to disable.
   *
   * @param mode The accessibility mode to apply.
   */
  applyAccessibilityLayer(mode: AccessibilityMode): void {
    this.activeMode = mode;
    this.resolvedCache = null;
    this.target.apply(this.resolved());
  }

  /** Disable any active accessibility override layer and re-apply the base theme. */
  clearAccessibilityLayer(): void {
    this.activeMode = null;
    this.resolvedCache = null;
    this.target.apply(this.resolved());
  }

  /**
   * Set per-token user overrides (highest priority in the fallback chain), then re-apply.
   * @param overrides A DTCG group whose leaf tokens override matching paths.
   */
  setUserOverrides(overrides: TokenGroup): void {
    this.userOverrides = overrides ?? {};
    this.resolvedCache = null;
    if (this.active) this.target.apply(this.resolved());
  }

  /** @returns All installed themes. */
  listInstalledThemes(): Theme[] {
    return [...this.installed.values()];
  }

  /**
   * Non-destructively resolve a theme's tokens for a preview surface without changing the
   * active theme. The caller applies the returned map to its own preview target.
   *
   * @param theme Theme to preview.
   * @returns The resolved token map for the theme (with the current accessibility mode).
   */
  previewTheme(theme: Theme): Map<string, ThemeToken> {
    return this.resolveFor(theme, this.activeMode);
  }

  /**
   * Restore the previously active theme (single-level undo). No-op if there is none.
   * @returns The theme that is now active, or null.
   */
  rollbackTheme(): Theme | null {
    if (!this.previous) return this.active;
    const restored = this.previous;
    this.previous = this.active;
    this.active = restored;
    this.resolvedCache = null;
    this.target.apply(this.resolved());
    return this.active;
  }

  /** @returns The currently active theme, or null if none has been activated. */
  getActiveTheme(): Theme | null {
    return this.active;
  }

  // -------------------------------------------------------------------------
  // Internal resolution
  // -------------------------------------------------------------------------

  /** Resolve the active theme + mode + user overrides, memoised until invalidated. */
  private resolved(): Map<string, ThemeToken> {
    if (this.resolvedCache) return this.resolvedCache;
    if (!this.active) {
      if (!this.defaultTheme) return new Map();
      this.resolvedCache = this.resolveFor(this.defaultTheme, this.activeMode);
      return this.resolvedCache;
    }
    this.resolvedCache = this.resolveFor(this.active, this.activeMode);
    return this.resolvedCache;
  }

  /**
   * Build a flattened, alias-resolved token map for a theme, applying (in ascending
   * priority) default theme → theme → accessibility override → user overrides.
   */
  private resolveFor(theme: Theme, mode: AccessibilityMode | null): Map<string, ThemeToken> {
    const flat = new Map<string, ThemeToken>();

    // 4. me-google-default (guaranteed floor)
    if (this.defaultTheme && this.defaultTheme !== theme) {
      this.flattenCategories(this.defaultTheme.tokens, flat);
    }
    // 3. active theme base
    this.flattenCategories(theme.tokens, flat);
    // 2. accessibility override
    if (mode && theme.accessibility[mode]) {
      this.flattenGroupTree(theme.accessibility[mode] as TokenGroup, '', undefined, flat);
    }
    // 1. user overrides
    if (this.userOverrides && Object.keys(this.userOverrides).length) {
      this.flattenGroupTree(this.userOverrides, '', undefined, flat);
    }

    return this.resolveAliases(flat);
  }

  private flattenCategories(tokens: Record<TokenCategory, TokenGroup>, out: Map<string, ThemeToken>): void {
    for (const [category, group] of Object.entries(tokens)) {
      this.flattenGroupTree({ [category]: group } as TokenGroup, '', undefined, out);
    }
  }

  private flattenGroupTree(
    node: TokenGroup,
    prefix: string,
    inheritedType: TokenType | undefined,
    out: Map<string, ThemeToken>,
  ): void {
    const groupType = (node.$type as TokenType | undefined) ?? inheritedType;
    for (const [key, child] of Object.entries(node)) {
      if (RESERVED.has(key) || key.startsWith('$')) continue;
      const path = prefix ? `${prefix}.${key}` : key;
      if (child && typeof child === 'object' && '$value' in (child as ThemeToken)) {
        const tok = child as ThemeToken;
        out.set(path, {
          $value: tok.$value,
          $type: tok.$type ?? groupType,
          $description: tok.$description,
          $extensions: tok.$extensions,
        });
      } else if (child && typeof child === 'object') {
        this.flattenGroupTree(child as TokenGroup, path, groupType, out);
      }
    }
  }

  /** Resolve `{group.token}` alias values in-place; leaves unresolved refs untouched. */
  private resolveAliases(flat: Map<string, ThemeToken>): Map<string, ThemeToken> {
    const deref = (value: ThemeToken['$value'], seen: Set<string>): ThemeToken['$value'] => {
      if (typeof value === 'string' && value.startsWith('{') && value.endsWith('}')) {
        const ref = value.slice(1, -1);
        if (seen.has(ref)) throw new Error(`Circular token reference: ${ref}`);
        seen.add(ref);
        const target = flat.get(ref);
        if (!target) return value;
        return deref(target.$value, seen);
      }
      return value;
    };
    for (const [path, tok] of flat) {
      flat.set(path, { ...tok, $value: deref(tok.$value, new Set()) });
    }
    return flat;
  }

  /** Structural validation: required categories and accessibility overrides must exist. */
  private validate(theme: Theme): void {
    const required: TokenCategory[] = [
      'color', 'typography', 'spacing', 'depth', 'motion', 'audio', 'haptics',
    ];
    for (const cat of required) {
      if (!theme.tokens[cat]) {
        throw new Error(`ThemeManager: theme "${theme.manifest.id}" is missing token category "${cat}"`);
      }
    }
    for (const mode of ['high-contrast', 'reduced-motion'] as AccessibilityMode[]) {
      if (!theme.accessibility[mode]) {
        throw new Error(
          `ThemeManager: theme "${theme.manifest.id}" is missing accessibility override "${mode}"`,
        );
      }
    }
  }
}

export default ThemeManager;
