import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { computeDatasetDigest } from "../../packages/source-intake/src/storage.ts";
import {
  ATTACHMENT_DATASET_VERSION,
  ATTACHMENT_DECLARED_NAMES,
  EXPECTED_SOURCE_HEADERS,
  deriveSubsetFile,
} from "../drug-item-subset-derive.mjs";

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
);
const scratchpadRoot = path.join(repositoryRoot, "scratchpad");
const temporaryDirectories = [];

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function createSyntheticSource(code) {
  const values = Object.fromEntries(EXPECTED_SOURCE_HEADERS.map((header) => [header, ""]));
  values["藥品代號"] = code;
  const row = EXPECTED_SOURCE_HEADERS.map((header) => values[header]);
  return Buffer.from(
    `\uFEFF${EXPECTED_SOURCE_HEADERS.join(",")}\n${row.join(",")}\n`,
    "utf8",
  );
}

function createFixture(sourceCode) {
  mkdirSync(scratchpadRoot, { recursive: true });
  const directory = mkdtempSync(path.join(scratchpadRoot, "drug-item-attachment-test-"));
  temporaryDirectories.push(directory);

  const attachmentCode = "SYNTHETIC_TEST_ONLY_ATTACHED";
  const entries = ATTACHMENT_DECLARED_NAMES.map((declaredName, index) => {
    const bytes = Buffer.from(
      index === 0 ? `nhi_code\n${attachmentCode}\n` : "nhi_code\n",
      "utf8",
    );
    writeFileSync(path.join(directory, declaredName), bytes);
    return { declaredName, sha256: sha256(bytes), bytes: bytes.length };
  });
  const datasetDigest = computeDatasetDigest(entries);
  const manifestPath = path.join(directory, "storage-manifest.json");
  writeFileSync(
    manifestPath,
    `${JSON.stringify(
      {
        schema: "storage-manifest/v1",
        datasetVersion: ATTACHMENT_DATASET_VERSION,
        approvalRef: {
          rdlId: "SYNTHETIC_TEST_ONLY",
          approvalWording: `INTAKE-APPROVE ${ATTACHMENT_DATASET_VERSION} ${datasetDigest.slice(0, 7)}`,
        },
        sourceRegisterRefs: ["SYNTHETIC_TEST_ONLY"],
        effectiveFrom: "2026-09-01",
        effectiveTo: "9999-12-31",
        files: entries,
        revoked: false,
      },
      null,
      2,
    )}\n`,
  );

  const sourceBytes = createSyntheticSource(sourceCode);
  const sourcePath = path.join(directory, "source.csv");
  const outputPath = path.join(directory, "subset.csv");
  writeFileSync(sourcePath, sourceBytes);
  return {
    attachmentCode,
    directory,
    manifestPath,
    outputPath,
    sourceBytes,
    sourcePath,
  };
}

async function deriveFixture(fixture) {
  return deriveSubsetFile({
    inputPath: fixture.sourcePath,
    derivedPath: fixture.outputPath,
    expectedSha256: sha256(fixture.sourceBytes),
    expectedHeaders: EXPECTED_SOURCE_HEADERS,
    expectedDataRows: 1,
    attachmentManifestPath: fixture.manifestPath,
    attachmentDirectory: fixture.directory,
  });
}

afterEach(() => {
  while (temporaryDirectories.length > 0) {
    rmSync(temporaryDirectories.pop(), { recursive: true, force: true });
  }
});

describe("drug-item attachment-code inclusion criterion", () => {
  it("includes an attached code whose chapter field is empty", async () => {
    const fixture = createFixture("SYNTHETIC_TEST_ONLY_ATTACHED");
    const result = await deriveFixture(fixture);

    expect(result).toMatchObject({
      subset: { dataRows: 1 },
      statistics: {
        chapterCriterionRows: 0,
        attachmentOnlyRows: 1,
        distinctCodeCount: 1,
      },
      roundTrip: { counterexampleRows: 0 },
    });
  });

  it("excludes an unattached code whose chapter field is empty", async () => {
    const fixture = createFixture("SYNTHETIC_TEST_ONLY_UNATTACHED");
    const result = await deriveFixture(fixture);

    expect(result).toMatchObject({
      subset: { dataRows: 0 },
      statistics: {
        chapterCriterionRows: 0,
        attachmentOnlyRows: 0,
        distinctCodeCount: 0,
      },
      roundTrip: { counterexampleRows: 0 },
    });
  });

  it("fails closed with zero output when an attachment hash mismatches its manifest", async () => {
    const fixture = createFixture("SYNTHETIC_TEST_ONLY_ATTACHED");
    writeFileSync(
      path.join(fixture.directory, ATTACHMENT_DECLARED_NAMES[0]),
      "nhi_code\nSYNTHETIC_TEST_ONLY_TAMPERED\n",
    );

    await expect(deriveFixture(fixture)).rejects.toMatchObject({
      code: "attachment_hash_mismatch",
    });
    expect(existsSync(fixture.outputPath)).toBe(false);
  });
});
