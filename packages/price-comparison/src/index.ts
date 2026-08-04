export const DEMO_DATA_ONLY = "DEMO_DATA_ONLY" as const;
export const PRICE_LABEL = "健保支付價" as const;
export const DEMO_WARNING = "示範資料，非健保署核定資料／不可作為申報依據。" as const;
export const DEMO_PRICE_COVERAGE_START_DATE = "2099-01-01" as const;
export const DEMO_PRICE_COVERAGE_END_DATE = "2099-12-31" as const;
export const MAX_COMPARISON_CANDIDATES = 4 as const;

export type ComparabilityStatus =
  | "DIRECTLY_COMPARABLE"
  | "CONTEXT_ONLY"
  | "INSUFFICIENT_DATA"
  | "NOT_COMPARABLE";

export type PriceStatus = "CURRENT" | "FUTURE" | "MISSING" | "STALE" | "CONFLICT";

export interface ComparabilityKey {
  readonly ingredientComposition: readonly string[] | null;
  readonly strength: string | null;
  readonly dosageForm: string | null;
  readonly route: string | null;
  readonly releaseForm: string | null;
  readonly combinationRatio: string | null;
  readonly paymentUnit: string | null;
  readonly packageQuantity: number | null;
}

export interface PriceScheduleEntry {
  readonly amountNtd: number;
  readonly effectiveFrom: string;
  readonly effectiveTo: string;
}

export interface PriceComparisonCandidate {
  readonly candidateId: string;
  readonly displayName: string;
  readonly sourceTag: typeof DEMO_DATA_ONLY;
  readonly comparabilityKey: ComparabilityKey;
  readonly prices: readonly PriceScheduleEntry[];
}

export interface DisplayPrice {
  readonly label: typeof PRICE_LABEL;
  readonly amountNtd: number;
  readonly effectiveDate: string;
  readonly effectiveTo: string;
}

export interface CandidateComparisonResult {
  readonly candidateId: string;
  readonly displayName: string;
  readonly sourceTag: typeof DEMO_DATA_ONLY;
  readonly comparability: ComparabilityStatus;
  readonly priceStatus: PriceStatus;
  readonly currentPrices: readonly DisplayPrice[];
  readonly futurePrices: readonly DisplayPrice[];
}

export interface PriceComparisonRequest {
  readonly asOfDate: string;
  readonly candidates: readonly PriceComparisonCandidate[];
}

export type PriceComparisonErrorCode =
  | "COMPARISON_LIMIT_EXCEEDED"
  | "INVALID_AS_OF_DATE"
  | "AS_OF_DATE_NOT_COVERED"
  | "INVALID_CANDIDATE_DATA";

interface PriceComparisonResultBase {
  readonly sourceTag: typeof DEMO_DATA_ONLY;
  readonly warning: typeof DEMO_WARNING;
  readonly priceLabel: typeof PRICE_LABEL;
  readonly asOfDate: string;
  readonly manualReviewRequired: boolean;
}

export interface PriceComparisonSuccess extends PriceComparisonResultBase {
  readonly ok: true;
  readonly candidates: readonly CandidateComparisonResult[];
  readonly lowestPriceOrder: readonly string[] | null;
}

export interface PriceComparisonFailure extends PriceComparisonResultBase {
  readonly ok: false;
  readonly candidates: readonly [];
  readonly lowestPriceOrder: null;
  readonly error: {
    readonly code: PriceComparisonErrorCode;
    readonly message: string;
  };
}

export type PriceComparisonResult = PriceComparisonSuccess | PriceComparisonFailure;

const COMPARABILITY_FIELDS_EXCEPT_QUANTITY = [
  "ingredientComposition",
  "strength",
  "dosageForm",
  "route",
  "releaseForm",
  "combinationRatio",
  "paymentUnit"
] as const;

const EMPTY_CANDIDATES = Object.freeze([]) as readonly [];

export function classifyComparability(
  reference: ComparabilityKey,
  candidate: ComparabilityKey
): ComparabilityStatus {
  if (hasMissingComparabilityAttribute(reference) || hasMissingComparabilityAttribute(candidate)) {
    return "INSUFFICIENT_DATA";
  }

  const nonQuantityFieldsMatch = COMPARABILITY_FIELDS_EXCEPT_QUANTITY.every((field) =>
    attributeEquals(reference[field], candidate[field])
  );
  if (!nonQuantityFieldsMatch) return "NOT_COMPARABLE";
  return reference.packageQuantity === candidate.packageQuantity
    ? "DIRECTLY_COMPARABLE"
    : "CONTEXT_ONLY";
}

export function comparePrices(request: PriceComparisonRequest): PriceComparisonResult {
  if (typeof request !== "object" || request === null || !Array.isArray(request.candidates)) {
    return failure("INVALID_CANDIDATE_DATA", "Candidate data is invalid.", "");
  }

  if (request.candidates.length > MAX_COMPARISON_CANDIDATES) {
    return failure(
      "COMPARISON_LIMIT_EXCEEDED",
      `A comparison accepts at most ${MAX_COMPARISON_CANDIDATES} candidates.`,
      typeof request.asOfDate === "string" ? request.asOfDate : ""
    );
  }

  if (typeof request.asOfDate !== "string" || !isIsoDate(request.asOfDate)) {
    return failure("INVALID_AS_OF_DATE", "The as-of date is invalid.", String(request.asOfDate ?? ""));
  }

  if (
    request.asOfDate < DEMO_PRICE_COVERAGE_START_DATE ||
    request.asOfDate > DEMO_PRICE_COVERAGE_END_DATE
  ) {
    return failure("AS_OF_DATE_NOT_COVERED", "The as-of date is outside demo coverage.", request.asOfDate);
  }

  if (!validCandidates(request.candidates)) {
    return failure("INVALID_CANDIDATE_DATA", "Candidate data is invalid.", request.asOfDate);
  }

  const referenceKey = request.candidates[0]!.comparabilityKey;
  const candidateResults = request.candidates.map((candidate: PriceComparisonCandidate) => {
    const currentEntries = candidate.prices.filter((entry: PriceScheduleEntry) =>
      isEffectiveOn(entry, request.asOfDate)
    );
    const futureEntries = candidate.prices.filter(
      (entry: PriceScheduleEntry) => entry.effectiveFrom > request.asOfDate
    );
    return Object.freeze({
      candidateId: candidate.candidateId,
      displayName: candidate.displayName,
      sourceTag: DEMO_DATA_ONLY,
      comparability: classifyComparability(referenceKey, candidate.comparabilityKey),
      priceStatus: classifyPriceStatus(candidate.prices, currentEntries, futureEntries),
      currentPrices: Object.freeze(currentEntries.map(toDisplayPrice)),
      futurePrices: Object.freeze(futureEntries.map(toDisplayPrice))
    });
  });

  const allDirectlyComparable = candidateResults.every(
    (candidate) => candidate.comparability === "DIRECTLY_COMPARABLE"
  );
  const allCurrent = candidateResults.every((candidate) => candidate.priceStatus === "CURRENT");
  const lowestPriceOrder =
    allDirectlyComparable && allCurrent
      ? Object.freeze(
          [...candidateResults]
            .sort(
              (left, right) =>
                left.currentPrices[0]!.amountNtd - right.currentPrices[0]!.amountNtd ||
                left.candidateId.localeCompare(right.candidateId, "en")
            )
            .map((candidate) => candidate.candidateId)
        )
      : null;

  return Object.freeze({
    ok: true,
    sourceTag: DEMO_DATA_ONLY,
    warning: DEMO_WARNING,
    priceLabel: PRICE_LABEL,
    asOfDate: request.asOfDate,
    manualReviewRequired: !(allDirectlyComparable && allCurrent),
    candidates: Object.freeze(candidateResults),
    lowestPriceOrder
  });
}

function hasMissingComparabilityAttribute(key: ComparabilityKey): boolean {
  return (
    !Array.isArray(key.ingredientComposition) ||
    key.ingredientComposition.length === 0 ||
    key.ingredientComposition.some(isBlankString) ||
    COMPARABILITY_FIELDS_EXCEPT_QUANTITY.slice(1).some((field) => isBlankString(key[field])) ||
    typeof key.packageQuantity !== "number" ||
    !Number.isFinite(key.packageQuantity) ||
    key.packageQuantity <= 0
  );
}

function isBlankString(value: unknown): boolean {
  return typeof value !== "string" || value.trim().length === 0;
}

function attributeEquals(left: unknown, right: unknown): boolean {
  if (Array.isArray(left) && Array.isArray(right)) {
    return left.length === right.length && left.every((value, index) => value === right[index]);
  }
  return left === right;
}

function classifyPriceStatus(
  entries: readonly PriceScheduleEntry[],
  currentEntries: readonly PriceScheduleEntry[],
  futureEntries: readonly PriceScheduleEntry[]
): PriceStatus {
  if (currentEntries.length > 1) return "CONFLICT";
  if (currentEntries.length === 1) return "CURRENT";
  if (futureEntries.length > 0) return "FUTURE";
  if (entries.length > 0) return "STALE";
  return "MISSING";
}

function validCandidates(candidates: readonly PriceComparisonCandidate[]): boolean {
  if (candidates.length === 0) return false;
  const ids = new Set<string>();
  for (const candidate of candidates) {
    if (
      typeof candidate !== "object" ||
      candidate === null ||
      typeof candidate.candidateId !== "string" ||
      candidate.candidateId.trim().length === 0 ||
      ids.has(candidate.candidateId) ||
      typeof candidate.displayName !== "string" ||
      candidate.displayName.trim().length === 0 ||
      candidate.sourceTag !== DEMO_DATA_ONLY ||
      typeof candidate.comparabilityKey !== "object" ||
      candidate.comparabilityKey === null ||
      !Array.isArray(candidate.prices) ||
      candidate.prices.some((entry) => !validPriceEntry(entry))
    ) {
      return false;
    }
    ids.add(candidate.candidateId);
  }
  return true;
}

function validPriceEntry(entry: PriceScheduleEntry): boolean {
  return (
    typeof entry === "object" &&
    entry !== null &&
    typeof entry.amountNtd === "number" &&
    Number.isFinite(entry.amountNtd) &&
    entry.amountNtd > 0 &&
    isIsoDate(entry.effectiveFrom) &&
    isIsoDate(entry.effectiveTo) &&
    entry.effectiveFrom <= entry.effectiveTo
  );
}

function isEffectiveOn(entry: PriceScheduleEntry, asOfDate: string): boolean {
  return entry.effectiveFrom <= asOfDate && entry.effectiveTo >= asOfDate;
}

function toDisplayPrice(entry: PriceScheduleEntry): DisplayPrice {
  return Object.freeze({
    label: PRICE_LABEL,
    amountNtd: entry.amountNtd,
    effectiveDate: entry.effectiveFrom,
    effectiveTo: entry.effectiveTo
  });
}

function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function failure(
  code: PriceComparisonErrorCode,
  message: string,
  asOfDate: string
): PriceComparisonFailure {
  return Object.freeze({
    ok: false,
    sourceTag: DEMO_DATA_ONLY,
    warning: DEMO_WARNING,
    priceLabel: PRICE_LABEL,
    asOfDate,
    manualReviewRequired: true,
    candidates: EMPTY_CANDIDATES,
    lowestPriceOrder: null,
    error: Object.freeze({ code, message })
  });
}

export { DEMO_PRICE_CANDIDATES } from "./fixtures";
