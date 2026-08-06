#!/usr/bin/env node

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { computeDatasetDigest } from "../packages/source-intake/src/storage.ts";

const SHA256_HEX = /^[a-f0-9]{64}$/u;
const SAFE_DATASET_VERSION = /^nhi-drug-items-\d{4}-\d{2}-\d{2}-r[1-9]\d*$/u;
const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, "..");
const defaultRegistryPath = path.join(
  repositoryRoot,
  "docs",
  "source-register",
  "drug-item-master.registry.json",
);
const defaultHumanRegisterPath = path.join(
  repositoryRoot,
  "docs",
  "source-register",
  "nhi-drug-item-master-20260806.md",
);
const defaultReportDirectory = path.join(repositoryRoot, "docs", "stage3");

export class RefreshMaterializeError extends Error {
  constructor(code) {
    super(code);
    this.name = "RefreshMaterializeError";
    this.code = code;
  }
}

function fail(code) {
  throw new RefreshMaterializeError(code);
}

function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonNegativeInteger(value) {
  return Number.isSafeInteger(value) && value >= 0;
}

function validateResult(result) {
  if (
    !isPlainObject(result) ||
    result.changed !== true ||
    !/^\d{4}-\d{2}-\d{2}$/u.test(result.fetchedAt) ||
    !SAFE_DATASET_VERSION.test(result.datasetVersion) ||
    !isPlainObject(result.source) ||
    !SHA256_HEX.test(result.source.sha256) ||
    !isNonNegativeInteger(result.source.bytes) ||
    !isNonNegativeInteger(result.source.dataRows) ||
    result.source.fields !== 20 ||
    !isPlainObject(result.subset) ||
    !SHA256_HEX.test(result.subset.sha256) ||
    !isNonNegativeInteger(result.subset.bytes) ||
    !isNonNegativeInteger(result.subset.dataRows) ||
    !isNonNegativeInteger(result.subset.distinctItems) ||
    !SHA256_HEX.test(result.datasetDigest) ||
    !isPlainObject(result.differences) ||
    !isNonNegativeInteger(result.differences.addedItems) ||
    !isNonNegativeInteger(result.differences.removedItems) ||
    !isNonNegativeInteger(result.differences.addedPricePeriods) ||
    !isNonNegativeInteger(result.differences.chapterAssignmentChangedItems) ||
    result.differences.schemaSame !== true ||
    !isPlainObject(result.artifact) ||
    typeof result.artifact.name !== "string" ||
    result.artifact.name !== `${result.datasetVersion}-drug-items-lipid.csv` ||
    result.datasetVersion !== `nhi-drug-items-${result.fetchedAt}-r1`
  ) {
    fail("result_error");
  }
  const recomputedDigest = computeDatasetDigest([
    {
      declaredName: "drug-items-lipid.csv",
      sha256: result.subset.sha256,
      bytes: result.subset.bytes,
    },
  ]);
  if (recomputedDigest !== result.datasetDigest) {
    fail("result_digest_mismatch");
  }
  return result;
}

function readRegistry(registryPath) {
  try {
    const registry = JSON.parse(readFileSync(registryPath, "utf8"));
    if (!isPlainObject(registry) || registry.schema !== "source-registry/v1" || !isPlainObject(registry.current)) {
      fail("registry_error");
    }
    return registry;
  } catch (error) {
    if (error instanceof RefreshMaterializeError) {
      throw error;
    }
    fail("registry_error");
  }
}

function buildPending(result) {
  return {
    datasetVersion: result.datasetVersion,
    sourceSha256: result.source.sha256,
    sourceBytes: result.source.bytes,
    sourceDataRows: result.source.dataRows,
    subsetSha256: result.subset.sha256,
    subsetRows: result.subset.dataRows,
    datasetDigest: result.datasetDigest,
    fetchedAt: result.fetchedAt,
    differences: {
      addedItems: result.differences.addedItems,
      removedItems: result.differences.removedItems,
      addedPricePeriods: result.differences.addedPricePeriods,
      chapterAssignmentChangedItems: result.differences.chapterAssignmentChangedItems,
      schemaSame: result.differences.schemaSame,
    },
  };
}

function buildHumanAppendix(result, approvalWording) {
  return [
    "",
    `## 每月刷新待審（${result.fetchedAt}）`,
    "",
    "- 狀態：`PENDING_RA_APPROVAL`",
    `- 候選資料集版本：\`${result.datasetVersion}\``,
    `- 來源 SHA-256：\`${result.source.sha256}\``,
    `- 來源位元組數／資料列數：${result.source.bytes}／${result.source.dataRows}`,
    `- 子集 SHA-256／資料列數／相異品項數：\`${result.subset.sha256}\`／${result.subset.dataRows}／${result.subset.distinctItems}`,
    `- dataset digest：\`${result.datasetDigest}\``,
    `- 子集保存方式：GitHub Actions artifact \`${result.artifact.name}\`（90 天）；不進 repo`,
    "- `current` 狀態：未變更",
    `- 待 RA 核准語式：\`${approvalWording}\``,
    "",
  ].join("\n");
}

function buildCountOnlyReport(result) {
  return [
    `# 藥品品項主檔每月刷新 Stage 3 差異報告（${result.fetchedAt}）`,
    "",
    "## 邊界",
    "",
    "- 狀態：`PENDING_RA_APPROVAL`",
    "- 報告內容：metadata-only 計數與布林值",
    "- 子集內容寫入 repo：false",
    "- 自動核准／自動合併：false／false",
    "",
    "## 結構與規模計數",
    "",
    "| 項目 | 結果 |",
    "| --- | ---: |",
    `| 來源欄位數 | ${result.source.fields} |`,
    `| 來源資料列數 | ${result.source.dataRows} |`,
    `| 子集資料列數 | ${result.subset.dataRows} |`,
    `| 子集相異品項數 | ${result.subset.distinctItems} |`,
    `| 欄位結構相同 | ${String(result.differences.schemaSame)} |`,
    "",
    "## 與 current governed 子集之差異計數",
    "",
    "| 項目 | 結果 |",
    "| --- | ---: |",
    `| 新增品項數 | ${result.differences.addedItems} |`,
    `| 移除品項數 | ${result.differences.removedItems} |`,
    `| 價格期別新增數 | ${result.differences.addedPricePeriods} |`,
    `| 章節歸屬變動品項數 | ${result.differences.chapterAssignmentChangedItems} |`,
    "",
    "本報告不含任何品項代碼、品名、價格或子集內容。",
    "",
  ].join("\n");
}

export function materializeRefreshMetadata({
  result: resultInput,
  registryPath = defaultRegistryPath,
  humanRegisterPath = defaultHumanRegisterPath,
  reportDirectory = defaultReportDirectory,
} = {}) {
  const result = validateResult(resultInput);
  const registry = readRegistry(registryPath);
  if (Object.hasOwn(registry, "pending")) {
    fail("pending_exists");
  }
  const currentBefore = JSON.stringify(registry.current);
  const reportPath = path.join(
    reportDirectory,
    `drug-item-refresh-${result.fetchedAt}.md`,
  );
  if (existsSync(reportPath)) {
    fail("report_exists");
  }
  let humanRegister;
  try {
    humanRegister = readFileSync(humanRegisterPath, "utf8");
  } catch {
    fail("human_register_error");
  }

  const approvalWording = `INTAKE-APPROVE ${result.datasetVersion} ${result.datasetDigest.slice(0, 7)}`;
  const nextRegistry = { ...registry, pending: buildPending(result) };
  if (JSON.stringify(nextRegistry.current) !== currentBefore) {
    fail("current_modified");
  }
  const registryBytes = `${JSON.stringify(nextRegistry, null, 2)}\n`;
  const humanBytes = `${humanRegister.trimEnd()}\n${buildHumanAppendix(result, approvalWording)}`;
  const reportBytes = buildCountOnlyReport(result);

  try {
    writeFileSync(registryPath, registryBytes, "utf8");
    writeFileSync(humanRegisterPath, humanBytes, "utf8");
    writeFileSync(reportPath, reportBytes, { encoding: "utf8", flag: "wx" });
  } catch {
    fail("metadata_write_error");
  }

  return {
    reportPath,
    approvalWording,
    registryCurrentUnchanged: JSON.stringify(nextRegistry.current) === currentBefore,
  };
}

function parseArguments(argv) {
  const parsed = {
    registryPath: defaultRegistryPath,
    humanRegisterPath: defaultHumanRegisterPath,
    reportDirectory: defaultReportDirectory,
  };
  const flags = new Map([
    ["--registry", "registryPath"],
    ["--human-register", "humanRegisterPath"],
    ["--report-directory", "reportDirectory"],
  ]);
  const seen = new Set();
  for (let index = 0; index < argv.length; index += 2) {
    const flag = argv[index];
    const value = argv[index + 1];
    const property = flags.get(flag);
    if (property === undefined || value === undefined || value.startsWith("--") || seen.has(flag)) {
      fail("argument_error");
    }
    seen.add(flag);
    parsed[property] = path.resolve(value);
  }
  return parsed;
}

const invokedAsScript =
  process.argv[1] !== undefined &&
  pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;

if (invokedAsScript) {
  try {
    const resultInput = JSON.parse(process.env.REFRESH_RESULT_JSON ?? "");
    const output = materializeRefreshMetadata({
      ...parseArguments(process.argv.slice(2)),
      result: resultInput,
    });
    process.stdout.write(`${JSON.stringify(output)}\n`);
  } catch (error) {
    const safeError =
      error instanceof RefreshMaterializeError
        ? error
        : new RefreshMaterializeError("materialize_error");
    process.stderr.write(`${JSON.stringify({ ok: false, error: safeError.code })}\n`);
    process.exitCode = 1;
  }
}
