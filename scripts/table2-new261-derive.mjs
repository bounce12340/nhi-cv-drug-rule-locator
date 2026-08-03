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
const REPORT_PATH = path.join(
  REPO_ROOT,
  "docs",
  "stage3",
  "table2-new261-derivation-report.md",
);
const DERIVED_PATH =
  "/tmp/claude-0/-home-user-nhi-cv-drug-rule-locator/94f9d3c6-80d2-5a5b-9756-182a30351591/scratchpad/derived/new-261-candidate.txt";
const PDFTOTEXT_PATH = "/usr/bin/pdftotext";
const MIN_FRAGMENT_CODE_POINTS = 12;

const SOURCE_DEFINITIONS = [
  {
    id: "ATTACHMENT_2",
    reportLabel: "附件 2 修訂對照表 PDF",
    filePath:
      "/root/.claude/uploads/94f9d3c6-80d2-5a5b-9756-182a30351591/daa3c5ff-__2_____________1.pdf",
    expectedSha256:
      "6389a5f654e0cb755d006f04ed47eca6ada9f867873f43c5088f79db6bb6c1c2",
  },
  {
    id: "PRIOR",
    reportLabel: "舊版 2.6.1 全文 PDF",
    filePath:
      "/root/.claude/uploads/94f9d3c6-80d2-5a5b-9756-182a30351591/0a84997a-2.6.1_________________.pdf",
    expectedSha256:
      "bd7e96e5b8551c39718f80b3d5fa394581457e34f2dea1f8628a8982201bc79a",
  },
];

const EXPECTED_ATTACHMENT_PAGE_COUNT = 13;
const EXPECTED_PRIOR_PAGE_COUNT = 1;
const EXPECTED_ITEM_START_PAGE = 1;
const EXPECTED_ITEM_END_PAGE = 11;
const CORRECTED_COLUMN_HEADING = "建議修訂後給付規定";
const TABLE_LABELS = ["表一", "表二"];
const SAFE_ERROR_CODES = new Set([
  "argument_error",
  "derived_path_error",
  "derived_write_blocked",
  "document_topology_error",
  "hash_mismatch",
  "pdf_extraction_error",
  "report_safety_error",
  "report_write_error",
  "source_file_error",
]);

class DerivationError extends Error {
  constructor(code, details = {}) {
    super(code);
    this.name = "DerivationError";
    this.code = SAFE_ERROR_CODES.has(code) ? code : "source_file_error";
    this.details = details;
  }
}

function fail(code, details = {}) {
  throw new DerivationError(code, details);
}

function isInside(rootPath, candidatePath) {
  const relative = path.relative(rootPath, candidatePath);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
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
  const physicalRepoRoot = realpathSync.native(REPO_ROOT);

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
    return { forcedSourceIndex: null };
  }
  if (
    argv.length !== 2 ||
    argv[0] !== "--force-hash-mismatch" ||
    !/^[0-9]+$/u.test(argv[1])
  ) {
    fail("argument_error");
  }

  const suppliedIndex = Number(argv[1]);
  if (!Number.isSafeInteger(suppliedIndex) || suppliedIndex > 2) {
    fail("argument_error");
  }
  return {
    forcedSourceIndex: suppliedIndex === 0 ? 0 : suppliedIndex - 1,
  };
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
  let reportRemovalFailed = false;
  let derivedRemovalFailed = false;

  try {
    if (existsSync(REPORT_PATH)) {
      unlinkSync(REPORT_PATH);
    }
  } catch {
    reportRemovalFailed = true;
  }
  try {
    if (existsSync(derivedPath)) {
      unlinkSync(derivedPath);
    }
  } catch {
    derivedRemovalFailed = true;
  }

  if (reportRemovalFailed) {
    fail("report_write_error");
  }
  if (derivedRemovalFailed) {
    fail("derived_write_blocked");
  }
}

function alteredHash(hash) {
  const first = hash[0] === "0" ? "1" : "0";
  return `${first}${hash.slice(1)}`;
}

function verifySources(sourceDefinitions, forcedSourceIndex) {
  const verified = [];

  for (let index = 0; index < sourceDefinitions.length; index += 1) {
    const source = sourceDefinitions[index];
    let bytes;
    try {
      if (!statSync(source.filePath).isFile()) {
        fail("source_file_error", { input: source.id });
      }
      bytes = readFileSync(source.filePath);
    } catch (error) {
      if (error instanceof DerivationError) {
        throw error;
      }
      fail("source_file_error", { input: source.id });
    }

    const actualSha256 = createHash("sha256").update(bytes).digest("hex");
    const gateExpected =
      index === forcedSourceIndex
        ? alteredHash(source.expectedSha256)
        : source.expectedSha256;
    if (actualSha256 !== gateExpected) {
      fail("hash_mismatch", { input: source.id });
    }
    verified.push({ ...source, actualSha256, bytes });
  }
  return verified;
}

function runMemoryHashProbe(source) {
  const actualSha256 = createHash("sha256")
    .update(source.bytes)
    .digest("hex");
  return actualSha256 !== alteredHash(source.expectedSha256);
}

function extractPdfText(filePath, mode) {
  const modeArguments = mode === "tsv" ? ["-tsv"] : ["-layout"];
  const result = spawnSync(
    PDFTOTEXT_PATH,
    [...modeArguments, "-enc", "UTF-8", filePath, "-"],
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

function splitPdfPages(text) {
  const pages = text.split("\f");
  if (pages.at(-1)?.trim() === "") {
    pages.pop();
  }
  if (pages.length === 0) {
    fail("document_topology_error");
  }
  return pages;
}

function normalizeComparable(text) {
  return text
    .normalize("NFKC")
    .toLocaleLowerCase("en-US")
    .replace(/[\p{White_Space}\p{Punctuation}\p{Symbol}]+/gu, "");
}

function codePointLength(text) {
  return [...text].length;
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
    rows.some(
      (row) =>
        !Number.isFinite(row.level) ||
        !Number.isFinite(row.page) ||
        !Number.isFinite(row.left) ||
        !Number.isFinite(row.top) ||
        !Number.isFinite(row.width),
    )
  ) {
    fail("pdf_extraction_error");
  }

  const pageWidths = new Map(
    rows
      .filter((row) => row.level === 1)
      .map((row) => [row.page, row.width]),
  );
  if (pageWidths.size === 0) {
    fail("pdf_extraction_error");
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

  return {
    pageCount: pageWidths.size,
    lines: [...groups.values()]
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
      ),
  };
}

function sectionIdFromText(text) {
  return text.match(/\b([0-9]+\.[0-9]+\.[0-9]+)\b/u)?.[1] ?? null;
}

function comparePosition(line, position) {
  return line.page - position.page || line.top - position.top;
}

function deriveCandidate(tsvData) {
  if (tsvData.pageCount !== EXPECTED_ATTACHMENT_PAGE_COUNT) {
    fail("document_topology_error");
  }

  const normalizedHeading = normalizeComparable(CORRECTED_COLUMN_HEADING);
  const headingLines = tsvData.lines.filter(
    (line) => normalizeComparable(line.text) === normalizedHeading,
  );
  const headingSides = new Set(headingLines.map((line) => line.side));
  const headingPages = new Set(headingLines.map((line) => line.page));
  if (
    headingLines.length !== EXPECTED_ATTACHMENT_PAGE_COUNT ||
    headingSides.size !== 1 ||
    headingPages.size !== EXPECTED_ATTACHMENT_PAGE_COUNT
  ) {
    fail("document_topology_error");
  }
  const [correctedSide] = headingSides;

  const starts = [];
  const seenIds = new Set();
  for (const line of tsvData.lines.filter(
    (entry) => entry.side === correctedSide,
  )) {
    const sectionId = sectionIdFromText(line.text);
    if (sectionId && !seenIds.has(sectionId)) {
      seenIds.add(sectionId);
      starts.push({ sectionId, page: line.page, top: line.top });
    }
  }
  if (starts.length < 2) {
    fail("document_topology_error");
  }

  const firstItem = starts[0];
  const nextItem = starts[1];
  const endPage = nextItem.page - (nextItem.page === firstItem.page ? 0 : 1);
  if (
    firstItem.page !== EXPECTED_ITEM_START_PAGE ||
    endPage !== EXPECTED_ITEM_END_PAGE
  ) {
    fail("document_topology_error");
  }

  const sourceLines = tsvData.lines.filter(
    (line) =>
      line.side === correctedSide &&
      comparePosition(line, firstItem) >= 0 &&
      comparePosition(line, nextItem) < 0,
  );
  const removedHeadingCount = sourceLines.filter(
    (line) => normalizeComparable(line.text) === normalizedHeading,
  ).length;
  const logicalLines = sourceLines
    .filter((line) => normalizeComparable(line.text) !== normalizedHeading)
    .map((line) => ({
      page: line.page,
      text: line.text.normalize("NFKC").trim(),
    }))
    .filter((line) => line.text.length > 0);

  if (
    logicalLines.length === 0 ||
    removedHeadingCount !==
      EXPECTED_ITEM_END_PAGE - EXPECTED_ITEM_START_PAGE + 1
  ) {
    fail("document_topology_error");
  }

  const sourcePages = logicalLines.map((line) => line.page);
  const sourcePageStart = Math.min(...sourcePages);
  const sourcePageEnd = Math.max(...sourcePages);
  if (
    sourcePageStart !== EXPECTED_ITEM_START_PAGE ||
    sourcePageEnd !== EXPECTED_ITEM_END_PAGE
  ) {
    fail("document_topology_error");
  }

  const lines = logicalLines.map((line) => line.text);
  const text = `${lines.join("\n")}\n`;
  if (
    text.startsWith("\uFEFF") ||
    text.includes("\r") ||
    text !== text.normalize("NFKC")
  ) {
    fail("document_topology_error");
  }

  return {
    lines,
    text,
    lineCount: lines.length,
    normalizedCharacterCount: lines.reduce(
      (total, line) => total + codePointLength(line),
      0,
    ),
    sourcePageStart,
    sourcePageEnd,
    removedHeadingCount,
  };
}

function findTableTitleIndexes(lines, definitionHeadingIndexes) {
  const titleSuffix = normalizeComparable("給付規定表");
  const candidates = lines.flatMap((line, index) =>
    sectionIdFromText(line) === null &&
    normalizeComparable(line).includes(titleSuffix)
      ? [index]
      : [],
  );
  const beforeFirstDefinition = candidates.filter(
    (index) => index < definitionHeadingIndexes[0],
  );
  const afterSecondDefinition = candidates.filter(
    (index) => index > definitionHeadingIndexes[1],
  );
  if (
    beforeFirstDefinition.length === 0 ||
    afterSecondDefinition.length === 0
  ) {
    fail("document_topology_error");
  }
  return [beforeFirstDefinition.at(-1), afterSecondDefinition[0]];
}

function countRowsByRelationalSignature(tableBodyLines, allowZeroRows) {
  const signatureCounts = new Map();
  const bodyText = tableBodyLines.join("\n");
  for (const match of bodyText.matchAll(/([A-Za-z][A-Za-z-]*)\s*[≧≥]/gu)) {
    const signature = match[1].toUpperCase();
    signatureCounts.set(signature, (signatureCounts.get(signature) ?? 0) + 1);
  }
  if (signatureCounts.size === 0) {
    return allowZeroRows ? 0 : null;
  }
  return Math.max(...signatureCounts.values());
}

function countRevisionDates(text) {
  return (
    text.match(
      /[0-9]{2,3}\s*[\/／]\s*[0-9]{1,2}\s*[\/／]\s*[0-9]{1,2}/gu,
    ) ?? []
  ).length;
}

function countTitleRevisionDates(lines) {
  const titleIndex = lines.findIndex((line) => sectionIdFromText(line) !== null);
  if (titleIndex === -1) {
    fail("document_topology_error");
  }

  let revisionDateCount = 0;
  let dateSeriesStarted = false;
  for (const line of lines.slice(titleIndex)) {
    const lineDateCount = countRevisionDates(line);
    if (lineDateCount > 0) {
      dateSeriesStarted = true;
      revisionDateCount += lineDateCount;
    } else if (dateSeriesStarted) {
      break;
    }
  }
  if (!dateSeriesStarted) {
    fail("document_topology_error");
  }
  return revisionDateCount;
}

function analyzeStructure(lines, allowZeroRowsInSecondTable = false) {
  const definitionHeadingIndexes = lines.flatMap((line, index) =>
    /定義[:：]/u.test(line) ? [index] : [],
  );
  if (definitionHeadingIndexes.length !== 2) {
    fail("document_topology_error");
  }
  const tableTitleIndexes = findTableTitleIndexes(
    lines,
    definitionHeadingIndexes,
  );
  if (
    !(
      tableTitleIndexes[0] < definitionHeadingIndexes[0] &&
      definitionHeadingIndexes[0] < definitionHeadingIndexes[1] &&
      definitionHeadingIndexes[1] < tableTitleIndexes[1]
    )
  ) {
    fail("document_topology_error");
  }

  const tableRowCounts = [
    countRowsByRelationalSignature(
      lines.slice(tableTitleIndexes[0] + 1, definitionHeadingIndexes[0]),
      false,
    ),
    countRowsByRelationalSignature(
      lines.slice(tableTitleIndexes[1] + 1),
      allowZeroRowsInSecondTable,
    ),
  ];
  if (tableRowCounts.some((count) => count === null)) {
    fail("document_topology_error");
  }

  const definitionRanges = [
    [definitionHeadingIndexes[0] + 1, definitionHeadingIndexes[1]],
    [definitionHeadingIndexes[1] + 1, tableTitleIndexes[1]],
  ];
  const definitionBlocks = definitionRanges.map(([start, end], index) => {
    const markerStyles = lines.slice(start, end).flatMap((line) => {
      if (/^\s*\([一二三四五六七八九十]+\)/u.test(line)) {
        return ["parenthesized"];
      }
      if (/^\s*[1-9][0-9]*\./u.test(line)) {
        return ["decimal"];
      }
      return [];
    });
    if (markerStyles.length === 0) {
      fail("document_topology_error");
    }
    const topLevelStyle = markerStyles[0];
    const topLevelItemCount = markerStyles.filter(
      (style) => style === topLevelStyle,
    ).length;
    const nestedItemCount = markerStyles.length - topLevelItemCount;
    return {
      blockId: `DEF-${index + 1}`,
      topLevelItemCount,
      nestedItemCount,
      enumeratedMarkerCount: markerStyles.length,
    };
  });

  return {
    tableCount: tableTitleIndexes.length,
    tableRowCounts,
    definitionBlockCount: definitionBlocks.length,
    definitionBlocks,
    revisionDateCount: countTitleRevisionDates(lines),
  };
}

function countExactOccurrences(text, label) {
  let count = 0;
  let offset = 0;
  while (true) {
    const foundAt = text.indexOf(label, offset);
    if (foundAt === -1) {
      return count;
    }
    count += 1;
    offset = foundAt + label.length;
  }
}

function formatSignedDifference(value) {
  return value > 0 ? `+${value}` : String(value);
}

function renderReport(data) {
  const integrityRows = data.integrity
    .map(
      (entry) =>
        `| ${entry.reportLabel} | \`${entry.expectedSha256}\` | \`${entry.actualSha256}\` | MATCH |`,
    )
    .join("\n");
  const exactLabelRows = TABLE_LABELS.map(
    (label) => `| ${label} | ${data.labelCounts[label]} |`,
  ).join("\n");
  const tableRows = data.candidateStructure.tableRowCounts
    .map(
      (count, index) =>
        `| 規定表 ${String.fromCharCode(65 + index)} | ${count} |`,
    )
    .join("\n");
  const definitionRows = data.candidateStructure.definitionBlocks
    .map(
      (block) =>
        `| ${block.blockId} | ${block.topLevelItemCount} | ${block.nestedItemCount} | ${block.enumeratedMarkerCount} |`,
    )
    .join("\n");
  const comparisons = [
    [
      "規定表數",
      data.priorStructure.tableCount,
      data.candidateStructure.tableCount,
    ],
    [
      "規定表 A 資料列數",
      data.priorStructure.tableRowCounts[0],
      data.candidateStructure.tableRowCounts[0],
    ],
    [
      "規定表 B 資料列數",
      data.priorStructure.tableRowCounts[1],
      data.candidateStructure.tableRowCounts[1],
    ],
    [
      "定義區塊數",
      data.priorStructure.definitionBlockCount,
      data.candidateStructure.definitionBlockCount,
    ],
    [
      "標題區修訂日期列示數",
      data.priorStructure.revisionDateCount,
      data.candidateStructure.revisionDateCount,
    ],
  ];
  const comparisonRows = comparisons
    .map(
      ([label, prior, candidate]) =>
        `| ${label} | ${prior} | ${candidate} | ${formatSignedDifference(candidate - prior)} |`,
    )
    .join("\n");

  return `# 表二程序新版 2.6.1 全文候選推導報告

## 狀態

- 狀態碼：PENDING_RA_REVIEW
- PDF 解析前雜湊閘門：PASS
- 候選檔位於 repo 外：true
- 候選內文於本報告重現：false

## 輸入檔雜湊驗證

| 輸入檔 | 期望 SHA-256 | 實算 SHA-256 | 結果 |
| --- | --- | --- | --- |
${integrityRows}

- 驗證檔數：${data.integrity.length}
- MATCH 檔數：${data.integrity.filter((entry) => entry.expectedSha256 === entry.actualSha256).length}
- 全部 MATCH：true

兩檔皆由原始位元組完成雜湊驗證後才開始 PDF 解析；任一不符時不解析，且報告與候選檔均不保留。

## A2-ITEM-01 右欄（修正後）擷取統計

擷取採 TSV 座標及各頁實際寬度中線機械識別欄位，以頁次、垂直座標、水平座標重組邏輯行，並移除重複欄頭。

| 統計 | 結果 |
| --- | ---: |
| 邏輯行數 | ${data.candidate.lineCount} |
| 正規化字元總數（不含 LF） | ${data.candidate.normalizedCharacterCount} |
| 來源起始頁 | ${data.candidate.sourcePageStart} |
| 來源結束頁 | ${data.candidate.sourcePageEnd} |
| 移除重複欄頭數 | ${data.candidate.removedHeadingCount} |

- 來源頁次範圍：第 ${data.candidate.sourcePageStart}–${data.candidate.sourcePageEnd} 頁
- 正規化：NFKC
- 行尾：LF
- BOM：false

## 候選檔

| 統計 | 結果 |
| --- | --- |
| SHA-256 | \`${data.candidateSha256}\` |
| bytes | ${data.candidateBytes} |
| repo 外 | true |
| 內文重現 | false |

## 候選結構計數

### 精確字樣

| 精確字樣 | 出現次數 |
| --- | ---: |
${exactLabelRows}

### 規定表與資料列

- 規定表數：${data.candidateStructure.tableCount}

| 結構標籤 | 資料列數 |
| --- | ---: |
${tableRows}

### 定義區塊與項數

- 定義區塊數：${data.candidateStructure.definitionBlockCount}

| 區塊 | 頂層項數 | 巢狀項數 | 列舉標記總數 |
| --- | ---: | ---: | ---: |
${definitionRows}

### 標題區

- 修訂日期列示個數：${data.candidateStructure.revisionDateCount}

以上僅為機械結構計數，不作規則語意解讀或表一／表二內部劃分認定。

## 舊版與候選結構對照

| 結構計數 | 舊版 | 候選 | 計數差異 |
| --- | ---: | ---: | ---: |
${comparisonRows}

對照僅呈現計數差異，不作候選與官方文件一致或正確之宣稱。

## 產物安全自我掃描

| 檢核 | 結果 |
| --- | --- |
| PDF 擷取文字儲存位置 | 僅程序記憶體 |
| repo 內擷取暫存文字檔 | 0 |
| 產物原始內容插值 | false |
| 量測單位樣式命中 | ${data.safety.measurementStyleHits} |
| 百分比門檻樣式命中 | ${data.safety.percentageStyleHits} |
| 受治理代碼形狀命中 | ${data.safety.governedCodeShapeHits} |
| 輸入清單詞彙命中 | ${data.safety.inputLexemeHits} |
| 輸入長片段外洩命中 | ${data.safety.longInputFragmentHits} |
| 記憶體內雜湊失敗探針 | ${data.memoryHashProbePassed ? "PASS" : "FAIL"} |

報告與腳本字面一併納入自我掃描；報告模板僅插入雜湊、計數、頁次、布林、狀態碼及核准結構標籤。產物不含時間戳，相同輸入可產生位元組一致結果。

**候選全文為機械推導產物,非官方文件,狀態 PENDING_RA_REVIEW(v3.2 §9.6);不得作為任何下游編碼或發布依據;待官方新版全文可下載(2026-09-01 起)後另案驗證。**
`;
}

function countMatches(text, pattern) {
  return (text.match(pattern) ?? []).length;
}

function scanArtifactSafety(artifactText, extractedTexts) {
  const measurementStyle =
    /[0-9]\s*(?:[mM][gG]|[mM][mM][oO][lL])(?:\s*[/／]\s*[dD]?[lL])?/gu;
  const percentageSign = String.fromCodePoint(37);
  const governedCodeShape = /[A-B][A-Z0-9][0-9]{8}/gu;
  const normalizedArtifact = normalizeComparable(artifactText);
  const longInputFragments = new Set();
  const inputLexemes = new Set(
    extractedTexts.flatMap(
      (text) =>
        text
          .toLocaleLowerCase("en-US")
          .match(/\b[A-Za-z][A-Za-z-]{4,}\b/gu) ?? [],
    ),
  );
  const artifactLexemes = new Set(
    artifactText
      .toLocaleLowerCase("en-US")
      .match(/\b[A-Za-z][A-Za-z-]{4,}\b/gu) ?? [],
  );

  for (const text of extractedTexts) {
    for (const line of text.split("\n")) {
      const normalizedLine = normalizeComparable(line);
      if (
        codePointLength(normalizedLine) >= MIN_FRAGMENT_CODE_POINTS &&
        normalizedArtifact.includes(normalizedLine)
      ) {
        longInputFragments.add(normalizedLine);
      }
    }
  }

  return {
    measurementStyleHits: countMatches(artifactText, measurementStyle),
    percentageStyleHits: artifactText.split(percentageSign).length - 1,
    governedCodeShapeHits: countMatches(artifactText, governedCodeShape),
    inputLexemeHits: [...inputLexemes].filter((word) =>
      artifactLexemes.has(word),
    ).length,
    longInputFragmentHits: longInputFragments.size,
  };
}

function safetyPassed(safety) {
  return Object.values(safety).every((count) => count === 0);
}

function writeOutputs(derivedPath, candidateText, report) {
  try {
    mkdirSync(path.dirname(derivedPath), { recursive: true });
  } catch {
    fail("derived_write_blocked");
  }

  if (validateDerivedPath() !== derivedPath) {
    fail("derived_path_error");
  }
  try {
    writeFileSync(derivedPath, candidateText, "utf8");
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
  const { forcedSourceIndex } = parseArguments(process.argv.slice(2));

  // Both raw-byte hashes are verified before any PDF parsing or output write.
  const verified = verifySources(SOURCE_DEFINITIONS, forcedSourceIndex);
  const verifiedById = new Map(verified.map((source) => [source.id, source]));
  const memoryHashProbePassed = runMemoryHashProbe(verified[0]);
  if (!memoryHashProbePassed) {
    fail("document_topology_error");
  }

  const attachmentLayout = extractPdfText(
    verifiedById.get("ATTACHMENT_2").filePath,
    "layout",
  );
  const attachmentTsv = extractPdfText(
    verifiedById.get("ATTACHMENT_2").filePath,
    "tsv",
  );
  const priorLayout = extractPdfText(
    verifiedById.get("PRIOR").filePath,
    "layout",
  );
  if (
    splitPdfPages(attachmentLayout).length !== EXPECTED_ATTACHMENT_PAGE_COUNT ||
    splitPdfPages(priorLayout).length !== EXPECTED_PRIOR_PAGE_COUNT
  ) {
    fail("document_topology_error");
  }

  const candidate = deriveCandidate(parseTsv(attachmentTsv));
  const priorLines = splitPdfPages(priorLayout)[0]
    .split("\n")
    .map((line) => line.normalize("NFKC"));
  const candidateStructure = analyzeStructure(candidate.lines, true);
  const priorStructure = analyzeStructure(priorLines);
  const labelCounts = Object.fromEntries(
    TABLE_LABELS.map((label) => [
      label,
      countExactOccurrences(candidate.text, label),
    ]),
  );

  const candidateBytes = Buffer.byteLength(candidate.text, "utf8");
  const candidateSha256 = createHash("sha256")
    .update(candidate.text, "utf8")
    .digest("hex");
  const reportData = {
    integrity: verified.map(
      ({ reportLabel, expectedSha256, actualSha256 }) => ({
        reportLabel,
        expectedSha256,
        actualSha256,
      }),
    ),
    candidate,
    candidateBytes,
    candidateSha256,
    candidateStructure,
    priorStructure,
    labelCounts,
    memoryHashProbePassed,
    safety: {
      measurementStyleHits: 0,
      percentageStyleHits: 0,
      governedCodeShapeHits: 0,
      inputLexemeHits: 0,
      longInputFragmentHits: 0,
    },
  };
  const extractedTexts = [attachmentLayout, priorLayout];
  const scriptSource = readFileSync(SCRIPT_PATH, "utf8");
  let report = renderReport(reportData);
  const safety = scanArtifactSafety(`${scriptSource}\n${report}`, extractedTexts);
  if (!safetyPassed(safety)) {
    fail("report_safety_error", safety);
  }
  reportData.safety = safety;
  report = renderReport(reportData);
  const finalSafety = scanArtifactSafety(
    `${scriptSource}\n${report}`,
    extractedTexts,
  );
  if (!safetyPassed(finalSafety)) {
    fail("report_safety_error", finalSafety);
  }

  writeOutputs(derivedPath, candidate.text, report);
  process.stdout.write(
    `${JSON.stringify({
      ok: true,
      status: "PENDING_RA_REVIEW",
      report: path.relative(REPO_ROOT, REPORT_PATH),
      candidateSha256,
      candidateBytes,
    })}\n`,
  );
}

let validatedDerivedPath = null;
try {
  validatedDerivedPath = validateDerivedPath();
  main();
} catch (error) {
  try {
    if (validatedDerivedPath !== null) {
      removeOutputs(validatedDerivedPath);
    } else if (existsSync(REPORT_PATH)) {
      unlinkSync(REPORT_PATH);
    }
  } catch {
    // The primary safe error remains authoritative for the status response.
  }
  const safeError =
    error instanceof DerivationError
      ? error
      : new DerivationError("source_file_error");
  process.stderr.write(
    `${JSON.stringify({
      ok: false,
      status:
        safeError.code === "derived_write_blocked" ? "BLOCKED" : "FAILED",
      error: safeError.code,
      ...safeError.details,
    })}\n`,
  );
  process.exitCode = 1;
}
