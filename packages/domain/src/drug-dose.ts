import { type DrugItemMasterRecord } from "./generated/drug-items-2026-08-07";

/**
 * Dose filtering exists because a clinician treats each strength as its own group:
 * atorvastatin 10mg and atorvastatin 40mg are different decisions, not one drug.
 *
 * The master's own `規格` columns cannot carry this. Measured across all 607 records:
 * `specificationAmount` and `specificationUnit` are empty on 595 of them, and the 12
 * that are populated hold pack sizes (`9`, `5`, `4.68` with unit `GM`/`ML`), not
 * strengths. The strength is stated in two other fields:
 *
 *   ingredient  "ATORVASTATIN (CALCIUM) 10 MG"      — structured, always present
 *   drugNameEn  "Atotin F.C. Tablets 10mg"          — the label strength
 *
 * Both are read and the results unioned. Measured: 524 records state a dose in both,
 * 83 in the ingredient only, 0 in the name only — 607/607 yield at least one dose, so
 * nothing has to be guessed and no record is stranded.
 *
 * The union matters for two shapes the two fields disagree on (21 records, measured):
 *
 *   salt weight vs label strength
 *     "FLUVASTATIN SODIUM 21.06 MG"  /  "LESCOL CAPSULES 20MG"
 *     "AMLODIPINE BESYLATE 6.94 MG+ATORVASTATIN CALCIUM 10.85 MG"  /  "Caduet 5mg/10mg"
 *   compounds whose name states only one component
 *     "EZETIMIBE 10 MG+SIMVASTATIN 20 MG"  /  "Agitin Tablets 10/20mg"
 *
 * Taking the union means a search for 10 mg finds Caduet 5mg/10mg (its atorvastatin
 * really is 10 mg) and a search for 20 mg finds Lescol 20mg (its label really says so).
 * Taking either field alone would drop one of those. Numbers are never rounded or
 * reconciled: 10.85 mg is what the master says, so 10.85 mg is what is offered.
 */

const DRUG_DOSE_PATTERN =
  /(\d+(?:\.\d+)?)\s*(MCG|MG|GM|ML|IU|G|%)(?:\s*\/\s*(MCG|MG|GM|ML|G))?(?![A-Z])/gi;

/**
 * Only MG and GM occur in the current master. The rest are carried because the
 * source is a general NHI item file and a later snapshot may hold them; an
 * unrecognized unit is simply not extracted rather than coerced into MG.
 */
const DOSE_UNIT_LABELS: Readonly<Record<string, string>> = Object.freeze({
  MCG: "mcg",
  MG: "mg",
  GM: "g",
  G: "g",
  ML: "ml",
  IU: "IU",
  "%": "%"
});

const DOSE_UNIT_ORDER: readonly string[] = Object.freeze(["mcg", "mg", "g", "ml", "IU", "%"]);

/** Records whose strength cannot be read are grouped here rather than dropped. */
export const DRUG_DOSE_UNSPECIFIED_KEY = "unspecified" as const;

export interface DrugDose {
  /** Normalized numeric amount. `10.00 MG` and `10mg` both give 10. */
  readonly amount: number;
  /** Normalized unit, or `mg/g` and similar where the source states a denominator. */
  readonly unit: string;
  /** Stable identity for filtering. The unit is part of it, so 4 g never matches 4 mg. */
  readonly key: string;
  /** What the clinician reads, e.g. `10 mg`. */
  readonly label: string;
}

export interface DrugDoseFacet {
  readonly key: string;
  readonly label: string;
  readonly count: number;
}

const NO_DOSES: readonly DrugDose[] = Object.freeze([]);

function normalizeUnit(unit: string, denominator: string | undefined): string | undefined {
  const numerator = DOSE_UNIT_LABELS[unit.toUpperCase()];
  if (numerator === undefined) return undefined;
  if (denominator === undefined) return numerator;
  const perUnit = DOSE_UNIT_LABELS[denominator.toUpperCase()];
  // A concentration is not a unit dose. Keeping the denominator stops
  // "CHOLESTYRAMINE 444.4 MG/GM" from being offered as a 444.4 mg tablet.
  return perUnit === undefined ? undefined : `${numerator}/${perUnit}`;
}

function makeDose(amountRaw: string, unit: string, denominator: string | undefined): DrugDose | undefined {
  const amount = Number(amountRaw);
  if (!Number.isFinite(amount)) return undefined;
  const normalizedUnit = normalizeUnit(unit, denominator);
  if (normalizedUnit === undefined) return undefined;
  const label = `${String(amount)} ${normalizedUnit}`;
  return Object.freeze({ amount, unit: normalizedUnit, key: `${String(amount)}${normalizedUnit}`, label });
}

/** Reads every `<number> <unit>` in one field. Order of appearance; duplicates collapsed. */
export function extractDosesFromText(text: string): readonly DrugDose[] {
  if (typeof text !== "string" || text.length === 0) return NO_DOSES;
  const byKey = new Map<string, DrugDose>();
  for (const match of text.matchAll(DRUG_DOSE_PATTERN)) {
    const dose = makeDose(match[1] ?? "", match[2] ?? "", match[3]);
    if (dose !== undefined && !byKey.has(dose.key)) byKey.set(dose.key, dose);
  }
  return Object.freeze([...byKey.values()]);
}

const dosesByCode = new Map<string, readonly DrugDose[]>();

/** Union of the strengths stated in the record's ingredient field and its English name. */
export function getDrugItemDoses(record: DrugItemMasterRecord): readonly DrugDose[] {
  const cached = dosesByCode.get(record.nhiCode);
  if (cached !== undefined) return cached;
  const byKey = new Map<string, DrugDose>();
  for (const dose of [
    ...extractDosesFromText(record.ingredient),
    ...extractDosesFromText(record.drugNameEn)
  ]) {
    if (!byKey.has(dose.key)) byKey.set(dose.key, dose);
  }
  const doses = Object.freeze(sortDoses([...byKey.values()]));
  dosesByCode.set(record.nhiCode, doses);
  return doses;
}

function sortDoses(doses: readonly DrugDose[]): DrugDose[] {
  return [...doses].sort((left, right) => {
    const leftRank = DOSE_UNIT_ORDER.indexOf(left.unit);
    const rightRank = DOSE_UNIT_ORDER.indexOf(right.unit);
    if (leftRank !== rightRank) {
      if (leftRank === -1) return 1;
      if (rightRank === -1) return -1;
      return leftRank - rightRank;
    }
    if (left.unit !== right.unit) return left.unit.localeCompare(right.unit);
    return left.amount - right.amount;
  });
}

/**
 * The dose options for one result set, so the list a clinician sees is exactly the
 * strengths present in what they just searched — never a fixed menu that offers
 * strengths with no matching item.
 */
export function collectDrugDoseFacets(
  records: readonly DrugItemMasterRecord[]
): readonly DrugDoseFacet[] {
  const counts = new Map<string, { dose: DrugDose; count: number }>();
  let unspecified = 0;
  for (const record of records) {
    const doses = getDrugItemDoses(record);
    if (doses.length === 0) {
      unspecified += 1;
      continue;
    }
    for (const dose of doses) {
      const entry = counts.get(dose.key);
      if (entry === undefined) counts.set(dose.key, { dose, count: 1 });
      else entry.count += 1;
    }
  }
  const facets = sortDoses([...counts.values()].map((entry) => entry.dose)).map((dose) =>
    Object.freeze({
      key: dose.key,
      label: dose.label,
      count: counts.get(dose.key)?.count ?? 0
    })
  );
  if (unspecified > 0) {
    facets.push(Object.freeze({ key: DRUG_DOSE_UNSPECIFIED_KEY, label: "", count: unspecified }));
  }
  return Object.freeze(facets);
}

/** `undefined` means no dose filter is applied and every record passes. */
export function matchesDrugDoseFilter(
  record: DrugItemMasterRecord,
  doseKey: string | undefined
): boolean {
  if (doseKey === undefined) return true;
  const doses = getDrugItemDoses(record);
  if (doseKey === DRUG_DOSE_UNSPECIFIED_KEY) return doses.length === 0;
  return doses.some((dose) => dose.key === doseKey);
}
