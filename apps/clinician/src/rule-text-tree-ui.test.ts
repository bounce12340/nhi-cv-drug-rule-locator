import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { RULE_TEXT_WARNING, lookupRuleText } from "@nhi-cv/domain";
import { describe, expect, it } from "vitest";
import {
  getRuleUnitStructuralMetadata,
  groupRuleTextUnitsBySection
} from "./rule-text-tree";
import { THEME_TOKENS, contrastRatio } from "./ui-preferences";

const sourceDirectory = path.dirname(fileURLToPath(import.meta.url));
const appSource = readFileSync(path.resolve(sourceDirectory, "../App.tsx"), "utf8");
const cardStart = appSource.indexOf("function RuleUnitCard");
const sectionStart = appSource.indexOf("function RuleTextSectionNode");
const modeStart = appSource.indexOf("function RuleLookupMode");
const resultStart = appSource.indexOf("function RuleLookupResult");
const masterCardStart = appSource.indexOf("function RuleDrugMasterIdentificationCard");
const cardSource = appSource.slice(cardStart, sectionStart);
const sectionSource = appSource.slice(sectionStart, modeStart);
const resultSource = appSource.slice(resultStart, masterCardStart);

describe("rule-text two-level disclosure tree", () => {
  it("keeps rule provenance and review visible before both result disclosures", () => {
    const result = lookupRuleText({ query: "2.6.1", as_of_date: "2026-09-01" });
    const masterIndex = resultSource.indexOf("<RuleDrugMasterIdentificationBlock");
    const treeIndex = resultSource.indexOf("<View style={styles.ruleTextTree}>");

    expect(result.warning).toBe(RULE_TEXT_WARNING);
    expect(result.sourceTag).toBe("OFFICIAL_TEXT_TRANSCRIBED");
    expect(masterIndex).toBeGreaterThan(0);
    expect(masterIndex).toBeLessThan(treeIndex);
    for (const persistentSource of [
      ">{result.warning}</Text>",
      "result.datasetVersion",
      "result.sourceTag",
      't("manualReviewRule")'
    ]) {
      const persistentIndex = resultSource.indexOf(persistentSource);
      expect(persistentIndex).toBeGreaterThan(0);
      expect(persistentIndex).toBeLessThan(masterIndex);
    }
  });

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

  it("defaults both levels to collapsed and exposes independent accessible toggles", () => {
    expect(sectionSource).toContain("const [expanded, setExpanded] = useState(false)");
    expect(sectionSource).toContain("useState<ReadonlySet<string>>");
    expect(sectionSource).toContain("() => new Set()");
    expect(sectionSource).toContain("accessibilityState={{ expanded }}");
    expect(sectionSource).toContain("onPress={() => setExpanded((current) => !current)}");
    expect(sectionSource).toContain("expanded={expandedUnitIds.has(unit.unitId)}");
    expect(sectionSource).toContain("onToggle={() => toggleUnit(unit.unitId)}");
    expect(cardSource).toContain("accessibilityState={{ expanded }}");
    expect(cardSource).toContain("onPress={onToggle}");
  });

  it("provides bilingual expand-all and collapse-all controls at the section level", () => {
    expect(sectionSource).toContain("onPress={expandAllUnits}");
    expect(sectionSource).toContain("setExpanded(true)");
    expect(sectionSource).toContain("new Set(units.map((unit) => unit.unitId))");
    expect(sectionSource).toContain("onPress={collapseAllUnits}");
    expect(sectionSource).toContain("setExpandedUnitIds(new Set())");
    expect(appSource).toContain("展開章節 {section} 的全部 {count} 個單元");
    expect(appSource).toContain("收合章節 {section} 的全部 {count} 個單元");
    expect(appSource).toContain("Expand all {count} units in section {section}");
    expect(appSource).toContain("Collapse all {count} units in section {section}");
  });

  it("renders only structural metadata in a collapsed unit heading", () => {
    const unit = lookupRuleText({ query: "2.6.1-003", as_of_date: "2026-09-01" }).units[0];
    if (unit === undefined) throw new Error("Expected governed unit 2.6.1-003");
    const metadata = getRuleUnitStructuralMetadata(unit);
    const collapsedPath = cardSource.slice(0, cardSource.indexOf("{expanded ? ("));

    expect(Object.keys(metadata).sort()).toEqual([
      "clausePath",
      "tableLabel",
      "unitId",
      "unitType"
    ]);
    expect(metadata).toEqual({
      unitId: unit.unitId,
      unitType: unit.unitType,
      tableLabel: unit.tableLabel,
      clausePath: unit.clausePath
    });
    expect(collapsedPath).not.toContain("verbatimText");
    expect(collapsedPath).toContain("metadata.unitId");
    expect(collapsedPath).toContain("metadata.unitType");
    expect(collapsedPath).toContain("metadata.tableLabel");
    expect(collapsedPath).toContain("metadata.clausePath");
  });

  it("places the complete byte-identical verbatim value only in the expanded branch", () => {
    const units = lookupRuleText({ query: "2.6.1", as_of_date: "2026-09-01" }).units;
    const before = units.map(({ verbatimText }) => verbatimText);
    const regrouped = groupRuleTextUnitsBySection(units);
    const expandedBranchIndex = cardSource.indexOf("{expanded ? (");
    const verbatimIndex = cardSource.indexOf(">{unit.verbatimText}</Text>");

    expect(regrouped.flatMap((group) => group.units.map(({ verbatimText }) => verbatimText))).toEqual(
      before
    );
    expect(expandedBranchIndex).toBeGreaterThan(0);
    expect(verbatimIndex).toBeGreaterThan(expandedBranchIndex);
    expect(cardSource.match(/unit\.verbatimText/g)).toHaveLength(1);
    expect(cardSource).not.toContain("slice(");
    expect(cardSource).not.toContain("substring(");
    expect(cardSource).not.toContain("…");
  });

  it("uses bilingual accessible labels and 44px minimum touch targets for every new control", () => {
    expect(appSource).toContain("展開章節 {section}（目前已收合）");
    expect(appSource).toContain("Expand section {section} (currently collapsed)");
    expect(appSource).toContain("展開單元 {unitId}（目前已收合）");
    expect(appSource).toContain("Expand unit {unitId} (currently collapsed)");
    expect(sectionSource.match(/accessibilityRole="button"/g)).toHaveLength(3);
    expect(cardSource).toContain('accessibilityRole="button"');
    for (const styleName of [
      "ruleSectionToggle",
      "ruleSectionBulkButton",
      "ruleUnitToggle"
    ]) {
      const styleStart = appSource.indexOf(`${styleName}: {`, modeStart);
      const styleEnd = appSource.indexOf("},", styleStart);
      expect(appSource.slice(styleStart, styleEnd)).toContain("minHeight: 44");
    }
    for (const theme of Object.values(THEME_TOKENS)) {
      expect(contrastRatio(theme.color.textStrong, theme.color.surface)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(theme.color.textMuted, theme.color.surface)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(theme.color.linkText, theme.color.surface)).toBeGreaterThanOrEqual(4.5);
    }
  });
});
