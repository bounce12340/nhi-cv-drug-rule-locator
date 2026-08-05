import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  DEMO_DATA_ONLY,
  DEMO_PRICE_CANDIDATES,
  DEMO_WARNING,
  PRICE_LABEL,
  classifyComparability,
  comparePrices,
  type PriceComparisonCandidate,
  type PriceComparisonSuccess
} from "./index";

const AS_OF_DATE = "2099-06-15";
const byId = (id: string): PriceComparisonCandidate => {
  const candidate = DEMO_PRICE_CANDIDATES.find((entry) => entry.candidateId === id);
  if (!candidate) throw new Error(`Unknown test fixture: ${id}`);
  return candidate;
};
const alpha = byId("DEMO-PRICE-CANDIDATE-ALPHA");
const beta = byId("DEMO-PRICE-CANDIDATE-BETA");
const context = byId("DEMO-PRICE-CANDIDATE-PACK");
const differentRoute = byId("DEMO-PRICE-CANDIDATE-ROUTE");
const incomplete = byId("DEMO-PRICE-CANDIDATE-INCOMPLETE");
const future = byId("DEMO-PRICE-CANDIDATE-FUTURE");
const missing = byId("DEMO-PRICE-CANDIDATE-MISSING");
const stale = byId("DEMO-PRICE-CANDIDATE-STALE");
const conflict = byId("DEMO-PRICE-CANDIDATE-CONFLICT");

function successFor(candidates: readonly PriceComparisonCandidate[]): PriceComparisonSuccess {
  const result = comparePrices({ asOfDate: AS_OF_DATE, candidates });
  expect(result.ok).toBe(true);
  return result as PriceComparisonSuccess;
}

describe("ADR-005 demo price comparison", () => {
  it("classifies every comparability state from all eight required attributes", () => {
    expect(classifyComparability(alpha.comparabilityKey, beta.comparabilityKey)).toBe(
      "DIRECTLY_COMPARABLE"
    );
    expect(classifyComparability(alpha.comparabilityKey, context.comparabilityKey)).toBe("CONTEXT_ONLY");
    expect(classifyComparability(alpha.comparabilityKey, incomplete.comparabilityKey)).toBe(
      "INSUFFICIENT_DATA"
    );
    expect(classifyComparability(alpha.comparabilityKey, differentRoute.comparabilityKey)).toBe(
      "NOT_COMPARABLE"
    );
  });

  it("does not treat reordered composition or a changed non-quantity attribute as equivalent", () => {
    const compound = {
      ...alpha.comparabilityKey,
      ingredientComposition: ["DEMO_INGREDIENT_ALPHA", "DEMO_INGREDIENT_BETA"],
      combinationRatio: "DEMO_RATIO_ONE_TO_TWO"
    };
    expect(
      classifyComparability(compound, {
        ...compound,
        ingredientComposition: [...compound.ingredientComposition].reverse()
      })
    ).toBe("NOT_COMPARABLE");
    expect(classifyComparability(alpha.comparabilityKey, differentRoute.comparabilityKey)).toBe(
      "NOT_COMPARABLE"
    );
  });

  it.each([
    [alpha, "CURRENT"],
    [future, "FUTURE"],
    [missing, "MISSING"],
    [stale, "STALE"],
    [conflict, "CONFLICT"]
  ] as const)("derives the %s fixture price status as %s", (candidate, expectedStatus) => {
    const result = successFor([candidate]);
    expect(result.candidates[0]?.priceStatus).toBe(expectedStatus);
  });

  it("sorts only an all-current, directly comparable set", () => {
    const result = successFor([beta, alpha]);
    expect(result.candidates.map((candidate) => candidate.candidateId)).toEqual([
      beta.candidateId,
      alpha.candidateId
    ]);
    expect(result.lowestPriceOrder).toEqual([alpha.candidateId, beta.candidateId]);
    expect(result.manualReviewRequired).toBe(false);
  });

  it("closes the ordering gate when a single candidate is not current", () => {
    const result = successFor([alpha, future]);
    expect(result.candidates.map((candidate) => candidate.priceStatus)).toEqual(["CURRENT", "FUTURE"]);
    expect(result.lowestPriceOrder).toBeNull();
    expect(result.manualReviewRequired).toBe(true);
  });

  it("closes the ordering gate for context-only candidates even when every price is current", () => {
    const result = successFor([alpha, context]);
    expect(result.candidates.map((candidate) => candidate.priceStatus)).toEqual(["CURRENT", "CURRENT"]);
    expect(result.candidates[1]?.comparability).toBe("CONTEXT_ONLY");
    expect(result.lowestPriceOrder).toBeNull();
    expect(result.manualReviewRequired).toBe(true);
  });

  it("separates current and future entries and attaches each effective date", () => {
    const result = successFor([alpha]);
    expect(result.candidates[0]?.currentPrices).toEqual([
      {
        label: PRICE_LABEL,
        amountNtd: 11.11,
        effectiveDate: "2099-01-01",
        effectiveTo: "2099-06-30"
      }
    ]);
    expect(result.candidates[0]?.futurePrices).toEqual([
      {
        label: PRICE_LABEL,
        amountNtd: 12.12,
        effectiveDate: "2099-07-01",
        effectiveTo: "2099-12-31"
      }
    ]);
  });

  it("does not synthesize zero or carry an expired entry into current output", () => {
    const result = successFor([missing, stale]);
    expect(result.candidates[0]?.currentPrices).toEqual([]);
    expect(result.candidates[0]?.futurePrices).toEqual([]);
    expect(result.candidates[1]?.currentPrices).toEqual([]);
    expect(result.candidates[1]?.futurePrices).toEqual([]);
    expect(JSON.stringify(result)).not.toContain('"amountNtd":0');
  });

  it("returns a fail-closed result instead of throwing above four candidates", () => {
    const result = comparePrices({
      asOfDate: AS_OF_DATE,
      candidates: [alpha, beta, context, differentRoute, incomplete]
    });
    expect(result).toMatchObject({
      ok: false,
      error: { code: "COMPARISON_LIMIT_EXCEEDED" },
      candidates: [],
      lowestPriceOrder: null,
      manualReviewRequired: true
    });
  });

  it.each([
    ["not-a-date", "INVALID_AS_OF_DATE"],
    ["2099-02-29", "INVALID_AS_OF_DATE"],
    ["2098-12-31", "AS_OF_DATE_NOT_COVERED"],
    ["2100-01-01", "AS_OF_DATE_NOT_COVERED"]
  ])("fails closed for as-of date %s", (asOfDate, code) => {
    const result = comparePrices({ asOfDate, candidates: [alpha, beta] });
    expect(result).toMatchObject({
      ok: false,
      error: { code },
      candidates: [],
      lowestPriceOrder: null,
      manualReviewRequired: true
    });
  });

  it("fails closed for empty, duplicate, malformed, or non-demo candidate data", () => {
    const invalidRequests = [
      [],
      [alpha, alpha],
      [{ ...alpha, sourceTag: "UNVERIFIED" }],
      [{ ...alpha, prices: [{ amountNtd: 0, effectiveFrom: "2099-01-01", effectiveTo: "2099-12-31" }] }],
      [{ ...alpha, prices: [{ amountNtd: 1, effectiveFrom: "bad", effectiveTo: "2099-12-31" }] }]
    ] as unknown as readonly (readonly PriceComparisonCandidate[])[];
    for (const candidates of invalidRequests) {
      expect(comparePrices({ asOfDate: AS_OF_DATE, candidates })).toMatchObject({
        ok: false,
        error: { code: "INVALID_CANDIDATE_DATA" },
        manualReviewRequired: true
      });
    }
  });

  it("marks every fixture and result demo-only and preserves the mandatory warning verbatim", () => {
    expect(DEMO_PRICE_CANDIDATES.every((candidate) => candidate.sourceTag === DEMO_DATA_ONLY)).toBe(true);
    const result = successFor([alpha, beta]);
    expect(result.sourceTag).toBe(DEMO_DATA_ONLY);
    expect(result.candidates.every((candidate) => candidate.sourceTag === DEMO_DATA_ONLY)).toBe(true);
    expect(result.warning).toBe(DEMO_WARNING);
    expect(result.warning).toBe("示範資料，非健保署核定資料／不可作為申報依據。");
    expect(result.priceLabel).toBe("健保支付價");
  });

  it("keeps fixtures and produced results deeply frozen and deterministic", () => {
    const first = successFor([beta, alpha]);
    const second = successFor([beta, alpha]);
    expect(first).toEqual(second);
    expect(Object.isFrozen(DEMO_PRICE_CANDIDATES)).toBe(true);
    expect(Object.isFrozen(DEMO_PRICE_CANDIDATES[0]?.comparabilityKey)).toBe(true);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.candidates)).toBe(true);
    expect(Object.isFrozen(first.candidates[0]?.currentPrices)).toBe(true);
    expect(Object.isFrozen(first.lowestPriceOrder)).toBe(true);
  });
});

describe("authored-output vocabulary safeguards", () => {
  const decisionWords = [
    "\u63a8\u85a6",
    "\u6700\u4f73",
    "\u9996\u9078",
    "\u6700\u7701"
  ] as const;
  const eligibilityWords = [
    "\u7b26\u5408\u7d66\u4ed8",
    "\u4e0d\u7b26\u5408\u7d66\u4ed8",
    "\u53ef\u7533\u5831",
    "\u51c6\u4e88\u7d66\u4ed8",
    "\u4e0d\u4e88\u7d66\u4ed8"
  ] as const;
  const percentPattern = new RegExp("\\u7bc0\\u7701[^\\n\\r]{0,24}[%\\uff05]");

  function projectWithoutDemoNames(value: unknown): unknown {
    if (Array.isArray(value)) return value.map(projectWithoutDemoNames);
    if (typeof value !== "object" || value === null) return value;
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => key !== "displayName")
        .map(([key, child]) => [key, projectWithoutDemoNames(child)])
    );
  }

  function expectClean(value: unknown): void {
    const searchable = JSON.stringify(projectWithoutDemoNames(value));
    for (const word of [...decisionWords, ...eligibilityWords]) expect(searchable).not.toContain(word);
    expect(searchable).not.toMatch(percentPattern);
  }

  it("scans all package-produced fields with an explicit demo-name-only exemption", () => {
    const outputs = [
      successFor([alpha, beta]),
      successFor([alpha, future]),
      comparePrices({ asOfDate: "bad", candidates: [alpha] }),
      comparePrices({ asOfDate: AS_OF_DATE, candidates: [alpha, beta, context, differentRoute, incomplete] })
    ];
    for (const output of outputs) expectClean(output);
    expectClean(DEMO_PRICE_CANDIDATES);

    const exemptionProbe = [{ ...alpha, displayName: decisionWords[0] }];
    expectClean(exemptionProbe);
    expect(JSON.stringify(exemptionProbe)).toContain(decisionWords[0]);
  });

  it("scans production source for both fixed blacklists and percent-style copy", () => {
    const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
    const source = ["index.ts", "fixtures.ts"]
      .map((file) => readFileSync(path.join(packageRoot, "src", file), "utf8"))
      .join("\n");
    for (const word of [...decisionWords, ...eligibilityWords]) expect(source).not.toContain(word);
    expect(source).not.toMatch(percentPattern);
  });

  it("keeps every fixture identifier outside the real-code surface shape", () => {
    const realCodeShape = /^[A-B][A-Z0-9][0-9]{8}$/;
    expect(DEMO_PRICE_CANDIDATES.every((candidate) => !realCodeShape.test(candidate.candidateId))).toBe(true);
    expect(DEMO_PRICE_CANDIDATES.every((candidate) => candidate.candidateId.startsWith("DEMO-"))).toBe(true);
    expect(DEMO_PRICE_CANDIDATES.every((candidate) => candidate.displayName.includes("Demo"))).toBe(true);
  });
});
