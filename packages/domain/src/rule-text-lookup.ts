import {
  RULE_TEXT_DATASET_VERSION,
  RULE_TEXT_EFFECTIVE_FROM,
  RULE_TEXT_UNITS,
  type RuleTextUnit
} from "./generated/rules-2026-09-01";

export type { RuleTextSourceAnchor, RuleTextUnit } from "./generated/rules-2026-09-01";

export const OFFICIAL_TEXT_TRANSCRIBED = "OFFICIAL_TEXT_TRANSCRIBED" as const;
export const RULE_TEXT_WARNING =
  "官方公告之逐字轉錄(2026-09-01 生效),經保真驗證;本工具非健保署系統,查詢結果不可作為申報依據,實際規定以健保署公告為準。" as const;

export type RuleTextLookupStatus =
  | "EXACT_MATCH"
  | "MULTIPLE_MATCHES"
  | "NOT_IN_VALIDATED_DATASET";

export interface RuleTextLookupRequest {
  readonly query: string;
  readonly as_of_date: string;
  readonly dataset_version?: string;
}

/** EXACT_MATCH means only that the requested text unit exists; it carries no coverage or claim conclusion. */
export interface RuleTextLookupResult {
  readonly status: RuleTextLookupStatus;
  readonly sourceTag: typeof OFFICIAL_TEXT_TRANSCRIBED;
  readonly warning: typeof RULE_TEXT_WARNING;
  readonly manualReviewRequired: boolean;
  readonly datasetVersion: typeof RULE_TEXT_DATASET_VERSION;
  readonly effectiveFrom: typeof RULE_TEXT_EFFECTIVE_FROM;
  readonly units: readonly RuleTextUnit[];
}

const VALID_SECTIONS = new Set(["2.6.1", "2.6.2", "2.6.3"]);
const VALID_TABLE_LABELS = new Set(["表一", "表二"]);
const NO_RULE_TEXT_UNITS: readonly RuleTextUnit[] = Object.freeze([]);

/** Applies the existing deterministic normalization primitives without correcting punctuation. */
function normalizeRuleTextQuery(value: string): string {
  return value.normalize("NFKC").trim().toLocaleUpperCase("en-US").replace(/\s+/g, "");
}

export function lookupRuleText(request: RuleTextLookupRequest): RuleTextLookupResult {
  if (
    typeof request !== "object" ||
    request === null ||
    typeof request.query !== "string" ||
    typeof request.as_of_date !== "string" ||
    !isIsoDate(request.as_of_date) ||
    request.as_of_date < RULE_TEXT_EFFECTIVE_FROM ||
    (request.dataset_version !== undefined && request.dataset_version !== RULE_TEXT_DATASET_VERSION)
  ) {
    return makeRuleTextResult("NOT_IN_VALIDATED_DATASET", NO_RULE_TEXT_UNITS);
  }

  const normalizedQuery = normalizeRuleTextQuery(request.query);
  if (VALID_SECTIONS.has(normalizedQuery)) {
    return makeRuleTextResult(
      "EXACT_MATCH",
      Object.freeze(RULE_TEXT_UNITS.filter((unit) => unit.section === normalizedQuery))
    );
  }

  const exactUnit = RULE_TEXT_UNITS.find((unit) => unit.unitId === normalizedQuery);
  if (exactUnit !== undefined) {
    return makeRuleTextResult("EXACT_MATCH", Object.freeze([exactUnit]));
  }

  if (VALID_TABLE_LABELS.has(normalizedQuery)) {
    return makeRuleTextResult(
      "MULTIPLE_MATCHES",
      Object.freeze(RULE_TEXT_UNITS.filter((unit) => unit.tableLabel === normalizedQuery))
    );
  }

  return makeRuleTextResult("NOT_IN_VALIDATED_DATASET", NO_RULE_TEXT_UNITS);
}

function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function makeRuleTextResult(
  status: RuleTextLookupStatus,
  units: readonly RuleTextUnit[]
): RuleTextLookupResult {
  return Object.freeze({
    status,
    sourceTag: OFFICIAL_TEXT_TRANSCRIBED,
    warning: RULE_TEXT_WARNING,
    manualReviewRequired: status !== "EXACT_MATCH",
    datasetVersion: RULE_TEXT_DATASET_VERSION,
    effectiveFrom: RULE_TEXT_EFFECTIVE_FROM,
    units
  });
}
