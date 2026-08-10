/**
 * Deterministic lookup core. It deliberately does not model a patient or make
 * benefit/eligibility decisions. Every record below is invented demonstration data.
 */
export const DEMO_DATA_ONLY = "DEMO_DATA_ONLY" as const;
export const DEMO_DATASET_VERSION = "2026.08.01-demo.1";
export const DEMO_DATASET_AS_OF_DATE = "2026-08-01";
export const DEMO_DATASET_COVERAGE_START_DATE = "2026-08-01";
export const DEMO_DATASET_COVERAGE_END_DATE = "2026-08-31";
export const DEMO_WARNING = "示範資料，非健保署核定資料／不可作為申報依據。";
export const DEMO_COVERAGE_WARNING =
  "示範資料，非健保署核定資料／不可作為申報依據。查詢日期超出示範資料版本有效範圍（2026-08-01 至 2026-08-31），未提供藥品或示範價格。";

export type LookupStatus =
  | "EXACT_MATCH"
  | "MULTIPLE_MATCHES"
  | "NOT_FOUND"
  | "NOT_IN_VALIDATED_DATASET";

export type QueryKind = "NHI_CODE" | "NAME";

export interface MedicationRecord {
  readonly nhiCode: string;
  readonly brandName: string;
  readonly genericName: string;
  readonly ingredients: readonly string[];
  readonly strength: string;
  readonly dosageForm: string;
  readonly demoPaymentPriceNtd: number;
  readonly priceAsOfDate: string;
  readonly validFrom: string;
  readonly validTo: string;
  readonly datasetVersion: string;
  readonly dataStatus: typeof DEMO_DATA_ONLY;
}

export interface LookupInput {
  readonly query: string;
  readonly asOfDate?: string;
  readonly datasetVersion?: string;
}

export interface LookupResult {
  readonly status: LookupStatus;
  readonly queryKind: QueryKind;
  readonly normalizedQuery: string;
  readonly asOfDate: string;
  readonly datasetVersion: string;
  readonly dataStatus: typeof DEMO_DATA_ONLY;
  readonly priceDataStatus: typeof DEMO_DATA_ONLY;
  readonly manualReviewRequired: boolean;
  readonly warning: typeof DEMO_WARNING | typeof DEMO_COVERAGE_WARNING;
  readonly candidates: readonly MedicationRecord[];
}

export interface DatasetMeta {
  readonly dataStatus: typeof DEMO_DATA_ONLY;
  readonly datasetVersion: string;
  readonly asOfDate: string;
  readonly coverageStartDate: string;
  readonly coverageEndDate: string;
  readonly warning: typeof DEMO_WARNING;
  readonly recordCount: number;
}

export const NHI_CODE_SURFACE_FORMAT = /^[A-Z0-9]{10}$/;

const demoRecords: readonly MedicationRecord[] = [
  {
    nhiCode: "D3M0A00001",
    brandName: "CardioDemo Atorva 20",
    genericName: "Atorvastatin 20 mg",
    ingredients: ["Atorvastatin calcium"],
    strength: "20 mg",
    dosageForm: "film-coated tablet",
    demoPaymentPriceNtd: 12.34,
    priceAsOfDate: DEMO_DATASET_AS_OF_DATE,
    validFrom: DEMO_DATASET_COVERAGE_START_DATE,
    validTo: DEMO_DATASET_COVERAGE_END_DATE,
    datasetVersion: DEMO_DATASET_VERSION,
    dataStatus: DEMO_DATA_ONLY
  },
  {
    nhiCode: "D3M0A00002",
    brandName: "CardioDemo Atorva 40",
    genericName: "Atorvastatin 40 mg",
    ingredients: ["Atorvastatin calcium"],
    strength: "40 mg",
    dosageForm: "film-coated tablet",
    demoPaymentPriceNtd: 18.76,
    priceAsOfDate: DEMO_DATASET_AS_OF_DATE,
    validFrom: DEMO_DATASET_COVERAGE_START_DATE,
    validTo: DEMO_DATASET_COVERAGE_END_DATE,
    datasetVersion: DEMO_DATASET_VERSION,
    dataStatus: DEMO_DATA_ONLY
  },
  {
    nhiCode: "D3M0B00001",
    brandName: "CardioDemo Rosu 10",
    genericName: "Rosuvastatin 10 mg",
    ingredients: ["Rosuvastatin calcium"],
    strength: "10 mg",
    dosageForm: "film-coated tablet",
    demoPaymentPriceNtd: 15.5,
    priceAsOfDate: DEMO_DATASET_AS_OF_DATE,
    validFrom: DEMO_DATASET_COVERAGE_START_DATE,
    validTo: DEMO_DATASET_COVERAGE_END_DATE,
    datasetVersion: DEMO_DATASET_VERSION,
    dataStatus: DEMO_DATA_ONLY
  }
];

/** Applies only approved code normalization: NFKC, trim, uppercase, spaces and hyphens. */
export function normalizeNhiCode(value: string): string {
  return value.normalize("NFKC").trim().toUpperCase().replace(/[\s-]/g, "");
}

/** Keeps dose and dosage-form terms; normalization must never discard clinical product detail. */
export function normalizeMedicationName(value: string): string {
  return value.normalize("NFKC").trim().toLocaleLowerCase("en-US").replace(/\s+/g, " ");
}

export function isNhiCodeSurfaceFormat(value: string): boolean {
  return NHI_CODE_SURFACE_FORMAT.test(value);
}

export function getDatasetMeta(): DatasetMeta {
  return {
    dataStatus: DEMO_DATA_ONLY,
    datasetVersion: DEMO_DATASET_VERSION,
    asOfDate: DEMO_DATASET_AS_OF_DATE,
    coverageStartDate: DEMO_DATASET_COVERAGE_START_DATE,
    coverageEndDate: DEMO_DATASET_COVERAGE_END_DATE,
    warning: DEMO_WARNING,
    recordCount: demoRecords.length
  };
}

export function lookupMedication(input: LookupInput): LookupResult {
  const normalizedCode = normalizeNhiCode(input.query);
  const queryKind: QueryKind = isNhiCodeSurfaceFormat(normalizedCode) ? "NHI_CODE" : "NAME";
  const normalizedQuery = queryKind === "NHI_CODE" ? normalizedCode : normalizeMedicationName(input.query);
  const asOfDate = input.asOfDate ?? DEMO_DATASET_AS_OF_DATE;
  const datasetVersion = input.datasetVersion ?? DEMO_DATASET_VERSION;

  if (!isIsoDate(asOfDate) || datasetVersion !== DEMO_DATASET_VERSION) {
    return makeResult({
      status: "NOT_IN_VALIDATED_DATASET",
      queryKind,
      normalizedQuery,
      asOfDate,
      datasetVersion,
      candidates: []
    });
  }

  if (!isWithinDatasetCoverage(asOfDate)) {
    return makeResult({
      status: "NOT_IN_VALIDATED_DATASET",
      queryKind,
      normalizedQuery,
      asOfDate,
      datasetVersion,
      candidates: [],
      warning: DEMO_COVERAGE_WARNING
    });
  }

  if (queryKind === "NHI_CODE") {
    const record = demoRecords.find((candidate) => candidate.nhiCode === normalizedCode);
    if (!record || !isRecordValidOn(record, asOfDate)) {
      return makeResult({
        status: "NOT_IN_VALIDATED_DATASET",
        queryKind,
        normalizedQuery,
        asOfDate,
        datasetVersion,
        candidates: []
      });
    }

    return makeResult({
      status: "EXACT_MATCH",
      queryKind,
      normalizedQuery,
      asOfDate,
      datasetVersion,
      candidates: [record]
    });
  }

  if (normalizedQuery.length === 0) {
    return makeResult({
      status: "NOT_FOUND",
      queryKind,
      normalizedQuery,
      asOfDate,
      datasetVersion,
      candidates: []
    });
  }

  const candidates = demoRecords.filter(
    (record) => isRecordValidOn(record, asOfDate) && recordMatchesName(record, normalizedQuery)
  );
  const status: LookupStatus =
    candidates.length === 0 ? "NOT_FOUND" : candidates.length === 1 ? "EXACT_MATCH" : "MULTIPLE_MATCHES";

  return makeResult({
    status,
    queryKind,
    normalizedQuery,
    asOfDate,
    datasetVersion,
    candidates
  });
}

function recordMatchesName(record: MedicationRecord, normalizedQuery: string): boolean {
  const searchableValues = [record.brandName, record.genericName, ...record.ingredients].map(normalizeMedicationName);
  return searchableValues.some(
    (value) => value === normalizedQuery || value.includes(normalizedQuery) || normalizedQuery.includes(value)
  );
}

function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function isRecordValidOn(record: MedicationRecord, asOfDate: string): boolean {
  return asOfDate >= record.validFrom && asOfDate <= record.validTo;
}

function isWithinDatasetCoverage(asOfDate: string): boolean {
  return asOfDate >= DEMO_DATASET_COVERAGE_START_DATE && asOfDate <= DEMO_DATASET_COVERAGE_END_DATE;
}

function makeResult(input: {
  status: LookupStatus;
  queryKind: QueryKind;
  normalizedQuery: string;
  asOfDate: string;
  datasetVersion: string;
  candidates: readonly MedicationRecord[];
  warning?: LookupResult["warning"];
}): LookupResult {
  return {
    ...input,
    dataStatus: DEMO_DATA_ONLY,
    priceDataStatus: DEMO_DATA_ONLY,
    manualReviewRequired: input.status !== "EXACT_MATCH",
    warning: input.warning ?? DEMO_WARNING
  };
}
export * from "./rule-text-lookup";
export * from "./item-lookup";
export * from "./drug-item-lookup";
export * from "./drug-item-integration";
export * from "./rule-drug-identification";
