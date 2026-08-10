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
  "priceChanged",
  "priceUnchanged"
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
  /** The 2026-09-01 announcement lists a payment price for this item, before and after. */
  readonly priceChanged: boolean;
}

const EMPTY_MEMBERSHIP: DrugItemAnnouncementMembership = Object.freeze({
  priceChanged: false
});
const NO_MASTER_RECORDS: readonly DrugItemMasterRecord[] = Object.freeze([]);
const announcementItemByCode = new Map(ITEM_RECORDS.map((item) => [item.nhiCode, item]));
// Measured against the dataset: 57 of the 187 announcement records carry both a
// before and an after price, and in every one of those 57 the two differ. The
// remaining 130 carry no price at all — they appear in the announcement for
// classification reasons, not because their price moved.
const priceChangedCodes = new Set(
  ITEM_RECORDS.filter(
    (item) => item.priceBefore !== undefined && item.priceAfter !== undefined
  ).map((item) => item.nhiCode)
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
  return Object.freeze({ priceChanged: priceChangedCodes.has(nhiCode) });
}

export function matchesDrugItemAnnouncementFilter(
  nhiCode: string,
  filter: DrugItemAnnouncementFilter
): boolean {
  if (filter === "all") return true;
  const changed = getDrugItemAnnouncementMembership(nhiCode).priceChanged;
  return filter === "priceChanged" ? changed : !changed;
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
