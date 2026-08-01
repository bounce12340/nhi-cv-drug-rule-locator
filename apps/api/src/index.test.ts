import { describe, expect, it } from "vitest";
import worker from "./index";

const env = { DATASET_MODE: "DEMO_DATA_ONLY" } as Env;

async function call(path: string, init?: RequestInit): Promise<Response> {
  return worker.fetch(new Request(`https://example.test${path}`, init), env);
}

describe("Phase 0 API", () => {
  it("returns an explicit demo-only health response", async () => {
    const response = await call("/health");
    const body = (await response.json()) as { status: string; data_status: string; warning: string };
    expect(response.status).toBe(200);
    expect(body.status).toBe("ok");
    expect(body.data_status).toBe("DEMO_DATA_ONLY");
    expect(body.warning).toContain("示範資料");
  });

  it("returns traceable dataset metadata", async () => {
    const response = await call("/v1/meta");
    const body = (await response.json()) as { datasetVersion: string; dataStatus: string };
    expect(response.status).toBe(200);
    expect(body.dataStatus).toBe("DEMO_DATA_ONLY");
    expect(body.datasetVersion).toBe("2026.08.01-demo.1");
  });

  it("performs a deterministic lookup without accepting clinical fields", async () => {
    const success = await call("/v1/lookup", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ query: "D3M0A00001" })
    });
    const successBody = (await success.json()) as { result: { status: string; warning: string } };
    expect(success.status).toBe(200);
    expect(successBody.result.status).toBe("EXACT_MATCH");
    expect(successBody.result.warning).toContain("不可作為申報依據");

    const rejected = await call("/v1/lookup", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ query: "D3M0A00001", patient_name: "not accepted" })
    });
    expect(rejected.status).toBe(400);
    expect((await rejected.json() as { error: { code: string } }).error.code).toBe("INVALID_REQUEST");
  });
});
