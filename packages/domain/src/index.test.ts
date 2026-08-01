import { describe, expect, it } from "vitest";
import {
  DEMO_COVERAGE_WARNING,
  DEMO_DATA_ONLY,
  DEMO_WARNING,
  lookupMedication,
  normalizeMedicationName,
  normalizeNhiCode
} from "./index";

describe("NHI code normalization", () => {
  it("applies NFKC, trim, uppercase, whitespace and hyphen removal", () => {
    expect(normalizeNhiCode(" ｄ3ｍ0ａ - 00001 ")).toBe("D3M0A00001");
    expect(lookupMedication({ query: " d3m0a-00001 " }).status).toBe("EXACT_MATCH");
  });

  it("does not auto-correct a one-character-different code", () => {
    const result = lookupMedication({ query: "D3M0A0000I" });
    expect(result.status).toBe("NOT_IN_VALIDATED_DATASET");
    expect(result.candidates).toHaveLength(0);
  });
});

describe("deterministic matching safeguards", () => {
  it("preserves strength and dosage-form words while normalizing a name", () => {
    expect(normalizeMedicationName(" Atorvastatin 20 mg film-coated tablet ")).toBe(
      "atorvastatin 20 mg film-coated tablet"
    );
  });

  it("returns multiple candidates without selecting the first record", () => {
    const result = lookupMedication({ query: "Atorvastatin" });
    expect(result.status).toBe("MULTIPLE_MATCHES");
    expect(result.manualReviewRequired).toBe(true);
    expect(result.candidates.map((record) => record.nhiCode)).toEqual(["D3M0A00001", "D3M0A00002"]);
  });

  it("fails closed when date or requested data version is outside the dataset", () => {
    expect(lookupMedication({ query: "D3M0A00001", asOfDate: "2026-07-31" }).status).toBe(
      "NOT_IN_VALIDATED_DATASET"
    );
    expect(lookupMedication({ query: "D3M0A00001", datasetVersion: "unverified" }).status).toBe(
      "NOT_IN_VALIDATED_DATASET"
    );
  });

  it("fails closed beyond the finite demo dataset coverage without returning a price", () => {
    const result = lookupMedication({ query: "D3M0A00001", asOfDate: "2099-12-31" });
    expect(result.status).toBe("NOT_IN_VALIDATED_DATASET");
    expect(result.manualReviewRequired).toBe(true);
    expect(result.warning).toBe(DEMO_COVERAGE_WARNING);
    expect(result.candidates).toHaveLength(0);
  });

  it("allows the inclusive coverage-end boundary", () => {
    const result = lookupMedication({ query: "D3M0A00001", asOfDate: "2026-08-31" });
    expect(result.status).toBe("EXACT_MATCH");
    expect(result.manualReviewRequired).toBe(false);
    expect(result.candidates[0]?.demoPaymentPriceNtd).toBe(12.34);
  });

  it("marks every result and price as demo-only with the mandatory warning", () => {
    const result = lookupMedication({ query: "D3M0A00001" });
    expect(result.dataStatus).toBe(DEMO_DATA_ONLY);
    expect(result.priceDataStatus).toBe(DEMO_DATA_ONLY);
    expect(result.warning).toBe(DEMO_WARNING);
  });
});
