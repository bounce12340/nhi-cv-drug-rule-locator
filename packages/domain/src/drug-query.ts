import { type DrugItemAnnouncementFilter } from "./drug-item-integration";

/**
 * Reads one free-text box into the controls the screen already has: a name search,
 * a dose, a repriced/not-repriced filter and an as-of date. `atorvastatin 40mg
 * 這次調價的` becomes all four in one action instead of three.
 *
 * Two properties make this safe to put in front of a clinician:
 *
 * 1. **Nothing is dropped.** Every character of the input ends up either in a
 *    recognized facet or in the text handed to the name search. A word this file
 *    does not understand is searched for, not discarded — so the parser can never
 *    silently narrow a result set.
 * 2. **Nothing is hidden.** Each facet carries the exact substring it came from, so
 *    the screen can show what it understood and the clinician can overrule it.
 *
 * It resolves nothing about a patient and reaches no conclusion. It only decides
 * which of the existing controls a typed word was meant for.
 */

export type DrugQueryFacetKind = "dose" | "announcement" | "date" | "ignored";

export interface DrugQueryFacet {
  readonly kind: DrugQueryFacetKind;
  /** Exactly the characters the clinician typed, so the screen can quote them back. */
  readonly raw: string;
  /** The resolved value: a dose key, a filter name, or an ISO date. */
  readonly value: string;
  /** How the value reads on screen. Differs from `value` only for a dose: `40 mg` vs `40mg`. */
  readonly label: string;
}

export interface ParsedDrugQuery {
  /** What the name search receives — the input minus every recognized facet. */
  readonly searchText: string;
  readonly facets: readonly DrugQueryFacet[];
  readonly doseKey: string | undefined;
  readonly doseLabel: string | undefined;
  readonly announcementFilter: DrugItemAnnouncementFilter | undefined;
  readonly asOfDate: string | undefined;
}

export interface DrugQueryParseOptions {
  /** Resolves 今天/today. Passed in so this module never reads a clock. */
  readonly today: string;
  /** Resolves 新制/生效日. */
  readonly announcementDate: string;
}

interface Span {
  readonly start: number;
  readonly end: number;
  readonly facet: DrugQueryFacet;
}

const DOSE_UNITS: Readonly<Record<string, string>> = Object.freeze({
  mcg: "mcg",
  mg: "mg",
  gm: "g",
  g: "g",
  ml: "ml",
  iu: "IU",
  毫克: "mg",
  公絲: "mg",
  公克: "g"
});

/**
 * Mirrors `drug-dose.ts` so a parsed dose key is the same key the facet list uses.
 * A concentration keeps its denominator there; here a bare `444.4 mg/g` typed by
 * hand is rare enough that the numerator alone would be a guess, so `/unit` is read
 * too rather than silently dropped.
 */
const DOSE_PATTERN =
  /(\d+(?:\.\d+)?)\s*(mcg|mg|gm|ml|iu|g|毫克|公絲|公克)(?:\s*\/\s*(mcg|mg|gm|ml|g|毫克|公絲|公克))?(?![a-z])/giu;

/** ROC years are 2–3 digits and 1911 behind: 115/9/1 is 2026-09-01. */
const ROC_DATE_PATTERN = /(?<![\d/.-])(\d{2,3})[/.-](\d{1,2})[/.-](\d{1,2})(?![\d/.-])/gu;
const ISO_DATE_PATTERN = /(?<![\d-])(\d{4})-(\d{2})-(\d{2})(?![\d-])/gu;
/**
 * A bare month/day. The negative lookahead keeps it away from a compound strength:
 * `10/20mg` is ezetimibe 10 with simvastatin 20, not the twentieth of October.
 */
const MONTH_DAY_PATTERN =
  /(?<![\d/.-])(\d{1,2})[/.](\d{1,2})(?![\d/.-])(?!\s*(?:mcg|mg|gm|ml|iu|g|毫克|公絲|公克))/giu;

/** Negated forms are listed first so 未調價 never matches as 調價. */
const ANNOUNCEMENT_KEYWORDS: readonly (readonly [RegExp, DrugItemAnnouncementFilter])[] =
  Object.freeze([
    [/未調價|沒調價|沒有調價|未受影響|不受影響|沒有動到|沒動到|未變動|price not changed|not changed|unchanged/giu, "priceUnchanged"],
    [/本次調價|這次調價|有調價|調價|漲價|降價|受影響|有動到|已變動|price changed|repriced/giu, "priceChanged"]
  ]);

/**
 * Question scaffolding — the words a clinician wraps a query in. Removing them is
 * necessary because every remaining word has to be found: after `這次調價` is lifted
 * out of `atorvastatin 40mg 這次調價的`, the orphaned 的 would rule out every item.
 *
 * Measured against all 607 master records before choosing the list: each of these
 * appears in zero drug names, English names and ingredients. 和 was a candidate and
 * is deliberately absent — it appears in 8 records, all of the manufacturer 正和.
 *
 * They are reported as `ignored` facets, not dropped in silence, so the screen can
 * show exactly which characters were set aside.
 */
const IGNORED_WORDS =
  /有沒有|有哪些|請問|幫我|給我|我要|列出|查詢|哪些|請|查|找|看|要|的話|的|了|嗎|呢|吧|啊|是|跟|與|及|全部/gu;

const TODAY_KEYWORDS = /今天|今日|本日|today/giu;
const ANNOUNCEMENT_DATE_KEYWORDS = /新制生效日|新制|生效日|announcement/giu;

function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function pad(value: number, width: number): string {
  return String(value).padStart(width, "0");
}

function overlaps(spans: readonly Span[], start: number, end: number): boolean {
  return spans.some((span) => start < span.end && span.start < end);
}

function collect(
  input: string,
  spans: Span[],
  pattern: RegExp,
  toFacet: (match: RegExpExecArray) => DrugQueryFacet | undefined
): void {
  const scanner = new RegExp(pattern.source, pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`);
  let match = scanner.exec(input);
  while (match !== null) {
    const start = match.index;
    const end = start + match[0].length;
    if (!overlaps(spans, start, end)) {
      const facet = toFacet(match);
      if (facet !== undefined) spans.push({ start, end, facet });
    }
    match = scanner.exec(input);
  }
}

export function parseDrugQuery(
  query: string,
  { today, announcementDate }: DrugQueryParseOptions
): ParsedDrugQuery {
  const input = typeof query === "string" ? query : "";
  const spans: Span[] = [];

  // Dates first: a date can contain digits a dose pattern would otherwise claim.
  collect(input, spans, ISO_DATE_PATTERN, (match) =>
    isIsoDate(match[0]) ? { kind: "date", raw: match[0], value: match[0], label: match[0] } : undefined
  );
  collect(input, spans, ROC_DATE_PATTERN, (match) => {
    const rocYear = Number(match[1]);
    const iso = `${pad(rocYear + 1911, 4)}-${pad(Number(match[2]), 2)}-${pad(Number(match[3]), 2)}`;
    return isIsoDate(iso) ? { kind: "date", raw: match[0], value: iso, label: iso } : undefined;
  });
  collect(input, spans, TODAY_KEYWORDS, (match) => ({
    kind: "date",
    raw: match[0],
    value: today,
    label: today
  }));
  collect(input, spans, ANNOUNCEMENT_DATE_KEYWORDS, (match) => ({
    kind: "date",
    raw: match[0],
    value: announcementDate,
    label: announcementDate
  }));

  collect(input, spans, DOSE_PATTERN, (match) => {
    const amount = Number(match[1]);
    const numerator = DOSE_UNITS[(match[2] ?? "").toLowerCase()];
    if (!Number.isFinite(amount) || numerator === undefined) return undefined;
    const denominatorRaw = match[3];
    if (denominatorRaw === undefined) {
      return {
        kind: "dose",
        raw: match[0],
        value: `${String(amount)}${numerator}`,
        label: `${String(amount)} ${numerator}`
      };
    }
    const denominator = DOSE_UNITS[denominatorRaw.toLowerCase()];
    if (denominator === undefined) return undefined;
    const unit = `${numerator}/${denominator}`;
    return {
      kind: "dose",
      raw: match[0],
      value: `${String(amount)}${unit}`,
      label: `${String(amount)} ${unit}`
    };
  });

  // A bare month/day only after doses have claimed their digits.
  collect(input, spans, MONTH_DAY_PATTERN, (match) => {
    const year = today.slice(0, 4);
    const iso = `${year}-${pad(Number(match[1]), 2)}-${pad(Number(match[2]), 2)}`;
    return isIsoDate(iso) ? { kind: "date", raw: match[0], value: iso, label: iso } : undefined;
  });

  for (const [pattern, filter] of ANNOUNCEMENT_KEYWORDS) {
    collect(input, spans, pattern, (match) => ({
      kind: "announcement",
      raw: match[0],
      value: filter,
      label: filter
    }));
  }

  // Last, so it can never take characters a real facet would have claimed.
  collect(input, spans, IGNORED_WORDS, (match) => ({
    kind: "ignored",
    raw: match[0],
    value: match[0],
    label: match[0]
  }));

  spans.sort((left, right) => left.start - right.start);

  // Whatever no facet claimed is still searched for, never dropped.
  let searchText = "";
  let cursor = 0;
  for (const span of spans) {
    searchText += input.slice(cursor, span.start);
    searchText += " ";
    cursor = span.end;
  }
  searchText += input.slice(cursor);

  const facets = spans.map((span) => span.facet);
  const lastOf = (kind: DrugQueryFacetKind): DrugQueryFacet | undefined =>
    [...facets].reverse().find((facet) => facet.kind === kind);

  const announcement = lastOf("announcement");
  const dose = lastOf("dose");
  return Object.freeze({
    searchText: searchText.replace(/\s+/g, " ").trim(),
    facets: Object.freeze(facets),
    doseKey: dose?.value,
    doseLabel: dose?.label,
    announcementFilter: announcement?.value as DrugItemAnnouncementFilter | undefined,
    asOfDate: lastOf("date")?.value
  });
}
