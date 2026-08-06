import {
  DRUG_ITEMS_DATASET_EFFECTIVE_FROM,
  DRUG_ITEMS_DATASET_EFFECTIVE_TO,
  DRUG_ITEMS_DATASET_VERSION,
  DRUG_ITEM_MASTER_RECORDS,
  type DrugItemMasterPricePeriod,
  type DrugItemMasterRecord
} from "./generated/drug-items-2026-08-06";

export type {
  DrugItemMasterPricePeriod,
  DrugItemMasterRecord
} from "./generated/drug-items-2026-08-06";
export {
  DRUG_ITEMS_DATASET_EFFECTIVE_FROM,
  DRUG_ITEMS_DATASET_EFFECTIVE_TO,
  DRUG_ITEMS_DATASET_VERSION,
  DRUG_ITEM_MASTER_RECORDS
} from "./generated/drug-items-2026-08-06";

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
}

const NO_DRUG_ITEM_MASTER_MATCHES: readonly DrugItemMasterMatch[] = Object.freeze([]);
const NHI_CODE_SURFACE_FORMAT = /^[A-Z0-9]{10}$/;

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

  const matches = Object.freeze(
    candidates.flatMap((item) => {
      const applicablePricePeriod = selectDrugItemMasterPricePeriod(
        item.priceHistory,
        request.as_of_date
      );
      return applicablePricePeriod === undefined
        ? []
        : [Object.freeze({ item, applicablePricePeriod })];
    })
  );
  if (matches.length === 0) {
    return makeDrugItemMasterResult(
      "NOT_IN_VALIDATED_DATASET",
      request.as_of_date,
      NO_DRUG_ITEM_MASTER_MATCHES
    );
  }
  return makeDrugItemMasterResult(
    matches.length === 1 ? "EXACT_MATCH" : "MULTIPLE_MATCHES",
    request.as_of_date,
    matches
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
  matches: readonly DrugItemMasterMatch[]
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
    matches
  });
}
