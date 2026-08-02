import { describe, expect, it } from "vitest";
import {
  DEFAULT_AUTHORITY_REGISTRY,
  DEFAULT_OFFICIAL_AUTHORITY_REGISTRY,
  evaluateOfficialSourceIntake,
  evaluateSourceIntake,
  OFFICIAL_CANDIDATE,
  OFFICIAL_SOURCE_INTAKE_SCHEMA,
  type OfficialSourceIntakeOptions,
  type OfficialSourceIntakeOutcome,
  type OfficialSourceIntakeReasonCode,
  type SourceIntakeOptions
} from "./index";
import {
  OFFICIAL_FIXTURE_BYTES,
  OFFICIAL_FIXTURE_DATASET_VERSION,
  OFFICIAL_FIXTURE_MANIFEST,
  OFFICIAL_TEST_AUTHORITY
} from "./official-fixtures";
import {
  SYNTHETIC_FIXTURE_BYTES,
  SYNTHETIC_FIXTURE_MANIFEST,
  SYNTHETIC_TEST_AUTHORITY
} from "./synthetic-fixtures";

const injectedOfficialAuthority = { authorityRegistry: [OFFICIAL_TEST_AUTHORITY] } as const;
const outcomeKeys = [
  "status",
  "reasonCode",
  "disposition",
  "publishable",
  "payloadReleased",
  "downstreamUseAllowed",
  "governedStorageEligible"
].sort();
const sensitiveOutcomeKeys = ["manifest", "rawBytes", "payload", "content"];

function expectOfficialOutcome(
  result: OfficialSourceIntakeOutcome,
  status: OfficialSourceIntakeOutcome["status"],
  reasonCode: OfficialSourceIntakeReasonCode,
  governedStorageEligible = false
): void {
  const surface = result as OfficialSourceIntakeOutcome & Record<string, unknown>;

  expect(surface.status).toBe(status);
  expect(surface.reasonCode).toBe(reasonCode);
  expect(surface.disposition).toBe("QUARANTINED");
  expect(surface.publishable).toBe(false);
  expect(surface.payloadReleased).toBe(false);
  expect(surface.downstreamUseAllowed).toBe(false);
  expect(surface.governedStorageEligible).toBe(governedStorageEligible);
  expect(Object.getPrototypeOf(surface)).toBeNull();
  expect(Object.isFrozen(surface)).toBe(true);
  expect(Object.keys(surface).sort()).toEqual(outcomeKeys);
  for (const key of sensitiveOutcomeKeys) expect(key in surface).toBe(false);
}

function intake(
  manifest: unknown = OFFICIAL_FIXTURE_MANIFEST,
  rawBytes: unknown = OFFICIAL_FIXTURE_BYTES,
  options: unknown = injectedOfficialAuthority
): OfficialSourceIntakeOutcome {
  return evaluateOfficialSourceIntake(
    manifest,
    rawBytes as Uint8Array,
    options as OfficialSourceIntakeOptions
  );
}

function approvedEvidence(): NonNullable<typeof OFFICIAL_FIXTURE_MANIFEST.raEvidence> {
  return OFFICIAL_FIXTURE_MANIFEST.raEvidence as NonNullable<typeof OFFICIAL_FIXTURE_MANIFEST.raEvidence>;
}

describe("official-candidate source intake quarantine gate", () => {
  it("exports the v2 schema and verifies exact approval without releasing payload", () => {
    expect(OFFICIAL_SOURCE_INTAKE_SCHEMA).toBe("source-intake/v2");
    expect(OFFICIAL_CANDIDATE).toBe("OFFICIAL_CANDIDATE");
    expectOfficialOutcome(intake(), "VERIFIED", "VERIFIED_OFFICIAL_EVIDENCE", true);
  });

  it("accepts each of the three official source channels", () => {
    for (const sourceChannel of ["OFFICIAL_WEBSITE", "OFFICIAL_DOCUMENT", "PHYSICAL_SCAN"] as const) {
      const manifest = {
        ...OFFICIAL_FIXTURE_MANIFEST,
        provenance: { ...OFFICIAL_FIXTURE_MANIFEST.provenance, sourceChannel }
      };
      expectOfficialOutcome(intake(manifest), "VERIFIED", "VERIFIED_OFFICIAL_EVIDENCE", true);
    }
  });

  it("uses an immutable empty default registry and requires explicit authority injection", () => {
    expect(DEFAULT_OFFICIAL_AUTHORITY_REGISTRY).toEqual([]);
    expect(Object.isFrozen(DEFAULT_OFFICIAL_AUTHORITY_REGISTRY)).toBe(true);
    expectOfficialOutcome(intake(OFFICIAL_FIXTURE_MANIFEST, OFFICIAL_FIXTURE_BYTES, {}), "UNVERIFIED", "UNKNOWN_AUTHORITY");
  });

  it("fails closed when any official provenance field is missing", () => {
    const provenanceFields = [
      "sourceChannel",
      "sourceChannelRef",
      "announcementRef",
      "effectiveDate",
      "retrievedAt",
      "retrievedBy",
      "custodian",
      "integrityStatement"
    ] as const;

    for (const field of provenanceFields) {
      const provenance: Record<string, unknown> = { ...OFFICIAL_FIXTURE_MANIFEST.provenance };
      Reflect.deleteProperty(provenance, field);
      expectOfficialOutcome(
        intake({ ...OFFICIAL_FIXTURE_MANIFEST, provenance }),
        "UNVERIFIED",
        "MISSING_PROVENANCE"
      );
    }

    const { provenance: _provenance, ...withoutProvenance } = OFFICIAL_FIXTURE_MANIFEST;
    expectOfficialOutcome(intake(withoutProvenance), "UNVERIFIED", "MISSING_PROVENANCE");
  });

  it("fails closed for invalid official provenance values", () => {
    const invalidValues: readonly (readonly [string, unknown])[] = [
      ["sourceChannel", "OTHER"],
      ["sourceChannelRef", ""],
      ["announcementRef", " "],
      ["effectiveDate", "2099-02-29"],
      ["retrievedAt", "2099-01-15"],
      ["retrievedBy", ""],
      ["custodian", null],
      ["integrityStatement", ""]
    ];

    for (const [field, value] of invalidValues) {
      const provenance = { ...OFFICIAL_FIXTURE_MANIFEST.provenance, [field]: value };
      expectOfficialOutcome(
        intake({ ...OFFICIAL_FIXTURE_MANIFEST, provenance }),
        "UNVERIFIED",
        "MISSING_PROVENANCE"
      );
    }
  });

  it("rejects raw-byte hash mismatches, malformed digests, and malformed bytes", () => {
    expectOfficialOutcome(
      intake(OFFICIAL_FIXTURE_MANIFEST, new TextEncoder().encode("DEMO_ONLY tampered fixture bytes")),
      "REJECTED",
      "HASH_MISMATCH"
    );
    expectOfficialOutcome(
      intake({ ...OFFICIAL_FIXTURE_MANIFEST, declaredSha256: "not-a-sha256" }),
      "REJECTED",
      "MALFORMED_DIGEST"
    );
    expectOfficialOutcome(intake(OFFICIAL_FIXTURE_MANIFEST, null), "REJECTED", "MALFORMED_BYTES");
  });

  it("does not trust an authority that was not injected", () => {
    const manifest = { ...OFFICIAL_FIXTURE_MANIFEST, authorityId: "official-candidate-authority-unknown" };
    expectOfficialOutcome(intake(manifest), "UNVERIFIED", "UNKNOWN_AUTHORITY");
  });

  it("fails closed in both directions for cross-classification authorities", () => {
    expectOfficialOutcome(
      intake(OFFICIAL_FIXTURE_MANIFEST, OFFICIAL_FIXTURE_BYTES, {
        authorityRegistry: [SYNTHETIC_TEST_AUTHORITY]
      }),
      "UNVERIFIED",
      "UNKNOWN_AUTHORITY"
    );

    const syntheticResult = evaluateSourceIntake(
      SYNTHETIC_FIXTURE_MANIFEST,
      SYNTHETIC_FIXTURE_BYTES,
      { authorityRegistry: [OFFICIAL_TEST_AUTHORITY] } as unknown as SourceIntakeOptions
    );
    expect(syntheticResult.status).toBe("UNVERIFIED");
    expect(syntheticResult.reasonCode).toBe("UNKNOWN_AUTHORITY");
    expect(syntheticResult.disposition).toBe("QUARANTINED");
    expect(syntheticResult.publishable).toBe(false);
    expect(syntheticResult.payloadReleased).toBe(false);
    expect(syntheticResult.downstreamUseAllowed).toBe(false);
  });

  it("rejects manifests presented to the opposite classification channel", () => {
    expectOfficialOutcome(
      intake(SYNTHETIC_FIXTURE_MANIFEST, SYNTHETIC_FIXTURE_BYTES),
      "REJECTED",
      "MALFORMED_MANIFEST"
    );

    const syntheticResult = evaluateSourceIntake(
      OFFICIAL_FIXTURE_MANIFEST,
      OFFICIAL_FIXTURE_BYTES,
      { authorityRegistry: [SYNTHETIC_TEST_AUTHORITY] }
    );
    expect(syntheticResult.status).toBe("REJECTED");
    expect(syntheticResult.reasonCode).toBe("MALFORMED_MANIFEST");
  });

  it("treats exact approval wording as the only approved wording", () => {
    const evidence = approvedEvidence();
    const sha7 = OFFICIAL_FIXTURE_MANIFEST.declaredSha256.slice(0, 7);
    const wrongSha7 = `${sha7.startsWith("0") ? "1" : "0"}${sha7.slice(1)}`;
    const cases: readonly (readonly [string, unknown, OfficialSourceIntakeOutcome["status"], boolean])[] = [
      ["correct", evidence.approvalWording, "VERIFIED", true],
      ["wrong version", `INTAKE-APPROVE WRONG-DATASET-VERSION ${sha7}`, "PENDING_RA_REVIEW", false],
      ["wrong sha7", `INTAKE-APPROVE ${OFFICIAL_FIXTURE_DATASET_VERSION} ${wrongSha7}`, "PENDING_RA_REVIEW", false],
      ["wrong format", `intake-approve ${OFFICIAL_FIXTURE_DATASET_VERSION} ${sha7}`, "PENDING_RA_REVIEW", false],
      ["missing", undefined, "PENDING_RA_REVIEW", false]
    ];

    for (const [_label, approvalWording, status, eligible] of cases) {
      const raEvidence: Record<string, unknown> = { ...evidence };
      if (approvalWording === undefined) {
        Reflect.deleteProperty(raEvidence, "approvalWording");
      } else {
        raEvidence.approvalWording = approvalWording;
      }
      expectOfficialOutcome(
        intake({ ...OFFICIAL_FIXTURE_MANIFEST, raEvidence }),
        status,
        status === "VERIFIED" ? "VERIFIED_OFFICIAL_EVIDENCE" : "MISSING_RA_APPROVAL",
        eligible
      );
    }
  });

  it("invalidates approval when the manifest dataset version changes", () => {
    expectOfficialOutcome(
      intake({ ...OFFICIAL_FIXTURE_MANIFEST, datasetVersion: "DEMO-DATASET-VERSION-BETA" }),
      "PENDING_RA_REVIEW",
      "MISSING_RA_APPROVAL"
    );
  });

  it("keeps missing or malformed RA evidence pending and explicit rejection rejected", () => {
    const { raEvidence: _raEvidence, ...withoutRaEvidence } = OFFICIAL_FIXTURE_MANIFEST;
    expectOfficialOutcome(intake(withoutRaEvidence), "PENDING_RA_REVIEW", "MISSING_RA_APPROVAL");
    expectOfficialOutcome(
      intake({
        ...OFFICIAL_FIXTURE_MANIFEST,
        raEvidence: { ...approvedEvidence(), reviewerId: "" }
      }),
      "PENDING_RA_REVIEW",
      "MISSING_RA_APPROVAL"
    );
    expectOfficialOutcome(
      intake({
        ...OFFICIAL_FIXTURE_MANIFEST,
        raEvidence: { ...approvedEvidence(), decision: "REJECTED" }
      }),
      "REJECTED",
      "RA_REJECTED"
    );
  });

  it("rejects malformed manifests and unexpected fields", () => {
    expectOfficialOutcome(intake({ schema: "wrong" }), "REJECTED", "MALFORMED_MANIFEST");
    expectOfficialOutcome(
      intake({ ...OFFICIAL_FIXTURE_MANIFEST, schema: "source-intake/v1" }),
      "REJECTED",
      "MALFORMED_MANIFEST"
    );
    expectOfficialOutcome(
      intake({ ...OFFICIAL_FIXTURE_MANIFEST, classification: "SYNTHETIC_TEST_ONLY" }),
      "REJECTED",
      "MALFORMED_MANIFEST"
    );
    expectOfficialOutcome(
      intake({ ...OFFICIAL_FIXTURE_MANIFEST, unexpected: "not-accepted" }),
      "REJECTED",
      "MALFORMED_MANIFEST"
    );
  });

  it("rejects custom prototypes, proxies, and accessors without executing getters", () => {
    const customPrototype = Object.assign(Object.create({}), OFFICIAL_FIXTURE_MANIFEST);
    expectOfficialOutcome(intake(customPrototype), "REJECTED", "MALFORMED_MANIFEST");
    expectOfficialOutcome(
      intake(new Proxy({ ...OFFICIAL_FIXTURE_MANIFEST }, {})),
      "REJECTED",
      "MALFORMED_MANIFEST"
    );

    let getterCalls = 0;
    const accessor = { ...OFFICIAL_FIXTURE_MANIFEST };
    Object.defineProperty(accessor, "datasetVersion", {
      enumerable: true,
      get() {
        getterCalls += 1;
        return OFFICIAL_FIXTURE_DATASET_VERSION;
      }
    });
    expectOfficialOutcome(intake(accessor), "REJECTED", "MALFORMED_MANIFEST");
    expect(getterCalls).toBe(0);
  });

  it("rejects malformed authority registries and wrong official classifications", () => {
    expectOfficialOutcome(
      intake(OFFICIAL_FIXTURE_MANIFEST, OFFICIAL_FIXTURE_BYTES, {
        authorityRegistry: [{ ...OFFICIAL_TEST_AUTHORITY, classification: "WRONG" }]
      }),
      "UNVERIFIED",
      "UNKNOWN_AUTHORITY"
    );
    expectOfficialOutcome(
      intake(OFFICIAL_FIXTURE_MANIFEST, OFFICIAL_FIXTURE_BYTES, {
        authorityRegistry: [{ id: OFFICIAL_TEST_AUTHORITY.id }]
      }),
      "REJECTED",
      "MALFORMED_MANIFEST"
    );
  });

  it("keeps official fixtures visibly fictional and outside red-line patterns", () => {
    const fixtureSurface = JSON.stringify({
      manifest: OFFICIAL_FIXTURE_MANIFEST,
      authority: OFFICIAL_TEST_AUTHORITY,
      bytes: new TextDecoder().decode(OFFICIAL_FIXTURE_BYTES)
    });

    expect(fixtureSurface).not.toMatch(/[A-Z]{1,2}[0-9]{8}/u);
    expect(fixtureSurface).not.toMatch(/(?:National Health Insurance Administration|健保署|衛生福利部中央健康保險署)/u);
    expect(OFFICIAL_FIXTURE_MANIFEST.provenance.sourceChannelRef).toContain("example.invalid");
    expect(OFFICIAL_FIXTURE_MANIFEST.provenance.announcementRef).toMatch(/^DEMO-/u);
    expect(OFFICIAL_FIXTURE_MANIFEST.classification).toBe(OFFICIAL_CANDIDATE);
    expect(DEFAULT_AUTHORITY_REGISTRY).toEqual([]);
  });
});
