/**
 * Unit tests for {@link ThemeManager} (ADR-006 Tier-1). Run with `npm test` in this dir,
 * which compiles via tsc and executes `node --test` over the emitted JS.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ThemeManager,
  type Theme,
  type ThemeTarget,
  type ThemeToken,
} from './ThemeManager.js';

/** Capture applied tokens instead of writing CSS. */
class CaptureTarget implements ThemeTarget {
  last = new Map<string, ThemeToken>();
  apply(flat: Map<string, ThemeToken>): void {
    this.last = new Map(flat);
  }
}

function makeTheme(id: string, primaryHex: string): Theme {
  return {
    manifest: {
      id,
      name: id,
      version: '1.0.0',
      author: 'test',
      description: 'test theme',
      accessibilityLevel: 'AA',
      targetComfortRating: 'Comfortable',
      schemaVersion: '1.0.0',
    },
    tokens: {
      color: {
        $type: 'color',
        surface: { base: { $value: { colorSpace: 'srgb', components: [0, 0, 0], hex: '#000000' } } },
        accent: { primary: { $value: { colorSpace: 'srgb', components: [0, 0, 0], hex: primaryHex } } },
        alias: { brand: { $value: '{color.accent.primary}' } },
      },
      typography: { size: { md: { $type: 'dimension', $value: { value: 54, unit: 'px' } } } },
      spacing: { md: { $type: 'dimension', $value: { value: 56, unit: 'px' } } },
      depth: { layer: { panelPrimary: { $type: 'number', $value: 1.5 } } },
      motion: {
        duration: { normal: { $type: 'duration', $value: { value: 240, unit: 'ms' } } },
      },
      audio: { master: { volume: { $type: 'number', $value: 0.8 } } },
      haptics: { master: { intensity: { $type: 'number', $value: 0.8 } } },
    },
    accessibility: {
      'high-contrast': {
        color: { accent: { primary: { $value: { colorSpace: 'srgb', components: [1, 1, 1], hex: '#FFFFFF' } } } },
      },
      'reduced-motion': {
        motion: { duration: { normal: { $type: 'duration', $value: { value: 0, unit: 'ms' } } } },
      },
    },
  };
}

test('activateTheme applies flattened tokens to the target', () => {
  const target = new CaptureTarget();
  const mgr = new ThemeManager(target);
  mgr.activateTheme(makeTheme('t1', '#5AB0FF'));
  const base = target.last.get('color.surface.base');
  assert.ok(base);
  assert.deepEqual((base!.$value as any).hex, '#000000');
});

test('getToken resolves dotted paths', () => {
  const mgr = new ThemeManager(new CaptureTarget());
  mgr.activateTheme(makeTheme('t1', '#5AB0FF'));
  assert.equal((mgr.getToken('color.accent.primary').$value as any).hex, '#5AB0FF');
  assert.equal(mgr.getToken('depth.layer.panelPrimary').$value, 1.5);
});

test('aliases are resolved to the referenced value', () => {
  const mgr = new ThemeManager(new CaptureTarget());
  mgr.activateTheme(makeTheme('t1', '#5AB0FF'));
  assert.equal((mgr.getToken('color.alias.brand').$value as any).hex, '#5AB0FF');
});

test('inherited $type flows from group to leaf token', () => {
  const mgr = new ThemeManager(new CaptureTarget());
  mgr.activateTheme(makeTheme('t1', '#5AB0FF'));
  assert.equal(mgr.getToken('color.surface.base').$type, 'color');
});

test('applyAccessibilityLayer(high-contrast) overrides base tokens', () => {
  const mgr = new ThemeManager(new CaptureTarget());
  mgr.activateTheme(makeTheme('t1', '#5AB0FF'));
  mgr.applyAccessibilityLayer('high-contrast');
  assert.equal((mgr.getToken('color.accent.primary').$value as any).hex, '#FFFFFF');
  mgr.clearAccessibilityLayer();
  assert.equal((mgr.getToken('color.accent.primary').$value as any).hex, '#5AB0FF');
});

test('reduced-motion zeroes durations', () => {
  const mgr = new ThemeManager(new CaptureTarget());
  mgr.activateTheme(makeTheme('t1', '#5AB0FF'));
  mgr.applyAccessibilityLayer('reduced-motion');
  assert.equal((mgr.getToken('motion.duration.normal').$value as any).value, 0);
});

test('user overrides win over theme and accessibility layers', () => {
  const mgr = new ThemeManager(new CaptureTarget());
  mgr.activateTheme(makeTheme('t1', '#5AB0FF'));
  mgr.applyAccessibilityLayer('high-contrast');
  mgr.setUserOverrides({
    color: { accent: { primary: { $value: { colorSpace: 'srgb', components: [1, 0, 0], hex: '#FF0000' } } } },
  });
  assert.equal((mgr.getToken('color.accent.primary').$value as any).hex, '#FF0000');
});

test('default theme is the fallback floor for missing tokens', () => {
  const def = makeTheme('me-google-default', '#5AB0FF');
  (def.tokens.color as any).onlyInDefault = { token: { $value: 'floor' } };
  const mgr = new ThemeManager(new CaptureTarget(), undefined, def);
  const other = makeTheme('other', '#C89BFF');
  mgr.activateTheme(other);
  assert.equal(mgr.getToken('color.onlyInDefault.token').$value, 'floor');
  assert.equal((mgr.getToken('color.accent.primary').$value as any).hex, '#C89BFF');
});

test('rollbackTheme restores the previous theme', () => {
  const mgr = new ThemeManager(new CaptureTarget());
  const a = makeTheme('a', '#5AB0FF');
  const b = makeTheme('b', '#C89BFF');
  mgr.activateTheme(a);
  mgr.activateTheme(b);
  assert.equal(mgr.getActiveTheme()!.manifest.id, 'b');
  mgr.rollbackTheme();
  assert.equal(mgr.getActiveTheme()!.manifest.id, 'a');
});

test('listInstalledThemes returns activated themes', () => {
  const mgr = new ThemeManager(new CaptureTarget());
  mgr.activateTheme(makeTheme('a', '#5AB0FF'));
  mgr.activateTheme(makeTheme('b', '#C89BFF'));
  const ids = mgr.listInstalledThemes().map((t) => t.manifest.id).sort();
  assert.deepEqual(ids, ['a', 'b']);
});

test('previewTheme resolves without changing the active theme', () => {
  const mgr = new ThemeManager(new CaptureTarget());
  mgr.activateTheme(makeTheme('a', '#5AB0FF'));
  const preview = mgr.previewTheme(makeTheme('b', '#C89BFF'));
  assert.equal((preview.get('color.accent.primary')!.$value as any).hex, '#C89BFF');
  assert.equal(mgr.getActiveTheme()!.manifest.id, 'a');
});

test('loadTheme rejects a theme missing a token category', async () => {
  const broken = makeTheme('broken', '#5AB0FF');
  delete (broken.tokens as any).haptics;
  const mgr = new ThemeManager(new CaptureTarget(), async () => broken);
  await assert.rejects(() => mgr.loadTheme('any/path'), /missing token category "haptics"/);
});

test('loadTheme rejects a theme missing an accessibility override', async () => {
  const broken = makeTheme('broken', '#5AB0FF');
  delete (broken.accessibility as any)['reduced-motion'];
  const mgr = new ThemeManager(new CaptureTarget(), async () => broken);
  await assert.rejects(() => mgr.loadTheme('any/path'), /missing accessibility override "reduced-motion"/);
});
