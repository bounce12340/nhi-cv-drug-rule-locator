import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  computeDatasetDigest,
  GOVERNED_STORAGE_ROOT,
  governedStoragePathForDatasetVersion,
  isEligibleForUse,
  STORAGE_MANIFEST_SCHEMA,
  validateStorageManifest,
  verifyStoredFileBytes,
  type StorageFileEntry,
  type StorageManifest
} from "./index";
import {
  STORAGE_FIXTURE_BYTES_ALPHA,
  STORAGE_FIXTURE_DATASET_DIGEST,
  STORAGE_FIXTURE_DATASET_VERSION,
  STORAGE_FIXTURE_FILES,
  STORAGE_FIXTURE_MANIFEST
} from "./storage-fixtures";

const manifestFields = [
  "schema",
  "datasetVersion",
  "approvalRef",
  "sourceRegisterRefs",
  "effectiveFrom",
  "effectiveTo",
  "files",
  "revoked"
] as const;

function changedSha256(sha256: string): string {
  return `${sha256.startsWith("0") ? "1" : "0"}${sha256.slice(1)}`;
}

function manifestWithApprovalWording(approvalWording: string): StorageManifest {
  return {
    ...STORAGE_FIXTURE_MANIFEST,
    approvalRef: { ...STORAGE_FIXTURE_MANIFEST.approvalRef, approvalWording }
  };
}

describe("governed storage paths", () => {
  it("uses one safe dataset-version directory below the fixed storage root", () => {
    expect(GOVERNED_STORAGE_ROOT).toBe("data/governed");
    expect(governedStoragePathForDatasetVersion(STORAGE_FIXTURE_DATASET_VERSION)).toBe(
      `data/governed/${STORAGE_FIXTURE_DATASET_VERSION}`
    );
  });

  it("rejects path traversal, separators, absolute paths, and malformed versions", () => {
    const invalidVersions = ["", ".", "..", "../demo", "demo/child", "demo\\child", "/demo", "%2e%2e", " demo"];
    for (const version of invalidVersions) {
      expect(() => governedStoragePathForDatasetVersion(version)).toThrow(TypeError);
    }
  });
});

describe("storage manifest validation", () => {
  it("accepts only storage-manifest/v1 and returns a detached immutable data graph", () => {
    const validated = validateStorageManifest(STORAGE_FIXTURE_MANIFEST);

    expect(STORAGE_MANIFEST_SCHEMA).toBe("storage-manifest/v1");
    expect(validated).not.toBeNull();
    expect(validated).not.toBe(STORAGE_FIXTURE_MANIFEST);
    expect(Object.getPrototypeOf(validated)).toBeNull();
    expect(Object.isFrozen(validated)).toBe(true);
    expect(Object.getPrototypeOf(validated?.approvalRef)).toBeNull();
    expect(Object.isFrozen(validated?.approvalRef)).toBe(true);
    expect(Object.isFrozen(validated?.sourceRegisterRefs)).toBe(true);
    expect(Object.isFrozen(validated?.files)).toBe(true);
    for (const entry of validated?.files ?? []) {
      expect(Object.getPrototypeOf(entry)).toBeNull();
      expect(Object.isFrozen(entry)).toBe(true);
    }
    expect(validated).toEqual(STORAGE_FIXTURE_MANIFEST);
  });

  it("fails closed when any top-level field is missing", () => {
    for (const field of manifestFields) {
      const candidate: Record<string, unknown> = { ...STORAGE_FIXTURE_MANIFEST };
      Reflect.deleteProperty(candidate, field);
      expect(validateStorageManifest(candidate), field).toBeNull();
    }
  });

  it("fails closed when any top-level field has the wrong type", () => {
    const cases: readonly (readonly [typeof manifestFields[number], unknown])[] = [
      ["schema", 1],
      ["datasetVersion", false],
      ["approvalRef", []],
      ["sourceRegisterRefs", "not-an-array"],
      ["effectiveFrom", 1],
      ["effectiveTo", null],
      ["files", {}],
      ["revoked", "false"]
    ];

    for (const [field, value] of cases) {
      expect(validateStorageManifest({ ...STORAGE_FIXTURE_MANIFEST, [field]: value }), field).toBeNull();
    }
  });

  it("requires every approval reference field with the correct type", () => {
    for (const field of ["rdlId", "approvalWording"] as const) {
      const approvalRef: Record<string, unknown> = { ...STORAGE_FIXTURE_MANIFEST.approvalRef };
      Reflect.deleteProperty(approvalRef, field);
      expect(validateStorageManifest({ ...STORAGE_FIXTURE_MANIFEST, approvalRef }), field).toBeNull();
    }

    expect(validateStorageManifest({
      ...STORAGE_FIXTURE_MANIFEST,
      approvalRef: { ...STORAGE_FIXTURE_MANIFEST.approvalRef, rdlId: 9 }
    })).toBeNull();
    expect(validateStorageManifest({
      ...STORAGE_FIXTURE_MANIFEST,
      approvalRef: { ...STORAGE_FIXTURE_MANIFEST.approvalRef, approvalWording: false }
    })).toBeNull();
  });

  it("requires every file field with the correct type", () => {
    const firstFile = STORAGE_FIXTURE_FILES[0] as StorageFileEntry;
    for (const field of ["declaredName", "sha256", "bytes"] as const) {
      const entry: Record<string, unknown> = { ...firstFile };
      Reflect.deleteProperty(entry, field);
      expect(validateStorageManifest({ ...STORAGE_FIXTURE_MANIFEST, files: [entry] }), field).toBeNull();
    }

    const invalidValues: readonly (readonly [keyof StorageFileEntry, unknown])[] = [
      ["declaredName", 1],
      ["sha256", false],
      ["bytes", "1"]
    ];
    for (const [field, value] of invalidValues) {
      expect(validateStorageManifest({
        ...STORAGE_FIXTURE_MANIFEST,
        files: [{ ...firstFile, [field]: value }]
      }), field).toBeNull();
    }
  });

  it("validates approval wording character-for-character in all five required scenarios", () => {
    const sha7 = STORAGE_FIXTURE_DATASET_DIGEST.slice(0, 7);
    const wrongSha7 = `${sha7.startsWith("0") ? "1" : "0"}${sha7.slice(1)}`;

    expect(validateStorageManifest(STORAGE_FIXTURE_MANIFEST)).not.toBeNull();
    expect(validateStorageManifest(manifestWithApprovalWording(`INTAKE-APPROVE WRONG-VERSION ${sha7}`))).toBeNull();
    expect(validateStorageManifest(
      manifestWithApprovalWording(`INTAKE-APPROVE ${STORAGE_FIXTURE_DATASET_VERSION} ${wrongSha7}`)
    )).toBeNull();
    expect(validateStorageManifest(
      manifestWithApprovalWording(`intake-approve ${STORAGE_FIXTURE_DATASET_VERSION} ${sha7}`)
    )).toBeNull();

    const approvalRef: Record<string, unknown> = { ...STORAGE_FIXTURE_MANIFEST.approvalRef };
    Reflect.deleteProperty(approvalRef, "approvalWording");
    expect(validateStorageManifest({ ...STORAGE_FIXTURE_MANIFEST, approvalRef })).toBeNull();
  });

  it("fails closed for invalid dates, reversed effective windows, and unsafe or duplicate filenames", () => {
    expect(validateStorageManifest({ ...STORAGE_FIXTURE_MANIFEST, effectiveFrom: "2099-02-29" })).toBeNull();
    expect(validateStorageManifest({
      ...STORAGE_FIXTURE_MANIFEST,
      effectiveFrom: "2099-07-01",
      effectiveTo: "2099-06-30"
    })).toBeNull();
    expect(validateStorageManifest({
      ...STORAGE_FIXTURE_MANIFEST,
      files: [{ ...STORAGE_FIXTURE_FILES[0], declaredName: "../demo.txt" }]
    })).toBeNull();
    expect(validateStorageManifest({
      ...STORAGE_FIXTURE_MANIFEST,
      files: [STORAGE_FIXTURE_FILES[0], STORAGE_FIXTURE_FILES[0]]
    })).toBeNull();
  });

  it("rejects invalid array members, array holes, and extra fields", () => {
    expect(validateStorageManifest({ ...STORAGE_FIXTURE_MANIFEST, sourceRegisterRefs: [1] })).toBeNull();
    expect(validateStorageManifest({ ...STORAGE_FIXTURE_MANIFEST, files: [false] })).toBeNull();

    const refsWithHole = new Array(1);
    expect(validateStorageManifest({ ...STORAGE_FIXTURE_MANIFEST, sourceRegisterRefs: refsWithHole })).toBeNull();
    expect(validateStorageManifest({ ...STORAGE_FIXTURE_MANIFEST, unexpected: true })).toBeNull();
    expect(validateStorageManifest({
      ...STORAGE_FIXTURE_MANIFEST,
      approvalRef: { ...STORAGE_FIXTURE_MANIFEST.approvalRef, unexpected: true }
    })).toBeNull();
    expect(validateStorageManifest({
      ...STORAGE_FIXTURE_MANIFEST,
      files: [{ ...STORAGE_FIXTURE_FILES[0], unexpected: true }]
    })).toBeNull();
  });

  it("rejects custom prototypes, proxies, and accessors without executing getters", () => {
    expect(validateStorageManifest(Object.assign(Object.create({}), STORAGE_FIXTURE_MANIFEST))).toBeNull();
    expect(validateStorageManifest(new Proxy({ ...STORAGE_FIXTURE_MANIFEST }, {}))).toBeNull();

    let getterCalls = 0;
    const accessor = { ...STORAGE_FIXTURE_MANIFEST };
    Object.defineProperty(accessor, "datasetVersion", {
      enumerable: true,
      get() {
        getterCalls += 1;
        return STORAGE_FIXTURE_DATASET_VERSION;
      }
    });
    expect(validateStorageManifest(accessor)).toBeNull();
    expect(getterCalls).toBe(0);
  });
});

describe("governed storage integrity", () => {
  it("computes a deterministic dataset digest after sorting by declaredName", () => {
    const expected = createHash("sha256")
      .update([...STORAGE_FIXTURE_FILES]
        .sort((left, right) => left.declaredName.localeCompare(right.declaredName))
        .map((entry) => entry.sha256)
        .join(""), "ascii")
      .digest("hex");

    expect(computeDatasetDigest(STORAGE_FIXTURE_FILES)).toBe(expected);
    expect(computeDatasetDigest([...STORAGE_FIXTURE_FILES].reverse())).toBe(expected);
    expect(STORAGE_FIXTURE_DATASET_DIGEST).toBe(expected);
  });

  it("rejects malformed digest input and duplicate declared names", () => {
    expect(() => computeDatasetDigest([{ ...STORAGE_FIXTURE_FILES[0], sha256: "bad" }])).toThrow(TypeError);
    expect(() => computeDatasetDigest([STORAGE_FIXTURE_FILES[0], STORAGE_FIXTURE_FILES[0]])).toThrow(TypeError);
  });

  it("verifies both the SHA-256 and exact byte length", () => {
    const entry = STORAGE_FIXTURE_FILES[0] as StorageFileEntry;
    expect(verifyStoredFileBytes(entry, STORAGE_FIXTURE_BYTES_ALPHA)).toBe(true);
    expect(verifyStoredFileBytes({ ...entry, sha256: changedSha256(entry.sha256) }, STORAGE_FIXTURE_BYTES_ALPHA)).toBe(false);
    expect(verifyStoredFileBytes({ ...entry, bytes: entry.bytes + 1 }, STORAGE_FIXTURE_BYTES_ALPHA)).toBe(false);
    expect(verifyStoredFileBytes(entry, null)).toBe(false);
  });
});

describe("governed storage use eligibility", () => {
  it("allows only a validated, non-revoked manifest", () => {
    expect(isEligibleForUse(STORAGE_FIXTURE_MANIFEST)).toBe(true);
    expect(validateStorageManifest({ ...STORAGE_FIXTURE_MANIFEST, revoked: true })).not.toBeNull();
    expect(isEligibleForUse({ ...STORAGE_FIXTURE_MANIFEST, revoked: true })).toBe(false);
    expect(isEligibleForUse({ ...STORAGE_FIXTURE_MANIFEST, schema: "wrong" })).toBe(false);
    expect(isEligibleForUse(null)).toBe(false);
  });
});

describe("governed storage isolation and fixture safety", () => {
  it("keeps domain, contracts, API, and clinician packages independent of source-intake", () => {
    const packageJsonUrls = [
      new URL("../../../packages/domain/package.json", import.meta.url),
      new URL("../../../packages/contracts/package.json", import.meta.url),
      new URL("../../../apps/api/package.json", import.meta.url),
      new URL("../../../apps/clinician/package.json", import.meta.url)
    ];

    for (const packageJsonUrl of packageJsonUrls) {
      const packageJson = JSON.parse(readFileSync(packageJsonUrl, "utf8")) as {
        readonly dependencies?: Readonly<Record<string, unknown>>;
        readonly devDependencies?: Readonly<Record<string, unknown>>;
      };
      expect(Object.keys(packageJson.dependencies ?? {})).not.toContain("@nhi-cv/source-intake");
      expect(Object.keys(packageJson.devDependencies ?? {})).not.toContain("@nhi-cv/source-intake");
    }
  });

  it("keeps storage fixtures visibly fictional and outside prohibited identifier shapes", () => {
    const fixtureSurface = JSON.stringify({
      manifest: STORAGE_FIXTURE_MANIFEST,
      bytes: new TextDecoder().decode(STORAGE_FIXTURE_BYTES_ALPHA)
    });

    expect(fixtureSurface).toContain("DEMO");
    expect(fixtureSurface).toContain("synthetic://");
    expect(fixtureSurface).not.toMatch(/[A-Z]{1,2}[0-9]{8}/u);
  });
});
