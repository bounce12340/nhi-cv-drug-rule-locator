import { afterEach, describe, expect, it, vi } from "vitest";
import worker from "./index";

const env = { DATASET_MODE: "DEMO_DATA_ONLY" } as Env;
const validRequest = {
  query: "2.6.1-002",
  as_of_date: "2026-09-01",
  dataset_version: "nhi-lipid-rules-structured-2026-09-01-r1"
};

async function call(path: string, init?: RequestInit): Promise<Response> {
  return worker.fetch(new Request(`https://example.test${path}`, init), env);
}

async function postRuleLookup(body: BodyInit): Promise<Response> {
  return call("/v1/rules/lookup", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("rule-text lookup API", () => {
  it("returns the complete display-only result through the contracts and domain chain", async () => {
    const response = await postRuleLookup(JSON.stringify(validRequest));
    const body = (await response.json()) as {
      result: {
        status: string;
        sourceTag: string;
        warning: string;
        manualReviewRequired: boolean;
        datasetVersion: string;
        effectiveFrom: string;
        units: Array<{ unitId: string; clausePath: readonly string[]; verbatimText: string }>;
      };
    };

    expect(response.status).toBe(200);
    expect(Object.keys(body.result)).toEqual([
      "status",
      "sourceTag",
      "warning",
      "manualReviewRequired",
      "datasetVersion",
      "effectiveFrom",
      "units"
    ]);
    expect(body.result.status).toBe("EXACT_MATCH");
    expect(body.result.sourceTag).toBe("OFFICIAL_TEXT_TRANSCRIBED");
    expect(body.result.warning).toContain("官方公告之逐字轉錄");
    expect(body.result.manualReviewRequired).toBe(false);
    expect(body.result.datasetVersion).toBe("nhi-lipid-rules-structured-2026-09-01-r1");
    expect(body.result.effectiveFrom).toBe("2026-09-01");
    expect(body.result.units).toHaveLength(1);
    expect(body.result.units[0]).toMatchObject({ unitId: "2.6.1-002", clausePath: [] });
    expect(body.result.units[0]?.verbatimText.length).toBeGreaterThan(0);
  });

  it("rejects malformed JSON with the existing error contract", async () => {
    const response = await postRuleLookup("{");
    const body = (await response.json()) as { error: { code: string; message: string; request_id: string } };

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("INVALID_REQUEST");
    expect(body.error.message).toBe("Request body must be valid JSON.");
    expect(body.error.request_id).toBe(response.headers.get("x-request-id"));
  });

  it.each(["patient_id", "diagnosis", "unexpected"])("rejects the unknown field %s", async (field) => {
    const response = await postRuleLookup(JSON.stringify({ ...validRequest, [field]: "not accepted" }));
    const body = (await response.json()) as { error: { code: string; message: string } };

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("INVALID_REQUEST");
    expect(body.error.message).toContain(`Unsupported field: ${field}`);
  });

  it.each([
    ["pre-effective date", { ...validRequest, as_of_date: "2026-08-31" }],
    ["invalid date", { ...validRequest, as_of_date: "2026-02-29" }],
    ["unknown version", { ...validRequest, dataset_version: "unknown-version" }]
  ])("passes %s to the domain fail-closed result", async (_name, requestBody) => {
    const response = await postRuleLookup(JSON.stringify(requestBody));
    const body = (await response.json()) as {
      result: { status: string; manualReviewRequired: boolean; units: unknown[] };
    };

    expect(response.status).toBe(200);
    expect(body.result.status).toBe("NOT_IN_VALIDATED_DATASET");
    expect(body.result.manualReviewRequired).toBe(true);
    expect(body.result.units).toEqual([]);
  });

  it("rejects unsupported methods on the new endpoint", async () => {
    const response = await call("/v1/rules/lookup");
    const body = (await response.json()) as { error: { code: string } };

    expect(response.status).toBe(405);
    expect(body.error.code).toBe("METHOD_NOT_ALLOWED");
  });

  it("adds rule dataset metadata without replacing existing metadata", async () => {
    const response = await call("/v1/meta");
    const body = (await response.json()) as {
      dataStatus: string;
      datasetVersion: string;
      rulesDataset: { version: string; effectiveFrom: string };
    };

    expect(response.status).toBe(200);
    expect(body.dataStatus).toBe("DEMO_DATA_ONLY");
    expect(body.datasetVersion).toBe("2026.08.01-demo.1");
    expect(body.rulesDataset).toEqual({
      version: "nhi-lipid-rules-structured-2026-09-01-r1",
      effectiveFrom: "2026-09-01"
    });
  });

  it("logs only operational rule-lookup attributes and never the query text", async () => {
    const queryMarker = "QUERY_CONTENT_MUST_STAY_PRIVATE";
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);

    const response = await postRuleLookup(
      JSON.stringify({ ...validRequest, query: queryMarker })
    );

    expect(response.status).toBe(200);
    expect(logSpy).toHaveBeenCalledTimes(1);
    const serializedLog = String(logSpy.mock.calls[0]?.[0]);
    const logRecord = JSON.parse(serializedLog) as Record<string, unknown>;
    expect(serializedLog).not.toContain(queryMarker);
    expect(Object.keys(logRecord).sort()).toEqual(
      ["event", "lookup_status", "request_id", "service", "timestamp", "unit_count"].sort()
    );
    expect(logRecord).toMatchObject({
      event: "rule_text_lookup_completed",
      lookup_status: "NOT_IN_VALIDATED_DATASET",
      unit_count: 0
    });
  });
});
