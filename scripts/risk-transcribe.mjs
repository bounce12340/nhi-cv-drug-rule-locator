#!/usr/bin/env node

/**
 * Transcribes 表一 of the 2026-09-01 announcement's attachment 2 into the three
 * governed JSONL files that scripts/risk-codegen.mjs compiles.
 *
 * This is a one-off derivation tool, not part of CI: it shells out to poppler's
 * `pdftotext`, which the app does not otherwise need. It is committed so the
 * transcription is reproducible and diffable rather than being a hand-typed
 * artifact nobody can re-derive.
 *
 *   node scripts/risk-transcribe.mjs            # write the JSONL files
 *   node scripts/risk-transcribe.mjs --check    # fail if they would change
 *
 * Two properties this must keep:
 *
 * 1. The prescription-rule blocks are paired to tiers by the heading the source
 *    text carries itself ("極高、非常高風險："), never by row position. The 處方規定
 *    column is one flowing text block whose lines do not line up with the tier
 *    rows beside them, so reading pairings off row order would be the same class
 *    of error as inferring a drug's code from an adjacent row.
 * 2. Joining the hard-wrapped column lines only ever inserts spaces. The source
 *    wraps mid-term ("ATP citrate" / "lyase 抑制劑。") and the wrap consumes the
 *    space, so a naive join yields "citratelyase" — a string that appears nowhere
 *    in the document. Each record therefore carries both the untouched source
 *    lines and the joined paragraph, and risk-codegen asserts that the two are
 *    identical once all whitespace is removed.
 */

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_NAME = "scripts/risk-transcribe.mjs";
const DATASET_VERSION = "nhi-lipid-risk-2026-09-01-r1";
const SOURCE_DATASET_VERSION = "nhi-lipid-rules-2026-09-01-r1";
const SOURCE_PDF = "attachment-2-rule-revision-table.pdf";
const SOURCE_PDF_SHA256 =
  "6389a5f654e0cb755d006f04ed47eca6ada9f867873f43c5088f79db6bb6c1c2";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, "..");
const sourcePdfPath = path.join(
  repositoryRoot, "data", "governed", SOURCE_DATASET_VERSION, SOURCE_PDF
);
const outputDirectory = path.join(repositoryRoot, "data", "governed", DATASET_VERSION);

function fail(message) {
  throw new Error(`risk-transcribe fail closed: ${message}`);
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

/** Full-width punctuation already carries its own visual space. */
const FULL_WIDTH_PUNCTUATION = new Set([
  "：", "，", "、", "。", "；", "（", "）", "〔", "〕",
  "「", "」", "『", "』", "？", "！", "·", "—", "…"
]);

function isLatin(character) {
  return character !== undefined && /^[A-Za-z0-9]$/.test(character);
}

/**
 * Rejoins hard-wrapped lines, restoring the single space the wrap consumed.
 * Inserts iff one side is Latin and neither side is full-width punctuation —
 * so "ATP citrate"+"lyase" and "合併"+"ezetimibe" gain a space while
 * "包含："+"ezetimibe" and "同時進"+"行生活型態改變。" do not.
 */
function joinWrappedLines(lines) {
  let joined = "";
  for (const line of lines) {
    if (joined === "") {
      joined = line;
      continue;
    }
    const left = joined.at(-1);
    const right = line.at(0);
    // A wrap that falls on a hyphen never takes a space with it, whether the
    // hyphen belongs to the term (non-statin) or was added to break it.
    const hyphenated = left === "-" || right === "-";
    const punctuated =
      FULL_WIDTH_PUNCTUATION.has(left) || FULL_WIDTH_PUNCTUATION.has(right);
    joined +=
      !hyphenated && !punctuated && (isLatin(left) || isLatin(right)) ? ` ${line}` : line;
  }
  return joined;
}

function withoutWhitespace(value) {
  return value.replace(/\s+/gu, "");
}

export { joinWrappedLines, withoutWhitespace };

/**
 * Thresholds and targets, transcribed cell by cell from 表一.
 *
 * These are written out rather than parsed because the four table columns are
 * merged across rows and wrap mid-value, so any column-slicing parser would be
 * guessing at cell boundaries. Every string below is instead checked back
 * against the source text for the tier's own row window (assertTierCells), so a
 * changed announcement fails closed rather than being silently mis-transcribed.
 *
 * `order` is the source's own numbering (一、極高風險 … 五、低風險); the 0-factor
 * row is last in the table and carries no number of its own.
 */
const TIER_TRANSCRIPTION = [
  {
    tierId: "extreme",
    order: 1,
    labelZh: "極高風險",
    initiationThresholdRaw: "LDL-C≧55mg/dL",
    primaryTargetRaw: "LDL-C<55mg/dL",
    secondaryTargetRaw: "non-HDL-C<85mg/dL",
    prescriptionHeadingRaw: "極高、非常高風險："
  },
  {
    tierId: "very-high",
    order: 2,
    labelZh: "非常高風險",
    initiationThresholdRaw: "LDL-C≧70mg/dL",
    primaryTargetRaw: "LDL-C<70mg/dL",
    secondaryTargetRaw: "non-HDL-C<100mg/dL",
    prescriptionHeadingRaw: "極高、非常高風險："
  },
  {
    tierId: "high",
    order: 3,
    labelZh: "高風險",
    initiationThresholdRaw: "LDL-C≧100mg/dL",
    primaryTargetRaw: "LDL-C<100mg/dL",
    secondaryTargetRaw: "non-HDL-C<130mg/dL",
    prescriptionHeadingRaw: "高風險："
  },
  {
    tierId: "moderate",
    order: 4,
    labelZh: "中風險",
    initiationThresholdRaw: "LDL-C≧115mg/dL",
    primaryTargetRaw: "LDL-C<115mg/dL",
    secondaryTargetRaw: "non-HDL-C<145mg/dL",
    prescriptionHeadingRaw: "中、低風險："
  },
  {
    tierId: "low",
    order: 5,
    labelZh: "低風險",
    initiationThresholdRaw: "LDL-C≧130mg/dL",
    primaryTargetRaw: "LDL-C<130mg/dL",
    secondaryTargetRaw: "non-HDL-C<160mg/dL",
    prescriptionHeadingRaw: "中、低風險："
  },
  {
    // The table's last row. It states a threshold and a primary target but no
    // secondary target, and no 處方規定 block names it — see prescriptionHeadingRaw
    // below. Neither absence is filled in from the row above it.
    tierId: "no-factors",
    order: 6,
    labelZh: "0 項心血管風險因子",
    initiationThresholdRaw: "LDL-C≧160mg/dL",
    primaryTargetRaw: "LDL-C<160mg/dL",
    secondaryTargetRaw: null,
    prescriptionHeadingRaw: null
  }
];

/** Row label as it appears at the start of its line in the extracted table. */
const TIER_ROW_LABELS = new Map([
  ["extreme", "極高風險"],
  ["very-high", "非常高風險"],
  ["high", "高風險"],
  ["moderate", "中風險"],
  ["low", "低風險"],
  ["no-factors", "0 項心血管"]
]);

const DEFINITIONS_HEADING = "●ASCVD 風險等級定義：";
const FACTORS_HEADING = "●心血管風險因子定義：";
const ADVICE_HEADING = "●各風險等級評估建議：";
const PAGE_HEADER_MARKER = "建議修訂後給付規定";

/** Tier headings inside the definitions block, in the source's own order. */
const DEFINITION_TIER_ORDER = [
  ["一、極高風險：", "extreme"],
  ["二、非常高風險：", "very-high"],
  ["三、高風險：", "high"],
  ["四、中風險：", "moderate"],
  ["五、低風險：", "low"]
];

/**
 * A group heading states a prerequisite and then introduces its alternatives.
 * Stripping one of these two suffixes yields the prerequisite on its own; the
 * full heading is kept verbatim alongside it. An unrecognised suffix fails
 * closed rather than being guessed at.
 */
const GROUP_HEADING_SUFFIXES = ["合併下列任一臨床狀況：", "，包含："];

function readLayoutText() {
  if (!existsSync(sourcePdfPath)) fail(`source PDF is missing at ${sourcePdfPath}`);
  const pdfBytes = readFileSync(sourcePdfPath);
  const actual = sha256(pdfBytes);
  if (actual !== SOURCE_PDF_SHA256) {
    fail(`source PDF SHA-256 is ${actual}, expected ${SOURCE_PDF_SHA256}`);
  }
  let text;
  try {
    text = execFileSync(
      "pdftotext",
      ["-layout", "-enc", "UTF-8", sourcePdfPath, "-"],
      { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 }
    );
  } catch (error) {
    fail(`pdftotext (poppler) is required to re-derive this dataset: ${error.message}`);
  }
  return text.split("\n").map((line) => line.replace(/\f/gu, ""));
}

function indexOfLine(lines, predicate, from = 0) {
  for (let index = from; index < lines.length; index += 1) {
    if (predicate(lines[index], index)) return index;
  }
  return -1;
}

function requireLine(lines, predicate, from, description) {
  const index = indexOfLine(lines, predicate, from);
  if (index === -1) fail(`could not locate ${description} in the source text`);
  return index;
}

/**
 * Pulls the 處方規定 column out of the table. The column is one flowing block of
 * text whose lines do not align with the tier rows beside them, so it is sliced
 * by the headings the text itself carries. Page-header lines are dropped whole —
 * their right-hand cell is the column title "原給付規定", which otherwise reads as
 * a fragment of the rule text.
 */
function extractPrescriptionBlocks(lines) {
  const definitionsAt = requireLine(
    lines, (line) => line.startsWith(DEFINITIONS_HEADING), 0, DEFINITIONS_HEADING
  );
  const starts = [
    ["極高、非常高風險：", (line) => line.includes("極高、非常高風險：")],
    ["高風險：", (line) =>
      line.trimEnd().endsWith("高風險：") &&
      !line.includes("極高") &&
      !line.includes("中、低")],
    ["中、低風險：", (line) => line.includes("中、低風險：")]
  ];

  const bounds = [];
  let cursor = 0;
  for (const [heading, predicate] of starts) {
    cursor = requireLine(lines, predicate, cursor + (bounds.length === 0 ? 0 : 1), heading);
    bounds.push({ heading, start: cursor });
  }

  const blocks = new Map();
  for (const [position, { heading, start }] of bounds.entries()) {
    const stop = position + 1 < bounds.length ? bounds[position + 1].start : definitionsAt;
    const fragments = [];
    for (const line of lines.slice(start, stop)) {
      if (!line.trim() || line.includes(PAGE_HEADER_MARKER)) continue;
      const cells = line.trim().split(/\s{2,}/u).filter(Boolean);
      let fragment = cells.at(-1);
      if (fragment === undefined) continue;
      // The target-value cell abuts the rule cell with a single space on one row.
      const merged = /^[A-Za-z0-9<>=()≦≧./-]+\s+(.+)$/u.exec(fragment);
      if (merged !== null && /^[一二三四五六]、/u.test(merged[1])) fragment = merged[1];
      fragments.push(fragment);
    }
    if (fragments[0] !== heading) {
      fail(`prescription block does not start with ${heading}`);
    }
    const body = fragments.slice(1);
    if (body.length === 0) fail(`prescription block ${heading} is empty`);
    const text = joinWrappedLines(body);
    if (withoutWhitespace(text) !== withoutWhitespace(body.join(""))) {
      fail(`rejoining ${heading} changed more than whitespace`);
    }
    if (!text.endsWith("。")) fail(`prescription block ${heading} does not end with 。`);
    blocks.set(heading, { headingRaw: heading, lines: body, text });
  }
  return blocks;
}

/** Superscripts pdftotext drops onto their own line, e.g. the ² of 1.73m². */
const SUPERSCRIPT_DIGITS = new Map([["2", "²"], ["3", "³"]]);

function startsNewItem(trimmed) {
  return (
    /^[(（][一二三四五六七八九十][)）]/u.test(trimmed) ||
    /^\d+\./u.test(trimmed) ||
    /^[一二三四五六七八九十]、/u.test(trimmed) ||
    trimmed.startsWith("●")
  );
}

/**
 * Folds the definitions block into one entry per numbered item.
 *
 * A line holding nothing but a digit is a superscript pdftotext could not place;
 * it is reinserted into the next line at the column it was printed at, so
 * eGFR<60mL/min/1.73m² does not come out as "1.73m 至少持續3個月" with the square
 * silently dropped.
 */
function foldDefinitionItems(lines) {
  const items = [];
  let pendingSuperscript = null;

  for (const line of lines) {
    // Page-break headers land mid-block once the form feed is stripped; left in,
    // they fold into the item above and hide the "：" that marks a group heading.
    if (!line.trim() || line.includes(PAGE_HEADER_MARKER)) continue;
    const orphan = /^(\s*)(\d)\s*$/u.exec(line);
    if (orphan !== null) {
      const glyph = SUPERSCRIPT_DIGITS.get(orphan[2]);
      if (glyph === undefined) fail(`unmapped superscript digit ${orphan[2]}`);
      pendingSuperscript = { column: orphan[1].length, glyph };
      continue;
    }

    let text = line;
    if (pendingSuperscript !== null) {
      const { column, glyph } = pendingSuperscript;
      if (column > text.length) fail("superscript column falls outside the line below it");
      text = `${text.slice(0, column)}${glyph}${text.slice(column)}`;
      pendingSuperscript = null;
    }

    const trimmed = text.trim();
    const indent = text.length - text.trimStart().length;
    if (startsNewItem(trimmed) || items.length === 0) {
      items.push({ indent, lines: [trimmed] });
    } else {
      items.at(-1).lines.push(trimmed);
    }
  }
  if (pendingSuperscript !== null) fail("a superscript had no line to attach to");

  return items.map((item) => ({ indent: item.indent, text: joinWrappedLines(item.lines) }));
}

function stripOrdinal(text) {
  const match = /^(?:[(（][一二三四五六七八九十][)）]|\d+\.)\s*(.+)$/u.exec(text);
  if (match === null) fail(`item does not start with an ordinal: ${text}`);
  return match[1];
}

/** "冠狀動脈疾病合併下列任一臨床狀況：" → "冠狀動脈疾病". */
function prerequisiteFromHeading(headingBody) {
  for (const suffix of GROUP_HEADING_SUFFIXES) {
    if (headingBody.endsWith(suffix)) return headingBody.slice(0, -suffix.length);
  }
  fail(`group heading uses unrecognised wording: ${headingBody}`);
}

const CHINESE_ORDINALS = ["一", "二", "三", "四", "五", "六", "七", "八", "九", "十"];

/**
 * Splits the definitions block into the per-tier clinical criteria and the
 * cardiovascular risk factors.
 *
 * 極高風險 and 非常高風險 are two-level: a prerequisite the patient must have, and
 * then any one of the alternatives listed under it. Flattening them would let a
 * single checked alternative stand on its own, which the source does not say —
 * "一年內曾經歷心肌梗塞" only counts for someone who has 冠狀動脈疾病. 高風險's four
 * entries genuinely are a flat list and carry no prerequisite.
 *
 * 中風險 and 低風險 state a count of risk factors instead of clinical criteria, so
 * they contribute no rows here; their wording is kept on the tier record.
 */
function extractDefinitions(lines) {
  const definitionsAt = requireLine(
    lines, (line) => line.startsWith(DEFINITIONS_HEADING), 0, DEFINITIONS_HEADING
  );
  const factorsAt = requireLine(
    lines, (line) => line.startsWith(FACTORS_HEADING), definitionsAt, FACTORS_HEADING
  );
  const adviceAt = requireLine(
    lines, (line) => line.startsWith(ADVICE_HEADING), factorsAt, ADVICE_HEADING
  );

  const tierItems = foldDefinitionItems(lines.slice(definitionsAt + 1, factorsAt));
  const factorItems = foldDefinitionItems(lines.slice(factorsAt + 1, adviceAt));

  const criteria = [];
  const factorCountRules = new Map();
  const definitionHeadings = new Map();
  let tierId = null;
  let group = null;

  for (const item of tierItems) {
    const heading = DEFINITION_TIER_ORDER.find(([label]) => item.text.startsWith(label));
    if (heading !== undefined) {
      const [label, id] = heading;
      tierId = id;
      group = null;
      definitionHeadings.set(id, label);
      const inline = item.text.slice(label.length);
      if (inline !== "") factorCountRules.set(id, inline);
      continue;
    }
    if (tierId === null) fail("a definition item appeared before any tier heading");

    if (item.indent <= 1) {
      const body = stripOrdinal(item.text);
      if (item.text.endsWith("：")) {
        const ordinalIndex = criteria.filter((row) => row.tierId === tierId && row.groupId !== null)
          .reduce((seen, row) => seen.add(row.groupId), new Set()).size + 1;
        group = {
          groupId: `${tierId}-${ordinalIndex}`,
          groupHeadingRaw: item.text,
          prerequisiteLabelZh: prerequisiteFromHeading(body)
        };
        continue;
      }
      group = null;
      criteria.push({
        criterionId: `${tierId}-${criteria.filter((row) => row.tierId === tierId).length + 1}`,
        tierId,
        groupId: null,
        groupHeadingRaw: null,
        prerequisiteLabelZh: null,
        ordinal: /^[(（][一二三四五六七八九十][)）]/u.exec(item.text)?.[0] ?? null,
        textRaw: body
      });
      continue;
    }

    if (group === null) fail(`a nested criterion appeared outside a group: ${item.text}`);
    const withinGroup = criteria.filter((row) => row.groupId === group.groupId).length + 1;
    criteria.push({
      criterionId: `${group.groupId}-${withinGroup}`,
      tierId,
      groupId: group.groupId,
      groupHeadingRaw: group.groupHeadingRaw,
      prerequisiteLabelZh: group.prerequisiteLabelZh,
      ordinal: /^\d+\./u.exec(item.text)?.[0] ?? null,
      textRaw: stripOrdinal(item.text)
    });
  }

  const factors = [];
  let parentFactorId = null;
  for (const item of factorItems) {
    const top = /^([一二三四五六七八九十])、\s*(.+)$/u.exec(item.text);
    if (top !== null) {
      const factorId = `factor-${CHINESE_ORDINALS.indexOf(top[1]) + 1}`;
      const subCount = /符合以下至少([一二三四五六七八九十])項/u.exec(top[2]);
      factors.push({
        factorId,
        ordinal: `${top[1]}、`,
        textRaw: top[2],
        parentFactorId: null,
        requiredSubCount:
          subCount === null ? null : CHINESE_ORDINALS.indexOf(subCount[1]) + 1
      });
      parentFactorId = subCount === null ? null : factorId;
      continue;
    }
    if (parentFactorId === null) fail(`a sub-factor appeared outside a parent: ${item.text}`);
    const within = factors.filter((row) => row.parentFactorId === parentFactorId).length + 1;
    factors.push({
      factorId: `${parentFactorId}-${within}`,
      ordinal: /^[(（][一二三四五六七八九十][)）]/u.exec(item.text)?.[0] ?? null,
      textRaw: stripOrdinal(item.text),
      parentFactorId,
      requiredSubCount: null
    });
  }

  return { criteria, factors, factorCountRules, definitionHeadings };
}

const TABLE_HEADING = "全民健康保險降膽固醇藥物給付規定表一：";

/**
 * Checks each transcribed cell back against the tier's own row window, so the
 * hand-written TIER_TRANSCRIPTION cannot drift from the announcement unnoticed.
 * The window runs from the tier's row line to the next tier's, which is where
 * that row's threshold and target cells wrap to — the 處方規定 column carries no
 * mg/dL values, so nothing from it can be mistaken for one.
 */
function assertTierCells(lines) {
  const tableAt = requireLine(lines, (line) => line.includes(TABLE_HEADING), 0, TABLE_HEADING);
  const definitionsAt = requireLine(
    lines, (line) => line.startsWith(DEFINITIONS_HEADING), tableAt, DEFINITIONS_HEADING
  );

  const rows = [];
  let cursor = tableAt;
  for (const tier of TIER_TRANSCRIPTION) {
    const label = TIER_ROW_LABELS.get(tier.tierId);
    cursor = requireLine(
      lines, (line) => line.startsWith(label), cursor + 1, `table row ${label}`
    );
    rows.push({ tier, start: cursor });
  }

  for (const [position, { tier, start }] of rows.entries()) {
    const stop = position + 1 < rows.length ? rows[position + 1].start : definitionsAt;
    const window = lines.slice(start, stop);
    if (!window[0].includes("LDL-C≧")) {
      fail(`table row ${tier.labelZh} does not carry an initiation threshold`);
    }

    const cells = window.flatMap((line) => line.trim().split(/\s{2,}/u).filter(Boolean));
    const threshold = /≧(\d+mg\/dL)$/u.exec(tier.initiationThresholdRaw);
    if (threshold === null) fail(`unparsable threshold for ${tier.labelZh}`);
    if (!cells.includes(threshold[1])) {
      fail(`table row ${tier.labelZh} does not state ${threshold[1]}`);
    }

    const seen = [];
    for (const match of window.join("\n").matchAll(/C<(\d+)mg\/dL/gu)) {
      if (!seen.includes(match[1])) seen.push(match[1]);
    }
    const expected = [tier.primaryTargetRaw, tier.secondaryTargetRaw]
      .filter((value) => value !== null)
      .map((value) => /<(\d+)mg\/dL$/u.exec(value)?.[1]);
    if (expected.some((value) => value === undefined)) fail(`unparsable target for ${tier.labelZh}`);
    if (seen.join(",") !== expected.join(",")) {
      fail(
        `table row ${tier.labelZh} states targets ${seen.join(",")}, transcribed ${expected.join(",")}`
      );
    }
  }
}

function toJsonl(records) {
  return `${records.map((record) => JSON.stringify(record)).join("\n")}\n`;
}

function build() {
  const lines = readLayoutText();
  assertTierCells(lines);
  const prescriptions = extractPrescriptionBlocks(lines);
  const { criteria, factors, factorCountRules, definitionHeadings } = extractDefinitions(lines);

  const tiers = TIER_TRANSCRIPTION.map((tier) => {
    const block =
      tier.prescriptionHeadingRaw === null
        ? null
        : prescriptions.get(tier.prescriptionHeadingRaw);
    if (tier.prescriptionHeadingRaw !== null && block === undefined) {
      fail(`no prescription block headed ${tier.prescriptionHeadingRaw}`);
    }
    return {
      tierId: tier.tierId,
      order: tier.order,
      labelZh: tier.labelZh,
      definitionHeadingRaw: definitionHeadings.get(tier.tierId) ?? null,
      initiationThresholdRaw: tier.initiationThresholdRaw,
      primaryTargetRaw: tier.primaryTargetRaw,
      secondaryTargetRaw: tier.secondaryTargetRaw,
      factorCountRuleRaw: factorCountRules.get(tier.tierId) ?? null,
      prescriptionHeadingRaw: tier.prescriptionHeadingRaw,
      prescriptionRuleLines: block === null ? null : block.lines,
      prescriptionRuleText: block === null ? null : block.text
    };
  });

  return {
    "risk-tiers.jsonl": toJsonl(tiers),
    "tier-criteria.jsonl": toJsonl(criteria),
    "risk-factors.jsonl": toJsonl(factors)
  };
}

function main(argumentsToParse) {
  const check = argumentsToParse.includes("--check");
  for (const argument of argumentsToParse) {
    if (argument !== "--check") fail(`unknown argument ${argument}`);
  }
  const files = build();
  mkdirSync(outputDirectory, { recursive: true });
  for (const [name, contents] of Object.entries(files)) {
    const target = path.join(outputDirectory, name);
    const current = existsSync(target) ? readFileSync(target, "utf8") : null;
    if (check) {
      if (current !== contents) fail(`${name} differs from the source PDF`);
      continue;
    }
    if (current !== contents) writeFileSync(target, contents, "utf8");
    process.stdout.write(
      `${SCRIPT_NAME}: ${name} — ${contents.trimEnd().split("\n").length} records, ` +
        `sha256 ${sha256(Buffer.from(contents, "utf8"))}, ${Buffer.byteLength(contents)} bytes\n`
    );
  }
  if (check) process.stdout.write(`${SCRIPT_NAME}: all three files match the source PDF\n`);
}

try {
  main(process.argv.slice(2));
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}
