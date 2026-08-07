#!/usr/bin/env node

import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync
} from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const SCRIPT_NAME = "scripts/drug-items-codegen.mjs";
const DATASET_VERSION = "nhi-drug-items-2026-08-07-r2";
const DATASET_EFFECTIVE_FROM = "2026-08-07";
const DATASET_EFFECTIVE_TO = "9999-12-31";
const EXPECTED_FILE_SHA256 =
  "ec6c9fdb3a047d0ad9b29db6d0ffab23f0e0bb1ddd39851a7d50619bc3529412";
const EXPECTED_FILE_BYTES = 1_844_105;
const EXPECTED_DATASET_DIGEST =
  "c340830cfff85c0d8fe067fde4033574f741d03ca3f3c9361329df05ec4c9857";
const EXPECTED_APPROVAL_WORDING =
  "INTAKE-APPROVE nhi-drug-items-2026-08-07-r2 c340830";
const EXPECTED_RECORD_COUNT = 607;
const EXPECTED_PERIOD_COUNT = 4_048;
const SOURCE_FILENAME = "drug-items-lipid.csv";

export const DRUG_ITEM_SOURCE_HEADERS = Object.freeze([
  "異動",
  "藥品代號",
  "藥品英文名稱",
  "藥品中文名稱",
  "成分",
  "規格量",
  "規格單位",
  "單複方",
  "支付價",
  "有效起日",
  "有效迄日",
  "藥商",
  "製造廠名稱",
  "劑型",
  "藥品分類",
  "分類分組名稱",
  "ATC代碼",
  "給付規定章節",
  "藥品代碼超連結",
  "給付規定章節連結"
]);

const PERIOD_HEADERS = new Set(["異動", "支付價", "有效起日", "有效迄日"]);
const NON_PRICE_HEADERS = DRUG_ITEM_SOURCE_HEADERS.filter((header) => !PERIOD_HEADERS.has(header));
const STRING_TABLE_HEADERS = Object.freeze([
  "成分",
  "藥商",
  "製造廠名稱",
  "劑型",
  "藥品分類",
  "分類分組名稱",
  "ATC代碼",
  "給付規定章節",
  "規格單位",
  "單複方"
]);

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, "..");
const governedDirectory = path.join(repositoryRoot, "data", "governed", DATASET_VERSION);
const sourcePath = path.join(governedDirectory, SOURCE_FILENAME);
const manifestPath = path.join(governedDirectory, "storage-manifest.json");
const defaultOutputPath = path.join(
  repositoryRoot,
  "packages",
  "domain",
  "src",
  "generated",
  "drug-items-2026-08-07.ts"
);

function sha256(bytes, encoding) {
  const hash = createHash("sha256");
  hash.update(bytes, encoding);
  return hash.digest("hex");
}

function fail(message) {
  throw new Error(`drug-items-codegen fail closed: ${message}`);
}

function isPlainObject(value) {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

function hasExactlyKeys(value, expectedKeys) {
  const actualKeys = Object.keys(value).sort();
  const sortedExpectedKeys = [...expectedKeys].sort();
  return (
    actualKeys.length === sortedExpectedKeys.length &&
    actualKeys.every((key, index) => key === sortedExpectedKeys[index])
  );
}

function parseManifest(rawManifest) {
  let manifest;
  try {
    manifest = JSON.parse(rawManifest);
  } catch {
    fail("storage-manifest.json is not valid JSON");
  }

  if (!isPlainObject(manifest)) fail("storage manifest must be an object");
  if (manifest.schema !== "storage-manifest/v1") fail("unexpected storage manifest schema");
  if (manifest.datasetVersion !== DATASET_VERSION) fail("unexpected dataset version");
  if (manifest.effectiveFrom !== DATASET_EFFECTIVE_FROM) fail("unexpected effective-from date");
  if (manifest.effectiveTo !== DATASET_EFFECTIVE_TO) fail("unexpected effective-to date");
  if (manifest.revoked !== false) fail("dataset is revoked or revocation state is invalid");
  if (!isPlainObject(manifest.approvalRef)) fail("missing approval reference");
  if (
    manifest.approvalRef.rdlId !== "RDL-023" ||
    manifest.approvalRef.approvalWording !== EXPECTED_APPROVAL_WORDING
  ) {
    fail("approval reference does not exactly match the governed-storage authorization");
  }
  if (!Array.isArray(manifest.files) || manifest.files.length !== 1) {
    fail("manifest must declare exactly the authorized drug-item CSV");
  }

  const fileEntry = manifest.files[0];
  if (
    !isPlainObject(fileEntry) ||
    !hasExactlyKeys(fileEntry, ["declaredName", "sha256", "bytes"]) ||
    fileEntry.declaredName !== SOURCE_FILENAME ||
    fileEntry.sha256 !== EXPECTED_FILE_SHA256 ||
    fileEntry.bytes !== EXPECTED_FILE_BYTES
  ) {
    fail("manifest file declaration does not match the authorized drug-item CSV");
  }

  const datasetDigest = sha256(fileEntry.sha256, "ascii");
  if (datasetDigest !== EXPECTED_DATASET_DIGEST) {
    fail("manifest-derived dataset digest does not match the authorized digest");
  }
  return { fileEntry, datasetDigest };
}

function parseCsv(rawCsv) {
  const text = rawCsv.toString("utf8");
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  let closedQuote = false;

  function finishField() {
    row.push(field);
    field = "";
    closedQuote = false;
  }

  function finishRow() {
    finishField();
    rows.push(row);
    row = [];
  }

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (inQuotes) {
      if (character === '"') {
        if (text[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          inQuotes = false;
          closedQuote = true;
        }
      } else {
        field += character;
      }
      continue;
    }

    if (closedQuote && character !== "," && character !== "\n" && character !== "\r") {
      fail(`${SOURCE_FILENAME} has characters after a closing quote`);
    }
    if (character === '"') {
      if (field.length > 0 || closedQuote) fail(`${SOURCE_FILENAME} has an invalid quote`);
      inQuotes = true;
    } else if (character === ",") {
      finishField();
    } else if (character === "\n") {
      finishRow();
    } else if (character === "\r") {
      if (text[index + 1] !== "\n") fail(`${SOURCE_FILENAME} has a bare carriage return`);
      finishRow();
      index += 1;
    } else {
      field += character;
    }
  }

  if (inQuotes) fail(`${SOURCE_FILENAME} has an unterminated quoted field`);
  if (field.length > 0 || closedQuote || row.length > 0) finishRow();
  if (rows.length === 0) fail(`${SOURCE_FILENAME} is empty`);

  const [headers, ...dataRows] = rows;
  if (
    headers.length !== DRUG_ITEM_SOURCE_HEADERS.length ||
    !headers.every((header, index) => header === DRUG_ITEM_SOURCE_HEADERS[index])
  ) {
    fail(`${SOURCE_FILENAME} has an unexpected header or header order`);
  }
  if (dataRows.length !== EXPECTED_PERIOD_COUNT) {
    fail(`${SOURCE_FILENAME} has an unexpected record count`);
  }

  return dataRows.map((values, index) => {
    const rowNumber = index + 2;
    if (values.length !== headers.length) {
      fail(`${SOURCE_FILENAME} row ${rowNumber} has an unexpected field count`);
    }
    return {
      rowNumber,
      values: Object.fromEntries(headers.map((header, fieldIndex) => [header, values[fieldIndex]]))
    };
  });
}

/** Converts a raw seven-digit ROC date while retaining validation at the codegen boundary. */
export function rocDateToIso(rawValue, rowNumber = 0, fieldName = "date") {
  if (typeof rawValue !== "string") fail(`row ${rowNumber} has a non-string ${fieldName}`);
  const normalized = rawValue.trim();
  // The governed CSV space-pads two-digit ROC years instead of zero-padding them.
  // Accept only that six-digit source form or the canonical seven-digit form.
  if (!/^\d{6,7}$/.test(normalized)) fail(`row ${rowNumber} has an invalid ${fieldName}`);
  if (normalized === "9991231") return "9999-12-31";

  const rocYear = Number(normalized.slice(0, -4));
  const month = Number(normalized.slice(-4, -2));
  const day = Number(normalized.slice(-2));
  const gregorianYear = rocYear + 1911;
  const parsed = new Date(Date.UTC(gregorianYear, month - 1, day));
  if (
    parsed.getUTCFullYear() !== gregorianYear ||
    parsed.getUTCMonth() + 1 !== month ||
    parsed.getUTCDate() !== day
  ) {
    fail(`row ${rowNumber} has an invalid ${fieldName}`);
  }
  return `${String(gregorianYear).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function validateFixtureRow(row) {
  if (
    !isPlainObject(row) ||
    !Number.isSafeInteger(row.rowNumber) ||
    row.rowNumber < 1 ||
    !isPlainObject(row.values) ||
    !hasExactlyKeys(row.values, DRUG_ITEM_SOURCE_HEADERS)
  ) {
    fail("synthetic grouping fixture has an invalid row shape");
  }
  for (const header of DRUG_ITEM_SOURCE_HEADERS) {
    if (typeof row.values[header] !== "string") {
      fail(`row ${row.rowNumber} has a non-string field`);
    }
  }
}

/**
 * Revalidates the lossless grouping premise. Conflict messages intentionally
 * identify only source row locations and never disclose the drug-code value.
 */
export function validateAndGroupDrugItemRows(rows) {
  if (!Array.isArray(rows)) fail("drug-item rows must be an array");
  const groupedByCode = new Map();

  for (const row of rows) {
    validateFixtureRow(row);
    const code = row.values["藥品代號"];
    if (!/^[A-Z0-9]{10}$/.test(code)) {
      fail(`row ${row.rowNumber} has an invalid drug-code surface format`);
    }
    if (row.values["藥品英文名稱"] === "" || row.values["藥品中文名稱"] === "") {
      fail(`row ${row.rowNumber} has an empty required product name`);
    }
    if (row.values["支付價"] === "") fail(`row ${row.rowNumber} has an empty payment price`);

    const startDateIso = rocDateToIso(row.values["有效起日"], row.rowNumber, "effective start date");
    const endDateIso = rocDateToIso(row.values["有效迄日"], row.rowNumber, "effective end date");
    if (startDateIso > endDateIso) {
      fail(`row ${row.rowNumber} has a reversed effective-date interval`);
    }

    const existing = groupedByCode.get(code);
    if (existing === undefined) {
      groupedByCode.set(code, {
        firstRowNumber: row.rowNumber,
        values: row.values,
        priceHistory: []
      });
    } else {
      for (const header of NON_PRICE_HEADERS) {
        if (existing.values[header] !== row.values[header]) {
          fail(
            `rows ${existing.firstRowNumber} and ${row.rowNumber} differ in non-price field ${header}`
          );
        }
      }
    }

    groupedByCode.get(code).priceHistory.push({
      sourceRowNumber: row.rowNumber,
      paymentPriceRaw: row.values["支付價"],
      effectiveStartRaw: row.values["有效起日"],
      effectiveEndRaw: row.values["有效迄日"],
      startDateIso,
      endDateIso
    });
  }

  const groups = [...groupedByCode.values()];
  for (const group of groups) {
    group.priceHistory.sort(
      (left, right) =>
        left.startDateIso.localeCompare(right.startDateIso, "en") ||
        left.endDateIso.localeCompare(right.endDateIso, "en") ||
        left.sourceRowNumber - right.sourceRowNumber
    );
    for (let index = 1; index < group.priceHistory.length; index += 1) {
      const previous = group.priceHistory[index - 1];
      const current = group.priceHistory[index];
      if (current.startDateIso <= previous.endDateIso) {
        fail(
          `rows ${previous.sourceRowNumber} and ${current.sourceRowNumber} have overlapping effective-date intervals`
        );
      }
    }
  }
  return groups;
}

function loadAuthorizedGroups({ forceHashMismatch = false } = {}) {
  let rawManifest;
  try {
    rawManifest = readFileSync(manifestPath, "utf8");
  } catch {
    fail("unable to read storage-manifest.json");
  }
  const { fileEntry, datasetDigest } = parseManifest(rawManifest);

  let rawCsv;
  try {
    rawCsv = readFileSync(sourcePath);
  } catch {
    fail(`unable to read ${SOURCE_FILENAME}`);
  }
  const actualSha256 = sha256(rawCsv);
  const hashForGate = forceHashMismatch ? "0".repeat(64) : actualSha256;
  if (hashForGate !== EXPECTED_FILE_SHA256 || hashForGate !== fileEntry.sha256) {
    fail(`${SOURCE_FILENAME} SHA-256 does not match both manifest and authorization`);
  }
  if (rawCsv.byteLength !== EXPECTED_FILE_BYTES || rawCsv.byteLength !== fileEntry.bytes) {
    fail(`${SOURCE_FILENAME} byte length does not match both manifest and authorization`);
  }

  const rows = parseCsv(rawCsv);
  const groups = validateAndGroupDrugItemRows(rows);
  if (groups.length !== EXPECTED_RECORD_COUNT) {
    fail(`expected exactly ${EXPECTED_RECORD_COUNT} grouped drug-item records`);
  }
  if (groups.reduce((total, group) => total + group.priceHistory.length, 0) !== EXPECTED_PERIOD_COUNT) {
    fail(`expected exactly ${EXPECTED_PERIOD_COUNT} retained price periods`);
  }
  return { groups, datasetDigest };
}

function buildStringTable(groups) {
  const strings = [];
  const indexes = new Map();
  for (const header of STRING_TABLE_HEADERS) {
    if (new Set(groups.map((group) => group.values[header])).size > 145) {
      fail(`string-table field ${header} exceeds the authorized distinct-value bound`);
    }
  }
  for (const group of groups) {
    for (const header of STRING_TABLE_HEADERS) {
      const value = group.values[header];
      if (!indexes.has(value)) {
        indexes.set(value, strings.length);
        strings.push(value);
      }
    }
  }
  return { strings, indexes };
}

function serializePriceHistory(priceHistory) {
  return `[${priceHistory
    .map(
      (period) =>
        `[${JSON.stringify(period.paymentPriceRaw)},${JSON.stringify(period.effectiveStartRaw)},${JSON.stringify(period.effectiveEndRaw)},${JSON.stringify(period.startDateIso)},${JSON.stringify(period.endDateIso)}]`
    )
    .join(",")}]`;
}

function serializeCompactRecord(group, indexes) {
  const value = (header) => group.values[header];
  const index = (header) => indexes.get(value(header));
  return `[${[
    JSON.stringify(value("藥品代號")),
    JSON.stringify(value("藥品英文名稱")),
    JSON.stringify(value("藥品中文名稱")),
    index("成分"),
    JSON.stringify(value("規格量")),
    index("規格單位"),
    index("單複方"),
    index("藥商"),
    index("製造廠名稱"),
    index("劑型"),
    index("藥品分類"),
    index("分類分組名稱"),
    index("ATC代碼"),
    index("給付規定章節"),
    serializePriceHistory(group.priceHistory)
  ].join(",")}]`;
}

export function renderDrugItemsModule(options = {}) {
  const { groups, datasetDigest } = loadAuthorizedGroups(options);
  const { strings, indexes } = buildStringTable(groups);
  const serializedRecords = groups.map((group) => serializeCompactRecord(group, indexes)).join(",\n  ");
  return `// GENERATED — DO NOT EDIT
// Source dataset: ${DATASET_VERSION}
// Dataset digest (SHA-256): ${datasetDigest}
// Authorization: RDL-022/023
// Record count: ${EXPECTED_RECORD_COUNT}
// Price-period count: ${EXPECTED_PERIOD_COUNT}
// The two source URL columns are omitted because they account for 46% of source characters;
// the governed CSV retains both columns unchanged and codegen still validates them before grouping.
// Generator: ${SCRIPT_NAME}

export interface DrugItemMasterPricePeriod {
  readonly paymentPriceRaw: string;
  readonly effectiveStartRaw: string;
  readonly effectiveEndRaw: string;
  readonly startDateIso: string;
  readonly endDateIso: string;
}

export interface DrugItemMasterRecord {
  readonly nhiCode: string;
  readonly drugNameEn: string;
  readonly drugNameZh: string;
  readonly ingredient: string;
  readonly specificationAmount: string;
  readonly specificationUnit: string;
  readonly singleOrCompound: string;
  readonly vendor: string;
  readonly manufacturer: string;
  readonly dosageForm: string;
  readonly drugCategory: string;
  readonly classificationGroupName: string;
  readonly atcCode: string;
  readonly coverageRuleSection: string;
  readonly priceHistory: readonly DrugItemMasterPricePeriod[];
}

export const DRUG_ITEMS_DATASET_VERSION = "${DATASET_VERSION}" as const;
export const DRUG_ITEMS_DATASET_EFFECTIVE_FROM = "${DATASET_EFFECTIVE_FROM}" as const;
export const DRUG_ITEMS_DATASET_EFFECTIVE_TO = "${DATASET_EFFECTIVE_TO}" as const;

const strings: readonly string[] = ${JSON.stringify(strings)};
type CompactPricePeriod = readonly [string, string, string, string, string];
type CompactDrugItemMasterRecord = readonly [
  string,
  string,
  string,
  number,
  string,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  readonly CompactPricePeriod[]
];

const compactRecords: readonly CompactDrugItemMasterRecord[] = [
  ${serializedRecords}
];

const generatedDrugItemMasterRecords: DrugItemMasterRecord[] = compactRecords.map((record) => ({
  nhiCode: record[0],
  drugNameEn: record[1],
  drugNameZh: record[2],
  ingredient: strings[record[3]]!,
  specificationAmount: record[4],
  specificationUnit: strings[record[5]]!,
  singleOrCompound: strings[record[6]]!,
  vendor: strings[record[7]]!,
  manufacturer: strings[record[8]]!,
  dosageForm: strings[record[9]]!,
  drugCategory: strings[record[10]]!,
  classificationGroupName: strings[record[11]]!,
  atcCode: strings[record[12]]!,
  coverageRuleSection: strings[record[13]]!,
  priceHistory: record[14].map((period) => ({
    paymentPriceRaw: period[0],
    effectiveStartRaw: period[1],
    effectiveEndRaw: period[2],
    startDateIso: period[3],
    endDateIso: period[4]
  }))
}));

function deepFreeze<T>(value: T): T {
  if (typeof value === "object" && value !== null && !Object.isFrozen(value)) {
    for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

export const DRUG_ITEM_MASTER_RECORDS: readonly DrugItemMasterRecord[] = deepFreeze(
  generatedDrugItemMasterRecords
);
`;
}

function resolveOutputPath(outputArgument) {
  if (outputArgument === undefined) return defaultOutputPath;
  const resolved = path.resolve(repositoryRoot, outputArgument);
  const scratchpadRoot = path.join(repositoryRoot, "scratchpad");
  if (resolved !== scratchpadRoot && !resolved.startsWith(`${scratchpadRoot}${path.sep}`)) {
    fail("custom output must be within repository scratchpad/");
  }
  return resolved;
}

function writeDrugItemsModule(outputPath, options = {}) {
  const source = renderDrugItemsModule(options);
  mkdirSync(path.dirname(outputPath), { recursive: true });
  if (existsSync(outputPath)) {
    if (readFileSync(outputPath, "utf8") === source) return { source, written: false };
    fail(`output already exists with different bytes: ${path.relative(repositoryRoot, outputPath)}`);
  }
  writeFileSync(outputPath, source, { encoding: "utf8", flag: "wx" });
  return { source, written: true };
}

function checkDrugItemsModule(outputPath, options = {}) {
  const expectedSource = renderDrugItemsModule(options);
  if (!existsSync(outputPath)) fail("generated module is missing");
  if (readFileSync(outputPath, "utf8") !== expectedSource) {
    fail("generated module has drifted from governed input");
  }
  return expectedSource;
}

function parseArguments(argumentsToParse) {
  let check = false;
  let forceHashMismatch = false;
  let outputArgument;
  for (const argument of argumentsToParse) {
    if (argument === "--check") check = true;
    else if (argument === "--force-hash-mismatch") forceHashMismatch = true;
    else if (argument.startsWith("--output=")) {
      if (outputArgument !== undefined || argument.slice("--output=".length).length === 0) {
        fail("invalid or duplicate --output argument");
      }
      outputArgument = argument.slice("--output=".length);
    } else {
      fail(`unknown argument ${argument}`);
    }
  }
  return { check, forceHashMismatch, outputPath: resolveOutputPath(outputArgument) };
}

const invokedAsScript =
  process.argv[1] !== undefined && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;

if (invokedAsScript) {
  try {
    const options = parseArguments(process.argv.slice(2));
    if (options.check) {
      const source = checkDrugItemsModule(options.outputPath, {
        forceHashMismatch: options.forceHashMismatch
      });
      process.stdout.write(
        `drug-items-codegen: generated module matches ${DATASET_VERSION} (${Buffer.byteLength(source)} bytes)\n`
      );
    } else {
      const { source, written } = writeDrugItemsModule(options.outputPath, {
        forceHashMismatch: options.forceHashMismatch
      });
      const action = written ? "wrote" : "verified unchanged";
      process.stdout.write(
        `drug-items-codegen: ${action} ${path.relative(repositoryRoot, options.outputPath)} (${Buffer.byteLength(source)} bytes)\n`
      );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
  }
}
