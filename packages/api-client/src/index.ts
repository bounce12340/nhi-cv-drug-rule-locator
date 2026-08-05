import type {
  ApiError,
  DataStatus,
  LookupRequest,
  RuleTextLookupRequest
} from "@nhi-cv/contracts";
import type {
  DatasetMeta,
  LookupResult,
  RuleTextLookupResult
} from "@nhi-cv/domain";

export type FetchImpl = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export interface ApiClientConfig {
  readonly baseUrl: string;
  readonly fetchImpl?: FetchImpl;
}

export interface HealthResponse {
  readonly status: "ok";
  readonly service: string;
  readonly data_status: DataStatus;
  readonly warning: DatasetMeta["warning"];
}

export type MetaResponse = DatasetMeta & {
  readonly rulesDataset: {
    readonly version: RuleTextLookupResult["datasetVersion"];
    readonly effectiveFrom: RuleTextLookupResult["effectiveFrom"];
  };
};

export interface MedicationLookupResponse {
  readonly result: LookupResult;
}

export interface RuleTextLookupResponse {
  readonly result: RuleTextLookupResult;
}

export type ApiClientErrorCode = "HTTP_ERROR" | "NETWORK_ERROR" | "INVALID_RESPONSE";

export interface ApiClientError {
  readonly code: ApiClientErrorCode;
  readonly message: string;
  readonly status?: number;
  readonly apiError?: ApiError;
}

export type ApiClientResult<T> =
  | {
      readonly ok: true;
      readonly status: number;
      readonly data: T;
    }
  | {
      readonly ok: false;
      readonly error: ApiClientError;
    };

export interface ApiClient {
  health(): Promise<ApiClientResult<HealthResponse>>;
  meta(): Promise<ApiClientResult<MetaResponse>>;
  lookupMedication(request: LookupRequest): Promise<ApiClientResult<MedicationLookupResponse>>;
  lookupRuleText(request: RuleTextLookupRequest): Promise<ApiClientResult<RuleTextLookupResponse>>;
}

const API_ERROR_CODES = new Set([
  "INVALID_REQUEST",
  "METHOD_NOT_ALLOWED",
  "NOT_FOUND",
  "INTERNAL_ERROR"
]);

export function createApiClient({ baseUrl, fetchImpl = globalThis.fetch.bind(globalThis) }: ApiClientConfig): ApiClient {
  const normalizedBaseUrl = baseUrl.replace(/\/+$/, "");

  return Object.freeze({
    health: () => requestJson<HealthResponse>(fetchImpl, normalizedBaseUrl, "/health", "GET"),
    meta: () => requestJson<MetaResponse>(fetchImpl, normalizedBaseUrl, "/v1/meta", "GET"),
    lookupMedication: (request: LookupRequest) =>
      requestJson<MedicationLookupResponse>(fetchImpl, normalizedBaseUrl, "/v1/lookup", "POST", request),
    lookupRuleText: (request: RuleTextLookupRequest) =>
      requestJson<RuleTextLookupResponse>(
        fetchImpl,
        normalizedBaseUrl,
        "/v1/rules/lookup",
        "POST",
        request
      )
  });
}

async function requestJson<T>(
  fetchImpl: FetchImpl,
  baseUrl: string,
  path: string,
  method: "GET" | "POST",
  body?: LookupRequest | RuleTextLookupRequest
): Promise<ApiClientResult<T>> {
  let response: Response;
  try {
    response = await fetchImpl(`${baseUrl}${path}`, {
      method,
      headers: {
        accept: "application/json",
        ...(body === undefined ? {} : { "content-type": "application/json" })
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      cache: "no-store",
      credentials: "omit"
    });
  } catch {
    return Object.freeze({
      ok: false,
      error: Object.freeze({
        code: "NETWORK_ERROR",
        message: "Network request failed."
      })
    });
  }

  if (!response.ok) {
    const parsedBody = await parseJson(response);
    const apiError = isApiError(parsedBody) ? parsedBody : undefined;
    return Object.freeze({
      ok: false,
      error: Object.freeze({
        code: "HTTP_ERROR",
        message: apiError?.error.message ?? `HTTP request failed with status ${response.status}.`,
        status: response.status,
        ...(apiError === undefined ? {} : { apiError })
      })
    });
  }

  const data = await parseJson(response);
  if (data === undefined) {
    return Object.freeze({
      ok: false,
      error: Object.freeze({
        code: "INVALID_RESPONSE",
        message: "Response body is not valid JSON.",
        status: response.status
      })
    });
  }

  return Object.freeze({ ok: true, status: response.status, data: data as T });
}

async function parseJson(response: Response): Promise<unknown | undefined> {
  try {
    return await response.json();
  } catch {
    return undefined;
  }
}

function isApiError(value: unknown): value is ApiError {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const error = (value as Record<string, unknown>).error;
  if (typeof error !== "object" || error === null || Array.isArray(error)) return false;
  const record = error as Record<string, unknown>;
  return (
    typeof record.code === "string" &&
    API_ERROR_CODES.has(record.code) &&
    typeof record.message === "string" &&
    typeof record.request_id === "string"
  );
}

export type {
  ApiError,
  LookupRequest as MedicationLookupRequest,
  RuleTextLookupRequest
} from "@nhi-cv/contracts";
export type { DatasetMeta, LookupResult, RuleTextLookupResult } from "@nhi-cv/domain";
