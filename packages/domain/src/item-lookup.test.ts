import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { ITEM_RECORDS } from "./generated/items-2026-09-01";
import {
  ITEM_SOURCE_TAG,
  ITEM_WARNING,
  lookupDrugItem,
  type DrugItemLookupRequest,
  type DrugItemLookupResult
} from "./item-lookup";

const ELIGIBILITY_BLACKLIST = [
  "\u7b26\u5408\u7d66\u4ed8",
  "\u4e0d\u7b26\u5408\u7d66\u4ed8",
  "\u53ef\u7533\u5831",
  "\u51c6\u4e88\u7d66\u4ed8",
  "\u4e0d\u4e88\u7d66\u4ed8"
] as const;

const VALID_DATE = "2026-09-01";
const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

function toFullWidthAscii(value: string): string {
  return [...value]
    .map((character) => {
      const codePoint = character.codePointAt(0)!;
      return codePoint >= 0x21 && codePoint <= 0x7e
        ? String.fromCodePoint(codePoint + 0xfee0)
        : character;
    })
    .join("");
}

function differentLastCharacter(value: string): string {
  const last = value.at(-1);
  return `${value.slice(0, -1)}${last === "0" ? "1" : "0"}`;
}

function projectEngineAuthoredFields(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(projectEngineAuthoredFields);
  if (typeof value !== "object" || value === null) return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => key !== "items")
      .map(([key, child]) => [key, projectEngineAuthoredFields(child)])
  );
}

function expectNoEligibilityVocabulary(value: unknown): void {
  const searchable = JSON.stringify(projectEngineAuthoredFields(value));
  for (const prohibited of ELIGIBILITY_BLACKLIST) expect(searchable).not.toContain(prohibited);
}

describe("display-only governed drug-item lookup", () => {
  it("normalizes an NHI code with NFKC, trim, uppercase, spaces and hyphens before exact match", () => {
    const item = ITEM_RECORDS[0]!;
    const fullWidthCode = toFullWidthAscii(item.nhiCode.toLowerCase());
    const query = `  ${fullWidthCode.slice(0, 2)}－ ${fullWidthCode.slice(2)}  `;
    const result = lookupDrugItem({ query, as_of_date: VALID_DATE });
    expect(result.status).toBe("EXACT_MATCH");
    expect(result.items).toEqual([item]);
  });

  it("does not correct or suggest a code that differs by one character", () => {
    const item = ITEM_RECORDS[0]!;
    const result = lookupDrugItem({
      query: differentLastCharacter(item.nhiCode),
      as_of_date: VALID_DATE
    });
    expect(result.status).toBe("NOT_IN_VALIDATED_DATASET");
    expect(result.items).toEqual([]);
    expect(result).not.toHaveProperty("suggestion");
    expect(result).not.toHaveProperty("suggestions");
  });

  it("normalizes only character form, case, and repeated whitespace for an English name", () => {
    const item = ITEM_RECORDS[0]!;
    const query = `  ${toFullWidthAscii(item.drugNameEn.toUpperCase()).replace(/　/g, "　　　")}  `;
    const result = lookupDrugItem({ query, as_of_date: VALID_DATE });
    expect(result.status).toBe("EXACT_MATCH");
    expect(result.items).toEqual([item]);
  });

  it("retains strength and dosage-form text and never selects from a partial-name ambiguity", () => {
    const first = lookupDrugItem({ query: "Zoliton tablets 10/20mg", as_of_date: VALID_DATE });
    const second = lookupDrugItem({ query: "Zoliton tablets 10/10mg", as_of_date: VALID_DATE });
    const ambiguous = lookupDrugItem({ query: "Zoliton tablets", as_of_date: VALID_DATE });
    expect(first.status).toBe("EXACT_MATCH");
    expect(second.status).toBe("EXACT_MATCH");
    expect(first.items).toHaveLength(1);
    expect(second.items).toHaveLength(1);
    expect(first.items[0]?.nhiCode).not.toBe(second.items[0]?.nhiCode);
    expect(ambiguous.status).toBe("MULTIPLE_MATCHES");
    expect(ambiguous.items).toHaveLength(2);
    expect(ambiguous).not.toHaveProperty("selectedItem");
  });

  it("returns every matching ingredient candidate without auto-selecting", () => {
    const ingredientCounts = new Map<string, number>();
    for (const item of ITEM_RECORDS) {
      if (item.ingredient !== undefined) {
        ingredientCounts.set(item.ingredient, (ingredientCounts.get(item.ingredient) ?? 0) + 1);
      }
    }
    const repeatedIngredient = [...ingredientCounts].find(([, count]) => count > 1)?.[0];
    expect(repeatedIngredient).toBeDefined();
    const result = lookupDrugItem({ query: repeatedIngredient!, as_of_date: VALID_DATE });
    expect(result.status).toBe("MULTIPLE_MATCHES");
    expect(result.items.length).toBeGreaterThan(1);
    expect(result).not.toHaveProperty("selectedItem");
  });

  it("fails closed for invalid or pre-effective dates and mismatched versions", () => {
    const query = ITEM_RECORDS[0]!.nhiCode;
    const invalidRequests: readonly DrugItemLookupRequest[] = [
      { query, as_of_date: "not-a-date" },
      { query, as_of_date: "2026-02-29" },
      { query, as_of_date: "2026-08-31" },
      { query, as_of_date: VALID_DATE, dataset_version: "nhi-lipid-2026-09-01-r2" }
    ];
    for (const request of invalidRequests) {
      const result = lookupDrugItem(request);
      expect(result.status).toBe("NOT_IN_VALIDATED_DATASET");
      expect(result.items).toEqual([]);
      expect(result.manualReviewRequired).toBe(true);
    }
  });

  it("fails closed for missing required strings and gives no semantics to extra fields", () => {
    const query = ITEM_RECORDS[0]!.nhiCode;
    const missingDate = lookupDrugItem({ query } as DrugItemLookupRequest);
    const invalidQuery = lookupDrugItem({ query: 123, as_of_date: VALID_DATE } as unknown as DrugItemLookupRequest);
    expect(missingDate.status).toBe("NOT_IN_VALIDATED_DATASET");
    expect(invalidQuery.status).toBe("NOT_IN_VALIDATED_DATASET");

    const withIgnoredExtra = lookupDrugItem({
      query,
      as_of_date: VALID_DATE,
      asOfDate: "2026-08-31",
      datasetVersion: "wrong"
    } as DrugItemLookupRequest & { asOfDate: string; datasetVersion: string });
    expect(withIgnoredExtra.status).toBe("EXACT_MATCH");
  });

  it("requires manual review for every non-exact result and not for exact existence", () => {
    const exact = lookupDrugItem({ query: ITEM_RECORDS[0]!.nhiCode, as_of_date: VALID_DATE });
    const results = [
      lookupDrugItem({ query: "Zoliton tablets", as_of_date: VALID_DATE }),
      lookupDrugItem({ query: "not in this dataset", as_of_date: VALID_DATE }),
      lookupDrugItem({ query: ITEM_RECORDS[0]!.nhiCode, as_of_date: "2026-08-31" })
    ];
    expect(exact.status).toBe("EXACT_MATCH");
    expect(exact.manualReviewRequired).toBe(false);
    for (const result of results) {
      expect(result.status).not.toBe("EXACT_MATCH");
      expect(result.manualReviewRequired).toBe(true);
    }
  });

  it("returns only the approved source tag, exact warning, and display-only shape", () => {
    const result = lookupDrugItem({ query: ITEM_RECORDS[0]!.nhiCode, as_of_date: VALID_DATE });
    expect(Object.keys(result)).toEqual([
      "status",
      "sourceTag",
      "warning",
      "manualReviewRequired",
      "datasetVersion",
      "effectiveFrom",
      "items"
    ]);
    expect(result.sourceTag).toBe(ITEM_SOURCE_TAG);
    expect(result.sourceTag).toBe("OFFICIAL_TEXT_TRANSCRIBED");
    expect(result.warning).toBe(ITEM_WARNING);
    expect(result.warning).toBe(
      "官方公告之逐字轉錄(2026-09-01 生效),經保真驗證;價格欄為該公告「藥品已收載品目異動明細表」所載原支付價與初核價格,僅涵蓋本次異動品項,非完整支付價主檔;本工具非健保署系統,查詢結果不可作為申報依據,實際規定與價格以健保署公告為準。"
    );
    expect(result.datasetVersion).toBe("nhi-lipid-2026-09-01-r1");
    expect(result.effectiveFrom).toBe(VALID_DATE);
  });

  it("keeps absent prices undefined instead of supplying zero or another value", () => {
    const itemWithoutPrice = ITEM_RECORDS.find((item) => item.priceBefore === undefined)!;
    const result = lookupDrugItem({ query: itemWithoutPrice.nhiCode, as_of_date: VALID_DATE });
    expect(result.status).toBe("EXACT_MATCH");
    expect(result.items[0]?.priceBefore).toBeUndefined();
    expect(result.items[0]?.priceAfter).toBeUndefined();
    expect(result.items[0]?.priceBefore).not.toBe(0);
    expect(result.items[0]?.priceAfter).not.toBe(0);
  });

  it("blacklists eligibility vocabulary from engine-authored output and source", () => {
    const exactResult = lookupDrugItem({ query: ITEM_RECORDS[0]!.nhiCode, as_of_date: VALID_DATE });
    const nonExactResults = [
      lookupDrugItem({ query: "Zoliton tablets", as_of_date: VALID_DATE }),
      lookupDrugItem({ query: "unknown", as_of_date: VALID_DATE })
    ];
    expectNoEligibilityVocabulary(exactResult);
    for (const result of nonExactResults) expectNoEligibilityVocabulary(result);

    const exemptionProbe: DrugItemLookupResult = {
      ...exactResult,
      items: [{ ...exactResult.items[0]!, drugNameEn: ELIGIBILITY_BLACKLIST[0] }]
    };
    expectNoEligibilityVocabulary(exemptionProbe);

    const lookupSource = readFileSync(path.join(repositoryRoot, "packages/domain/src/item-lookup.ts"), "utf8");
    const codegenSource = readFileSync(path.join(repositoryRoot, "scripts/items-codegen.mjs"), "utf8");
    const generatedSource = readFileSync(
      path.join(repositoryRoot, "packages/domain/src/generated/items-2026-09-01.ts"),
      "utf8"
    );
    const generatedScaffolding = `${generatedSource.split("const generatedItemRecords")[0]}${
      generatedSource.split("\nfunction deepFreeze")[1] ?? ""
    }`;
    for (const source of [lookupSource, codegenSource, generatedScaffolding]) {
      for (const prohibited of ELIGIBILITY_BLACKLIST) expect(source).not.toContain(prohibited);
    }
  });
});

