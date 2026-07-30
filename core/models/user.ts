export interface AnonymousUser {
  readonly id: string;
  readonly publicKey: string;
  readonly displayName?: string;
  readonly createdAt: string;
  readonly rotatedAt: string;
  readonly consent: UserConsent;
}

export interface UserConsent {
  readonly sharePresence: boolean;
  readonly shareDisplayName: boolean;
  readonly allowAnonymousRelay: boolean;
}

export type AnonymousUserInput = Omit<AnonymousUser, 'createdAt' | 'rotatedAt'> & {
  readonly createdAt?: string;
  readonly rotatedAt?: string;
};

const idPattern = /^anon_[a-zA-Z0-9_-]{24,96}$/;
const publicKeyPattern = /^k_[a-zA-Z0-9_-]{32,160}$/;
const forbiddenPii = /@|\+?\d[\d .-]{6,}\d/;

export function createAnonymousUser(input: AnonymousUserInput): AnonymousUser {
  const now = new Date().toISOString();
  const user: AnonymousUser = {
    ...input,
    createdAt: input.createdAt ?? now,
    rotatedAt: input.rotatedAt ?? input.createdAt ?? now,
  };
  validateAnonymousUser(user);
  return Object.freeze(user);
}

export function validateAnonymousUser(user: unknown): asserts user is AnonymousUser {
  if (!isRecord(user)) throw new TypeError('AnonymousUser must be an object.');
  if (typeof user.id !== 'string' || !idPattern.test(user.id)) {
    throw new TypeError('id must be an opaque anonymous identifier.');
  }
  if (typeof user.publicKey !== 'string' || !publicKeyPattern.test(user.publicKey)) {
    throw new TypeError('publicKey must be an opaque public key reference.');
  }
  if (user.displayName !== undefined) validateDisplayName(user.displayName);
  validateConsent(user.consent);
  requireIsoDate(user.createdAt, 'createdAt');
  requireIsoDate(user.rotatedAt, 'rotatedAt');
}

export function serializeAnonymousUser(user: AnonymousUser): string {
  validateAnonymousUser(user);
  return JSON.stringify(user);
}

export function deserializeAnonymousUser(serialized: string): AnonymousUser {
  const parsed: unknown = JSON.parse(serialized);
  validateAnonymousUser(parsed);
  return Object.freeze(parsed);
}

export function rotateAnonymousUser(user: AnonymousUser, nextId: string, nextPublicKey: string, rotatedAt = new Date().toISOString()): AnonymousUser {
  validateAnonymousUser(user);
  const rotated: AnonymousUserInput = {
    id: nextId,
    publicKey: nextPublicKey,
    consent: user.consent,
    createdAt: user.createdAt,
    rotatedAt,
  };
  if (user.displayName !== undefined) {
    return createAnonymousUser({ ...rotated, displayName: user.displayName });
  }
  return createAnonymousUser(rotated);
}

function validateDisplayName(value: unknown): asserts value is string {
  if (typeof value !== 'string' || value.length < 1 || value.length > 80 || !/\S/.test(value)) {
    throw new TypeError('displayName must be a short non-empty string.');
  }
  if (forbiddenPii.test(value)) throw new TypeError('displayName must not contain obvious PII.');
}

function validateConsent(value: unknown): asserts value is UserConsent {
  if (!isRecord(value)) throw new TypeError('consent must be an object.');
  for (const key of ['sharePresence', 'shareDisplayName', 'allowAnonymousRelay'] as const) {
    if (typeof value[key] !== 'boolean') throw new TypeError(`consent.${key} must be boolean.`);
  }
}

function requireIsoDate(value: unknown, field: string): asserts value is string {
  if (typeof value !== 'string' || Number.isNaN(Date.parse(value))) {
    throw new TypeError(`${field} must be an ISO date.`);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
