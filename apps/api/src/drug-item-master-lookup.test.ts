import {
  DRUG_ITEM_MASTER_RECORDS,
  DRUG_ITEM_MASTER_WARNING
} from "@nhi-cv/domain";
import { afterEach, describe, expect, it, vi } from "vitest";
import worker from "./index";

const env = { DATASET_MODE: "DEMO_DATA_ONLY" } as Env;
const validRequest = {
  query: DRUG_ITEM_MASTER_RECORDS[0]!.nhiCode,
  as_of_date: "2026-08-07",
  dataset_version: "nhi-drug-items-2026-08-07-r2"
};

async function call(path: string, init?: RequestInit): Promise<Response> {
  return worker.fetch(new Request(`https://example.test${path}`, init), env);
}

async function postDrugItemMaster(body: BodyInit): Promise<Response> {
  return call("/v1/drug-items/lookup", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("drug-item master lookup API", () => {
  it("returns the complete display-only master record, applicable period, and history", async () => {
    const response = await postDrugItemMaster(JSON.stringify(validRequest));
    const body = (await response.json()) as {
      result: {
        status: string;
        sourceTag: string;
        warning: string;
        manualReviewRequired: boolean;
        datasetVersion: string;
        asOfDate: string;
        matches: Array<{
          item: { nhiCode: string; priceHistory: unknown[] };
          applicablePricePeriod: { paymentPriceRaw: string; startDateIso: string; endDateIso: string };
        }>;
      };
    };
    expect(response.status).toBe(200);
    expect(body.result.status).toBe("EXACT_MATCH");
    expect(body.result.sourceTag).toBe("OFFICIAL_TEXT_TRANSCRIBED");
    expect(body.result.warning).toBe(DRUG_ITEM_MASTER_WARNING);
    expect(body.result.manualReviewRequired).toBe(false);
    expect(body.result.datasetVersion).toBe("nhi-drug-items-2026-08-07-r2");
    expect(body.result.asOfDate).toBe("2026-08-07");
    expect(body.result.matches).toHaveLength(1);
    expect(body.result.matches[0]?.item.nhiCode).toBe(DRUG_ITEM_MASTER_RECORDS[0]!.nhiCode);
    expect(body.result.matches[0]?.item.priceHistory).toHaveLength(
      DRUG_ITEM_MASTER_RECORDS[0]!.priceHistory.length
    );
    expect(body.result.matches[0]?.applicablePricePeriod).toMatchObject({
      paymentPriceRaw: DRUG_ITEM_MASTER_RECORDS[0]!.priceHistory.at(-1)!.paymentPriceRaw,
      startDateIso: DRUG_ITEM_MASTER_RECORDS[0]!.priceHistory.at(-1)!.startDateIso,
      endDateIso: "9999-12-31"
    });
  });

  it("passes every price and date string through without calculations", async () => {
    const item = DRUG_ITEM_MASTER_RECORDS.find((candidate) => candidate.priceHistory.length > 2)!;
    const response = await postDrugItemMaster(
      JSON.stringify({ ...validRequest, query: item.nhiCode })
    );
    const body = (await response.json()) as {
      result: {
        matches: Array<{
          item: { priceHistory: typeof item.priceHistory };
          applicablePricePeriod: (typeof item.priceHistory)[number];
        }>;
      };
    };
    expect(response.status).toBe(200);
    expect(body.result.matches[0]?.item.priceHistory).toEqual(item.priceHistory);
    expect(body.result.matches[0]?.applicablePricePeriod.paymentPriceRaw).toBe(
      item.priceHistory.at(-1)!.paymentPriceRaw
    );
  });

  it("rejects malformed JSON with the existing error contract", async () => {
    const response = await postDrugItemMaster("{");
    const body = (await response.json()) as {
      error: { code: string; message: string; request_id: string };
    };
    expect(response.status).toBe(400);
    expect(body.error.code).toBe("INVALID_REQUEST");
    expect(body.error.message).toBe("Request body must be valid JSON.");
    expect(body.error.request_id).toBe(response.headers.get("x-request-id"));
  });

  it.each(["patient_id", "diagnosis", "unexpected"])(
    "rejects the unknown field %s",
    async (field) => {
      const response = await postDrugItemMaster(
        JSON.stringify({ ...validRequest, [field]: "not accepted" })
      );
      const body = (await response.json()) as { error: { code: string; message: string } };
      expect(response.status).toBe(400);
      expect(body.error.code).toBe("INVALID_REQUEST");
      expect(body.error.message).toContain(`Unsupported field: ${field}`);
    }
  );

  it.each([
    ["before the first covered interval", DRUG_ITEM_MASTER_RECORDS[0]!.priceHistory[0]!.startDateIso],
    ["invalid date", "2026-02-29"],
    ["unknown version", "2026-08-07"]
  ])("keeps %s fail closed with no fallback", async (name, date) => {
    const asOfDate =
      name === "before the first covered interval"
        ? new Date(new Date(`${date}T00:00:00.000Z`).getTime() - 86_400_000)
            .toISOString()
            .slice(0, 10)
        : date;
    const request = {
      ...validRequest,
      as_of_date: asOfDate,
      ...(name === "unknown version" ? { dataset_version: "unknown-version" } : {})
    };
    const response = await postDrugItemMaster(JSON.stringify(request));
    const body = (await response.json()) as {
      result: { status: string; manualReviewRequired: boolean; matches: unknown[] };
    };
    expect(response.status).toBe(200);
    expect(body.result.status).toBe("NOT_IN_VALIDATED_DATASET");
    expect(body.result.manualReviewRequired).toBe(true);
    expect(body.result.matches).toEqual([]);
  });

  it("rejects unsupported methods on the drug-item master endpoint", async () => {
    const response = await call("/v1/drug-items/lookup");
    const body = (await response.json()) as { error: { code: string } };
    expect(response.status).toBe(405);
    expect(body.error.code).toBe("METHOD_NOT_ALLOWED");
  });

  it("adds drugItemsDataset metadata without replacing any existing metadata", async () => {
    const response = await call("/v1/meta");
    const body = (await response.json()) as {
      dataStatus: string;
      datasetVersion: string;
      rulesDataset: { version: string; effectiveFrom: string };
      itemsDataset: { version: string; effectiveFrom: string };
      drugItemsDataset: { version: string; effectiveFrom: string; effectiveTo: string };
    };
    expect(response.status).toBe(200);
    expect(body.dataStatus).toBe("DEMO_DATA_ONLY");
    expect(body.datasetVersion).toBe("2026.08.01-demo.1");
    expect(body.rulesDataset.version).toBe("nhi-lipid-rules-structured-2026-09-01-r1");
    expect(body.itemsDataset.version).toBe("nhi-lipid-2026-09-01-r1");
    expect(body.drugItemsDataset).toEqual({
      version: "nhi-drug-items-2026-08-07-r2",
      effectiveFrom: "2026-08-07",
      effectiveTo: "9999-12-31"
    });
  });

  it("logs only operational attributes and never the query content", async () => {
    const marker = "QUERY_CONTENT_MUST_STAY_PRIVATE";
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const response = await postDrugItemMaster(
      JSON.stringify({ ...validRequest, query: marker })
    );
    expect(response.status).toBe(200);
    expect(logSpy).toHaveBeenCalledTimes(1);
    const serialized = String(logSpy.mock.calls[0]?.[0]);
    const record = JSON.parse(serialized) as Record<string, unknown>;
    expect(serialized).not.toContain(marker);
    expect(Object.keys(record).sort()).toEqual(
      ["event", "lookup_status", "match_count", "request_id", "service", "timestamp"].sort()
    );
    expect(record).toMatchObject({
      event: "drug_item_master_lookup_completed",
      lookup_status: "NOT_IN_VALIDATED_DATASET",
      match_count: 0
    });
  });
});
