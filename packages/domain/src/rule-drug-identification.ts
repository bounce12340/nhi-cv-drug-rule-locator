import {
  DRUG_ITEM_MASTER_RECORDS,
  type DrugItemMasterRecord
} from "./drug-item-lookup";

const NHI_CODE_SURFACE_FORMAT = /^[A-Z0-9]{10}$/;

export type RuleDrugMasterIdentification = Readonly<{
  nhiCode: string;
  masterItem: DrugItemMasterRecord | undefined;
}>;

/**
 * Extracts only exact, case-sensitive NHI-code surfaces from verbatim text.
 * Non-alphanumeric separators are boundaries; no normalization or correction is applied.
 */
export function extractNhiCodesFromVerbatimText(verbatimText: string): readonly string[] {
  const seen = new Set<string>();
  const codes: string[] = [];

  for (const token of verbatimText.match(/[A-Za-z0-9]+/g) ?? []) {
    if (!NHI_CODE_SURFACE_FORMAT.test(token) || seen.has(token)) continue;
    seen.add(token);
    codes.push(token);
  }

  return Object.freeze(codes);
}

/** Deduplicates exact codes across verbatim units while preserving first appearance order. */
export function extractNhiCodesFromVerbatimTexts(
  verbatimTexts: readonly string[]
): readonly string[] {
  const seen = new Set<string>();
  const codes: string[] = [];

  for (const verbatimText of verbatimTexts) {
    for (const nhiCode of extractNhiCodesFromVerbatimText(verbatimText)) {
      if (seen.has(nhiCode)) continue;
      seen.add(nhiCode);
      codes.push(nhiCode);
    }
  }

  return Object.freeze(codes);
}

/** Resolves each detected code against the drug master only, without interpreting nearby text. */
export function identifyRuleDrugMasterRecords(
  verbatimTexts: readonly string[]
): readonly RuleDrugMasterIdentification[] {
  return Object.freeze(
    extractNhiCodesFromVerbatimTexts(verbatimTexts).map((nhiCode) =>
      Object.freeze({
        nhiCode,
        masterItem: DRUG_ITEM_MASTER_RECORDS.find((item) => item.nhiCode === nhiCode)
      })
    )
  );
}
