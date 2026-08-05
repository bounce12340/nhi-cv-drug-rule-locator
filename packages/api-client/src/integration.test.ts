import { afterEach, describe, expect, it, vi } from "vitest";
import worker from "../../../apps/api/src/index";
import { createApiClient, type FetchImpl } from "./index";

declare global {
  interface Env {
    DATASET_MODE: string;
  }
}

const env: Env = { DATASET_MODE: "DEMO_DATA_ONLY" };

const handlerFetch: FetchImpl = async (input, init) => {
  const request = input instanceof Request && init === undefined ? input : new Request(input, init);
  return worker.fetch(request, env);
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("API client and Worker handler integration", () => {
  it("reads health and metadata directly through the Worker fetch handler", async () => {
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    const client = createApiClient({ baseUrl: "https://integration.example.test", fetchImpl: handlerFetch });

    const health = await client.health();
    const meta = await client.meta();

    expect(health).toMatchObject({
      ok: true,
      data: {
        status: "ok",
        data_status: "DEMO_DATA_ONLY",
        warning: "示範資料，非健保署核定資料／不可作為申報依據。"
      }
    });
    expect(meta).toMatchObject({
      ok: true,
      data: {
        dataStatus: "DEMO_DATA_ONLY",
        rulesDataset: {
          version: "nhi-lipid-rules-structured-2026-09-01-r1",
          effectiveFrom: "2026-09-01"
        }
      }
    });
  });

  it("posts both lookup request types through contracts and domain without dropping safeguards", async () => {
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    const client = createApiClient({ baseUrl: "https://integration.example.test", fetchImpl: handlerFetch });

    const medication = await client.lookupMedication({ query: "D3M0A00001" });
    const ruleText = await client.lookupRuleText({
      query: "2.6.1-002",
      as_of_date: "2026-09-01",
      dataset_version: "nhi-lipid-rules-structured-2026-09-01-r1"
    });

    expect(medication).toMatchObject({
      ok: true,
      data: {
        result: {
          status: "EXACT_MATCH",
          dataStatus: "DEMO_DATA_ONLY",
          warning: "示範資料，非健保署核定資料／不可作為申報依據。",
          manualReviewRequired: false
        }
      }
    });
    expect(ruleText).toMatchObject({
      ok: true,
      data: {
        result: {
          status: "EXACT_MATCH",
          sourceTag: "OFFICIAL_TEXT_TRANSCRIBED",
          warning:
            "官方公告之逐字轉錄(2026-09-01 生效),經保真驗證;本工具非健保署系統,查詢結果不可作為申報依據,實際規定以健保署公告為準。",
          manualReviewRequired: false
        }
      }
    });
  });
});
