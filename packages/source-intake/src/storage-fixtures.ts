import { sha256Of } from "./index";
import {
  computeDatasetDigest,
  STORAGE_MANIFEST_SCHEMA,
  type StorageFileEntry,
  type StorageManifest
} from "./storage";

/** Visibly invented bytes that contain no rule, item, price, or announcement data. */
export const STORAGE_FIXTURE_BYTES_ALPHA = new TextEncoder().encode("DEMO_ONLY governed-storage fixture alpha");
export const STORAGE_FIXTURE_BYTES_BETA = new TextEncoder().encode("DEMO_ONLY governed-storage fixture beta");

export const STORAGE_FIXTURE_DATASET_VERSION = "DEMO-STORAGE-VERSION-ALPHA";

export const STORAGE_FIXTURE_FILES: readonly StorageFileEntry[] = Object.freeze([
  Object.freeze({
    declaredName: "demo-alpha.txt",
    sha256: sha256Of(STORAGE_FIXTURE_BYTES_ALPHA),
    bytes: STORAGE_FIXTURE_BYTES_ALPHA.byteLength
  }),
  Object.freeze({
    declaredName: "demo-beta.txt",
    sha256: sha256Of(STORAGE_FIXTURE_BYTES_BETA),
    bytes: STORAGE_FIXTURE_BYTES_BETA.byteLength
  })
]);

export const STORAGE_FIXTURE_DATASET_DIGEST = computeDatasetDigest(STORAGE_FIXTURE_FILES);

export const STORAGE_FIXTURE_MANIFEST: StorageManifest = Object.freeze({
  schema: STORAGE_MANIFEST_SCHEMA,
  datasetVersion: STORAGE_FIXTURE_DATASET_VERSION,
  approvalRef: Object.freeze({
    rdlId: "RDL-DEMO-STORAGE",
    approvalWording: `INTAKE-APPROVE ${STORAGE_FIXTURE_DATASET_VERSION} ${STORAGE_FIXTURE_DATASET_DIGEST.slice(0, 7)}`
  }),
  sourceRegisterRefs: Object.freeze([
    "synthetic://source-register/demo-alpha",
    "synthetic://source-register/demo-beta"
  ]),
  effectiveFrom: "2099-04-01",
  effectiveTo: "2099-06-30",
  files: STORAGE_FIXTURE_FILES,
  revoked: false
} satisfies StorageManifest);
