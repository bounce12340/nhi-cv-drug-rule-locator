#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  readFileSync,
  readdirSync,
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
  "table2-cross-review-report-r2.md",
);
const INPUT_DIRECTORY =
  "/root/.claude/uploads/94f9d3c6-80d2-5a5b-9756-182a30351591";
const PDFTOTEXT_PATH = "/usr/bin/pdftotext";
const MIN_FRAGMENT_CODE_POINTS = 12;

const SOURCE_DEFINITIONS = [
  {
    id: "ATTACHMENT",
    receiptPrefix: "daa3c5ff-",
    expectedSha256:
      "6389a5f654e0cb755d006f04ed47eca6ada9f867873f43c5088f79db6bb6c1c2",
  },
  {
    id: "B1",
    receiptPrefix: "0a84997a-",
    expectedSha256:
      "bd7e96e5b8551c39718f80b3d5fa394581457e34f2dea1f8628a8982201bc79a",
  },
  {
    id: "B2",
    receiptPrefix: "84e7aaa9-",
    expectedSha256:
      "8993b1dd3f983c583e512632913fb2fd825cc6a3a4c2ec6a1a930f481b9db451",
  },
  {
    id: "B3",
    receiptPrefix: "91d936cc-",
    expectedSha256:
      "eb59877e80e10ddecba744bb4b67d558990358c35de096010c0ca9c932508a7a",
  },
];

const BASIS_DECLARATIONS = {
  B2: { topLevelItemCount: 2, revisionDateCount: 1 },
  B3: { topLevelItemCount: 2, revisionDateCount: 4 },
};

const SAFE_LOCATION_LABELS = ["文件標題區", "條文區"];
const TABLE_LABELS = ["表一", "表二"];
const RIGHT_COLUMN_HEADING = "原給付規定";
const OMISSION_MARKER = "以下略";
const SAFE_ERROR_CODES = new Set([
  "argument_error",
  "document_topology_error",
  "hash_mismatch",
  "pdf_extraction_error",
  "report_safety_error",
  "report_write_error",
  "source_file_error",
]);

class CrossReviewError extends Error {
  constructor(code, details = {}) {
    super(code);
    this.name = "CrossReviewError";
    this.code = SAFE_ERROR_CODES.has(code) ? code : "source_file_error";
    this.details = details;
  }
}

function fail(code, details = {}) {
  throw new CrossReviewError(code, details);
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
  if (!Number.isSafeInteger(suppliedIndex) || suppliedIndex < 0 || suppliedIndex > 4) {
    fail("argument_error");
  }
  return {
    forcedSourceIndex: suppliedIndex === 0 ? 0 : suppliedIndex - 1,
  };
}

function removePriorReport() {
  try {
    if (existsSync(REPORT_PATH)) {
      unlinkSync(REPORT_PATH);
    }
  } catch {
    fail("report_write_error");
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
      if (error instanceof CrossReviewError) {
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
  const actual = createHash("sha256").update(source.bytes).digest("hex");
  return actual !== alteredHash(source.expectedSha256);
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
  return result.stdout.replaceAll("\r\n", "\n");
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

  const lineGroups = new Map();
  for (const row of rows.filter((entry) => entry.level === 5)) {
    const pageWidth = pageWidths.get(row.page);
    if (!Number.isFinite(pageWidth)) {
      fail("pdf_extraction_error");
    }
    const side = row.left >= pageWidth / 2 ? "right" : "left";
    const key = [row.page, row.paragraph, row.block, row.line, side].join(":");
    const group = lineGroups.get(key) ?? {
      page: row.page,
      top: row.top,
      left: row.left,
      side,
      words: [],
    };
    group.top = Math.min(group.top, row.top);
    group.left = Math.min(group.left, row.left);
    group.words.push(row);
    lineGroups.set(key, group);
  }

  return [...lineGroups.values()]
    .map((group) => ({
      page: group.page,
      top: group.top,
      left: group.left,
      side: group.side,
      text: group.words
        .sort((left, right) => left.left - right.left || left.word - right.word)
        .map((word) => word.text)
        .join(" "),
    }))
    .sort(
      (left, right) =>
        left.page - right.page ||
        left.top - right.top ||
        left.left - right.left,
    );
}

function sectionIdFromText(text) {
  return text.match(/\b([0-9]+\.[0-9]+\.[0-9]+)\b/u)?.[1] ?? null;
}

function inventoryAmendmentItems(attachmentPages, tsvLines) {
  const starts = [];
  const seenIds = new Set();
  for (const line of tsvLines.filter((entry) => entry.side === "left")) {
    const sectionId = sectionIdFromText(line.text);
    if (sectionId && !seenIds.has(sectionId)) {
      seenIds.add(sectionId);
      starts.push({ page: line.page, sectionId });
    }
  }
  if (starts.length === 0) {
    fail("document_topology_error");
  }

  const items = starts.map((start, index) => {
    const next = starts[index + 1];
    return {
      itemId: `A2-ITEM-${String(index + 1).padStart(2, "0")}`,
      sectionId: start.sectionId,
      startPage: start.page,
      endPage: next
        ? Math.max(start.page, next.page - (next.page === start.page ? 0 : 1))
        : attachmentPages.length,
      originalLines: [],
    };
  });
  const itemsBySection = new Map(items.map((item) => [item.sectionId, item]));
  const normalizedHeading = normalizeComparable(RIGHT_COLUMN_HEADING);

  let currentSectionId = null;
  for (const line of tsvLines.filter((entry) => entry.side === "right")) {
    if (normalizeComparable(line.text) === normalizedHeading) {
      continue;
    }
    const sectionId = sectionIdFromText(line.text);
    if (sectionId) {
      currentSectionId = sectionId;
    }
    const currentItem = itemsBySection.get(currentSectionId);
    if (currentItem) {
      currentItem.originalLines.push(line);
    }
  }

  for (const item of items) {
    item.hasOmissionMarker = item.originalLines.some((line) =>
      line.text.includes(OMISSION_MARKER),
    );
    item.comparableFragments = item.originalLines
      .filter((line) => !line.text.includes(OMISSION_MARKER))
      .map((line) => normalizeComparable(line.text))
      .filter((line) => codePointLength(line) >= MIN_FRAGMENT_CODE_POINTS);
  }
  return items;
}

function basisTopology(text) {
  const pages = splitPdfPages(text);
  if (pages.length !== 1) {
    fail("document_topology_error");
  }
  const lines = pages[0].split("\n");
  const topLevelIndexes = lines.flatMap((line, index) => {
    if (sectionIdFromText(line)) {
      return [];
    }
    return /^\s*[1-9][0-9]*[.、]/u.test(line) ? [index] : [];
  });
  if (topLevelIndexes.length === 0) {
    fail("document_topology_error");
  }

  const firstClauseIndex = Math.min(...topLevelIndexes);
  const titleText = lines.slice(0, firstClauseIndex).join("\n");
  const clauseText = lines.slice(firstClauseIndex).join("\n");
  const datePattern = /[0-9]{2,3}\s*[\/／]\s*[0-9]{1,2}\s*[\/／]\s*[0-9]{1,2}/gu;
  return {
    pages,
    normalized: normalizeComparable(text),
    titleNormalized: normalizeComparable(titleText),
    clauseNormalized: normalizeComparable(clauseText),
    topLevelItemCount: topLevelIndexes.length,
    revisionDateCount: (titleText.match(datePattern) ?? []).length,
  };
}

function locateItems(items, bases) {
  for (const item of items) {
    item.comparisons = bases.map((basis) => {
      const locatedFragments = item.comparableFragments.filter((fragment) =>
        basis.topology.normalized.includes(fragment),
      );
      let status = "PARTIAL";
      if (locatedFragments.length === 0) {
        status = "NOT_FOUND";
      } else if (
        locatedFragments.length === item.comparableFragments.length &&
        !item.hasOmissionMarker
      ) {
        status = "FOUND";
      }

      const labels = SAFE_LOCATION_LABELS.filter((label) => {
        const area =
          label === "文件標題區"
            ? basis.topology.titleNormalized
            : basis.topology.clauseNormalized;
        return locatedFragments.some((fragment) => area.includes(fragment));
      });
      if (locatedFragments.length > 0 && labels.length === 0) {
        labels.push("條文區");
      }
      return {
        basisId: basis.id,
        comparableFragmentCount: item.comparableFragments.length,
        locatedFragmentCount: locatedFragments.length,
        hasOmissionMarker: item.hasOmissionMarker,
        locationLabels: labels,
        status,
      };
    });

    item.nonNotFoundBases = item.comparisons
      .filter((comparison) => comparison.status !== "NOT_FOUND")
      .map((comparison) => comparison.basisId);
    item.uniqueBasis = item.nonNotFoundBases.length === 1;
  }
}

function countExactOccurrences(pages, label) {
  return pages
    .map((pageText, index) => {
      let count = 0;
      let offset = 0;
      while (true) {
        const foundAt = pageText.indexOf(label, offset);
        if (foundAt === -1) {
          break;
        }
        count += 1;
        offset = foundAt + label.length;
      }
      return { count, page: index + 1 };
    })
    .filter((entry) => entry.count > 0);
}

function totalOccurrences(occurrences) {
  return occurrences.reduce((total, entry) => total + entry.count, 0);
}

function formatPageRange(startPage, endPage) {
  return startPage === endPage
    ? `第 ${startPage} 頁`
    : `第 ${startPage}–${endPage} 頁`;
}

function formatOccurrencePages(occurrences) {
  if (occurrences.length === 0) {
    return "—";
  }
  return occurrences
    .map(({ page, count }) => `第 ${page} 頁（${count} 次）`)
    .join("、");
}

function renderReport(data) {
  const integrityRows = data.integrity
    .map(
      (entry) =>
        `| ${entry.id} | \`${entry.expectedSha256}\` | \`${entry.actualSha256}\` | MATCH |`,
    )
    .join("\n");
  const inventoryRows = data.items
    .map(
      (item) =>
        `| ${item.itemId} | ${formatPageRange(item.startPage, item.endPage)} |`,
    )
    .join("\n");
  const matrixRows = data.items
    .flatMap((item) =>
      item.comparisons.map((comparison) => {
        const labels = comparison.locationLabels.join("、") || "—";
        return `| ${item.itemId} | ${comparison.basisId} | ${comparison.status} | ${comparison.comparableFragmentCount} | ${comparison.locatedFragmentCount} | ${comparison.hasOmissionMarker} | ${labels} |`;
      }),
    )
    .join("\n");
  const assignmentRows = data.items
    .map((item) => {
      const bases = item.nonNotFoundBases.join("、") || "—";
      return `| ${item.itemId} | ${bases} | ${item.uniqueBasis} |`;
    })
    .join("\n");
  const structureRows = data.bases
    .filter((basis) => Object.hasOwn(BASIS_DECLARATIONS, basis.id))
    .map((basis) => {
      const declared = BASIS_DECLARATIONS[basis.id];
      const matches =
        declared.topLevelItemCount === basis.topology.topLevelItemCount &&
        declared.revisionDateCount === basis.topology.revisionDateCount;
      return `| ${basis.id} | ${declared.topLevelItemCount} | ${basis.topology.topLevelItemCount} | ${declared.revisionDateCount} | ${basis.topology.revisionDateCount} | ${matches ? "一致" : "不一致"} |`;
    })
    .join("\n");
  const labelRows = data.bases
    .filter((basis) => basis.id === "B2" || basis.id === "B3")
    .flatMap((basis) =>
      TABLE_LABELS.map((label) => {
        const occurrences = basis.labelOccurrences[label];
        return `| ${basis.id} | ${label} | ${totalOccurrences(occurrences)} | ${formatOccurrencePages(occurrences)} |`;
      }),
    )
    .join("\n");

  return `# 表二程序 Stage 3 交叉檢視 r2 報告

## 輸入雜湊閘門

| 輸入識別 | 期望 SHA-256 | 實算 SHA-256 | 結果 |
| --- | --- | --- | --- |
${integrityRows}

- 驗證檔數：${data.integrity.length}
- 全部 MATCH：true
- 雜湊閘門：PASS

4 檔雜湊皆在任何 PDF 解析前由原始位元組完成驗證；任一不符時不解析且不保留報告或暫存檔。

## 修訂項目盤點

盤點粒度為附件左欄頂層節次標題。

- 修訂項目總數：${data.items.length}

| 項次 | 附件頁次 |
| --- | --- |
${inventoryRows}

## 修正前欄逐項逐基準定位矩陣

以 TSV 座標和頁寬中線切欄並移除重複欄頭；正規化採 NFKC、英文字母小寫化及移除空白標點符號。短行不作獨立證據，定位採連續子字串；判定碼為 FOUND、PARTIAL、NOT_FOUND。

| 項次 | 基準 | 狀態 | 可比對片段數 | 已定位片段數 | 略載標記 | 舊文區位標籤 |
| --- | --- | --- | ---: | ---: | --- | --- |
${matrixRows}

## 機械歸位統計

| 項次 | 非 NOT_FOUND 基準集合 | UNIQUE_BASIS |
| --- | --- | --- |
${assignmentRows}

**歸屬之最終認定不由本腳本作成，統計結果僅供 RA 與後續程序參考；NOT_FOUND 不延伸為任何文件之正誤判斷。**

## 新基準結構複驗

| 基準 | 來源宣告頂層條文項數 | 本次計數 | 來源宣告標題區修訂日期列示數 | 本次計數 | 對照結果 |
| --- | ---: | ---: | ---: | ---: | --- |
${structureRows}

## 精確字樣計數

| 基準 | 精確字樣 | 出現次數 | 頁次分布 |
| --- | --- | ---: | --- |
${labelRows}

以上僅為精確字樣機械計數，不作對應或歸屬認定。

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

報告由固定模板僅插入雜湊、計數、頁次、布林、狀態碼及核准結構標籤；不含時間戳，相同輸入可產生位元組一致結果。
`;
}

function countMatches(text, pattern) {
  return (text.match(pattern) ?? []).length;
}

function scanArtifactSafety(artifactText, extractedTexts) {
  const measurementStyle =
    /[0-9]\s*(?:[mM][gG]|[mM][mM][oO][lL])\s*[/／]\s*[dD]?[lL]/gu;
  const percentageSign = String.fromCodePoint(37);
  const governedCodeShape = /[A-B][A-Z0-9][0-9]{8}/gu;
  const normalizedArtifact = normalizeComparable(artifactText);
  const longInputFragments = new Set();
  const inputLexemes = new Set(
    extractedTexts.flatMap((text) =>
      text.toLocaleLowerCase("en-US").match(/\b[A-Za-z][A-Za-z-]{4,}\b/gu) ?? [],
    ),
  );
  const artifactLexemes = new Set(
    artifactText.toLocaleLowerCase("en-US").match(/\b[A-Za-z][A-Za-z-]{4,}\b/gu) ?? [],
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
    inputLexemeHits: [...inputLexemes].filter((word) => artifactLexemes.has(word))
      .length,
    longInputFragmentHits: longInputFragments.size,
  };
}

function safetyPassed(safety) {
  return Object.values(safety).every((count) => count === 0);
}

function writeReport(report) {
  try {
    writeFileSync(REPORT_PATH, report, "utf8");
  } catch {
    try {
      if (existsSync(REPORT_PATH)) {
        unlinkSync(REPORT_PATH);
      }
    } catch {
      fail("report_write_error");
    }
    fail("report_write_error");
  }
}

function main() {
  const { forcedSourceIndex } = parseArguments(process.argv.slice(2));
  removePriorReport();

  const verified = verifySources(SOURCE_DEFINITIONS, forcedSourceIndex);
  const verifiedById = new Map(verified.map((source) => [source.id, source]));
  const memoryHashProbePassed = runMemoryHashProbe(verified[0]);
  if (!memoryHashProbePassed) {
    fail("document_topology_error");
  }

  const attachmentText = extractPdfText(
    verifiedById.get("ATTACHMENT").filePath,
    "layout",
  );
  const attachmentTsv = extractPdfText(
    verifiedById.get("ATTACHMENT").filePath,
    "tsv",
  );
  const basisTexts = ["B1", "B2", "B3"].map((id) => ({
    id,
    text: extractPdfText(verifiedById.get(id).filePath, "layout"),
  }));
  const attachmentPages = splitPdfPages(attachmentText);
  const items = inventoryAmendmentItems(
    attachmentPages,
    parseTsv(attachmentTsv),
  );
  const bases = basisTexts.map(({ id, text }) => {
    const topology = basisTopology(text);
    return {
      id,
      topology,
      labelOccurrences: Object.fromEntries(
        TABLE_LABELS.map((label) => [
          label,
          countExactOccurrences(topology.pages, label),
        ]),
      ),
    };
  });
  locateItems(items, bases);

  const reportItems = items.map((item) => ({
    itemId: item.itemId,
    startPage: item.startPage,
    endPage: item.endPage,
    comparisons: item.comparisons,
    nonNotFoundBases: item.nonNotFoundBases,
    uniqueBasis: item.uniqueBasis,
  }));
  const reportData = {
    integrity: verified.map(({ id, expectedSha256, actualSha256 }) => ({
      id,
      expectedSha256,
      actualSha256,
    })),
    items: reportItems,
    bases,
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
    attachmentText,
    ...basisTexts.map((basis) => basis.text),
  ];
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

  writeReport(report);
  process.stdout.write(
    `${JSON.stringify({ ok: true, report: path.relative(REPO_ROOT, REPORT_PATH) })}\n`,
  );
}

try {
  main();
} catch (error) {
  const safeError =
    error instanceof CrossReviewError
      ? error
      : new CrossReviewError("source_file_error");
  process.stderr.write(
    `${JSON.stringify({ ok: false, error: safeError.code, ...safeError.details })}\n`,
  );
  process.exitCode = 1;
}
