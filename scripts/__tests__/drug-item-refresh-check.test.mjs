import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { computeDatasetDigest } from "../../packages/source-intake/src/storage.ts";
import {
  RefreshCheckError,
  checkDrugItemRefresh,
} from "../drug-item-refresh-check.mjs";
import {
  RefreshMaterializeError,
  materializeRefreshMetadata,
} from "../drug-item-refresh-materialize.mjs";
import { EXPECTED_SOURCE_HEADERS } from "../drug-item-subset-derive.mjs";

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

function encodeCsvField(value) {
  return /[",\r\n]/u.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

function csvBytes(rows, { bom = false } = {}) {
  const body = `${[EXPECTED_SOURCE_HEADERS, ...rows]
    .map((row) => row.map(encodeCsvField).join(","))
    .join("\n")}\n`;
  return Buffer.from(`${bom ? "\uFEFF" : ""}${body}`, "utf8");
}

function syntheticRow({ item, pricePeriod, startDate, endDate, chapter }) {
  const values = {
    異動: "",
    藥品代號: item,
    藥品英文名稱: "SYNTHETIC_TEST_ONLY_NAME",
    藥品中文名稱: "SYNTHETIC_TEST_ONLY_NAME",
    成分: "SYNTHETIC_TEST_ONLY_COMPONENT",
    規格量: "SYNTHETIC_TEST_ONLY_AMOUNT",
    規格單位: "SYNTHETIC_TEST_ONLY_UNIT",
    單複方: "SYNTHETIC_TEST_ONLY_KIND",
    支付價: pricePeriod,
    有效起日: startDate,
    有效迄日: endDate,
    藥商: "SYNTHETIC_TEST_ONLY_VENDOR",
    製造廠名稱: "SYNTHETIC_TEST_ONLY_FACTORY",
    劑型: "SYNTHETIC_TEST_ONLY_FORM",
    藥品分類: "SYNTHETIC_TEST_ONLY_CLASS",
    分類分組名稱: "SYNTHETIC_TEST_ONLY_GROUP",
    ATC代碼: "SYNTHETIC_TEST_ONLY_ATC",
    給付規定章節: chapter,
    藥品代碼超連結: "synthetic://item",
    給付規定章節連結: "synthetic://chapter",
  };
  return EXPECTED_SOURCE_HEADERS.map((header) => values[header]);
}

function createTemporaryDirectory() {
  mkdirSync(scratchpadRoot, { recursive: true });
  const directory = mkdtempSync(path.join(scratchpadRoot, "drug-item-refresh-test-"));
  temporaryDirectories.push(directory);
  return directory;
}

function buildRegistry({ sourceBytes, sourceRows, subsetBytes, subsetRows }) {
  const subsetSha256 = sha256(subsetBytes);
  return {
    schema: "source-registry/v1",
    endpoint: "https://synthetic.invalid/source.csv",
    datasetPlatformId: "23715",
    license: "政府資料開放授權條款-第1版",
    current: {
      datasetVersion: "nhi-drug-items-2026-08-06-r1",
      sourceSha256: sha256(sourceBytes),
      sourceBytes: sourceBytes.length,
      sourceDataRows: sourceRows,
      subsetSha256,
      subsetRows,
      datasetDigest: computeDatasetDigest([
        {
          declaredName: "drug-items-lipid.csv",
          sha256: subsetSha256,
          bytes: subsetBytes.length,
        },
      ]),
      fetchedAt: "2026-08-06",
    },
  };
}

function listFiles(directory) {
  if (!existsSync(directory)) {
    return [];
  }
  const files = [];
  const visit = (candidate) => {
    for (const entry of readdirSync(candidate, { withFileTypes: true })) {
      const entryPath = path.join(candidate, entry.name);
      if (entry.isDirectory()) {
        visit(entryPath);
      } else {
        files.push(path.relative(directory, entryPath));
      }
    }
  };
  visit(directory);
  return files.sort();
}

function responseWith(bytes, status = 200) {
  return async () => new Response(bytes, { status });
}

function setupChangedFixture() {
  const directory = createTemporaryDirectory();
  const currentRows = [
    syntheticRow({
      item: "SYNTHETIC_TEST_ONLY_ITEM_A",
      pricePeriod: "SYNTHETIC_TEST_ONLY_PERIOD_1",
      startDate: "20260101",
      endDate: "20260131",
      chapter: "2.6.1.",
    }),
    syntheticRow({
      item: "SYNTHETIC_TEST_ONLY_ITEM_B",
      pricePeriod: "SYNTHETIC_TEST_ONLY_PERIOD_1",
      startDate: "20260101",
      endDate: "20260131",
      chapter: "2.6.2.",
    }),
  ];
  const candidateSelectedRows = [
    currentRows[0],
    syntheticRow({
      item: "SYNTHETIC_TEST_ONLY_ITEM_A",
      pricePeriod: "SYNTHETIC_TEST_ONLY_PERIOD_2",
      startDate: "20260201",
      endDate: "20260228",
      chapter: "2.6.3.",
    }),
    syntheticRow({
      item: "SYNTHETIC_TEST_ONLY_ITEM_C",
      pricePeriod: "SYNTHETIC_TEST_ONLY_PERIOD_1",
      startDate: "20260101",
      endDate: "20260131",
      chapter: "2.6.2.",
    }),
  ];
  const ignoredRow = syntheticRow({
    item: "SYNTHETIC_TEST_ONLY_IGNORED",
    pricePeriod: "SYNTHETIC_TEST_ONLY_PERIOD_1",
    startDate: "20260101",
    endDate: "20260131",
    chapter: "8.2.6.1.",
  });
  const currentSourceBytes = csvBytes(currentRows, { bom: true });
  const currentSubsetBytes = csvBytes(currentRows);
  const candidateSourceBytes = csvBytes([...candidateSelectedRows, ignoredRow], { bom: true });
  const registry = buildRegistry({
    sourceBytes: currentSourceBytes,
    sourceRows: currentRows.length,
    subsetBytes: currentSubsetBytes,
    subsetRows: currentRows.length,
  });
  const registryPath = path.join(directory, "registry.json");
  const currentSubsetPath = path.join(directory, "current-subset.csv");
  const artifactPath = path.join(directory, "artifact", "candidate-subset.csv");
  const refreshScratchRoot = path.join(directory, "scratch");
  writeFileSync(registryPath, `${JSON.stringify(registry, null, 2)}\n`);
  writeFileSync(currentSubsetPath, currentSubsetBytes);
  return {
    directory,
    registry,
    registryPath,
    currentSubsetPath,
    artifactPath,
    refreshScratchRoot,
    candidateSourceBytes,
    candidateSelectedRows,
  };
}

afterEach(() => {
  while (temporaryDirectories.length > 0) {
    rmSync(temporaryDirectories.pop(), { recursive: true, force: true });
  }
});

describe("drug item monthly refresh checker", () => {
  it("returns changed false and leaves zero output files when the source hash is unchanged", async () => {
    const directory = createTemporaryDirectory();
    const row = syntheticRow({
      item: "SYNTHETIC_TEST_ONLY_ITEM_A",
      pricePeriod: "SYNTHETIC_TEST_ONLY_PERIOD_1",
      startDate: "20260101",
      endDate: "20260131",
      chapter: "2.6.1.",
    });
    const sourceBytes = csvBytes([row], { bom: true });
    const subsetBytes = csvBytes([row]);
    const registryPath = path.join(directory, "registry.json");
    writeFileSync(
      registryPath,
      `${JSON.stringify(
        buildRegistry({ sourceBytes, sourceRows: 1, subsetBytes, subsetRows: 1 }),
        null,
        2,
      )}\n`,
    );
    const filesBefore = listFiles(directory);
    const artifactPath = path.join(directory, "artifact", "candidate.csv");
    const result = await checkDrugItemRefresh({
      registryPath,
      currentSubsetPath: path.join(directory, "not-needed.csv"),
      artifactPath,
      scratchRoot: path.join(directory, "scratch"),
      fetchedAt: "2026-08-07",
      fetchImpl: responseWith(sourceBytes),
    });

    expect(result).toMatchObject({ changed: false, source: { dataRows: 1 } });
    expect(existsSync(artifactPath)).toBe(false);
    expect(listFiles(directory)).toEqual(filesBefore);
  });

  it("derives a write-once artifact and reports exact changed-subset statistics", async () => {
    const fixture = setupChangedFixture();
    const result = await checkDrugItemRefresh({
      registryPath: fixture.registryPath,
      currentSubsetPath: fixture.currentSubsetPath,
      artifactPath: fixture.artifactPath,
      scratchRoot: fixture.refreshScratchRoot,
      fetchedAt: "2026-08-07",
      fetchImpl: responseWith(fixture.candidateSourceBytes),
    });

    expect(result).toMatchObject({
      changed: true,
      datasetVersion: "nhi-drug-items-2026-08-07-r1",
      source: { dataRows: 4, fields: 20 },
      subset: { dataRows: 3, distinctItems: 2 },
      differences: {
        addedItems: 1,
        removedItems: 1,
        addedPricePeriods: 2,
        chapterAssignmentChangedItems: 1,
        schemaSame: true,
      },
    });
    const artifactBytes = readFileSync(fixture.artifactPath);
    expect(artifactBytes.equals(csvBytes(fixture.candidateSelectedRows))).toBe(true);
    expect(result.subset.sha256).toBe(sha256(artifactBytes));
    expect(result.datasetDigest).toBe(
      computeDatasetDigest([
        {
          declaredName: "drug-items-lipid.csv",
          sha256: result.subset.sha256,
          bytes: artifactBytes.length,
        },
      ]),
    );
    expect(listFiles(fixture.refreshScratchRoot)).toEqual([]);
  });

  it("fails closed on a non-200 response and leaves no artifact", async () => {
    const fixture = setupChangedFixture();
    await expect(
      checkDrugItemRefresh({
        registryPath: fixture.registryPath,
        currentSubsetPath: fixture.currentSubsetPath,
        artifactPath: fixture.artifactPath,
        scratchRoot: fixture.refreshScratchRoot,
        fetchedAt: "2026-08-07",
        fetchImpl: responseWith(Buffer.from("unavailable"), 503),
      }),
    ).rejects.toMatchObject({ code: "fetch_http_error", details: { status: 503 } });
    expect(existsSync(fixture.artifactPath)).toBe(false);
    expect(listFiles(fixture.refreshScratchRoot)).toEqual([]);
  });

  it("fails closed on a changed source schema and leaves no artifact", async () => {
    const fixture = setupChangedFixture();
    const malformedBytes = Buffer.from("\uFEFFunexpected\nSYNTHETIC_TEST_ONLY\n", "utf8");
    await expect(
      checkDrugItemRefresh({
        registryPath: fixture.registryPath,
        currentSubsetPath: fixture.currentSubsetPath,
        artifactPath: fixture.artifactPath,
        scratchRoot: fixture.refreshScratchRoot,
        fetchedAt: "2026-08-07",
        fetchImpl: responseWith(malformedBytes),
      }),
    ).rejects.toMatchObject({ code: "schema_error" });
    expect(existsSync(fixture.artifactPath)).toBe(false);
    expect(listFiles(fixture.refreshScratchRoot)).toEqual([]);
  });

  it("refuses to overwrite a previously created candidate artifact", async () => {
    const fixture = setupChangedFixture();
    const options = {
      registryPath: fixture.registryPath,
      currentSubsetPath: fixture.currentSubsetPath,
      artifactPath: fixture.artifactPath,
      scratchRoot: fixture.refreshScratchRoot,
      fetchedAt: "2026-08-07",
      fetchImpl: responseWith(fixture.candidateSourceBytes),
    };
    await checkDrugItemRefresh(options);
    const firstBytes = readFileSync(fixture.artifactPath);
    await expect(checkDrugItemRefresh(options)).rejects.toBeInstanceOf(RefreshCheckError);
    expect(readFileSync(fixture.artifactPath).equals(firstBytes)).toBe(true);
  });
});

describe("refresh metadata materialization", () => {
  it("preserves registry current and writes a count-only report after the artifact exists", async () => {
    const fixture = setupChangedFixture();
    const result = await checkDrugItemRefresh({
      registryPath: fixture.registryPath,
      currentSubsetPath: fixture.currentSubsetPath,
      artifactPath: fixture.artifactPath,
      scratchRoot: fixture.refreshScratchRoot,
      fetchedAt: "2026-08-07",
      fetchImpl: responseWith(fixture.candidateSourceBytes),
    });
    const humanRegisterPath = path.join(fixture.directory, "register.md");
    const reportDirectory = path.join(fixture.directory, "reports");
    writeFileSync(humanRegisterPath, "# Synthetic register\n");
    mkdirSync(reportDirectory);

    const output = materializeRefreshMetadata({
      result,
      registryPath: fixture.registryPath,
      humanRegisterPath,
      reportDirectory,
    });
    const nextRegistry = JSON.parse(readFileSync(fixture.registryPath, "utf8"));
    const report = readFileSync(output.reportPath, "utf8");

    expect(nextRegistry.current).toEqual(fixture.registry.current);
    expect(nextRegistry.pending.differences).toEqual(result.differences);
    expect(output).toMatchObject({
      approvalWording: `INTAKE-APPROVE ${result.datasetVersion} ${result.datasetDigest.slice(0, 7)}`,
      registryCurrentUnchanged: true,
    });
    expect(report).toContain("| 新增品項數 | 1 |");
    expect(report).toContain("| 價格期別新增數 | 2 |");
    for (const forbiddenValue of [
      "SYNTHETIC_TEST_ONLY_ITEM_A",
      "SYNTHETIC_TEST_ONLY_NAME",
      "SYNTHETIC_TEST_ONLY_PERIOD_1",
    ]) {
      expect(report).not.toContain(forbiddenValue);
    }
    expect(() =>
      materializeRefreshMetadata({
        result,
        registryPath: fixture.registryPath,
        humanRegisterPath,
        reportDirectory,
      }),
    ).toThrow(RefreshMaterializeError);
  });
});
