#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
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
  "table2-new262-263-derivation-report.md",
);
const INPUT_DIRECTORY =
  "/root/.claude/uploads/94f9d3c6-80d2-5a5b-9756-182a30351591";
const DERIVED_DIRECTORY =
  "/tmp/claude-0/-home-user-nhi-cv-drug-rule-locator/94f9d3c6-80d2-5a5b-9756-182a30351591/scratchpad/derived";
const PDFTOTEXT_PATH = "/usr/bin/pdftotext";

const SOURCE_DEFINITIONS = [
  {
    id: "ATTACHMENT_2",
    reportLabel: "附件 2 修訂對照表 PDF",
    receiptPrefix: "daa3c5ff-",
    expectedSha256:
      "6389a5f654e0cb755d006f04ed47eca6ada9f867873f43c5088f79db6bb6c1c2",
  },
  {
    id: "PRIOR_262",
    reportLabel: "舊版 2.6.2 全文 PDF",
    receiptPrefix: "84e7aaa9-",
    expectedSha256:
      "8993b1dd3f983c583e512632913fb2fd825cc6a3a4c2ec6a1a930f481b9db451",
  },
  {
    id: "PRIOR_263",
    reportLabel: "舊版 2.6.3 全文 PDF",
    receiptPrefix: "91d936cc-",
    expectedSha256:
      "eb59877e80e10ddecba744bb4b67d558990358c35de096010c0ca9c932508a7a",
  },
];

const CANDIDATE_DEFINITIONS = [
  {
    id: "NEW_262",
    reportLabel: "新版 2.6.2 全文候選",
    itemId: "A2-ITEM-02",
    itemIndex: 1,
    expectedStartPage: 12,
    expectedEndPage: 12,
    priorId: "PRIOR_262",
    fileName: "new-262-candidate.txt",
  },
  {
    id: "NEW_263",
    reportLabel: "新版 2.6.3 全文候選",
    itemId: "A2-ITEM-03",
    itemIndex: 2,
    expectedStartPage: 12,
    expectedEndPage: 13,
    priorId: "PRIOR_263",
    fileName: "new-263-candidate.txt",
  },
];

const EXPECTED_ATTACHMENT_PAGE_COUNT = 13;
const EXPECTED_PRIOR_PAGE_COUNT = 1;
const EXPECTED_ITEM_COUNT = 3;
const CORRECTED_COLUMN_HEADING = "建議修訂後給付規定";
const TABLE_LABELS = ["表一", "表二"];
const MIN_FRAGMENT_CODE_POINTS = 12;
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

function validateDerivedPath(candidatePath) {
  const lexicalPath = path.resolve(candidatePath);
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

function candidatePath(definition) {
  return path.join(DERIVED_DIRECTORY, definition.fileName);
}

function validateDerivedPaths() {
  return CANDIDATE_DEFINITIONS.map((definition) =>
    validateDerivedPath(candidatePath(definition)),
  );
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
  if (
    !Number.isSafeInteger(suppliedIndex) ||
    suppliedIndex < 0 ||
    suppliedIndex > SOURCE_DEFINITIONS.length
  ) {
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

function removeOutputs(derivedPaths) {
  let reportRemovalFailed = false;
  let derivedRemovalFailed = false;

  try {
    if (existsSync(REPORT_PATH)) {
      unlinkSync(REPORT_PATH);
    }
  } catch {
    reportRemovalFailed = true;
  }
  for (const derivedPath of derivedPaths) {
    try {
      if (existsSync(derivedPath)) {
        unlinkSync(derivedPath);
      }
    } catch {
      derivedRemovalFailed = true;
    }
  }

  if (reportRemovalFailed) {
    fail("report_write_error");
  }
  if (derivedRemovalFailed) {
    fail("derived_write_blocked");
  }
}

function resolveSourcePath(receiptPrefix) {
  let entries;
  try {
    entries = readdirSync(INPUT_DIRECTORY);
  } catch {
    fail("source_file_error");
  }
  const matches = entries.filter((entry) => entry.startsWith(receiptPrefix));
  if (matches.length !== 1) {
    fail("source_file_error");
  }
  return path.join(INPUT_DIRECTORY, matches[0]);
}

function alteredHash(hash) {
  const first = hash[0] === "0" ? "1" : "0";
  return `${first}${hash.slice(1)}`;
}

function verifySources(sourceDefinitions, forcedSourceIndex) {
  const verified = [];

  for (let index = 0; index < sourceDefinitions.length; index += 1) {
    const source = sourceDefinitions[index];
    const filePath = resolveSourcePath(source.receiptPrefix);
    let bytes;
    try {
      if (!statSync(filePath).isFile()) {
        fail("source_file_error", { input: source.id });
      }
      bytes = readFileSync(filePath);
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
    verified.push({ ...source, actualSha256, bytes, filePath });
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

function inventoryItemStarts(tsvData) {
  const starts = [];
  const seenIds = new Set();
  for (const line of tsvData.lines.filter((entry) => entry.side === "left")) {
    const sectionId = sectionIdFromText(line.text);
    if (sectionId && !seenIds.has(sectionId)) {
      seenIds.add(sectionId);
      starts.push({ sectionId, page: line.page, top: line.top });
    }
  }
  if (starts.length !== EXPECTED_ITEM_COUNT) {
    fail("document_topology_error");
  }
  return starts;
}

function correctedColumnSide(tsvData) {
  const normalizedHeading = normalizeComparable(CORRECTED_COLUMN_HEADING);
  const headings = tsvData.lines.filter(
    (line) => normalizeComparable(line.text) === normalizedHeading,
  );
  const headingSides = new Set(headings.map((line) => line.side));
  const headingPages = new Set(headings.map((line) => line.page));
  if (
    headings.length !== EXPECTED_ATTACHMENT_PAGE_COUNT ||
    headingSides.size !== 1 ||
    headingPages.size !== EXPECTED_ATTACHMENT_PAGE_COUNT
  ) {
    fail("document_topology_error");
  }
  return {
    normalizedHeading,
    side: [...headingSides][0],
  };
}

function deriveCandidates(tsvData) {
  if (tsvData.pageCount !== EXPECTED_ATTACHMENT_PAGE_COUNT) {
    fail("document_topology_error");
  }
  const starts = inventoryItemStarts(tsvData);
  const correctedColumn = correctedColumnSide(tsvData);
  const secondStart = starts[CANDIDATE_DEFINITIONS[0].itemIndex];
  const thirdStart = starts[CANDIDATE_DEFINITIONS[1].itemIndex];
  if (
    secondStart.page !== 12 ||
    thirdStart.page !== 12 ||
    secondStart.top >= thirdStart.top
  ) {
    fail("document_topology_error");
  }

  return CANDIDATE_DEFINITIONS.map((definition) => {
    const start = starts[definition.itemIndex];
    const next = starts[definition.itemIndex + 1] ?? null;
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
    const logicalLines = sourceLines
      .filter(
        (line) =>
          normalizeComparable(line.text) !== correctedColumn.normalizedHeading,
      )
      .map((line) => ({
        page: line.page,
        text: line.text.normalize("NFKC").trim(),
      }))
      .filter((line) => line.text.length > 0);

    if (logicalLines.length === 0) {
      fail("document_topology_error");
    }
    const sourcePages = logicalLines.map((line) => line.page);
    const sourcePageStart = Math.min(...sourcePages);
    const sourcePageEnd = Math.max(...sourcePages);
    if (
      sourcePageStart !== definition.expectedStartPage ||
      sourcePageEnd !== definition.expectedEndPage
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
      ...definition,
      boundaryStart: start,
      boundaryEnd: next,
      samePageSplit: next !== null && start.page === next.page,
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
  });
}

function lineHasEnumerationMarker(line) {
  if (sectionIdFromText(line) !== null) {
    return false;
  }
  const trimmed = line.trimStart();
  return (
    /^[1-9][0-9]*[.、]/u.test(trimmed) ||
    /^[（(][0-9一二三四五六七八九十]+[）)]/u.test(trimmed) ||
    /^[一二三四五六七八九十]+[.、]/u.test(trimmed)
  );
}

function countRevisionDates(text) {
  return (
    text.match(
      /[0-9]{2,3}\s*[\/／]\s*[0-9]{1,2}\s*[\/／]\s*[0-9]{1,2}/gu,
    ) ?? []
  ).length;
}

function analyzeClauseStructure(lines) {
  const topLevelIndexes = lines.flatMap((line, index) =>
    sectionIdFromText(line) === null &&
    /^\s*[1-9][0-9]*[.、]/u.test(line)
      ? [index]
      : [],
  );
  if (topLevelIndexes.length === 0) {
    fail("document_topology_error");
  }
  const firstClauseIndex = Math.min(...topLevelIndexes);
  const titleText = lines.slice(0, firstClauseIndex).join("\n");
  const revisionDateCount = countRevisionDates(titleText);
  if (revisionDateCount === 0) {
    fail("document_topology_error");
  }
  return {
    topLevelItemCount: topLevelIndexes.length,
    revisionDateCount,
    enumeratedMarkerCount: lines.filter(lineHasEnumerationMarker).length,
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

function formatPageRange(startPage, endPage) {
  return startPage === endPage
    ? `第 ${startPage} 頁`
    : `第 ${startPage}–${endPage} 頁`;
}

function formatCoordinate(value) {
  return value.toFixed(2);
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
  const boundaryRows = data.candidates
    .map((candidate) => {
      const endPage = candidate.boundaryEnd?.page ?? candidate.sourcePageEnd;
      const endTop = candidate.boundaryEnd
        ? formatCoordinate(candidate.boundaryEnd.top)
        : "文件末端";
      return `| ${candidate.itemId} | ${formatPageRange(candidate.sourcePageStart, candidate.sourcePageEnd)} | ${candidate.boundaryStart.page} | ${formatCoordinate(candidate.boundaryStart.top)} | ${endPage} | ${endTop} | ${candidate.samePageSplit} | ${candidate.lineCount} |`;
    })
    .join("\n");
  const extractionRows = data.candidates
    .map(
      (candidate) =>
        `| ${candidate.itemId} | ${candidate.reportLabel} | ${candidate.lineCount} | ${candidate.normalizedCharacterCount} | ${candidate.removedHeadingCount} | \`${candidate.sha256}\` | ${candidate.bytes} |`,
    )
    .join("\n");
  const structureRows = data.candidates
    .map(
      (candidate) =>
        `| ${candidate.reportLabel} | ${candidate.structure.topLevelItemCount} | ${candidate.structure.revisionDateCount} | ${candidate.labelCounts["表一"]} | ${candidate.labelCounts["表二"]} | ${candidate.structure.enumeratedMarkerCount} |`,
    )
    .join("\n");
  const comparisonRows = data.candidates
    .flatMap((candidate) => {
      const prior = data.priorStructures.get(candidate.priorId);
      return [
        [
          candidate.itemId,
          "頂層條文項數",
          prior.topLevelItemCount,
          candidate.structure.topLevelItemCount,
        ],
        [
          candidate.itemId,
          "標題區修訂日期列示數",
          prior.revisionDateCount,
          candidate.structure.revisionDateCount,
        ],
      ];
    })
    .map(
      ([itemId, label, prior, candidate]) =>
        `| ${itemId} | ${label} | ${prior} | ${candidate} | ${formatSignedDifference(candidate - prior)} |`,
    )
    .join("\n");

  return `# 表二程序新版 2.6.2／2.6.3 全文候選推導報告

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

三檔皆由原始位元組完成雜湊驗證後才開始 PDF 解析；任一不符時不解析，且報告與兩候選檔均不保留。

## 項目切分統計

項目粒度由附件左欄頂層節次標題的頁次與垂直座標界定；起點包含、下一起點不包含。第 12 頁兩項以各自左欄標題垂直座標切分，不採整頁粒度。

| 項次 | 來源頁次範圍 | 起點頁 | 起點 top | 終點頁 | 終點 top | 同頁下一邊界 | 邏輯行數 |
| --- | --- | ---: | ---: | ---: | ---: | --- | ---: |
${boundaryRows}

## 右欄（修正後）擷取與候選檔統計

擷取採 TSV 座標及各頁實際寬度中線機械識別欄位，以頁次、垂直座標、水平座標重組邏輯行，並移除重複欄頭。候選均為 UTF-8、NFKC、LF、無 BOM，且僅寫入指定 repo 外路徑。

| 項次 | 候選 | 邏輯行數 | 正規化字元總數（不含 LF） | 移除重複欄頭數 | SHA-256 | bytes |
| --- | --- | ---: | ---: | ---: | --- | ---: |
${extractionRows}

## 候選結構計數

| 候選 | 頂層條文項數 | 標題區修訂日期列示個數 | 表一精確字樣次數 | 表二精確字樣次數 | 列舉標記總數 |
| --- | ---: | ---: | ---: | ---: | ---: |
${structureRows}

以上僅為機械結構計數；精確字樣次數如實列示（含 0），不作規則語意解讀或表一／表二對應認定。

## 舊版與候選結構對照

| 小節 | 結構計數 | 舊版 | 候選 | 計數差異 |
| --- | --- | ---: | ---: | ---: |
${comparisonRows}

對照僅呈現各小節計數差異，不作候選與官方文件一致或正確之宣稱。

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

報告與腳本字面一併納入自我掃描；報告模板僅插入雜湊、計數、頁次、座標、布林、狀態碼及核准結構標籤。產物不含時間戳，相同輸入可產生位元組一致結果。

**兩候選全文為機械推導產物,非官方文件,狀態 PENDING_RA_REVIEW(v3.2 §9.6);不得作為任何下游編碼或發布依據;待官方新版全文可下載(2026-09-01 起)後另案驗證。**
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

function writeOutputs(derivedPaths, candidates, report) {
  try {
    mkdirSync(DERIVED_DIRECTORY, { recursive: true });
  } catch {
    fail("derived_write_blocked");
  }

  const revalidatedPaths = validateDerivedPaths();
  if (
    revalidatedPaths.some(
      (derivedPath, index) => derivedPath !== derivedPaths[index],
    )
  ) {
    fail("derived_path_error");
  }

  for (let index = 0; index < candidates.length; index += 1) {
    try {
      writeFileSync(derivedPaths[index], candidates[index].text, "utf8");
    } catch {
      for (const cleanupPath of derivedPaths) {
        removeFileIfPresent(cleanupPath, "derived_write_blocked");
      }
      fail("derived_write_blocked");
    }
  }

  try {
    writeFileSync(REPORT_PATH, report, "utf8");
  } catch {
    for (const cleanupPath of derivedPaths) {
      removeFileIfPresent(cleanupPath, "derived_write_blocked");
    }
    removeFileIfPresent(REPORT_PATH, "report_write_error");
    fail("report_write_error");
  }
}

function main(derivedPaths) {
  removeOutputs(derivedPaths);
  const { forcedSourceIndex } = parseArguments(process.argv.slice(2));

  // All raw-byte hashes are verified before any PDF parsing or output write.
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
  const priorLayouts = new Map(
    ["PRIOR_262", "PRIOR_263"].map((id) => [
      id,
      extractPdfText(verifiedById.get(id).filePath, "layout"),
    ]),
  );
  if (
    splitPdfPages(attachmentLayout).length !==
      EXPECTED_ATTACHMENT_PAGE_COUNT ||
    [...priorLayouts.values()].some(
      (layout) => splitPdfPages(layout).length !== EXPECTED_PRIOR_PAGE_COUNT,
    )
  ) {
    fail("document_topology_error");
  }

  const candidates = deriveCandidates(parseTsv(attachmentTsv)).map(
    (candidate) => {
      const structure = analyzeClauseStructure(candidate.lines);
      const labelCounts = Object.fromEntries(
        TABLE_LABELS.map((label) => [
          label,
          countExactOccurrences(candidate.text, label),
        ]),
      );
      return {
        ...candidate,
        structure,
        labelCounts,
        bytes: Buffer.byteLength(candidate.text, "utf8"),
        sha256: createHash("sha256")
          .update(candidate.text, "utf8")
          .digest("hex"),
      };
    },
  );
  const priorStructures = new Map(
    [...priorLayouts].map(([id, layout]) => [
      id,
      analyzeClauseStructure(
        splitPdfPages(layout)[0]
          .split("\n")
          .map((line) => line.normalize("NFKC")),
      ),
    ]),
  );

  const reportData = {
    integrity: verified.map(
      ({ reportLabel, expectedSha256, actualSha256 }) => ({
        reportLabel,
        expectedSha256,
        actualSha256,
      }),
    ),
    candidates,
    priorStructures,
    memoryHashProbePassed,
    safety: {
      measurementStyleHits: 0,
      percentageStyleHits: 0,
      governedCodeShapeHits: 0,
      inputLexemeHits: 0,
      longInputFragmentHits: 0,
    },
  };
  const extractedTexts = [
    attachmentLayout,
    ...priorLayouts.values(),
    ...candidates.map((candidate) => candidate.text),
  ];
  const scriptSource = readFileSync(SCRIPT_PATH, "utf8");
  let report = renderReport(reportData);
  const safety = scanArtifactSafety(
    `${scriptSource}\n${report}`,
    extractedTexts,
  );
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

  writeOutputs(derivedPaths, candidates, report);
  process.stdout.write(
    `${JSON.stringify({
      ok: true,
      status: "PENDING_RA_REVIEW",
      report: path.relative(REPO_ROOT, REPORT_PATH),
      candidates: candidates.map(({ itemId, sha256, bytes }) => ({
        itemId,
        sha256,
        bytes,
      })),
    })}\n`,
  );
}

let validatedDerivedPaths = [];
try {
  validatedDerivedPaths = validateDerivedPaths();
  main(validatedDerivedPaths);
} catch (error) {
  try {
    if (validatedDerivedPaths.length > 0) {
      removeOutputs(validatedDerivedPaths);
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
