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

const SCRIPT_NAME = "scripts/rules-codegen.mjs";
const DATASET_VERSION = "nhi-lipid-rules-structured-2026-09-01-r1";
const EFFECTIVE_FROM = "2026-09-01";
const EXPECTED_FILE_SHA256 =
  "9aa028b9f6036b9727d80186f37eb40695dca12ff61540c2ff5319b359227117";
const EXPECTED_DATASET_DIGEST =
  "dcb6bd916fc802a18e50e02ec760928e819ef2fa2ef881155b88bca6c8e67c28";
const EXPECTED_UNIT_COUNT = 67;

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, "..");
const governedDirectory = path.join(repositoryRoot, "data", "governed", DATASET_VERSION);
const rulesPath = path.join(governedDirectory, "rules-structured.jsonl");
const manifestPath = path.join(governedDirectory, "storage-manifest.json");
const outputPath = path.join(
  repositoryRoot,
  "packages",
  "domain",
  "src",
  "generated",
  "rules-2026-09-01.ts"
);

const BASE_UNIT_KEYS = [
  "unit_id",
  "section",
  "table_label",
  "clause_path",
  "unit_type",
  "verbatim_text",
  "effective_from",
  "source_anchor",
  "unit_sha256"
];
const DATA_ROW_KEYS = [...BASE_UNIT_KEYS, "row_index", "column_labels"];
const SOURCE_ANCHOR_KEYS = ["page", "line_start", "line_end"];

function sha256(bytes, encoding) {
  const hash = createHash("sha256");
  hash.update(bytes, encoding);
  return hash.digest("hex");
}

function fail(message) {
  throw new Error(`rules-codegen fail closed: ${message}`);
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
  if (manifest.effectiveFrom !== EFFECTIVE_FROM) fail("unexpected effective-from date");
  if (manifest.revoked !== false) fail("dataset is revoked or revocation state is invalid");
  if (!Array.isArray(manifest.files) || manifest.files.length !== 1) {
    fail("manifest must declare exactly the authorized rules file");
  }

  const fileEntry = manifest.files[0];
  if (
    !isPlainObject(fileEntry) ||
    fileEntry.declaredName !== "rules-structured.jsonl" ||
    fileEntry.sha256 !== EXPECTED_FILE_SHA256 ||
    !Number.isSafeInteger(fileEntry.bytes) ||
    fileEntry.bytes < 0
  ) {
    fail("manifest file declaration does not match the authorized rules file");
  }

  const datasetDigest = sha256(fileEntry.sha256, "ascii");
  if (datasetDigest !== EXPECTED_DATASET_DIGEST) {
    fail("manifest-derived dataset digest does not match the authorized digest");
  }

  return { fileEntry, datasetDigest };
}

function validateSourceAnchor(value, lineNumber) {
  if (!isPlainObject(value) || !hasExactlyKeys(value, SOURCE_ANCHOR_KEYS)) {
    fail(`line ${lineNumber} has an invalid source anchor`);
  }
  for (const key of SOURCE_ANCHOR_KEYS) {
    if (!Number.isSafeInteger(value[key]) || value[key] < 1) {
      fail(`line ${lineNumber} has an invalid source anchor coordinate`);
    }
  }
  if (value.line_start > value.line_end) {
    fail(`line ${lineNumber} has a reversed source anchor`);
  }
}

function validateUnit(value, lineNumber, seenUnitIds) {
  if (!isPlainObject(value)) fail(`line ${lineNumber} is not a JSON object`);
  const isDataRow = value.unit_type === "資料列";
  if (!hasExactlyKeys(value, isDataRow ? DATA_ROW_KEYS : BASE_UNIT_KEYS)) {
    fail(`line ${lineNumber} has an unexpected unit schema`);
  }

  for (const key of [
    "unit_id",
    "section",
    "table_label",
    "unit_type",
    "verbatim_text",
    "effective_from",
    "unit_sha256"
  ]) {
    if (typeof value[key] !== "string") fail(`line ${lineNumber} has a non-string ${key}`);
  }
  if (value.unit_id.length === 0 || seenUnitIds.has(value.unit_id)) {
    fail(`line ${lineNumber} has a missing or duplicate unit id`);
  }
  seenUnitIds.add(value.unit_id);
  if (!Array.isArray(value.clause_path) || !value.clause_path.every((item) => typeof item === "string")) {
    fail(`line ${lineNumber} has an invalid clause path`);
  }
  if (value.effective_from !== EFFECTIVE_FROM) {
    fail(`line ${lineNumber} has an unexpected effective-from date`);
  }
  if (!/^[a-f0-9]{64}$/.test(value.unit_sha256)) {
    fail(`line ${lineNumber} has an invalid unit digest`);
  }
  if (sha256(value.verbatim_text, "utf8") !== value.unit_sha256) {
    fail(`line ${lineNumber} fails its verbatim-text digest`);
  }
  validateSourceAnchor(value.source_anchor, lineNumber);

  if (isDataRow) {
    if (!Number.isSafeInteger(value.row_index) || value.row_index < 1) {
      fail(`line ${lineNumber} has an invalid row index`);
    }
    if (
      !Array.isArray(value.column_labels) ||
      !value.column_labels.every((label) => typeof label === "string")
    ) {
      fail(`line ${lineNumber} has invalid column labels`);
    }
  }
}

function parseUnits(rawRules) {
  const text = rawRules.toString("utf8");
  const lines = text.endsWith("\n") ? text.slice(0, -1).split("\n") : text.split("\n");
  if (lines.length !== EXPECTED_UNIT_COUNT || lines.some((line) => line.length === 0)) {
    fail(`expected exactly ${EXPECTED_UNIT_COUNT} non-empty JSONL records`);
  }

  const seenUnitIds = new Set();
  return lines.map((line, index) => {
    let unit;
    try {
      unit = JSON.parse(line);
    } catch {
      fail(`line ${index + 1} is not valid JSON`);
    }
    validateUnit(unit, index + 1, seenUnitIds);
    return {
      unitId: unit.unit_id,
      section: unit.section,
      tableLabel: unit.table_label,
      clausePath: unit.clause_path,
      unitType: unit.unit_type,
      verbatimText: unit.verbatim_text,
      sourceAnchor: {
        page: unit.source_anchor.page,
        lineStart: unit.source_anchor.line_start,
        lineEnd: unit.source_anchor.line_end
      },
      unitSha256: unit.unit_sha256,
      ...(unit.unit_type === "資料列"
        ? { rowIndex: unit.row_index, columnLabels: unit.column_labels }
        : {})
    };
  });
}

function loadAuthorizedUnits({ forceHashMismatch = false } = {}) {
  const rawManifest = readFileSync(manifestPath, "utf8");
  const { fileEntry, datasetDigest } = parseManifest(rawManifest);
  const rawRules = readFileSync(rulesPath);
  const actualFileSha256 = sha256(rawRules);
  const hashForGate = forceHashMismatch ? "0".repeat(64) : actualFileSha256;

  if (hashForGate !== fileEntry.sha256 || hashForGate !== EXPECTED_FILE_SHA256) {
    fail("rules file SHA-256 does not match both manifest and authorization");
  }
  if (rawRules.byteLength !== fileEntry.bytes) {
    fail("rules file byte length does not match the manifest");
  }

  return { units: parseUnits(rawRules), datasetDigest };
}

export function renderRulesModule(options = {}) {
  const { units, datasetDigest } = loadAuthorizedUnits(options);
  const serializedUnits = JSON.stringify(units, null, 2);
  return `// GENERATED — DO NOT EDIT
// Source dataset: ${DATASET_VERSION}
// Dataset digest (SHA-256): ${datasetDigest}
// Unit count: ${EXPECTED_UNIT_COUNT}
// Authorization: RDL-016
// Generator: ${SCRIPT_NAME}

export interface RuleTextSourceAnchor {
  readonly page: number;
  readonly lineStart: number;
  readonly lineEnd: number;
}

export interface RuleTextUnit {
  readonly unitId: string;
  readonly section: string;
  readonly tableLabel: string;
  readonly clausePath: readonly string[];
  readonly unitType: string;
  readonly verbatimText: string;
  readonly sourceAnchor: RuleTextSourceAnchor;
  readonly unitSha256: string;
  readonly rowIndex?: number;
  readonly columnLabels?: readonly string[];
}

export const RULE_TEXT_DATASET_VERSION = "${DATASET_VERSION}" as const;
export const RULE_TEXT_EFFECTIVE_FROM = "${EFFECTIVE_FROM}" as const;

const generatedRuleTextUnits: RuleTextUnit[] = ${serializedUnits};

function deepFreeze<T>(value: T): T {
  if (typeof value === "object" && value !== null && !Object.isFrozen(value)) {
    for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

export const RULE_TEXT_UNITS: readonly RuleTextUnit[] = deepFreeze(generatedRuleTextUnits);
`;
}

export function writeRulesModule(options = {}) {
  const source = renderRulesModule(options);
  mkdirSync(path.dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, source, "utf8");
  return source;
}

function checkRulesModule(options = {}) {
  const expectedSource = renderRulesModule(options);
  if (!existsSync(outputPath)) fail("generated module is missing");
  const checkedInSource = readFileSync(outputPath, "utf8");
  if (checkedInSource !== expectedSource) fail("generated module has drifted from governed input");
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
      checkRulesModule({ forceHashMismatch: options.forceHashMismatch });
      process.stdout.write(`rules-codegen: generated module matches ${DATASET_VERSION}\n`);
    } else {
      const source = writeRulesModule({ forceHashMismatch: options.forceHashMismatch });
      process.stdout.write(
        `rules-codegen: wrote ${path.relative(repositoryRoot, outputPath)} (${Buffer.byteLength(source)} bytes)\n`
      );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
  }
}
