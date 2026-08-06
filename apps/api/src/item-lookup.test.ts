import { ITEM_RECORDS, ITEM_WARNING } from "@nhi-cv/domain";
import { afterEach, describe, expect, it, vi } from "vitest";
import worker from "./index";

const env = { DATASET_MODE: "DEMO_DATA_ONLY" } as Env;
const validRequest = {
  query: ITEM_RECORDS[0]!.nhiCode,
  as_of_date: "2026-09-01",
  dataset_version: "nhi-lipid-2026-09-01-r1"
};

async function call(path: string, init?: RequestInit): Promise<Response> {
  return worker.fetch(new Request(`https://example.test${path}`, init), env);
}

async function postItemLookup(body: BodyInit): Promise<Response> {
  return call("/v1/items/lookup", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("drug-item lookup API", () => {
  it("returns the complete display-only result through contracts and domain", async () => {
    const response = await postItemLookup(JSON.stringify(validRequest));
    const body = (await response.json()) as {
      result: {
        status: string;
        sourceTag: string;
        warning: string;
        manualReviewRequired: boolean;
        datasetVersion: string;
        effectiveFrom: string;
        items: Array<{ nhiCode: string; drugNameEn: string }>;
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
      "items"
    ]);
    expect(body.result.status).toBe("EXACT_MATCH");
    expect(body.result.sourceTag).toBe("OFFICIAL_TEXT_TRANSCRIBED");
    expect(body.result.warning).toBe(ITEM_WARNING);
    expect(body.result.manualReviewRequired).toBe(false);
    expect(body.result.datasetVersion).toBe("nhi-lipid-2026-09-01-r1");
    expect(body.result.effectiveFrom).toBe("2026-09-01");
    expect(body.result.items).toHaveLength(1);
    expect(body.result.items[0]).toMatchObject({
      nhiCode: ITEM_RECORDS[0]!.nhiCode,
      drugNameEn: ITEM_RECORDS[0]!.drugNameEn
    });
  });

  it("passes the exact old and new price strings through without calculation", async () => {
    const pricedItem = ITEM_RECORDS.find(
      (item) => item.priceBefore !== undefined && item.priceAfter !== undefined
    )!;
    const response = await postItemLookup(
      JSON.stringify({ ...validRequest, query: pricedItem.nhiCode })
    );
    const body = (await response.json()) as {
      result: { items: Array<{ priceBefore: string; priceAfter: string }> };
    };
    expect(response.status).toBe(200);
    expect(body.result.items[0]?.priceBefore).toBe(pricedItem.priceBefore);
    expect(body.result.items[0]?.priceAfter).toBe(pricedItem.priceAfter);
  });

  it("does not serialize a substitute for missing prices", async () => {
    const itemWithoutPrice = ITEM_RECORDS.find((item) => item.priceBefore === undefined)!;
    const response = await postItemLookup(
      JSON.stringify({ ...validRequest, query: itemWithoutPrice.nhiCode })
    );
    const body = (await response.json()) as { result: { items: Array<Record<string, unknown>> } };
    expect(response.status).toBe(200);
    expect(body.result.items[0]).not.toHaveProperty("priceBefore");
    expect(body.result.items[0]).not.toHaveProperty("priceAfter");
  });

  it("rejects malformed JSON with the existing error contract", async () => {
    const response = await postItemLookup("{");
    const body = (await response.json()) as {
      error: { code: string; message: string; request_id: string };
    };
    expect(response.status).toBe(400);
    expect(body.error.code).toBe("INVALID_REQUEST");
    expect(body.error.message).toBe("Request body must be valid JSON.");
    expect(body.error.request_id).toBe(response.headers.get("x-request-id"));
  });

  it.each(["patient_id", "diagnosis", "unexpected"])("rejects the unknown field %s", async (field) => {
    const response = await postItemLookup(
      JSON.stringify({ ...validRequest, [field]: "not accepted" })
    );
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
    const response = await postItemLookup(JSON.stringify(requestBody));
    const body = (await response.json()) as {
      result: { status: string; manualReviewRequired: boolean; items: unknown[] };
    };
    expect(response.status).toBe(200);
    expect(body.result.status).toBe("NOT_IN_VALIDATED_DATASET");
    expect(body.result.manualReviewRequired).toBe(true);
    expect(body.result.items).toEqual([]);
  });

  it("rejects unsupported methods on the item endpoint", async () => {
    const response = await call("/v1/items/lookup");
    const body = (await response.json()) as { error: { code: string } };
    expect(response.status).toBe(405);
    expect(body.error.code).toBe("METHOD_NOT_ALLOWED");
  });

  it("adds item metadata without replacing existing metadata", async () => {
    const response = await call("/v1/meta");
    const body = (await response.json()) as {
      dataStatus: string;
      datasetVersion: string;
      rulesDataset: { version: string; effectiveFrom: string };
      itemsDataset: { version: string; effectiveFrom: string };
    };
    expect(response.status).toBe(200);
    expect(body.dataStatus).toBe("DEMO_DATA_ONLY");
    expect(body.datasetVersion).toBe("2026.08.01-demo.1");
    expect(body.rulesDataset).toEqual({
      version: "nhi-lipid-rules-structured-2026-09-01-r1",
      effectiveFrom: "2026-09-01"
    });
    expect(body.itemsDataset).toEqual({
      version: "nhi-lipid-2026-09-01-r1",
      effectiveFrom: "2026-09-01"
    });
  });

  it("logs only operational item-lookup attributes and never the query text", async () => {
    const queryMarker = "QUERY_CONTENT_MUST_STAY_PRIVATE";
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const response = await postItemLookup(
      JSON.stringify({ ...validRequest, query: queryMarker })
    );
    expect(response.status).toBe(200);
    expect(logSpy).toHaveBeenCalledTimes(1);
    const serializedLog = String(logSpy.mock.calls[0]?.[0]);
    const logRecord = JSON.parse(serializedLog) as Record<string, unknown>;
    expect(serializedLog).not.toContain(queryMarker);
    expect(Object.keys(logRecord).sort()).toEqual(
      ["event", "item_count", "lookup_status", "request_id", "service", "timestamp"].sort()
    );
    expect(logRecord).toMatchObject({
      event: "drug_item_lookup_completed",
      lookup_status: "NOT_IN_VALIDATED_DATASET",
      item_count: 0
    });
  });
});

