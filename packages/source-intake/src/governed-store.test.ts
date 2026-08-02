import { createHash } from "node:crypto";
import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
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

const MANIFEST_NAME = "storage-manifest.json";
const CURRENT_DATASET_VERSION = "nhi-lipid-2026-09-01-r1";
const REPOSITORY_GOVERNED_ROOT = fileURLToPath(new URL("../../../data/governed", import.meta.url));
const SYNTHETIC_BYTES = new TextEncoder().encode("DEMO governed-store fixture A\n");

interface VerifiedDataset {
  readonly datasetVersion: string;
  readonly fileCount: number;
  readonly revoked: boolean;
  readonly eligible: boolean;
}

interface GovernedStoreSummary {
  readonly datasetCount: number;
  readonly datasets: readonly VerifiedDataset[];
  readonly note: string;
}

function failVerification(message: string): never {
  throw new Error(message);
}

function verifyGovernedStore(storageRoot: string): GovernedStoreSummary {
  if (!existsSync(storageRoot)) {
    return { datasetCount: 0, datasets: [], note: "zero governed datasets (storage root absent)" };
  }

  const manifestPaths = readdirSync(storageRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(storageRoot, entry.name, MANIFEST_NAME))
    .filter((manifestPath) => existsSync(manifestPath))
    .sort();

  const datasets = manifestPaths.map((manifestPath): VerifiedDataset => {
    const datasetDirectory = dirname(manifestPath);
    const directoryName = basename(datasetDirectory);
    let manifestInput: unknown;

    try {
      manifestInput = JSON.parse(readFileSync(manifestPath, "utf8")) as unknown;
    } catch {
      return failVerification(`Invalid governed storage manifest JSON in directory: ${directoryName}`);
    }

    const manifest = validateStorageManifest(manifestInput);
    if (manifest === null) {
      return failVerification(`Governed storage manifest validation failed: ${directoryName}`);
    }
    if (directoryName !== manifest.datasetVersion) {
      return failVerification(`Governed storage directory does not match datasetVersion: ${directoryName}`);
    }

    const governedPath = governedStoragePathForDatasetVersion(manifest.datasetVersion);
    if (governedPath !== `${GOVERNED_STORAGE_ROOT}/${directoryName}`) {
      return failVerification(`Governed storage path helper disagrees with dataset directory: ${directoryName}`);
    }

    const directoryEntries = readdirSync(datasetDirectory, { withFileTypes: true });
    const allowedNames = new Set([MANIFEST_NAME, ...manifest.files.map((file) => file.declaredName)]);
    const unexpectedNames = directoryEntries
      .map((entry) => entry.name)
      .filter((name) => !allowedNames.has(name))
      .sort();
    if (unexpectedNames.length > 0) {
      return failVerification(
        `Unexpected governed storage entries in ${directoryName}: ${unexpectedNames.join(", ")}`
      );
    }

    for (const file of manifest.files) {
      const directoryEntry = directoryEntries.find((entry) => entry.name === file.declaredName);
      if (directoryEntry?.isFile() !== true) {
        return failVerification(
          `Declared governed storage file is missing or not regular: ${directoryName}/${file.declaredName}`
        );
      }

      const rawBytes = readFileSync(join(datasetDirectory, file.declaredName));
      if (!verifyStoredFileBytes(file, rawBytes)) {
        return failVerification(
          `Stored file failed SHA-256 or byte-length verification: ${directoryName}/${file.declaredName}`
        );
      }
    }

    const eligible = isEligibleForUse(manifest);
    if (eligible !== !manifest.revoked) {
      return failVerification(`Governed storage eligibility disagrees with revoked: ${directoryName}`);
    }

    return {
      datasetVersion: manifest.datasetVersion,
      fileCount: manifest.files.length,
      revoked: manifest.revoked,
      eligible
    };
  });

  return {
    datasetCount: datasets.length,
    datasets,
    note: datasets.length === 0 ? "zero governed datasets (no manifests)" : `${datasets.length} governed dataset(s)`
  };
}

function createSyntheticManifest(datasetVersion: string, revoked: boolean): StorageManifest {
  const file: StorageFileEntry = {
    declaredName: "synthetic.csv",
    sha256: createHash("sha256").update(SYNTHETIC_BYTES).digest("hex"),
    bytes: SYNTHETIC_BYTES.byteLength
  };
  const digest = computeDatasetDigest([file]);

  return {
    schema: STORAGE_MANIFEST_SCHEMA,
    datasetVersion,
    approvalRef: {
      rdlId: "DEMO-RDL",
      approvalWording: `INTAKE-APPROVE ${datasetVersion} ${digest.slice(0, 7)}`
    },
    sourceRegisterRefs: ["synthetic://governed-store-test"],
    effectiveFrom: "2099-01-01",
    effectiveTo: "2099-12-31",
    files: [file],
    revoked
  };
}

function writeSyntheticDataset(
  storageRoot: string,
  datasetVersion: string,
  options: {
    readonly revoked?: boolean;
    readonly storedBytes?: Uint8Array;
    readonly extraFileName?: string;
  } = {}
): void {
  const datasetDirectory = join(storageRoot, datasetVersion);
  const manifest = createSyntheticManifest(datasetVersion, options.revoked ?? false);
  mkdirSync(datasetDirectory, { recursive: true });
  writeFileSync(join(datasetDirectory, MANIFEST_NAME), JSON.stringify(manifest));
  writeFileSync(join(datasetDirectory, manifest.files[0].declaredName), options.storedBytes ?? SYNTHETIC_BYTES);
  if (options.extraFileName !== undefined) {
    writeFileSync(join(datasetDirectory, options.extraFileName), "DEMO unexpected fixture\n");
  }
}

function withTemporaryDirectory<T>(run: (directory: string) => T): T {
  const directory = mkdtempSync(join(tmpdir(), "nhi-governed-store-test-"));
  try {
    return run(directory);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

describe("repository governed storage", () => {
  it("validates every stored manifest, path, declared file, directory entry, and eligibility state", () => {
    const summary = verifyGovernedStore(REPOSITORY_GOVERNED_ROOT);

    expect(summary.datasets).toContainEqual({
      datasetVersion: CURRENT_DATASET_VERSION,
      fileCount: 4,
      revoked: false,
      eligible: true
    });
  });

  it("passes explicitly and reports zero datasets when the storage root or manifests are absent", () => {
    withTemporaryDirectory((emptyRoot) => {
      expect(verifyGovernedStore(join(emptyRoot, "absent"))).toEqual({
        datasetCount: 0,
        datasets: [],
        note: "zero governed datasets (storage root absent)"
      });
      expect(verifyGovernedStore(emptyRoot)).toEqual({
        datasetCount: 0,
        datasets: [],
        note: "zero governed datasets (no manifests)"
      });
    });
  });

  it("rejects a stored file whose bytes do not match the manifest hash", () => {
    withTemporaryDirectory((storageRoot) => {
      const changedBytes = new Uint8Array(SYNTHETIC_BYTES);
      changedBytes[changedBytes.length - 2] ^= 1;
      writeSyntheticDataset(storageRoot, "demo-hash-mismatch", { storedBytes: changedBytes });

      expect(() => verifyGovernedStore(storageRoot)).toThrow(/failed SHA-256 or byte-length verification/u);
    });
  });

  it("rejects an undeclared extra file in a governed dataset directory", () => {
    withTemporaryDirectory((storageRoot) => {
      writeSyntheticDataset(storageRoot, "demo-extra-file", { extraFileName: "unexpected.txt" });

      expect(() => verifyGovernedStore(storageRoot)).toThrow(/Unexpected governed storage entries/u);
    });
  });

  it("accepts a valid revoked manifest while keeping the dataset ineligible", () => {
    withTemporaryDirectory((storageRoot) => {
      writeSyntheticDataset(storageRoot, "demo-revoked", { revoked: true });

      expect(verifyGovernedStore(storageRoot).datasets).toEqual([
        {
          datasetVersion: "demo-revoked",
          fileCount: 1,
          revoked: true,
          eligible: false
        }
      ]);
    });
  });
});
