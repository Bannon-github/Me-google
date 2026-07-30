import test from 'node:test';
import assert from 'node:assert/strict';
import { createSpatialItem, deserializeSpatialItem, serializeSpatialItem, validateSpatialItem } from './spatial_item.ts';

const baseItem = {
  id: 'item_12345678',
  ownerUserId: 'anon_owner_1234567890',
  kind: 'favorite',
  label: 'Kitchen research board',
  transform: {
    position: { x: 1, y: 1.5, z: -2 },
    rotation: { x: 0, y: 0, z: 0, w: 1 },
    scale: { x: 1, y: 1, z: 1 },
  },
  dimensionsMeters: { x: 0.8, y: 0.5, z: 0.05 },
  layer: 'private',
  metadata: { pinned: true, priority: 2, source: 'local' },
  encryption: { algorithm: 'xchacha20-poly1305', keyId: 'key_item_123456' },
} as const;

test('creates a valid spatial item with timestamps', () => {
  const item = createSpatialItem(baseItem);
  assert.equal(item.id, baseItem.id);
  assert.equal(item.layer, 'private');
  assert.match(item.createdAt, /^\d{4}-\d{2}-\d{2}T/);
  assert.doesNotThrow(() => validateSpatialItem(item));
});

test('round-trips spatial item serialization', () => {
  const item = createSpatialItem(baseItem);
  const restored = deserializeSpatialItem(serializeSpatialItem(item));
  assert.deepEqual(restored, item);
});

test('rejects non-normalized rotations', () => {
  assert.throws(
    () => createSpatialItem({ ...baseItem, transform: { ...baseItem.transform, rotation: { x: 1, y: 1, z: 1, w: 1 } } }),
    /normalized/,
  );
});

test('rejects non-primitive metadata values', () => {
  assert.throws(
    () => createSpatialItem({ ...baseItem, metadata: { unsafe: { nested: true } } as never }),
    /metadata\.unsafe/,
  );
});
