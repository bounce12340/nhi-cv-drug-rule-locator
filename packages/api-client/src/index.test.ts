import { describe, expect, it, vi } from "vitest";
import {
  createApiClient,
  type ApiClientResult,
  type FetchImpl
} from "./index";

const DEMO_WARNING = "示範資料，非健保署核定資料／不可作為申報依據。";
const RULE_WARNING =
  "官方公告之逐字轉錄(2026-09-01 生效),經保真驗證;本工具非健保署系統,查詢結果不可作為申報依據,實際規定以健保署公告為準。";

function response(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" }
  });
}

function successfulData<T>(result: ApiClientResult<T>): T {
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error("Expected successful client result.");
  return result.data;
}

describe("typed API client endpoints", () => {
  it("calls health and returns its warning unchanged", async () => {
    const payload = {
      status: "ok",
      service: "nhi-cv-drug-rule-locator-api",
      data_status: "DEMO_DATA_ONLY",
      warning: DEMO_WARNING
    };
    const fetchImpl = vi.fn<FetchImpl>().mockResolvedValue(response(payload));
    const result = await createApiClient({ baseUrl: "https://api.example.test/", fetchImpl }).health();

    expect(successfulData(result)).toEqual(payload);
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://api.example.test/health",
      expect.objectContaining({ method: "GET", cache: "no-store", credentials: "omit" })
    );
  });

  it("calls meta and returns both dataset metadata branches unchanged", async () => {
    const payload = {
      dataStatus: "DEMO_DATA_ONLY",
      datasetVersion: "2026.08.01-demo.1",
      asOfDate: "2026-08-01",
      coverageStartDate: "2026-08-01",
      coverageEndDate: "2026-08-31",
      warning: DEMO_WARNING,
      recordCount: 3,
      rulesDataset: {
        version: "nhi-lipid-rules-structured-2026-09-01-r1",
        effectiveFrom: "2026-09-01"
      }
    };
    const fetchImpl = vi.fn<FetchImpl>().mockResolvedValue(response(payload));
    const result = await createApiClient({ baseUrl: "https://api.example.test", fetchImpl }).meta();

    expect(successfulData(result)).toEqual(payload);
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://api.example.test/v1/meta",
      expect.objectContaining({ method: "GET" })
    );
  });

  it("posts a medication lookup request and preserves warning and review fields", async () => {
    const request = { query: "D3M0A00001", as_of_date: "2026-08-01" };
    const payload = {
      result: {
        status: "EXACT_MATCH",
        queryKind: "NHI_CODE",
        normalizedQuery: "D3M0A00001",
        asOfDate: "2026-08-01",
        datasetVersion: "2026.08.01-demo.1",
        dataStatus: "DEMO_DATA_ONLY",
        priceDataStatus: "DEMO_DATA_ONLY",
        manualReviewRequired: false,
        warning: DEMO_WARNING,
        candidates: []
      }
    };
    const fetchImpl = vi.fn<FetchImpl>().mockResolvedValue(response(payload));
    const result = await createApiClient({ baseUrl: "https://api.example.test", fetchImpl }).lookupMedication(
      request
    );

    expect(successfulData(result)).toEqual(payload);
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://api.example.test/v1/lookup",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(request),
        headers: expect.objectContaining({ "content-type": "application/json" })
      })
    );
  });

  it("posts a rule-text request and passes sourceTag, warning, and review fields through byte-for-byte", async () => {
    const request = {
      query: "2.6.1-002",
      as_of_date: "2026-09-01",
      dataset_version: "nhi-lipid-rules-structured-2026-09-01-r1"
    };
    const payload = {
      result: {
        status: "EXACT_MATCH",
        sourceTag: "OFFICIAL_TEXT_TRANSCRIBED",
        warning: RULE_WARNING,
        manualReviewRequired: false,
        datasetVersion: "nhi-lipid-rules-structured-2026-09-01-r1",
        effectiveFrom: "2026-09-01",
        units: []
      }
    };
    const fetchImpl = vi.fn<FetchImpl>().mockResolvedValue(response(payload));
    const result = await createApiClient({ baseUrl: "https://api.example.test", fetchImpl }).lookupRuleText(
      request
    );

    expect(successfulData(result)).toEqual(payload);
    expect(JSON.stringify(successfulData(result))).toBe(JSON.stringify(payload));
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://api.example.test/v1/rules/lookup",
      expect.objectContaining({ method: "POST", body: JSON.stringify(request) })
    );
  });
});

describe("typed API client failures", () => {
  it("returns the server error contract for non-2xx responses without throwing", async () => {
    const apiError = {
      error: {
        code: "INVALID_REQUEST",
        message: "query must be a non-empty string.",
        request_id: "demo-request-id"
      }
    };
    const fetchImpl = vi.fn<FetchImpl>().mockResolvedValue(response(apiError, 400));
    const result = await createApiClient({ baseUrl: "https://api.example.test", fetchImpl }).lookupMedication({
      query: ""
    });

    expect(result).toEqual({
      ok: false,
      error: {
        code: "HTTP_ERROR",
        message: apiError.error.message,
        status: 400,
        apiError
      }
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("returns a typed HTTP failure when the non-2xx body is not the server contract", async () => {
    const fetchImpl = vi.fn<FetchImpl>().mockResolvedValue(new Response("gateway", { status: 502 }));
    const result = await createApiClient({ baseUrl: "https://api.example.test", fetchImpl }).health();

    expect(result).toEqual({
      ok: false,
      error: {
        code: "HTTP_ERROR",
        message: "HTTP request failed with status 502.",
        status: 502
      }
    });
  });

  it("returns a typed network failure with exactly one fetch attempt", async () => {
    const fetchImpl = vi.fn<FetchImpl>().mockRejectedValue(new Error("offline"));
    const result = await createApiClient({ baseUrl: "https://api.example.test", fetchImpl }).meta();

    expect(result).toEqual({
      ok: false,
      error: { code: "NETWORK_ERROR", message: "Network request failed." }
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("returns a typed invalid-response failure for malformed success JSON", async () => {
    const fetchImpl = vi.fn<FetchImpl>().mockResolvedValue(
      new Response("not-json", { status: 200, headers: { "content-type": "application/json" } })
    );
    const result = await createApiClient({ baseUrl: "https://api.example.test", fetchImpl }).health();

    expect(result).toEqual({
      ok: false,
      error: {
        code: "INVALID_RESPONSE",
        message: "Response body is not valid JSON.",
        status: 200
      }
    });
  });
});
