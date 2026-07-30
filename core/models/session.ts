import { validateAnonymousUser, type AnonymousUser } from './user.ts';
import { validateSpatialItem, type SpatialItem } from './spatial_item.ts';

export type SessionMode = 'private' | 'invite-only' | 'public-anonymous';
export type SessionSyncState = 'local-only' | 'connecting' | 'syncing' | 'paused' | 'ended';

export interface SessionParticipant {
  readonly user: AnonymousUser;
  readonly role: 'owner' | 'editor' | 'viewer';
  readonly joinedAt: string;
}

export interface SessionEncryption {
  readonly algorithm: 'xchacha20-poly1305' | 'aes-256-gcm';
  readonly sessionKeyId: string;
  readonly ratchet: 'mls-draft' | 'double-ratchet' | 'static-test-only';
}

export interface Session {
  readonly id: string;
  readonly mode: SessionMode;
  readonly participants: readonly SessionParticipant[];
  readonly items: readonly SpatialItem[];
  readonly encryption: SessionEncryption;
  readonly syncState: SessionSyncState;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export type SessionInput = Omit<Session, 'createdAt' | 'updatedAt'> & {
  readonly createdAt?: string;
  readonly updatedAt?: string;
};

const idPattern = /^sess_[a-zA-Z0-9_-]{24,96}$/;
const keyPattern = /^[a-zA-Z0-9:_-]{8,128}$/;

export function createSession(input: SessionInput): Session {
  const now = new Date().toISOString();
  const session: Session = {
    ...input,
    createdAt: input.createdAt ?? now,
    updatedAt: input.updatedAt ?? input.createdAt ?? now,
  };
  validateSession(session);
  return Object.freeze(session);
}

export function validateSession(session: unknown): asserts session is Session {
  if (!isRecord(session)) throw new TypeError('Session must be an object.');
  requirePattern(session.id, idPattern, 'id');
  requireOneOf(session.mode, ['private', 'invite-only', 'public-anonymous'], 'mode');
  validateParticipants(session.participants);
  validateItems(session.items);
  validateEncryption(session.encryption);
  requireOneOf(session.syncState, ['local-only', 'connecting', 'syncing', 'paused', 'ended'], 'syncState');
  requireIsoDate(session.createdAt, 'createdAt');
  requireIsoDate(session.updatedAt, 'updatedAt');
}

export function serializeSession(session: Session): string {
  validateSession(session);
  return JSON.stringify(session);
}

export function deserializeSession(serialized: string): Session {
  const parsed: unknown = JSON.parse(serialized);
  validateSession(parsed);
  return Object.freeze(parsed);
}

export function addSpatialItemToSession(session: Session, item: SpatialItem, updatedAt = new Date().toISOString()): Session {
  validateSession(session);
  validateSpatialItem(item);
  const withoutDuplicate = session.items.filter((existing) => existing.id !== item.id);
  return createSession({ ...session, items: [...withoutDuplicate, item], updatedAt });
}

function validateParticipants(value: unknown): asserts value is readonly SessionParticipant[] {
  if (!Array.isArray(value) || value.length < 1) throw new TypeError('participants must be a non-empty array.');
  let owners = 0;
  const ids = new Set<string>();
  for (const participant of value) {
    if (!isRecord(participant)) throw new TypeError('participant must be an object.');
    validateAnonymousUser(participant.user);
    requireOneOf(participant.role, ['owner', 'editor', 'viewer'], 'participant.role');
    requireIsoDate(participant.joinedAt, 'participant.joinedAt');
    if (participant.role === 'owner') owners += 1;
    if (ids.has(participant.user.id)) throw new TypeError('participants must be unique by user id.');
    ids.add(participant.user.id);
  }
  if (owners !== 1) throw new TypeError('session must have exactly one owner.');
}

function validateItems(value: unknown): asserts value is readonly SpatialItem[] {
  if (!Array.isArray(value)) throw new TypeError('items must be an array.');
  const ids = new Set<string>();
  for (const item of value) {
    validateSpatialItem(item);
    if (ids.has(item.id)) throw new TypeError('items must be unique by id.');
    ids.add(item.id);
  }
}

function validateEncryption(value: unknown): asserts value is SessionEncryption {
  if (!isRecord(value)) throw new TypeError('encryption must be an object.');
  requireOneOf(value.algorithm, ['xchacha20-poly1305', 'aes-256-gcm'], 'encryption.algorithm');
  requirePattern(value.sessionKeyId, keyPattern, 'encryption.sessionKeyId');
  requireOneOf(value.ratchet, ['mls-draft', 'double-ratchet', 'static-test-only'], 'encryption.ratchet');
}

function requireIsoDate(value: unknown, field: string): asserts value is string {
  if (typeof value !== 'string' || Number.isNaN(Date.parse(value))) {
    throw new TypeError(`${field} must be an ISO date.`);
  }
}

function requirePattern(value: unknown, pattern: RegExp, field: string): asserts value is string {
  if (typeof value !== 'string' || !pattern.test(value)) throw new TypeError(`${field} has invalid format.`);
}

function requireOneOf<T extends string>(value: unknown, allowed: readonly T[], field: string): asserts value is T {
  if (typeof value !== 'string' || !allowed.includes(value as T)) {
    throw new TypeError(`${field} must be one of: ${allowed.join(', ')}.`);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
