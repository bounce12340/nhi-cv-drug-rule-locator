import type { RuleTextUnit } from "@nhi-cv/domain";

export interface RuleTextSectionGroup {
  readonly section: string;
  readonly units: readonly RuleTextUnit[];
}

export interface RuleUnitStructuralMetadata {
  readonly unitId: string;
  readonly unitType: string;
  readonly tableLabel: string;
  readonly clausePath: readonly string[];
}

export function groupRuleTextUnitsBySection(
  units: readonly RuleTextUnit[]
): readonly RuleTextSectionGroup[] {
  const unitsBySection = new Map<string, RuleTextUnit[]>();

  for (const unit of units) {
    const sectionUnits = unitsBySection.get(unit.section);
    if (sectionUnits === undefined) {
      unitsBySection.set(unit.section, [unit]);
    } else {
      sectionUnits.push(unit);
    }
  }

  return Object.freeze(
    Array.from(unitsBySection, ([section, sectionUnits]) =>
      Object.freeze({ section, units: Object.freeze(sectionUnits) })
    )
  );
}

export function getRuleUnitStructuralMetadata(
  unit: RuleTextUnit
): RuleUnitStructuralMetadata {
  return Object.freeze({
    unitId: unit.unitId,
    unitType: unit.unitType,
    tableLabel: unit.tableLabel,
    clausePath: Object.freeze([...unit.clausePath])
  });
}
