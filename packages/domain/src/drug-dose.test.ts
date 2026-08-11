import { describe, expect, it } from "vitest";
import {
  collectDrugDoseFacets,
  DRUG_DOSE_UNSPECIFIED_KEY,
  extractDosesFromText,
  getDrugItemDoses,
  matchesDrugDoseFilter
} from "./drug-dose";
import { DRUG_ITEM_MASTER_RECORDS, type DrugItemMasterRecord } from "./generated/drug-items-2026-08-07";

function record(nhiCode: string): DrugItemMasterRecord {
  const found = DRUG_ITEM_MASTER_RECORDS.find((item) => item.nhiCode === nhiCode);
  if (found === undefined) throw new Error(`master record ${nhiCode} is missing`);
  return found;
}

describe("dose extraction", () => {
  it("reads a strength from every record in the master", () => {
    // Measured: 607/607. The `規格` columns cannot supply this — they are empty on
    // 595 records — so both the ingredient field and the English name are read.
    const withoutDose = DRUG_ITEM_MASTER_RECORDS.filter(
      (item) => getDrugItemDoses(item).length === 0
    );
    expect(withoutDose).toEqual([]);
    expect(DRUG_ITEM_MASTER_RECORDS.length).toBe(607);
  });

  it("unions the label strength with the salt weight rather than picking one", () => {
    // Caduet's ingredient states the besylate and trihydrate salt weights; its name
    // states the label strengths. A clinician searches for either, so both resolve.
    expect(getDrugItemDoses(record("BC24391100")).map((dose) => dose.label)).toEqual([
      "5 mg",
      "6.94 mg",
      "10 mg",
      "10.85 mg"
    ]);
    // Lescol: only the name carries the 20 mg a clinician would type.
    expect(getDrugItemDoses(record("BC21198100")).map((dose) => dose.label)).toEqual([
      "20 mg",
      "21.06 mg"
    ]);
    // Agitin: only the ingredient carries ezetimibe's 10 mg; the name reads "10/20mg".
    expect(getDrugItemDoses(record("AC59251100")).map((dose) => dose.label)).toEqual([
      "10 mg",
      "20 mg"
    ]);
  });

  it("never rounds a salt weight into the label strength", () => {
    const doses = getDrugItemDoses(record("BC24391100"));
    expect(doses.map((dose) => dose.amount)).toContain(10.85);
    expect(doses.map((dose) => dose.amount)).toContain(10);
  });

  it("keeps a concentration's denominator so it is not read as a unit dose", () => {
    // 444.4 MG/GM is cholestyramine powder, not a 444.4 mg tablet.
    expect(getDrugItemDoses(record("A034796127")).map((dose) => dose.label)).toEqual([
      "444.4 mg/g"
    ]);
    expect(matchesDrugDoseFilter(record("A034796127"), "444.4mg")).toBe(false);
    expect(matchesDrugDoseFilter(record("A034796127"), "444.4mg/g")).toBe(true);
  });

  it("does not let one unit match another", () => {
    // QUESTRAN LITE is 4 GM. A 4 mg filter must not reach it.
    expect(getDrugItemDoses(record("B020742119")).map((dose) => dose.label)).toEqual(["4 g"]);
    expect(matchesDrugDoseFilter(record("B020742119"), "4mg")).toBe(false);
    expect(matchesDrugDoseFilter(record("B020742119"), "4g")).toBe(true);
  });

  it("normalizes the written amount without changing its value", () => {
    expect(extractDosesFromText("SIMVASTATIN 20.00 MG").map((dose) => dose.key)).toEqual(["20mg"]);
    expect(extractDosesFromText("tablets 20mg").map((dose) => dose.key)).toEqual(["20mg"]);
    expect(extractDosesFromText("Tablets 20 MG").map((dose) => dose.key)).toEqual(["20mg"]);
  });

  it("extracts nothing rather than guessing when no unit is stated", () => {
    expect(extractDosesFromText("Zysim 10 Tablets")).toEqual([]);
    expect(extractDosesFromText("HYCLORATE CAPSULES")).toEqual([]);
    expect(extractDosesFromText("")).toEqual([]);
  });

  it("returns frozen values", () => {
    const doses = getDrugItemDoses(record("BC24391100"));
    expect(Object.isFrozen(doses)).toBe(true);
    expect(Object.isFrozen(doses[0])).toBe(true);
  });
});

describe("dose facets", () => {
  it("offers only the strengths present in the records it was given", () => {
    const simvastatin = DRUG_ITEM_MASTER_RECORDS.filter((item) =>
      item.ingredient.toUpperCase().includes("SIMVASTATIN")
    );
    expect(collectDrugDoseFacets(simvastatin).map((facet) => `${facet.label}:${facet.count}`)).toEqual([
      "10 mg:14",
      "20 mg:42",
      "40 mg:23",
      "80 mg:5"
    ]);
  });

  it("sorts by amount within a unit", () => {
    const pravastatin = DRUG_ITEM_MASTER_RECORDS.filter((item) =>
      item.ingredient.toUpperCase().includes("PRAVASTATIN")
    );
    expect(collectDrugDoseFacets(pravastatin).map((facet) => facet.label)).toEqual([
      "5 mg",
      "10 mg",
      "20 mg",
      "40 mg",
      "160 mg"
    ]);
  });

  it("counts a compound under each of its strengths", () => {
    // Agitin is ezetimibe 10 mg + simvastatin 20 mg; it belongs to both groups.
    const facets = collectDrugDoseFacets([record("AC59251100")]);
    expect(facets.map((facet) => facet.key)).toEqual(["10mg", "20mg"]);
    expect(facets.every((facet) => facet.count === 1)).toBe(true);
  });

  it("is empty for an empty result set", () => {
    expect(collectDrugDoseFacets([])).toEqual([]);
  });

  it("returns frozen values", () => {
    const facets = collectDrugDoseFacets([record("AC59251100")]);
    expect(Object.isFrozen(facets)).toBe(true);
    expect(Object.isFrozen(facets[0])).toBe(true);
  });
});

describe("dose filter", () => {
  it("passes everything when no dose is selected", () => {
    for (const item of DRUG_ITEM_MASTER_RECORDS.slice(0, 50)) {
      expect(matchesDrugDoseFilter(item, undefined)).toBe(true);
    }
  });

  it("matches the key exactly and never approximately", () => {
    const atotin = record("AC57267100"); // ATORVASTATIN (CALCIUM) 10 MG
    expect(matchesDrugDoseFilter(atotin, "10mg")).toBe(true);
    expect(matchesDrugDoseFilter(atotin, "10")).toBe(false);
    expect(matchesDrugDoseFilter(atotin, "10 mg")).toBe(false);
    expect(matchesDrugDoseFilter(atotin, "10.85mg")).toBe(false);
    expect(matchesDrugDoseFilter(atotin, "1mg")).toBe(false);
    expect(matchesDrugDoseFilter(atotin, "100mg")).toBe(false);
  });

  it("selects nothing for a strength no record carries", () => {
    expect(
      DRUG_ITEM_MASTER_RECORDS.filter((item) => matchesDrugDoseFilter(item, "37mg"))
    ).toEqual([]);
  });

  it("has no unspecified group to fall into, and says so by measurement", () => {
    // Kept as a guard: if a later master snapshot holds a record whose strength cannot
    // be read, it must surface in this bucket rather than vanish from every filter.
    expect(
      DRUG_ITEM_MASTER_RECORDS.filter((item) =>
        matchesDrugDoseFilter(item, DRUG_DOSE_UNSPECIFIED_KEY)
      )
    ).toEqual([]);
    expect(
      collectDrugDoseFacets(DRUG_ITEM_MASTER_RECORDS).some(
        (facet) => facet.key === DRUG_DOSE_UNSPECIFIED_KEY
      )
    ).toBe(false);
  });
});
