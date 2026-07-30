export type SpatialItemKind = 'favorite' | 'window' | 'note' | 'portal' | 'anchor';

export type SpatialLayer = 'private' | 'shared' | 'public' | 'system';

export interface Vector3 {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface Quaternion {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly w: number;
}

export interface SpatialTransform {
  readonly position: Vector3;
  readonly rotation: Quaternion;
  readonly scale: Vector3;
}

export interface SpatialItemEncryption {
  readonly algorithm: 'xchacha20-poly1305' | 'aes-256-gcm';
  readonly keyId: string;
}

export interface SpatialItem {
  readonly id: string;
  readonly ownerUserId: string;
  readonly kind: SpatialItemKind;
  readonly label: string;
  readonly transform: SpatialTransform;
  readonly dimensionsMeters: Vector3;
  readonly layer: SpatialLayer;
  readonly metadata: Readonly<Record<string, string | number | boolean>>;
  readonly encryption: SpatialItemEncryption;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export type SpatialItemInput = Omit<SpatialItem, 'createdAt' | 'updatedAt'> & {
  readonly createdAt?: string;
  readonly updatedAt?: string;
};

const idPattern = /^[a-zA-Z0-9:_-]{8,128}$/;
const nonBlankPattern = /\S/;

export function createSpatialItem(input: SpatialItemInput): SpatialItem {
  const now = new Date().toISOString();
  const item: SpatialItem = {
    ...input,
    createdAt: input.createdAt ?? now,
    updatedAt: input.updatedAt ?? input.createdAt ?? now,
  };
  validateSpatialItem(item);
  return Object.freeze(item);
}

export function validateSpatialItem(item: unknown): asserts item is SpatialItem {
  if (!isRecord(item)) throw new TypeError('SpatialItem must be an object.');
  requireId(item.id, 'id');
  requireId(item.ownerUserId, 'ownerUserId');
  requireOneOf(item.kind, ['favorite', 'window', 'note', 'portal', 'anchor'], 'kind');
  requireString(item.label, 'label', 1, 160);
  validateTransform(item.transform);
  validatePositiveVector(item.dimensionsMeters, 'dimensionsMeters');
  requireOneOf(item.layer, ['private', 'shared', 'public', 'system'], 'layer');
  validateMetadata(item.metadata);
  validateEncryption(item.encryption);
  requireIsoDate(item.createdAt, 'createdAt');
  requireIsoDate(item.updatedAt, 'updatedAt');
}

export function serializeSpatialItem(item: SpatialItem): string {
  validateSpatialItem(item);
  return JSON.stringify(item);
}

export function deserializeSpatialItem(serialized: string): SpatialItem {
  const parsed: unknown = JSON.parse(serialized);
  validateSpatialItem(parsed);
  return Object.freeze(parsed);
}

function validateTransform(value: unknown): asserts value is SpatialTransform {
  if (!isRecord(value)) throw new TypeError('transform must be an object.');
  validateFiniteVector(value.position, 'transform.position');
  validateQuaternion(value.rotation, 'transform.rotation');
  validatePositiveVector(value.scale, 'transform.scale');
}

function validateFiniteVector(value: unknown, field: string): asserts value is Vector3 {
  if (!isRecord(value)) throw new TypeError(`${field} must be an object.`);
  for (const axis of ['x', 'y', 'z'] as const) {
    if (!Number.isFinite(value[axis])) throw new TypeError(`${field}.${axis} must be finite.`);
  }
}

function validatePositiveVector(value: unknown, field: string): asserts value is Vector3 {
  validateFiniteVector(value, field);
  for (const axis of ['x', 'y', 'z'] as const) {
    if (value[axis] <= 0) throw new RangeError(`${field}.${axis} must be positive.`);
  }
}

function validateQuaternion(value: unknown, field: string): asserts value is Quaternion {
  if (!isRecord(value)) throw new TypeError(`${field} must be an object.`);
  for (const axis of ['x', 'y', 'z', 'w'] as const) {
    if (!Number.isFinite(value[axis])) throw new TypeError(`${field}.${axis} must be finite.`);
  }
  const quaternion = value as unknown as Quaternion;
  const magnitude = Math.hypot(quaternion.x, quaternion.y, quaternion.z, quaternion.w);
  if (magnitude < 0.99 || magnitude > 1.01) throw new RangeError(`${field} must be normalized.`);
}

function validateMetadata(value: unknown): asserts value is SpatialItem['metadata'] {
  if (!isRecord(value)) throw new TypeError('metadata must be an object.');
  for (const [key, entry] of Object.entries(value)) {
    requireString(key, 'metadata key', 1, 80);
    const valid = typeof entry === 'string' || typeof entry === 'number' || typeof entry === 'boolean';
    if (!valid || (typeof entry === 'number' && !Number.isFinite(entry))) {
      throw new TypeError(`metadata.${key} must be a string, finite number, or boolean.`);
    }
  }
}

function validateEncryption(value: unknown): asserts value is SpatialItemEncryption {
  if (!isRecord(value)) throw new TypeError('encryption must be an object.');
  requireOneOf(value.algorithm, ['xchacha20-poly1305', 'aes-256-gcm'], 'encryption.algorithm');
  requireId(value.keyId, 'encryption.keyId');
}

function requireId(value: unknown, field: string): asserts value is string {
  requireString(value, field, 8, 128);
  if (!idPattern.test(value)) throw new TypeError(`${field} must be an opaque identifier.`);
}

function requireString(value: unknown, field: string, min: number, max: number): asserts value is string {
  if (typeof value !== 'string' || value.length < min || value.length > max || !nonBlankPattern.test(value)) {
    throw new TypeError(`${field} must be a non-empty string between ${min} and ${max} characters.`);
  }
}

function requireIsoDate(value: unknown, field: string): asserts value is string {
  requireString(value, field, 20, 40);
  if (Number.isNaN(Date.parse(value))) throw new TypeError(`${field} must be an ISO date.`);
}

function requireOneOf<T extends string>(value: unknown, allowed: readonly T[], field: string): asserts value is T {
  if (typeof value !== 'string' || !allowed.includes(value as T)) {
    throw new TypeError(`${field} must be one of: ${allowed.join(', ')}.`);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
