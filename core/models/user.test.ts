import test from 'node:test';
import assert from 'node:assert/strict';
import { createAnonymousUser, deserializeAnonymousUser, rotateAnonymousUser, serializeAnonymousUser, validateAnonymousUser } from './user.ts';

const validUser = {
  id: 'anon_abcdefghijklmnopqrstuvwxyzABCDEF',
  publicKey: 'k_abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMN',
  displayName: 'River',
  consent: {
    sharePresence: false,
    shareDisplayName: true,
    allowAnonymousRelay: true,
  },
} as const;

test('creates an anonymous user without PII fields', () => {
  const user = createAnonymousUser(validUser);
  assert.equal(user.id, validUser.id);
  assert.equal(user.consent.allowAnonymousRelay, true);
  assert.equal(Object.hasOwn(user, 'email'), false);
  assert.doesNotThrow(() => validateAnonymousUser(user));
});

test('round-trips anonymous user serialization', () => {
  const user = createAnonymousUser(validUser);
  assert.deepEqual(deserializeAnonymousUser(serializeAnonymousUser(user)), user);
});

test('rejects display names with obvious PII', () => {
  assert.throws(
    () => createAnonymousUser({ ...validUser, displayName: 'person@example.com' }),
    /PII/,
  );
});

test('rotates anonymous identifiers while preserving consent', () => {
  const user = createAnonymousUser(validUser);
  const rotated = rotateAnonymousUser(
    user,
    'anon_ZYXWVUTSRQPONMLKJIHGFEDCBAabcdef',
    'k_ZYXWVUTSRQPONMLKJIHGFEDCBAabcdefghijklmn',
    '2026-07-30T04:00:00.000Z',
  );
  assert.notEqual(rotated.id, user.id);
  assert.deepEqual(rotated.consent, user.consent);
  assert.equal(rotated.createdAt, user.createdAt);
});
