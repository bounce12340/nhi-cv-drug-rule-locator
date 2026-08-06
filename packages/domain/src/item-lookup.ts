import {
  ITEM_DATASET_EFFECTIVE_FROM,
  ITEM_DATASET_VERSION,
  ITEM_RECORDS,
  type DrugItemRecord
} from "./generated/items-2026-09-01";

export type { DrugItemRecord } from "./generated/items-2026-09-01";
export {
  ITEM_DATASET_EFFECTIVE_FROM,
  ITEM_DATASET_VERSION,
  ITEM_RECORDS
} from "./generated/items-2026-09-01";

export const ITEM_SOURCE_TAG = "OFFICIAL_TEXT_TRANSCRIBED" as const;
export const ITEM_WARNING =
  "官方公告之逐字轉錄(2026-09-01 生效),經保真驗證;價格欄為該公告「藥品已收載品目異動明細表」所載原支付價與初核價格,僅涵蓋本次異動品項,非完整支付價主檔;本工具非健保署系統,查詢結果不可作為申報依據,實際規定與價格以健保署公告為準。" as const;

export type DrugItemLookupStatus =
  | "EXACT_MATCH"
  | "MULTIPLE_MATCHES"
  | "NOT_IN_VALIDATED_DATASET";

export interface DrugItemLookupRequest {
  readonly query: string;
  readonly as_of_date: string;
  readonly dataset_version?: string;
}

/** EXACT_MATCH only identifies record presence in the loaded dataset. */
export interface DrugItemLookupResult {
  readonly status: DrugItemLookupStatus;
  readonly sourceTag: typeof ITEM_SOURCE_TAG;
  readonly warning: typeof ITEM_WARNING;
  readonly manualReviewRequired: boolean;
  readonly datasetVersion: typeof ITEM_DATASET_VERSION;
  readonly effectiveFrom: typeof ITEM_DATASET_EFFECTIVE_FROM;
  readonly items: readonly DrugItemRecord[];
}

const NO_DRUG_ITEMS: readonly DrugItemRecord[] = Object.freeze([]);
const NHI_CODE_SURFACE_FORMAT = /^[A-Z0-9]{10}$/;

function normalizeItemCode(value: string): string {
  return value.normalize("NFKC").trim().toUpperCase().replace(/[\s-]/g, "");
}

function normalizeItemName(value: string): string {
  return value.normalize("NFKC").trim().toLocaleLowerCase("en-US").replace(/\s+/g, " ");
}

function itemMatchesName(record: DrugItemRecord, normalizedQuery: string): boolean {
  const searchableValues = [record.drugNameEn, record.ingredient, record.ingredientCategory]
    .filter((value): value is string => value !== undefined)
    .map(normalizeItemName);
  return searchableValues.some((value) => value.includes(normalizedQuery));
}

export function lookupDrugItem(request: DrugItemLookupRequest): DrugItemLookupResult {
  if (
    typeof request !== "object" ||
    request === null ||
    typeof request.query !== "string" ||
    typeof request.as_of_date !== "string" ||
    !isIsoDate(request.as_of_date) ||
    request.as_of_date < ITEM_DATASET_EFFECTIVE_FROM ||
    (request.dataset_version !== undefined && request.dataset_version !== ITEM_DATASET_VERSION)
  ) {
    return makeDrugItemResult("NOT_IN_VALIDATED_DATASET", NO_DRUG_ITEMS);
  }

  const normalizedCode = normalizeItemCode(request.query);
  if (NHI_CODE_SURFACE_FORMAT.test(normalizedCode)) {
    const exactItem = ITEM_RECORDS.find((item) => item.nhiCode === normalizedCode);
    return exactItem === undefined
      ? makeDrugItemResult("NOT_IN_VALIDATED_DATASET", NO_DRUG_ITEMS)
      : makeDrugItemResult("EXACT_MATCH", Object.freeze([exactItem]));
  }

  const normalizedQuery = normalizeItemName(request.query);
  if (normalizedQuery.length === 0) {
    return makeDrugItemResult("NOT_IN_VALIDATED_DATASET", NO_DRUG_ITEMS);
  }

  const items = Object.freeze(
    ITEM_RECORDS.filter((item) => itemMatchesName(item, normalizedQuery))
  );
  if (items.length === 0) {
    return makeDrugItemResult("NOT_IN_VALIDATED_DATASET", NO_DRUG_ITEMS);
  }
  return makeDrugItemResult(items.length === 1 ? "EXACT_MATCH" : "MULTIPLE_MATCHES", items);
}

function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function makeDrugItemResult(
  status: DrugItemLookupStatus,
  items: readonly DrugItemRecord[]
): DrugItemLookupResult {
  return Object.freeze({
    status,
    sourceTag: ITEM_SOURCE_TAG,
    warning: ITEM_WARNING,
    manualReviewRequired: status !== "EXACT_MATCH",
    datasetVersion: ITEM_DATASET_VERSION,
    effectiveFrom: ITEM_DATASET_EFFECTIVE_FROM,
    items
  });
}

