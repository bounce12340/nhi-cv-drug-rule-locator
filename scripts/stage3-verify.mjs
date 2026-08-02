#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, statSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { TextDecoder } from "node:util";

const SAFE_ERROR_CODES = new Set([
  "argument_error",
  "csv_parse_error",
  "hash_mismatch",
  "manifest_error",
  "pdf_extraction_error",
  "source_file_error",
  "topology_error",
]);

class VerificationError extends Error {
  constructor(code, details = {}) {
    super(code);
    this.name = "VerificationError";
    this.code = SAFE_ERROR_CODES.has(code) ? code : "source_file_error";
    this.details = details;
  }
}

function fail(code, details = {}) {
  throw new VerificationError(code, details);
}

function parseArguments(argv) {
  if (argv.length !== 2 || argv[0] !== "--sources" || argv[1].length === 0) {
    fail("argument_error");
  }

  return path.resolve(argv[1]);
}

function readJson(filePath) {
  try {
    return JSON.parse(readFileSync(filePath, "utf8"));
  } catch {
    fail("manifest_error");
  }
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function resolveSourceFile(sourcesDirectory, stagedName) {
  if (
    typeof stagedName !== "string" ||
    stagedName.length === 0 ||
    path.basename(stagedName) !== stagedName
  ) {
    fail("manifest_error");
  }

  const resolved = path.resolve(sourcesDirectory, stagedName);
  if (path.dirname(resolved) !== sourcesDirectory) {
    fail("manifest_error");
  }

  try {
    if (!statSync(resolved).isFile()) {
      fail("source_file_error");
    }
  } catch (error) {
    if (error instanceof VerificationError) {
      throw error;
    }
    fail("source_file_error");
  }

  return resolved;
}

function validateManifest(manifest) {
  if (!isPlainObject(manifest) || !Array.isArray(manifest.files)) {
    fail("manifest_error");
  }

  if (manifest.files.length !== 6) {
    fail("manifest_error");
  }

  const stagedNames = new Set();
  const declaredNames = new Set();

  for (const entry of manifest.files) {
    if (
      !isPlainObject(entry) ||
      typeof entry.declaredName !== "string" ||
      entry.declaredName.length === 0 ||
      typeof entry.stagedName !== "string" ||
      !["csv", "pdf"].includes(entry.kind) ||
      typeof entry.expectedSha256 !== "string" ||
      !/^[a-f0-9]{64}$/iu.test(entry.expectedSha256)
    ) {
      fail("manifest_error");
    }

    if (stagedNames.has(entry.stagedName) || declaredNames.has(entry.declaredName)) {
      fail("manifest_error");
    }
    stagedNames.add(entry.stagedName);
    declaredNames.add(entry.declaredName);

    if (
      entry.kind === "csv" &&
      (!Number.isSafeInteger(entry.expectedDataRows) ||
        entry.expectedDataRows < 0 ||
        typeof entry.declaredParent !== "string" ||
        entry.declaredParent.length === 0)
    ) {
      fail("manifest_error");
    }

    if (
      entry.kind === "pdf" &&
      (!Number.isSafeInteger(entry.expectedPages) || entry.expectedPages < 1)
    ) {
      fail("manifest_error");
    }
  }
}

function readAndVerifyFiles(sourcesDirectory, entries) {
  const verified = [];

  for (let manifestIndex = 0; manifestIndex < entries.length; manifestIndex += 1) {
    const entry = entries[manifestIndex];
    const filePath = resolveSourceFile(sourcesDirectory, entry.stagedName);
    let bytes;
    try {
      bytes = readFileSync(filePath);
    } catch {
      fail("source_file_error", { manifestIndex });
    }

    const sha256 = createHash("sha256").update(bytes).digest("hex");
    if (sha256.toLowerCase() !== entry.expectedSha256.toLowerCase()) {
      fail("hash_mismatch", { manifestIndex });
    }

    verified.push({ entry, filePath, bytes, sha256, manifestIndex });
  }

  return verified;
}

function buildRoles(verifiedFiles) {
  const csvFiles = verifiedFiles.filter(({ entry }) => entry.kind === "csv");
  const pdfFiles = verifiedFiles.filter(({ entry }) => entry.kind === "pdf");
  if (csvFiles.length !== 4 || pdfFiles.length !== 2) {
    fail("topology_error");
  }

  const groups = new Map();
  for (const csvFile of csvFiles) {
    const parent = csvFile.entry.declaredParent;
    const group = groups.get(parent) ?? [];
    group.push(csvFile);
    groups.set(parent, group);
  }

  const grouped = [...groups.entries()].sort((left, right) =>
    left[0].localeCompare(right[0]),
  );
  const singleGroup = grouped.find(([, files]) => files.length === 1);
  const rulesGroup = grouped.find(([, files]) => files.length === 3);
  if (grouped.length !== 2 || !singleGroup || !rulesGroup) {
    fail("topology_error");
  }

  const resolveParent = ([parentReference]) => {
    const matches = pdfFiles.filter(({ entry }) =>
      entry.declaredName.startsWith(parentReference),
    );
    if (matches.length !== 1) {
      fail("topology_error");
    }
    return matches[0];
  };

  const sortedRules = [...rulesGroup[1]].sort(
    (left, right) =>
      left.entry.expectedDataRows - right.entry.expectedDataRows ||
      left.entry.declaredName.localeCompare(right.entry.declaredName),
  );
  if (
    new Set(sortedRules.map(({ entry }) => entry.expectedDataRows)).size !==
    sortedRules.length
  ) {
    fail("topology_error");
  }

  return {
    csv_p: singleGroup[1][0],
    csv_e1: sortedRules[0],
    csv_e2: sortedRules[1],
    csv_t2: sortedRules[2],
    pdf_a1: resolveParent(singleGroup),
    pdf_a2: resolveParent(rulesGroup),
  };
}

function decodeUtf8(bytes) {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    fail("csv_parse_error");
  }
}

function parseCsv(bytes) {
  let text = decodeUtf8(bytes);
  if (text.startsWith("\uFEFF")) {
    text = text.slice(1);
  }

  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  let justClosedQuote = false;

  const finishField = () => {
    row.push(field);
    field = "";
    justClosedQuote = false;
  };
  const finishRow = () => {
    finishField();
    rows.push(row);
    row = [];
  };

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];

    if (inQuotes) {
      if (character === '"') {
        if (text[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          inQuotes = false;
          justClosedQuote = true;
        }
      } else {
        field += character;
      }
      continue;
    }

    if (character === '"') {
      if (field.length !== 0 || justClosedQuote) {
        fail("csv_parse_error");
      }
      inQuotes = true;
    } else if (character === ",") {
      finishField();
    } else if (character === "\n") {
      finishRow();
    } else if (character === "\r") {
      if (text[index + 1] === "\n") {
        index += 1;
      }
      finishRow();
    } else {
      if (justClosedQuote) {
        fail("csv_parse_error");
      }
      field += character;
    }
  }

  if (inQuotes) {
    fail("csv_parse_error");
  }
  if (field.length > 0 || row.length > 0 || justClosedQuote) {
    finishRow();
  }

  if (rows.length === 0 || rows[0].length === 0) {
    fail("csv_parse_error");
  }
  return rows;
}

function normalizeCode(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/gu, "");
}

function hasSurfaceFormat(value) {
  return /^[A-Z0-9]{10}$/u.test(value);
}

function detectCodeColumn(dataRows, headerColumnCount) {
  const scores = Array.from({ length: headerColumnCount }, (_, columnIndex) => ({
    columnIndex,
    validCount: dataRows.reduce(
      (count, row) =>
        count + (hasSurfaceFormat(normalizeCode(row[columnIndex])) ? 1 : 0),
      0,
    ),
  })).sort(
    (left, right) =>
      right.validCount - left.validCount || left.columnIndex - right.columnIndex,
  );

  if (
    scores.length === 0 ||
    scores[0].validCount === 0 ||
    (scores[1] && scores[1].validCount === scores[0].validCount)
  ) {
    fail("csv_parse_error");
  }
  return scores[0].columnIndex;
}

function analyzeCsv(file, fileId) {
  const rows = parseCsv(file.bytes);
  const header = rows[0];
  const dataRows = rows.slice(1);
  const headerColumnCount = header.length;
  const codeColumnIndex = detectCodeColumn(dataRows, headerColumnCount);
  const normalizedCodes = dataRows.map((row) => normalizeCode(row[codeColumnIndex]));
  const invalidDataRowNumbers = normalizedCodes.flatMap((code, index) =>
    hasSurfaceFormat(code) ? [] : [index + 1],
  );
  const malformedDataRowNumbers = dataRows.flatMap((row, index) =>
    row.length === headerColumnCount ? [] : [index + 1],
  );

  const requiredFields = Array.from(
    { length: headerColumnCount },
    (_, columnIndex) => ({
      fieldIndex: columnIndex + 1,
      emptyCount: dataRows.reduce(
        (count, row) => count + (String(row[columnIndex] ?? "").trim() === "" ? 1 : 0),
        0,
      ),
    }),
  );
  const requiredEmptyCount = requiredFields.reduce(
    (count, field) => count + field.emptyCount,
    0,
  );

  const codeCounts = new Map();
  for (const code of normalizedCodes) {
    if (code === "") {
      continue;
    }
    codeCounts.set(code, (codeCounts.get(code) ?? 0) + 1);
  }
  const duplicateCodeGroupCount = [...codeCounts.values()].filter(
    (count) => count > 1,
  ).length;
  const duplicateCodeRowCount = [...codeCounts.values()].reduce(
    (count, occurrences) => count + Math.max(0, occurrences - 1),
    0,
  );
  const validCodeCount = normalizedCodes.length - invalidDataRowNumbers.length;

  return {
    fileId,
    expectedDataRowCount: file.entry.expectedDataRows,
    actualDataRowCount: dataRows.length,
    dataRowCountMatches: dataRows.length === file.entry.expectedDataRows,
    headerColumnCount,
    malformedRowCount: malformedDataRowNumbers.length,
    malformedDataRowNumbers,
    allRowsHaveHeaderColumnCount: malformedDataRowNumbers.length === 0,
    requiredFieldCount: headerColumnCount,
    requiredEmptyCount,
    requiredFields,
    duplicateCodeGroupCount,
    duplicateCodeRowCount,
    normalizedSurfaceFormat: {
      validCount: validCodeCount,
      invalidCount: invalidDataRowNumbers.length,
      totalCount: normalizedCodes.length,
      validRatio:
        normalizedCodes.length === 0 ? 0 : validCodeCount / normalizedCodes.length,
      invalidDataRowNumbers,
    },
    normalizedCodes,
  };
}

function intersectCount(leftCodes, rightCodes) {
  const left = new Set(leftCodes.filter(Boolean));
  const right = new Set(rightCodes.filter(Boolean));
  let count = 0;
  for (const code of left) {
    if (right.has(code)) {
      count += 1;
    }
  }
  return count;
}

function extractPdfText(file) {
  const result = spawnSync(
    "pdftotext",
    ["-enc", "UTF-8", file.filePath, "-"],
    {
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
      windowsHide: true,
    },
  );

  if (result.status !== 0 || typeof result.stdout !== "string") {
    fail("pdf_extraction_error");
  }
  return result.stdout;
}

function compareCodesWithPdf(normalizedCodes, pdfText) {
  const searchableText = pdfText.normalize("NFKC").toUpperCase();
  const missingDataRowNumbers = [];
  let foundCount = 0;

  for (let index = 0; index < normalizedCodes.length; index += 1) {
    const code = normalizedCodes[index];
    if (code !== "" && searchableText.includes(code)) {
      foundCount += 1;
    } else {
      missingDataRowNumbers.push(index + 1);
    }
  }

  return {
    foundCount,
    missingCount: missingDataRowNumbers.length,
    totalCount: normalizedCodes.length,
    allFound: missingDataRowNumbers.length === 0,
    missingDataRowNumbers,
  };
}

function countOccurrences(text, searchValue) {
  let count = 0;
  let offset = 0;
  while (true) {
    const index = text.indexOf(searchValue, offset);
    if (index === -1) {
      return count;
    }
    count += 1;
    offset = index + searchValue.length;
  }
}

function getPdftotextVersion() {
  const result = spawnSync("pdftotext", ["-v"], {
    encoding: "utf8",
    windowsHide: true,
  });
  if (result.status !== 0) {
    fail("pdf_extraction_error");
  }
  const versionOutput = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
  const match = versionOutput.match(/pdftotext version ([^\s]+)/u);
  if (!match) {
    fail("pdf_extraction_error");
  }
  return match[1];
}

function publicCsvResult(result) {
  const { normalizedCodes: _normalizedCodes, ...publicResult } = result;
  return publicResult;
}

function integrityEntry(fileId, file) {
  return {
    fileId,
    sha256Prefix: file.sha256.slice(0, 12),
    matches: true,
  };
}

function determineRecommendation(
  csvResults,
  pdfPageChecks,
  parentComparisons,
  labelOccurrences,
) {
  const structureRequiresReview = csvResults.some(
    (result) =>
      !result.dataRowCountMatches ||
      !result.allRowsHaveHeaderColumnCount ||
      result.requiredEmptyCount !== 0 ||
      result.duplicateCodeRowCount !== 0 ||
      result.normalizedSurfaceFormat.invalidCount !== 0,
  );
  const parentComparisonRequiresReview = Object.values(parentComparisons).some(
    (comparison) => !comparison.allFound,
  );
  const pdfPageCountRequiresReview = Object.values(pdfPageChecks).some(
    (check) => !check.pageCountMatches,
  );

  if (
    structureRequiresReview ||
    pdfPageCountRequiresReview ||
    parentComparisonRequiresReview
  ) {
    return {
      recommendation: "MANUAL_REVIEW_REQUIRED",
      structuralChecksPassed: !structureRequiresReview,
      pdfPageChecksPassed: !pdfPageCountRequiresReview,
      parentComparisonsPassed: !parentComparisonRequiresReview,
      attachment2LabelCheckPassed:
        labelOccurrences.tableOne > 0 && labelOccurrences.tableTwo > 0,
    };
  }

  const labelCheckPassed =
    labelOccurrences.tableOne > 0 && labelOccurrences.tableTwo > 0;
  return {
    recommendation: labelCheckPassed ? "ACCEPTED" : "ACCEPTED_WITH_WARNING",
    structuralChecksPassed: true,
    pdfPageChecksPassed: true,
    parentComparisonsPassed: true,
    attachment2LabelCheckPassed: labelCheckPassed,
  };
}

function main() {
  const sourcesDirectory = parseArguments(process.argv.slice(2));
  const manifest = readJson(path.join(sourcesDirectory, "manifest.json"));
  validateManifest(manifest);

  // Integrity is deliberately completed before parsing or extracting any payload.
  const verifiedFiles = readAndVerifyFiles(sourcesDirectory, manifest.files);
  const roles = buildRoles(verifiedFiles);

  const csvResults = {
    csv_e1: analyzeCsv(roles.csv_e1, "CSV-E1"),
    csv_e2: analyzeCsv(roles.csv_e2, "CSV-E2"),
    csv_p: analyzeCsv(roles.csv_p, "CSV-P"),
    csv_t2: analyzeCsv(roles.csv_t2, "CSV-T2"),
  };

  const pdfTextA1 = extractPdfText(roles.pdf_a1);
  const pdfTextA2 = extractPdfText(roles.pdf_a2);

  const pdfPageChecks = {
    pdfA1: {
      fileId: "PDF-A1",
      expectedPageCount: roles.pdf_a1.entry.expectedPages,
      extractedPageCount: countOccurrences(pdfTextA1, "\f"),
      pageCountMatches:
        countOccurrences(pdfTextA1, "\f") === roles.pdf_a1.entry.expectedPages,
    },
    pdfA2: {
      fileId: "PDF-A2",
      expectedPageCount: roles.pdf_a2.entry.expectedPages,
      extractedPageCount: countOccurrences(pdfTextA2, "\f"),
      pageCountMatches:
        countOccurrences(pdfTextA2, "\f") === roles.pdf_a2.entry.expectedPages,
    },
  };

  const parentComparisons = {
    csvPAgainstPdfA1: compareCodesWithPdf(
      csvResults.csv_p.normalizedCodes,
      pdfTextA1,
    ),
    csvE1AgainstPdfA2: compareCodesWithPdf(
      csvResults.csv_e1.normalizedCodes,
      pdfTextA2,
    ),
    csvE2AgainstPdfA2: compareCodesWithPdf(
      csvResults.csv_e2.normalizedCodes,
      pdfTextA2,
    ),
    csvT2AgainstPdfA2: compareCodesWithPdf(
      csvResults.csv_t2.normalizedCodes,
      pdfTextA2,
    ),
  };

  const labelOccurrences = {
    tableOne: countOccurrences(pdfTextA2, "\u8868\u4e00"),
    tableTwo: countOccurrences(pdfTextA2, "\u8868\u4e8c"),
  };

  const exceptionUnion = [
    ...new Set([
      ...csvResults.csv_e1.normalizedCodes,
      ...csvResults.csv_e2.normalizedCodes,
    ]),
  ];
  const crossFileChecks = {
    exceptionListIntersectionCount: intersectCount(
      csvResults.csv_e1.normalizedCodes,
      csvResults.csv_e2.normalizedCodes,
    ),
    exceptionUnionWithTable2IntersectionCount: intersectCount(
      exceptionUnion,
      csvResults.csv_t2.normalizedCodes,
    ),
    exception1WithTable2IntersectionCount: intersectCount(
      csvResults.csv_e1.normalizedCodes,
      csvResults.csv_t2.normalizedCodes,
    ),
    exception2WithTable2IntersectionCount: intersectCount(
      csvResults.csv_e2.normalizedCodes,
      csvResults.csv_t2.normalizedCodes,
    ),
    priceWithException1IntersectionCount: intersectCount(
      csvResults.csv_p.normalizedCodes,
      csvResults.csv_e1.normalizedCodes,
    ),
    priceWithException2IntersectionCount: intersectCount(
      csvResults.csv_p.normalizedCodes,
      csvResults.csv_e2.normalizedCodes,
    ),
    priceWithTable2IntersectionCount: intersectCount(
      csvResults.csv_p.normalizedCodes,
      csvResults.csv_t2.normalizedCodes,
    ),
  };

  const orderedIntegrityEntries = [
    integrityEntry("CSV-E1", roles.csv_e1),
    integrityEntry("CSV-E2", roles.csv_e2),
    integrityEntry("CSV-P", roles.csv_p),
    integrityEntry("CSV-T2", roles.csv_t2),
    integrityEntry("PDF-A1", roles.pdf_a1),
    integrityEntry("PDF-A2", roles.pdf_a2),
  ];
  const recommendation = determineRecommendation(
    Object.values(csvResults),
    pdfPageChecks,
    parentComparisons,
    labelOccurrences,
  );

  const output = {
    environment: {
      node: process.version,
      platform: process.platform,
      architecture: process.arch,
      pdftotext: getPdftotextVersion(),
    },
    integrity: {
      expectedFileCount: manifest.files.length,
      verifiedFileCount: verifiedFiles.length,
      allMatch: true,
      files: orderedIntegrityEntries,
    },
    csv: [
      publicCsvResult(csvResults.csv_e1),
      publicCsvResult(csvResults.csv_e2),
      publicCsvResult(csvResults.csv_p),
      publicCsvResult(csvResults.csv_t2),
    ],
    pdf: Object.values(pdfPageChecks),
    crossFileChecks,
    parentComparisons,
    attachment2LabelOccurrences: labelOccurrences,
    conclusion: recommendation,
  };

  process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
}

try {
  main();
} catch (error) {
  const safeError =
    error instanceof VerificationError
      ? error
      : new VerificationError("source_file_error");
  process.stderr.write(
    `${JSON.stringify({ ok: false, error: safeError.code, ...safeError.details })}\n`,
  );
  process.exitCode = 1;
}
