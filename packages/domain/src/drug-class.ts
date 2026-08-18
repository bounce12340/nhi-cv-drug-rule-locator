import {
  DRUG_ITEMS_DATASET_EFFECTIVE_FROM,
  DRUG_ITEMS_DATASET_EFFECTIVE_TO,
  DRUG_ITEMS_DATASET_VERSION,
  DRUG_ITEM_MASTER_RECORDS,
  type DrugItemMasterRecord
} from "./generated/drug-items-2026-08-07";
import {
  selectDrugItemMasterPricePeriod,
  type DrugItemMasterMatch
} from "./drug-item-lookup";

/**
 * Groups master items by the drug class the announcement's prescribing rules name,
 * so the risk-tier screen can list what a tier's rule is talking about.
 *
 * This decides nothing clinical. It does not rank items, pick one, or say which
 * counts as "中至高強度" — the rule states an intensity, the master does not record
 * one, and inventing the mapping would be the tool making a prescribing decision.
 * All it does is sort items by whether their ingredient names a statin or ezetimibe.
 */

export type LipidDrugClass = "statin" | "ezetimibe" | "other";

/**
 * The rules also name PCSK9 單株抗體, siRNA and ATP citrate lyase 抑制劑. The master
 * holds **no record of any of them** — measured, and asserted in the tests. Any
 * listing therefore covers only part of what the rule mentions, and the screen has
 * to say so rather than letting the list read as the complete set.
 */
export const LIPID_CLASSES_ABSENT_FROM_MASTER: readonly string[] = Object.freeze([
  "PCSK9",
  "siRNA",
  "ATP citrate lyase"
]);

/**
 * Exact substring on the ingredient field, uppercased — no stemming and no fuzzy
 * match. All 396 hits for STATIN are the seven real statins (atorva, fluva, lova,
 * pitava, prava, rosuva, simva); a test pins that, so a future snapshot that
 * introduced an unrelated ingredient ending in -statin could not slip in.
 */
export function getLipidDrugClasses(record: DrugItemMasterRecord): readonly LipidDrugClass[] {
  const ingredient = record.ingredient.toUpperCase();
  const classes: LipidDrugClass[] = [];
  if (ingredient.includes("STATIN")) classes.push("statin");
  if (ingredient.includes("EZETIMIBE")) classes.push("ezetimibe");
  return Object.freeze(classes.length === 0 ? ["other"] : classes);
}

/**
 * The generic names a record's ingredient states, e.g. ["SIMVASTATIN", "EZETIMIBE"]
 * for a compound. Same exact-substring rule as the class, so it invents no name the
 * ingredient field does not carry. Used to break a 396-item class into groups a
 * clinician can actually work through.
 */
export function getLipidDrugGenerics(record: DrugItemMasterRecord): readonly string[] {
  const found = record.ingredient.toUpperCase().matchAll(/[A-Z]+STATIN|EZETIMIBE/gu);
  return Object.freeze([...new Set([...found].map((match) => match[0]))]);
}

export interface LipidDrugClassListing {
  readonly status: "OK" | "NOT_IN_VALIDATED_DATASET";
  readonly asOfDate: string;
  readonly datasetVersion: typeof DRUG_ITEMS_DATASET_VERSION;
  readonly matches: readonly DrugItemMasterMatch[];
  /** Items of this class whose price for the requested date is 0.00, left out. */
  readonly excludedZeroPriceCount: number;
  /** How many items each class would list on this date, for the filter chips. */
  readonly counts: Readonly<Record<LipidDrugClass, number>>;
  /** Item count per generic name within the requested class, most first. */
  readonly generics: readonly { readonly name: string; readonly count: number }[];
}

const NO_MATCHES: readonly DrugItemMasterMatch[] = Object.freeze([]);
const NO_COUNTS: Readonly<Record<LipidDrugClass, number>> = Object.freeze({
  statin: 0,
  ezetimibe: 0,
  other: 0
});
const NO_GENERICS: readonly { readonly name: string; readonly count: number }[] = Object.freeze([]);

function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value));
}

/** Same rule as the drug lookup: a 0.00 price for the requested date is left out. */
function hasZeroPaymentPrice(raw: string): boolean {
  const parsed = Number(raw.trim());
  return Number.isFinite(parsed) && parsed === 0;
}

/**
 * Lists the master items of one class that carry a price on the requested date.
 *
 * Fails closed exactly as the lookup does: an invalid or out-of-range date returns
 * NOT_IN_VALIDATED_DATASET rather than the nearest data.
 */
export function listLipidDrugItems(request: {
  readonly drugClass: LipidDrugClass;
  readonly asOfDate: string;
}): LipidDrugClassListing {
  const { drugClass, asOfDate } = request;
  if (
    typeof asOfDate !== "string" ||
    !isIsoDate(asOfDate) ||
    asOfDate < DRUG_ITEMS_DATASET_EFFECTIVE_FROM ||
    asOfDate > DRUG_ITEMS_DATASET_EFFECTIVE_TO
  ) {
    return Object.freeze({
      status: "NOT_IN_VALIDATED_DATASET",
      asOfDate: typeof asOfDate === "string" ? asOfDate : "",
      datasetVersion: DRUG_ITEMS_DATASET_VERSION,
      matches: NO_MATCHES,
      excludedZeroPriceCount: 0,
      counts: NO_COUNTS,
      generics: NO_GENERICS
    });
  }

  const matches: DrugItemMasterMatch[] = [];
  const counts: Record<LipidDrugClass, number> = { statin: 0, ezetimibe: 0, other: 0 };
  const generics = new Map<string, number>();
  let excludedZeroPriceCount = 0;

  for (const item of DRUG_ITEM_MASTER_RECORDS) {
    const period = selectDrugItemMasterPricePeriod(item.priceHistory, asOfDate);
    if (period === undefined) continue;
    const classes = getLipidDrugClasses(item);
    if (hasZeroPaymentPrice(period.paymentPriceRaw)) {
      if (classes.includes(drugClass)) excludedZeroPriceCount += 1;
      continue;
    }
    for (const name of classes) counts[name] += 1;
    if (!classes.includes(drugClass)) continue;
    matches.push(Object.freeze({ item, applicablePricePeriod: period }));
    // Only the generics belonging to the class being listed, so a compound's
    // EZETIMIBE does not appear as a group under 中 statin and the group counts
    // add up to the class count instead of double-counting the 19 compounds.
    for (const generic of getLipidDrugGenerics(item)) {
      const belongs = generic.includes("STATIN") ? "statin" : "ezetimibe";
      if (belongs !== drugClass) continue;
      generics.set(generic, (generics.get(generic) ?? 0) + 1);
    }
  }

  return Object.freeze({
    status: "OK",
    asOfDate,
    datasetVersion: DRUG_ITEMS_DATASET_VERSION,
    matches: Object.freeze(matches),
    excludedZeroPriceCount,
    counts: Object.freeze(counts),
    generics: Object.freeze(
      [...generics]
        .map(([name, count]) => Object.freeze({ name, count }))
        .sort((left, right) => right.count - left.count || left.name.localeCompare(right.name, "en"))
    )
  });
}
