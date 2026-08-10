import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { DRUG_ITEM_MASTER_RECORDS } from "./drug-item-lookup";
import { lookupRuleText } from "./rule-text-lookup";
import {
  extractNhiCodesFromVerbatimText,
  extractNhiCodesFromVerbatimTexts,
  identifyRuleDrugMasterRecords
} from "./rule-drug-identification";

const helperSource = readFileSync(
  path.resolve(path.dirname(fileURLToPath(import.meta.url)), "rule-drug-identification.ts"),
  "utf8"
);

function makeCode(parts: readonly string[]): string {
  const code = parts.join("");
  expect(code).toHaveLength(10);
  return code;
}

describe("rule-text NHI-code identification", () => {
  it("matches the exact invariant-1 surface and allows a numeric second character", () => {
    const numericSecond = makeCode(["A0", "B1", "C2", "D3", "E4"]);
    expect(extractNhiCodesFromVerbatimText(`前文\n${numericSecond}\n後文`)).toEqual([
      numericSecond
    ]);
    expect(helperSource).toContain("/^[A-Z0-9]{10}$/");
    expect(helperSource).not.toContain("[A-Z]{2}");
  });

  it("rejects 9- and 11-character, lowercase, and hyphenated near strings", () => {
    const exact = makeCode(["B7", "C6", "D5", "E4", "F3"]);
    const nearValues = [
      exact.slice(0, -1),
      `${exact}2`,
      exact.toLocaleLowerCase("en-US"),
      `${exact.slice(0, 5)}-${exact.slice(5)}`
    ];
    expect(extractNhiCodesFromVerbatimText(nearValues.join("\n"))).toEqual([]);
  });

  it("deduplicates while preserving first appearance across verbatim units", () => {
    const first = makeCode(["C1", "D2", "E3", "F4", "G5"]);
    const second = makeCode(["H6", "J7", "K8", "L9", "M0"]);
    expect(
      extractNhiCodesFromVerbatimTexts([
        `${first}\n${second}\n${first}`,
        `${second}\n${first}`
      ])
    ).toEqual([first, second]);
  });

  it("uses only codes to resolve master records and never returns nearby verbatim names", () => {
    const masterItem = DRUG_ITEM_MASTER_RECORDS[0]!;
    const verbatimNameBefore = "條文前段測試名稱";
    const verbatimNameAfter = "條文後段測試名稱";
    const identifications = identifyRuleDrugMasterRecords([
      `${verbatimNameBefore}\n${masterItem.nhiCode}\n${verbatimNameAfter}`
    ]);

    expect(identifications).toHaveLength(1);
    expect(Object.keys(identifications[0]!)).toEqual(["nhiCode", "masterItem"]);
    expect(identifications[0]).toEqual({ nhiCode: masterItem.nhiCode, masterItem });
    expect(JSON.stringify(identifications)).not.toContain(verbatimNameBefore);
    expect(JSON.stringify(identifications)).not.toContain(verbatimNameAfter);
    for (const forbiddenField of [
      "verbatimDrugName",
      "clauseDrugName",
      "drugNameFromRule",
      "drugNameZh",
      "drugNameEn",
      "ingredient"
    ]) {
      expect(helperSource).not.toContain(forbiddenField);
    }
  });

  it("retains an exact code when the drug master has no record and freezes the result", () => {
    const missingCode = makeCode(["Z9", "Y8", "X7", "W6", "V5"]);
    expect(DRUG_ITEM_MASTER_RECORDS.some((item) => item.nhiCode === missingCode)).toBe(false);

    const identifications = identifyRuleDrugMasterRecords([missingCode]);
    expect(identifications).toEqual([{ nhiCode: missingCode, masterItem: undefined }]);
    expect(Object.isFrozen(identifications)).toBe(true);
    expect(Object.isFrozen(identifications[0])).toBe(true);
  });

  it("finds the dispatched code counts in governed rule sections with every code preserved", () => {
    const expectedCounts = new Map([
      ["2.6.1", 116],
      ["2.6.2", 4],
      ["2.6.3", 10]
    ]);

    for (const [section, expectedCount] of expectedCounts) {
      const result = lookupRuleText({ query: section, as_of_date: "2026-09-01" });
      const identifications = identifyRuleDrugMasterRecords(
        result.units.map((unit) => unit.verbatimText)
      );
      expect(identifications).toHaveLength(expectedCount);
      expect(identifications.every(({ masterItem }) => masterItem !== undefined)).toBe(true);
    }
  });

  it("leaves every verbatim-text byte unchanged after identification", () => {
    const result = lookupRuleText({ query: "2.6.1", as_of_date: "2026-09-01" });
    const before = result.units.map((unit) => Buffer.from(unit.verbatimText, "utf8"));

    identifyRuleDrugMasterRecords(result.units.map((unit) => unit.verbatimText));

    result.units.forEach((unit, index) => {
      expect(Buffer.from(unit.verbatimText, "utf8")).toEqual(before[index]);
    });
  });
});
