import {
  DRUG_ITEMS_DATASET_EFFECTIVE_FROM,
  DRUG_ITEMS_DATASET_EFFECTIVE_TO,
  DRUG_ITEMS_DATASET_VERSION,
  DRUG_ITEM_MASTER_RECORDS,
  type DrugItemMasterPricePeriod,
  type DrugItemMasterRecord
} from "./generated/drug-items-2026-08-07";

export type {
  DrugItemMasterPricePeriod,
  DrugItemMasterRecord
} from "./generated/drug-items-2026-08-07";
export {
  DRUG_ITEMS_DATASET_EFFECTIVE_FROM,
  DRUG_ITEMS_DATASET_EFFECTIVE_TO,
  DRUG_ITEMS_DATASET_VERSION,
  DRUG_ITEM_MASTER_RECORDS
} from "./generated/drug-items-2026-08-07";

export const DRUG_ITEM_MASTER_SOURCE_TAG = "OFFICIAL_TEXT_TRANSCRIBED" as const;
export const DRUG_ITEM_MASTER_WARNING =
  "官方公告之逐字轉錄(健保用藥品項查詢項目檔,政府資料開放平臺);本工具非健保署系統,查詢結果不可作為申報依據,實際品項、價格與給付規定以健保署公告為準。" as const;

export type DrugItemMasterLookupStatus =
  | "EXACT_MATCH"
  | "MULTIPLE_MATCHES"
  | "NOT_IN_VALIDATED_DATASET";

export interface DrugItemMasterLookupRequest {
  readonly query: string;
  readonly as_of_date: string;
  readonly dataset_version?: string;
}

export interface DrugItemMasterMatch {
  readonly item: DrugItemMasterRecord;
  readonly applicablePricePeriod: DrugItemMasterPricePeriod;
}

/** EXACT_MATCH means only that the item and one price period exist for the requested date. */
export interface DrugItemMasterLookupResult {
  readonly status: DrugItemMasterLookupStatus;
  readonly sourceTag: typeof DRUG_ITEM_MASTER_SOURCE_TAG;
  readonly warning: typeof DRUG_ITEM_MASTER_WARNING;
  readonly manualReviewRequired: boolean;
  readonly datasetVersion: typeof DRUG_ITEMS_DATASET_VERSION;
  readonly effectiveFrom: typeof DRUG_ITEMS_DATASET_EFFECTIVE_FROM;
  readonly effectiveTo: typeof DRUG_ITEMS_DATASET_EFFECTIVE_TO;
  readonly asOfDate: string;
  readonly matches: readonly DrugItemMasterMatch[];
  /**
   * Items that matched the query but whose payment price for the requested date is
   * 0.00, and so were left out. Reported rather than silently dropped: a clinician
   * who typed a valid code and got nothing would otherwise assume a typo.
   */
  readonly excludedZeroPriceCount: number;
}

const NO_DRUG_ITEM_MASTER_MATCHES: readonly DrugItemMasterMatch[] = Object.freeze([]);
const NHI_CODE_SURFACE_FORMAT = /^[A-Z0-9]{10}$/;

/**
 * 370 of the 607 master records carry 0.00 as their final, open-ended price period,
 * following a real earlier price — the master is a full historical item file, not a
 * list of currently-reimbursed items. Those rows answer no question a clinician is
 * asking, so lookups leave them out.
 *
 * The parse is deliberately strict: anything that is not a finite number is kept,
 * because dropping a row we failed to understand would hide a real item.
 */
function hasZeroPaymentPrice(period: DrugItemMasterPricePeriod): boolean {
  const parsed = Number(period.paymentPriceRaw.trim());
  return Number.isFinite(parsed) && parsed === 0;
}

function normalizeDrugItemMasterCode(value: string): string {
  return value.normalize("NFKC").trim().toUpperCase().replace(/[\s-]/g, "");
}

function normalizeDrugItemMasterName(value: string): string {
  return value.normalize("NFKC").trim().toLocaleLowerCase("en-US").replace(/\s+/g, " ");
}

function itemMatchesName(record: DrugItemMasterRecord, normalizedQuery: string): boolean {
  return [record.drugNameZh, record.drugNameEn, record.ingredient]
    .map(normalizeDrugItemMasterName)
    .some((value) => value.includes(normalizedQuery));
}

/** Returns a period only when exactly one interval covers the requested date. */
export function selectDrugItemMasterPricePeriod(
  priceHistory: readonly DrugItemMasterPricePeriod[],
  asOfDate: string
): DrugItemMasterPricePeriod | undefined {
  const applicable = priceHistory.filter(
    (period) => period.startDateIso <= asOfDate && asOfDate <= period.endDateIso
  );
  return applicable.length === 1 ? applicable[0] : undefined;
}

export function lookupDrugItemMaster(
  request: DrugItemMasterLookupRequest
): DrugItemMasterLookupResult {
  if (
    typeof request !== "object" ||
    request === null ||
    typeof request.query !== "string" ||
    typeof request.as_of_date !== "string" ||
    !isIsoDate(request.as_of_date) ||
    request.as_of_date > DRUG_ITEMS_DATASET_EFFECTIVE_TO ||
    (request.dataset_version !== undefined &&
      request.dataset_version !== DRUG_ITEMS_DATASET_VERSION)
  ) {
    return makeDrugItemMasterResult(
      "NOT_IN_VALIDATED_DATASET",
      typeof request?.as_of_date === "string" ? request.as_of_date : "",
      NO_DRUG_ITEM_MASTER_MATCHES
    );
  }

  const normalizedCode = normalizeDrugItemMasterCode(request.query);
  let candidates: readonly DrugItemMasterRecord[];
  if (NHI_CODE_SURFACE_FORMAT.test(normalizedCode)) {
    const exactItem = DRUG_ITEM_MASTER_RECORDS.find((item) => item.nhiCode === normalizedCode);
    candidates = exactItem === undefined ? [] : [exactItem];
  } else {
    const normalizedQuery = normalizeDrugItemMasterName(request.query);
    if (normalizedQuery.length === 0) {
      return makeDrugItemMasterResult(
        "NOT_IN_VALIDATED_DATASET",
        request.as_of_date,
        NO_DRUG_ITEM_MASTER_MATCHES
      );
    }
    candidates = DRUG_ITEM_MASTER_RECORDS.filter((item) =>
      itemMatchesName(item, normalizedQuery)
    );
  }

  let excludedZeroPriceCount = 0;
  const matches = Object.freeze(
    candidates.flatMap((item) => {
      const applicablePricePeriod = selectDrugItemMasterPricePeriod(
        item.priceHistory,
        request.as_of_date
      );
      if (applicablePricePeriod === undefined) return [];
      if (hasZeroPaymentPrice(applicablePricePeriod)) {
        excludedZeroPriceCount += 1;
        return [];
      }
      return [Object.freeze({ item, applicablePricePeriod })];
    })
  );
  if (matches.length === 0) {
    return makeDrugItemMasterResult(
      "NOT_IN_VALIDATED_DATASET",
      request.as_of_date,
      NO_DRUG_ITEM_MASTER_MATCHES,
      excludedZeroPriceCount
    );
  }
  return makeDrugItemMasterResult(
    matches.length === 1 ? "EXACT_MATCH" : "MULTIPLE_MATCHES",
    request.as_of_date,
    matches,
    excludedZeroPriceCount
  );
}

function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function makeDrugItemMasterResult(
  status: DrugItemMasterLookupStatus,
  asOfDate: string,
  matches: readonly DrugItemMasterMatch[],
  excludedZeroPriceCount = 0
): DrugItemMasterLookupResult {
  return Object.freeze({
    status,
    sourceTag: DRUG_ITEM_MASTER_SOURCE_TAG,
    warning: DRUG_ITEM_MASTER_WARNING,
    manualReviewRequired: status !== "EXACT_MATCH",
    datasetVersion: DRUG_ITEMS_DATASET_VERSION,
    effectiveFrom: DRUG_ITEMS_DATASET_EFFECTIVE_FROM,
    effectiveTo: DRUG_ITEMS_DATASET_EFFECTIVE_TO,
    asOfDate,
    matches,
    excludedZeroPriceCount
  });
}
