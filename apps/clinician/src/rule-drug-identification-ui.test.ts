import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  DRUG_ITEMS_DATASET_VERSION,
  DRUG_ITEM_MASTER_WARNING,
  identifyRuleDrugMasterRecords,
  lookupRuleText
} from "@nhi-cv/domain";
import { describe, expect, it } from "vitest";
import { getClinicianLayoutMode } from "./drug-item-ui";

const sourceDirectory = path.dirname(fileURLToPath(import.meta.url));
const appSource = readFileSync(path.resolve(sourceDirectory, "../App.tsx"), "utf8");
const identificationCardStart = appSource.indexOf("function RuleDrugMasterIdentificationCard");
const blockStart = appSource.indexOf("function RuleDrugMasterIdentificationBlock");
const blockEnd = appSource.indexOf("function PrivacyNotice");
const identificationCardSource = appSource.slice(identificationCardStart, blockStart);
const blockSource = appSource.slice(blockStart, blockEnd);
const identificationSource = appSource.slice(identificationCardStart, blockEnd);

describe("rule-text drug-master identification UI", () => {
  it("connects the complete section result to all 116 ordered master identifications", () => {
    const result = lookupRuleText({ query: "2.6.1", as_of_date: "2026-09-01" });
    const identifications = identifyRuleDrugMasterRecords(
      result.units.map((unit) => unit.verbatimText)
    );

    expect(result.status).toBe("EXACT_MATCH");
    expect(identifications).toHaveLength(116);
    expect(identifications.every(({ masterItem }) => masterItem !== undefined)).toBe(true);
    expect(blockSource).toContain(
      "identifyRuleDrugMasterRecords(units.map((unit) => unit.verbatimText))"
    );
  });

  it("labels the count as separate master records for codes appearing in rule text", () => {
    expect(appSource).toContain("條文中出現之代碼在藥品主檔的記錄（{count} 筆）");
    expect(appSource).toContain(
      "Drug-master records for codes appearing in the rule text ({count} entries)"
    );
    expect(blockSource).toContain('t("ruleDrugMasterTitle", { count })');
  });

  it("defaults to collapsed and renders the list only behind an accessible bilingual control", () => {
    expect(blockSource).toContain("const [expanded, setExpanded] = useState(false)");
    expect(blockSource).toContain('accessibilityRole="button"');
    expect(blockSource).toContain("accessibilityState={{ expanded }}");
    expect(blockSource).toContain("{expanded ? (");
    expect(blockSource.indexOf("{expanded ? (")).toBeLessThan(
      blockSource.indexOf("identifications.map((identification)")
    );
    expect(appSource).toContain("展開主檔辨識記錄（{count} 筆，目前已收合）");
    expect(appSource).toContain("收合主檔辨識記錄（{count} 筆，目前已展開）");
    expect(appSource).toContain(
      "Expand drug-master identification records ({count} entries, currently collapsed)"
    );
    expect(appSource).toContain(
      "Collapse drug-master identification records ({count} entries, currently expanded)"
    );
  });

  it("keeps the rule and master dataset metadata and warnings in separate source blocks", () => {
    const resultStart = appSource.indexOf("function RuleLookupResult");
    const resultSource = appSource.slice(resultStart, blockStart);

    expect(DRUG_ITEMS_DATASET_VERSION).toBe("nhi-drug-items-2026-08-07-r2");
    expect(DRUG_ITEM_MASTER_WARNING.length).toBeGreaterThan(0);
    expect(resultSource).toContain(">{result.warning}</Text>");
    expect(blockSource).toContain("protectedText(language, DRUG_ITEMS_DATASET_VERSION)");
    expect(blockSource).toContain(">{DRUG_ITEM_MASTER_WARNING}</Text>");
    expect(appSource).toContain("藥品主檔資料集版本：{version}");
    expect(appSource).toContain("Drug master dataset version: {version}");
  });

  it("shows only the five requested master fields and a fixed no-record message", () => {
    for (const label of [
      "主檔中文品名：{value}",
      "主檔英文品名：{value}",
      "主檔成分：{value}",
      "主檔規格量與單位：{value}",
      "主檔劑型：{value}"
    ]) {
      expect(appSource).toContain(label);
    }
    expect(identificationCardSource).toContain("masterItem.drugNameZh");
    expect(identificationCardSource).toContain("masterItem.drugNameEn");
    expect(identificationCardSource).toContain("masterItem.ingredient");
    expect(identificationCardSource).toContain("masterItem.specificationAmount");
    expect(identificationCardSource).toContain("masterItem.specificationUnit");
    expect(identificationCardSource).toContain("masterItem.dosageForm");
    for (const excludedField of [
      "masterItem.vendor",
      "masterItem.manufacturer",
      "masterItem.atcCode",
      "masterItem.priceHistory",
      "masterItem.coverageRuleSection"
    ]) {
      expect(identificationCardSource).not.toContain(excludedField);
    }
    expect(appSource).toContain("主檔查無此代碼；未以條文文字填補。");
    expect(appSource).toContain(
      "No record was found for this code in the drug master; rule text was not used to fill it."
    );
  });

  it("leaves every verbatim unit outside the collapsed master block and byte-identical", () => {
    const result = lookupRuleText({ query: "2.6.1", as_of_date: "2026-09-01" });
    const before = result.units.map((unit) => unit.verbatimText);
    identifyRuleDrugMasterRecords(before);
    expect(result.units.map((unit) => unit.verbatimText)).toEqual(before);

    const cardStart = appSource.indexOf("function RuleUnitCard");
    const cardEnd = appSource.indexOf("function RuleLookupMode");
    const cardSource = appSource.slice(cardStart, cardEnd);
    const resultStart = appSource.indexOf("function RuleLookupResult");
    const resultSource = appSource.slice(resultStart, blockStart);
    expect(cardSource).toContain(">{unit.verbatimText}</Text>");
    expect(cardSource).toContain("accessibilityState={{ expanded }}");
    expect(cardSource.indexOf("{expanded ? (")).toBeLessThan(
      cardSource.indexOf(">{unit.verbatimText}</Text>")
    );
    expect(resultSource.indexOf("<RuleDrugMasterIdentificationBlock")).toBeLessThan(
      resultSource.indexOf("<RuleTextSectionNode")
    );
  });

  it("reuses the 768px layout decision and keeps authored copy clear of decision terms", () => {
    expect(getClinicianLayoutMode(767)).toBe("mobile");
    expect(getClinicianLayoutMode(768)).toBe("desktop");
    expect(appSource).toContain("<RuleLookupMode");
    expect(appSource).toContain("isDesktop={isDesktop}");
    expect(identificationCardSource).toContain("<MasterDetailCell isDesktop={isDesktop}>");
    expect(appSource).toContain('flexWrap: "wrap"');

    const authoredCopy = identificationSource.toLocaleLowerCase("en-US");
    for (const prohibited of [
      "\u7b26\u5408\u7d66\u4ed8",
      "\u4e0d\u7b26\u5408\u7d66\u4ed8",
      "\u53ef\u7533\u5831",
      "\u51c6\u4e88\u7d66\u4ed8",
      "\u4e0d\u4e88\u7d66\u4ed8",
      "eligible",
      "covered",
      "reimbursable",
      "qualifies"
    ]) {
      expect(authoredCopy).not.toContain(prohibited);
    }
  });

  it("does not render the identification block when the lookup has no verbatim units", () => {
    const result = lookupRuleText({ query: "unknown", as_of_date: "2026-09-01" });
    const resultStart = appSource.indexOf("function RuleLookupResult");
    const resultSource = appSource.slice(resultStart, blockStart);

    expect(result.status).toBe("NOT_IN_VALIDATED_DATASET");
    expect(result.units).toHaveLength(0);
    expect(resultSource.match(/<RuleDrugMasterIdentificationBlock/g)).toHaveLength(1);
    expect(resultSource).toMatch(
      /\{result\.units\.length > 0 \? \(\s*<RuleDrugMasterIdentificationBlock/
    );
  });

  it("renders a bilingual non-interactive notice when units exist but contain no codes", () => {
    const result = lookupRuleText({ query: "2.6.1-002", as_of_date: "2026-09-01" });
    const identifications = identifyRuleDrugMasterRecords(
      result.units.map((unit) => unit.verbatimText)
    );
    const emptyBranchStart = blockSource.indexOf("if (identifications.length === 0)");
    const populatedBranchStart = blockSource.indexOf("\n\n  return (", emptyBranchStart);
    const emptyBranchSource = blockSource.slice(emptyBranchStart, populatedBranchStart);

    expect(result.units.length).toBeGreaterThan(0);
    expect(identifications).toHaveLength(0);
    expect(appSource).toContain("本次結果之條文中未出現符合代碼格式之字串。");
    expect(appSource).toContain(
      "No strings matching the code format appear in the rule text for this result."
    );
    expect(emptyBranchSource).toContain('t("ruleDrugMasterNoCodes")');
    expect(emptyBranchSource).toContain('t("ruleDrugMasterTitle", { count })');
    expect(emptyBranchSource).toContain("protectedText(language, DRUG_ITEMS_DATASET_VERSION)");
    expect(emptyBranchSource).toContain(">{DRUG_ITEM_MASTER_WARNING}</Text>");
    expect(emptyBranchSource).not.toContain("<Pressable");
  });

  it("preserves the existing expandable behavior when at least one code is present", () => {
    const result = lookupRuleText({ query: "2.6.1-001", as_of_date: "2026-09-01" });
    const identifications = identifyRuleDrugMasterRecords(
      result.units.map((unit) => unit.verbatimText)
    );
    const emptyBranchStart = blockSource.indexOf("if (identifications.length === 0)");
    const populatedBranchStart = blockSource.indexOf("\n\n  return (", emptyBranchStart);
    const populatedBranchSource = blockSource.slice(populatedBranchStart);

    expect(result.units.length).toBeGreaterThan(0);
    expect(identifications).toHaveLength(116);
    expect(populatedBranchSource).toContain("<Pressable");
    expect(populatedBranchSource).toContain("accessibilityState={{ expanded }}");
    expect(populatedBranchSource).toContain("onPress={() => setExpanded((current) => !current)}");
    expect(populatedBranchSource).toContain("{expanded ? (");
    expect(populatedBranchSource).toContain("identifications.map((identification)");
  });
});
