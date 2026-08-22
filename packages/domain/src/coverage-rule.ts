import {
  COVERAGE_RULES,
  COVERAGE_RULE_CONDITIONS,
  type CoverageRuleConditionRecord,
  type CoverageRuleRecord
} from "./generated/risk-2026-09-01";
import {
  DRUG_ITEMS_DATASET_EFFECTIVE_FROM,
  DRUG_ITEMS_DATASET_EFFECTIVE_TO,
  DRUG_ITEMS_DATASET_VERSION,
  DRUG_ITEM_MASTER_RECORDS
} from "./generated/drug-items-2026-08-07";
import {
  selectDrugItemMasterPricePeriod,
  type DrugItemMasterMatch
} from "./drug-item-lookup";

/**
 * 2.6.2 and 2.6.3 of the announcement's attachment 2, as revised.
 *
 * These state when ezetimibe is covered — on its own under 2.6.2, and as a
 * combination product under 2.6.3 — which the tier table does not say anywhere.
 * Only the 建議修訂後給付規定 column is carried. The prior/current comparison the
 * attachment prints beside it is not part of this dataset and is not rebuilt here.
 *
 * Nothing in this file decides whether a patient qualifies. It returns the
 * announcement's own sentences and the item codes its 下表 points at.
 */

export interface CoverageRuleView {
  readonly rule: CoverageRuleRecord;
  readonly conditions: readonly CoverageRuleConditionRecord[];
}

/** Both rules, in the source's own numbering. */
export function getCoverageRules(): readonly CoverageRuleView[] {
  return Object.freeze(
    COVERAGE_RULES.map((rule) =>
      Object.freeze({
        rule,
        conditions: Object.freeze(
          COVERAGE_RULE_CONDITIONS.filter((condition) => condition.ruleId === rule.ruleId)
        )
      })
    )
  );
}

export interface CoverageRuleItemListing {
  readonly status: "OK" | "NOT_IN_VALIDATED_DATASET";
  readonly asOfDate: string;
  readonly datasetVersion: typeof DRUG_ITEMS_DATASET_VERSION;
  readonly matches: readonly DrugItemMasterMatch[];
  /** Codes the rule lists that the master does not price on this date. */
  readonly unresolvedNhiCodes: readonly string[];
}

const NO_MATCHES: readonly DrugItemMasterMatch[] = Object.freeze([]);
const NO_CODES: readonly string[] = Object.freeze([]);

function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value));
}

/**
 * The items a rule's 下表 names — the ones that need three months of statin
 * monotherapy rather than six to eight weeks.
 *
 * Codes the master cannot price on the requested date are reported as
 * unresolved rather than dropped: the rule lists them, so a screen that showed
 * three rows for a four-code table would understate what the rule covers. Fails
 * closed on a bad date exactly as the drug lookup does.
 */
export function listCoverageRuleExceptionItems(request: {
  readonly ruleId: string;
  readonly asOfDate: string;
}): CoverageRuleItemListing {
  const { ruleId, asOfDate } = request;
  const rule = COVERAGE_RULES.find((candidate) => candidate.ruleId === ruleId);
  if (
    rule === undefined ||
    typeof asOfDate !== "string" ||
    !isIsoDate(asOfDate) ||
    asOfDate < DRUG_ITEMS_DATASET_EFFECTIVE_FROM ||
    asOfDate > DRUG_ITEMS_DATASET_EFFECTIVE_TO
  ) {
    return Object.freeze({
      status: "NOT_IN_VALIDATED_DATASET",
      asOfDate: typeof asOfDate === "string" ? asOfDate : "",
      datasetVersion: DRUG_ITEMS_DATASET_VERSION,
      matches: NO_MATCHES,
      unresolvedNhiCodes: NO_CODES
    });
  }

  const matches: DrugItemMasterMatch[] = [];
  const unresolvedNhiCodes: string[] = [];
  for (const code of rule.exceptionNhiCodes) {
    const item = DRUG_ITEM_MASTER_RECORDS.find((record) => record.nhiCode === code);
    const period =
      item === undefined
        ? undefined
        : selectDrugItemMasterPricePeriod(item.priceHistory, asOfDate);
    if (item === undefined || period === undefined) {
      unresolvedNhiCodes.push(code);
      continue;
    }
    matches.push(Object.freeze({ item, applicablePricePeriod: period }));
  }

  return Object.freeze({
    status: "OK",
    asOfDate,
    datasetVersion: DRUG_ITEMS_DATASET_VERSION,
    matches: Object.freeze(matches),
    unresolvedNhiCodes: Object.freeze(unresolvedNhiCodes)
  });
}
