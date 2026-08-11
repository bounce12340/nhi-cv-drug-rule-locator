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

const SCRIPT_NAME = "scripts/items-codegen.mjs";
const DATASET_VERSION = "nhi-lipid-2026-09-01-r1";
const EFFECTIVE_FROM = "2026-09-01";
const EXPECTED_DATASET_DIGEST =
  "01a4df7463c76a4f280dfd8f5dc8307c292e797532b98bed3edca85abbf155c5";
const EXPECTED_RECORD_COUNT = 187;

const SOURCE_FILES = [
  {
    declaredName: "ezetimibe_3month_exception.csv",
    sha256: "dae9534d1eb31ffaab5a1c4de35c89d3348ad8d8c524eb34f678dc2a704eebb7",
    bytes: 249,
    rowCount: 4,
    headers: ["nhi_code", "drug_name_en", "trial_period_before_combo"]
  },
  {
    declaredName: "ezetimibe_statin_combo_3month_exception.csv",
    sha256: "d4513a6cdd514470b87100352e4d8cca2f17124b1f23b5dc4bff7042a8f15948",
    bytes: 546,
    rowCount: 10,
    headers: ["nhi_code", "drug_name_en", "trial_period_before_use"]
  },
  {
    declaredName: "price_change_seed_20260901.csv",
    sha256: "a480f90d9dd8d9d3eefaf9d206d94898a1184dc62f3e927041fcac7e2f6c6f1f",
    bytes: 7650,
    rowCount: 57,
    headers: [
      "item_no",
      "nhi_code",
      "drug_name_en",
      "ingredient",
      "manufacturer",
      "old_price",
      "new_price",
      "coverage_rule",
      "effective_date"
    ]
  },
  {
    declaredName: "statin_table2_only_list.csv",
    sha256: "b258acb48e68db096f74cb53abe89a96a6d2929701c7da89370484c00d2e8388",
    bytes: 7651,
    rowCount: 116,
    headers: ["ingredient_category", "nhi_code", "drug_name_en", "table_classification"]
  }
];

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, "..");
const governedDirectory = path.join(repositoryRoot, "data", "governed", DATASET_VERSION);
const manifestPath = path.join(governedDirectory, "storage-manifest.json");
const outputPath = path.join(
  repositoryRoot,
  "packages",
  "domain",
  "src",
  "generated",
  "items-2026-09-01.ts"
);

const ITEM_FIELDS = [
  "nhiCode",
  "drugNameEn",
  "ingredient",
  "manufacturer",
  "coverageRule",
  "priceBefore",
  "priceAfter",
  "effectiveDate",
  "tableClassification",
  "ingredientCategory",
  "exceptionNote"
];

function sha256(bytes, encoding) {
  const hash = createHash("sha256");
  hash.update(bytes, encoding);
  return hash.digest("hex");
}

function fail(message) {
  throw new Error(`items-codegen fail closed: ${message}`);
}

function isPlainObject(value) {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
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
  if (manifest.effectiveFrom !== EFFECTIVE_FROM) fail("unexpected effective-from date");
  if (manifest.revoked !== false) fail("dataset is revoked or revocation state is invalid");
  if (!Array.isArray(manifest.files) || manifest.files.length !== SOURCE_FILES.length) {
    fail("manifest must declare exactly the four authorized CSV files");
  }

  const manifestFiles = new Map();
  for (const fileEntry of manifest.files) {
    if (
      !isPlainObject(fileEntry) ||
      typeof fileEntry.declaredName !== "string" ||
      typeof fileEntry.sha256 !== "string" ||
      !Number.isSafeInteger(fileEntry.bytes) ||
      fileEntry.bytes < 0 ||
      manifestFiles.has(fileEntry.declaredName)
    ) {
      fail("manifest contains an invalid or duplicate file declaration");
    }
    manifestFiles.set(fileEntry.declaredName, fileEntry);
  }

  for (const expected of SOURCE_FILES) {
    const actual = manifestFiles.get(expected.declaredName);
    if (
      actual === undefined ||
      actual.sha256 !== expected.sha256 ||
      actual.bytes !== expected.bytes
    ) {
      fail(`manifest declaration does not match ${expected.declaredName}`);
    }
  }

  const datasetDigest = sha256(
    [...manifest.files]
      .sort((left, right) => left.declaredName.localeCompare(right.declaredName, "en"))
      .map((entry) => entry.sha256)
      .join(""),
    "ascii"
  );
  if (datasetDigest !== EXPECTED_DATASET_DIGEST) {
    fail("manifest-derived dataset digest does not match the authorized digest");
  }

  return { manifestFiles, datasetDigest };
}

function parseCsv(rawCsv, source) {
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
      fail(`${source.declaredName} has characters after a closing quote`);
    }
    if (character === '"') {
      if (field.length > 0 || closedQuote) fail(`${source.declaredName} has an invalid quote`);
      inQuotes = true;
    } else if (character === ",") {
      finishField();
    } else if (character === "\n") {
      finishRow();
    } else if (character === "\r") {
      if (text[index + 1] !== "\n") fail(`${source.declaredName} has a bare carriage return`);
      finishRow();
      index += 1;
    } else {
      field += character;
    }
  }

  if (inQuotes) fail(`${source.declaredName} has an unterminated quoted field`);
  if (field.length > 0 || closedQuote || row.length > 0) finishRow();
  if (rows.length === 0) fail(`${source.declaredName} is empty`);

  const [headers, ...dataRows] = rows;
  if (
    headers.length !== source.headers.length ||
    !headers.every((header, index) => header === source.headers[index])
  ) {
    fail(`${source.declaredName} has an unexpected header`);
  }
  if (dataRows.length !== source.rowCount) {
    fail(`${source.declaredName} has an unexpected record count`);
  }

  return dataRows.map((values, index) => {
    if (values.length !== headers.length) {
      fail(`${source.declaredName} row ${index + 2} has an unexpected field count`);
    }
    return Object.fromEntries(headers.map((header, fieldIndex) => [header, values[fieldIndex]]));
  });
}

function mergeField(record, fieldName, sourceValue, sourceName, rowNumber) {
  const value = sourceValue === "" ? undefined : sourceValue;
  if (value === undefined) return;
  if (record[fieldName] !== undefined && record[fieldName] !== value) {
    fail(`${sourceName} row ${rowNumber} conflicts on ${fieldName} for ${record.nhiCode}`);
  }
  record[fieldName] = value;
}

function mergeSourceRow(recordsByCode, orderedRecords, source, row, rowNumber) {
  const nhiCode = row.nhi_code;
  if (!/^[A-Z0-9]{10}$/.test(nhiCode)) {
    fail(`${source.declaredName} row ${rowNumber} has an invalid nhi_code`);
  }
  if (row.drug_name_en === "") {
    fail(`${source.declaredName} row ${rowNumber} has an empty drug_name_en`);
  }

  let record = recordsByCode.get(nhiCode);
  if (record === undefined) {
    record = Object.fromEntries(ITEM_FIELDS.map((field) => [field, undefined]));
    record.nhiCode = nhiCode;
    recordsByCode.set(nhiCode, record);
    orderedRecords.push(record);
  }

  mergeField(record, "drugNameEn", row.drug_name_en, source.declaredName, rowNumber);
  if (source.declaredName === "ezetimibe_3month_exception.csv") {
    mergeField(record, "exceptionNote", row.trial_period_before_combo, source.declaredName, rowNumber);
  } else if (source.declaredName === "ezetimibe_statin_combo_3month_exception.csv") {
    mergeField(record, "exceptionNote", row.trial_period_before_use, source.declaredName, rowNumber);
  } else if (source.declaredName === "price_change_seed_20260901.csv") {
    mergeField(record, "ingredient", row.ingredient, source.declaredName, rowNumber);
    mergeField(record, "manufacturer", row.manufacturer, source.declaredName, rowNumber);
    mergeField(record, "coverageRule", row.coverage_rule, source.declaredName, rowNumber);
    mergeField(record, "priceBefore", row.old_price, source.declaredName, rowNumber);
    mergeField(record, "priceAfter", row.new_price, source.declaredName, rowNumber);
    mergeField(record, "effectiveDate", row.effective_date, source.declaredName, rowNumber);
  } else if (source.declaredName === "statin_table2_only_list.csv") {
    mergeField(record, "tableClassification", row.table_classification, source.declaredName, rowNumber);
    mergeField(record, "ingredientCategory", row.ingredient_category, source.declaredName, rowNumber);
  }
}

function loadAuthorizedRecords({ forceHashMismatch = false } = {}) {
  const rawManifest = readFileSync(manifestPath, "utf8");
  const { manifestFiles, datasetDigest } = parseManifest(rawManifest);
  const recordsByCode = new Map();
  const orderedRecords = [];

  for (const source of SOURCE_FILES) {
    const sourcePath = path.join(governedDirectory, source.declaredName);
    const rawCsv = readFileSync(sourcePath);
    const manifestEntry = manifestFiles.get(source.declaredName);
    const actualSha256 = sha256(rawCsv);
    const hashForGate = forceHashMismatch ? "0".repeat(64) : actualSha256;
    if (hashForGate !== source.sha256 || hashForGate !== manifestEntry.sha256) {
      fail(`${source.declaredName} SHA-256 does not match both manifest and authorization`);
    }
    if (rawCsv.byteLength !== source.bytes || rawCsv.byteLength !== manifestEntry.bytes) {
      fail(`${source.declaredName} byte length does not match both manifest and authorization`);
    }

    const rows = parseCsv(rawCsv, source);
    const seenSourceCodes = new Set();
    for (const [index, row] of rows.entries()) {
      if (seenSourceCodes.has(row.nhi_code)) {
        fail(`${source.declaredName} contains duplicate nhi_code ${row.nhi_code}`);
      }
      seenSourceCodes.add(row.nhi_code);
      mergeSourceRow(recordsByCode, orderedRecords, source, row, index + 2);
    }
  }

  if (orderedRecords.length !== EXPECTED_RECORD_COUNT) {
    fail(`expected exactly ${EXPECTED_RECORD_COUNT} merged item records`);
  }
  if (orderedRecords.some((record) => record.drugNameEn === undefined)) {
    fail("a merged item record is missing drugNameEn");
  }

  return { records: orderedRecords, datasetDigest };
}

function serializeRecord(record) {
  const fields = ITEM_FIELDS.map((field) => {
    const value = record[field];
    return `    ${field}: ${value === undefined ? "undefined" : JSON.stringify(value)}`;
  });
  return `  {\n${fields.join(",\n")}\n  }`;
}

export function renderItemsModule(options = {}) {
  const { records, datasetDigest } = loadAuthorizedRecords(options);
  const serializedRecords = records.map(serializeRecord).join(",\n");
  return `// GENERATED — DO NOT EDIT
// Source dataset: ${DATASET_VERSION}
// Dataset digest (SHA-256): ${datasetDigest}
// Record count: ${EXPECTED_RECORD_COUNT}
// Authorization: RDL-019
// Generator: ${SCRIPT_NAME}

export interface DrugItemRecord {
  readonly nhiCode: string;
  readonly drugNameEn: string;
  readonly ingredient: string | undefined;
  readonly manufacturer: string | undefined;
  readonly coverageRule: string | undefined;
  readonly priceBefore: string | undefined;
  readonly priceAfter: string | undefined;
  readonly effectiveDate: string | undefined;
  readonly tableClassification: string | undefined;
  readonly ingredientCategory: string | undefined;
  readonly exceptionNote: string | undefined;
}

export const ITEM_DATASET_VERSION = "${DATASET_VERSION}" as const;
export const ITEM_DATASET_EFFECTIVE_FROM = "${EFFECTIVE_FROM}" as const;

const generatedItemRecords: DrugItemRecord[] = [
${serializedRecords}
];

function deepFreeze<T>(value: T): T {
  if (typeof value === "object" && value !== null && !Object.isFrozen(value)) {
    for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

export const ITEM_RECORDS: readonly DrugItemRecord[] = deepFreeze(generatedItemRecords);
`;
}

export function writeItemsModule(options = {}) {
  const source = renderItemsModule(options);
  mkdirSync(path.dirname(outputPath), { recursive: true });
  if (existsSync(outputPath) && readFileSync(outputPath, "utf8") === source) {
    return { source, written: false };
  }
  writeFileSync(outputPath, source, "utf8");
  return { source, written: true };
}

function checkItemsModule(options = {}) {
  const expectedSource = renderItemsModule(options);
  if (!existsSync(outputPath)) fail("generated module is missing");
  const generatedSource = readFileSync(outputPath, "utf8");
  if (generatedSource !== expectedSource) fail("generated module has drifted from governed input");
}

function parseArguments(argumentsToParse) {
  const allowed = new Set(["--check", "--force-hash-mismatch"]);
  for (const argument of argumentsToParse) {
    if (!allowed.has(argument)) fail(`unknown argument ${argument}`);
  }
  return {
    check: argumentsToParse.includes("--check"),
    forceHashMismatch: argumentsToParse.includes("--force-hash-mismatch")
  };
}

const invokedAsScript =
  process.argv[1] !== undefined && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;

if (invokedAsScript) {
  try {
    const options = parseArguments(process.argv.slice(2));
    if (options.check) {
      checkItemsModule({ forceHashMismatch: options.forceHashMismatch });
      process.stdout.write(`items-codegen: generated module matches ${DATASET_VERSION}\n`);
    } else {
      const { source, written } = writeItemsModule({ forceHashMismatch: options.forceHashMismatch });
      const action = written ? "wrote" : "verified unchanged";
      process.stdout.write(
        `items-codegen: ${action} ${path.relative(repositoryRoot, outputPath)} (${Buffer.byteLength(source)} bytes)\n`
      );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
  }
}

