#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, statSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import process from "node:process";

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const REPO_ROOT = path.dirname(path.dirname(SCRIPT_PATH));
const REPORT_PATH = path.join(
  REPO_ROOT,
  "docs",
  "stage3",
  "table2-cross-review-report.md",
);
const SOURCE_REGISTER_PATH = path.join(
  REPO_ROOT,
  "docs",
  "source-register",
  "rule-2.6.1-prior-version-full-text.md",
);
const PDFTOTEXT_PATH = "/usr/bin/pdftotext";

const SOURCES = [
  {
    id: "PRIOR",
    reportLabel: "舊版 2.6.1 全文 PDF",
    filePath:
      "/root/.claude/uploads/94f9d3c6-80d2-5a5b-9756-182a30351591/0a84997a-2.6.1_________________.pdf",
    expectedSha256:
      "bd7e96e5b8551c39718f80b3d5fa394581457e34f2dea1f8628a8982201bc79a",
  },
  {
    id: "ATTACHMENT_2",
    reportLabel: "附件 2 修訂對照表 PDF",
    filePath:
      "/root/.claude/uploads/94f9d3c6-80d2-5a5b-9756-182a30351591/daa3c5ff-__2_____________1.pdf",
    expectedSha256:
      "6389a5f654e0cb755d006f04ed47eca6ada9f867873f43c5088f79db6bb6c1c2",
  },
  {
    id: "NOTICE",
    reportLabel: "公告本文擷取 PDF",
    filePath:
      "/root/.claude/uploads/94f9d3c6-80d2-5a5b-9756-182a30351591/65c85ae9-____________________________________NHI________.pdf",
    expectedSha256:
      "792a05655c88b3a2f91a4ceeba6eccaad3bf64b049163222a4557764f7eb0422",
  },
];

const SAFE_ERROR_CODES = new Set([
  "argument_error",
  "document_topology_error",
  "hash_mismatch",
  "pdf_extraction_error",
  "report_safety_error",
  "report_write_error",
  "source_file_error",
  "source_register_error",
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
    return { forceHashMismatch: false };
  }
  if (argv.length === 1 && argv[0] === "--self-test-hash-mismatch") {
    return { forceHashMismatch: true };
  }
  fail("argument_error");
}

function verifySources(sourceDefinitions, forceHashMismatch) {
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
      if (error instanceof CrossReviewError) {
        throw error;
      }
      fail("source_file_error", { input: source.id });
    }

    const actualSha256 = createHash("sha256").update(bytes).digest("hex");
    let expectedSha256 = source.expectedSha256;
    if (forceHashMismatch && index === 0) {
      const replacement = expectedSha256[0] === "0" ? "1" : "0";
      expectedSha256 = `${replacement}${expectedSha256.slice(1)}`;
    }
    if (actualSha256 !== expectedSha256) {
      fail("hash_mismatch", { input: source.id });
    }

    verified.push({ ...source, bytes, actualSha256 });
  }

  return verified;
}

function runFailClosedProbe(source) {
  const replacement = source.expectedSha256[0] === "0" ? "1" : "0";
  const alteredExpected = `${replacement}${source.expectedSha256.slice(1)}`;
  const actualSha256 = createHash("sha256").update(source.bytes).digest("hex");
  return actualSha256 !== alteredExpected;
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

  return [...groups.values()]
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
  return text.match(/\b(2\.6\.\d+)\b/u)?.[1] ?? null;
}

function analyzeAmendmentItems(attachmentPages, attachmentTsvLines, priorText) {
  const starts = [];
  const seenIds = new Set();
  for (const line of attachmentTsvLines.filter((entry) => entry.side === "left")) {
    const sectionId = sectionIdFromText(line.text);
    if (sectionId && !seenIds.has(sectionId)) {
      seenIds.add(sectionId);
      starts.push({ sectionId, page: line.page, top: line.top });
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
  const itemsBySectionId = new Map(items.map((item) => [item.sectionId, item]));

  let currentSectionId = null;
  for (const line of attachmentTsvLines.filter((entry) => entry.side === "right")) {
    if (normalizeComparable(line.text) === normalizeComparable("原給付規定")) {
      continue;
    }
    const sectionId = sectionIdFromText(line.text);
    if (sectionId) {
      currentSectionId = sectionId;
    }
    const currentItem = itemsBySectionId.get(currentSectionId);
    if (currentItem) {
      currentItem.originalLines.push(line);
    }
  }

  const priorNormalized = normalizeComparable(priorText);
  const omissionMarker = "以下略";
  for (const item of items) {
    const hasOmissionMarker = item.originalLines.some((line) =>
      line.text.includes(omissionMarker),
    );
    const comparableLines = item.originalLines
      .filter((line) => !line.text.includes(omissionMarker))
      .map((line) => ({
        ...line,
        normalized: normalizeComparable(line.text),
      }))
      .filter((line) => codePointLength(line.normalized) >= 12);
    const locatedLines = comparableLines.filter((line) =>
      priorNormalized.includes(line.normalized),
    );

    let status;
    if (locatedLines.length === 0) {
      status = "NOT_FOUND";
    } else if (
      locatedLines.length === comparableLines.length &&
      !hasOmissionMarker
    ) {
      status = "FOUND";
    } else {
      status = "PARTIAL";
    }

    item.comparableLineCount = comparableLines.length;
    item.locatedLineCount = locatedLines.length;
    item.hasOmissionMarker = hasOmissionMarker;
    item.status = status;
    item.locatedLines = locatedLines;
  }

  return items;
}

function countLabelOccurrences(pages, label) {
  return pages
    .map((pageText, index) => {
      let count = 0;
      let offset = 0;
      while (true) {
        const matchIndex = pageText.indexOf(label, offset);
        if (matchIndex === -1) {
          break;
        }
        count += 1;
        offset = matchIndex + label.length;
      }
      return { page: index + 1, count };
    })
    .filter((entry) => entry.count > 0);
}

function totalOccurrences(pageOccurrences) {
  return pageOccurrences.reduce((total, entry) => total + entry.count, 0);
}

function findTableTitles(priorPages) {
  const matches = [];
  for (let pageIndex = 0; pageIndex < priorPages.length; pageIndex += 1) {
    const lines = priorPages[pageIndex].split("\n");
    for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
      const line = lines[lineIndex];
      if (!line.trimStart().startsWith("全民健康保險")) {
        continue;
      }
      const match = line.match(
        /全民健康保險(降[\p{Script=Han}]+?)藥物給付規定表/u,
      );
      if (match) {
        matches.push({
          label: match[1],
          page: pageIndex + 1,
          lineIndex,
          fullNormalizedTitle: normalizeComparable(match[0]),
        });
      }
    }
  }

  if (matches.length !== 2 || new Set(matches.map((entry) => entry.label)).size !== 2) {
    fail("document_topology_error");
  }
  return matches;
}

function countOldStructure(priorPages, tableTitles) {
  if (priorPages.length !== 1 || tableTitles.some((title) => title.page !== 1)) {
    fail("document_topology_error");
  }
  const lines = priorPages[0].split("\n");
  const definitionHeadingIndexes = lines.flatMap((line, index) =>
    /定義[:：]/u.test(line) ? [index] : [],
  );
  if (definitionHeadingIndexes.length !== 2) {
    fail("document_topology_error");
  }

  const orderedTitles = [...tableTitles].sort(
    (left, right) => left.lineIndex - right.lineIndex,
  );
  const countRowsByRelationalSignature = (tableBodyLines) => {
    const signatureCounts = new Map();
    const bodyText = tableBodyLines.join("\n");
    for (const match of bodyText.matchAll(/([A-Za-z][A-Za-z-]*)\s*[≧≥]/gu)) {
      const signature = match[1].toUpperCase();
      signatureCounts.set(signature, (signatureCounts.get(signature) ?? 0) + 1);
    }
    if (signatureCounts.size === 0) {
      fail("document_topology_error");
    }
    return Math.max(...signatureCounts.values());
  };
  const tableRowCounts = [
    countRowsByRelationalSignature(
      lines.slice(orderedTitles[0].lineIndex + 1, definitionHeadingIndexes[0]),
    ),
    countRowsByRelationalSignature(lines.slice(orderedTitles[1].lineIndex + 1)),
  ];

  const definitionRanges = [
    [definitionHeadingIndexes[0] + 1, definitionHeadingIndexes[1]],
    [definitionHeadingIndexes[1] + 1, orderedTitles[1].lineIndex],
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
      page: 1,
      topLevelItemCount,
      nestedItemCount,
      enumeratedMarkerCount: markerStyles.length,
    };
  });

  const titleArea = lines.slice(0, orderedTitles[0].lineIndex).join("\n");
  const revisionDateCount = (
    titleArea.match(/[0-9]{2,3}\/[0-9]{1,2}\/[0-9]{1,2}/gu) ?? []
  ).length;

  return {
    tableCount: orderedTitles.length,
    tableRowCounts,
    definitionBlockCount: definitionBlocks.length,
    definitionBlocks,
    revisionDateCount,
  };
}

function readRegisteredStructure() {
  let text;
  try {
    text = readFileSync(SOURCE_REGISTER_PATH, "utf8");
  } catch {
    fail("source_register_error");
  }
  const structureLine = text
    .split("\n")
    .find((line) => line.includes("結構計數"));
  const revisionMatch = structureLine?.match(/修訂日期\s*([0-9]+)\s*個/u);
  if (
    !structureLine?.includes("兩張規定表") ||
    !structureLine.includes("兩組定義區塊") ||
    !revisionMatch
  ) {
    fail("source_register_error");
  }
  return {
    tableCount: 2,
    definitionBlockCount: 2,
    revisionDateCount: Number(revisionMatch[1]),
  };
}

function addOldLocationLabels(items, tableTitles, priorPages) {
  const priorLines = priorPages[0].split("\n");
  const firstTableLineIndex = Math.min(...tableTitles.map((title) => title.lineIndex));
  const titleAreaNormalized = normalizeComparable(
    priorLines.slice(0, firstTableLineIndex).join("\n"),
  );
  const firstTableTitle = [...tableTitles].sort(
    (left, right) => left.lineIndex - right.lineIndex,
  )[0];

  for (const item of items) {
    const labels = new Set();
    if (
      item.locatedLines.some((line) =>
        titleAreaNormalized.includes(line.normalized),
      )
    ) {
      labels.add("舊版文件標題區");
    }
    if (
      item.originalLines.some((line) =>
        normalizeComparable(line.text).includes(firstTableTitle.fullNormalizedTitle),
      )
    ) {
      labels.add("舊版規定表 A 表題區");
    }
    item.oldLocationLabels = [...labels];
    delete item.locatedLines;
  }
}

function findAdjacentNumberedLabelPages(attachmentPages, categoryLabel, numberLabel) {
  return attachmentPages.flatMap((pageText, index) =>
    pageText
      .split("\n")
      .some((line) => line.includes(categoryLabel) && line.includes(numberLabel))
      ? [index + 1]
      : [],
  );
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
        `| ${entry.reportLabel} | \`${entry.expectedSha256}\` | \`${entry.actualSha256}\` | MATCH |`,
    )
    .join("\n");
  const inventoryRows = data.items
    .map(
      (item) =>
        `| ${item.itemId} | ${formatPageRange(item.startPage, item.endPage)} |`,
    )
    .join("\n");
  const comparisonRows = data.items
    .map((item) => {
      const locations =
        item.oldLocationLabels.length === 0
          ? "—"
          : item.oldLocationLabels.join("、");
      return `| ${item.itemId} | ${formatPageRange(item.startPage, item.endPage)} | ${item.status} | ${item.comparableLineCount} | ${item.locatedLineCount} | ${item.hasOmissionMarker} | ${locations} |`;
    })
    .join("\n");
  const itemStatusCounts = Object.fromEntries(
    ["FOUND", "NOT_FOUND", "PARTIAL"].map((status) => [
      status,
      data.items.filter((item) => item.status === status).length,
    ]),
  );
  const labelRows = data.labelStats
    .flatMap((document) =>
      ["表一", "表二"].map((label) => {
        const occurrences = document.labels[label];
        return `| ${document.documentLabel} | ${label} | ${totalOccurrences(occurrences)} | ${formatOccurrencePages(occurrences)} |`;
      }),
    )
    .join("\n");
  const titleRows = data.tableTitles
    .map(
      (title, index) =>
        `| 規定表 ${String.fromCharCode(65 + index)} | ${title.label} | 第 ${title.page} 頁 | ${data.oldStructure.tableRowCounts[index]} |`,
    )
    .join("\n");
  const definitionRows = data.oldStructure.definitionBlocks
    .map(
      (block) =>
        `| ${block.blockId} | 第 ${block.page} 頁 | ${block.topLevelItemCount} | ${block.nestedItemCount} | ${block.enumeratedMarkerCount} |`,
    )
    .join("\n");
  const mappingRows = data.tableTitles
    .map((title, index) => {
      const adjacent = ["表一", "表二"]
        .flatMap((numberLabel) =>
          data.adjacentLabelPages[title.label][numberLabel].map(
            (page) => `${numberLabel}：附件 2 第 ${page} 頁`,
          ),
        )
        .join("；");
      return `| 規定表 ${String.fromCharCode(65 + index)} | ${title.label} | 舊版第 ${title.page} 頁 | ${adjacent || "—"} |`;
    })
    .join("\n");
  const structureChecks = [
    [
      "規定表數",
      data.registeredStructure.tableCount,
      data.oldStructure.tableCount,
    ],
    [
      "定義區塊數",
      data.registeredStructure.definitionBlockCount,
      data.oldStructure.definitionBlockCount,
    ],
    [
      "歷次修訂日期數",
      data.registeredStructure.revisionDateCount,
      data.oldStructure.revisionDateCount,
    ],
  ];
  const structureCheckRows = structureChecks
    .map(
      ([label, registered, observed]) =>
        `| ${label} | ${registered} | ${observed} | ${registered === observed ? "一致" : "不一致"} |`,
    )
    .join("\n");
  const allRegisteredStructureMatches = structureChecks.every(
    ([, registered, observed]) => registered === observed,
  );

  return `# 表二程序 Stage 3 交叉檢視報告

## 輸入檔雜湊驗證結果

| 輸入檔 | 期望 SHA-256 | 實算 SHA-256 | 結果 |
| --- | --- | --- | --- |
${integrityRows}

- 驗證檔數：${data.integrity.length}
- 全部 MATCH：true
- 雜湊閘門：PASS

雜湊於任何 PDF 解析前逐檔完成；報告寫入動作只會在全部 MATCH 及後續安全檢核通過後發生。

## 附件 2 修訂項目盤點

盤點粒度為附件 2 左欄的頂層節次標題；同頁出現下一個頂層標題時，前一項於該頁結束。

- 修訂項目總數：${data.items.length}

| 項次 | 附件 2 頁次 |
| --- | --- |
${inventoryRows}

## 修正前欄與舊版全文一致性檢視

比對方法如下：

1. 先以 TSV 座標及各頁實際寬度的中線切分左右欄，移除重複欄頭；不依賴肉眼指定的固定字元欄位。
2. 以頂層節次為比對項目，將右欄邏輯行做 NFKC、英文字母小寫化，並移除空白、標點及符號。
3. 正規化後少於 12 個字元的短行不作獨立證據；其餘邏輯行以舊版全文的正規化連續子字串為定位粒度。
4. 可比對片段全部定位且無略載標記為 FOUND；完全無定位為 NOT_FOUND；其餘或帶略載標記為 PARTIAL。
5. 原始擷取文字只存在程序記憶體；下表僅輸出狀態、計數、頁次與區位標籤。

| 項次 | 附件 2 頁次 | 判定 | 可比對片段 | 已定位片段 | 略載標記 | 舊文區位標籤 |
| --- | --- | --- | ---: | ---: | --- | --- |
${comparisonRows}

| 判定 | 項目數 |
| --- | ---: |
| FOUND | ${itemStatusCounts.FOUND} |
| PARTIAL | ${itemStatusCounts.PARTIAL} |
| NOT_FOUND | ${itemStatusCounts.NOT_FOUND} |

NOT_FOUND 僅表示無法在本次唯一基準「舊版 2.6.1 全文」中定位，不延伸為其他文件的正誤判斷。

## 表一／表二標籤統計與對應觀察

### 三文件精確字樣統計

| 文件 | 精確字樣 | 出現次數 | 頁次分布 |
| --- | --- | ---: | --- |
${labelRows}

### 舊版兩張規定表的表題結構

| 結構標籤 | 表題關鍵標籤 | 頁次 | 資料列數 |
| --- | --- | --- | ---: |
${titleRows}

### 標籤與位置證據

| 舊版結構標籤 | 舊版表題關鍵標籤 | 舊版位置 | 附件 2 同標籤旁的精確字樣與位置 |
| --- | --- | --- | --- |
${mappingRows}

以上僅列標籤與位置證據；不以舊版表題順序替代數字標籤，也不作最終對應結論。**最終認定待 RA。**

## 舊版 2.6.1 結構計數複驗

資料列以各表主體中起始欄關係運算標記的左側結構簽章計數，取最高出現頻次作為列數；同列的次要簽章不重複計列。定義項目同時列出頂層與巢狀列舉標記，以避免混淆計數粒度。

### 兩表資料列

| 結構標籤 | 表題關鍵標籤 | 頁次 | 資料列數 |
| --- | --- | --- | ---: |
${titleRows}

### 定義區塊與項數

| 區塊 | 頁次 | 頂層項數 | 巢狀項數 | 列舉標記總數 |
| --- | --- | ---: | ---: | ---: |
${definitionRows}

### 與來源登錄對照

| 結構計數 | 來源登錄 | 本次複驗 | 對照結果 |
| --- | ---: | ---: | --- |
${structureCheckRows}

- 來源登錄已宣告結構之整體對照：${allRegisteredStructureMatches ? "一致" : "不一致"}
- 兩表資料列數及兩個定義區塊的項數為本次新增細項統計；來源登錄未宣告這兩類細項數，故不虛構基準值。

## 產物安全與可重跑檢核

| 檢核 | 結果 |
| --- | --- |
| PDF 擷取文字儲存位置 | 僅程序記憶體 |
| repo 內擷取暫存文字檔 | 0 |
| 產物原始內容插值 | false |
| 量測單位樣式命中 | ${data.safety.measurementStyleHits} |
| 百分比符號命中 | ${data.safety.percentageSignHits} |
| 受治理代碼形狀命中 | ${data.safety.governedCodeShapeHits} |
| 輸入清單詞彙命中 | ${data.safety.inputLexemeHits} |
| 輸入長片段外洩命中 | ${data.safety.longInputFragmentHits} |
| 記憶體內 fail-closed 探針 | ${data.failClosedProbePassed ? "PASS" : "FAIL"} |

報告由固定模板僅帶入雜湊、計數、頁次、布林、狀態碼與核准的結構標籤；執行不含時間戳，對相同輸入可產生位元組一致結果。
`;
}

function countMatches(text, pattern) {
  return (text.match(pattern) ?? []).length;
}

function scanArtifactSafety(artifactText, extractedTexts) {
  const measurementStyle = /[0-9]\s*[mM][gG](?:\s*[/／]\s*[dD][lL])?/gu;
  const percentageSign = String.fromCodePoint(37);
  const governedCodeShape = /[A-B][A-Z0-9][0-9]{8}/gu;
  const normalizedArtifact = normalizeComparable(artifactText);
  const longInputFragments = new Set();
  const inputLexemes = new Set(
    extractedTexts.flatMap((extractedText) =>
      (extractedText.toLocaleLowerCase("en-US").match(/\b[A-Za-z][A-Za-z-]{4,}\b/gu) ?? []),
    ),
  );
  const artifactLexemes = new Set(
    artifactText.toLocaleLowerCase("en-US").match(/\b[A-Za-z][A-Za-z-]{4,}\b/gu) ?? [],
  );

  for (const extractedText of extractedTexts) {
    for (const line of extractedText.split("\n")) {
      const normalizedLine = normalizeComparable(line);
      if (
        codePointLength(normalizedLine) >= 18 &&
        normalizedArtifact.includes(normalizedLine)
      ) {
        longInputFragments.add(normalizedLine);
      }
    }
  }

  return {
    measurementStyleHits: countMatches(artifactText, measurementStyle),
    percentageSignHits: artifactText.split(percentageSign).length - 1,
    governedCodeShapeHits: countMatches(artifactText, governedCodeShape),
    inputLexemeHits: [...inputLexemes].filter((lexeme) => artifactLexemes.has(lexeme))
      .length,
    longInputFragmentHits: longInputFragments.size,
  };
}

function safetyPassed(safety) {
  return Object.values(safety).every((count) => count === 0);
}

function main() {
  const { forceHashMismatch } = parseArguments(process.argv.slice(2));

  // Integrity verification is deliberately complete before any PDF extraction or write.
  const verified = verifySources(SOURCES, forceHashMismatch);
  const verifiedById = new Map(verified.map((source) => [source.id, source]));
  const failClosedProbePassed = runFailClosedProbe(verified[0]);
  if (!failClosedProbePassed) {
    fail("document_topology_error");
  }

  const priorText = extractPdfText(verifiedById.get("PRIOR").filePath, "layout");
  const attachmentText = extractPdfText(
    verifiedById.get("ATTACHMENT_2").filePath,
    "layout",
  );
  const noticeText = extractPdfText(verifiedById.get("NOTICE").filePath, "layout");
  const attachmentTsv = extractPdfText(
    verifiedById.get("ATTACHMENT_2").filePath,
    "tsv",
  );

  const priorPages = splitPdfPages(priorText);
  const attachmentPages = splitPdfPages(attachmentText);
  const noticePages = splitPdfPages(noticeText);
  const attachmentTsvLines = parseTsv(attachmentTsv);
  const tableTitles = findTableTitles(priorPages);
  const oldStructure = countOldStructure(priorPages, tableTitles);
  const registeredStructure = readRegisteredStructure();
  const items = analyzeAmendmentItems(
    attachmentPages,
    attachmentTsvLines,
    priorText,
  );
  addOldLocationLabels(items, tableTitles, priorPages);

  const documentPages = [
    {
      documentLabel: "舊版 2.6.1 全文 PDF",
      pages: priorPages,
    },
    {
      documentLabel: "附件 2 修訂對照表 PDF",
      pages: attachmentPages,
    },
    {
      documentLabel: "公告本文擷取 PDF",
      pages: noticePages,
    },
  ];
  const labelStats = documentPages.map(({ documentLabel, pages }) => ({
    documentLabel,
    labels: {
      表一: countLabelOccurrences(pages, "表一"),
      表二: countLabelOccurrences(pages, "表二"),
    },
  }));
  const adjacentLabelPages = Object.fromEntries(
    tableTitles.map((title) => [
      title.label,
      {
        表一: findAdjacentNumberedLabelPages(
          attachmentPages,
          title.label,
          "表一",
        ),
        表二: findAdjacentNumberedLabelPages(
          attachmentPages,
          title.label,
          "表二",
        ),
      },
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
    items,
    labelStats,
    tableTitles,
    adjacentLabelPages,
    oldStructure,
    registeredStructure,
    failClosedProbePassed,
    safety: {
      measurementStyleHits: 0,
      percentageSignHits: 0,
      governedCodeShapeHits: 0,
      inputLexemeHits: 0,
      longInputFragmentHits: 0,
    },
  };
  const extractedTexts = [priorText, attachmentText, noticeText];
  const scriptSource = readFileSync(SCRIPT_PATH, "utf8");
  let report = renderReport(reportData);
  const safety = scanArtifactSafety(`${scriptSource}\n${report}`, extractedTexts);
  if (!safetyPassed(safety)) {
    fail("report_safety_error");
  }
  reportData.safety = safety;
  report = renderReport(reportData);
  if (!safetyPassed(scanArtifactSafety(`${scriptSource}\n${report}`, extractedTexts))) {
    fail("report_safety_error");
  }

  try {
    writeFileSync(REPORT_PATH, report, "utf8");
  } catch {
    fail("report_write_error");
  }
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
