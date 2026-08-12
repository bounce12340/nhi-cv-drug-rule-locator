import {
  ITEM_RECORDS,
  type DrugItemRecord
} from "./generated/items-2026-09-01";

export const DRUG_ITEM_ANNOUNCEMENT_FILTERS = Object.freeze([
  "all",
  "priceChanged",
  "priceUnchanged"
] as const);

export type DrugItemAnnouncementFilter =
  (typeof DRUG_ITEM_ANNOUNCEMENT_FILTERS)[number];

export interface DrugItemAnnouncementMembership {
  /** The 2026-09-01 announcement lists a payment price for this item, before and after. */
  readonly priceChanged: boolean;
}

const EMPTY_MEMBERSHIP: DrugItemAnnouncementMembership = Object.freeze({
  priceChanged: false
});
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
