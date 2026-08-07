import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  DRUG_ITEMS_DATASET_VERSION,
  DRUG_ITEM_MASTER_RECORDS,
  DRUG_ITEM_MASTER_SOURCE_TAG,
  DRUG_ITEM_MASTER_WARNING,
  lookupDrugItemMaster,
  selectDrugItemMasterPricePeriod,
  type DrugItemMasterLookupRequest,
  type DrugItemMasterLookupResult,
  type DrugItemMasterPricePeriod
} from "./drug-item-lookup";

const VALID_DATE = "2026-08-07";
const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const ELIGIBILITY_BLACKLIST = [
  "\u7b26\u5408\u7d66\u4ed8",
  "\u4e0d\u7b26\u5408\u7d66\u4ed8",
  "\u53ef\u7533\u5831",
  "\u51c6\u4e88\u7d66\u4ed8",
  "\u4e0d\u4e88\u7d66\u4ed8"
] as const;

function toFullWidthAscii(value: string): string {
  return [...value]
    .map((character) => {
      const point = character.codePointAt(0)!;
      return point >= 0x21 && point <= 0x7e ? String.fromCodePoint(point + 0xfee0) : character;
    })
    .join("");
}

function findUnusedNearCode(code: string): string {
  const knownCodes = new Set(DRUG_ITEM_MASTER_RECORDS.map((item) => item.nhiCode));
  for (const replacement of "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ") {
    const candidate = `${code.slice(0, -1)}${replacement}`;
    if (candidate !== code && !knownCodes.has(candidate)) return candidate;
  }
  throw new Error("test setup could not construct an unused near code");
}

function previousDay(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

function period(startDateIso: string, endDateIso: string): DrugItemMasterPricePeriod {
  return {
    paymentPriceRaw: "1.00",
    effectiveStartRaw: "synthetic-start",
    effectiveEndRaw: "synthetic-end",
    startDateIso,
    endDateIso
  };
}

function normalizeName(value: string): string {
  return value.normalize("NFKC").trim().toLocaleLowerCase("en-US").replace(/\s+/g, " ");
}

function engineAuthoredProjection(result: DrugItemMasterLookupResult): unknown {
  const { matches: _officialRecords, ...engineFields } = result;
  return engineFields;
}

describe("display-only governed drug-item master lookup", () => {
  it("normalizes code by NFKC, trim, uppercase, spaces, and hyphens before exact match", () => {
    const item = DRUG_ITEM_MASTER_RECORDS[0]!;
    const fullWidth = toFullWidthAscii(item.nhiCode.toLowerCase());
    const result = lookupDrugItemMaster({
      query: `  ${fullWidth.slice(0, 3)}－ ${fullWidth.slice(3)}  `,
      as_of_date: VALID_DATE
    });
    expect(result.status).toBe("EXACT_MATCH");
    expect(result.matches[0]?.item).toBe(item);
  });

  it("does not correct or suggest a code that differs by one character", () => {
    const result = lookupDrugItemMaster({
      query: findUnusedNearCode(DRUG_ITEM_MASTER_RECORDS[0]!.nhiCode),
      as_of_date: VALID_DATE
    });
    expect(result.status).toBe("NOT_IN_VALIDATED_DATASET");
    expect(result.matches).toEqual([]);
    expect(result).not.toHaveProperty("suggestion");
    expect(result).not.toHaveProperty("suggestions");
  });

  it("searches Chinese name, English name, and ingredient with only approved normalization", () => {
    const uniqueChineseItem = DRUG_ITEM_MASTER_RECORDS.find(
      (candidate) =>
        lookupDrugItemMaster({ query: candidate.drugNameZh, as_of_date: VALID_DATE }).status ===
        "EXACT_MATCH"
    )!;
    const chinese = lookupDrugItemMaster({
      query: `  ${uniqueChineseItem.drugNameZh.normalize("NFD")}  `,
      as_of_date: VALID_DATE
    });
    expect(chinese.status).toBe("EXACT_MATCH");
    expect(chinese.matches[0]?.item.nhiCode).toBe(uniqueChineseItem.nhiCode);

    const english = lookupDrugItemMaster({
      query: toFullWidthAscii(uniqueChineseItem.drugNameEn.toUpperCase()),
      as_of_date: VALID_DATE
    });
    expect(english.matches.some((match) => match.item.nhiCode === uniqueChineseItem.nhiCode)).toBe(
      true
    );

    const ingredient = lookupDrugItemMaster({
      query: uniqueChineseItem.ingredient.toLowerCase().replace(/\s/g, "   "),
      as_of_date: VALID_DATE
    });
    expect(ingredient.matches.some((match) => match.item.nhiCode === uniqueChineseItem.nhiCode)).toBe(
      true
    );
  });

  it("retains strength text and returns every ambiguous match without selection or preference", () => {
    const pair = DRUG_ITEM_MASTER_RECORDS.flatMap((first, firstIndex) =>
      DRUG_ITEM_MASTER_RECORDS.slice(firstIndex + 1)
        .filter((second) => {
          const firstSkeleton = normalizeName(first.drugNameZh).replace(/\d+(?:\.\d+)?/g, "#");
          const secondSkeleton = normalizeName(second.drugNameZh).replace(/\d+(?:\.\d+)?/g, "#");
          return firstSkeleton === secondSkeleton && first.drugNameZh !== second.drugNameZh;
        })
        .map((second) => [first, second] as const)
    )[0]!;
    const firstResult = lookupDrugItemMaster({ query: pair[0].drugNameZh, as_of_date: VALID_DATE });
    const secondResult = lookupDrugItemMaster({ query: pair[1].drugNameZh, as_of_date: VALID_DATE });
    expect(firstResult.matches.some((match) => match.item.nhiCode === pair[0].nhiCode)).toBe(true);
    expect(firstResult.matches.some((match) => match.item.nhiCode === pair[1].nhiCode)).toBe(false);
    expect(secondResult.matches.some((match) => match.item.nhiCode === pair[1].nhiCode)).toBe(true);
    expect(secondResult.matches.some((match) => match.item.nhiCode === pair[0].nhiCode)).toBe(false);

    const repeatedIngredient = DRUG_ITEM_MASTER_RECORDS.find(
      (candidate) =>
        DRUG_ITEM_MASTER_RECORDS.filter(
          (item) => normalizeName(item.ingredient) === normalizeName(candidate.ingredient)
        ).length > 1
    )!;
    const ambiguous = lookupDrugItemMaster({
      query: repeatedIngredient.ingredient,
      as_of_date: VALID_DATE
    });
    const expectedCodes = DRUG_ITEM_MASTER_RECORDS.filter((item) =>
      normalizeName(item.ingredient).includes(normalizeName(repeatedIngredient.ingredient))
    ).map((item) => item.nhiCode);
    expect(ambiguous.status).toBe("MULTIPLE_MATCHES");
    expect(ambiguous.matches.map((match) => match.item.nhiCode)).toEqual(expectedCodes);
    expect(ambiguous).not.toHaveProperty("selectedItem");
  });

  it("selects only the period whose inclusive interval contains the as-of date", () => {
    const item = DRUG_ITEM_MASTER_RECORDS.find((candidate) => candidate.priceHistory.length > 1)!;
    const target = item.priceHistory[0]!;
    for (const asOfDate of [target.startDateIso, target.endDateIso]) {
      const result = lookupDrugItemMaster({ query: item.nhiCode, as_of_date: asOfDate });
      expect(result.status).toBe("EXACT_MATCH");
      expect(result.matches[0]?.applicablePricePeriod).toBe(target);
      expect(result.matches[0]?.item.priceHistory).toBe(item.priceHistory);
    }
  });

  it("fails closed before the first real period and never falls back to the nearest period", () => {
    const item = DRUG_ITEM_MASTER_RECORDS[0]!;
    const result = lookupDrugItemMaster({
      query: item.nhiCode,
      as_of_date: previousDay(item.priceHistory[0]!.startDateIso)
    });
    expect(result.status).toBe("NOT_IN_VALIDATED_DATASET");
    expect(result.matches).toEqual([]);
    expect(result.manualReviewRequired).toBe(true);
  });

  it("fails closed after a latest finite period and inside a period gap", () => {
    const finiteHistory = [period("2024-01-01", "2024-03-31")];
    expect(selectDrugItemMasterPricePeriod(finiteHistory, "2024-04-01")).toBeUndefined();

    const gappedHistory = [
      period("2024-01-01", "2024-03-31"),
      period("2024-05-01", "2024-12-31")
    ];
    expect(selectDrugItemMasterPricePeriod(gappedHistory, "2024-04-15")).toBeUndefined();
    expect(selectDrugItemMasterPricePeriod(gappedHistory, "2024-05-01")).toBe(gappedHistory[1]);
  });

  it("fails closed for invalid dates, missing required strings, and mismatched versions", () => {
    const query = DRUG_ITEM_MASTER_RECORDS[0]!.nhiCode;
    const requests: readonly DrugItemMasterLookupRequest[] = [
      { query, as_of_date: "not-a-date" },
      { query, as_of_date: "2026-02-29" },
      { query, as_of_date: "10000-01-01" },
      { query, as_of_date: VALID_DATE, dataset_version: "nhi-drug-items-2026-08-06-r2" },
      { query: 123, as_of_date: VALID_DATE } as unknown as DrugItemMasterLookupRequest,
      { query } as DrugItemMasterLookupRequest
    ];
    for (const request of requests) {
      const result = lookupDrugItemMaster(request);
      expect(result.status).toBe("NOT_IN_VALIDATED_DATASET");
      expect(result.matches).toEqual([]);
      expect(result.manualReviewRequired).toBe(true);
    }
  });

  it("locks the display-only source tag, exact warning, complete history, and review semantics", () => {
    const exact = lookupDrugItemMaster({
      query: DRUG_ITEM_MASTER_RECORDS[0]!.nhiCode,
      as_of_date: VALID_DATE,
      dataset_version: DRUG_ITEMS_DATASET_VERSION
    });
    expect(Object.keys(exact)).toEqual([
      "status",
      "sourceTag",
      "warning",
      "manualReviewRequired",
      "datasetVersion",
      "effectiveFrom",
      "effectiveTo",
      "asOfDate",
      "matches"
    ]);
    expect(exact.status).toBe("EXACT_MATCH");
    expect(exact.manualReviewRequired).toBe(false);
    expect(exact.sourceTag).toBe(DRUG_ITEM_MASTER_SOURCE_TAG);
    expect(exact.sourceTag).toBe("OFFICIAL_TEXT_TRANSCRIBED");
    expect(exact.warning).toBe(DRUG_ITEM_MASTER_WARNING);
    expect(exact.warning).toBe(
      "官方公告之逐字轉錄(健保用藥品項查詢項目檔,政府資料開放平臺);本工具非健保署系統,查詢結果不可作為申報依據,實際品項、價格與給付規定以健保署公告為準。"
    );
    expect(exact.matches[0]?.item.priceHistory.length).toBeGreaterThan(0);

    const notFound = lookupDrugItemMaster({ query: "not present", as_of_date: VALID_DATE });
    expect(notFound.manualReviewRequired).toBe(true);
  });

  it("keeps eligibility conclusions out of engine-authored output and source", () => {
    const outputs = [
      lookupDrugItemMaster({ query: DRUG_ITEM_MASTER_RECORDS[0]!.nhiCode, as_of_date: VALID_DATE }),
      lookupDrugItemMaster({ query: "not present", as_of_date: VALID_DATE })
    ];
    for (const output of outputs) {
      const serialized = JSON.stringify(engineAuthoredProjection(output));
      for (const prohibited of ELIGIBILITY_BLACKLIST) expect(serialized).not.toContain(prohibited);
    }

    const lookupSource = readFileSync(
      path.join(repositoryRoot, "packages/domain/src/drug-item-lookup.ts"),
      "utf8"
    );
    const generatedSource = readFileSync(
      path.join(repositoryRoot, "packages/domain/src/generated/drug-items-2026-08-07.ts"),
      "utf8"
    );
    const generatedScaffolding = `${generatedSource.split("const strings")[0]}${
      generatedSource.split("\nfunction deepFreeze")[1] ?? ""
    }`;
    for (const source of [lookupSource, generatedScaffolding]) {
      for (const prohibited of ELIGIBILITY_BLACKLIST) expect(source).not.toContain(prohibited);
    }
  });
});
