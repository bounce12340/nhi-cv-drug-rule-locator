import {
  PRIOR_RULE_DATASET_EFFECTIVE_TO,
  PRIOR_RULE_DATASET_VERSION,
  PRIOR_RULE_SECTIONS,
  type PriorRuleSectionRecord
} from "./generated/rules-prior";
import { diffRuleSectionText, type RuleDiffSummary } from "./rule-diff";
import { extractNhiCodesFromVerbatimText } from "./rule-drug-identification";
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
 * A quick summary of the numbers that moved, sitting above the full token-level
 * diff. Each is a mechanical pattern over the text — no judgement about which
 * provisions matter. It answers "what thresholds changed" at a glance; `diff`
 * answers "what does the provision now say".
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

/**
 * A drug listing that was left out of the comparison input. Reported rather than
 * dropped quietly, so the screen can say what is missing from the comparison and
 * where to read it instead.
 */
export interface ExcludedDrugListing {
  /** The unit whose verbatim text holds it. Its full text is unchanged and still displayed. */
  readonly unitId: string;
  readonly characterCount: number;
  /** Codes inside the excluded region; the same items the master identification block lists. */
  readonly nhiCodeCount: number;
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
  /** Token-level side-by-side comparison. Derived view; see rule-diff.ts. */
  readonly diff: RuleDiffSummary;
  /** Drug listings held back from `diff`'s input. Empty for every section but 2.6.1. */
  readonly excludedDrugListings: readonly ExcludedDrugListing[];
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

/**
 * The header of the drug listing that 2.6.1 gained on 2026-09-01. It appears exactly
 * once across all 67 current units and never in any prior section.
 */
const DRUG_LISTING_HEADER = "成分名稱\n健保代碼\n藥品名稱";

/**
 * The listing runs from that header to the end of the unit holding it, and is left out
 * of the comparison input.
 *
 * Why, measured on 2.6.1: the section's current text is 8,045 characters, of which the
 * listing is 5,098 — and the prior text has no listing at all, so it can only ever align
 * as one undifferentiated block. It landed in a single diff row whose current cell was
 * 5,080 characters, marked `replaced`, which reads as a claim that the regulator rewrote
 * the old criteria table into a list of products. It did not; the list is new.
 *
 * Removing it changes no alignment decision. The diff still produces 14 rows with the
 * same 7 unchanged / 7 replaced split; only that one cell shrinks, to 709 characters.
 *
 * This trims the comparison's input only. The unit's verbatim text is displayed in full
 * and unaltered in the rule-text tree, and every code in the listing is resolved against
 * the master by `identifyRuleDrugMasterRecords` — which is where a clinician should read
 * the drug names, since the listing's own name column cannot be paired by row order.
 */
function withoutDrugListing(verbatimText: string): string {
  const at = verbatimText.indexOf(DRUG_LISTING_HEADER);
  return at === -1 ? verbatimText : verbatimText.slice(0, at).trimEnd();
}

function currentSectionUnits(section: string): readonly (typeof RULE_TEXT_UNITS)[number][] {
  return RULE_TEXT_UNITS.filter((unit) => unit.section === section);
}

/** The section's text as compared: verbatim except for the drug listing described above. */
function comparedSectionText(section: string): string {
  return currentSectionUnits(section)
    .map((unit) => withoutDrugListing(unit.verbatimText))
    .join("\n");
}

function excludedDrugListings(section: string): readonly ExcludedDrugListing[] {
  return Object.freeze(
    currentSectionUnits(section).flatMap((unit) => {
      const at = unit.verbatimText.indexOf(DRUG_LISTING_HEADER);
      if (at === -1) return [];
      const listing = unit.verbatimText.slice(at);
      return [
        Object.freeze({
          unitId: unit.unitId,
          characterCount: listing.length,
          nhiCodeCount: extractNhiCodesFromVerbatimText(listing).length
        })
      ];
    })
  );
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
  const currentTerms = collectTerms(comparedSectionText(section));

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
    termsInBoth: Object.freeze(inBoth),
    diff: diffRuleSectionText(prior.verbatimText, comparedSectionText(section)),
    excludedDrugListings: excludedDrugListings(section)
  });
}
