import {
  PRIOR_RULE_DATASET_EFFECTIVE_TO,
  PRIOR_RULE_DATASET_VERSION,
  PRIOR_RULE_SECTIONS,
  type PriorRuleSectionRecord
} from "./generated/rules-prior";
import {
  RULE_TEXT_DATASET_VERSION,
  RULE_TEXT_EFFECTIVE_FROM,
  RULE_TEXT_UNITS
} from "./generated/rules-2026-09-01";

export type { PriorRuleSectionRecord } from "./generated/rules-prior";
export { PRIOR_RULE_DATASET_VERSION, PRIOR_RULE_DATASET_EFFECTIVE_TO };

export const PRIOR_RULE_WARNING =
  "官方 PDF 之文字擷取(2026-09-01 修訂生效前之版本);本工具非健保署系統,查詢結果不可作為申報依據,實際規定以健保署公告為準。" as const;

/**
 * Terms compared between versions. Each is a mechanical pattern over the text —
 * no judgement about which provisions matter, and no attempt to align sentences.
 * Sentence-level alignment between a 2,034-character prior section and an
 * 8,045-character current one would be a guess, and a wrong guess reads as a
 * rule change that did not happen.
 */
const COMPARED_TERM_KINDS = [
  {
    kind: "duration",
    pattern: /(?:每\s*)?\d+\s*(?:[~\-–至]\s*\d+\s*)?(?:個月|週|月)/g
  },
  {
    kind: "lipidThreshold",
    pattern: /(?:non-HDL-C|LDL-C|HDL-C|TC|TG)\s*[≧≥<＜>＞≦≤]\s*\d+\s*mg\/dL/g
  }
] as const;

export type ComparedTermKind = (typeof COMPARED_TERM_KINDS)[number]["kind"];

export interface ComparedTerm {
  readonly kind: ComparedTermKind;
  /** Exactly as it appears in the rule text, never reformatted. */
  readonly text: string;
}

export interface RuleSectionComparison {
  readonly section: string;
  readonly prior: PriorRuleSectionRecord;
  readonly priorDatasetVersion: typeof PRIOR_RULE_DATASET_VERSION;
  readonly priorEffectiveTo: typeof PRIOR_RULE_DATASET_EFFECTIVE_TO;
  readonly currentUnitCount: number;
  readonly currentDatasetVersion: typeof RULE_TEXT_DATASET_VERSION;
  readonly currentEffectiveFrom: typeof RULE_TEXT_EFFECTIVE_FROM;
  /** Present in the prior version, absent from the current one. */
  readonly termsOnlyInPrior: readonly ComparedTerm[];
  /** Present in the current version, absent from the prior one. */
  readonly termsOnlyInCurrent: readonly ComparedTerm[];
  /** Present in both — listed so an empty change list is distinguishable from an empty section. */
  readonly termsInBoth: readonly ComparedTerm[];
}

/**
 * Matching key only. Whitespace (including line breaks introduced by the PDF's
 * column layout) and the several dash and comparison-operator characters used
 * across the two sources are folded, so "6-\n8週" and "6~8 週" compare equal.
 * The displayed text is always the original.
 */
function comparisonKey(term: string): string {
  return term
    .normalize("NFKC")
    .replace(/\s+/g, "")
    .replace(/[～~–—]/g, "-")
    .replace(/[＜]/g, "<")
    .replace(/[＞]/g, ">")
    .replace(/[≧]/g, "≥")
    .replace(/[≦]/g, "≤");
}

function collectTerms(text: string): Map<string, ComparedTerm> {
  const found = new Map<string, ComparedTerm>();
  for (const { kind, pattern } of COMPARED_TERM_KINDS) {
    for (const match of text.match(new RegExp(pattern.source, "g")) ?? []) {
      const key = `${kind}:${comparisonKey(match)}`;
      if (!found.has(key)) found.set(key, Object.freeze({ kind, text: match }));
    }
  }
  return found;
}

function currentSectionText(section: string): string {
  return RULE_TEXT_UNITS.filter((unit) => unit.section === section)
    .map((unit) => unit.verbatimText)
    .join("\n");
}

function currentUnitCount(section: string): number {
  return RULE_TEXT_UNITS.filter((unit) => unit.section === section).length;
}

export const COMPARABLE_RULE_SECTIONS: readonly string[] = Object.freeze(
  PRIOR_RULE_SECTIONS.map((record) => record.section)
);

/** Returns undefined for any section with no prior-version record — never a nearest match. */
export function compareRuleSectionVersions(section: string): RuleSectionComparison | undefined {
  const prior = PRIOR_RULE_SECTIONS.find((record) => record.section === section);
  if (prior === undefined) return undefined;

  const priorTerms = collectTerms(prior.verbatimText);
  const currentTerms = collectTerms(currentSectionText(section));

  const onlyInPrior: ComparedTerm[] = [];
  const inBoth: ComparedTerm[] = [];
  for (const [key, term] of priorTerms) {
    (currentTerms.has(key) ? inBoth : onlyInPrior).push(term);
  }
  const onlyInCurrent: ComparedTerm[] = [];
  for (const [key, term] of currentTerms) {
    if (!priorTerms.has(key)) onlyInCurrent.push(term);
  }

  return Object.freeze({
    section,
    prior,
    priorDatasetVersion: PRIOR_RULE_DATASET_VERSION,
    priorEffectiveTo: PRIOR_RULE_DATASET_EFFECTIVE_TO,
    currentUnitCount: currentUnitCount(section),
    currentDatasetVersion: RULE_TEXT_DATASET_VERSION,
    currentEffectiveFrom: RULE_TEXT_EFFECTIVE_FROM,
    termsOnlyInPrior: Object.freeze(onlyInPrior),
    termsOnlyInCurrent: Object.freeze(onlyInCurrent),
    termsInBoth: Object.freeze(inBoth)
  });
}
