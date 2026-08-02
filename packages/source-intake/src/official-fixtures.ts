import { sha256Of } from "./index";
import {
  OFFICIAL_CANDIDATE,
  OFFICIAL_SOURCE_INTAKE_SCHEMA,
  type OfficialCandidateAuthority,
  type OfficialSourceIntakeManifest
} from "./official";

/** Visibly invented bytes with no rule, item, payment, or announcement content. */
export const OFFICIAL_FIXTURE_BYTES = new TextEncoder().encode("DEMO_ONLY official-candidate fixture bytes alpha");

export const OFFICIAL_FIXTURE_DATASET_VERSION = "DEMO-DATASET-VERSION-ALPHA";

/** This invented authority is accepted only when a caller injects it explicitly. */
export const OFFICIAL_TEST_AUTHORITY: OfficialCandidateAuthority = Object.freeze({
  id: "official-candidate-authority-demo",
  classification: OFFICIAL_CANDIDATE
});

const declaredSha256 = sha256Of(OFFICIAL_FIXTURE_BYTES);

export const OFFICIAL_FIXTURE_MANIFEST: OfficialSourceIntakeManifest = Object.freeze({
  schema: OFFICIAL_SOURCE_INTAKE_SCHEMA,
  classification: OFFICIAL_CANDIDATE,
  datasetVersion: OFFICIAL_FIXTURE_DATASET_VERSION,
  declaredSha256,
  authorityId: OFFICIAL_TEST_AUTHORITY.id,
  provenance: {
    sourceChannel: "OFFICIAL_WEBSITE",
    sourceChannelRef: "https://example.invalid/demo-source-record",
    announcementRef: "DEMO-ANNOUNCEMENT-REF-001",
    effectiveDate: "2099-02-01",
    retrievedAt: "2099-01-15T00:00:00.000Z",
    retrievedBy: "demo-intake-operator",
    custodian: "demo-custodian",
    integrityStatement: "DEMO_ONLY complete fixture bytes; no conversion performed."
  },
  raEvidence: {
    decision: "APPROVED",
    reviewerId: "demo-project-owner-ra",
    reviewedAt: "2099-01-15T00:01:00.000Z",
    evidenceReference: "DEMO-RA-EVIDENCE-REF-001",
    approvalWording: `INTAKE-APPROVE ${OFFICIAL_FIXTURE_DATASET_VERSION} ${declaredSha256.slice(0, 7)}`
  }
} satisfies OfficialSourceIntakeManifest);
