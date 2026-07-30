import test from 'node:test';
import assert from 'node:assert/strict';
import { createSession, addSpatialItemToSession, deserializeSession, serializeSession, validateSession } from './session.ts';
import { createSpatialItem } from './spatial_item.ts';
import { createAnonymousUser } from './user.ts';

const owner = createAnonymousUser({
  id: 'anon_ownerabcdefghijklmnopqrstuvwxy',
  publicKey: 'k_ownerabcdefghijklmnopqrstuvwxyzABCDE',
  consent: { sharePresence: false, shareDisplayName: false, allowAnonymousRelay: true },
  createdAt: '2026-07-30T04:00:00.000Z',
  rotatedAt: '2026-07-30T04:00:00.000Z',
});

const viewer = createAnonymousUser({
  id: 'anon_viewerabcdefghijklmnopqrstuvwx',
  publicKey: 'k_viewerabcdefghijklmnopqrstuvwxyzABCD',
  consent: { sharePresence: false, shareDisplayName: false, allowAnonymousRelay: true },
  createdAt: '2026-07-30T04:00:00.000Z',
  rotatedAt: '2026-07-30T04:00:00.000Z',
});

const item = createSpatialItem({
  id: 'item_shared_123456',
  ownerUserId: owner.id,
  kind: 'anchor',
  label: 'Shared entry point',
  transform: {
    position: { x: 0, y: 1, z: -1 },
    rotation: { x: 0, y: 0, z: 0, w: 1 },
    scale: { x: 1, y: 1, z: 1 },
  },
  dimensionsMeters: { x: 0.2, y: 0.2, z: 0.2 },
  layer: 'shared',
  metadata: { collaborative: true },
  encryption: { algorithm: 'aes-256-gcm', keyId: 'item_key_shared' },
});

const baseSession = {
  id: 'sess_abcdefghijklmnopqrstuvwxyzABCDEF',
  mode: 'invite-only',
  participants: [
    { user: owner, role: 'owner', joinedAt: '2026-07-30T04:00:00.000Z' },
    { user: viewer, role: 'viewer', joinedAt: '2026-07-30T04:01:00.000Z' },
  ],
  items: [item],
  encryption: { algorithm: 'xchacha20-poly1305', sessionKeyId: 'session_key_123', ratchet: 'mls-draft' },
  syncState: 'syncing',
  createdAt: '2026-07-30T04:00:00.000Z',
  updatedAt: '2026-07-30T04:01:00.000Z',
} as const;

test('creates a valid encrypted collaboration session', () => {
  const session = createSession(baseSession);
  assert.equal(session.participants.length, 2);
  assert.equal(session.items[0]?.id, item.id);
  assert.doesNotThrow(() => validateSession(session));
});

test('round-trips session serialization', () => {
  const session = createSession(baseSession);
  assert.deepEqual(deserializeSession(serializeSession(session)), session);
});

test('requires exactly one owner', () => {
  assert.throws(
    () => createSession({ ...baseSession, participants: [{ user: viewer, role: 'viewer', joinedAt: '2026-07-30T04:01:00.000Z' }] }),
    /exactly one owner/,
  );
});

test('adds or replaces spatial items by id', () => {
  const session = createSession({ ...baseSession, items: [] });
  const updated = addSpatialItemToSession(session, item, '2026-07-30T04:02:00.000Z');
  const replaced = addSpatialItemToSession(updated, { ...item, label: 'Renamed entry point' }, '2026-07-30T04:03:00.000Z');
  assert.equal(replaced.items.length, 1);
  assert.equal(replaced.items[0]?.label, 'Renamed entry point');
  assert.equal(replaced.updatedAt, '2026-07-30T04:03:00.000Z');
});
