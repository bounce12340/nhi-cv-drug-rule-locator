import { describe, expect, it } from "vitest";
import { parseRuleTextLookupRequest } from "./index";

describe("rule-text lookup request contract", () => {
  it("accepts exactly the three transport fields", () => {
    expect(
      parseRuleTextLookupRequest({
        query: "2.6.1",
        as_of_date: "2026-09-01",
        dataset_version: "nhi-lipid-rules-structured-2026-09-01-r1"
      })
    ).toEqual({
      ok: true,
      value: {
        query: "2.6.1",
        as_of_date: "2026-09-01",
        dataset_version: "nhi-lipid-rules-structured-2026-09-01-r1"
      }
    });
  });

  it.each(["patient_id", "diagnosis", "patient_name", "unit_id"])(
    "rejects the unknown field %s",
    (unknownField) => {
      expect(
        parseRuleTextLookupRequest({
          query: "2.6.1",
          as_of_date: "2026-09-01",
          [unknownField]: "not accepted"
        })
      ).toEqual({
        ok: false,
        message: `Unsupported field: ${unknownField}. Patient and clinical inputs are not accepted.`
      });
    }
  );

  it.each([
    [null, "Request body must be a JSON object."],
    [[], "Request body must be a JSON object."],
    [{ query: 261, as_of_date: "2026-09-01" }, "query must be a non-empty string."],
    [{ query: "2.6.1", as_of_date: 20260901 }, "as_of_date must be a string."],
    [
      { query: "2.6.1", as_of_date: "2026-09-01", dataset_version: 1 },
      "dataset_version must be a string when supplied."
    ]
  ])("rejects invalid field types for %#", (payload, message) => {
    expect(parseRuleTextLookupRequest(payload)).toEqual({ ok: false, message });
  });
});
