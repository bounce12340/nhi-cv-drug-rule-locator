#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const REPO_ROOT = path.dirname(path.dirname(SCRIPT_PATH));
const INPUT_DIRECTORY = path.join(
  REPO_ROOT,
  "data",
  "governed",
  "nhi-lipid-rules-2026-09-01-r1",
);
const INPUT_NAME = "attachment-2-rule-revision-table.pdf";
const INPUT_PATH = path.join(INPUT_DIRECTORY, INPUT_NAME);
const MANIFEST_PATH = path.join(INPUT_DIRECTORY, "storage-manifest.json");
const REPORT_PATH = path.join(
  REPO_ROOT,
  "docs",
  "stage3",
  "rules-transcription-t2-report.md",
);
const DERIVED_PATH =
  "/tmp/claude-0/-home-user-nhi-cv-drug-rule-locator/94f9d3c6-80d2-5a5b-9756-182a30351591/scratchpad/derived/rules-structured-draft.jsonl";
const PDFTOTEXT_PATH = "/usr/bin/pdftotext";
const EXPECTED_SHA256 =
  "6389a5f654e0cb755d006f04ed47eca6ada9f867873f43c5088f79db6bb6c1c2";
const EFFECTIVE_FROM = "2026-09-01";
const EXPECTED_PAGE_COUNT = 13;
const EXPECTED_SECTIONS = ["2.6.1", "2.6.2", "2.6.3"];
const CORRECTED_COLUMN_HEADING = "建議修訂後給付規定";
const TABLE_TITLE_SUFFIX = "給付規定表";
const TABLE_LABELS = ["表一", "表二"];
const UNIT_TYPES = ["表題", "資料列", "定義項", "條文", "註"];
const LOGICAL_TOP_TOLERANCE = 0.35;
const COLUMN_LEFT_TOLERANCE = 0.6;
const TABLE_TITLE_MAX_GAP = 30;
const MIN_FRAGMENT_CODE_POINTS = 12;

// The order, depth, and patterns are the complete mechanical clause rule table.
const CLAUSE_MARKER_PATTERNS = [
  { style: "decimal", depth: 1, pattern: /^\s*([1-9][0-9]*[.、])/u },
  {
    style: "parenthesized",
    depth: 2,
    pattern: /^\s*(\([0-9一二三四五六七八九十]+\))/u,
  },
  { style: "circled", depth: 3, pattern: /^\s*([①-⑳])/u },
  {
    style: "chinese",
    depth: 1,
    pattern: /^\s*([一二三四五六七八九十]+[、.])/u,
  },
];
const DEFINITION_MARKER_PATTERNS = [
  {
    style: "parenthesized_chinese",
    pattern: /^\s*(\([一二三四五六七八九十]+\))/u,
  },
  { style: "decimal", pattern: /^\s*([1-9][0-9]*\.)/u },
];
const NOTE_PATTERN = /^\s*(?:註|備註)\s*[:：]?/u;
const DEFINITION_HEADING_PATTERN = /定義\s*[:：]/u;
const RELATIONAL_SIGNATURE_PATTERN =
  /([A-Za-z][A-Za-z-]*)\s*[≧≥]/gu;

const SAFE_ERROR_CODES = new Set([
  "argument_error",
  "derived_path_error",
  "derived_write_blocked",
  "document_topology_error",
  "hash_mismatch",
  "manifest_error",
  "pdf_extraction_error",
  "report_safety_error",
  "report_write_error",
  "schema_error",
  "source_file_error",
]);

class TranscriptionError extends Error {
  constructor(code) {
    super(code);
    this.name = "TranscriptionError";
    this.code = SAFE_ERROR_CODES.has(code) ? code : "source_file_error";
  }
}

function fail(code) {
  throw new TranscriptionError(code);
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

function isInside(rootPath, candidatePath) {
  const relative = path.relative(rootPath, candidatePath);
  return (
    relative === "" ||
    (!relative.startsWith("..") && !path.isAbsolute(relative))
  );
}

function resolveThroughExistingAncestor(candidatePath) {
  const unresolvedParts = [];
  let cursor = candidatePath;

  while (!existsSync(cursor)) {
    const parent = path.dirname(cursor);
    if (parent === cursor) {
      fail("derived_path_error");
    }
    unresolvedParts.push(path.basename(cursor));
    cursor = parent;
  }

  let realAncestor;
  try {
    realAncestor = realpathSync.native(cursor);
  } catch {
    fail("derived_path_error");
  }
  return path.resolve(realAncestor, ...unresolvedParts.reverse());
}

function validateDerivedPath() {
  const lexicalPath = path.resolve(DERIVED_PATH);
  const physicalPath = resolveThroughExistingAncestor(lexicalPath);
  let physicalRepoRoot;
  try {
    physicalRepoRoot = realpathSync.native(REPO_ROOT);
  } catch {
    fail("derived_path_error");
  }

  if (
    isInside(REPO_ROOT, lexicalPath) ||
    isInside(physicalRepoRoot, physicalPath)
  ) {
    fail("derived_path_error");
  }
  return lexicalPath;
}

function parseArguments(argv) {
  if (argv.length === 0) {
    return { forceHashMismatch: false };
  }
  if (argv.length === 1 && argv[0] === "--force-hash-mismatch") {
    return { forceHashMismatch: true };
  }
  fail("argument_error");
}

function removeFileIfPresent(filePath, errorCode) {
  try {
    if (existsSync(filePath)) {
      unlinkSync(filePath);
    }
  } catch {
    fail(errorCode);
  }
}

function removeOutputs(derivedPath) {
  removeFileIfPresent(REPORT_PATH, "report_write_error");
  removeFileIfPresent(derivedPath, "derived_write_blocked");
}

function alteredHash(hash) {
  return `${hash[0] === "0" ? "1" : "0"}${hash.slice(1)}`;
}

function readManifestHash() {
  let manifest;
  try {
    manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf8"));
  } catch {
    fail("manifest_error");
  }
  const matches = Array.isArray(manifest.files)
    ? manifest.files.filter((entry) => entry?.declaredName === INPUT_NAME)
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

function verifyHashGate(forceHashMismatch) {
  let bytes;
  try {
    if (!statSync(INPUT_PATH).isFile()) {
      fail("source_file_error");
    }
    bytes = readFileSync(INPUT_PATH);
  } catch (error) {
    if (error instanceof TranscriptionError) {
      throw error;
    }
    fail("source_file_error");
  }

  const manifestSha256 = readManifestHash();
  const actualSha256 = sha256(bytes);
  const gateExpected = forceHashMismatch
    ? alteredHash(EXPECTED_SHA256)
    : EXPECTED_SHA256;
  if (
    actualSha256 !== gateExpected ||
    actualSha256 !== manifestSha256 ||
    gateExpected !== manifestSha256
  ) {
    fail("hash_mismatch");
  }
  return { actualSha256, manifestSha256 };
}

function extractTsv() {
  const result = spawnSync(
    PDFTOTEXT_PATH,
    ["-tsv", "-enc", "UTF-8", INPUT_PATH, "-"],
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
    const key = [
      row.page,
      row.paragraph,
      row.block,
      row.line,
      side,
    ].join(":");
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
  return { pageWidths, lines };
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

function locateCorrectedColumn(lines) {
  const normalizedHeading = normalizeComparable(CORRECTED_COLUMN_HEADING);
  const headings = lines.filter(
    (line) => normalizeComparable(line.text) === normalizedHeading,
  );
  const sides = new Set(headings.map((line) => line.side));
  const pages = new Set(headings.map((line) => line.page));
  if (
    headings.length !== EXPECTED_PAGE_COUNT ||
    sides.size !== 1 ||
    pages.size !== EXPECTED_PAGE_COUNT
  ) {
    fail("document_topology_error");
  }
  return { normalizedHeading, side: [...sides][0] };
}

function extractSections(tsvData) {
  const starts = inventorySectionStarts(tsvData.lines);
  const correctedColumn = locateCorrectedColumn(tsvData.lines);
  const expectedPageRanges = [
    [1, 11],
    [12, 12],
    [12, 13],
  ];

  return starts.map((start, index) => {
    const next = starts[index + 1] ?? null;
    const sourceLines = tsvData.lines.filter(
      (line) =>
        line.side === correctedColumn.side &&
        comparePosition(line, start) >= 0 &&
        (next === null || comparePosition(line, next) < 0),
    );
    const removedHeadingCount = sourceLines.filter(
      (line) =>
        normalizeComparable(line.text) === correctedColumn.normalizedHeading,
    ).length;
    const lines = sourceLines
      .filter(
        (line) =>
          normalizeComparable(line.text) !==
          correctedColumn.normalizedHeading,
      )
      .map((line) => ({
        page: line.page,
        top: line.top,
        left: line.left,
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
      boundaryStart: start,
      boundaryEnd: next,
      pageStart,
      pageEnd,
      removedHeadingCount,
      lines,
    };
  });
}

function clauseMarker(line, section) {
  if (sectionIdFromText(line.text) === section) {
    return null;
  }
  for (const definition of CLAUSE_MARKER_PATTERNS) {
    const match = line.text.match(definition.pattern);
    if (match) {
      return {
        style: definition.style,
        depth: definition.depth,
        token: match[1],
      };
    }
  }
  return null;
}

function definitionMarker(line) {
  for (const definition of DEFINITION_MARKER_PATTERNS) {
    const match = line.text.match(definition.pattern);
    if (match) {
      return { style: definition.style, token: match[1] };
    }
  }
  return null;
}

function updateClausePath(currentPath, marker) {
  const next = currentPath.slice(0, marker.depth - 1);
  while (next.length < marker.depth - 1) {
    next.push("");
  }
  next.push(marker.token);
  return next;
}

function groupAtSameTop(lines, start, end) {
  const first = lines[start];
  let cursor = start + 1;
  while (
    cursor < end &&
    lines[cursor].page === first.page &&
    Math.abs(lines[cursor].top - first.top) <= LOGICAL_TOP_TOLERANCE
  ) {
    cursor += 1;
  }
  return { start, end: cursor };
}

function findTableLabel(text) {
  const matches = TABLE_LABELS.filter((label) => text.includes(label));
  if (matches.length !== 1) {
    fail("document_topology_error");
  }
  return matches[0];
}

function relationalSignaturePositions(lines, start, end) {
  const frequencies = new Map();
  const occurrences = [];
  for (let index = start; index < end; index += 1) {
    RELATIONAL_SIGNATURE_PATTERN.lastIndex = 0;
    for (const match of lines[index].text.matchAll(RELATIONAL_SIGNATURE_PATTERN)) {
      const signature = match[1].toUpperCase();
      frequencies.set(signature, (frequencies.get(signature) ?? 0) + 1);
      occurrences.push({ index, signature });
    }
  }
  if (frequencies.size === 0) {
    return [];
  }
  const signature = [...frequencies.entries()].sort(
    (left, right) => right[1] - left[1] || left[0].localeCompare(right[0]),
  )[0][0];
  return occurrences
    .filter((entry) => entry.signature === signature)
    .map((entry) => entry.index);
}

function findFirstExplicitDataStart(lines, titleStart, firstSignature) {
  const bodyMinLeft = Math.min(
    ...lines.slice(titleStart + 1, firstSignature + 1).map((line) => line.left),
  );
  const candidates = [];
  let cursor = titleStart + 1;
  while (cursor < firstSignature) {
    const group = groupAtSameTop(lines, cursor, firstSignature);
    const groupLines = lines.slice(group.start, group.end);
    if (
      groupLines.length >= 3 &&
      Math.min(...groupLines.map((line) => line.left)) <= bodyMinLeft + 1
    ) {
      candidates.push(group.start);
    }
    cursor = group.end;
  }
  if (candidates.length === 0) {
    fail("document_topology_error");
  }
  return candidates.at(-1);
}

function buildExplicitTableZone(lines, start, end) {
  const tableLabel = findTableLabel(lines[start].text);
  const signatures = relationalSignaturePositions(lines, start + 1, end);
  if (signatures.length === 0) {
    return {
      kind: "table",
      start,
      end,
      tableLabel,
      titleEnd: end,
      columnLabels: [],
      rowStarts: [],
    };
  }

  const firstDataStart = findFirstExplicitDataStart(
    lines,
    start,
    signatures[0],
  );
  const rowStarts = [firstDataStart, ...signatures.slice(1)];
  if (
    rowStarts.length !== signatures.length ||
    rowStarts.some(
      (rowStart, index) => index > 0 && rowStart <= rowStarts[index - 1],
    )
  ) {
    fail("document_topology_error");
  }
  const columnLabels = lines
    .slice(start + 1, firstDataStart)
    .map((line) => line.text);
  if (columnLabels.length === 0) {
    fail("document_topology_error");
  }
  return {
    kind: "table",
    start,
    end,
    tableLabel,
    titleEnd: firstDataStart,
    columnLabels,
    rowStarts,
  };
}

function nextGenericBoundary(lines, start, section) {
  for (let index = start; index < lines.length; index += 1) {
    if (
      clauseMarker(lines[index], section) !== null ||
      NOTE_PATTERN.test(lines[index].text) ||
      DEFINITION_HEADING_PATTERN.test(lines[index].text) ||
      normalizeComparable(lines[index].text).includes(
        normalizeComparable(TABLE_TITLE_SUFFIX),
      )
    ) {
      return index;
    }
  }
  return lines.length;
}

function detectPairedTableZones(lines, section) {
  const zones = [];
  let cursor = 0;
  while (cursor < lines.length) {
    const header = groupAtSameTop(lines, cursor, lines.length);
    const headerLines = lines.slice(header.start, header.end);
    if (headerLines.length !== 2) {
      cursor = header.end;
      continue;
    }
    const anchors = headerLines.map((line) => line.left).sort((a, b) => a - b);
    if (anchors[1] - anchors[0] <= COLUMN_LEFT_TOLERANCE) {
      cursor = header.end;
      continue;
    }
    const end = nextGenericBoundary(lines, header.end, section);
    const rowStarts = [];
    for (let index = header.end; index < end; index += 1) {
      if (Math.abs(lines[index].left - anchors[0]) <= COLUMN_LEFT_TOLERANCE) {
        rowStarts.push(index);
      }
    }
    const completeRows = rowStarts.filter((rowStart, rowIndex) => {
      const rowEnd = rowStarts[rowIndex + 1] ?? end;
      return lines
        .slice(rowStart, rowEnd)
        .some(
          (line) =>
            Math.abs(line.left - anchors[1]) <= COLUMN_LEFT_TOLERANCE,
        );
    });
    if (completeRows.length < 2 || completeRows.length !== rowStarts.length) {
      cursor = header.end;
      continue;
    }
    const previousIndex = header.start - 1;
    if (
      previousIndex < 0 ||
      lines[previousIndex].page !== lines[header.start].page ||
      lines[header.start].top - lines[previousIndex].top <= 0 ||
      lines[header.start].top - lines[previousIndex].top > TABLE_TITLE_MAX_GAP
    ) {
      fail("document_topology_error");
    }
    zones.push({
      kind: "table",
      start: previousIndex,
      end,
      tableLabel: "無",
      titleEnd: header.end,
      columnLabels: headerLines.map((line) => line.text),
      rowStarts,
    });
    cursor = end;
  }
  return zones;
}

function buildStructuralZones(sectionData) {
  const { lines, section } = sectionData;
  const definitionIndexes = lines.flatMap((line, index) =>
    DEFINITION_HEADING_PATTERN.test(line.text) ? [index] : [],
  );
  const normalizedTitle = normalizeComparable(TABLE_TITLE_SUFFIX);
  const titleCandidateIndexes = lines.flatMap((line, index) =>
    sectionIdFromText(line.text) === null &&
    normalizeComparable(line.text).includes(normalizedTitle)
      ? [index]
      : [],
  );
  const titleIndexes =
    definitionIndexes.length === 2
      ? [
          titleCandidateIndexes
            .filter((index) => index < definitionIndexes[0])
            .at(-1),
          titleCandidateIndexes.find(
            (index) => index > definitionIndexes[1],
          ),
        ].filter((index) => Number.isInteger(index))
      : titleCandidateIndexes;

  if (section === "2.6.1") {
    if (definitionIndexes.length !== 2 || titleIndexes.length !== 2) {
      fail("document_topology_error");
    }
  } else if (definitionIndexes.length !== 0 || titleIndexes.length !== 0) {
    fail("document_topology_error");
  }

  const zones = [];
  for (const start of titleIndexes) {
    const nextDefinition = definitionIndexes.find((index) => index > start);
    const end = nextDefinition ?? lines.length;
    zones.push(buildExplicitTableZone(lines, start, end));
  }
  for (let index = 0; index < definitionIndexes.length; index += 1) {
    const start = definitionIndexes[index];
    const candidates = [
      definitionIndexes[index + 1],
      titleIndexes.find((titleIndex) => titleIndex > start),
      lines.length,
    ].filter((value) => Number.isInteger(value));
    zones.push({ kind: "definition", start, end: Math.min(...candidates) });
  }
  if (titleIndexes.length === 0) {
    zones.push(...detectPairedTableZones(lines, section));
  }

  zones.sort((left, right) => left.start - right.start || left.end - right.end);
  for (let index = 0; index < zones.length; index += 1) {
    const zone = zones[index];
    if (
      zone.start < 0 ||
      zone.end <= zone.start ||
      zone.end > lines.length ||
      (index > 0 && zone.start < zones[index - 1].end)
    ) {
      fail("document_topology_error");
    }
  }
  return zones;
}

function unitRange(start, end, unitType, clausePath, extra = {}) {
  if (end <= start) {
    fail("document_topology_error");
  }
  return {
    start,
    end,
    unitType,
    clausePath: [...clausePath],
    tableLabel: "無",
    ...extra,
  };
}

function segmentGeneric(lines, section, start, end, initialPath) {
  if (end <= start) {
    return { units: [], currentPath: initialPath };
  }
  const units = [];
  let currentPath = [...initialPath];
  let unitStart = start;
  let unitType = "條文";
  let unitPath = [...currentPath];

  for (let index = start; index < end; index += 1) {
    const marker = clauseMarker(lines[index], section);
    const isNote = NOTE_PATTERN.test(lines[index].text);
    if (index === start) {
      if (marker) {
        currentPath = updateClausePath(currentPath, marker);
        unitPath = [...currentPath];
      }
      unitType = isNote ? "註" : "條文";
      continue;
    }
    if (marker || isNote) {
      units.push(unitRange(unitStart, index, unitType, unitPath));
      if (marker) {
        currentPath = updateClausePath(currentPath, marker);
      }
      unitStart = index;
      unitType = isNote ? "註" : "條文";
      unitPath = [...currentPath];
    }
  }
  units.push(unitRange(unitStart, end, unitType, unitPath));
  return { units, currentPath };
}

function segmentDefinition(lines, zone) {
  const markers = [];
  for (let index = zone.start + 1; index < zone.end; index += 1) {
    const marker = definitionMarker(lines[index]);
    if (marker) {
      markers.push({ index, ...marker });
    }
  }
  if (markers.length === 0) {
    fail("document_topology_error");
  }
  const topLevelStyle = markers[0].style;
  const unexpectedStyles = new Set(
    markers
      .filter(
        (marker) =>
          marker.style !== topLevelStyle && marker.style !== "decimal",
      )
      .map((marker) => marker.style),
  );
  if (unexpectedStyles.size > 0) {
    fail("document_topology_error");
  }

  const units = [
    unitRange(zone.start, markers[0].index, "定義項", [], {
      definitionRole: "heading",
    }),
  ];
  let topToken = null;
  markers.forEach((marker, index) => {
    let clausePath;
    if (marker.style === topLevelStyle) {
      topToken = marker.token;
      clausePath = [topToken];
    } else {
      if (topToken === null) {
        fail("document_topology_error");
      }
      clausePath = [topToken, marker.token];
    }
    units.push(
      unitRange(
        marker.index,
        markers[index + 1]?.index ?? zone.end,
        "定義項",
        clausePath,
      ),
    );
  });
  return units;
}

function segmentTable(zone, inheritedPath) {
  const units = [
    unitRange(zone.start, zone.titleEnd, "表題", inheritedPath, {
      tableLabel: zone.tableLabel,
    }),
  ];
  zone.rowStarts.forEach((rowStart, index) => {
    units.push(
      unitRange(
        rowStart,
        zone.rowStarts[index + 1] ?? zone.end,
        "資料列",
        inheritedPath,
        {
          tableLabel: zone.tableLabel,
          rowIndex: index + 1,
          columnLabels: [...zone.columnLabels],
        },
      ),
    );
  });
  return units;
}

function segmentSection(sectionData) {
  const zones = buildStructuralZones(sectionData);
  const units = [];
  let cursor = 0;
  let currentPath = [];

  for (const zone of zones) {
    const generic = segmentGeneric(
      sectionData.lines,
      sectionData.section,
      cursor,
      zone.start,
      currentPath,
    );
    units.push(...generic.units);
    currentPath = generic.currentPath;
    if (zone.kind === "table") {
      units.push(...segmentTable(zone, currentPath));
    } else {
      units.push(...segmentDefinition(sectionData.lines, zone));
    }
    cursor = zone.end;
  }
  const tail = segmentGeneric(
    sectionData.lines,
    sectionData.section,
    cursor,
    sectionData.lines.length,
    currentPath,
  );
  units.push(...tail.units);
  return units;
}

function materializeUnits(sections) {
  const units = [];
  const coverage = new Map();

  for (const sectionData of sections) {
    const sectionUnits = segmentSection(sectionData);
    const consumed = Array.from({ length: sectionData.lines.length }, () => 0);
    const width = Math.max(3, String(sectionUnits.length).length);
    sectionUnits.forEach((unit, index) => {
      for (let lineIndex = unit.start; lineIndex < unit.end; lineIndex += 1) {
        consumed[lineIndex] += 1;
        if (consumed[lineIndex] > 1) {
          fail("document_topology_error");
        }
      }
      const verbatimText = sectionData.lines
        .slice(unit.start, unit.end)
        .map((line) => line.text)
        .join("\n")
        .normalize("NFKC");
      const output = {
        unit_id: `${sectionData.section}-${String(index + 1).padStart(width, "0")}`,
        section: sectionData.section,
        table_label: unit.tableLabel,
        clause_path: [...unit.clausePath],
        unit_type: unit.unitType,
        verbatim_text: verbatimText,
        effective_from: EFFECTIVE_FROM,
        source_anchor: {
          page: sectionData.lines[unit.start].page,
          line_start: unit.start + 1,
          line_end: unit.end,
        },
        unit_sha256: sha256(Buffer.from(verbatimText, "utf8")),
      };
      if (unit.unitType === "資料列") {
        output.row_index = unit.rowIndex;
        output.column_labels = [...unit.columnLabels];
      }
      units.push(output);
    });
    const remainingIndexes = consumed.flatMap((count, index) =>
      count === 0 ? [index] : [],
    );
    coverage.set(sectionData.section, {
      total: consumed.length,
      consumed: consumed.filter((count) => count === 1).length,
      remaining: remainingIndexes.length,
      remainingPages: [
        ...new Set(
          remainingIndexes.map((index) => sectionData.lines[index].page),
        ),
      ].sort((left, right) => left - right),
    });
  }
  return { units, coverage };
}

function validateUnits(units, sections) {
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
  let requiredComplete = 0;
  let hashesMatch = 0;
  let valueShapesMatch = 0;
  const ids = new Set();
  const lineCounts = new Map(
    sections.map((section) => [section.section, section.lines.length]),
  );

  for (const unit of units) {
    const hasCommon = commonFields.every((field) =>
      Object.hasOwn(unit, field),
    );
    const hasRowFields =
      unit.unit_type !== "資料列" ||
      (Object.hasOwn(unit, "row_index") &&
        Object.hasOwn(unit, "column_labels"));
    if (hasCommon && hasRowFields) {
      requiredComplete += 1;
    }
    if (sha256(Buffer.from(unit.verbatim_text, "utf8")) === unit.unit_sha256) {
      hashesMatch += 1;
    }
    const anchor = unit.source_anchor;
    const shapeMatches =
      /^2\.6\.[123]-[0-9]{3,}$/u.test(unit.unit_id) &&
      EXPECTED_SECTIONS.includes(unit.section) &&
      [...TABLE_LABELS, "無"].includes(unit.table_label) &&
      Array.isArray(unit.clause_path) &&
      unit.clause_path.every((part) => typeof part === "string") &&
      UNIT_TYPES.includes(unit.unit_type) &&
      typeof unit.verbatim_text === "string" &&
      unit.verbatim_text.length > 0 &&
      unit.verbatim_text === unit.verbatim_text.normalize("NFKC") &&
      !unit.verbatim_text.includes("\r") &&
      !unit.verbatim_text.startsWith("\uFEFF") &&
      unit.effective_from === EFFECTIVE_FROM &&
      Number.isInteger(anchor?.page) &&
      Number.isInteger(anchor?.line_start) &&
      Number.isInteger(anchor?.line_end) &&
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
          )));
    if (shapeMatches) {
      valueShapesMatch += 1;
    }
    ids.add(unit.unit_id);
  }

  const result = {
    total: units.length,
    requiredComplete,
    hashesMatch,
    valueShapesMatch,
    uniqueIds: ids.size,
  };
  if (
    result.total === 0 ||
    result.requiredComplete !== result.total ||
    result.hashesMatch !== result.total ||
    result.valueShapesMatch !== result.total ||
    result.uniqueIds !== result.total
  ) {
    fail("schema_error");
  }
  return result;
}

function countByMatrix(units) {
  return Object.fromEntries(
    EXPECTED_SECTIONS.map((section) => [
      section,
      Object.fromEntries(
        UNIT_TYPES.map((type) => [
          type,
          units.filter(
            (unit) => unit.section === section && unit.unit_type === type,
          ).length,
        ]),
      ),
    ]),
  );
}

function countMatches(text, pattern) {
  return (text.match(pattern) ?? []).length;
}

function countLongInputFragments(artifactText, extractedTexts) {
  const normalizedArtifact = normalizeComparable(artifactText);
  const hits = new Set();
  for (const extractedText of extractedTexts) {
    for (const line of extractedText.split("\n")) {
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

function scanArtifactSafety(scriptText, reportText, extractedTexts, labels) {
  const measurementStyle =
    /[0-9]\s*(?:[mM][gG]|[mM][mM][oO][lL])(?:\s*[/／]\s*[dD]?[lL])?/gu;
  const governedCodeShape = /[A-B][A-Z0-9][0-9]{8}/gu;
  const percentageSign = String.fromCodePoint(37);
  const normalizedReport = normalizeComparable(reportText);
  const labelContentHits = new Set(
    labels
      .map((label) => normalizeComparable(label))
      .filter(
        (label) => label.length > 0 && normalizedReport.includes(label),
      ),
  ).size;
  return {
    reportMeasurementStyleHits: countMatches(reportText, measurementStyle),
    scriptMeasurementStyleHits: countMatches(scriptText, measurementStyle),
    reportPercentageSignHits:
      reportText.split(percentageSign).length - 1,
    scriptPercentageSignHits:
      scriptText.split(percentageSign).length - 1,
    reportGovernedCodeShapeHits: countMatches(reportText, governedCodeShape),
    scriptGovernedCodeShapeHits: countMatches(scriptText, governedCodeShape),
    reportPayloadKeyHits: countMatches(
      reportText,
      /verbatim_text|column_labels/gu,
    ),
    reportColumnLabelContentHits: labelContentHits,
    reportLongInputFragmentHits: countLongInputFragments(
      reportText,
      extractedTexts,
    ),
    scriptLongInputFragmentHits: countLongInputFragments(
      scriptText,
      extractedTexts,
    ),
  };
}

function safetyPassed(safety) {
  return Object.values(safety).every((value) => value === 0);
}

function ratio(numerator, denominator) {
  return denominator === 0 ? "0.000000" : (numerator / denominator).toFixed(6);
}

function formatPageRange(start, end) {
  return start === end ? `${start}` : `${start}–${end}`;
}

function renderReport(data) {
  const sectionRows = data.sections
    .map((section) => {
      const boundaryEndPage =
        section.boundaryEnd?.page ?? section.pageEnd;
      const boundaryEndTop = section.boundaryEnd
        ? section.boundaryEnd.top.toFixed(2)
        : "文件末端";
      return `| ${section.section} | ${formatPageRange(section.pageStart, section.pageEnd)} | ${section.boundaryStart.page} | ${section.boundaryStart.top.toFixed(2)} | ${boundaryEndPage} | ${boundaryEndTop} | ${section.lines.length} | ${section.removedHeadingCount} |`;
    })
    .join("\n");
  const matrixRows = EXPECTED_SECTIONS.map(
    (section) =>
      `| ${section} | ${UNIT_TYPES.map((type) => data.matrix[section][type]).join(" | ")} |`,
  ).join("\n");
  const matrixTotals = UNIT_TYPES.map((type) =>
    EXPECTED_SECTIONS.reduce(
      (total, section) => total + data.matrix[section][type],
      0,
    ),
  );
  const dataRowRows = [...TABLE_LABELS, "無"]
    .map(
      (label) =>
        `| ${label} | ${data.units.filter((unit) => unit.unit_type === "資料列" && unit.table_label === label).length} |`,
    )
    .join("\n");
  const depthCounts = new Map();
  for (const unit of data.units) {
    const depth = unit.clause_path.length;
    depthCounts.set(depth, (depthCounts.get(depth) ?? 0) + 1);
  }
  const depthRows = [...depthCounts.entries()]
    .sort((left, right) => left[0] - right[0])
    .map(([depth, count]) => `| ${depth} | ${count} |`)
    .join("\n");
  const coverageRows = EXPECTED_SECTIONS.map((section) => {
    const item = data.coverage.get(section);
    return `| ${section} | ${item.total} | ${item.consumed} | ${item.remaining} | ${item.remainingPages.length === 0 ? "無" : item.remainingPages.join(",")} |`;
  }).join("\n");
  const totalCoverage = [...data.coverage.values()].reduce(
    (result, item) => ({
      total: result.total + item.total,
      consumed: result.consumed + item.consumed,
      remaining: result.remaining + item.remaining,
    }),
    { total: 0, consumed: 0, remaining: 0 },
  );

  return `# T2 規則結構化轉錄統計報告

## 狀態

- 狀態碼：TRANSCRIPTION_DRAFT
- 機械切分：true
- 語意判斷：false
- JSONL 位於 repo 外：true
- 報告含逐字內容：false
- 報告含欄標內容：false

## 三方雜湊閘門

| 雜湊來源 | SHA-256 | 結果 |
| --- | --- | --- |
| 派工單期望 | \`${EXPECTED_SHA256}\` | MATCH |
| storage-manifest 宣告 | \`${data.hashGate.manifestSha256}\` | MATCH |
| 原始位元組實算 | \`${data.hashGate.actualSha256}\` | MATCH |

- 三方全等：true
- PDF 解析前完成：true

## 區段邊界與邏輯行統計

| section | 頁次 | 起點頁 | 起點 top | 終點頁 | 終點 top | 邏輯行數 | 移除欄頭數 |
| --- | --- | ---: | ---: | ---: | --- | ---: | ---: |
${sectionRows}

## 單元計數矩陣

| section | 表題 | 資料列 | 定義項 | 條文 | 註 |
| --- | ---: | ---: | ---: | ---: | ---: |
${matrixRows}
| 合計 | ${matrixTotals.join(" | ")} |

## 資料列標籤計數

| table_label | 資料列數 |
| --- | ---: |
${dataRowRows}

## clause_path 深度分布

| 深度 | 單元數 |
| ---: | ---: |
${depthRows}

## JSONL 統計

| 統計 | 結果 |
| --- | --- |
| 行數 | ${data.units.length} |
| bytes | ${data.jsonlBytes} |
| SHA-256 | \`${data.jsonlSha256}\` |
| UTF-8 | true |
| LF | true |
| BOM | false |

## 覆蓋統計

| section | 總行 | 消費行 | 剩餘行 | 剩餘頁次 |
| --- | ---: | ---: | ---: | --- |
${coverageRows}
| 合計 | ${totalCoverage.total} | ${totalCoverage.consumed} | ${totalCoverage.remaining} | ${totalCoverage.remaining === 0 ? "無" : "見上列"} |

## Schema 機器自檢

| 檢核 | 分子 | 分母 | 比率 | 結果 |
| --- | ---: | ---: | ---: | --- |
| 必備欄位齊全率 | ${data.schema.requiredComplete} | ${data.schema.total} | ${ratio(data.schema.requiredComplete, data.schema.total)} | PASS |
| 單元雜湊重算相符率 | ${data.schema.hashesMatch} | ${data.schema.total} | ${ratio(data.schema.hashesMatch, data.schema.total)} | PASS |
| 欄位值形狀相符率 | ${data.schema.valueShapesMatch} | ${data.schema.total} | ${ratio(data.schema.valueShapesMatch, data.schema.total)} | PASS |
| unit_id 唯一率 | ${data.schema.uniqueIds} | ${data.schema.total} | ${ratio(data.schema.uniqueIds, data.schema.total)} | PASS |

## 產物安全自我掃描

| 檢核 | 結果 |
| --- | ---: |
| repo 內擷取暫存文字檔 | 0 |
| repo 內 JSONL 產物 | 0 |
| 報告逐字內容插值 | 0 |
| 報告欄標內容插值 | 0 |
| 報告量測單位樣式命中 | ${data.safety.reportMeasurementStyleHits} |
| 腳本量測單位樣式命中 | ${data.safety.scriptMeasurementStyleHits} |
| 報告百分比符號命中 | ${data.safety.reportPercentageSignHits} |
| 腳本百分比符號命中 | ${data.safety.scriptPercentageSignHits} |
| 報告受治理代碼形狀命中 | ${data.safety.reportGovernedCodeShapeHits} |
| 腳本受治理代碼形狀命中 | ${data.safety.scriptGovernedCodeShapeHits} |
| 報告 payload 欄位名稱命中 | ${data.safety.reportPayloadKeyHits} |
| 報告欄標逐字命中 | ${data.safety.reportColumnLabelContentHits} |
| 報告輸入長片段命中 | ${data.safety.reportLongInputFragmentHits} |
| 腳本輸入長片段命中 | ${data.safety.scriptLongInputFragmentHits} |
| JSONL repo 外路徑防呆 | PASS |
| 紅線自我掃描 | PASS |

本報告只插入雜湊、計數、頁次、座標、布林、狀態碼與核准結構標籤；不含時間戳。

**本檔為轉錄草稿,未經 T3 保真驗證與 T4 INTAKE-APPROVE,不得作為任何下游編碼或發布依據。**
`;
}

function writeOutputs(derivedPath, jsonl, report) {
  try {
    mkdirSync(path.dirname(derivedPath), { recursive: true });
  } catch {
    fail("derived_write_blocked");
  }
  if (validateDerivedPath() !== derivedPath) {
    fail("derived_path_error");
  }
  try {
    writeFileSync(derivedPath, jsonl, "utf8");
  } catch {
    removeFileIfPresent(derivedPath, "derived_write_blocked");
    fail("derived_write_blocked");
  }
  try {
    writeFileSync(REPORT_PATH, report, "utf8");
  } catch {
    removeFileIfPresent(derivedPath, "derived_write_blocked");
    removeFileIfPresent(REPORT_PATH, "report_write_error");
    fail("report_write_error");
  }
}

function main() {
  const derivedPath = validateDerivedPath();
  removeOutputs(derivedPath);
  const { forceHashMismatch } = parseArguments(process.argv.slice(2));
  const hashGate = verifyHashGate(forceHashMismatch);

  const sections = extractSections(parseTsv(extractTsv()));
  const { units, coverage } = materializeUnits(sections);
  const schema = validateUnits(units, sections);
  const jsonl = `${units.map((unit) => JSON.stringify(unit)).join("\n")}\n`;
  if (
    jsonl.startsWith("\uFEFF") ||
    jsonl.includes("\r") ||
    jsonl.split("\n").length - 1 !== units.length
  ) {
    fail("schema_error");
  }
  const jsonlBytes = Buffer.byteLength(jsonl, "utf8");
  const jsonlSha256 = sha256(Buffer.from(jsonl, "utf8"));
  const matrix = countByMatrix(units);
  const extractedTexts = sections.map((section) =>
    section.lines.map((line) => line.text).join("\n"),
  );
  const columnLabels = units.flatMap((unit) => unit.column_labels ?? []);
  let reportData = {
    hashGate,
    sections,
    units,
    coverage,
    schema,
    matrix,
    jsonlBytes,
    jsonlSha256,
    safety: {
      reportMeasurementStyleHits: 0,
      scriptMeasurementStyleHits: 0,
      reportPercentageSignHits: 0,
      scriptPercentageSignHits: 0,
      reportGovernedCodeShapeHits: 0,
      scriptGovernedCodeShapeHits: 0,
      reportPayloadKeyHits: 0,
      reportColumnLabelContentHits: 0,
      reportLongInputFragmentHits: 0,
      scriptLongInputFragmentHits: 0,
    },
  };
  const scriptText = readFileSync(SCRIPT_PATH, "utf8");
  const draftReport = renderReport(reportData);
  const safety = scanArtifactSafety(
    scriptText,
    draftReport,
    extractedTexts,
    columnLabels,
  );
  if (!safetyPassed(safety)) {
    fail("report_safety_error");
  }
  reportData = { ...reportData, safety };
  const report = renderReport(reportData);
  const finalSafety = scanArtifactSafety(
    scriptText,
    report,
    extractedTexts,
    columnLabels,
  );
  if (!safetyPassed(finalSafety)) {
    fail("report_safety_error");
  }
  writeOutputs(derivedPath, jsonl, report);
}

try {
  main();
} catch (error) {
  if (process.env.RULES_TRANSCRIBE_DEBUG === "1") {
    process.stderr.write(`${error.stack}\n`);
  }
  const code =
    error instanceof TranscriptionError ? error.code : "source_file_error";
  try {
    const derivedPath = validateDerivedPath();
    removeOutputs(derivedPath);
  } catch {
    process.stderr.write("ERROR cleanup_error\n");
    process.exitCode = 1;
  }
  if (process.exitCode !== 1) {
    process.stderr.write(`ERROR ${code}\n`);
    process.exitCode = 1;
  }
}
