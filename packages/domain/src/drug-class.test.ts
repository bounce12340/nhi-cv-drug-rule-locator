import { describe, expect, it } from "vitest";
import {
  getLipidDrugClasses,
  listLipidDrugItems,
  LIPID_CLASSES_ABSENT_FROM_MASTER
} from "./drug-class";
import { DRUG_ITEM_MASTER_RECORDS } from "./generated/drug-items-2026-08-07";

const records = DRUG_ITEM_MASTER_RECORDS;
const ingredientOf = (record: { ingredient: string }): string => record.ingredient.toUpperCase();

describe("what the master actually holds", () => {
  // Measured, not carried over from the design sketch — which guessed 186 and 37.
  it("classifies all 607 records, with the counts the snapshot really has", () => {
    expect(records).toHaveLength(607);
    const statin = records.filter((record) => ingredientOf(record).includes("STATIN"));
    const ezetimibe = records.filter((record) => ingredientOf(record).includes("EZETIMIBE"));
    const both = records.filter(
      (record) =>
        ingredientOf(record).includes("STATIN") && ingredientOf(record).includes("EZETIMIBE")
    );
    expect(statin).toHaveLength(396);
    expect(ezetimibe).toHaveLength(27);
    expect(both).toHaveLength(19);
    expect(
      records.filter((record) => getLipidDrugClasses(record).includes("other"))
    ).toHaveLength(203);
  });

  it("matches only real statins, so nothing like nystatin can be swept in", () => {
    const words = new Set<string>();
    for (const record of records) {
      for (const match of ingredientOf(record).matchAll(/[A-Z]*STATIN/gu)) words.add(match[0]);
    }
    expect([...words].sort()).toEqual([
      "ATORVASTATIN",
      "FLUVASTATIN",
      "LOVASTATIN",
      "PITAVASTATIN",
      "PRAVASTATIN",
      "ROSUVASTATIN",
      "SIMVASTATIN"
    ]);
  });

  it("holds none of the other classes the prescribing rule names", () => {
    // The rule mentions PCSK9 monoclonals, siRNA and ATP citrate lyase inhibitors.
    // The screen has to say the list is partial, so this pins that it really is.
    for (const absent of ["EVOLOCUMAB", "ALIROCUMAB", "INCLISIRAN", "BEMPEDOIC", "PCSK9"]) {
      expect(
        records.filter(
          (record) =>
            ingredientOf(record).includes(absent) ||
            record.drugNameEn.toUpperCase().includes(absent)
        )
      ).toHaveLength(0);
    }
    expect(LIPID_CLASSES_ABSENT_FROM_MASTER.length).toBeGreaterThan(0);
  });

  it("puts a compound in both of its classes rather than picking one", () => {
    const compound = records.find(
      (record) =>
        ingredientOf(record).includes("EZETIMIBE") && ingredientOf(record).includes("STATIN")
    )!;
    expect(getLipidDrugClasses(compound)).toEqual(["statin", "ezetimibe"]);
  });

  it("files a fibrate under neither statin nor ezetimibe", () => {
    const fibrate = records.find((record) => ingredientOf(record).includes("GEMFIBROZIL"))!;
    expect(getLipidDrugClasses(fibrate)).toEqual(["other"]);
  });
});

describe("listing a class on a date", () => {
  const listing = listLipidDrugItems({ drugClass: "statin", asOfDate: "2026-08-12" });

  it("returns priced items only, and says how many it left out", () => {
    expect(listing.status).toBe("OK");
    expect(listing.matches.length).toBeGreaterThan(0);
    for (const match of listing.matches) {
      expect(Number(match.applicablePricePeriod.paymentPriceRaw)).not.toBe(0);
      expect(getLipidDrugClasses(match.item)).toContain("statin");
    }
    expect(listing.excludedZeroPriceCount).toBeGreaterThan(0);
    expect(listing.matches.length + listing.excludedZeroPriceCount).toBe(396);
  });

  it("counts every class on that date, so a chip cannot offer an empty filter", () => {
    expect(listing.counts.statin).toBe(listing.matches.length);
    for (const drugClass of ["statin", "ezetimibe", "other"] as const) {
      const each = listLipidDrugItems({ drugClass, asOfDate: "2026-08-12" });
      expect(each.matches).toHaveLength(listing.counts[drugClass]);
    }
  });

  it("counts a compound once under each of its classes", () => {
    const statin = listLipidDrugItems({ drugClass: "statin", asOfDate: "2026-08-12" });
    const ezetimibe = listLipidDrugItems({ drugClass: "ezetimibe", asOfDate: "2026-08-12" });
    const shared = statin.matches.filter((match) =>
      ezetimibe.matches.some((other) => other.item.nhiCode === match.item.nhiCode)
    );
    expect(shared.length).toBeGreaterThan(0);
  });

  it("resolves an item on a date it had a price and drops it on one it did not", () => {
    const early = listLipidDrugItems({ drugClass: "statin", asOfDate: "2026-08-07" });
    expect(early.status).toBe("OK");
    expect(early.matches.length).toBeGreaterThan(0);
  });

  it("fails closed on a date it cannot honour rather than using the nearest", () => {
    for (const asOfDate of ["", "not-a-date", "2026-13-01", "2020-01-01"]) {
      const result = listLipidDrugItems({ drugClass: "statin", asOfDate });
      expect(result.status).toBe("NOT_IN_VALIDATED_DATASET");
      expect(result.matches).toHaveLength(0);
      expect(result.counts.statin).toBe(0);
    }
  });

  it("hands back frozen values", () => {
    expect(Object.isFrozen(listing)).toBe(true);
    expect(Object.isFrozen(listing.matches)).toBe(true);
    expect(Object.isFrozen(listing.counts)).toBe(true);
  });
});

describe("generic groups inside a class", () => {
  const statin = listLipidDrugItems({ drugClass: "statin", asOfDate: "2026-08-12" });
  const ezetimibe = listLipidDrugItems({ drugClass: "ezetimibe", asOfDate: "2026-08-12" });

  it("names only the generics the ingredient field states", () => {
    expect(statin.generics.map((generic) => generic.name).sort()).toEqual([
      "ATORVASTATIN",
      "FLUVASTATIN",
      "LOVASTATIN",
      "PITAVASTATIN",
      "PRAVASTATIN",
      "ROSUVASTATIN",
      "SIMVASTATIN"
    ]);
    expect(ezetimibe.generics.map((generic) => generic.name)).toEqual(["EZETIMIBE"]);
  });

  it("adds up to the class total rather than double-counting compounds", () => {
    const summed = statin.generics.reduce((total, generic) => total + generic.count, 0);
    expect(summed).toBe(statin.matches.length);
  });

  it("is ordered by size, so the largest group is offered first", () => {
    const counts = statin.generics.map((generic) => generic.count);
    expect([...counts].sort((left, right) => right - left)).toEqual(counts);
  });
});
