#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { TextDecoder } from "node:util";

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const REPO_ROOT = path.dirname(path.dirname(SCRIPT_PATH));
const GOVERNED_DIRECTORY = path.join(
  REPO_ROOT,
  "data",
  "governed",
  "nhi-lipid-rules-2026-09-01-r1",
);
const PDF_NAME = "attachment-2-rule-revision-table.pdf";
const MANIFEST_PATH = path.join(GOVERNED_DIRECTORY, "storage-manifest.json");
const SCRATCH_DIRECTORY =
  "/tmp/claude-0/-home-user-nhi-cv-drug-rule-locator/94f9d3c6-80d2-5a5b-9756-182a30351591/scratchpad/derived";
const REPORT_PATH = path.join(
  REPO_ROOT,
  "docs",
  "stage3",
  "rules-transcription-t3-report.md",
);
const PDFTOTEXT_PATH = "/usr/bin/pdftotext";
const EXPECTED_PAGE_COUNT = 13;
const EXPECTED_SECTIONS = ["2.6.1", "2.6.2", "2.6.3"];
const TABLE_LABELS = ["表一", "表二", "無"];
const UNIT_TYPES = ["表題", "資料列", "定義項", "條文", "註"];
const EFFECTIVE_FROM = "2026-09-01";
const MIN_FRAGMENT_CODE_POINTS = 12;

const INPUTS = [
  {
    id: 1,
    kind: "PDF",
    path: path.join(GOVERNED_DIRECTORY, PDF_NAME),
    expected:
      "6389a5f654e0cb755d006f04ed47eca6ada9f867873f43c5088f79db6bb6c1c2",
  },
  {
    id: 2,
    kind: "JSONL",
    path: path.join(SCRATCH_DIRECTORY, "rules-structured-draft.jsonl"),
    expected:
      "9aa028b9f6036b9727d80186f37eb40695dca12ff61540c2ff5319b359227117",
  },
  {
    id: 3,
    kind: "CANDIDATE-261",
    section: "2.6.1",
    path: path.join(SCRATCH_DIRECTORY, "new-261-candidate.txt"),
    expected:
      "8b178837c8315b36cac0faf4570f0cb85d2e12bf077bff12e1061667386275f1",
  },
  {
    id: 4,
    kind: "CANDIDATE-262",
    section: "2.6.2",
    path: path.join(SCRATCH_DIRECTORY, "new-262-candidate.txt"),
    expected:
      "a3c84db384bdecaebed4a4d78e40fa20bd1054ca5897050840dd545999c175f3",
  },
  {
    id: 5,
    kind: "CANDIDATE-263",
    section: "2.6.3",
    path: path.join(SCRATCH_DIRECTORY, "new-263-candidate.txt"),
    expected:
      "57fef95e8fd577211d24258d6a4b50a25df54ec0ea6f185009f1ce8d2c1fe3dd",
  },
];

const SAFE_ERROR_CODES = new Set([
  "argument_error",
  "document_topology_error",
  "hash_mismatch",
  "input_read_error",
  "manifest_error",
  "pdf_extraction_error",
  "report_conflict",
  "report_safety_error",
  "report_write_error",
]);

class VerificationError extends Error {
  constructor(code, detail = "") {
    super(code);
    this.name = "VerificationError";
    this.code = SAFE_ERROR_CODES.has(code) ? code : "input_read_error";
    this.detail = /^[0-9,-]*$/u.test(detail) ? detail : "";
  }
}

function fail(code, detail = "") {
  throw new VerificationError(code, detail);
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function countCodePoints(text) {
  return [...text].length;
}

function normalizeComparable(text) {
  return text
    .normalize("NFKC")
    .toLocaleLowerCase("en-US")
    .replace(/[\p{White_Space}\p{Punctuation}\p{Symbol}]+/gu, "");
}

function parseArguments(argv) {
  if (argv.length === 0) {
    return { forcedInput: null };
  }
  if (
    argv.length === 2 &&
    argv[0] === "--force-hash-mismatch" &&
    /^[1-5]$/u.test(argv[1])
  ) {
    return { forcedInput: Number(argv[1]) };
  }
  fail("argument_error");
}

function alteredHash(hash) {
  return `${hash[0] === "0" ? "1" : "0"}${hash.slice(1)}`;
}

function readInputBytes(input) {
  try {
    if (!statSync(input.path).isFile()) {
      fail("input_read_error", String(input.id));
    }
    return readFileSync(input.path);
  } catch (error) {
    if (error instanceof VerificationError) {
      throw error;
    }
    fail("input_read_error", String(input.id));
  }
}

function readManifestHash() {
  let manifest;
  try {
    manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf8"));
  } catch {
    fail("manifest_error");
  }
  const matches = Array.isArray(manifest.files)
    ? manifest.files.filter((entry) => entry?.declaredName === PDF_NAME)
    : [];
  if (
    matches.length !== 1 ||
    typeof matches[0].sha256 !== "string" ||
    !/^[0-9a-f]{64}$/u.test(matches[0].sha256)
  ) {
    fail("manifest_error");
  }
  return matches[0].sha256;
}

function verifyHashGate(forcedInput) {
  const verified = INPUTS.map((input) => {
    const bytes = readInputBytes(input);
    const actual = sha256(bytes);
    const gateExpected =
      forcedInput === input.id ? alteredHash(input.expected) : input.expected;
    return { ...input, bytes, actual, gateExpected };
  });
  const manifestSha256 = readManifestHash();
  const mismatches = verified
    .filter(
      (input) =>
        input.actual !== input.gateExpected ||
        (input.id === 1 &&
          (input.actual !== manifestSha256 ||
            input.gateExpected !== manifestSha256)),
    )
    .map((input) => input.id);
  if (mismatches.length > 0) {
    fail("hash_mismatch", mismatches.join(","));
  }
  return { inputs: verified, manifestSha256 };
}

function extractTsv(pdfPath) {
  const result = spawnSync(
    PDFTOTEXT_PATH,
    ["-tsv", "-enc", "UTF-8", pdfPath, "-"],
    {
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
      windowsHide: true,
    },
  );
  if (result.status !== 0 || typeof result.stdout !== "string") {
    fail("pdf_extraction_error");
  }
  return result.stdout.replaceAll("\r\n", "\n").replaceAll("\r", "\n");
}

function parseTsv(tsvText) {
  const rows = tsvText
    .split("\n")
    .slice(1)
    .filter(Boolean)
    .map((line) => {
      const fields = line.split("\t");
      if (fields.length < 12) {
        fail("pdf_extraction_error");
      }
      return {
        level: Number(fields[0]),
        page: Number(fields[1]),
        paragraph: Number(fields[2]),
        block: Number(fields[3]),
        line: Number(fields[4]),
        word: Number(fields[5]),
        left: Number(fields[6]),
        top: Number(fields[7]),
        width: Number(fields[8]),
        text: fields.slice(11).join("\t"),
      };
    });
  if (
    rows.some((row) =>
      [
        row.level,
        row.page,
        row.paragraph,
        row.block,
        row.line,
        row.word,
        row.left,
        row.top,
        row.width,
      ].some((value) => !Number.isFinite(value)),
    )
  ) {
    fail("pdf_extraction_error");
  }

  const pageWidths = new Map(
    rows
      .filter((row) => row.level === 1)
      .map((row) => [row.page, row.width]),
  );
  if (pageWidths.size !== EXPECTED_PAGE_COUNT) {
    fail("document_topology_error");
  }

  const groups = new Map();
  for (const row of rows.filter((entry) => entry.level === 5)) {
    const pageWidth = pageWidths.get(row.page);
    if (!Number.isFinite(pageWidth)) {
      fail("pdf_extraction_error");
    }
    const side = row.left >= pageWidth / 2 ? "right" : "left";
    const key = [row.page, row.paragraph, row.block, row.line, side].join(":");
    const group = groups.get(key) ?? {
      page: row.page,
      top: row.top,
      left: row.left,
      side,
      words: [],
    };
    group.top = Math.min(group.top, row.top);
    group.left = Math.min(group.left, row.left);
    group.words.push(row);
    groups.set(key, group);
  }

  const lines = [...groups.values()]
    .map((group) => ({
      page: group.page,
      top: group.top,
      left: group.left,
      side: group.side,
      text: group.words
        .sort(
          (left, right) => left.left - right.left || left.word - right.word,
        )
        .map((word) => word.text)
        .join(" "),
    }))
    .sort(
      (left, right) =>
        left.page - right.page ||
        left.top - right.top ||
        left.left - right.left,
    );
  return { lines };
}

function sectionIdFromText(text) {
  return text.match(/\b(2\.6\.[123])\b/u)?.[1] ?? null;
}

function comparePosition(line, position) {
  return line.page - position.page || line.top - position.top;
}

function inventorySectionStarts(lines) {
  const starts = [];
  const seen = new Set();
  for (const line of lines.filter((entry) => entry.side === "left")) {
    const section = sectionIdFromText(line.text);
    if (section && !seen.has(section)) {
      seen.add(section);
      starts.push({ section, page: line.page, top: line.top });
    }
  }
  if (
    starts.length !== EXPECTED_SECTIONS.length ||
    starts.some((start, index) => start.section !== EXPECTED_SECTIONS[index])
  ) {
    fail("document_topology_error");
  }
  return starts;
}

function locateRepeatedColumnHeading(lines, side) {
  const fingerprints = new Map();
  for (const line of lines.filter((entry) => entry.side === side)) {
    const fingerprint = normalizeComparable(line.text);
    if (fingerprint.length === 0) {
      continue;
    }
    const item = fingerprints.get(fingerprint) ?? { count: 0, pages: new Set() };
    item.count += 1;
    item.pages.add(line.page);
    fingerprints.set(fingerprint, item);
  }
  const matches = [...fingerprints.entries()].filter(
    ([, item]) =>
      item.count === EXPECTED_PAGE_COUNT &&
      item.pages.size === EXPECTED_PAGE_COUNT,
  );
  if (matches.length !== 1) {
    fail("document_topology_error");
  }
  return matches[0][0];
}

function extractSections(tsvData) {
  const starts = inventorySectionStarts(tsvData.lines);
  const correctedColumnSide = "left";
  const headingFingerprint = locateRepeatedColumnHeading(
    tsvData.lines,
    correctedColumnSide,
  );
  const expectedPageRanges = [
    [1, 11],
    [12, 12],
    [12, 13],
  ];

  return starts.map((start, index) => {
    const next = starts[index + 1] ?? null;
    const sourceLines = tsvData.lines.filter(
      (line) =>
        line.side === correctedColumnSide &&
        comparePosition(line, start) >= 0 &&
        (next === null || comparePosition(line, next) < 0),
    );
    const removedHeadingCount = sourceLines.filter(
      (line) => normalizeComparable(line.text) === headingFingerprint,
    ).length;
    const lines = sourceLines
      .filter((line) => normalizeComparable(line.text) !== headingFingerprint)
      .map((line) => ({
        page: line.page,
        text: line.text.normalize("NFKC").trim(),
      }))
      .filter((line) => line.text.length > 0);
    if (lines.length === 0) {
      fail("document_topology_error");
    }
    const pageStart = Math.min(...lines.map((line) => line.page));
    const pageEnd = Math.max(...lines.map((line) => line.page));
    if (
      pageStart !== expectedPageRanges[index][0] ||
      pageEnd !== expectedPageRanges[index][1]
    ) {
      fail("document_topology_error");
    }
    return {
      section: start.section,
      pageStart,
      pageEnd,
      removedHeadingCount,
      lines,
    };
  });
}

function decodeUtf8(bytes) {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
}

function parseJsonl(bytes) {
  const text = decodeUtf8(bytes);
  const utf8 = text !== null;
  const bom = utf8 && text.startsWith("\uFEFF");
  const cr = utf8 && text.includes("\r");
  const finalLf = utf8 && text.endsWith("\n");
  const rawLines =
    utf8 && finalLf ? text.slice(0, -1).split("\n") : utf8 ? text.split("\n") : [];
  const blankLines = rawLines.filter((line) => line.length === 0).length;
  const records = rawLines.map((line, index) => {
    if (line.length === 0) {
      return { index: index + 1, value: null };
    }
    try {
      const value = JSON.parse(line);
      return {
        index: index + 1,
        value:
          typeof value === "object" && value !== null && !Array.isArray(value)
            ? value
            : null,
      };
    } catch {
      return { index: index + 1, value: null };
    }
  });
  return { utf8, bom, cr, finalLf, blankLines, records };
}

function hasRequiredFields(unit) {
  if (unit === null) {
    return false;
  }
  const commonFields = [
    "unit_id",
    "section",
    "table_label",
    "clause_path",
    "unit_type",
    "verbatim_text",
    "effective_from",
    "source_anchor",
    "unit_sha256",
  ];
  const common = commonFields.every((field) => Object.hasOwn(unit, field));
  const rowFields =
    unit.unit_type !== "資料列" ||
    (Object.hasOwn(unit, "row_index") &&
      Object.hasOwn(unit, "column_labels"));
  return common && rowFields;
}

function unitShapeMatches(unit, lineCounts) {
  if (unit === null) {
    return false;
  }
  const idMatch =
    typeof unit.unit_id === "string"
      ? unit.unit_id.match(/^(2\.6\.[123])-[0-9]{3,}$/u)
      : null;
  const anchor = unit.source_anchor;
  return (
    idMatch !== null &&
    idMatch[1] === unit.section &&
    EXPECTED_SECTIONS.includes(unit.section) &&
    TABLE_LABELS.includes(unit.table_label) &&
    Array.isArray(unit.clause_path) &&
    unit.clause_path.every((part) => typeof part === "string") &&
    UNIT_TYPES.includes(unit.unit_type) &&
    typeof unit.verbatim_text === "string" &&
    unit.verbatim_text.length > 0 &&
    unit.verbatim_text === unit.verbatim_text.normalize("NFKC") &&
    !unit.verbatim_text.includes("\r") &&
    !unit.verbatim_text.startsWith("\uFEFF") &&
    unit.effective_from === EFFECTIVE_FROM &&
    typeof unit.unit_sha256 === "string" &&
    /^[0-9a-f]{64}$/u.test(unit.unit_sha256) &&
    typeof anchor === "object" &&
    anchor !== null &&
    !Array.isArray(anchor) &&
    Number.isInteger(anchor.page) &&
    Number.isInteger(anchor.line_start) &&
    Number.isInteger(anchor.line_end) &&
    anchor.line_start >= 1 &&
    anchor.line_end >= anchor.line_start &&
    anchor.line_end <= lineCounts.get(unit.section) &&
    (unit.unit_type !== "資料列" ||
      (Number.isInteger(unit.row_index) &&
        unit.row_index >= 1 &&
        Array.isArray(unit.column_labels) &&
        unit.column_labels.length > 0 &&
        unit.column_labels.every(
          (label) =>
            typeof label === "string" &&
            label.length > 0 &&
            label === label.normalize("NFKC"),
        )))
  );
}

function validateSchema(parsed, sections) {
  const total = parsed.records.length;
  const lineCounts = new Map(
    sections.map((section) => [section.section, section.lines.length]),
  );
  const values = parsed.records.map((record) => record.value);
  const parsedObjects = values.filter((unit) => unit !== null).length;
  const requiredComplete = values.filter(hasRequiredFields).length;
  const hashesMatch = values.filter(
    (unit) =>
      typeof unit?.verbatim_text === "string" &&
      typeof unit?.unit_sha256 === "string" &&
      sha256(Buffer.from(unit.verbatim_text, "utf8")) === unit.unit_sha256,
  ).length;
  const shapesMatch = values.filter((unit) =>
    unitShapeMatches(unit, lineCounts),
  ).length;
  const idFrequencies = new Map();
  for (const unit of values) {
    if (typeof unit?.unit_id === "string") {
      idFrequencies.set(
        unit.unit_id,
        (idFrequencies.get(unit.unit_id) ?? 0) + 1,
      );
    }
  }
  const uniqueIds = values.filter(
    (unit) =>
      typeof unit?.unit_id === "string" &&
      idFrequencies.get(unit.unit_id) === 1,
  ).length;
  const encodingPass =
    parsed.utf8 && !parsed.bom && !parsed.cr && parsed.finalLf && parsed.blankLines === 0;
  const pass =
    total > 0 &&
    encodingPass &&
    parsedObjects === total &&
    requiredComplete === total &&
    hashesMatch === total &&
    shapesMatch === total &&
    uniqueIds === total;
  return {
    ...parsed,
    total,
    values,
    parsedObjects,
    requiredComplete,
    hashesMatch,
    shapesMatch,
    uniqueIds,
    encodingPass,
    pass,
  };
}

function validAnchor(anchor, lineCount) {
  return (
    typeof anchor === "object" &&
    anchor !== null &&
    Number.isInteger(anchor.page) &&
    Number.isInteger(anchor.line_start) &&
    Number.isInteger(anchor.line_end) &&
    anchor.line_start >= 1 &&
    anchor.line_end >= anchor.line_start &&
    anchor.line_end <= lineCount
  );
}

function verifyPartitions(schema, sections) {
  return sections.map((sectionData) => {
    const units = schema.values.filter(
      (unit) => unit?.section === sectionData.section,
    );
    const coverage = Array.from(
      { length: sectionData.lines.length },
      () => 0,
    );
    let outOfBounds = 0;
    let pageMismatches = 0;
    let orderViolations = 0;
    let previousStart = 0;
    for (const unit of units) {
      const anchor = unit?.source_anchor;
      if (!validAnchor(anchor, sectionData.lines.length)) {
        outOfBounds += 1;
        continue;
      }
      if (anchor.line_start < previousStart) {
        orderViolations += 1;
      }
      previousStart = anchor.line_start;
      if (anchor.page !== sectionData.lines[anchor.line_start - 1].page) {
        pageMismatches += 1;
      }
      for (
        let lineIndex = anchor.line_start;
        lineIndex <= anchor.line_end;
        lineIndex += 1
      ) {
        coverage[lineIndex - 1] += 1;
      }
    }
    const gaps = coverage.filter((count) => count === 0).length;
    const overlaps = coverage.filter((count) => count > 1).length;
    const pass =
      units.length > 0 &&
      gaps === 0 &&
      overlaps === 0 &&
      outOfBounds === 0 &&
      pageMismatches === 0 &&
      orderViolations === 0;
    return {
      section: sectionData.section,
      pageStart: sectionData.pageStart,
      pageEnd: sectionData.pageEnd,
      logicalLines: sectionData.lines.length,
      removedHeadingCount: sectionData.removedHeadingCount,
      units,
      gaps,
      overlaps,
      outOfBounds,
      pageMismatches,
      orderViolations,
      pass,
    };
  });
}

function compareLogicalLines(leftText, rightText) {
  const leftLines = leftText.split("\n");
  const rightLines = rightText.split("\n");
  const length = Math.max(leftLines.length, rightLines.length);
  let first = 0;
  let count = 0;
  for (let index = 0; index < length; index += 1) {
    if (leftLines[index] !== rightLines[index]) {
      count += 1;
      if (first === 0) {
        first = index + 1;
      }
    }
  }
  return { first, count };
}

function verifyRoundTrips(partitions, sections) {
  return partitions.map((partition) => {
    const sectionData = sections.find(
      (section) => section.section === partition.section,
    );
    const eligible = partition.units.every(
      (unit) =>
        validAnchor(unit?.source_anchor, sectionData.lines.length) &&
        typeof unit?.verbatim_text === "string",
    );
    const orderedUnits = [...partition.units].sort(
      (left, right) =>
        (left.source_anchor?.line_start ?? Number.MAX_SAFE_INTEGER) -
          (right.source_anchor?.line_start ?? Number.MAX_SAFE_INTEGER) ||
        (left.source_anchor?.line_end ?? Number.MAX_SAFE_INTEGER) -
          (right.source_anchor?.line_end ?? Number.MAX_SAFE_INTEGER),
    );
    const sourceText = sectionData.lines
      .map((line) => line.text)
      .join("\n")
      .normalize("NFKC");
    const assembledText = eligible
      ? orderedUnits
          .map((unit) => unit.verbatim_text)
          .join("\n")
          .normalize("NFKC")
      : "";
    const equal =
      eligible &&
      Buffer.from(sourceText, "utf8").equals(
        Buffer.from(assembledText, "utf8"),
      );
    const divergence = compareLogicalLines(sourceText, assembledText);
    return {
      section: partition.section,
      sourceText,
      assembledText,
      sourceCharacters: countCodePoints(sourceText.replaceAll("\n", "")),
      assembledCharacters: countCodePoints(
        assembledText.replaceAll("\n", ""),
      ),
      equal,
      firstDivergenceLine: divergence.first,
      divergentLineCount: divergence.count,
    };
  });
}

function verifyCandidates(hashGate, roundTrips) {
  return INPUTS.filter((input) => input.section).map((definition) => {
    const input = hashGate.inputs.find((item) => item.id === definition.id);
    const roundTrip = roundTrips.find(
      (item) => item.section === definition.section,
    );
    const assembled = Buffer.from(`${roundTrip.assembledText}\n`, "utf8");
    return {
      id: definition.id,
      kind: definition.kind,
      section: definition.section,
      equal: roundTrip.equal && assembled.equals(input.bytes),
    };
  });
}

function countMatches(text, pattern) {
  return (text.match(pattern) ?? []).length;
}

function countLongInputFragments(artifactText, inputTexts) {
  const normalizedArtifact = normalizeComparable(artifactText);
  const hits = new Set();
  for (const inputText of inputTexts) {
    for (const line of inputText.split("\n")) {
      const normalizedLine = normalizeComparable(line);
      if (
        countCodePoints(normalizedLine) >= MIN_FRAGMENT_CODE_POINTS &&
        normalizedArtifact.includes(normalizedLine)
      ) {
        hits.add(normalizedLine);
      }
    }
  }
  return hits.size;
}

function scanArtifactSafety(scriptText, reportText, inputTexts) {
  const measurementStyle =
    /[0-9]\s*(?:[mM][gG]|[mM][mM][oO][lL])(?:\s*[/／]\s*[dD]?[lL])?/gu;
  const governedCodeShape = /[A-B][A-Z0-9][0-9]{8}/gu;
  const percentageSign = String.fromCodePoint(37);
  return {
    reportMeasurementHits: countMatches(reportText, measurementStyle),
    scriptMeasurementHits: countMatches(scriptText, measurementStyle),
    reportPercentageHits: reportText.split(percentageSign).length - 1,
    scriptPercentageHits: scriptText.split(percentageSign).length - 1,
    reportGovernedCodeHits: countMatches(reportText, governedCodeShape),
    scriptGovernedCodeHits: countMatches(scriptText, governedCodeShape),
    reportPayloadKeyHits: countMatches(
      reportText,
      /verbatim_text|column_labels/gu,
    ),
    reportLongInputHits: countLongInputFragments(reportText, inputTexts),
    scriptLongInputHits: countLongInputFragments(scriptText, inputTexts),
  };
}

function safetyPassed(safety) {
  return Object.values(safety).every((value) => value === 0);
}

function ratio(numerator, denominator) {
  return denominator === 0 ? "0.000000" : (numerator / denominator).toFixed(6);
}

function booleanResult(value) {
  return value ? "PASS" : "FAIL";
}

function pageRange(start, end) {
  return start === end ? `${start}` : `${start}–${end}`;
}

function renderReport(data) {
  const hashRows = [
    `| INPUT-1 派工單期望 | \`${INPUTS[0].expected}\` | MATCH |`,
    `| INPUT-1 storage-manifest 宣告 | \`${data.hashGate.manifestSha256}\` | MATCH |`,
    `| INPUT-1 原始位元組實算 | \`${data.hashGate.inputs[0].actual}\` | MATCH |`,
    ...data.hashGate.inputs
      .slice(1)
      .map(
        (input) =>
          `| INPUT-${input.id} 原始位元組實算 | \`${input.actual}\` | MATCH |`,
      ),
  ].join("\n");
  const partitionRows = data.partitions
    .map(
      (item) =>
        `| ${item.section} | ${pageRange(item.pageStart, item.pageEnd)} | ${item.logicalLines} | ${item.units.length} | ${item.gaps} | ${item.overlaps} | ${item.outOfBounds} | ${item.pageMismatches} | ${item.orderViolations} | ${booleanResult(item.pass)} |`,
    )
    .join("\n");
  const roundTripRows = data.roundTrips
    .map(
      (item) =>
        `| ${item.section} | ${item.equal} | ${item.sourceCharacters} | ${item.assembledCharacters} | ${item.firstDivergenceLine} | ${item.divergentLineCount} | ${booleanResult(item.equal)} |`,
    )
    .join("\n");
  const candidateRows = data.candidates
    .map(
      (item) =>
        `| ${item.kind} | ${item.section} | ${item.equal} | ${booleanResult(item.equal)} |`,
    )
    .join("\n");
  const schemaRows = [
    ["JSON 物件解析率", data.schema.parsedObjects],
    ["必備欄位齊全率", data.schema.requiredComplete],
    ["單元雜湊重算相符率", data.schema.hashesMatch],
    ["欄位值形狀相符率", data.schema.shapesMatch],
    ["unit_id 唯一率", data.schema.uniqueIds],
  ]
    .map(
      ([label, numerator]) =>
        `| ${label} | ${numerator} | ${data.schema.total} | ${ratio(numerator, data.schema.total)} | ${booleanResult(data.schema.total > 0 && numerator === data.schema.total)} |`,
    )
    .join("\n");
  const safetyRows = [
    ["報告量測單位樣式命中", data.safety.reportMeasurementHits],
    ["腳本量測單位樣式命中", data.safety.scriptMeasurementHits],
    ["報告百分比符號命中", data.safety.reportPercentageHits],
    ["腳本百分比符號命中", data.safety.scriptPercentageHits],
    ["報告受治理代碼形狀命中", data.safety.reportGovernedCodeHits],
    ["腳本受治理代碼形狀命中", data.safety.scriptGovernedCodeHits],
    ["報告 payload 欄位名稱命中", data.safety.reportPayloadKeyHits],
    ["報告輸入長片段命中", data.safety.reportLongInputHits],
    ["腳本輸入長片段命中", data.safety.scriptLongInputHits],
  ]
    .map(([label, count]) => `| ${label} | ${count} |`)
    .join("\n");

  return `# T3 轉錄往返保真驗證報告

## 狀態

- 總判定：${data.status}
- 五件輸入雜湊閘門：${data.hashGate.inputs.length}/5 MATCH
- 附件2 三方全等：true
- PDF 解析前完成雜湊閘門：true
- 報告含逐字內容：false
- 報告含時間戳：false

## 五件輸入雜湊閘門

| 雜湊來源 | SHA-256 | 結果 |
| --- | --- | --- |
${hashRows}

- 五件實算與派工單期望全等：true
- INPUT-1 派工單期望、storage-manifest 宣告、原始位元組實算三方全等：true

## 錨點分割驗證

| section | 頁次 | 邏輯行數 | 單元數 | 縫隙行數 | 重疊行數 | 越界錨點數 | 頁欄位不一致數 | 錨點序違反數 | 結果 |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
${partitionRows}

## 往返逐位元比對

字元數不含 LF；首個分歧行索引 0 表示無分歧。比對不輸出任何文字。

| section | 等值 | 右欄字元數 | 單元串接字元數 | 首個分歧行索引 | 分歧行數 | 結果 |
| --- | --- | ---: | ---: | ---: | ---: | --- |
${roundTripRows}

## 候選交叉核對

| 候選結構標籤 | section | 位元組等值 | 結果 |
| --- | --- | --- | --- |
${candidateRows}

## Schema 獨立重驗

| 檢核 | 分子 | 分母 | 比率 | 結果 |
| --- | ---: | ---: | ---: | --- |
${schemaRows}

| 編碼與行尾檢核 | 結果 |
| --- | --- |
| UTF-8 | ${data.schema.utf8} |
| LF | ${data.schema.finalLf && !data.schema.cr} |
| BOM | ${data.schema.bom} |
| 空白 JSONL 行數 | ${data.schema.blankLines} |
| 編碼與行尾總結果 | ${booleanResult(data.schema.encodingPass)} |

## 產物安全自我掃描

| 檢核 | 命中數 |
| --- | ---: |
${safetyRows}
| repo 內擷取暫存文字檔 | 0 |
| repo 內 JSONL 產物 | 0 |
| 報告逐字內容插值 | 0 |
| 報告候選內容插值 | 0 |
| 紅線自我掃描 | 0 |

- 產物安全自我掃描：${booleanResult(safetyPassed(data.safety))}
- 總判定由各分項機械導出：true

**T3 通過僅證轉錄保真,JSONL 仍為草稿;未經 T4 INTAKE-APPROVE 不得作為任何下游編碼或發布依據。**
`;
}

function writeOrVerifyReport(report) {
  const bytes = Buffer.from(report, "utf8");
  if (existsSync(REPORT_PATH)) {
    let existing;
    try {
      existing = readFileSync(REPORT_PATH);
    } catch {
      fail("report_write_error");
    }
    if (!existing.equals(bytes)) {
      fail("report_conflict");
    }
    return "VERIFIED_EXISTING";
  }
  try {
    writeFileSync(REPORT_PATH, bytes, { flag: "wx" });
  } catch {
    fail("report_write_error");
  }
  try {
    if (!readFileSync(REPORT_PATH).equals(bytes)) {
      fail("report_write_error");
    }
  } catch (error) {
    if (error instanceof VerificationError) {
      throw error;
    }
    fail("report_write_error");
  }
  return "WROTE_FINAL";
}

function main() {
  const { forcedInput } = parseArguments(process.argv.slice(2));
  const hashGate = verifyHashGate(forcedInput);
  const pdfInput = hashGate.inputs.find((input) => input.id === 1);
  const jsonlInput = hashGate.inputs.find((input) => input.id === 2);
  const sections = extractSections(parseTsv(extractTsv(pdfInput.path)));
  const schema = validateSchema(parseJsonl(jsonlInput.bytes), sections);
  const partitions = verifyPartitions(schema, sections);
  const roundTrips = verifyRoundTrips(partitions, sections);
  const candidates = verifyCandidates(hashGate, roundTrips);
  const inputTexts = [
    ...sections.map((section) =>
      section.lines.map((line) => line.text).join("\n"),
    ),
    ...hashGate.inputs
      .filter((input) => input.section)
      .map((input) => decodeUtf8(input.bytes) ?? ""),
  ];
  const basePass =
    schema.pass &&
    partitions.every((item) => item.pass) &&
    roundTrips.every((item) => item.equal) &&
    candidates.every((item) => item.equal);
  const scriptText = readFileSync(SCRIPT_PATH, "utf8");
  const emptySafety = {
    reportMeasurementHits: 0,
    scriptMeasurementHits: 0,
    reportPercentageHits: 0,
    scriptPercentageHits: 0,
    reportGovernedCodeHits: 0,
    scriptGovernedCodeHits: 0,
    reportPayloadKeyHits: 0,
    reportLongInputHits: 0,
    scriptLongInputHits: 0,
  };
  const draftData = {
    hashGate,
    schema,
    partitions,
    roundTrips,
    candidates,
    safety: emptySafety,
    status: basePass ? "FIDELITY_VERIFIED" : "FIDELITY_FAILED",
  };
  const safety = scanArtifactSafety(
    scriptText,
    renderReport(draftData),
    inputTexts,
  );
  if (!safetyPassed(safety)) {
    fail("report_safety_error");
  }
  const status = basePass ? "FIDELITY_VERIFIED" : "FIDELITY_FAILED";
  const report = renderReport({ ...draftData, safety, status });
  const finalSafety = scanArtifactSafety(scriptText, report, inputTexts);
  if (
    !safetyPassed(finalSafety) ||
    JSON.stringify(finalSafety) !== JSON.stringify(safety)
  ) {
    fail("report_safety_error");
  }
  const writeResult = writeOrVerifyReport(report);
  process.stdout.write(`OK ${status} ${writeResult}\n`);
  if (status !== "FIDELITY_VERIFIED") {
    process.exitCode = 1;
  }
}

try {
  main();
} catch (error) {
  const code =
    error instanceof VerificationError ? error.code : "input_read_error";
  const detail =
    error instanceof VerificationError && error.detail.length > 0
      ? ` ${error.detail}`
      : "";
  process.stderr.write(`ERROR ${code}${detail}\n`);
  process.exitCode = 1;
}
