#!/usr/bin/env node

import { createHash } from "node:crypto";
import { createReadStream, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { TextDecoder } from "node:util";
import { fileURLToPath, pathToFileURL } from "node:url";

const EXPECTED_SOURCE_SHA256 =
  "d41cf7bf91ca1d6997ac751601548f68226a8326452aa5d8befd725e3a8d0158";
const EXPECTED_SOURCE_DATA_ROWS = 224_553;
export const EXPECTED_SOURCE_HEADERS = Object.freeze([
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
  "給付規定章節連結",
]);
const EXPECTED_HEADERS = EXPECTED_SOURCE_HEADERS;

export const TARGET_CHAPTERS = Object.freeze(["2.6.1.", "2.6.2.", "2.6.3."]);
const TARGET_CHAPTER_SET = new Set(TARGET_CHAPTERS);
const TERMINAL_END_DATE = "9991231";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, "..");
const sourcePath = path.join(repositoryRoot, "scratchpad", "intake-23715", "source.csv");
const outputPath = path.join(
  repositoryRoot,
  "scratchpad",
  "intake-23715",
  "subset-lipid.csv",
);

export class DerivationError extends Error {
  constructor(code, details = {}) {
    super(code);
    this.name = "DerivationError";
    this.code = code;
    this.details = details;
  }
}

function fail(code, details = {}) {
  throw new DerivationError(code, details);
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function splitChapterTokens(value) {
  return String(value ?? "")
    .split(",")
    .map((token) => token.trim());
}

export function hasExactTargetChapter(value) {
  return splitChapterTokens(value).some((token) => TARGET_CHAPTER_SET.has(token));
}

export function matchesNaiveSubstring(value) {
  const field = String(value ?? "");
  return TARGET_CHAPTERS.some((target) => field.includes(target));
}

function arraysEqual(left, right) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

async function hashFile(filePath) {
  let fileStat;
  try {
    fileStat = statSync(filePath);
  } catch {
    fail("source_file_error");
  }
  if (!fileStat.isFile()) {
    fail("source_file_error");
  }

  const hash = createHash("sha256");
  let bytes = 0;
  const prefix = [];
  try {
    for await (const chunk of createReadStream(filePath)) {
      hash.update(chunk);
      bytes += chunk.byteLength;
      for (let index = 0; index < chunk.length && prefix.length < 3; index += 1) {
        prefix.push(chunk[index]);
      }
    }
  } catch {
    fail("source_file_error");
  }

  return {
    bytes,
    sha256: hash.digest("hex"),
    hasUtf8Bom: arraysEqual(prefix, [0xef, 0xbb, 0xbf]),
  };
}

export async function parseCsvFile(filePath, onRow) {
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let row = [];
  let field = "";
  let inQuotes = false;
  let quotePending = false;
  let justClosedQuote = false;
  let skipLineFeed = false;
  let rowNumber = 0;

  const finishField = () => {
    row.push(field);
    field = "";
    justClosedQuote = false;
  };
  const finishRow = () => {
    finishField();
    rowNumber += 1;
    if (rowNumber === 1 && row[0]?.startsWith("\uFEFF")) {
      row[0] = row[0].slice(1);
    }
    onRow(row, rowNumber);
    row = [];
  };

  const consumeCharacter = (character) => {
    let reprocess = true;
    while (reprocess) {
      reprocess = false;

      if (inQuotes) {
        if (quotePending) {
          if (character === '"') {
            field += '"';
            quotePending = false;
            return;
          }
          inQuotes = false;
          quotePending = false;
          justClosedQuote = true;
          reprocess = true;
          continue;
        }
        if (character === '"') {
          quotePending = true;
        } else {
          field += character;
        }
        return;
      }

      if (skipLineFeed) {
        skipLineFeed = false;
        if (character === "\n") {
          return;
        }
      }

      if (character === '"') {
        if (field.length !== 0 || justClosedQuote) {
          fail("csv_parse_error", { csvRowNumber: rowNumber + 1 });
        }
        inQuotes = true;
      } else if (character === ",") {
        finishField();
      } else if (character === "\n") {
        finishRow();
      } else if (character === "\r") {
        finishRow();
        skipLineFeed = true;
      } else {
        if (justClosedQuote) {
          fail("csv_parse_error", { csvRowNumber: rowNumber + 1 });
        }
        field += character;
      }
    }
  };

  try {
    for await (const chunk of createReadStream(filePath)) {
      const text = decoder.decode(chunk, { stream: true });
      for (const character of text) {
        consumeCharacter(character);
      }
    }
    const finalText = decoder.decode();
    for (const character of finalText) {
      consumeCharacter(character);
    }
  } catch (error) {
    if (error instanceof DerivationError) {
      throw error;
    }
    fail("csv_parse_error");
  }

  if (inQuotes && quotePending) {
    inQuotes = false;
    quotePending = false;
    justClosedQuote = true;
  }
  if (inQuotes) {
    fail("csv_parse_error", { csvRowNumber: rowNumber + 1 });
  }
  if (field.length > 0 || row.length > 0 || justClosedQuote) {
    finishRow();
  }

  return rowNumber;
}

function encodeCsvField(value) {
  if (!/[",\r\n]/u.test(value)) {
    return value;
  }
  return `"${value.replaceAll('"', '""')}"`;
}

function encodeCsvRow(row) {
  return `${row.map(encodeCsvField).join(",")}\n`;
}

function createStatistics(headers) {
  return {
    sourceDataRows: 0,
    selectedRows: 0,
    distinctCodes: new Set(),
    chineseNameRows: 0,
    terminalEndDateRows: 0,
    substringRows: 0,
    falsePositiveRows: 0,
    falsePositiveChapterPatterns: new Map(),
    targetTokenCounts: new Map(TARGET_CHAPTERS.map((token) => [token, 0])),
    targetCombinationCounts: new Map(),
    emptyCounts: new Map(headers.map((header) => [header, 0])),
  };
}

function incrementMap(map, key) {
  map.set(key, (map.get(key) ?? 0) + 1);
}

function publicStatistics(statistics) {
  return {
    sourceDataRows: statistics.sourceDataRows,
    selectedRows: statistics.selectedRows,
    distinctCodeCount: statistics.distinctCodes.size,
    chineseNameRows: statistics.chineseNameRows,
    terminalEndDateRows: statistics.terminalEndDateRows,
    substringRows: statistics.substringRows,
    exactVsSubstringDifference: statistics.substringRows - statistics.selectedRows,
    falsePositiveRows: statistics.falsePositiveRows,
    falsePositiveChapterPatterns: Object.fromEntries(
      [...statistics.falsePositiveChapterPatterns].sort(([left], [right]) =>
        left.localeCompare(right, "en"),
      ),
    ),
    targetTokenCounts: Object.fromEntries(statistics.targetTokenCounts),
    targetCombinationCounts: Object.fromEntries(
      [...statistics.targetCombinationCounts].sort(([left], [right]) =>
        left.localeCompare(right, "en"),
      ),
    ),
    emptyCounts: Object.fromEntries(statistics.emptyCounts),
  };
}

function observeDataRow(row, indexes, statistics, outputChunks) {
  statistics.sourceDataRows += 1;
  const chapterValue = row[indexes.chapter];
  const tokens = splitChapterTokens(chapterValue);
  const exactTargets = TARGET_CHAPTERS.filter((target) => tokens.includes(target));
  const exactMatch = exactTargets.length > 0;
  const substringMatch = matchesNaiveSubstring(chapterValue);

  if (substringMatch) {
    statistics.substringRows += 1;
  }
  if (substringMatch && !exactMatch) {
    statistics.falsePositiveRows += 1;
    const substringTokens = tokens.filter((candidate) =>
      TARGET_CHAPTERS.some((target) => candidate.includes(target)),
    );
    for (const token of new Set(substringTokens)) {
      incrementMap(statistics.falsePositiveChapterPatterns, token);
    }
  }
  if (!exactMatch) {
    return;
  }

  statistics.selectedRows += 1;
  statistics.distinctCodes.add(row[indexes.code]);
  if (row[indexes.chineseName] !== "") {
    statistics.chineseNameRows += 1;
  }
  if (row[indexes.endDate] === TERMINAL_END_DATE) {
    statistics.terminalEndDateRows += 1;
  }
  for (const target of exactTargets) {
    incrementMap(statistics.targetTokenCounts, target);
  }
  incrementMap(statistics.targetCombinationCounts, exactTargets.join(" + "));
  for (let index = 0; index < row.length; index += 1) {
    if (row[index] === "") {
      incrementMap(statistics.emptyCounts, indexes.headers[index]);
    }
  }
  outputChunks.push(encodeCsvRow(row));
}

async function deriveBytes({ inputPath, expectedHeaders, expectedDataRows }) {
  const outputChunks = [encodeCsvRow(expectedHeaders)];
  const statistics = createStatistics(expectedHeaders);
  const indexes = {
    headers: expectedHeaders,
    code: expectedHeaders.indexOf("藥品代號"),
    chineseName: expectedHeaders.indexOf("藥品中文名稱"),
    endDate: expectedHeaders.indexOf("有效迄日"),
    chapter: expectedHeaders.indexOf("給付規定章節"),
  };
  if (Object.values(indexes).some((value) => value === -1)) {
    fail("schema_error");
  }

  let headerSeen = false;
  const parsedRows = await parseCsvFile(inputPath, (row, csvRowNumber) => {
    if (!headerSeen) {
      headerSeen = true;
      if (!arraysEqual(row, expectedHeaders)) {
        fail("schema_error", { csvRowNumber });
      }
      return;
    }
    if (row.length !== expectedHeaders.length) {
      fail("schema_error", { dataRowNumber: csvRowNumber - 1 });
    }
    observeDataRow(row, indexes, statistics, outputChunks);
  });

  if (!headerSeen || parsedRows !== statistics.sourceDataRows + 1) {
    fail("schema_error");
  }
  if (statistics.sourceDataRows !== expectedDataRows) {
    fail("schema_error", { actualDataRows: statistics.sourceDataRows });
  }

  return {
    bytes: Buffer.from(outputChunks.join(""), "utf8"),
    statistics: publicStatistics(statistics),
  };
}

async function verifyRoundTrip(filePath, expectedHeaders) {
  let dataRows = 0;
  let counterexampleRows = 0;
  let headerSeen = false;
  await parseCsvFile(filePath, (row, csvRowNumber) => {
    if (!headerSeen) {
      headerSeen = true;
      if (!arraysEqual(row, expectedHeaders)) {
        fail("output_verification_error", { csvRowNumber });
      }
      return;
    }
    dataRows += 1;
    if (row.length !== expectedHeaders.length) {
      fail("output_verification_error", { dataRowNumber: csvRowNumber - 1 });
    }
    if (!hasExactTargetChapter(row[expectedHeaders.indexOf("給付規定章節")])) {
      counterexampleRows += 1;
    }
  });
  return { dataRows, counterexampleRows };
}

export async function deriveSubsetFile({
  inputPath,
  derivedPath,
  expectedSha256,
  expectedHeaders,
  expectedDataRows,
  check = false,
}) {
  const source = await hashFile(inputPath);
  if (source.sha256 !== expectedSha256) {
    fail("hash_mismatch");
  }
  if (!source.hasUtf8Bom) {
    fail("schema_error");
  }

  const derived = await deriveBytes({ inputPath, expectedHeaders, expectedDataRows });
  const derivedSha256 = sha256(derived.bytes);

  if (check) {
    let existingBytes;
    try {
      existingBytes = readFileSync(derivedPath);
    } catch {
      fail("output_missing");
    }
    if (!existingBytes.equals(derived.bytes)) {
      fail("output_mismatch");
    }
  } else {
    try {
      writeFileSync(derivedPath, derived.bytes, { flag: "wx" });
    } catch (error) {
      if (error && typeof error === "object" && error.code === "EEXIST") {
        fail("output_exists");
      }
      fail("output_write_error");
    }
  }

  const output = await hashFile(derivedPath);
  if (output.hasUtf8Bom || output.sha256 !== derivedSha256 || output.bytes !== derived.bytes.length) {
    fail("output_verification_error");
  }
  const roundTrip = await verifyRoundTrip(derivedPath, expectedHeaders);
  if (
    roundTrip.dataRows !== derived.statistics.selectedRows ||
    roundTrip.counterexampleRows !== 0
  ) {
    fail("output_verification_error");
  }

  return {
    mode: check ? "check" : "write-once",
    source: {
      sha256: source.sha256,
      bytes: source.bytes,
      dataRows: derived.statistics.sourceDataRows,
      fields: expectedHeaders.length,
      utf8Bom: source.hasUtf8Bom,
    },
    subset: {
      sha256: output.sha256,
      bytes: output.bytes,
      dataRows: derived.statistics.selectedRows,
      utf8Bom: output.hasUtf8Bom,
    },
    statistics: derived.statistics,
    roundTrip,
  };
}

function parseArguments(argv) {
  const parsed = {
    check: false,
    forceHashMismatch: false,
    source: sourcePath,
    expectedSha256: EXPECTED_SOURCE_SHA256,
    expectedDataRows: EXPECTED_SOURCE_DATA_ROWS,
    out: outputPath,
  };
  const seen = new Set();

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--check" || argument === "--force-hash-mismatch") {
      if (seen.has(argument)) {
        fail("argument_error");
      }
      seen.add(argument);
      if (argument === "--check") {
        parsed.check = true;
      } else {
        parsed.forceHashMismatch = true;
      }
      continue;
    }

    const valueFlags = new Map([
      ["--source", "source"],
      ["--expect-sha256", "expectedSha256"],
      ["--expect-rows", "expectedDataRows"],
      ["--out", "out"],
    ]);
    const property = valueFlags.get(argument);
    const value = argv[index + 1];
    if (property === undefined || value === undefined || value.startsWith("--") || seen.has(argument)) {
      fail("argument_error");
    }
    seen.add(argument);
    index += 1;

    if (property === "expectedSha256") {
      if (!/^[a-fA-F0-9]{64}$/u.test(value)) {
        fail("argument_error");
      }
      parsed.expectedSha256 = value.toLowerCase();
    } else if (property === "expectedDataRows") {
      if (!/^(0|[1-9]\d*)$/u.test(value)) {
        fail("argument_error");
      }
      const rows = Number(value);
      if (!Number.isSafeInteger(rows)) {
        fail("argument_error");
      }
      parsed.expectedDataRows = rows;
    } else {
      if (value.length === 0) {
        fail("argument_error");
      }
      parsed[property] = path.resolve(value);
    }
  }

  if (parsed.forceHashMismatch && seen.has("--expect-sha256")) {
    fail("argument_error");
  }
  return parsed;
}

export async function deriveSubsetFromArguments(argv) {
  const argumentsToUse = parseArguments(argv);
  const expectedSha256 = argumentsToUse.forceHashMismatch
    ? `${EXPECTED_SOURCE_SHA256.slice(0, -1)}0`
    : argumentsToUse.expectedSha256;

  return deriveSubsetFile({
    inputPath: argumentsToUse.source,
    derivedPath: argumentsToUse.out,
    expectedSha256,
    expectedHeaders: EXPECTED_HEADERS,
    expectedDataRows: argumentsToUse.expectedDataRows,
    check: argumentsToUse.check,
  });
}

async function main() {
  return deriveSubsetFromArguments(process.argv.slice(2));
}

const invokedAsScript =
  process.argv[1] !== undefined &&
  pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;

if (invokedAsScript) {
  try {
    const result = await main();
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } catch (error) {
    const safeError =
      error instanceof DerivationError ? error : new DerivationError("source_file_error");
    process.stderr.write(
      `${JSON.stringify({ ok: false, error: safeError.code, ...safeError.details })}\n`,
    );
    process.exitCode = 1;
  }
}
