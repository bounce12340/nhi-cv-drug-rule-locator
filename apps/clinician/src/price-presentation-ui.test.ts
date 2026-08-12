import {
  ITEM_RECORDS,
  getDrugItemAnnouncementMembership,
  lookupDrugItemMaster
} from "@nhi-cv/domain";
import { describe, expect, it } from "vitest";
import {
  DRUG_ITEM_MASTER_SNAPSHOT_DATE,
  getClinicianLayoutMode,
  resolveAnnouncementPriceComparison,
  shouldShowMasterSnapshotNotice
} from "./drug-item-ui";

const changedAnnouncementItem = ITEM_RECORDS.find(
  (item) =>
    getDrugItemAnnouncementMembership(item.nhiCode).priceChanged &&
    item.priceBefore !== undefined &&
    item.priceBefore.length > 0 &&
    item.priceAfter !== undefined &&
    item.priceAfter.length > 0
)!;
const changedCode = changedAnnouncementItem.nhiCode;
const unchangedAnnouncementItem = ITEM_RECORDS.find(
  (item) => !getDrugItemAnnouncementMembership(item.nhiCode).priceChanged
)!;

describe("announcement-only price comparison presentation", () => {
  it("copies all four comparison values from each changed announcement row", () => {
    const changedItems = ITEM_RECORDS.filter(
      (item) => getDrugItemAnnouncementMembership(item.nhiCode).priceChanged
    );
    expect(changedItems).toHaveLength(57);

    for (const item of changedItems) {
      const comparison = resolveAnnouncementPriceComparison(item.nhiCode);
      expect(comparison).toEqual({
        priceBefore: item.priceBefore,
        priceAfter: item.priceAfter,
        effectiveDate: item.effectiveDate,
        coverageRule: item.coverageRule
      });
      expect(Object.isFrozen(comparison)).toBe(true);
    }
  });

  it("does not create a comparison for a code outside the announcement change set", () => {
    expect(getDrugItemAnnouncementMembership(unchangedAnnouncementItem.nhiCode).priceChanged).toBe(
      false
    );
    expect(resolveAnnouncementPriceComparison(unchangedAnnouncementItem.nhiCode)).toBeUndefined();
  });

  it("implements the complete date-by-membership condition matrix", () => {
    expect(shouldShowMasterSnapshotNotice("2026-09-01", changedCode)).toBe(true);
    expect(shouldShowMasterSnapshotNotice("2026-08-31", changedCode)).toBe(false);
    expect(
      shouldShowMasterSnapshotNotice("2026-09-01", unchangedAnnouncementItem.nhiCode)
    ).toBe(false);
    expect(
      shouldShowMasterSnapshotNotice("2026-08-31", unchangedAnnouncementItem.nhiCode)
    ).toBe(false);
  });

});
