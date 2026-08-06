import { describe, expect, it } from "vitest";
import { parseDrugItemMasterLookupRequest } from "./index";

describe("drug-item master lookup request contract", () => {
  it("accepts the allowlist of exactly query, as_of_date, and dataset_version", () => {
    expect(
      parseDrugItemMasterLookupRequest({
        query: "示範查詢",
        as_of_date: "2026-08-06",
        dataset_version: "nhi-drug-items-2026-08-06-r1"
      })
    ).toEqual({
      ok: true,
      value: {
        query: "示範查詢",
        as_of_date: "2026-08-06",
        dataset_version: "nhi-drug-items-2026-08-06-r1"
      }
    });
  });

  it("accepts an omitted dataset_version without adding it", () => {
    expect(
      parseDrugItemMasterLookupRequest({ query: "example", as_of_date: "2026-08-06" })
    ).toEqual({
      ok: true,
      value: { query: "example", as_of_date: "2026-08-06" }
    });
  });

  it.each(["patient_id", "diagnosis", "unexpected", "asOfDate"])(
    "rejects the unknown field %s",
    (field) => {
      expect(
        parseDrugItemMasterLookupRequest({
          query: "example",
          as_of_date: "2026-08-06",
          [field]: "not accepted"
        })
      ).toEqual({
        ok: false,
        message: `Unsupported field: ${field}. Patient and clinical inputs are not accepted.`
      });
    }
  );

  it.each([
    [null, "Request body must be a JSON object."],
    [[], "Request body must be a JSON object."],
    [{ query: "", as_of_date: "2026-08-06" }, "query must be a non-empty string."],
    [{ query: 1, as_of_date: "2026-08-06" }, "query must be a non-empty string."],
    [{ query: "example" }, "as_of_date must be a string."],
    [{ query: "example", as_of_date: 20260806 }, "as_of_date must be a string."],
    [
      { query: "example", as_of_date: "2026-08-06", dataset_version: 1 },
      "dataset_version must be a string when supplied."
    ]
  ])("rejects an invalid transport payload for %#", (payload, message) => {
    expect(parseDrugItemMasterLookupRequest(payload)).toEqual({ ok: false, message });
  });
});
