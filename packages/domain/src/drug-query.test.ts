import { describe, expect, it } from "vitest";
import { collectDrugDoseFacets, matchesDrugDoseFilter } from "./drug-dose";
import { DRUG_ITEM_MASTER_RECORDS } from "./generated/drug-items-2026-08-07";
import { lookupDrugItemMaster } from "./drug-item-lookup";
import { parseDrugQuery } from "./drug-query";

const OPTIONS = { today: "2026-08-12", announcementDate: "2026-09-01" } as const;
const parse = (query: string) => parseDrugQuery(query, OPTIONS);

describe("reading one typed line into the existing controls", () => {
  it("splits a name, a strength and a repriced filter out of one line", () => {
    const parsed = parse("atorvastatin 40mg 這次調價的");
    expect(parsed.searchText).toBe("atorvastatin");
    expect(parsed.doseKey).toBe("40mg");
    expect(parsed.announcementFilter).toBe("priceChanged");
    expect(parsed.asOfDate).toBeUndefined();
  });

  it("reads a strength written any of the ways the master and clinicians write it", () => {
    for (const query of ["atorvastatin 40mg", "atorvastatin 40 mg", "atorvastatin 40毫克"]) {
      expect(parse(query).doseKey, query).toBe("40mg");
      expect(parse(query).searchText, query).toBe("atorvastatin");
    }
  });

  it("produces a dose key the dose filter actually accepts", () => {
    // The parsed key is worthless if it does not match what collectDrugDoseFacets emits.
    const parsed = parse("atorvastatin 40mg");
    const atorvastatin = DRUG_ITEM_MASTER_RECORDS.filter((item) =>
      item.ingredient.toUpperCase().includes("ATORVASTATIN")
    );
    expect(collectDrugDoseFacets(atorvastatin).map((facet) => facet.key)).toContain(parsed.doseKey);
    expect(atorvastatin.filter((item) => matchesDrugDoseFilter(item, parsed.doseKey)).length)
      .toBeGreaterThan(0);
  });

  it("tells 未調價 from 調價 rather than matching the substring", () => {
    expect(parse("simvastatin 未調價").announcementFilter).toBe("priceUnchanged");
    expect(parse("simvastatin 沒有調價").announcementFilter).toBe("priceUnchanged");
    expect(parse("simvastatin 本次調價").announcementFilter).toBe("priceChanged");
    expect(parse("simvastatin 調價").announcementFilter).toBe("priceChanged");
  });

  it("reads ROC, ISO and bare month/day dates", () => {
    expect(parse("statin 115/9/1").asOfDate).toBe("2026-09-01");
    expect(parse("statin 2026-09-01").asOfDate).toBe("2026-09-01");
    expect(parse("statin 9/1").asOfDate).toBe("2026-09-01");
    expect(parse("statin 今天").asOfDate).toBe("2026-08-12");
    expect(parse("statin 新制生效日").asOfDate).toBe("2026-09-01");
  });

  it("does not read a compound strength as a date", () => {
    // 10/20mg is ezetimibe 10 with simvastatin 20, not the twentieth of October.
    const parsed = parse("vytorin 10/20mg");
    expect(parsed.asOfDate).toBeUndefined();
    expect(parsed.doseKey).toBe("20mg");
  });

  it("does not read a ten-digit NHI code as a date or a dose", () => {
    const parsed = parse("AC47928100");
    expect(parsed.facets).toEqual([]);
    expect(parsed.searchText).toBe("AC47928100");
    expect(lookupDrugItemMaster({ query: parsed.searchText, as_of_date: OPTIONS.today }).status)
      .toBe("EXACT_MATCH");
  });
});

describe("the parser never loses what was typed", () => {
  it("keeps every unrecognized word in the text handed to the search", () => {
    for (const query of [
      "atorvastatin 40mg 這次調價的",
      "克膽 20mg",
      "pravastatin sodium",
      "zzzzzz 999",
      "立普妥 atorvastatin 10 mg 今天"
    ]) {
      const parsed = parse(query);
      const consumed = parsed.facets.map((facet) => facet.raw).join("");
      const kept = parsed.searchText.replace(/\s/g, "");
      const original = query.replace(/\s/g, "");
      // Every character is either quoted back in a facet or still searched for.
      for (const character of original) {
        expect(
          consumed.includes(character) || kept.includes(character),
          `${query} lost ${character}`
        ).toBe(true);
      }
    }
  });

  it("quotes each facet back with the exact characters that produced it, in typed order", () => {
    const parsed = parse("atorvastatin 40 mg 未調價 115/9/1");
    expect(parsed.facets.map((facet) => facet.raw)).toEqual(["40 mg", "未調價", "115/9/1"]);
    expect(parsed.facets.map((facet) => facet.kind)).toEqual(["dose", "announcement", "date"]);
  });

  it("leaves a plain drug query completely untouched", () => {
    for (const query of ["atorvastatin", "pravastatin sodium", "克膽舒", "AC47928100"]) {
      const parsed = parse(query);
      expect(parsed.facets, query).toEqual([]);
      expect(parsed.searchText, query).toBe(query);
      expect(parsed.doseKey).toBeUndefined();
      expect(parsed.announcementFilter).toBeUndefined();
      expect(parsed.asOfDate).toBeUndefined();
    }
  });

  it("returns an empty parse for an empty input rather than throwing", () => {
    for (const query of ["", "   "]) {
      const parsed = parse(query);
      expect(parsed.searchText).toBe("");
      expect(parsed.facets).toEqual([]);
    }
  });

  it("rejects a date that does not exist instead of shifting it", () => {
    expect(parse("statin 2026-02-30").asOfDate).toBeUndefined();
    expect(parse("statin 115/13/1").asOfDate).toBeUndefined();
    expect(parse("statin 2026-02-30").searchText).toContain("2026-02-30");
  });

  it("returns frozen values", () => {
    const parsed = parse("atorvastatin 40mg");
    expect(Object.isFrozen(parsed)).toBe(true);
    expect(Object.isFrozen(parsed.facets)).toBe(true);
  });
});

describe("question scaffolding is set aside, and said so", () => {
  it("does not leave an orphaned particle to rule out every item", () => {
    // The defect this exists for: removing 這次調價 from "atorvastatin 40mg 這次調價的"
    // left 的 behind, every word has to be found, and the search returned nothing.
    const parsed = parse("atorvastatin 40mg 這次調價的");
    expect(parsed.searchText).toBe("atorvastatin");
    const matches = lookupDrugItemMaster({
      query: parsed.searchText,
      as_of_date: OPTIONS.today
    }).matches.filter((match) => matchesDrugDoseFilter(match.item, parsed.doseKey));
    expect(matches.length).toBeGreaterThan(0);
  });

  it("reports what it set aside instead of dropping it quietly", () => {
    const parsed = parse("請幫我查 atorvastatin 40mg");
    expect(parsed.facets.filter((facet) => facet.kind === "ignored").map((facet) => facet.raw))
      .toEqual(["請", "幫我", "查"]);
    expect(parsed.searchText).toBe("atorvastatin");
  });

  it("keeps 和 searchable, because eight real products carry it", () => {
    // 「正和」 is a manufacturer in the master; treating 和 as filler would hide them.
    const parsed = parse("正和 柔舒脂");
    expect(parsed.facets.filter((facet) => facet.kind === "ignored")).toEqual([]);
    expect(parsed.searchText).toBe("正和 柔舒脂");
    expect(
      lookupDrugItemMaster({ query: "正和", as_of_date: OPTIONS.today }).matches.length
    ).toBeGreaterThan(0);
  });
});

describe("the parse reaches the same items as the long way round", () => {
  it("matches what a clinician would get by typing the name then clicking the chips", () => {
    const parsed = parse("atorvastatin 40mg");
    const viaParse = lookupDrugItemMaster({
      query: parsed.searchText,
      as_of_date: OPTIONS.today
    }).matches.filter((match) => matchesDrugDoseFilter(match.item, parsed.doseKey));

    const byHand = lookupDrugItemMaster({
      query: "atorvastatin",
      as_of_date: OPTIONS.today
    }).matches.filter((match) => matchesDrugDoseFilter(match.item, "40mg"));

    expect(viaParse.map((match) => match.item.nhiCode)).toEqual(
      byHand.map((match) => match.item.nhiCode)
    );
    expect(viaParse.length).toBeGreaterThan(0);
  });
});
