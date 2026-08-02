import { createHash } from "node:crypto";
import { types as utilTypes } from "node:util";

/** Governed payloads live outside every runtime package. */
export const GOVERNED_STORAGE_ROOT = "data/governed" as const;

/** The only manifest schema accepted for governed dataset storage. */
export const STORAGE_MANIFEST_SCHEMA = "storage-manifest/v1" as const;

export interface StorageApprovalRef {
  readonly rdlId: string;
  readonly approvalWording: string;
}

export interface StorageFileEntry {
  readonly declaredName: string;
  readonly sha256: string;
  readonly bytes: number;
}

export interface StorageManifest {
  readonly schema: typeof STORAGE_MANIFEST_SCHEMA;
  readonly datasetVersion: string;
  readonly approvalRef: StorageApprovalRef;
  readonly sourceRegisterRefs: readonly string[];
  readonly effectiveFrom: string;
  readonly effectiveTo: string;
  readonly files: readonly StorageFileEntry[];
  readonly revoked: boolean;
}

const SHA256_HEX = /^[a-f0-9]{64}$/;
const SAFE_DATASET_VERSION = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;
const SAFE_DECLARED_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]{0,255}$/;
const MANIFEST_KEYS = new Set([
  "schema",
  "datasetVersion",
  "approvalRef",
  "sourceRegisterRefs",
  "effectiveFrom",
  "effectiveTo",
  "files",
  "revoked"
]);
const APPROVAL_REF_KEYS = new Set(["rdlId", "approvalWording"]);
const FILE_ENTRY_KEYS = new Set(["declaredName", "sha256", "bytes"]);

type NormalizedDataObject = Readonly<Record<string, unknown>>;

type DataObjectDecodeResult =
  | { readonly kind: "ok"; readonly value: NormalizedDataObject }
  | { readonly kind: "invalid" };

/**
 * Returns the repository-relative directory for exactly one dataset version.
 * A strict single-segment allowlist prevents absolute paths and traversal.
 */
export function governedStoragePathForDatasetVersion(datasetVersion: string): string {
  if (!isSafeDatasetVersion(datasetVersion)) {
    throw new TypeError("datasetVersion must be a safe governed-storage path segment");
  }
  return `${GOVERNED_STORAGE_ROOT}/${datasetVersion}`;
}

/**
 * Sorts by declared filename, concatenates the lowercase file digests, and
 * hashes that byte-for-byte ASCII sequence. Caller order never affects it.
 */
export function computeDatasetDigest(files: readonly StorageFileEntry[]): string {
  const decodedFiles = decodeFiles(files);
  if (decodedFiles === undefined) {
    throw new TypeError("files must be valid governed-storage file entries");
  }

  const sorted = [...decodedFiles].sort((left, right) =>
    left.declaredName < right.declaredName ? -1 : left.declaredName > right.declaredName ? 1 : 0
  );
  const hash = createHash("sha256");
  for (const entry of sorted) hash.update(entry.sha256, "ascii");
  return hash.digest("hex");
}

/**
 * Fail-closed decoder for storage-manifest/v1. Successful output is a detached,
 * deeply frozen data graph whose record objects have null prototypes.
 */
export function validateStorageManifest(input: unknown): StorageManifest | null {
  try {
    const decoded = decodePlainDataObject(input, MANIFEST_KEYS);
    if (decoded.kind === "invalid") return null;

    const manifest = decoded.value;
    if (
      manifest.schema !== STORAGE_MANIFEST_SCHEMA ||
      !isSafeDatasetVersion(manifest.datasetVersion) ||
      !isIsoDate(manifest.effectiveFrom) ||
      !isIsoDate(manifest.effectiveTo) ||
      manifest.effectiveFrom > manifest.effectiveTo ||
      typeof manifest.revoked !== "boolean"
    ) {
      return null;
    }

    const approvalRef = decodeApprovalRef(manifest.approvalRef);
    const sourceRegisterRefs = decodeStringArray(manifest.sourceRegisterRefs);
    const files = decodeFiles(manifest.files);
    if (approvalRef === undefined || sourceRegisterRefs === undefined || files === undefined) return null;

    const datasetDigest = computeDatasetDigest(files);
    const expectedApproval = `INTAKE-APPROVE ${manifest.datasetVersion} ${datasetDigest.slice(0, 7)}`;
    if (approvalRef.approvalWording !== expectedApproval) return null;

    return createFrozenNullPrototype<StorageManifest>([
      ["schema", STORAGE_MANIFEST_SCHEMA],
      ["datasetVersion", manifest.datasetVersion],
      ["approvalRef", approvalRef],
      ["sourceRegisterRefs", sourceRegisterRefs],
      ["effectiveFrom", manifest.effectiveFrom],
      ["effectiveTo", manifest.effectiveTo],
      ["files", files],
      ["revoked", manifest.revoked]
    ]);
  } catch {
    return null;
  }
}

/** Recomputes both integrity facts from caller-supplied bytes without file I/O. */
export function verifyStoredFileBytes(entryInput: unknown, rawBytes: unknown): boolean {
  const entry = decodeFileEntry(entryInput);
  if (entry === undefined || !isSafeUint8Array(rawBytes)) return false;

  try {
    return rawBytes.byteLength === entry.bytes && createHash("sha256").update(rawBytes).digest("hex") === entry.sha256;
  } catch {
    return false;
  }
}

/** Invalid or revoked manifests are never eligible for downstream use. */
export function isEligibleForUse(manifestInput: unknown): boolean {
  const manifest = validateStorageManifest(manifestInput);
  return manifest !== null && manifest.revoked === false;
}

function decodeApprovalRef(input: unknown): StorageApprovalRef | undefined {
  const decoded = decodePlainDataObject(input, APPROVAL_REF_KEYS);
  if (decoded.kind === "invalid") return undefined;
  if (
    !isBoundedNonEmptyString(decoded.value.rdlId) ||
    !isBoundedNonEmptyString(decoded.value.approvalWording)
  ) {
    return undefined;
  }

  return createFrozenNullPrototype<StorageApprovalRef>([
    ["rdlId", decoded.value.rdlId],
    ["approvalWording", decoded.value.approvalWording]
  ]);
}

function decodeFiles(input: unknown): readonly StorageFileEntry[] | undefined {
  const values = decodeDataArray(input);
  if (values === undefined) return undefined;

  const names = new Set<string>();
  const files: StorageFileEntry[] = [];
  for (const value of values) {
    const entry = decodeFileEntry(value);
    if (entry === undefined || names.has(entry.declaredName)) return undefined;
    names.add(entry.declaredName);
    files.push(entry);
  }
  return Object.freeze(files);
}

function decodeFileEntry(input: unknown): StorageFileEntry | undefined {
  const decoded = decodePlainDataObject(input, FILE_ENTRY_KEYS);
  if (decoded.kind === "invalid") return undefined;
  const entry = decoded.value;
  if (
    !isSafeDeclaredName(entry.declaredName) ||
    typeof entry.sha256 !== "string" ||
    !SHA256_HEX.test(entry.sha256) ||
    !Number.isSafeInteger(entry.bytes) ||
    (entry.bytes as number) < 0
  ) {
    return undefined;
  }

  return createFrozenNullPrototype<StorageFileEntry>([
    ["declaredName", entry.declaredName],
    ["sha256", entry.sha256],
    ["bytes", entry.bytes]
  ]);
}

function decodeStringArray(input: unknown): readonly string[] | undefined {
  const values = decodeDataArray(input);
  if (values === undefined) return undefined;

  const strings: string[] = [];
  for (const value of values) {
    if (!isBoundedNonEmptyString(value)) return undefined;
    strings.push(value);
  }
  return Object.freeze(strings);
}

/** Copies only own enumerable data descriptors and never executes accessors. */
function decodePlainDataObject(input: unknown, requiredKeys: ReadonlySet<string>): DataObjectDecodeResult {
  if (typeof input !== "object" || input === null || isRejectedProxy(input) || Array.isArray(input)) {
    return { kind: "invalid" };
  }

  try {
    const prototype = Object.getPrototypeOf(input);
    if (prototype !== Object.prototype && prototype !== null) return { kind: "invalid" };
    for (const key of requiredKeys) {
      if (!Object.hasOwn(input, key)) return { kind: "invalid" };
    }

    const ownKeys = Reflect.ownKeys(input);
    if (ownKeys.length !== requiredKeys.size) return { kind: "invalid" };

    const normalized: Record<string, unknown> = Object.create(null) as Record<string, unknown>;
    for (const key of ownKeys) {
      if (typeof key !== "string" || !requiredKeys.has(key)) return { kind: "invalid" };
      const descriptor = Object.getOwnPropertyDescriptor(input, key);
      if (descriptor === undefined || !descriptor.enumerable || !Object.hasOwn(descriptor, "value")) {
        return { kind: "invalid" };
      }
      normalized[key] = descriptor.value;
    }
    return { kind: "ok", value: Object.freeze(normalized) };
  } catch {
    return { kind: "invalid" };
  }
}

/** Copies arrays descriptor-by-descriptor, rejecting holes, getters, and extra keys. */
function decodeDataArray(input: unknown): readonly unknown[] | undefined {
  if (typeof input !== "object" || input === null || isRejectedProxy(input) || !Array.isArray(input)) return undefined;

  try {
    if (Object.getPrototypeOf(input) !== Array.prototype) return undefined;
    const lengthDescriptor = Object.getOwnPropertyDescriptor(input, "length");
    if (
      lengthDescriptor === undefined ||
      !Object.hasOwn(lengthDescriptor, "value") ||
      !Number.isSafeInteger(lengthDescriptor.value) ||
      lengthDescriptor.value < 0
    ) {
      return undefined;
    }

    const length = lengthDescriptor.value;
    for (const key of Reflect.ownKeys(input)) {
      if (key === "length") continue;
      if (typeof key !== "string" || !/^(0|[1-9]\d*)$/.test(key) || Number(key) >= length) return undefined;
      const descriptor = Object.getOwnPropertyDescriptor(input, key);
      if (descriptor === undefined || !descriptor.enumerable || !Object.hasOwn(descriptor, "value")) return undefined;
    }

    const values: unknown[] = [];
    for (let index = 0; index < length; index += 1) {
      const descriptor = Object.getOwnPropertyDescriptor(input, String(index));
      if (descriptor === undefined || !descriptor.enumerable || !Object.hasOwn(descriptor, "value")) return undefined;
      values.push(descriptor.value);
    }
    return Object.freeze(values);
  } catch {
    return undefined;
  }
}

function isSafeDatasetVersion(value: unknown): value is string {
  return typeof value === "string" && SAFE_DATASET_VERSION.test(value);
}

function isSafeDeclaredName(value: unknown): value is string {
  return typeof value === "string" && SAFE_DECLARED_NAME.test(value);
}

function isBoundedNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= 512;
}

function isIsoDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function isSafeUint8Array(value: unknown): value is Uint8Array {
  if (typeof value !== "object" || value === null || isRejectedProxy(value)) return false;
  try {
    return value instanceof Uint8Array;
  } catch {
    return false;
  }
}

function isRejectedProxy(value: object): boolean {
  try {
    return utilTypes.isProxy(value);
  } catch {
    return true;
  }
}

function createFrozenNullPrototype<T extends object>(entries: readonly (readonly [string, unknown])[]): T {
  const normalized = Object.create(null) as Record<string, unknown>;
  for (const [key, value] of entries) normalized[key] = value;
  return Object.freeze(normalized) as unknown as T;
}
