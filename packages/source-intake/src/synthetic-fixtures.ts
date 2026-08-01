import {
  sha256Of,
  SOURCE_INTAKE_SCHEMA,
  SYNTHETIC_TEST_ONLY,
  type SourceIntakeManifest,
  type SyntheticTestAuthority
} from "./index";

/** Deliberately invented bytes for unit tests; they are never released by the gate. */
export const SYNTHETIC_FIXTURE_BYTES = new TextEncoder().encode("synthetic-fixture-alpha-v1");

/** This authority is test-only and must be injected explicitly by a caller. */
export const SYNTHETIC_TEST_AUTHORITY: SyntheticTestAuthority = Object.freeze({
  id: "synthetic-test-authority-alpha",
  classification: SYNTHETIC_TEST_ONLY
});

export const SYNTHETIC_FIXTURE_MANIFEST: SourceIntakeManifest = Object.freeze({
  schema: SOURCE_INTAKE_SCHEMA,
  classification: SYNTHETIC_TEST_ONLY,
  declaredSha256: sha256Of(SYNTHETIC_FIXTURE_BYTES),
  authorityId: SYNTHETIC_TEST_AUTHORITY.id,
  provenance: {
    sourceReference: "synthetic://fixture/alpha",
    retrieval: {
      method: "SYNTHETIC_FIXTURE",
      retrievedAt: "2026-08-01T00:00:00.000Z",
      retrievedBy: "synthetic-fixture-builder"
    }
  },
  raEvidence: {
    decision: "APPROVED",
    reviewerId: "synthetic-ra-reviewer",
    reviewedAt: "2026-08-01T00:01:00.000Z",
    evidenceReference: "synthetic://review/alpha"
  }
} satisfies SourceIntakeManifest);
