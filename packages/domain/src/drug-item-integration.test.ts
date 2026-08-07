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
  getNavigableDrugItemRuleSections,
  hasExactCoverageRuleSectionToken,
  listDrugItemMasterRecordsByRuleSection,
  matchesDrugItemAnnouncementFilter
} from "./drug-item-integration";

describe("drug-item master and announcement display integration", () => {
  it("derives the three factual memberships from exact announcement rows", () => {
    const changed = ITEM_RECORDS.find((item) => item.priceAfter !== undefined)!;
    const trial = ITEM_RECORDS.find((item) => item.exceptionNote === "3個月")!;
    const tableTwo = ITEM_RECORDS.find((item) => item.tableClassification === "表二")!;

    expect(getDrugItemAnnouncementMembership(changed.nhiCode).changed).toBe(true);
    expect(getDrugItemAnnouncementMembership(trial.nhiCode).trial).toBe(true);
    expect(getDrugItemAnnouncementMembership(tableTwo.nhiCode).tableTwo).toBe(true);
    expect(matchesDrugItemAnnouncementFilter(changed.nhiCode, "changed")).toBe(true);
    expect(matchesDrugItemAnnouncementFilter(trial.nhiCode, "trial")).toBe(true);
    expect(matchesDrugItemAnnouncementFilter(tableTwo.nhiCode, "tableTwo")).toBe(true);
  });

  it("keeps all three membership sets aligned to their governed source fields", () => {
    const counts = { changed: 0, trial: 0, tableTwo: 0 };
    for (const item of ITEM_RECORDS) {
      const membership = getDrugItemAnnouncementMembership(item.nhiCode);
      expect(membership.changed).toBe(
        item.priceBefore !== undefined ||
          item.priceAfter !== undefined ||
          item.effectiveDate !== undefined
      );
      expect(membership.trial).toBe(item.exceptionNote === "3個月");
      expect(membership.tableTwo).toBe(item.tableClassification === "表二");
      if (membership.changed) counts.changed += 1;
      if (membership.trial) counts.trial += 1;
      if (membership.tableTwo) counts.tableTwo += 1;
    }
    expect(counts).toEqual({ changed: 57, trial: 14, tableTwo: 116 });
  });

  it("joins the announcement dataset only by an exact code", () => {
    const item = ITEM_RECORDS[0]!;
    const nearCode = `${item.nhiCode.slice(0, -1)}${item.nhiCode.endsWith("0") ? "1" : "0"}`;
    expect(findAnnouncementItemByExactCode(item.nhiCode)).toBe(item);
    expect(findAnnouncementItemByExactCode(nearCode)).toBeUndefined();
    expect(getDrugItemAnnouncementMembership(nearCode)).toEqual({
      changed: false,
      trial: false,
      tableTwo: false
    });
  });

  it("keeps membership results and section result arrays frozen", () => {
    expect(Object.isFrozen(getDrugItemAnnouncementMembership(ITEM_RECORDS[0]!.nhiCode))).toBe(true);
    expect(Object.isFrozen(listDrugItemMasterRecordsByRuleSection("2.6.1"))).toBe(true);
  });

  it("matches a chapter only as a complete comma-delimited source token", () => {
    expect(hasExactCoverageRuleSectionToken("2.6.1.", "2.6.1")).toBe(true);
    expect(hasExactCoverageRuleSectionToken("2.6.2., 2.6.1.", "2.6.1")).toBe(true);
    expect(hasExactCoverageRuleSectionToken("8.2.6.1.", "2.6.1")).toBe(false);
    expect(hasExactCoverageRuleSectionToken("2.6.10.", "2.6.1")).toBe(false);
    expect(hasExactCoverageRuleSectionToken("2.6.1.1.", "2.6.1")).toBe(false);
  });

  it("enumerates only master rows carrying the requested exact chapter token", () => {
    for (const section of ["2.6.1", "2.6.2", "2.6.3"] as const) {
      const items = listDrugItemMasterRecordsByRuleSection(section);
      expect(items.length).toBeGreaterThan(0);
      expect(
        items.every((item) => hasExactCoverageRuleSectionToken(item.coverageRuleSection, section))
      ).toBe(true);
    }
    expect(listDrugItemMasterRecordsByRuleSection("8.2.6.1")).toEqual([]);
  });

  it("returns exact navigable sections without substring-derived links", () => {
    expect(getNavigableDrugItemRuleSections("2.6.1.,2.6.3.")).toEqual(["2.6.1", "2.6.3"]);
    expect(getNavigableDrugItemRuleSections("8.2.6.1.")).toEqual([]);
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
    expect(findAnnouncementItemByExactCode(item.nhiCode)?.exceptionNote).toBe("3個月");
    expect(getDrugItemAnnouncementMembership(item.nhiCode).trial).toBe(true);
  });
});
