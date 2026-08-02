import { createHash } from "node:crypto";
import { types as utilTypes } from "node:util";

/** The schema accepted only by the official-candidate quarantine gate. */
export const OFFICIAL_SOURCE_INTAKE_SCHEMA = "source-intake/v2" as const;

/** Official-looking material remains only a candidate until governed intake completes. */
export const OFFICIAL_CANDIDATE = "OFFICIAL_CANDIDATE" as const;
const QUARANTINED = "QUARANTINED" as const;

export type OfficialSourceChannel =
  | "OFFICIAL_WEBSITE"
  | "OFFICIAL_DOCUMENT"
  | "PHYSICAL_SCAN";

export type OfficialSourceIntakeStatus =
  | "UNVERIFIED"
  | "PENDING_RA_REVIEW"
  | "VERIFIED"
  | "REJECTED";

export type OfficialSourceIntakeReasonCode =
  | "VERIFIED_OFFICIAL_EVIDENCE"
  | "MALFORMED_MANIFEST"
  | "MALFORMED_DIGEST"
  | "MALFORMED_BYTES"
  | "HASH_MISMATCH"
  | "MISSING_PROVENANCE"
  | "UNKNOWN_AUTHORITY"
  | "MISSING_RA_APPROVAL"
  | "RA_REJECTED";

/** Stage 1 source-register fields carried by an official-candidate manifest. */
export interface OfficialSourceProvenance {
  readonly sourceChannel: OfficialSourceChannel;
  readonly sourceChannelRef: string;
  readonly announcementRef: string;
  readonly effectiveDate: string;
  readonly retrievedAt: string;
  readonly retrievedBy: string;
  readonly custodian: string;
  readonly integrityStatement: string;
}

interface OfficialRaEvidenceBase {
  readonly reviewerId: string;
  readonly reviewedAt: string;
  readonly evidenceReference: string;
}

export interface OfficialApprovedRaEvidence extends OfficialRaEvidenceBase {
  readonly decision: "APPROVED";
  readonly approvalWording: string;
}

export interface OfficialRejectedRaEvidence extends OfficialRaEvidenceBase {
  readonly decision: "REJECTED";
  readonly approvalWording?: string;
}

export type OfficialRaEvidence = OfficialApprovedRaEvidence | OfficialRejectedRaEvidence;

/**
 * The gate accepts metadata plus separately supplied bytes. It never includes
 * those bytes, decoded content, or other payload in an outcome.
 */
export interface OfficialSourceIntakeManifest {
  readonly schema: typeof OFFICIAL_SOURCE_INTAKE_SCHEMA;
  readonly classification: typeof OFFICIAL_CANDIDATE;
  readonly datasetVersion: string;
  readonly declaredSha256: string;
  readonly authorityId: string;
  readonly provenance: OfficialSourceProvenance;
  readonly raEvidence?: OfficialRaEvidence;
}

/** Official authorities are classification-bound and must be injected explicitly. */
export interface OfficialCandidateAuthority {
  readonly id: string;
  readonly classification: typeof OFFICIAL_CANDIDATE;
}

export interface OfficialSourceIntakeOptions {
  readonly authorityRegistry?: readonly OfficialCandidateAuthority[];
}

/**
 * Eligibility means only that governed storage may accept this version. It
 * never grants publishing, payload release, or downstream use.
 */
export interface OfficialSourceIntakeOutcome {
  readonly status: OfficialSourceIntakeStatus;
  readonly reasonCode: OfficialSourceIntakeReasonCode;
  readonly disposition: typeof QUARANTINED;
  readonly publishable: false;
  readonly payloadReleased: false;
  readonly downstreamUseAllowed: false;
  readonly governedStorageEligible: boolean;
}

/** The official-candidate channel trusts no authority by default. */
export const DEFAULT_OFFICIAL_AUTHORITY_REGISTRY: readonly OfficialCandidateAuthority[] = Object.freeze([]);

const SHA256_HEX = /^[a-f0-9]{64}$/;
const MANIFEST_KEYS = new Set([
  "schema",
  "classification",
  "datasetVersion",
  "declaredSha256",
  "authorityId",
  "provenance",
  "raEvidence"
]);
const PROVENANCE_KEYS = new Set([
  "sourceChannel",
  "sourceChannelRef",
  "announcementRef",
  "effectiveDate",
  "retrievedAt",
  "retrievedBy",
  "custodian",
  "integrityStatement"
]);
const RA_EVIDENCE_KEYS = new Set([
  "decision",
  "reviewerId",
  "reviewedAt",
  "evidenceReference",
  "approvalWording"
]);
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
  | { readonly kind: "ok"; readonly manifest: OfficialSourceIntakeManifest }
  | { readonly kind: "outcome"; readonly outcome: OfficialSourceIntakeOutcome };

type AuthorityResolution =
  | { readonly kind: "recognized" }
  | { readonly kind: "unknown" }
  | { readonly kind: "malformed" };

/**
 * Performs a Node-only, fail-closed check for the v2 channel. The result never
 * releases the supplied bytes, including when governed storage is eligible.
 */
export function evaluateOfficialSourceIntake(
  manifestInput: unknown,
  rawBytes: Uint8Array,
  options: OfficialSourceIntakeOptions = {}
): OfficialSourceIntakeOutcome {
  const manifestCheck = decodeManifest(manifestInput);
  if (manifestCheck.kind === "outcome") return manifestCheck.outcome;

  if (!isSafeUint8Array(rawBytes)) {
    return outcome("REJECTED", "MALFORMED_BYTES");
  }

  let actualDigest: string;
  try {
    actualDigest = createHash("sha256").update(rawBytes).digest("hex");
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

  if (!hasExactApprovalWording(manifest)) {
    return outcome("PENDING_RA_REVIEW", "MISSING_RA_APPROVAL");
  }

  return outcome("VERIFIED", "VERIFIED_OFFICIAL_EVIDENCE", true);
}

function decodeManifest(input: unknown): ManifestDecodeResult {
  const decoded = decodePlainDataObject(
    input,
    ["schema", "classification", "datasetVersion", "declaredSha256", "authorityId", "provenance"],
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
    manifest.schema !== OFFICIAL_SOURCE_INTAKE_SCHEMA ||
    manifest.classification !== OFFICIAL_CANDIDATE ||
    !isBoundedNonEmptyString(manifest.datasetVersion) ||
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

  let raEvidence: OfficialRaEvidence | undefined;
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
    manifest: createFrozenNullPrototype<OfficialSourceIntakeManifest>([
      ["schema", OFFICIAL_SOURCE_INTAKE_SCHEMA],
      ["classification", OFFICIAL_CANDIDATE],
      ["datasetVersion", manifest.datasetVersion],
      ["declaredSha256", manifest.declaredSha256],
      ["authorityId", manifest.authorityId],
      ["provenance", provenance.value],
      ...(raEvidence === undefined ? [] : [["raEvidence", raEvidence] as const])
    ])
  };
}

function decodeProvenance(input: unknown): SemanticDecodeResult<OfficialSourceProvenance> {
  if (typeof input !== "object" || input === null) return { kind: "invalid" };
  if (isRejectedProxy(input)) return { kind: "malformed" };
  if (Array.isArray(input)) return { kind: "invalid" };
  const decoded = decodePlainDataObject(
    input,
    [
      "sourceChannel",
      "sourceChannelRef",
      "announcementRef",
      "effectiveDate",
      "retrievedAt",
      "retrievedBy",
      "custodian",
      "integrityStatement"
    ],
    [],
    PROVENANCE_KEYS
  );
  if (decoded.kind === "malformed") return { kind: "malformed" };
  if (decoded.kind === "missing-required") return { kind: "invalid" };

  const provenance = decoded.value;
  if (
    !isOfficialSourceChannel(provenance.sourceChannel) ||
    !isBoundedNonEmptyString(provenance.sourceChannelRef) ||
    !isBoundedNonEmptyString(provenance.announcementRef) ||
    !isIsoDate(provenance.effectiveDate) ||
    !isIsoTimestamp(provenance.retrievedAt) ||
    !isBoundedNonEmptyString(provenance.retrievedBy) ||
    !isBoundedNonEmptyString(provenance.custodian) ||
    !isBoundedNonEmptyString(provenance.integrityStatement)
  ) {
    return { kind: "invalid" };
  }

  return {
    kind: "ok",
    value: createFrozenNullPrototype<OfficialSourceProvenance>([
      ["sourceChannel", provenance.sourceChannel],
      ["sourceChannelRef", provenance.sourceChannelRef],
      ["announcementRef", provenance.announcementRef],
      ["effectiveDate", provenance.effectiveDate],
      ["retrievedAt", provenance.retrievedAt],
      ["retrievedBy", provenance.retrievedBy],
      ["custodian", provenance.custodian],
      ["integrityStatement", provenance.integrityStatement]
    ])
  };
}

function decodeRaEvidence(input: unknown): SemanticDecodeResult<OfficialRaEvidence> {
  if (typeof input !== "object" || input === null) return { kind: "invalid" };
  if (isRejectedProxy(input)) return { kind: "malformed" };
  if (Array.isArray(input)) return { kind: "invalid" };
  const decoded = decodePlainDataObject(
    input,
    ["decision", "reviewerId", "reviewedAt", "evidenceReference"],
    ["approvalWording"],
    RA_EVIDENCE_KEYS
  );
  if (decoded.kind === "malformed") return { kind: "malformed" };
  if (decoded.kind === "missing-required") return { kind: "invalid" };

  const raEvidence = decoded.value;
  if (
    (raEvidence.decision !== "APPROVED" && raEvidence.decision !== "REJECTED") ||
    !isBoundedNonEmptyString(raEvidence.reviewerId) ||
    !isIsoTimestamp(raEvidence.reviewedAt) ||
    !isBoundedNonEmptyString(raEvidence.evidenceReference) ||
    (Object.hasOwn(raEvidence, "approvalWording") && !isBoundedNonEmptyString(raEvidence.approvalWording))
  ) {
    return { kind: "invalid" };
  }

  return {
    kind: "ok",
    value: createFrozenNullPrototype<OfficialRaEvidence>([
      ["decision", raEvidence.decision],
      ["reviewerId", raEvidence.reviewerId],
      ["reviewedAt", raEvidence.reviewedAt],
      ["evidenceReference", raEvidence.evidenceReference],
      ...(Object.hasOwn(raEvidence, "approvalWording")
        ? [["approvalWording", raEvidence.approvalWording] as const]
        : [])
    ])
  };
}

function resolveAuthority(options: OfficialSourceIntakeOptions, authorityId: string): AuthorityResolution {
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
      decodedAuthority.value.classification !== OFFICIAL_CANDIDATE
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

function hasExactApprovalWording(manifest: OfficialSourceIntakeManifest): boolean {
  const evidence = manifest.raEvidence;
  if (evidence?.decision !== "APPROVED") return false;
  const expected = `INTAKE-APPROVE ${manifest.datasetVersion} ${manifest.declaredSha256.slice(0, 7)}`;
  return evidence.approvalWording === expected;
}

function isOfficialSourceChannel(value: unknown): value is OfficialSourceChannel {
  return value === "OFFICIAL_WEBSITE" || value === "OFFICIAL_DOCUMENT" || value === "PHYSICAL_SCAN";
}

function isIsoDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function isIsoTimestamp(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)) return false;
  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString() === value;
}

function isBoundedNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= 512;
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

/** Builds post-validation semantic objects without inheriting Object.prototype. */
function createFrozenNullPrototype<T extends object>(entries: readonly (readonly [string, unknown])[]): T {
  const normalized = Object.create(null) as Record<string, unknown>;
  for (const [key, value] of entries) normalized[key] = value;
  return Object.freeze(normalized) as unknown as T;
}

/** Copies only own enumerable data descriptors and never executes accessors. */
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

/** Copies registry arrays descriptor-by-descriptor, rejecting holes and getters. */
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

function outcome(
  status: OfficialSourceIntakeStatus,
  reasonCode: OfficialSourceIntakeReasonCode,
  governedStorageEligible = false
): OfficialSourceIntakeOutcome {
  return createFrozenNullPrototype<OfficialSourceIntakeOutcome>([
    ["status", status],
    ["reasonCode", reasonCode],
    ["disposition", QUARANTINED],
    ["publishable", false],
    ["payloadReleased", false],
    ["downstreamUseAllowed", false],
    ["governedStorageEligible", governedStorageEligible]
  ]);
}
