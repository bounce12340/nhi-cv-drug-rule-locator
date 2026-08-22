import { describe, expect, it } from "vitest";
import { getCoverageRules, listCoverageRuleExceptionItems } from "./coverage-rule";
import { ITEM_RECORDS } from "./generated/items-2026-09-01";

/**
 * 2.6.2 and 2.6.3 as the announcement revised them. The claims worth guarding are
 * that the tool prints the rule and not a reading of it, and that the item codes
 * it shows come back to the same 14 items the announcement's own tables name.
 */

const rules = getCoverageRules();
const byId = new Map(rules.map((view) => [view.rule.ruleId, view]));

describe("the ezetimibe coverage rules", () => {
  it("carries both rules with the conditions the source numbers under each", () => {
    expect(rules.map((view) => view.rule.ruleId)).toEqual(["2.6.2", "2.6.3"]);
    expect(byId.get("2.6.2")!.conditions).toHaveLength(2);
    expect(byId.get("2.6.3")!.conditions).toHaveLength(3);
  });

  it("states 2.6.2's disease restriction and its 之一 connective verbatim", () => {
    const restriction = byId.get("2.6.2")!.rule.restrictionRaw;
    expect(restriction).toContain("同型接合子性麥脂醇血症(植物脂醇血症)");
    expect(restriction).toContain("並符合下列條件之一者：");
  });

  it("gives 2.6.3 no restriction, because the source writes it none", () => {
    // 2.6.3 numbers three requirements with no "any one of" over them. Borrowing
    // 2.6.2's connective would turn all three into alternatives.
    const rule = byId.get("2.6.3")!.rule;
    expect(rule.restrictionRaw).toBeNull();
    expect(rule.restrictionLines).toBeNull();
    expect(byId.get("2.6.3")!.conditions.map((c) => c.textRaw).join("")).not.toContain("之一者");
  });

  it("keeps statin intolerance as 2.6.2's own first condition", () => {
    expect(byId.get("2.6.2")!.conditions[0]!.textRaw).toBe(
      "對 statins 類藥品發生無法耐受藥物不良反應（如 Severe myalgia、Myositis）者。(94/6/1、115/9/1)"
    );
  });

  it("writes 6-8週 without the space the wrap would otherwise have inserted", () => {
    // The document spaces numbers against Chinese in 表一 and nowhere else. 2.6.2
    // wraps after the hyphen and 2.6.3 after the 8, so the two would disagree if
    // the join rule were left to guess at the second one.
    for (const ruleId of ["2.6.2", "2.6.3"]) {
      const joined = byId.get(ruleId)!.conditions.map((c) => c.textRaw).join("");
      expect(joined, ruleId).toContain("單一治療6-8週未達治療目標者");
      expect(joined, ruleId).not.toContain("6-8 週");
    }
  });

  it("names the same 14 items the announcement dataset independently flagged", () => {
    // Two transcriptions of one fact: the 健保代碼 tables read out of the PDF here,
    // and the exception CSVs compiled into the announcement dataset. A drift
    // between them means one of the two was mis-transcribed.
    const fromRules = rules.flatMap((view) => view.rule.exceptionNhiCodes);
    const fromItems = ITEM_RECORDS.filter((item) => item.exceptionNote !== undefined).map(
      (item) => item.nhiCode
    );
    expect(fromRules).toHaveLength(14);
    expect([...fromRules].sort()).toEqual([...fromItems].sort());
    expect(byId.get("2.6.2")!.rule.exceptionNhiCodes).toHaveLength(4);
    expect(byId.get("2.6.3")!.rule.exceptionNhiCodes).toHaveLength(10);
  });
});

describe("listing a rule's exception items", () => {
  it("resolves the codes against the master and reports what it could not price", () => {
    const listing = listCoverageRuleExceptionItems({ ruleId: "2.6.2", asOfDate: "2026-08-12" });
    expect(listing.status).toBe("OK");
    expect(listing.matches.length + listing.unresolvedNhiCodes.length).toBe(4);
    for (const match of listing.matches) {
      expect(byId.get("2.6.2")!.rule.exceptionNhiCodes).toContain(match.item.nhiCode);
    }
  });

  it("reports an unpriced code rather than dropping it from the count", () => {
    // A four-code table that rendered three rows would understate the rule.
    const listing = listCoverageRuleExceptionItems({ ruleId: "2.6.3", asOfDate: "2026-08-12" });
    const shown = new Set(listing.matches.map((match) => match.item.nhiCode));
    for (const code of byId.get("2.6.3")!.rule.exceptionNhiCodes) {
      expect(shown.has(code) || listing.unresolvedNhiCodes.includes(code), code).toBe(true);
    }
  });

  it("fails closed on an unknown rule instead of returning the other one", () => {
    const listing = listCoverageRuleExceptionItems({ ruleId: "2.6.1", asOfDate: "2026-08-12" });
    expect(listing.status).toBe("NOT_IN_VALIDATED_DATASET");
    expect(listing.matches).toHaveLength(0);
  });

  it("fails closed on a date the master does not cover", () => {
    for (const asOfDate of ["2026-13-01", "not-a-date", "1999-01-01", ""]) {
      const listing = listCoverageRuleExceptionItems({ ruleId: "2.6.2", asOfDate });
      expect(listing.status, asOfDate).toBe("NOT_IN_VALIDATED_DATASET");
      expect(listing.matches, asOfDate).toHaveLength(0);
    }
  });
});
