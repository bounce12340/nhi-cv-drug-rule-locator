import { createHash } from "node:crypto";
import { types as utilTypes } from "node:util";

/** The only schema accepted by this quarantine gate. */
export const SOURCE_INTAKE_SCHEMA = "source-intake/v1" as const;

/** This package is deliberately restricted to invented test material. */
export const SYNTHETIC_TEST_ONLY = "SYNTHETIC_TEST_ONLY" as const;
export const QUARANTINED = "QUARANTINED" as const;

export type SourceIntakeStatus =
  | "UNVERIFIED"
  | "PENDING_RA_REVIEW"
  | "VERIFIED"
  | "REJECTED";

export type SourceIntakeReasonCode =
  | "VERIFIED_SYNTHETIC_EVIDENCE"
  | "MALFORMED_MANIFEST"
  | "MALFORMED_DIGEST"
  | "MALFORMED_BYTES"
  | "HASH_MISMATCH"
  | "MISSING_PROVENANCE"
  | "UNKNOWN_AUTHORITY"
  | "MISSING_RA_APPROVAL"
  | "RA_REJECTED";

export interface SourceRetrievalMetadata {
  readonly method: "SYNTHETIC_FIXTURE" | "SYNTHETIC_GENERATED";
  readonly retrievedAt: string;
  readonly retrievedBy: string;
}

export interface SourceProvenance {
  readonly sourceReference: string;
  readonly retrieval: SourceRetrievalMetadata;
}

export interface RaEvidence {
  readonly decision: "APPROVED" | "REJECTED";
  readonly reviewerId: string;
  readonly reviewedAt: string;
  readonly evidenceReference: string;
}

/**
 * No business data is accepted here: only a declared digest and synthetic-only
 * provenance needed to decide whether the bytes must stay quarantined.
 */
export interface SourceIntakeManifest {
  readonly schema: typeof SOURCE_INTAKE_SCHEMA;
  readonly classification: typeof SYNTHETIC_TEST_ONLY;
  readonly declaredSha256: string;
  readonly authorityId: string;
  readonly provenance: SourceProvenance;
  readonly raEvidence?: RaEvidence;
}

/** Callers must explicitly supply every authority accepted for a test. */
export interface SyntheticTestAuthority {
  readonly id: string;
  readonly classification: typeof SYNTHETIC_TEST_ONLY;
}

export interface SourceIntakeOptions {
  readonly authorityRegistry?: readonly SyntheticTestAuthority[];
}

/**
 * An intake result intentionally has no manifest, bytes, decoded content, or
 * other payload field. Verified means evidence was complete, never releasable.
 */
export interface SourceIntakeOutcome {
  readonly status: SourceIntakeStatus;
  readonly reasonCode: SourceIntakeReasonCode;
  readonly disposition: typeof QUARANTINED;
  readonly publishable: false;
  readonly payloadReleased: false;
  readonly downstreamUseAllowed: false;
}

/** The default accepts no authority; production authorities cannot be preloaded. */
export const DEFAULT_AUTHORITY_REGISTRY: readonly SyntheticTestAuthority[] = Object.freeze([]);

const SHA256_HEX = /^[a-f0-9]{64}$/;
const MANIFEST_KEYS = new Set(["schema", "classification", "declaredSha256", "authorityId", "provenance", "raEvidence"]);
const PROVENANCE_KEYS = new Set(["sourceReference", "retrieval"]);
const RETRIEVAL_KEYS = new Set(["method", "retrievedAt", "retrievedBy"]);
const RA_EVIDENCE_KEYS = new Set(["decision", "reviewerId", "reviewedAt", "evidenceReference"]);
const OPTIONS_KEYS = new Set(["authorityRegistry"]);
const AUTHORITY_KEYS = new Set(["id", "classification"]);

type NormalizedDataObject = Readonly<Record<string, unknown>>;

type DataObjectDecodeResult =
  | { readonly kind: "ok"; readonly value: NormalizedDataObject }
  | { readonly kind: "missing-required"; readonly key: string }
  | { readonly kind: "malformed" };

type SemanticDecodeResult<T> =
  | { readonly kind: "ok"; readonly value: T }
  | { readonly kind: "invalid" }
  | { readonly kind: "malformed" };

type ManifestDecodeResult =
  | { readonly kind: "ok"; readonly manifest: SourceIntakeManifest }
  | { readonly kind: "outcome"; readonly outcome: SourceIntakeOutcome };

type AuthorityResolution =
  | { readonly kind: "recognized" }
  | { readonly kind: "unknown" }
  | { readonly kind: "malformed" };

/** Computes a SHA-256 from the original bytes, not text decoded from those bytes. */
export function sha256Of(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

/**
 * Performs a Node-only, fail-closed evidence check. It never returns input
 * bytes or content, and never grants publishing or downstream use.
 */
export function evaluateSourceIntake(
  manifestInput: unknown,
  rawBytes: Uint8Array,
  options: SourceIntakeOptions = {}
): SourceIntakeOutcome {
  const manifestCheck = decodeManifest(manifestInput);
  if (manifestCheck.kind === "outcome") return manifestCheck.outcome;

  if (!isSafeUint8Array(rawBytes)) {
    return outcome("REJECTED", "MALFORMED_BYTES");
  }

  let actualDigest: string;
  try {
    actualDigest = sha256Of(rawBytes);
  } catch {
    return outcome("REJECTED", "MALFORMED_BYTES");
  }

  const manifest = manifestCheck.manifest;
  if (actualDigest !== manifest.declaredSha256) {
    return outcome("REJECTED", "HASH_MISMATCH");
  }

  const authority = resolveAuthority(options, manifest.authorityId);
  if (authority.kind === "malformed") {
    return outcome("REJECTED", "MALFORMED_MANIFEST");
  }
  if (authority.kind === "unknown") {
    return outcome("UNVERIFIED", "UNKNOWN_AUTHORITY");
  }

  if (manifest.raEvidence?.decision === "REJECTED") {
    return outcome("REJECTED", "RA_REJECTED");
  }

  if (!isCompleteRaApproval(manifest.raEvidence)) {
    return outcome("PENDING_RA_REVIEW", "MISSING_RA_APPROVAL");
  }

  return outcome("VERIFIED", "VERIFIED_SYNTHETIC_EVIDENCE");
}

function decodeManifest(input: unknown): ManifestDecodeResult {
  const decoded = decodePlainDataObject(
    input,
    ["schema", "classification", "declaredSha256", "authorityId", "provenance"],
    ["raEvidence"],
    MANIFEST_KEYS
  );
  if (decoded.kind === "missing-required") {
    const reasonCode =
      decoded.key === "declaredSha256"
        ? "MALFORMED_DIGEST"
        : decoded.key === "provenance"
          ? "MISSING_PROVENANCE"
          : "MALFORMED_MANIFEST";
    return {
      kind: "outcome",
      outcome: outcome(reasonCode === "MISSING_PROVENANCE" ? "UNVERIFIED" : "REJECTED", reasonCode)
    };
  }
  if (decoded.kind === "malformed") {
    return { kind: "outcome", outcome: outcome("REJECTED", "MALFORMED_MANIFEST") };
  }

  const manifest = decoded.value;
  if (
    manifest.schema !== SOURCE_INTAKE_SCHEMA ||
    manifest.classification !== SYNTHETIC_TEST_ONLY ||
    !isBoundedNonEmptyString(manifest.authorityId)
  ) {
    return { kind: "outcome", outcome: outcome("REJECTED", "MALFORMED_MANIFEST") };
  }
  if (typeof manifest.declaredSha256 !== "string" || !SHA256_HEX.test(manifest.declaredSha256)) {
    return { kind: "outcome", outcome: outcome("REJECTED", "MALFORMED_DIGEST") };
  }

  const provenance = decodeProvenance(manifest.provenance);
  if (provenance.kind === "malformed") {
    return { kind: "outcome", outcome: outcome("REJECTED", "MALFORMED_MANIFEST") };
  }
  if (provenance.kind === "invalid") {
    return { kind: "outcome", outcome: outcome("UNVERIFIED", "MISSING_PROVENANCE") };
  }

  let raEvidence: RaEvidence | undefined;
  if (Object.hasOwn(manifest, "raEvidence")) {
    const ra = decodeRaEvidence(manifest.raEvidence);
    if (ra.kind === "malformed") {
      return { kind: "outcome", outcome: outcome("REJECTED", "MALFORMED_MANIFEST") };
    }
    if (ra.kind === "invalid") {
      return { kind: "outcome", outcome: outcome("PENDING_RA_REVIEW", "MISSING_RA_APPROVAL") };
    }
    raEvidence = ra.value;
  }

  return {
    kind: "ok",
    manifest: createFrozenNullPrototype<SourceIntakeManifest>([
      ["schema", SOURCE_INTAKE_SCHEMA],
      ["classification", SYNTHETIC_TEST_ONLY],
      ["declaredSha256", manifest.declaredSha256],
      ["authorityId", manifest.authorityId],
      ["provenance", provenance.value],
      ...(raEvidence === undefined ? [] : [["raEvidence", raEvidence] as const])
    ])
  };
}

function decodeProvenance(input: unknown): SemanticDecodeResult<SourceProvenance> {
  if (typeof input !== "object" || input === null) return { kind: "invalid" };
  if (isRejectedProxy(input)) return { kind: "malformed" };
  if (Array.isArray(input)) return { kind: "invalid" };
  const decoded = decodePlainDataObject(input, ["sourceReference", "retrieval"], [], PROVENANCE_KEYS);
  if (decoded.kind === "malformed") return { kind: "malformed" };
  if (decoded.kind === "missing-required") return { kind: "invalid" };

  const retrieval = decodeRetrieval(decoded.value.retrieval);
  if (retrieval.kind !== "ok") return retrieval;
  if (!isBoundedNonEmptyString(decoded.value.sourceReference) || !decoded.value.sourceReference.startsWith("synthetic://")) {
    return { kind: "invalid" };
  }

  return {
    kind: "ok",
    value: createFrozenNullPrototype<SourceProvenance>([
      ["sourceReference", decoded.value.sourceReference],
      ["retrieval", retrieval.value]
    ])
  };
}

function decodeRetrieval(input: unknown): SemanticDecodeResult<SourceRetrievalMetadata> {
  if (typeof input !== "object" || input === null) return { kind: "invalid" };
  if (isRejectedProxy(input)) return { kind: "malformed" };
  if (Array.isArray(input)) return { kind: "invalid" };
  const decoded = decodePlainDataObject(input, ["method", "retrievedAt", "retrievedBy"], [], RETRIEVAL_KEYS);
  if (decoded.kind === "malformed") return { kind: "malformed" };
  if (decoded.kind === "missing-required") return { kind: "invalid" };

  if (
    (decoded.value.method !== "SYNTHETIC_FIXTURE" && decoded.value.method !== "SYNTHETIC_GENERATED") ||
    !isIsoTimestamp(decoded.value.retrievedAt) ||
    !isBoundedNonEmptyString(decoded.value.retrievedBy)
  ) {
    return { kind: "invalid" };
  }

  return {
    kind: "ok",
    value: createFrozenNullPrototype<SourceRetrievalMetadata>([
      ["method", decoded.value.method],
      ["retrievedAt", decoded.value.retrievedAt],
      ["retrievedBy", decoded.value.retrievedBy]
    ])
  };
}

function decodeRaEvidence(input: unknown): SemanticDecodeResult<RaEvidence> {
  if (typeof input !== "object" || input === null) return { kind: "invalid" };
  if (isRejectedProxy(input)) return { kind: "malformed" };
  if (Array.isArray(input)) return { kind: "invalid" };
  const decoded = decodePlainDataObject(input, ["decision", "reviewerId", "reviewedAt", "evidenceReference"], [], RA_EVIDENCE_KEYS);
  if (decoded.kind === "malformed") return { kind: "malformed" };
  if (decoded.kind === "missing-required") return { kind: "invalid" };

  if (
    (decoded.value.decision !== "APPROVED" && decoded.value.decision !== "REJECTED") ||
    !isBoundedNonEmptyString(decoded.value.reviewerId) ||
    !isIsoTimestamp(decoded.value.reviewedAt) ||
    !isBoundedNonEmptyString(decoded.value.evidenceReference)
  ) {
    return { kind: "invalid" };
  }

  return {
    kind: "ok",
    value: createFrozenNullPrototype<RaEvidence>([
      ["decision", decoded.value.decision],
      ["reviewerId", decoded.value.reviewerId],
      ["reviewedAt", decoded.value.reviewedAt],
      ["evidenceReference", decoded.value.evidenceReference]
    ])
  };
}

function resolveAuthority(
  options: SourceIntakeOptions,
  authorityId: string
): AuthorityResolution {
  const decodedOptions = decodePlainDataObject(options, [], ["authorityRegistry"], OPTIONS_KEYS);
  if (decodedOptions.kind !== "ok") return { kind: "malformed" };
  if (!Object.hasOwn(decodedOptions.value, "authorityRegistry")) return { kind: "unknown" };

  const registry = decodeDataArray(decodedOptions.value.authorityRegistry);
  if (registry === undefined) return { kind: "malformed" };

  let foundAuthority = false;
  let hasSemanticInvalidEntry = false;
  let hasStructuralMalformedEntry = false;
  for (const entry of registry) {
    const decodedAuthority = decodePlainDataObject(entry, ["id", "classification"], [], AUTHORITY_KEYS);
    if (decodedAuthority.kind !== "ok") {
      hasStructuralMalformedEntry = true;
      continue;
    }
    if (
      !isBoundedNonEmptyString(decodedAuthority.value.id) ||
      decodedAuthority.value.classification !== SYNTHETIC_TEST_ONLY
    ) {
      hasSemanticInvalidEntry = true;
      continue;
    }
    if (decodedAuthority.value.id === authorityId) foundAuthority = true;
  }

  if (hasStructuralMalformedEntry) return { kind: "malformed" };
  if (hasSemanticInvalidEntry) return { kind: "unknown" };
  return foundAuthority ? { kind: "recognized" } : { kind: "unknown" };
}

function isCompleteRaApproval(input: RaEvidence | undefined): boolean {
  return input?.decision === "APPROVED";
}

/** Builds all post-validation semantic objects without inheriting Object.prototype. */
function createFrozenNullPrototype<T extends object>(entries: readonly (readonly [string, unknown])[]): T {
  const normalized = Object.create(null) as Record<string, unknown>;
  for (const [key, value] of entries) {
    normalized[key] = value;
  }
  return Object.freeze(normalized) as unknown as T;
}

/**
 * Reads only own enumerable data descriptors and copies their values into a
 * null-prototype record. No caller-owned object is read after this succeeds.
 */
function decodePlainDataObject(
  input: unknown,
  requiredKeys: readonly string[],
  optionalKeys: readonly string[],
  allowedKeys: ReadonlySet<string>
): DataObjectDecodeResult {
  if (typeof input !== "object" || input === null) return { kind: "malformed" };
  if (isRejectedProxy(input) || Array.isArray(input)) return { kind: "malformed" };

  try {
    const prototype = Object.getPrototypeOf(input);
    if (prototype !== Object.prototype && prototype !== null) return { kind: "malformed" };

    for (const key of requiredKeys) {
      if (!Object.hasOwn(input, key)) return { kind: "missing-required", key };
    }

    const ownKeys = Reflect.ownKeys(input);
    const normalized: Record<string, unknown> = Object.create(null) as Record<string, unknown>;
    for (const key of ownKeys) {
      if (typeof key !== "string" || !allowedKeys.has(key)) return { kind: "malformed" };
      const descriptor = Object.getOwnPropertyDescriptor(input, key);
      if (descriptor === undefined || !descriptor.enumerable || !Object.hasOwn(descriptor, "value")) {
        return { kind: "malformed" };
      }
      normalized[key] = descriptor.value;
    }

    for (const key of optionalKeys) {
      if (Object.hasOwn(normalized, key) && !allowedKeys.has(key)) return { kind: "malformed" };
    }
    return { kind: "ok", value: Object.freeze(normalized) };
  } catch {
    return { kind: "malformed" };
  }
}

/** Arrays are copied descriptor-by-descriptor so registry getters and holes cannot be observed. */
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
    const ownKeys = Reflect.ownKeys(input);
    const values: unknown[] = [];
    for (const key of ownKeys) {
      if (key === "length") continue;
      if (typeof key !== "string" || !/^(0|[1-9]\d*)$/.test(key) || Number(key) >= length) return undefined;
      const descriptor = Object.getOwnPropertyDescriptor(input, key);
      if (descriptor === undefined || !descriptor.enumerable || !Object.hasOwn(descriptor, "value")) return undefined;
    }
    for (let index = 0; index < length; index += 1) {
      const key = String(index);
      if (!Object.hasOwn(input, key)) return undefined;
      const descriptor = Object.getOwnPropertyDescriptor(input, key);
      if (descriptor === undefined || !descriptor.enumerable || !Object.hasOwn(descriptor, "value")) return undefined;
      values.push(descriptor.value);
    }
    return Object.freeze(values);
  } catch {
    return undefined;
  }
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

function isBoundedNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= 512;
}

function isIsoTimestamp(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)) return false;
  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString() === value;
}

function outcome(status: SourceIntakeStatus, reasonCode: SourceIntakeReasonCode): SourceIntakeOutcome {
  return createFrozenNullPrototype<SourceIntakeOutcome>([
    ["status", status],
    ["reasonCode", reasonCode],
    ["disposition", QUARANTINED],
    ["publishable", false],
    ["payloadReleased", false],
    ["downstreamUseAllowed", false]
  ]);
}

export {
  DEFAULT_OFFICIAL_AUTHORITY_REGISTRY,
  evaluateOfficialSourceIntake,
  OFFICIAL_CANDIDATE,
  OFFICIAL_SOURCE_INTAKE_SCHEMA
} from "./official";
export type {
  OfficialApprovedRaEvidence,
  OfficialCandidateAuthority,
  OfficialRaEvidence,
  OfficialRejectedRaEvidence,
  OfficialSourceChannel,
  OfficialSourceIntakeManifest,
  OfficialSourceIntakeOptions,
  OfficialSourceIntakeOutcome,
  OfficialSourceIntakeReasonCode,
  OfficialSourceIntakeStatus,
  OfficialSourceProvenance
} from "./official";

export {
  computeDatasetDigest,
  GOVERNED_STORAGE_ROOT,
  governedStoragePathForDatasetVersion,
  isEligibleForUse,
  STORAGE_MANIFEST_SCHEMA,
  validateStorageManifest,
  verifyStoredFileBytes
} from "./storage";
export type {
  StorageApprovalRef,
  StorageFileEntry,
  StorageManifest
} from "./storage";
