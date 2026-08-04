import {
  DEMO_DATA_STATUS,
  parseLookupRequest,
  parseRuleTextLookupRequest,
  type ApiError
} from "@nhi-cv/contracts";
import { getDatasetMeta, lookupMedication, lookupRuleText } from "@nhi-cv/domain";

type LogAttributes = Record<string, string | number | boolean | undefined>;

function structuredLog(level: "info" | "error", event: string, attributes: LogAttributes): void {
  const payload = JSON.stringify({
    timestamp: new Date().toISOString(),
    service: "nhi-cv-drug-rule-locator-api",
    event,
    ...attributes
  });
  if (level === "error") {
    console.error(payload);
    return;
  }
  console.log(payload);
}

function json(body: unknown, status = 200, requestId?: string): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...(requestId ? { "x-request-id": requestId } : {})
    }
  });
}

function errorResponse(
  status: number,
  code: ApiError["error"]["code"],
  message: string,
  requestId: string
): Response {
  structuredLog("error", "request_rejected", { status, code, request_id: requestId });
  return json({ error: { code, message, request_id: requestId } } satisfies ApiError, status, requestId);
}

const worker = {
  async fetch(request: Request, env: Env): Promise<Response> {
    const requestId = crypto.randomUUID();
    const url = new URL(request.url);

    try {
      if (request.method === "GET" && url.pathname === "/health") {
        structuredLog("info", "health_checked", { request_id: requestId, dataset_mode: env.DATASET_MODE });
        return json(
          {
            status: "ok",
            service: "nhi-cv-drug-rule-locator-api",
            data_status: DEMO_DATA_STATUS,
            warning: "示範資料，非健保署核定資料／不可作為申報依據。"
          },
          200,
          requestId
        );
      }

      if (request.method === "GET" && url.pathname === "/v1/meta") {
        structuredLog("info", "meta_requested", { request_id: requestId });
        const rulesMeta = lookupRuleText({ query: "", as_of_date: "" });
        return json(
          {
            ...getDatasetMeta(),
            rulesDataset: {
              version: rulesMeta.datasetVersion,
              effectiveFrom: rulesMeta.effectiveFrom
            }
          },
          200,
          requestId
        );
      }

      if (request.method === "POST" && url.pathname === "/v1/lookup") {
        let payload: unknown;
        try {
          payload = await request.json();
        } catch {
          return errorResponse(400, "INVALID_REQUEST", "Request body must be valid JSON.", requestId);
        }

        const parsed = parseLookupRequest(payload);
        if (!parsed.ok) {
          return errorResponse(400, "INVALID_REQUEST", parsed.message, requestId);
        }

        const result = lookupMedication({
          query: parsed.value.query,
          asOfDate: parsed.value.as_of_date,
          datasetVersion: parsed.value.dataset_version
        });
        structuredLog("info", "lookup_completed", {
          request_id: requestId,
          lookup_status: result.status,
          query_kind: result.queryKind,
          candidate_count: result.candidates.length
        });
        return json({ result }, 200, requestId);
      }

      if (request.method === "POST" && url.pathname === "/v1/rules/lookup") {
        let payload: unknown;
        try {
          payload = await request.json();
        } catch {
          return errorResponse(400, "INVALID_REQUEST", "Request body must be valid JSON.", requestId);
        }

        const parsed = parseRuleTextLookupRequest(payload);
        if (!parsed.ok) {
          return errorResponse(400, "INVALID_REQUEST", parsed.message, requestId);
        }

        const result = lookupRuleText(parsed.value);
        structuredLog("info", "rule_text_lookup_completed", {
          request_id: requestId,
          lookup_status: result.status,
          unit_count: result.units.length
        });
        return json({ result }, 200, requestId);
      }

      if (["/health", "/v1/meta", "/v1/lookup", "/v1/rules/lookup"].includes(url.pathname)) {
        return errorResponse(405, "METHOD_NOT_ALLOWED", "Method not allowed for this endpoint.", requestId);
      }

      return errorResponse(404, "NOT_FOUND", "Endpoint not found.", requestId);
    } catch {
      structuredLog("error", "request_failed", { request_id: requestId });
      return errorResponse(500, "INTERNAL_ERROR", "Unexpected service error.", requestId);
    }
  }
};

export default worker;
