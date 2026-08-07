import {
  ITEM_RECORDS,
  type DrugItemRecord
} from "./generated/items-2026-09-01";
import {
  DRUG_ITEM_MASTER_RECORDS,
  type DrugItemMasterRecord
} from "./generated/drug-items-2026-08-07";

export const DRUG_ITEM_ANNOUNCEMENT_FILTERS = Object.freeze([
  "all",
  "changed",
  "trial",
  "tableTwo"
] as const);

export type DrugItemAnnouncementFilter =
  (typeof DRUG_ITEM_ANNOUNCEMENT_FILTERS)[number];

export const NAVIGABLE_DRUG_ITEM_RULE_SECTIONS = Object.freeze([
  "2.6.1",
  "2.6.2",
  "2.6.3"
] as const);

export type NavigableDrugItemRuleSection =
  (typeof NAVIGABLE_DRUG_ITEM_RULE_SECTIONS)[number];

export interface DrugItemAnnouncementMembership {
  readonly changed: boolean;
  readonly trial: boolean;
  readonly tableTwo: boolean;
}

const EMPTY_MEMBERSHIP: DrugItemAnnouncementMembership = Object.freeze({
  changed: false,
  trial: false,
  tableTwo: false
});
const NO_MASTER_RECORDS: readonly DrugItemMasterRecord[] = Object.freeze([]);
const announcementItemByCode = new Map(ITEM_RECORDS.map((item) => [item.nhiCode, item]));
const changedCodes = new Set(
  ITEM_RECORDS.filter(
    (item) =>
      item.priceBefore !== undefined ||
      item.priceAfter !== undefined ||
      item.effectiveDate !== undefined
  ).map((item) => item.nhiCode)
);
const trialCodes = new Set(
  ITEM_RECORDS.filter((item) => item.exceptionNote === "3個月").map((item) => item.nhiCode)
);
const tableTwoCodes = new Set(
  ITEM_RECORDS.filter((item) => item.tableClassification === "表二").map(
    (item) => item.nhiCode
  )
);

const recordsBySection = new Map<NavigableDrugItemRuleSection, readonly DrugItemMasterRecord[]>(
  NAVIGABLE_DRUG_ITEM_RULE_SECTIONS.map((section) => [
    section,
    Object.freeze(
      DRUG_ITEM_MASTER_RECORDS.filter((record) =>
        hasExactCoverageRuleSectionToken(record.coverageRuleSection, section)
      )
    )
  ])
);

/** Returns only an exact source-code join; it performs no normalization or near-code recovery. */
export function findAnnouncementItemByExactCode(
  nhiCode: string
): DrugItemRecord | undefined {
  return announcementItemByCode.get(nhiCode);
}

export function getDrugItemAnnouncementMembership(
  nhiCode: string
): DrugItemAnnouncementMembership {
  if (!announcementItemByCode.has(nhiCode)) return EMPTY_MEMBERSHIP;
  return Object.freeze({
    changed: changedCodes.has(nhiCode),
    trial: trialCodes.has(nhiCode),
    tableTwo: tableTwoCodes.has(nhiCode)
  });
}

export function matchesDrugItemAnnouncementFilter(
  nhiCode: string,
  filter: DrugItemAnnouncementFilter
): boolean {
  if (filter === "all") return true;
  return getDrugItemAnnouncementMembership(nhiCode)[filter];
}

/** Compares comma-delimited source tokens exactly, including their final source punctuation. */
export function hasExactCoverageRuleSectionToken(
  coverageRuleSection: string,
  section: NavigableDrugItemRuleSection
): boolean {
  const expectedSourceToken = `${section}.`;
  return coverageRuleSection
    .split(",")
    .map((token) => token.trim())
    .some((token) => token === expectedSourceToken);
}

export function getNavigableDrugItemRuleSections(
  coverageRuleSection: string
): readonly NavigableDrugItemRuleSection[] {
  return Object.freeze(
    NAVIGABLE_DRUG_ITEM_RULE_SECTIONS.filter((section) =>
      hasExactCoverageRuleSectionToken(coverageRuleSection, section)
    )
  );
}

export function listDrugItemMasterRecordsByRuleSection(
  section: string
): readonly DrugItemMasterRecord[] {
  if (!NAVIGABLE_DRUG_ITEM_RULE_SECTIONS.includes(section as NavigableDrugItemRuleSection)) {
    return NO_MASTER_RECORDS;
  }
  return recordsBySection.get(section as NavigableDrugItemRuleSection) ?? NO_MASTER_RECORDS;
}
