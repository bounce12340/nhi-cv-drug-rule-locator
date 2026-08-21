#!/usr/bin/env node

/**
 * Compiles the governed risk-stratification JSONL into a frozen TypeScript module.
 *
 * Same shape as the other two codegens: the expected hashes and counts are written
 * into this file, so replacing the data without updating them stops the build with
 * exit code 1 rather than shipping something nobody checked.
 *
 *   node scripts/risk-codegen.mjs
 *   node scripts/risk-codegen.mjs --check
 */

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const SCRIPT_NAME = "scripts/risk-codegen.mjs";
const DATASET_VERSION = "nhi-lipid-risk-2026-09-01-r1";
const EFFECTIVE_FROM = "2026-09-01";
const EXPECTED_DATASET_DIGEST =
  "3b17cf467900dcf4dde8c049ff4091f092dada8cbd482bda6ef6731e2614dfcf";
const SOURCE_PDF_SHA256 =
  "6389a5f654e0cb755d006f04ed47eca6ada9f867873f43c5088f79db6bb6c1c2";

const SOURCE_FILES = [
  {
    declaredName: "assessment-advice.jsonl",
    sha256: "830e15cdbf143416f2c1b56a956c4f7adc3c60f3affa85daa8691602734f4bf8",
    bytes: 3200,
    recordCount: 6
  },
  {
    declaredName: "coverage-rule-conditions.jsonl",
    sha256: "6d7822f1341a49879bba04566ffa1caa38a6aba85b45028247fcd3f63c58437f",
    bytes: 2011,
    recordCount: 5
  },
  {
    declaredName: "coverage-rules.jsonl",
    sha256: "98106c0a81cd55881658ab477702143bc5e8a1c8c99d0630dae342eba9e4911e",
    bytes: 1086,
    recordCount: 2
  },
  {
    declaredName: "risk-factors.jsonl",
    sha256: "f877d2a7a4d86b9161584216cabde000890f64bb2353bd1cfd9ebd42f1bd54d5",
    bytes: 1633,
    recordCount: 11
  },
  {
    declaredName: "risk-tiers.jsonl",
    sha256: "d32822010c90340eddd6af9a1f9e48c4c94281896af657386fa3e660eda40ab5",
    bytes: 8939,
    recordCount: 6
  },
  {
    declaredName: "tier-criteria.jsonl",
    sha256: "809f7949eafcc7df3139694b158d6713f6bf4a5e0b6a7ae2d51cf1387e8bec5e",
    bytes: 4895,
    recordCount: 18
  }
];

const TIER_FIELDS = [
  "tierId",
  "order",
  "labelZh",
  "definitionHeadingRaw",
  "initiationThresholdRaw",
  "primaryTargetRaw",
  "secondaryTargetRaw",
  "factorCountRuleRaw",
  "prescriptionHeadingRaw",
  "prescriptionRuleLines",
  "prescriptionRuleText"
];
const CRITERION_FIELDS = [
  "criterionId",
  "tierId",
  "groupId",
  "groupHeadingRaw",
  "prerequisiteLabelZh",
  "ordinal",
  "textRaw"
];
const FACTOR_FIELDS = ["factorId", "ordinal", "textRaw", "parentFactorId", "requiredSubCount"];
const ADVICE_FIELDS = [
  "adviceId",
  "groupId",
  "groupHeadingRaw",
  "appliesToTierIds",
  "ordinal",
  "textRaw",
  "sourceLines"
];
const COVERAGE_RULE_FIELDS = [
  "ruleId",
  "headingRaw",
  "headingLines",
  "restrictionRaw",
  "restrictionLines",
  "exceptionNhiCodes"
];
const COVERAGE_CONDITION_FIELDS = [
  "conditionId",
  "ruleId",
  "ordinal",
  "textRaw",
  "sourceLines"
];
const NHI_CODE_PATTERN = /^[A-Z0-9]{10}$/u;

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, "..");
const governedDirectory = path.join(repositoryRoot, "data", "governed", DATASET_VERSION);
const manifestPath = path.join(governedDirectory, "storage-manifest.json");
const outputPath = path.join(
  repositoryRoot,
  "packages",
  "domain",
  "src",
  "generated",
  "risk-2026-09-01.ts"
);

function fail(message) {
  throw new Error(`risk-codegen fail closed: ${message}`);
}

function sha256(bytes, encoding) {
  return createHash("sha256").update(bytes, encoding).digest("hex");
}

function isPlainObject(value) {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

function withoutWhitespace(value) {
  return value.replace(/\s+/gu, "");
}

function parseManifest() {
  if (!existsSync(manifestPath)) fail("storage-manifest.json is missing");
  let manifest;
  try {
    manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  } catch {
    fail("storage-manifest.json is not valid JSON");
  }

  if (!isPlainObject(manifest)) fail("storage manifest must be an object");
  if (manifest.schema !== "storage-manifest/v1") fail("unexpected storage manifest schema");
  if (manifest.datasetVersion !== DATASET_VERSION) fail("unexpected dataset version");
  if (manifest.effectiveFrom !== EFFECTIVE_FROM) fail("unexpected effective-from date");
  if (manifest.revoked !== false) fail("dataset is revoked or revocation state is invalid");

  // The JSONL is a transcription, so the chain back to the announcement PDF is
  // part of what has to hold, not just the JSONL's own hashes.
  const derived = manifest.derivedFrom;
  if (!isPlainObject(derived) || derived.sha256 !== SOURCE_PDF_SHA256) {
    fail("manifest does not declare the authorized source PDF");
  }

  if (!Array.isArray(manifest.files) || manifest.files.length !== SOURCE_FILES.length) {
    fail(`manifest must declare exactly the ${SOURCE_FILES.length} authorized JSONL files`);
  }

  const declared = new Map();
  for (const entry of manifest.files) {
    if (
      !isPlainObject(entry) ||
      typeof entry.declaredName !== "string" ||
      typeof entry.sha256 !== "string" ||
      !Number.isSafeInteger(entry.bytes) ||
      entry.bytes < 0 ||
      declared.has(entry.declaredName)
    ) {
      fail("manifest contains an invalid or duplicate file declaration");
    }
    declared.set(entry.declaredName, entry);
  }

  for (const expected of SOURCE_FILES) {
    const actual = declared.get(expected.declaredName);
    if (
      actual === undefined ||
      actual.sha256 !== expected.sha256 ||
      actual.bytes !== expected.bytes ||
      actual.recordCount !== expected.recordCount
    ) {
      fail(`manifest declaration does not match ${expected.declaredName}`);
    }
  }

  const datasetDigest = sha256(
    [...manifest.files]
      .sort((left, right) => left.declaredName.localeCompare(right.declaredName, "en"))
      .map((entry) => entry.sha256)
      .join(""),
    "ascii"
  );
  if (datasetDigest !== EXPECTED_DATASET_DIGEST) {
    fail("manifest-derived dataset digest does not match the authorized digest");
  }
  return datasetDigest;
}

function readJsonl(expected) {
  const filePath = path.join(governedDirectory, expected.declaredName);
  if (!existsSync(filePath)) fail(`${expected.declaredName} is missing`);
  const bytes = readFileSync(filePath);
  if (bytes.length !== expected.bytes) {
    fail(`${expected.declaredName} is ${bytes.length} bytes, expected ${expected.bytes}`);
  }
  const actual = sha256(bytes);
  if (actual !== expected.sha256) {
    fail(`${expected.declaredName} SHA-256 is ${actual}, expected ${expected.sha256}`);
  }

  const text = bytes.toString("utf8");
  if (!text.endsWith("\n")) fail(`${expected.declaredName} does not end with a newline`);
  const records = text
    .trimEnd()
    .split("\n")
    .map((line, index) => {
      try {
        return JSON.parse(line);
      } catch {
        return fail(`${expected.declaredName} line ${index + 1} is not valid JSON`);
      }
    });
  if (records.length !== expected.recordCount) {
    fail(
      `${expected.declaredName} holds ${records.length} records, expected ${expected.recordCount}`
    );
  }
  return records;
}

function requireFields(record, fields, description) {
  if (!isPlainObject(record)) fail(`${description} is not an object`);
  const keys = Object.keys(record);
  if (keys.length !== fields.length || fields.some((field) => !keys.includes(field))) {
    fail(`${description} does not carry exactly ${fields.join(", ")}`);
  }
}

/**
 * The structural claims the domain layer is allowed to rely on. Each one exists
 * because breaking it shows a clinician a tier they do not qualify for.
 */
function checkStructure({ tiers, criteria, factors, advice, rules, conditions }) {
  const tierIds = new Set();
  for (const [index, tier] of tiers.entries()) {
    requireFields(tier, TIER_FIELDS, `risk tier ${index + 1}`);
    if (typeof tier.tierId !== "string" || tier.tierId === "") fail("a tier has no id");
    if (tierIds.has(tier.tierId)) fail(`duplicate tier id ${tier.tierId}`);
    tierIds.add(tier.tierId);
    if (tier.order !== index + 1) fail(`tier ${tier.tierId} is out of the source's own order`);
    if (typeof tier.initiationThresholdRaw !== "string" || tier.initiationThresholdRaw === "") {
      fail(`tier ${tier.tierId} has no initiation threshold`);
    }
    if (typeof tier.primaryTargetRaw !== "string" || tier.primaryTargetRaw === "") {
      fail(`tier ${tier.tierId} has no primary target`);
    }

    const hasHeading = tier.prescriptionHeadingRaw !== null;
    if (hasHeading !== (tier.prescriptionRuleText !== null)) {
      fail(`tier ${tier.tierId} pairs a prescription heading with no rule text, or the reverse`);
    }
    if (!hasHeading) continue;

    if (!Array.isArray(tier.prescriptionRuleLines) || tier.prescriptionRuleLines.length === 0) {
      fail(`tier ${tier.tierId} has prescription text but no source lines`);
    }
    // The join may add spaces; it may not change a character.
    if (
      withoutWhitespace(tier.prescriptionRuleText) !==
      withoutWhitespace(tier.prescriptionRuleLines.join(""))
    ) {
      fail(`tier ${tier.tierId}'s prescription text differs from its source lines`);
    }
  }

  // Tiers sharing a heading share one block in the source, so their transcribed
  // text must be byte-identical — a divergence means one of them was edited.
  const byHeading = new Map();
  for (const tier of tiers) {
    if (tier.prescriptionHeadingRaw === null) continue;
    const seen = byHeading.get(tier.prescriptionHeadingRaw);
    if (seen !== undefined && seen !== tier.prescriptionRuleText) {
      fail(`tiers under ${tier.prescriptionHeadingRaw} carry different rule text`);
    }
    byHeading.set(tier.prescriptionHeadingRaw, tier.prescriptionRuleText);
  }

  const criterionIds = new Set();
  for (const [index, criterion] of criteria.entries()) {
    requireFields(criterion, CRITERION_FIELDS, `tier criterion ${index + 1}`);
    if (criterionIds.has(criterion.criterionId)) {
      fail(`duplicate criterion id ${criterion.criterionId}`);
    }
    criterionIds.add(criterion.criterionId);
    if (!tierIds.has(criterion.tierId)) {
      fail(`criterion ${criterion.criterionId} names unknown tier ${criterion.tierId}`);
    }
    if (typeof criterion.textRaw !== "string" || criterion.textRaw === "") {
      fail(`criterion ${criterion.criterionId} has no text`);
    }
    // A grouped criterion without its prerequisite would stand on its own, which
    // is the flattening this dataset exists to prevent.
    const grouped = criterion.groupId !== null;
    if (grouped !== (criterion.prerequisiteLabelZh !== null)) {
      fail(`criterion ${criterion.criterionId} is grouped but states no prerequisite`);
    }
    if (grouped !== (criterion.groupHeadingRaw !== null)) {
      fail(`criterion ${criterion.criterionId} is grouped but carries no group heading`);
    }
  }

  const factorIds = new Set();
  for (const [index, factor] of factors.entries()) {
    requireFields(factor, FACTOR_FIELDS, `risk factor ${index + 1}`);
    if (factorIds.has(factor.factorId)) fail(`duplicate factor id ${factor.factorId}`);
    factorIds.add(factor.factorId);
    if (typeof factor.textRaw !== "string" || factor.textRaw === "") {
      fail(`factor ${factor.factorId} has no text`);
    }
    if (factor.parentFactorId !== null && !factorIds.has(factor.parentFactorId)) {
      fail(`factor ${factor.factorId} names unknown parent ${factor.parentFactorId}`);
    }
    if (factor.requiredSubCount !== null && factor.parentFactorId !== null) {
      fail(`factor ${factor.factorId} is both a parent and a child`);
    }
  }

  for (const factor of factors) {
    if (factor.requiredSubCount === null) continue;
    const children = factors.filter((row) => row.parentFactorId === factor.factorId).length;
    if (children < factor.requiredSubCount) {
      fail(
        `factor ${factor.factorId} needs ${factor.requiredSubCount} of ${children} sub-criteria`
      );
    }
  }

  const adviceIds = new Set();
  for (const [index, item] of advice.entries()) {
    requireFields(item, ADVICE_FIELDS, `assessment advice ${index + 1}`);
    if (adviceIds.has(item.adviceId)) fail(`duplicate advice id ${item.adviceId}`);
    adviceIds.add(item.adviceId);
    if (typeof item.textRaw !== "string" || item.textRaw === "") {
      fail(`advice ${item.adviceId} has no text`);
    }
    if (!Array.isArray(item.sourceLines) || item.sourceLines.length === 0) {
      fail(`advice ${item.adviceId} has no source lines`);
    }
    // The join may add spaces; it may not change a character or swallow the
    // ordinal that tells the reader which item of the source this is.
    if (
      withoutWhitespace(`${item.ordinal}${item.textRaw}`) !==
      withoutWhitespace(item.sourceLines.join(""))
    ) {
      fail(`advice ${item.adviceId} differs from its source lines`);
    }
    const grouped = item.groupId !== null;
    if (grouped !== (item.groupHeadingRaw !== null)) {
      fail(`advice ${item.adviceId} is grouped but carries no group heading`);
    }
    // The non-HDL-C note names no tier. Handing it one would scope a sentence the
    // announcement wrote for everybody, so null has to survive to the screen.
    if (grouped !== (item.appliesToTierIds !== null)) {
      fail(`advice ${item.adviceId} pairs a group with no tiers, or the reverse`);
    }
    if (item.appliesToTierIds === null) continue;
    if (!Array.isArray(item.appliesToTierIds) || item.appliesToTierIds.length === 0) {
      fail(`advice ${item.adviceId} applies to no tier`);
    }
    for (const tierId of item.appliesToTierIds) {
      if (tierIds.has(tierId)) continue;
      fail(`advice ${item.adviceId} names unknown tier ${tierId}`);
    }
  }

  // 極高／非常高 and 高／中／低 are disjoint in the source. A tier reachable from two
  // groups would be shown two different sets of advice with nothing to choose by.
  const groupOfTier = new Map();
  for (const item of advice) {
    if (item.appliesToTierIds === null) continue;
    for (const tierId of item.appliesToTierIds) {
      const seen = groupOfTier.get(tierId);
      if (seen !== undefined && seen !== item.groupId) {
        fail(`tier ${tierId} is claimed by advice groups ${seen} and ${item.groupId}`);
      }
      groupOfTier.set(tierId, item.groupId);
    }
  }

  const ruleIds = new Set();
  const declaredCodes = new Set();
  for (const [index, rule] of rules.entries()) {
    requireFields(rule, COVERAGE_RULE_FIELDS, `coverage rule ${index + 1}`);
    if (ruleIds.has(rule.ruleId)) fail(`duplicate coverage rule id ${rule.ruleId}`);
    ruleIds.add(rule.ruleId);
    if (typeof rule.headingRaw !== "string" || rule.headingRaw === "") {
      fail(`coverage rule ${rule.ruleId} has no heading`);
    }
    if (
      !Array.isArray(rule.headingLines) ||
      withoutWhitespace(rule.headingRaw) !== withoutWhitespace(rule.headingLines.join(""))
    ) {
      fail(`coverage rule ${rule.ruleId}'s heading differs from its source lines`);
    }
    // 2.6.2 restricts the drug to three named conditions and then asks for 下列
    // 條件之一; 2.6.3 numbers its requirements with no such connective. Carrying
    // null rather than borrowing 2.6.2's wording is what stops the screen from
    // printing an "any one of" the source never wrote.
    const restricted = rule.restrictionRaw !== null;
    if (restricted !== (rule.restrictionLines !== null)) {
      fail(`coverage rule ${rule.ruleId} pairs a restriction with no source lines`);
    }
    if (
      restricted &&
      withoutWhitespace(rule.restrictionRaw) !== withoutWhitespace(rule.restrictionLines.join(""))
    ) {
      fail(`coverage rule ${rule.ruleId}'s restriction differs from its source lines`);
    }
    if (!Array.isArray(rule.exceptionNhiCodes) || rule.exceptionNhiCodes.length === 0) {
      fail(`coverage rule ${rule.ruleId} points at 下表 but carries no codes`);
    }
    for (const code of rule.exceptionNhiCodes) {
      if (typeof code !== "string" || !NHI_CODE_PATTERN.test(code)) {
        fail(`coverage rule ${rule.ruleId} carries a malformed NHI code`);
      }
      if (declaredCodes.has(code)) fail(`NHI code ${code} is listed under two coverage rules`);
      declaredCodes.add(code);
    }
  }

  const conditionIds = new Set();
  const conditionsPerRule = new Map();
  for (const [index, condition] of conditions.entries()) {
    requireFields(condition, COVERAGE_CONDITION_FIELDS, `coverage condition ${index + 1}`);
    if (conditionIds.has(condition.conditionId)) {
      fail(`duplicate coverage condition id ${condition.conditionId}`);
    }
    conditionIds.add(condition.conditionId);
    if (!ruleIds.has(condition.ruleId)) {
      fail(`condition ${condition.conditionId} names unknown rule ${condition.ruleId}`);
    }
    if (typeof condition.textRaw !== "string" || condition.textRaw === "") {
      fail(`condition ${condition.conditionId} has no text`);
    }
    if (
      !Array.isArray(condition.sourceLines) ||
      withoutWhitespace(`${condition.ordinal}${condition.textRaw}`) !==
        withoutWhitespace(condition.sourceLines.join(""))
    ) {
      fail(`condition ${condition.conditionId} differs from its source lines`);
    }
    conditionsPerRule.set(
      condition.ruleId,
      (conditionsPerRule.get(condition.ruleId) ?? 0) + 1
    );
  }
  for (const ruleId of ruleIds) {
    if (conditionsPerRule.get(ruleId) !== undefined) continue;
    fail(`coverage rule ${ruleId} carries no conditions`);
  }
}

function serialize(records, fields) {
  return records
    .map((record) => {
      const body = fields
        .map((field) => `    ${field}: ${JSON.stringify(record[field])}`)
        .join(",\n");
      return `  {\n${body}\n  }`;
    })
    .join(",\n");
}

function renderModule() {
  const datasetDigest = parseManifest();
  const [advice, conditions, rules, factors, tiers, criteria] = SOURCE_FILES.map(readJsonl);
  checkStructure({ tiers, criteria, factors, advice, rules, conditions });

  return `// Generated file. Do not edit.
//
// Source dataset: ${DATASET_VERSION}
// Transcribed from: attachment-2-rule-revision-table.pdf (${SOURCE_PDF_SHA256})
// Dataset digest (SHA-256): ${datasetDigest}
// Records: ${tiers.length} tiers, ${criteria.length} criteria, ${factors.length} factors,
//          ${advice.length} assessment notes, ${rules.length} coverage rules (${conditions.length} conditions)
// Generator: ${SCRIPT_NAME}

export interface RiskTierRecord {
  readonly tierId: string;
  readonly order: number;
  readonly labelZh: string;
  readonly definitionHeadingRaw: string | null;
  readonly initiationThresholdRaw: string;
  readonly primaryTargetRaw: string;
  readonly secondaryTargetRaw: string | null;
  readonly factorCountRuleRaw: string | null;
  readonly prescriptionHeadingRaw: string | null;
  readonly prescriptionRuleLines: readonly string[] | null;
  readonly prescriptionRuleText: string | null;
}

export interface TierCriterionRecord {
  readonly criterionId: string;
  readonly tierId: string;
  readonly groupId: string | null;
  readonly groupHeadingRaw: string | null;
  readonly prerequisiteLabelZh: string | null;
  readonly ordinal: string | null;
  readonly textRaw: string;
}

export interface RiskFactorRecord {
  readonly factorId: string;
  readonly ordinal: string | null;
  readonly textRaw: string;
  readonly parentFactorId: string | null;
  readonly requiredSubCount: number | null;
}

/**
 * A note the announcement prints beneath the tier table. \`appliesToTierIds\` is
 * null for the non-HDL-C note, which names no tier at all.
 */
export interface AssessmentAdviceRecord {
  readonly adviceId: string;
  readonly groupId: string | null;
  readonly groupHeadingRaw: string | null;
  readonly appliesToTierIds: readonly string[] | null;
  readonly ordinal: string;
  readonly textRaw: string;
  readonly sourceLines: readonly string[];
}

/**
 * 2.6.2 (ezetimibe on its own) and 2.6.3 (the ezetimibe + statin combinations),
 * as revised on 2026-09-01. \`restrictionRaw\` is null for 2.6.3, which numbers its
 * requirements without asking for any one of them.
 */
export interface CoverageRuleRecord {
  readonly ruleId: string;
  readonly headingRaw: string;
  readonly headingLines: readonly string[];
  readonly restrictionRaw: string | null;
  readonly restrictionLines: readonly string[] | null;
  readonly exceptionNhiCodes: readonly string[];
}

export interface CoverageRuleConditionRecord {
  readonly conditionId: string;
  readonly ruleId: string;
  readonly ordinal: string;
  readonly textRaw: string;
  readonly sourceLines: readonly string[];
}

export const RISK_DATASET_VERSION = "${DATASET_VERSION}" as const;
export const RISK_DATASET_EFFECTIVE_FROM = "${EFFECTIVE_FROM}" as const;

const generatedRiskTiers: RiskTierRecord[] = [
${serialize(tiers, TIER_FIELDS)}
];

const generatedTierCriteria: TierCriterionRecord[] = [
${serialize(criteria, CRITERION_FIELDS)}
];

const generatedRiskFactors: RiskFactorRecord[] = [
${serialize(factors, FACTOR_FIELDS)}
];

const generatedAssessmentAdvice: AssessmentAdviceRecord[] = [
${serialize(advice, ADVICE_FIELDS)}
];

const generatedCoverageRules: CoverageRuleRecord[] = [
${serialize(rules, COVERAGE_RULE_FIELDS)}
];

const generatedCoverageRuleConditions: CoverageRuleConditionRecord[] = [
${serialize(conditions, COVERAGE_CONDITION_FIELDS)}
];

function deepFreeze<T>(value: T): T {
  if (typeof value === "object" && value !== null && !Object.isFrozen(value)) {
    for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

export const RISK_TIERS: readonly RiskTierRecord[] = deepFreeze(generatedRiskTiers);
export const TIER_CRITERIA: readonly TierCriterionRecord[] = deepFreeze(generatedTierCriteria);
export const RISK_FACTORS: readonly RiskFactorRecord[] = deepFreeze(generatedRiskFactors);
export const ASSESSMENT_ADVICE: readonly AssessmentAdviceRecord[] =
  deepFreeze(generatedAssessmentAdvice);
export const COVERAGE_RULES: readonly CoverageRuleRecord[] = deepFreeze(generatedCoverageRules);
export const COVERAGE_RULE_CONDITIONS: readonly CoverageRuleConditionRecord[] = deepFreeze(
  generatedCoverageRuleConditions
);
`;
}

// Exported so the test suite can drive the invariants directly with tampered
// records, rather than only observing that the happy path succeeds.
export { checkStructure, renderModule };

export function writeRiskModule() {
  const source = renderModule();
  mkdirSync(path.dirname(outputPath), { recursive: true });
  if (existsSync(outputPath) && readFileSync(outputPath, "utf8") === source) {
    return { source, written: false };
  }
  writeFileSync(outputPath, source, "utf8");
  return { source, written: true };
}

function checkRiskModule() {
  const expectedSource = renderModule();
  if (!existsSync(outputPath)) fail("generated module is missing");
  if (readFileSync(outputPath, "utf8") !== expectedSource) {
    fail("generated module has drifted from governed input");
  }
}

const invokedAsScript =
  process.argv[1] !== undefined &&
  pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;

if (invokedAsScript) {
  try {
    const unknown = process.argv.slice(2).filter((argument) => argument !== "--check");
    if (unknown.length > 0) fail(`unknown argument ${unknown[0]}`);
    if (process.argv.includes("--check")) {
      checkRiskModule();
      process.stdout.write(`risk-codegen: generated module matches ${DATASET_VERSION}\n`);
    } else {
      const { source, written } = writeRiskModule();
      process.stdout.write(
        `risk-codegen: ${written ? "wrote" : "verified unchanged"} ` +
          `${path.relative(repositoryRoot, outputPath)} (${Buffer.byteLength(source)} bytes)\n`
      );
    }
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}
