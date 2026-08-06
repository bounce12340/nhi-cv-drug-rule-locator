import { describe, expect, it } from "vitest";
import { parseDrugItemLookupRequest } from "./index";

describe("drug-item lookup request contract", () => {
  it("accepts exactly query, as_of_date, and dataset_version", () => {
    expect(
      parseDrugItemLookupRequest({
        query: "example",
        as_of_date: "2026-09-01",
        dataset_version: "nhi-lipid-2026-09-01-r1"
      })
    ).toEqual({
      ok: true,
      value: {
        query: "example",
        as_of_date: "2026-09-01",
        dataset_version: "nhi-lipid-2026-09-01-r1"
      }
    });
  });

  it.each(["patient_id", "diagnosis", "unexpected"])("rejects the unknown field %s", (field) => {
    expect(
      parseDrugItemLookupRequest({
        query: "example",
        as_of_date: "2026-09-01",
        [field]: "not accepted"
      })
    ).toEqual({
      ok: false,
      message: `Unsupported field: ${field}. Patient and clinical inputs are not accepted.`
    });
  });

  it.each([
    [null, "Request body must be a JSON object."],
    [[], "Request body must be a JSON object."],
    [{ query: 1, as_of_date: "2026-09-01" }, "query must be a non-empty string."],
    [{ query: "example" }, "as_of_date must be a string."],
    [{ query: "example", as_of_date: 20260901 }, "as_of_date must be a string."],
    [
      { query: "example", as_of_date: "2026-09-01", dataset_version: 1 },
      "dataset_version must be a string when supplied."
    ]
  ])("rejects invalid field types for %#", (payload, message) => {
    expect(parseDrugItemLookupRequest(payload)).toEqual({ ok: false, message });
  });
});

