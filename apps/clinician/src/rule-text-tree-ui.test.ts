import { lookupRuleText } from "@nhi-cv/domain";
import { describe, expect, it } from "vitest";
import { getRuleUnitStructuralMetadata, groupRuleTextUnitsBySection } from "./rule-text-tree";

describe("rule-text two-level disclosure tree", () => {
  it("groups all governed units by section without changing their order", () => {
    const allUnits = ["2.6.1", "2.6.2", "2.6.3"].flatMap(
      (section) => lookupRuleText({ query: section, as_of_date: "2026-09-01" }).units
    );
    const groups = groupRuleTextUnitsBySection(allUnits);

    expect(groups.map(({ section }) => section)).toEqual(["2.6.1", "2.6.2", "2.6.3"]);
    expect(groups.map(({ units }) => units.length)).toEqual([43, 8, 16]);
    expect(groups.flatMap(({ units }) => units.map(({ unitId }) => unitId))).toEqual(
      allUnits.map(({ unitId }) => unitId)
    );

    const singleUnit = lookupRuleText({ query: "2.6.1-043", as_of_date: "2026-09-01" });
    expect(groupRuleTextUnitsBySection(singleUnit.units)).toHaveLength(1);
    expect(groupRuleTextUnitsBySection(singleUnit.units)[0]?.section).toBe("2.6.1");
  });

  it("exposes each unit's structural metadata without reading its text", () => {
    const unit = lookupRuleText({ query: "2.6.1-001", as_of_date: "2026-09-01" }).units[0]!;
    const metadata = getRuleUnitStructuralMetadata(unit);
    expect(metadata.unitId).toBe("2.6.1-001");
    expect(metadata.unitType).toBe("條文");
    expect(Object.values(metadata).join("")).not.toContain("AC46402100");
  });
});
