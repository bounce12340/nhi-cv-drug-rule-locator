import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { DEMO_DATA_ONLY, lookupMedication } from "./index";
import {
  OFFICIAL_TEXT_TRANSCRIBED,
  RULE_TEXT_WARNING,
  lookupRuleText,
  type RuleTextLookupRequest,
  type RuleTextLookupResult
} from "./rule-text-lookup";

const ELIGIBILITY_BLACKLIST = [
  "\u7b26\u5408\u7d66\u4ed8",
  "\u4e0d\u7b26\u5408\u7d66\u4ed8",
  "\u53ef\u7533\u5831",
  "\u51c6\u4e88\u7d66\u4ed8",
  "\u4e0d\u4e88\u7d66\u4ed8"
] as const;

const VALID_REQUEST: RuleTextLookupRequest = {
  query: "2.6.1",
  as_of_date: "2026-09-01"
};
const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

function projectEngineAuthoredFields(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(projectEngineAuthoredFields);
  if (typeof value !== "object" || value === null) return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => key !== "verbatimText" && key !== "columnLabels")
      .map(([key, child]) => [key, projectEngineAuthoredFields(child)])
  );
}

function expectNoEligibilityVocabulary(value: unknown): void {
  const searchable = JSON.stringify(projectEngineAuthoredFields(value));
  for (const prohibited of ELIGIBILITY_BLACKLIST) expect(searchable).not.toContain(prohibited);
}

describe("display-only governed rule-text lookup", () => {
  it("returns every section unit in governed order after NFKC, trim, case and whitespace normalization", () => {
    const cases = [
      [" ２．６．１ ", "2.6.1", 43],
      [" 2. 6. 2 ", "2.6.2", 8],
      ["2.6.3", "2.6.3", 16]
    ] as const;
    for (const [query, section, count] of cases) {
      const result = lookupRuleText({ query, as_of_date: "2026-09-01" });
      expect(result.status).toBe("EXACT_MATCH");
      expect(result.units).toHaveLength(count);
      expect(result.units.every((unit) => unit.section === section)).toBe(true);
      expect(result.units.map((unit) => unit.unitId)).toEqual(
        [...result.units].map((unit) => unit.unitId).sort((left, right) => left.localeCompare(right, "en"))
      );
    }
  });

  it("returns exactly one unit for an exact normalized unit id", () => {
    const result = lookupRuleText({ query: " ２．６．１－００２ ", as_of_date: "2026-09-01" });
    expect(result.status).toBe("EXACT_MATCH");
    expect(result.units.map((unit) => unit.unitId)).toEqual(["2.6.1-002"]);
  });

  it("returns all table-label units as ambiguous without selecting a default", () => {
    const tableOne = lookupRuleText({ query: " 表 一 ", as_of_date: "2026-09-01" });
    const tableTwo = lookupRuleText({ query: "表二", as_of_date: "2026-09-01" });
    expect(tableOne.status).toBe("MULTIPLE_MATCHES");
    expect(tableOne.units).toHaveLength(7);
    expect(tableOne.units.every((unit) => unit.tableLabel === "表一")).toBe(true);
    expect(tableTwo.status).toBe("MULTIPLE_MATCHES");
    expect(tableTwo.units).toHaveLength(1);
    expect(tableTwo.units.every((unit) => unit.tableLabel === "表二")).toBe(true);
    expect(tableOne).not.toHaveProperty("selectedUnit");
    expect(tableTwo).not.toHaveProperty("selectedUnit");
  });

  it("rejects approximate sections, unit ids and labels without suggestions or correction", () => {
    for (const query of ["2.6.4", "2.61", "261", "2.6.1-044", "2.6.1-00I", "表壹", "表三"]) {
      const result = lookupRuleText({ query, as_of_date: "2026-09-01" });
      expect(result.status).toBe("NOT_IN_VALIDATED_DATASET");
      expect(result.units).toHaveLength(0);
      expect(result).not.toHaveProperty("suggestion");
      expect(result).not.toHaveProperty("suggestions");
    }
  });

  it("fails closed for invalid dates, pre-effective dates and mismatched dataset versions", () => {
    const invalidRequests: readonly RuleTextLookupRequest[] = [
      { ...VALID_REQUEST, as_of_date: "not-a-date" },
      { ...VALID_REQUEST, as_of_date: "2026-02-29" },
      { ...VALID_REQUEST, as_of_date: "2026-08-31" },
      { ...VALID_REQUEST, dataset_version: "nhi-lipid-rules-structured-2026-09-01-r2" }
    ];
    for (const request of invalidRequests) {
      const result = lookupRuleText(request);
      expect(result.status).toBe("NOT_IN_VALIDATED_DATASET");
      expect(result.units).toHaveLength(0);
    }
  });

  it("fails closed for missing required strings and gives no semantics to extra fields", () => {
    const missingDate = lookupRuleText({ query: "2.6.1" } as RuleTextLookupRequest);
    const invalidQuery = lookupRuleText({ query: 261, as_of_date: "2026-09-01" } as unknown as RuleTextLookupRequest);
    expect(missingDate.status).toBe("NOT_IN_VALIDATED_DATASET");
    expect(invalidQuery.status).toBe("NOT_IN_VALIDATED_DATASET");

    const withIgnoredExtra = lookupRuleText({
      ...VALID_REQUEST,
      asOfDate: "2026-08-31",
      datasetVersion: "wrong"
    } as RuleTextLookupRequest & { asOfDate: string; datasetVersion: string });
    expect(withIgnoredExtra.status).toBe("EXACT_MATCH");
  });

  it("requires manual review for every non-exact result and not for exact existence matches", () => {
    const results = [
      lookupRuleText({ query: "表一", as_of_date: "2026-09-01" }),
      lookupRuleText({ query: "2.6.4", as_of_date: "2026-09-01" }),
      lookupRuleText({ query: "2.6.1", as_of_date: "2026-08-31" }),
      lookupRuleText({ ...VALID_REQUEST, dataset_version: "wrong" })
    ];
    for (const result of results) {
      expect(result.status).not.toBe("EXACT_MATCH");
      expect(result.manualReviewRequired).toBe(true);
    }
    expect(lookupRuleText(VALID_REQUEST).manualReviewRequired).toBe(false);
  });

  it("returns only the approved source tag, warning and result shape", () => {
    const result = lookupRuleText(VALID_REQUEST);
    expect(Object.keys(result)).toEqual([
      "status",
      "sourceTag",
      "warning",
      "manualReviewRequired",
      "datasetVersion",
      "effectiveFrom",
      "units"
    ]);
    expect(result.sourceTag).toBe(OFFICIAL_TEXT_TRANSCRIBED);
    expect(result.warning).toBe(RULE_TEXT_WARNING);
    expect(result.warning).toBe(
      "官方公告之逐字轉錄(2026-09-01 生效),經保真驗證;本工具非健保署系統,查詢結果不可作為申報依據,實際規定以健保署公告為準。"
    );
    expect(result.datasetVersion).toBe("nhi-lipid-rules-structured-2026-09-01-r1");
    expect(result.effectiveFrom).toBe("2026-09-01");
  });

  it("keeps demo medication and official rule-text results isolated in both directions", () => {
    const demoResult = lookupMedication({ query: "D3M0A00001" });
    const ruleResult = lookupRuleText({ query: "2.6.1-002", as_of_date: "2026-09-01" });
    const demoOutput = JSON.stringify(demoResult);
    const ruleOutput = JSON.stringify(ruleResult);
    expect(demoOutput).not.toContain(OFFICIAL_TEXT_TRANSCRIBED);
    expect(demoOutput).not.toContain("verbatimText");
    expect(demoOutput).not.toContain("2.6.1-002");
    expect(ruleOutput).not.toContain(DEMO_DATA_ONLY);
    expect(ruleOutput).not.toContain("D3M0A00001");
    expect(ruleOutput).not.toContain("demoPaymentPriceNtd");
  });

  it("excludes verbatim official fields while blacklisting engine-authored vocabulary", () => {
    const exactResult = lookupRuleText({ query: "2.6.1-003", as_of_date: "2026-09-01" });
    const nonExactResults = [
      lookupRuleText({ query: "表一", as_of_date: "2026-09-01" }),
      lookupRuleText({ query: "unknown", as_of_date: "2026-09-01" })
    ];
    expectNoEligibilityVocabulary(exactResult);
    for (const result of nonExactResults) expectNoEligibilityVocabulary(result);

    const exemptionProbe: RuleTextLookupResult = {
      ...exactResult,
      units: [
        {
          ...exactResult.units[0]!,
          verbatimText: ELIGIBILITY_BLACKLIST[0],
          columnLabels: [ELIGIBILITY_BLACKLIST[1]]
        }
      ]
    };
    expectNoEligibilityVocabulary(exemptionProbe);

    const lookupSource = readFileSync(path.join(repositoryRoot, "packages/domain/src/rule-text-lookup.ts"), "utf8");
    const codegenSource = readFileSync(path.join(repositoryRoot, "scripts/rules-codegen.mjs"), "utf8");
    const generatedSource = readFileSync(
      path.join(repositoryRoot, "packages/domain/src/generated/rules-2026-09-01.ts"),
      "utf8"
    );
    const generatedScaffolding = `${generatedSource.split("const generatedRuleTextUnits")[0]}${
      generatedSource.split("\nfunction deepFreeze")[1] ?? ""
    }`;
    for (const source of [lookupSource, codegenSource, generatedScaffolding]) {
      for (const prohibited of ELIGIBILITY_BLACKLIST) expect(source).not.toContain(prohibited);
    }
  });

  it("spot-checks returned unit digests against verbatim text", () => {
    const result = lookupRuleText(VALID_REQUEST);
    for (const index of [0, Math.floor(result.units.length / 2), result.units.length - 1]) {
      const unit = result.units[index]!;
      expect(createHash("sha256").update(unit.verbatimText, "utf8").digest("hex")).toBe(unit.unitSha256);
    }
  });
});
