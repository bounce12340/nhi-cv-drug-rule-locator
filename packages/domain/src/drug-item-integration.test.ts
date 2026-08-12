import { describe, expect, it } from "vitest";
import {
  DRUG_ITEMS_DATASET_VERSION,
  DRUG_ITEM_MASTER_RECORDS,
  lookupDrugItemMaster
} from "./drug-item-lookup";
import { ITEM_RECORDS } from "./item-lookup";
import {
  findAnnouncementItemByExactCode,
  getDrugItemAnnouncementMembership,
  matchesDrugItemAnnouncementFilter
} from "./drug-item-integration";

describe("drug-item master and announcement display integration", () => {
  it("marks an item as price-changed only when the announcement gives both prices", () => {
    const priced = ITEM_RECORDS.find(
      (item) => item.priceBefore !== undefined && item.priceAfter !== undefined
    )!;
    const unpriced = ITEM_RECORDS.find(
      (item) => item.priceBefore === undefined && item.priceAfter === undefined
    )!;

    expect(getDrugItemAnnouncementMembership(priced.nhiCode).priceChanged).toBe(true);
    expect(getDrugItemAnnouncementMembership(unpriced.nhiCode).priceChanged).toBe(false);
    expect(matchesDrugItemAnnouncementFilter(priced.nhiCode, "priceChanged")).toBe(true);
    expect(matchesDrugItemAnnouncementFilter(priced.nhiCode, "priceUnchanged")).toBe(false);
    expect(matchesDrugItemAnnouncementFilter(unpriced.nhiCode, "priceUnchanged")).toBe(true);
  });

  it("counts 57 price changes among the 187 announcement records", () => {
    let changed = 0;
    for (const item of ITEM_RECORDS) {
      const membership = getDrugItemAnnouncementMembership(item.nhiCode);
      expect(membership.priceChanged).toBe(
        item.priceBefore !== undefined && item.priceAfter !== undefined
      );
      if (membership.priceChanged) changed += 1;
    }
    expect(ITEM_RECORDS).toHaveLength(187);
    expect(changed).toBe(57);
  });

  it("treats a code absent from the announcement as price-unchanged, never as unknown", () => {
    const absent = DRUG_ITEM_MASTER_RECORDS.map((record) => record.nhiCode).find(
      (code) => !ITEM_RECORDS.some((item) => item.nhiCode === code)
    )!;
    expect(getDrugItemAnnouncementMembership(absent).priceChanged).toBe(false);
    expect(matchesDrugItemAnnouncementFilter(absent, "priceUnchanged")).toBe(true);
    expect(matchesDrugItemAnnouncementFilter(absent, "priceChanged")).toBe(false);
  });

  it("partitions the master exactly: 57 changed + 550 unchanged = 607", () => {
    let changed = 0;
    let unchanged = 0;
    for (const record of DRUG_ITEM_MASTER_RECORDS) {
      if (matchesDrugItemAnnouncementFilter(record.nhiCode, "priceChanged")) changed += 1;
      if (matchesDrugItemAnnouncementFilter(record.nhiCode, "priceUnchanged")) unchanged += 1;
    }
    expect(changed).toBe(57);
    expect(unchanged).toBe(550);
    expect(changed + unchanged).toBe(DRUG_ITEM_MASTER_RECORDS.length);
  });

  it("joins the announcement dataset only by an exact code", () => {
    const item = ITEM_RECORDS[0]!;
    const nearCode = `${item.nhiCode.slice(0, -1)}${item.nhiCode.endsWith("0") ? "1" : "0"}`;
    expect(findAnnouncementItemByExactCode(item.nhiCode)).toBe(item);
    expect(findAnnouncementItemByExactCode(nearCode)).toBeUndefined();
    expect(getDrugItemAnnouncementMembership(nearCode)).toEqual({ priceChanged: false });
  });

  it("keeps membership results frozen", () => {
    expect(Object.isFrozen(getDrugItemAnnouncementMembership(ITEM_RECORDS[0]!.nhiCode))).toBe(true);
  });

  it("exposes the r2 trial item through the master while preserving its blank chapter", () => {
    const blankChapterTrialItems = DRUG_ITEM_MASTER_RECORDS.filter(
      (record) =>
        record.coverageRuleSection === "" &&
        findAnnouncementItemByExactCode(record.nhiCode)?.exceptionNote === "3個月"
    );
    expect(blankChapterTrialItems).toHaveLength(1);
    const item = blankChapterTrialItems[0]!;
    expect(item).toBeDefined();
    expect(item.coverageRuleSection).toBe("");
    const lookup = lookupDrugItemMaster({
      query: item.nhiCode,
      as_of_date: "2026-08-07",
      dataset_version: DRUG_ITEMS_DATASET_VERSION
    });
    expect(lookup.status).toBe("EXACT_MATCH");
    expect(lookup.matches[0]?.item).toBe(item);
    // The announcement row keeps every field it was transcribed with, including
    // exceptionNote — the UI no longer filters on it, but the data is not altered.
    expect(findAnnouncementItemByExactCode(item.nhiCode)?.exceptionNote).toBe("3個月");
  });
});
