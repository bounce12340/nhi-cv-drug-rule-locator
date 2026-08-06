/**
 * Transport contracts only. These endpoints intentionally accept no patient,
 * diagnosis, laboratory, or eligibility inputs.
 */
export const DEMO_DATA_STATUS = "DEMO_DATA_ONLY" as const;

export type DataStatus = typeof DEMO_DATA_STATUS;

export interface LookupRequest {
  query: string;
  as_of_date?: string;
  dataset_version?: string;
}

export interface RuleTextLookupRequest {
  query: string;
  as_of_date: string;
  dataset_version?: string;
}

export interface DrugItemLookupRequest {
  query: string;
  as_of_date: string;
  dataset_version?: string;
}

export interface ApiError {
  error: {
    code: "INVALID_REQUEST" | "METHOD_NOT_ALLOWED" | "NOT_FOUND" | "INTERNAL_ERROR";
    message: string;
    request_id: string;
  };
}

export type LookupRequestParseResult =
  | { ok: true; value: LookupRequest }
  | { ok: false; message: string };

export type RuleTextLookupRequestParseResult =
  | { ok: true; value: RuleTextLookupRequest }
  | { ok: false; message: string };

export type DrugItemLookupRequestParseResult =
  | { ok: true; value: DrugItemLookupRequest }
  | { ok: false; message: string };

const allowedLookupFields = new Set(["query", "as_of_date", "dataset_version"]);

export function parseLookupRequest(value: unknown): LookupRequestParseResult {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return { ok: false, message: "Request body must be a JSON object." };
  }

  const record = value as Record<string, unknown>;
  const unknownField = Object.keys(record).find((key) => !allowedLookupFields.has(key));
  if (unknownField) {
    return {
      ok: false,
      message: `Unsupported field: ${unknownField}. Patient and clinical inputs are not accepted.`
    };
  }

  if (typeof record.query !== "string" || record.query.trim().length === 0) {
    return { ok: false, message: "query must be a non-empty string." };
  }

  if (record.as_of_date !== undefined && typeof record.as_of_date !== "string") {
    return { ok: false, message: "as_of_date must be a string when supplied." };
  }

  if (record.dataset_version !== undefined && typeof record.dataset_version !== "string") {
    return { ok: false, message: "dataset_version must be a string when supplied." };
  }

  return {
    ok: true,
    value: {
      query: record.query,
      ...(typeof record.as_of_date === "string" ? { as_of_date: record.as_of_date } : {}),
      ...(typeof record.dataset_version === "string" ? { dataset_version: record.dataset_version } : {})
    }
  };
}

const allowedRuleTextLookupFields = new Set(["query", "as_of_date", "dataset_version"]);

export function parseRuleTextLookupRequest(value: unknown): RuleTextLookupRequestParseResult {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return { ok: false, message: "Request body must be a JSON object." };
  }

  const record = value as Record<string, unknown>;
  const unknownField = Object.keys(record).find((key) => !allowedRuleTextLookupFields.has(key));
  if (unknownField) {
    return {
      ok: false,
      message: `Unsupported field: ${unknownField}. Patient and clinical inputs are not accepted.`
    };
  }

  if (typeof record.query !== "string" || record.query.trim().length === 0) {
    return { ok: false, message: "query must be a non-empty string." };
  }

  if (typeof record.as_of_date !== "string") {
    return { ok: false, message: "as_of_date must be a string." };
  }

  if (record.dataset_version !== undefined && typeof record.dataset_version !== "string") {
    return { ok: false, message: "dataset_version must be a string when supplied." };
  }

  return {
    ok: true,
    value: {
      query: record.query,
      as_of_date: record.as_of_date,
      ...(typeof record.dataset_version === "string" ? { dataset_version: record.dataset_version } : {})
    }
  };
}

const allowedDrugItemLookupFields = new Set(["query", "as_of_date", "dataset_version"]);

export function parseDrugItemLookupRequest(value: unknown): DrugItemLookupRequestParseResult {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return { ok: false, message: "Request body must be a JSON object." };
  }

  const record = value as Record<string, unknown>;
  const unknownField = Object.keys(record).find((key) => !allowedDrugItemLookupFields.has(key));
  if (unknownField) {
    return {
      ok: false,
      message: `Unsupported field: ${unknownField}. Patient and clinical inputs are not accepted.`
    };
  }

  if (typeof record.query !== "string" || record.query.trim().length === 0) {
    return { ok: false, message: "query must be a non-empty string." };
  }

  if (typeof record.as_of_date !== "string") {
    return { ok: false, message: "as_of_date must be a string." };
  }

  if (record.dataset_version !== undefined && typeof record.dataset_version !== "string") {
    return { ok: false, message: "dataset_version must be a string when supplied." };
  }

  return {
    ok: true,
    value: {
      query: record.query,
      as_of_date: record.as_of_date,
      ...(typeof record.dataset_version === "string" ? { dataset_version: record.dataset_version } : {})
    }
  };
}
