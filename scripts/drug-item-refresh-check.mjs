#!/usr/bin/env node

import { constants as fsConstants, copyFileSync, createReadStream, createWriteStream, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import process from "node:process";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import { computeDatasetDigest } from "../packages/source-intake/src/storage.ts";
import {
  DerivationError,
  EXPECTED_SOURCE_HEADERS,
  TARGET_CHAPTERS,
  deriveSubsetFromArguments,
  parseCsvFile,
} from "./drug-item-subset-derive.mjs";

const SHA256_HEX = /^[a-f0-9]{64}$/u;
const SAFE_DATASET_VERSION = /^nhi-drug-items-\d{4}-\d{2}-\d{2}-r[1-9]\d*$/u;
const SNAPSHOT_KEYS = new Set([
  "datasetVersion",
  "sourceSha256",
  "sourceBytes",
  "sourceDataRows",
  "subsetSha256",
  "subsetRows",
  "datasetDigest",
  "fetchedAt",
]);
const DIFFERENCE_KEYS = new Set([
  "addedItems",
  "removedItems",
  "addedPricePeriods",
  "chapterAssignmentChangedItems",
  "schemaSame",
]);
const SUBSET_DECLARED_NAME = "drug-items-lipid.csv";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, "..");
const defaultRegistryPath = path.join(
  repositoryRoot,
  "docs",
  "source-register",
  "drug-item-master.registry.json",
);
const defaultArtifactPath = path.join(
  repositoryRoot,
  "scratchpad",
  "drug-item-refresh",
  SUBSET_DECLARED_NAME,
);
const defaultScratchRoot = path.join(repositoryRoot, "scratchpad");

export class RefreshCheckError extends Error {
  constructor(code, details = {}) {
    super(code);
    this.name = "RefreshCheckError";
    this.code = code;
    this.details = details;
  }
}

function fail(code, details = {}) {
  throw new RefreshCheckError(code, details);
}

function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(value, expectedKeys) {
  return isPlainObject(value) &&
    Object.keys(value).length === expectedKeys.size &&
    Object.keys(value).every((key) => expectedKeys.has(key));
}

function isIsoDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/u.test(value)) {
    return false;
  }
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function validateSnapshot(snapshot, { pending = false } = {}) {
  if (!isPlainObject(snapshot)) {
    fail("registry_error");
  }
  const expectedKeys = pending ? new Set([...SNAPSHOT_KEYS, "differences"]) : SNAPSHOT_KEYS;
  if (!hasExactKeys(snapshot, expectedKeys)) {
    fail("registry_error");
  }
  if (
    !SAFE_DATASET_VERSION.test(snapshot.datasetVersion) ||
    !SHA256_HEX.test(snapshot.sourceSha256) ||
    !Number.isSafeInteger(snapshot.sourceBytes) ||
    snapshot.sourceBytes < 0 ||
    !Number.isSafeInteger(snapshot.sourceDataRows) ||
    snapshot.sourceDataRows < 0 ||
    !SHA256_HEX.test(snapshot.subsetSha256) ||
    !Number.isSafeInteger(snapshot.subsetRows) ||
    snapshot.subsetRows < 0 ||
    !SHA256_HEX.test(snapshot.datasetDigest) ||
    !isIsoDate(snapshot.fetchedAt)
  ) {
    fail("registry_error");
  }
  const recomputedDigest = computeDatasetDigest([
    {
      declaredName: SUBSET_DECLARED_NAME,
      sha256: snapshot.subsetSha256,
      bytes: 0,
    },
  ]);
  if (recomputedDigest !== snapshot.datasetDigest) {
    fail("registry_digest_mismatch");
  }
  if (pending) {
    if (!hasExactKeys(snapshot.differences, DIFFERENCE_KEYS)) {
      fail("registry_error");
    }
    for (const key of DIFFERENCE_KEYS) {
      const value = snapshot.differences[key];
      if (key === "schemaSame") {
        if (typeof value !== "boolean") {
          fail("registry_error");
        }
      } else if (!Number.isSafeInteger(value) || value < 0) {
        fail("registry_error");
      }
    }
  }
  return snapshot;
}

function readRegistry(registryPath) {
  let registry;
  try {
    registry = JSON.parse(readFileSync(registryPath, "utf8"));
  } catch {
    fail("registry_error");
  }
  const topLevelKeys = new Set(["schema", "endpoint", "datasetPlatformId", "license", "current"]);
  if (Object.hasOwn(registry, "pending")) {
    topLevelKeys.add("pending");
  }
  if (
    !hasExactKeys(registry, topLevelKeys) ||
    registry.schema !== "source-registry/v1" ||
    registry.datasetPlatformId !== "23715" ||
    registry.license !== "政府資料開放授權條款-第1版"
  ) {
    fail("registry_error");
  }
  try {
    const endpoint = new URL(registry.endpoint);
    if (endpoint.protocol !== "https:") {
      fail("registry_error");
    }
  } catch (error) {
    if (error instanceof RefreshCheckError) {
      throw error;
    }
    fail("registry_error");
  }
  validateSnapshot(registry.current);
  if (Object.hasOwn(registry, "pending")) {
    validateSnapshot(registry.pending, { pending: true });
  }
  return registry;
}

async function hashFile(filePath) {
  let fileStat;
  try {
    fileStat = statSync(filePath);
  } catch {
    fail("file_error");
  }
  if (!fileStat.isFile()) {
    fail("file_error");
  }

  const hash = createHash("sha256");
  const prefix = [];
  let bytes = 0;
  try {
    for await (const chunk of createReadStream(filePath)) {
      hash.update(chunk);
      bytes += chunk.byteLength;
      for (let index = 0; index < chunk.length && prefix.length < 3; index += 1) {
        prefix.push(chunk[index]);
      }
    }
  } catch {
    fail("file_error");
  }
  return {
    sha256: hash.digest("hex"),
    bytes,
    hasUtf8Bom: prefix.length === 3 && prefix[0] === 0xef && prefix[1] === 0xbb && prefix[2] === 0xbf,
  };
}

function arraysEqual(left, right) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

async function inspectCsv(filePath, { collectRows = false, requireUtf8Bom = false } = {}) {
  const file = await hashFile(filePath);
  if (requireUtf8Bom && !file.hasUtf8Bom) {
    fail("schema_error");
  }

  let headers;
  let dataRows = 0;
  const rows = [];
  await parseCsvFile(filePath, (row, csvRowNumber) => {
    if (csvRowNumber === 1) {
      headers = row;
      if (!arraysEqual(row, EXPECTED_SOURCE_HEADERS)) {
        throw new DerivationError("schema_error", { csvRowNumber });
      }
      return;
    }
    if (row.length !== EXPECTED_SOURCE_HEADERS.length) {
      throw new DerivationError("schema_error", { dataRowNumber: csvRowNumber - 1 });
    }
    dataRows += 1;
    if (collectRows) {
      rows.push(row);
    }
  });
  if (headers === undefined) {
    fail("schema_error");
  }
  return {
    ...file,
    headers,
    dataRows,
    rows,
  };
}

async function countSourceRows(filePath) {
  return inspectCsv(filePath, { requireUtf8Bom: true });
}

async function downloadSource(endpoint, destinationPath, fetchImpl) {
  let response;
  try {
    response = await fetchImpl(endpoint, {
      headers: { accept: "text/csv,application/octet-stream;q=0.9,*/*;q=0.1" },
      redirect: "follow",
      signal: AbortSignal.timeout(120_000),
    });
  } catch {
    fail("fetch_error");
  }
  if (!isPlainObject(response) && !(response instanceof Response)) {
    fail("fetch_error");
  }
  if (response.status !== 200) {
    fail("fetch_http_error", { status: response.status });
  }
  if (response.body === null) {
    fail("fetch_body_error");
  }
  try {
    await pipeline(
      Readable.fromWeb(response.body),
      createWriteStream(destinationPath, { flags: "wx" }),
    );
  } catch {
    fail("fetch_body_error");
  }
}

async function deriveWithLockedFlags({ sourcePath, sourceSha256, sourceDataRows, subsetPath }) {
  let result;
  try {
    result = await deriveSubsetFromArguments([
      "--source",
      sourcePath,
      "--expect-sha256",
      sourceSha256,
      "--expect-rows",
      String(sourceDataRows),
      "--out",
      subsetPath,
    ]);
  } catch (error) {
    if (error instanceof DerivationError) {
      throw error;
    }
    fail("derivation_error");
  }
  if (
    !isPlainObject(result) ||
    result.mode !== "write-once" ||
    !isPlainObject(result.source) ||
    result.source.sha256 !== sourceSha256 ||
    result.source.dataRows !== sourceDataRows ||
    !isPlainObject(result.subset)
  ) {
    fail("derivation_error");
  }
  return result;
}

function setDifferenceSize(left, right) {
  let count = 0;
  for (const value of left) {
    if (!right.has(value)) {
      count += 1;
    }
  }
  return count;
}

function setEqual(left, right) {
  return left.size === right.size && [...left].every((value) => right.has(value));
}

function collectComparisonFacts(rows) {
  const indexes = {
    code: EXPECTED_SOURCE_HEADERS.indexOf("藥品代號"),
    price: EXPECTED_SOURCE_HEADERS.indexOf("支付價"),
    startDate: EXPECTED_SOURCE_HEADERS.indexOf("有效起日"),
    endDate: EXPECTED_SOURCE_HEADERS.indexOf("有效迄日"),
    chapter: EXPECTED_SOURCE_HEADERS.indexOf("給付規定章節"),
  };
  const itemCodes = new Set();
  const pricePeriods = new Set();
  const chaptersByItem = new Map();
  for (const row of rows) {
    const code = row[indexes.code];
    itemCodes.add(code);
    pricePeriods.add(
      JSON.stringify([
        code,
        row[indexes.price],
        row[indexes.startDate],
        row[indexes.endDate],
      ]),
    );
    let chapterSet = chaptersByItem.get(code);
    if (chapterSet === undefined) {
      chapterSet = new Set();
      chaptersByItem.set(code, chapterSet);
    }
    const tokens = String(row[indexes.chapter] ?? "")
      .split(",")
      .map((token) => token.trim());
    for (const chapter of TARGET_CHAPTERS) {
      if (tokens.includes(chapter)) {
        chapterSet.add(chapter);
      }
    }
  }
  return { itemCodes, pricePeriods, chaptersByItem };
}

function compareSubsets(currentRows, candidateRows) {
  const current = collectComparisonFacts(currentRows);
  const candidate = collectComparisonFacts(candidateRows);
  let chapterAssignmentChangedItems = 0;
  for (const code of candidate.itemCodes) {
    if (
      current.itemCodes.has(code) &&
      !setEqual(current.chaptersByItem.get(code), candidate.chaptersByItem.get(code))
    ) {
      chapterAssignmentChangedItems += 1;
    }
  }
  return {
    addedItems: setDifferenceSize(candidate.itemCodes, current.itemCodes),
    removedItems: setDifferenceSize(current.itemCodes, candidate.itemCodes),
    addedPricePeriods: setDifferenceSize(candidate.pricePeriods, current.pricePeriods),
    chapterAssignmentChangedItems,
    schemaSame: true,
  };
}

function resolveFetchedAt(value) {
  const fetchedAt = value ?? new Date().toISOString().slice(0, 10);
  if (!isIsoDate(fetchedAt)) {
    fail("argument_error");
  }
  return fetchedAt;
}

export async function checkDrugItemRefresh({
  registryPath = defaultRegistryPath,
  currentSubsetPath,
  artifactPath = defaultArtifactPath,
  scratchRoot = defaultScratchRoot,
  fetchedAt,
  fetchImpl = globalThis.fetch,
} = {}) {
  if (typeof fetchImpl !== "function") {
    fail("fetch_error");
  }
  const registry = readRegistry(registryPath);
  const date = resolveFetchedAt(fetchedAt);
  const currentSubsetPathToUse =
    currentSubsetPath ??
    path.join(
      repositoryRoot,
      "data",
      "governed",
      registry.current.datasetVersion,
      SUBSET_DECLARED_NAME,
    );
  mkdirSync(scratchRoot, { recursive: true });
  const temporaryDirectory = mkdtempSync(path.join(scratchRoot, ".drug-item-refresh-"));
  const downloadedSourcePath = path.join(temporaryDirectory, "source.csv");
  const temporarySubsetPath = path.join(temporaryDirectory, SUBSET_DECLARED_NAME);

  try {
    await downloadSource(registry.endpoint, downloadedSourcePath, fetchImpl);
    const source = await countSourceRows(downloadedSourcePath);
    if (source.sha256 === registry.current.sourceSha256) {
      if (
        source.bytes !== registry.current.sourceBytes ||
        source.dataRows !== registry.current.sourceDataRows
      ) {
        fail("registry_current_mismatch");
      }
      return {
        changed: false,
        currentDatasetVersion: registry.current.datasetVersion,
        source: {
          sha256: source.sha256,
          bytes: source.bytes,
          dataRows: source.dataRows,
          fields: source.headers.length,
        },
      };
    }

    const derivation = await deriveWithLockedFlags({
      sourcePath: downloadedSourcePath,
      sourceSha256: source.sha256,
      sourceDataRows: source.dataRows,
      subsetPath: temporarySubsetPath,
    });
    const currentSubset = await inspectCsv(currentSubsetPathToUse, { collectRows: true });
    if (
      currentSubset.sha256 !== registry.current.subsetSha256 ||
      currentSubset.dataRows !== registry.current.subsetRows
    ) {
      fail("current_subset_mismatch");
    }
    const candidateSubset = await inspectCsv(temporarySubsetPath, { collectRows: true });
    if (
      candidateSubset.sha256 !== derivation.subset.sha256 ||
      candidateSubset.bytes !== derivation.subset.bytes ||
      candidateSubset.dataRows !== derivation.subset.dataRows
    ) {
      fail("derivation_error");
    }

    const datasetDigest = computeDatasetDigest([
      {
        declaredName: SUBSET_DECLARED_NAME,
        sha256: candidateSubset.sha256,
        bytes: candidateSubset.bytes,
      },
    ]);
    const differences = compareSubsets(currentSubset.rows, candidateSubset.rows);
    const datasetVersion = `nhi-drug-items-${date}-r1`;
    const result = {
      changed: true,
      fetchedAt: date,
      datasetVersion,
      source: {
        sha256: source.sha256,
        bytes: source.bytes,
        dataRows: source.dataRows,
        fields: source.headers.length,
      },
      subset: {
        sha256: candidateSubset.sha256,
        bytes: candidateSubset.bytes,
        dataRows: candidateSubset.dataRows,
        distinctItems: derivation.statistics.distinctCodeCount,
      },
      datasetDigest,
      differences,
      artifact: {
        name: `${datasetVersion}-${SUBSET_DECLARED_NAME}`,
        path: artifactPath,
      },
    };

    if (existsSync(artifactPath)) {
      fail("output_exists");
    }
    mkdirSync(path.dirname(artifactPath), { recursive: true });
    let artifactCreated = false;
    try {
      copyFileSync(temporarySubsetPath, artifactPath, fsConstants.COPYFILE_EXCL);
      artifactCreated = true;
      const copied = await hashFile(artifactPath);
      if (copied.sha256 !== candidateSubset.sha256 || copied.bytes !== candidateSubset.bytes) {
        fail("output_verification_error");
      }
    } catch (error) {
      if (artifactCreated) {
        rmSync(artifactPath, { force: true });
      }
      if (error instanceof RefreshCheckError) {
        throw error;
      }
      if (isPlainObject(error) && error.code === "EEXIST") {
        fail("output_exists");
      }
      fail("output_write_error");
    }
    return result;
  } catch (error) {
    if (error instanceof RefreshCheckError || error instanceof DerivationError) {
      throw error;
    }
    fail("refresh_check_error");
  } finally {
    rmSync(temporaryDirectory, { recursive: true, force: true });
  }
}

function parseArguments(argv) {
  const parsed = {
    registryPath: defaultRegistryPath,
    currentSubsetPath: undefined,
    artifactPath: defaultArtifactPath,
    scratchRoot: defaultScratchRoot,
    fetchedAt: undefined,
  };
  const flags = new Map([
    ["--registry", "registryPath"],
    ["--current-subset", "currentSubsetPath"],
    ["--artifact", "artifactPath"],
    ["--scratch-root", "scratchRoot"],
    ["--date", "fetchedAt"],
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
    parsed[property] = property === "fetchedAt" ? value : path.resolve(value);
  }
  return parsed;
}

const invokedAsScript =
  process.argv[1] !== undefined &&
  pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;

if (invokedAsScript) {
  try {
    const result = await checkDrugItemRefresh(parseArguments(process.argv.slice(2)));
    process.stdout.write(`${JSON.stringify(result)}\n`);
  } catch (error) {
    const safeError =
      error instanceof RefreshCheckError || error instanceof DerivationError
        ? error
        : new RefreshCheckError("refresh_check_error");
    process.stderr.write(
      `${JSON.stringify({ ok: false, error: safeError.code, ...safeError.details })}\n`,
    );
    process.exitCode = 1;
  }
}
