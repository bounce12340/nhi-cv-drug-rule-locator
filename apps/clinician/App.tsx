import { createContext, useContext, useEffect, useId, useMemo, useRef, useState } from "react";
import {
  DRUG_DOSE_UNSPECIFIED_KEY,
  DRUG_ITEMS_DATASET_EFFECTIVE_FROM,
  DRUG_ITEMS_DATASET_EFFECTIVE_TO,
  DRUG_ITEM_MASTER_WARNING,
  ITEM_DATASET_EFFECTIVE_FROM,
  ITEM_DATASET_VERSION,
  ITEM_WARNING,
  collectDrugDoseFacets,
  getAssessmentAdvice,
  getCoverageRules,
  getDrugItemAnnouncementMembership,
  getDrugItemDoses,
  getSecondaryTargetNote,
  listCoverageRuleExceptionItems,
  lookupDrugItemMaster,
  matchesDrugDoseFilter,
  matchesDrugItemAnnouncementFilter,
  parseDrugQuery,
  LIPID_CLASSES_ABSENT_FROM_MASTER,
  RISK_DATASET_VERSION,
  RISK_FACTORS,
  TIER_CRITERIA,
  listLipidDrugItems,
  stratifyRisk,
  type LipidDrugClass,
  type RiskAssessment,
  type RiskQuestion,
  type RiskTierRecord,
  type DrugDoseFacet,
  type DrugQueryFacet,
  type DrugItemAnnouncementFilter,
  type DrugItemMasterLookupResult,
  type DrugItemMasterMatch
} from "@nhi-cv/domain";
import "./src/app.css";
import { UI_COPY, type Translator, type UiMessageKey } from "./src/copy";
import { resolveAsOfDatePresets, todayIso } from "./src/as-of-date";
import {
  DRUG_ITEM_MASTER_SNAPSHOT_DATE,
  resolveAnnouncementItemSource,
  resolveAnnouncementPriceComparison,
  isAfterMasterSnapshot,
  shouldShowMasterSnapshotNotice,
  type AnnouncementPriceComparison
} from "./src/drug-item-ui";
import { resolveDrugReviewPresentation } from "./src/drug-review-presentation";
import {
  loadInterfaceLanguage,
  loadThemePreference,
  preferenceStorage,
  preserveProtectedText,
  resolveThemePreference,
  saveInterfaceLanguage,
  saveThemePreference,
  translateMessage,
  type InterfaceLanguage,
  type ThemeName
} from "./src/ui-preferences";

interface UiContextValue {
  readonly language: InterfaceLanguage;
  readonly t: Translator;
}

const UiContext = createContext<UiContextValue | null>(null);

function useUi(): UiContextValue {
  const context = useContext(UiContext);
  if (context === null) throw new Error("UI context is unavailable");
  return context;
}

const drugItemsDataset = lookupDrugItemMaster({ query: "", as_of_date: "" });

const announcementFilters: readonly DrugItemAnnouncementFilter[] = Object.freeze([
  "all",
  "priceChanged",
  "priceUnchanged"
]);

const announcementFilterKeys: Readonly<Record<DrugItemAnnouncementFilter, UiMessageKey>> =
  Object.freeze({
    all: "filterAll",
    priceChanged: "filterPriceChanged",
    priceUnchanged: "filterPriceUnchanged"
  });

const lookupStatusKeys = Object.freeze({
  EXACT_MATCH: "statusExact",
  MULTIPLE_MATCHES: "statusMultiple",
  NOT_IN_VALIDATED_DATASET: "statusUnavailable"
} satisfies Readonly<Record<DrugItemMasterLookupResult["status"], UiMessageKey>>);

function protectedText(language: InterfaceLanguage, value: string): string {
  return preserveProtectedText(language, value);
}

/**
 * Test seam. Components below are exported so a test can render one in isolation
 * against real dataset records and assert on the markup a clinician actually gets,
 * rather than grepping this file's source for implementation strings.
 */
export function UiProvider({
  language = "zh",
  children
}: {
  language?: InterfaceLanguage;
  children: React.ReactNode;
}): React.JSX.Element {
  const value: UiContextValue = {
    language,
    t: (key, replacements) =>
      translateMessage(UI_COPY, language, key, UI_COPY.zh[key], replacements)
  };
  return <UiContext.Provider value={value}>{children}</UiContext.Provider>;
}

/* ------------------------------------------------------------- primitives -- */

/**
 * A labelled control. The label is bound to its input by id rather than by
 * sitting next to it, so a screen reader announces the field instead of an
 * unnamed edit box. It cannot wrap the input instead: a field's children also
 * hold preset chips and hints, and a wrapping label would make clicking those
 * focus the input.
 */
function Field({
  label,
  children
}: {
  label: string;
  children: (inputId: string) => React.ReactNode;
}): React.JSX.Element {
  const inputId = useId();
  return (
    <div className="field">
      <label htmlFor={inputId}>{label}</label>
      {children(inputId)}
    </div>
  );
}

function Chip({
  selected,
  onClick,
  children,
  small = false
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
  small?: boolean;
}): React.JSX.Element {
  return (
    <button
      type="button"
      className={small ? "chip chip-small" : "chip"}
      aria-pressed={selected}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function Stat({ label, value, text = false }: { label: string; value: string; text?: boolean }) {
  return (
    <div className="stat">
      <dt>{label}</dt>
      <dd className={text ? "stat-text" : undefined}>{value}</dd>
    </div>
  );
}

function Disclosure({
  summary,
  children,
  className = "",
  open = false
}: {
  summary: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  open?: boolean;
}): React.JSX.Element {
  return (
    <details className={className} open={open}>
      <summary>{summary}</summary>
      <div className="details-body">{children}</div>
    </details>
  );
}

/**
 * How many result cards to build at once.
 *
 * Measured on the built bundle: the domain lookup for "statin" takes ~6 ms over all
 * 607 records, while rendering its 179 cards takes ~515 ms — the cost is React
 * building card components, not finding them. Nothing else moved that number
 * (dropping 69% of the DOM by lazily rendering the collapsed price history changed
 * it by less than the run-to-run noise), so the only lever is building fewer cards.
 *
 * The stat tile above the list keeps reporting the true total, so paging never
 * understates how many items matched.
 */
const RESULT_PAGE_SIZE = 30;

/**
 * The two screens, in the order their tabs appear. Named once so the tab list, the
 * arrow-key handler and the panel ids cannot drift apart.
 */
const MODES = ["drug", "risk"] as const;
type Mode = (typeof MODES)[number];
const MODE_LABEL_KEYS: Readonly<Record<Mode, UiMessageKey>> = Object.freeze({
  drug: "tabDrugLookup",
  risk: "tabRiskTier"
});

export function ShowMoreResults({
  shown,
  total,
  onShowMore
}: {
  shown: number;
  total: number;
  onShowMore: () => void;
}): React.JSX.Element | null {
  const { t } = useUi();
  if (total <= RESULT_PAGE_SIZE) return null;
  if (shown >= total) return <p className="hint">{t("showingAll", { total: String(total) })}</p>;
  return (
    <button className="show-more" onClick={onShowMore} type="button">
      {t("showMoreItems", { shown: String(shown), total: String(total) })}
    </button>
  );
}

/* ------------------------------------------------------------ date field -- */

function AsOfDateField({
  label,
  value,
  onChange
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
}): React.JSX.Element {
  const { t } = useUi();
  const presets = resolveAsOfDatePresets(ITEM_DATASET_EFFECTIVE_FROM);
  const presetKeys: Readonly<Record<string, UiMessageKey>> = {
    today: "asOfDatePresetToday",
    announcement: "asOfDatePresetAnnouncement"
  };

  return (
    <Field label={label}>
      {(inputId) => (
        <>
          <input
            id={inputId}
            type="date"
            value={value}
            min={DRUG_ITEMS_DATASET_EFFECTIVE_FROM}
            max={DRUG_ITEMS_DATASET_EFFECTIVE_TO}
            onChange={(event) => onChange(event.target.value)}
          />
          <div className="chip-row">
            {presets.map((preset) => (
              <Chip
                key={preset.key}
                small
                selected={value === preset.value}
                onClick={() => onChange(preset.value)}
              >
                {t(presetKeys[preset.key] ?? "asOfDatePresetToday", { value: preset.value })}
              </Chip>
            ))}
          </div>
          <p className="hint">{t("asOfDatePickerHint")}</p>
        </>
      )}
    </Field>
  );
}

/* ----------------------------------------------------------- smart query -- */

const announcementFacetKeys: Readonly<Record<string, UiMessageKey>> = Object.freeze({
  priceChanged: "smartQueryFacetPriceChanged",
  priceUnchanged: "smartQueryFacetPriceUnchanged"
});

/**
 * Says back what the typed line was read as, quoting the characters each reading
 * came from. The clinician can see the parse was right — or override it with the
 * chips and the date field below, which are the same controls it set.
 */
export function SmartQueryReadout({
  facets,
  searchText
}: {
  facets: readonly DrugQueryFacet[];
  searchText: string;
}): React.JSX.Element | null {
  const { language, t } = useUi();
  if (facets.length === 0) return null;

  function describe(facet: DrugQueryFacet): string {
    if (facet.kind === "dose") return t("smartQueryFacetDose", { value: facet.label });
    if (facet.kind === "date") {
      return t("smartQueryFacetDate", { value: protectedText(language, facet.value) });
    }
    if (facet.kind === "ignored") {
      return t("smartQueryFacetIgnored", { value: protectedText(language, facet.label) });
    }
    return t(announcementFacetKeys[facet.value] ?? "smartQueryFacetPriceChanged");
  }

  return (
    <div className="readout">
      <p className="readout-line">
        <b>{t("smartQueryUnderstood")}</b>
        {facets.map((facet, index) => (
          <span
            className={facet.kind === "ignored" ? "readout-chip readout-aside" : "readout-chip"}
            key={`${facet.kind}:${String(index)}`}
          >
            {describe(facet)}
            {facet.kind === "ignored" ? null : (
              <span className="readout-raw">
                {t("smartQueryFacetFrom", { raw: protectedText(language, facet.raw) })}
              </span>
            )}
          </span>
        ))}
      </p>
      <p className="hint">
        {searchText.length > 0
          ? t("smartQuerySearchedFor", { value: protectedText(language, searchText) })
          : t("smartQueryNoText")}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------ dose filter -- */

/**
 * Strength options for the current result set. Every option is a strength some item
 * on screen actually carries, so no option can return nothing — except a selection
 * the other filters have since emptied, which stays visible with its zero count so
 * it can be seen and cleared rather than quietly applied or quietly dropped.
 */
function DoseFilterGroup({
  facets,
  selected,
  onSelect,
  totalCount
}: {
  facets: readonly DrugDoseFacet[];
  selected: DrugDoseFacet | undefined;
  onSelect: (facet: DrugDoseFacet | undefined) => void;
  totalCount: number;
}): React.JSX.Element | null {
  const { t } = useUi();
  if (facets.length === 0 && selected === undefined) return null;

  const options = [...facets];
  if (selected !== undefined && !options.some((facet) => facet.key === selected.key)) {
    options.push({ key: selected.key, label: selected.label, count: 0 });
  }

  return (
    <div className="filter-group">
      <h3>{t("doseFilter")}</h3>
      <div className="chip-row">
        <Chip small selected={selected === undefined} onClick={() => onSelect(undefined)}>
          {t("doseFilterAll", { count: String(totalCount) })}
        </Chip>
        {options.map((facet) => (
          <Chip
            key={facet.key}
            small
            selected={selected?.key === facet.key}
            onClick={() => onSelect(selected?.key === facet.key ? undefined : facet)}
          >
            {t("doseFilterOption", {
              label: facet.key === DRUG_DOSE_UNSPECIFIED_KEY ? t("doseUnspecified") : facet.label,
              count: String(facet.count)
            })}
          </Chip>
        ))}
      </div>
      <p className="hint">{t("doseNote")}</p>
    </div>
  );
}

/* ---------------------------------------------------------- official text -- */

/**
 * The datasets' own transcription warnings, verbatim and unedited, shown once per
 * screen instead of once per result card. Collapsing them is allowed; altering,
 * summarizing or excerpting them is not.
 */
export function OfficialSourcesDisclosure({
  entries
}: {
  entries: readonly { readonly labelKey: UiMessageKey; readonly version: string; readonly warning: string }[];
}): React.JSX.Element {
  const { language, t } = useUi();
  return (
    <Disclosure summary={t("officialSourcesTitle")}>
      <ul className="source-list">
        {entries.map((entry) => (
          <li key={entry.version}>
            <b>{t(entry.labelKey)}</b>
            <span className="mono">{protectedText(language, entry.version)}</span>
            <p className="source-warning">{entry.warning}</p>
          </li>
        ))}
      </ul>
      <p className="hint">{t("originalLanguageNote")}</p>
    </Disclosure>
  );
}

/* ------------------------------------------------------- drug item card --- */

function AnnouncementBlock({
  nhiCode,
  comparison
}: {
  nhiCode: string;
  comparison: AnnouncementPriceComparison | undefined;
}): React.JSX.Element | null {
  const { language, t } = useUi();
  const source = resolveAnnouncementItemSource(nhiCode);
  if (source.status !== "FOUND" || comparison === undefined) return null;

  return (
    <div className="price-line">
      <span className="price-label">{t("announcementChangedTitle")}</span>
      <span className="price-change">
        {/* Both sides are labelled: an unlabelled "2.93 → 2.78" leaves the clinician
            to infer which number the announcement introduced. */}
        <span className="price-label">{t("priceBefore", { value: "" })}</span>
        <span className="price-before">{protectedText(language, comparison.priceBefore)}</span>
        <span aria-hidden="true">→</span>
        <span className="price-label">{t("priceAfter", { value: "" })}</span>
        <span className="price-after">{protectedText(language, comparison.priceAfter)}</span>
      </span>
      <span className="price-period">
        {t("effectiveDate", { value: protectedText(language, comparison.effectiveDate) })}
      </span>
    </div>
  );
}

export function DrugItemCard({
  match,
  lookupAsOfDate
}: {
  match: DrugItemMasterMatch;
  lookupAsOfDate: string;
}): React.JSX.Element {
  const { language, t } = useUi();
  const { item, applicablePricePeriod } = match;
  const missing = t("missingField");
  const value = (raw: string): string => protectedText(language, raw || missing);
  const membership = getDrugItemAnnouncementMembership(item.nhiCode);
  const comparison = resolveAnnouncementPriceComparison(item.nhiCode);
  const doses = getDrugItemDoses(item);

  return (
    <article className="item">
      <div className="item-head">
        <h3 className="item-name">
          {value(item.drugNameZh)}
          <span className="item-name-en">{value(item.drugNameEn)}</span>
        </h3>
        <span className="code-badge">{protectedText(language, item.nhiCode)}</span>
      </div>

      <div className="tag-row">
        {doses.map((dose) => (
          <span className="tag tag-dose" key={dose.key}>
            {dose.label}
          </span>
        ))}
        {item.dosageForm.length > 0 ? (
          <span className="tag">{protectedText(language, item.dosageForm)}</span>
        ) : null}
        {membership.priceChanged ? (
          <span className="tag tag-changed">{t("filterPriceChanged")}</span>
        ) : null}
      </div>

      <div className="price-line">
        <span className="price-label">{t("applicablePriceTitle")}</span>
        <span className="price-value">
          {protectedText(language, applicablePricePeriod.paymentPriceRaw)}
        </span>
        <span className="price-period">
          {t("dateRange", {
            start: protectedText(language, applicablePricePeriod.startDateIso),
            end: protectedText(language, applicablePricePeriod.endDateIso)
          })}
        </span>
      </div>

      <AnnouncementBlock comparison={comparison} nhiCode={item.nhiCode} />

      {shouldShowMasterSnapshotNotice(lookupAsOfDate, item.nhiCode) ? (
        <p className="notice">
          {t("masterSnapshotNotice", {
            version: protectedText(language, drugItemsDataset.datasetVersion),
            snapshotDate: DRUG_ITEM_MASTER_SNAPSHOT_DATE,
            start: protectedText(language, applicablePricePeriod.startDateIso),
            end: protectedText(language, applicablePricePeriod.endDateIso),
            effectiveDate: protectedText(language, comparison?.effectiveDate ?? "")
          })}
        </p>
      ) : null}

      <div className="field-grid">
        <div>
          {t("fieldIngredient", { value: "" })}
          <b>{value(item.ingredient)}</b>
        </div>
        <div>
          {t("fieldVendor", { value: "" })}
          <b>{value(item.vendor)}</b>
        </div>
      </div>

      <Disclosure className="flush" summary={t("showItemDetails")}>
        <div className="field-grid">
          <div>
            {t("fieldManufacturer", { value: "" })}
            <b>{value(item.manufacturer)}</b>
          </div>
          <div>
            {t("fieldAtc", { value: "" })}
            <b>{value(item.atcCode)}</b>
          </div>
          <div>
            {t("fieldCategory", { value: "" })}
            <b>{value(item.drugCategory)}</b>
          </div>
          <div>
            {t("fieldClassificationGroup", { value: "" })}
            <b>{value(item.classificationGroupName)}</b>
          </div>
          <div>
            {t("fieldSingleCompound", { value: "" })}
            <b>{value(item.singleOrCompound)}</b>
          </div>
          <div>
            {t("fieldSpecification", { value: "" })}
            <b>{value([item.specificationAmount, item.specificationUnit].filter(Boolean).join(" "))}</b>
          </div>
          <div>
            {`${t("ruleSectionTitle")}：`}
            <b>{value(item.coverageRuleSection)}</b>
          </div>
        </div>

        <div className="scroll-x">
          <table className="data-table">
            <caption className="visually-hidden">{t("priceHistoryTitle")}</caption>
            <thead>
              <tr>
                <th>{t("validPeriodHeader")}</th>
                <th>{t("paymentPriceHeader")}</th>
              </tr>
            </thead>
            <tbody>
              {item.priceHistory.map((period) => (
                <tr key={`${period.startDateIso}:${period.endDateIso}:${period.paymentPriceRaw}`}>
                  <td>
                    {t("dateRange", {
                      start: protectedText(language, period.startDateIso),
                      end: protectedText(language, period.endDateIso)
                    })}
                  </td>
                  <td>{protectedText(language, period.paymentPriceRaw)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Disclosure>

    </article>
  );
}

/* --------------------------------------------------------- drug lookup ---- */

function DrugLookupMode(): React.JSX.Element {
  const { language, t } = useUi();
  const [query, setQuery] = useState("");
  const [asOfDate, setAsOfDate] = useState<string>(() => todayIso());
  const [datasetVersion, setDatasetVersion] = useState<string>(drugItemsDataset.datasetVersion);
  const [result, setResult] = useState<DrugItemMasterLookupResult | null>(null);
  const [announcementFilter, setAnnouncementFilter] = useState<DrugItemAnnouncementFilter>("all");
  // undefined means no dose is selected. The whole facet is held, not just its key,
  // so a selection can still be labelled after the other filters move and its count
  // drops to zero.
  const [doseFilter, setDoseFilter] = useState<DrugDoseFacet | undefined>(undefined);
  // What the last search read out of the typed line, kept only to show it back.
  const [queryFacets, setQueryFacets] = useState<readonly DrugQueryFacet[]>([]);
  const [searchedText, setSearchedText] = useState("");

  const unfilteredMatches: readonly DrugItemMasterMatch[] = result?.matches ?? [];
  const announcementMatches = unfilteredMatches.filter((match) =>
    matchesDrugItemAnnouncementFilter(match.item.nhiCode, announcementFilter)
  );
  // Not memoized: `announcementMatches` is a fresh array every render, and per-record
  // extraction is already cached by NHI code inside the domain package.
  const doseFacets: readonly DrugDoseFacet[] = collectDrugDoseFacets(
    announcementMatches.map((match) => match.item)
  );
  const visibleMatches = announcementMatches.filter((match) =>
    matchesDrugDoseFilter(match.item, doseFilter?.key)
  );
  const hasResult = result !== null;

  /*
   * Paging is derived, not stored per handler: any change to the query, the date, or
   * either filter has to start the list over, and listing those places by hand would
   * eventually miss one. Comparing a key during render is React's own documented way
   * to reset state when an input changes.
   */
  const [shownCount, setShownCount] = useState(RESULT_PAGE_SIZE);
  const resultKey = [
    result?.asOfDate ?? "",
    searchedText,
    announcementFilter,
    doseFilter?.key ?? "",
    String(unfilteredMatches.length)
  ].join("|");
  const [lastResultKey, setLastResultKey] = useState(resultKey);
  if (resultKey !== lastResultKey) {
    setLastResultKey(resultKey);
    setShownCount(RESULT_PAGE_SIZE);
  }
  const pagedMatches = visibleMatches.slice(0, shownCount);

  const changedCount = unfilteredMatches.filter(
    (match) => getDrugItemAnnouncementMembership(match.item.nhiCode).priceChanged
  ).length;
  const reviewPresentation = resolveDrugReviewPresentation({
    lookupStatus: result?.status,
    manualReviewRequired: result?.manualReviewRequired ?? false,
    visibleCandidateCount: visibleMatches.length
  });

  function performLookup(): void {
    /*
     * One box, then the controls it implies. A strength, a repriced/not-repriced
     * word and a date are lifted out of the line and applied to the same filters the
     * chips below drive; everything the parser did not recognize is what the name
     * search receives. `SmartQueryReadout` shows that split back, so nothing the
     * parser decided is hidden, and the chips still override it afterwards.
     */
    const parsed = parseDrugQuery(query, {
      today: todayIso(),
      announcementDate: ITEM_DATASET_EFFECTIVE_FROM
    });
    const lookupDate = parsed.asOfDate ?? asOfDate;
    if (parsed.asOfDate !== undefined) setAsOfDate(parsed.asOfDate);
    setAnnouncementFilter(parsed.announcementFilter ?? "all");
    // A strength selected for the previous drug usually does not exist for the next
    // one. Carrying it over would show an empty screen that looks like "no such drug".
    setDoseFilter(
      parsed.doseKey === undefined
        ? undefined
        : { key: parsed.doseKey, label: parsed.doseLabel ?? parsed.doseKey, count: 0 }
    );
    setQueryFacets(parsed.facets);
    setSearchedText(parsed.searchText);
    setResult(
      lookupDrugItemMaster({
        query: parsed.searchText,
        as_of_date: lookupDate,
        ...(datasetVersion.trim().length > 0 ? { dataset_version: datasetVersion } : {})
      })
    );
  }

  return (
    <div className="workspace">
      <div className="query-column">
        <section className="card">
          <div className="card-head">
            <span className="step-badge">1</span>
            <h2>{t("queryPanelTitle")}</h2>
          </div>
          <div className="card-body">
            <Field label={t("drugSearchLabel")}>
              {(inputId) => (
                <>
                  <input
                    autoFocus
                    autoCapitalize="characters"
                    autoCorrect="off"
                    id={inputId}
                    onChange={(event) => setQuery(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") performLookup();
                    }}
                    placeholder={t("drugSearchPlaceholder")}
                    type="text"
                    value={query}
                  />
                  <p className="hint">{t("smartQueryHint")}</p>
                </>
              )}
            </Field>

            <AsOfDateField label={t("drugDateLabel")} onChange={setAsOfDate} value={asOfDate} />

            <button className="primary-button" onClick={performLookup} type="button">
              {t("drugSearchButton")}
            </button>

            <SmartQueryReadout facets={queryFacets} searchText={searchedText} />

            <hr className="divider" />

            <div className="filter-group">
              <h3>{t("resultFilter")}</h3>
              <div className="chip-row">
                {announcementFilters.map((filter) => (
                  <Chip
                    key={filter}
                    selected={announcementFilter === filter}
                    small
                    onClick={() => setAnnouncementFilter(filter)}
                  >
                    {t(announcementFilterKeys[filter])}
                  </Chip>
                ))}
              </div>
            </div>

            {hasResult ? (
              <DoseFilterGroup
                facets={doseFacets}
                onSelect={setDoseFilter}
                selected={doseFilter}
                totalCount={announcementMatches.length}
              />
            ) : null}

            <Disclosure className="flush" summary={t("advancedTitle")}>
              <Field label={t("drugDatasetLabel")}>
                {(inputId) => (
                  <input
                    autoCapitalize="none"
                    autoCorrect="off"
                    id={inputId}
                    onChange={(event) => setDatasetVersion(event.target.value)}
                    placeholder={t("datasetPlaceholder")}
                    type="text"
                    value={datasetVersion}
                  />
                )}
              </Field>
            </Disclosure>
          </div>
        </section>
      </div>

      <div className="results">
        {/*
          The screen's whole interaction is type, press, and results appear in
          another column. Without this a screen-reader user gets silence: focus
          stays on the button and nothing announces that anything happened. It
          carries the match count rather than a bare "done", because the count is
          the answer. Polite, so it waits for the user to stop typing.

          It reports the match count alone. The repriced and not-repriced tiles
          beside it are facet counts over the whole search result, not a
          breakdown of what the filters left, so a sentence putting them together
          would read "3 items matched, 13 of them repriced" — a subset claim that
          is not true. The tiles stay where they are; the sentence stops making
          the claim.
        */}
        <p aria-live="polite" className="visually-hidden" role="status">
          {!hasResult
            ? ""
            : t("drugResultAnnouncement", {
                count: String(visibleMatches.length),
                date: asOfDate
              })}
        </p>

        {!hasResult ? (
          <section className="card">
            <div className="placeholder">
              <h2>{t("resultsEmptyTitle")}</h2>
              <p>{t("resultsEmptyBody")}</p>
            </div>
          </section>
        ) : (
          <>
            <dl className="stat-row">
              <Stat label={t("statMatched")} value={String(visibleMatches.length)} />
              <Stat label={t("statPriceChanged")} value={String(changedCount)} />
              <Stat
                label={t("statPriceUnchanged")}
                value={String(unfilteredMatches.length - changedCount)}
              />
              <Stat label={t("statAsOfDate")} text value={protectedText(language, asOfDate)} />
            </dl>

            <p className="notice">
              {t("resultTitle", {
                status: t(lookupStatusKeys[result?.status ?? "NOT_IN_VALIDATED_DATASET"])
              })}
            </p>

            {/*
              Once per screen, not once per card, and only when the chosen date
              is past what the snapshot can answer for.
            */}
            {isAfterMasterSnapshot(asOfDate) ? (
              <p className="notice">
                {t("beyondSnapshotNotice", {
                  date: asOfDate,
                  snapshot: DRUG_ITEM_MASTER_SNAPSHOT_DATE
                })}
              </p>
            ) : null}

            {reviewPresentation?.kind === "multipleCandidates" ? (
              <p className="notice">
                {t("multipleReviewDrug", {
                  count: String(reviewPresentation.visibleCandidateCount)
                })}
              </p>
            ) : reviewPresentation?.kind === "unavailable" ? (
              <p className="notice">{t("manualReviewDrug")}</p>
            ) : null}

            {result !== null && result.excludedZeroPriceCount > 0 ? (
              <p className="notice">
                {t("excludedZeroPrice", { count: String(result.excludedZeroPriceCount) })}
              </p>
            ) : null}

            {pagedMatches.map((match) => (
              <DrugItemCard
                key={match.item.nhiCode}
                lookupAsOfDate={result?.asOfDate ?? asOfDate}
                match={match}
              />
            ))}

            <ShowMoreResults
              onShowMore={() => setShownCount((count) => count + RESULT_PAGE_SIZE)}
              shown={pagedMatches.length}
              total={visibleMatches.length}
            />

            {unfilteredMatches.length === 0 ? (
              <p className="notice">{t("noValidatedItems")}</p>
            ) : visibleMatches.length === 0 ? (
              <p className="notice">
                {t(doseFilter === undefined ? "noFilteredItems" : "doseSelectedEmpty")}
              </p>
            ) : null}

            <OfficialSourcesDisclosure
              entries={[
                {
                  labelKey: "sourceMasterLabel",
                  version: drugItemsDataset.datasetVersion,
                  warning: DRUG_ITEM_MASTER_WARNING
                },
                {
                  labelKey: "sourceAnnouncementLabel",
                  version: ITEM_DATASET_VERSION,
                  warning: ITEM_WARNING
                }
              ]}
            />
          </>
        )}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------- risk tiering -- */

/** The LDL-C criterion is answered by the number field, not by a yes/no box. */
const LDL_C_CRITERION_ID = "high-3";

interface RiskAnswerState {
  readonly prerequisites: Record<string, boolean>;
  readonly criteria: Record<string, boolean>;
  readonly factors: Record<string, boolean>;
}

const EMPTY_RISK_ANSWERS: RiskAnswerState = Object.freeze({
  prerequisites: {},
  criteria: {},
  factors: {}
});

interface RiskQuestionGroup {
  readonly kind: RiskQuestion["kind"];
  readonly headingRaw: string | null;
  readonly questions: readonly RiskQuestion[];
}

/**
 * The next thing to put on screen. Alternatives that share a heading are asked
 * together, because the announcement lists them under one heading as any-one-of.
 * Asking them one at a time would misrepresent a single either/or as five
 * separate decisions.
 */
function nextQuestionGroup(missing: readonly RiskQuestion[]): RiskQuestionGroup | null {
  const pending = missing.filter((question) => question.id !== LDL_C_CRITERION_ID);
  const head = pending[0];
  if (head === undefined) return null;
  if (head.kind === "prerequisite") {
    return { kind: head.kind, headingRaw: head.headingRaw, questions: [head] };
  }
  return {
    kind: head.kind,
    headingRaw: head.headingRaw,
    questions: pending.filter(
      (question) => question.kind === head.kind && question.headingRaw === head.headingRaw
    )
  };
}

/** Label for an answered id, taken from the dataset rather than authored here. */
function answeredLabel(kind: keyof RiskAnswerState, id: string): string {
  if (kind === "prerequisites") {
    return TIER_CRITERIA.find((criterion) => criterion.groupId === id)?.prerequisiteLabelZh ?? id;
  }
  if (kind === "criteria") {
    return TIER_CRITERIA.find((criterion) => criterion.criterionId === id)?.textRaw ?? id;
  }
  return RISK_FACTORS.find((factor) => factor.factorId === id)?.textRaw ?? id;
}

/**
 * Splits the announcement's rule text on its own numbering. Nothing is reworded:
 * each card holds one of the source's 一、二、三 items exactly as transcribed.
 */
function prescriptionSteps(text: string): readonly string[] {
  return text
    .split(/(?=[一二三四五六七八九十]、)/u)
    .map((step) => step.trim())
    .filter((step) => step !== "");
}

export function RiskQuestionCard({
  group,
  onAnswer
}: {
  group: RiskQuestionGroup;
  onAnswer: (answers: Readonly<Record<string, boolean>>) => void;
}): React.JSX.Element {
  const { t } = useUi();
  const [ticked, setTicked] = useState<Readonly<Record<string, boolean>>>({});

  if (group.kind === "prerequisite") {
    const question = group.questions[0]!;
    return (
      <div className="ask-current">
        <p className="ask-question">{t("riskPrerequisiteQuestion")}</p>
        <p className="ask-verbatim">{question.labelZh}</p>
        {question.headingRaw === null ? null : (
          <p className="ask-source">{question.headingRaw}</p>
        )}
        <div className="ask-actions">
          <button
            className="primary-button"
            onClick={() => onAnswer({ [question.id]: true })}
            type="button"
          >
            {t("riskYes")}
          </button>
          <button
            className="ghost-button ask-no"
            onClick={() => onAnswer({ [question.id]: false })}
            type="button"
          >
            {t("riskNo")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="ask-current">
      {group.headingRaw === null ? null : <p className="ask-source">{group.headingRaw}</p>}
      <p className="ask-hint">{t("riskAnyOfHint")}</p>
      <div className="ask-options">
        {group.questions.map((question) => (
          <button
            aria-pressed={ticked[question.id] === true}
            className="ask-option"
            key={question.id}
            onClick={() =>
              setTicked((current) => ({ ...current, [question.id]: current[question.id] !== true }))
            }
            type="button"
          >
            <span aria-hidden="true" className="ask-box" />
            <span>{question.labelZh}</span>
          </button>
        ))}
      </div>
      <div className="ask-actions">
        <button
          className="primary-button"
          onClick={() =>
            onAnswer(
              Object.fromEntries(
                group.questions.map((question) => [question.id, ticked[question.id] === true])
              )
            )
          }
          type="button"
        >
          {t("riskNext")}
        </button>
      </div>
    </div>
  );
}

/**
 * Lists the master items behind the classes a tier's prescribing rule names.
 *
 * It picks nothing. The rule says 中至高強度 statin; the master records no intensity,
 * so the tool cannot say which item satisfies that without inventing the mapping —
 * and the screen says as much rather than implying the list is a shortlist.
 */
export function RiskDrugItems({ asOfDate }: { asOfDate: string }): React.JSX.Element {
  const { t } = useUi();
  const [drugClass, setDrugClass] = useState<LipidDrugClass>("statin");
  const [generic, setGeneric] = useState<string | null>(null);

  const listing = useMemo(
    () => listLipidDrugItems({ drugClass, asOfDate }),
    [drugClass, asOfDate]
  );
  const shown = useMemo(
    () =>
      generic === null
        ? []
        : listing.matches.filter((match) =>
            match.item.ingredient.toUpperCase().includes(generic)
          ),
    [generic, listing]
  );

  const [shownCount, setShownCount] = useState(RESULT_PAGE_SIZE);
  // Same reset rule as the drug lookup: a new class or ingredient starts the list over.
  const listKey = `${drugClass}|${generic ?? ""}|${asOfDate}`;
  const [lastListKey, setLastListKey] = useState(listKey);
  if (listKey !== lastListKey) {
    setLastListKey(listKey);
    setShownCount(RESULT_PAGE_SIZE);
  }

  function selectClass(next: LipidDrugClass): void {
    setDrugClass(next);
    setGeneric(null);
  }

  return (
    <section className="card">
      <div className="card-head">
        <h2>{t("riskItemsTitle")}</h2>
      </div>
      <div className="card-body">
        <p className="notice">
          {t("riskItemsPartial", { classes: LIPID_CLASSES_ABSENT_FROM_MASTER.join("、") })}
        </p>
        <div className="chip-row">
          <Chip onClick={() => selectClass("statin")} selected={drugClass === "statin"} small>
            {t("riskClassStatin", { count: String(listing.counts.statin) })}
          </Chip>
          <Chip
            onClick={() => selectClass("ezetimibe")}
            selected={drugClass === "ezetimibe"}
            small
          >
            {t("riskClassEzetimibe", { count: String(listing.counts.ezetimibe) })}
          </Chip>
        </div>
        <p className="hint">{t("riskGenericPrompt")}</p>
        <div className="chip-row">
          {listing.generics.map((option) => (
            <Chip
              key={option.name}
              onClick={() => setGeneric(generic === option.name ? null : option.name)}
              selected={generic === option.name}
              small
            >
              {t("riskGenericChip", { name: option.name, count: String(option.count) })}
            </Chip>
          ))}
        </div>
        {listing.excludedZeroPriceCount === 0 ? null : (
          <p className="hint">
            {t("riskItemsExcluded", { count: String(listing.excludedZeroPriceCount) })}
          </p>
        )}
        {generic === null ? (
          <p className="hint">{t("riskItemsPickGeneric")}</p>
        ) : (
          <>
            <p className="hint">{t("riskItemsNote", { generic, date: asOfDate })}</p>
            {shown.slice(0, shownCount).map((match) => (
              <DrugItemCard key={match.item.nhiCode} lookupAsOfDate={asOfDate} match={match} />
            ))}
            <ShowMoreResults
              onShowMore={() => setShownCount((count) => count + RESULT_PAGE_SIZE)}
              shown={Math.min(shownCount, shown.length)}
              total={shown.length}
            />
          </>
        )}
      </div>
    </section>
  );
}

/**
 * The advice the announcement prints for this tier below 表一 — when to draw the
 * blood, which modifiable risk factors to deal with, when to screen a family.
 *
 * The group heading is rendered on its own line rather than folded into a
 * sentence: it is transcribed text, and quoting it inside copy would reformat it.
 */
/**
 * The tier's own prescribing rule, split on the numbering the announcement itself
 * wrote. Exported so a test can render it alone: the advice and coverage cards
 * beside it use the same step markup, and an assertion counting steps across the
 * whole result would stop being about this rule.
 */
export function RiskPrescriptionRule({ tier }: { tier: RiskTierRecord }): React.JSX.Element {
  const { t } = useUi();

  return (
    <section className="card">
      <div className="card-head">
        <h2>{t("riskPrescriptionTitle")}</h2>
      </div>
      <div className="card-body">
        {tier.prescriptionRuleText === null ? (
          <p className="notice">{t("riskPrescriptionNone")}</p>
        ) : (
          <>
            <p className="hint">{t("riskPrescriptionNote")}</p>
            <ol className="step-list">
              {prescriptionSteps(tier.prescriptionRuleText).map((step) => (
                <li className="step-card" key={step}>
                  {step}
                </li>
              ))}
            </ol>
            <Disclosure summary={t("riskPrescriptionVerbatim")}>
              <p className="verbatim">{tier.prescriptionRuleText}</p>
            </Disclosure>
          </>
        )}
        <p className="provenance">{t("riskProvenance", { version: RISK_DATASET_VERSION })}</p>
      </div>
    </section>
  );
}

export function RiskAssessmentAdvice({ tierId }: { tierId: string }): React.JSX.Element {
  const { t } = useUi();
  const group = getAssessmentAdvice(tierId);

  return (
    <section className="card">
      <div className="card-head">
        <h2>{t("riskAdviceTitle")}</h2>
      </div>
      <div className="card-body">
        {group === null ? (
          <p className="notice">{t("riskAdviceNone")}</p>
        ) : (
          <>
            <p className="hint">{t("riskAdviceNote")}</p>
            <p className="verbatim">{group.groupHeadingRaw}</p>
            <ol className="step-list">
              {group.items.map((item) => (
                <li className="step-card" key={item.adviceId}>
                  {item.ordinal}
                  {item.textRaw}
                </li>
              ))}
            </ol>
          </>
        )}
      </div>
    </section>
  );
}

/**
 * One 2.6.x rule: its heading, the restriction preamble where the source writes
 * one, its numbered conditions, and the items its own table names.
 *
 * 2.6.3 carries no preamble and no connective over its list, so none is printed.
 * Supplying one would turn three requirements into any-one-of them.
 */
function CoverageRuleBlock({
  view,
  asOfDate
}: {
  view: ReturnType<typeof getCoverageRules>[number];
  asOfDate: string;
}): React.JSX.Element {
  const { t } = useUi();
  const listing = useMemo(
    () => listCoverageRuleExceptionItems({ ruleId: view.rule.ruleId, asOfDate }),
    [view.rule.ruleId, asOfDate]
  );

  return (
    <div className="rule-block">
      <h3 className="verbatim">{view.rule.headingRaw}</h3>
      {view.rule.restrictionRaw === null ? null : (
        <p className="verbatim">{view.rule.restrictionRaw}</p>
      )}
      <ol className="step-list">
        {view.conditions.map((condition) => (
          <li className="step-card" key={condition.conditionId}>
            {condition.ordinal}
            {condition.textRaw}
          </li>
        ))}
      </ol>
      <Disclosure summary={t("riskCoverageExceptionSummary")}>
        <p className="hint">
          {t("riskCoverageExceptionNote", {
            total: String(view.rule.exceptionNhiCodes.length),
            count: String(listing.matches.length),
            date: asOfDate
          })}
        </p>
        {listing.matches.map((match) => (
          <DrugItemCard key={match.item.nhiCode} lookupAsOfDate={asOfDate} match={match} />
        ))}
        {listing.unresolvedNhiCodes.length === 0 ? null : (
          <p className="hint">
            {t("riskCoverageUnresolved", {
              count: String(listing.unresolvedNhiCodes.length),
              codes: listing.unresolvedNhiCodes.join(", ")
            })}
          </p>
        )}
      </Disclosure>
    </div>
  );
}

/**
 * 2.6.2 and 2.6.3, as revised. Not tier-scoped: the announcement states them once
 * for the drug rather than per risk level, so they show whichever tier came out.
 *
 * No provenance line of its own. The prescribing-rule card directly above cites the
 * same attachment and the same dataset version, and a second identical citation is
 * the per-card repetition this screen already learned not to do.
 */
export function RiskCoverageRules({ asOfDate }: { asOfDate: string }): React.JSX.Element {
  const { t } = useUi();

  return (
    <section className="card">
      <div className="card-head">
        <h2>{t("riskCoverageTitle")}</h2>
      </div>
      <div className="card-body">
        <p className="notice">{t("riskCoverageNote")}</p>
        {getCoverageRules().map((view) => (
          <CoverageRuleBlock asOfDate={asOfDate} key={view.rule.ruleId} view={view} />
        ))}
      </div>
    </section>
  );
}

export function RiskTierResult({
  assessment,
  ldlC,
  itemsAsOfDate
}: {
  assessment: RiskAssessment;
  ldlC: number | null;
  itemsAsOfDate: string;
}): React.JSX.Element {
  const { language, t } = useUi();

  if (assessment.status === "undetermined") {
    return (
      <section className="card">
        <div className="card-head">
          <h2>{t("riskUndeterminedTitle")}</h2>
        </div>
        <div className="card-body">
          <p className="notice">
            {t("riskUndeterminedBody", {
              count: String(assessment.missing.length),
              tiers: assessment.possibleTiers.map((tier) => tier.labelZh).join(" / ")
            })}
          </p>
          <p className="hint">{t("riskUndeterminedWhy")}</p>
        </div>
      </section>
    );
  }

  const { tier, reason } = assessment;
  const secondaryNote = getSecondaryTargetNote();
  const because =
    reason.kind === "criterion"
      ? reason.prerequisiteLabelZh === null
        ? t("riskReasonCriterion", { text: reason.criterion.textRaw })
        : t("riskReasonWithPrerequisite", {
            prerequisite: reason.prerequisiteLabelZh,
            text: reason.criterion.textRaw
          })
      : t("riskReasonFactorCount", {
          rule: reason.ruleRaw ?? "",
          count: String(reason.count)
        });

  return (
    <>
      <div className="tier-hero">
        <span className="tier-eyebrow">{t("riskTierEyebrow")}</span>
        <span className="tier-name">{protectedText(language, tier.labelZh)}</span>
        <span className="tier-because">{because}</span>
      </div>

      <dl className="stat-row">
        <Stat
          label={t("riskStatLdl")}
          text
          value={ldlC === null ? t("riskStatBlank") : String(ldlC)}
        />
        <Stat label={t("riskStatThreshold")} text value={tier.initiationThresholdRaw} />
        <Stat label={t("riskStatPrimary")} text value={tier.primaryTargetRaw} />
        <Stat
          label={t("riskStatSecondary")}
          text
          value={tier.secondaryTargetRaw ?? t("riskStatNone")}
        />
      </dl>

      {tier.secondaryTargetRaw === null || secondaryNote === null ? null : (
        <section className="card">
          <div className="card-head">
            <h2>{t("riskSecondaryNoteLabel")}</h2>
          </div>
          <div className="card-body">
            <p className="verbatim">{secondaryNote.textRaw}</p>
          </div>
        </section>
      )}

      <RiskAssessmentAdvice tierId={tier.tierId} />

      <RiskPrescriptionRule tier={tier} />

      <RiskCoverageRules asOfDate={itemsAsOfDate} />

      <RiskDrugItems asOfDate={itemsAsOfDate} />
    </>
  );
}

export function RiskTierMode(): React.JSX.Element {
  const { t } = useUi();
  const [answers, setAnswers] = useState<RiskAnswerState>(EMPTY_RISK_ANSWERS);
  const [ldlCText, setLdlCText] = useState("");

  const parsedLdlC = ldlCText.trim() === "" ? null : Number(ldlCText.trim());
  const ldlCValid =
    parsedLdlC === null || (Number.isFinite(parsedLdlC) && parsedLdlC >= 0 && parsedLdlC <= 1000);
  const ldlC = ldlCValid ? parsedLdlC : null;

  const assessment = useMemo(
    () => stratifyRisk({ ...answers, ldlC }),
    [answers, ldlC]
  );
  const group =
    assessment.status === "undetermined" ? nextQuestionGroup(assessment.missing) : null;
  const needsLdlC =
    assessment.status === "undetermined" && group === null && ldlC === null;

  const answered = (["prerequisites", "criteria", "factors"] as const).flatMap((kind) =>
    Object.entries(answers[kind]).map(([id, value]) => ({ kind, id, value }))
  );

  function record(kind: keyof RiskAnswerState, values: Readonly<Record<string, boolean>>): void {
    setAnswers((current) => ({ ...current, [kind]: { ...current[kind], ...values } }));
  }

  function forget(kind: keyof RiskAnswerState, id: string): void {
    setAnswers((current) => {
      const next = { ...current[kind] };
      delete next[id];
      return { ...current, [kind]: next };
    });
  }

  const questionKind: keyof RiskAnswerState =
    group === null
      ? "criteria"
      : group.kind === "prerequisite"
        ? "prerequisites"
        : group.kind === "factor"
          ? "factors"
          : "criteria";

  return (
    <div className="workspace">
      <div className="query-column">
        <section className="card">
          <div className="card-head">
            <h2>{t("riskPanelTitle")}</h2>
            {assessment.status === "undetermined" ? (
              <span className="ask-remaining">
                {t("riskRemaining", { count: String(assessment.missing.length) })}
              </span>
            ) : null}
          </div>
          <div className="card-body">
            <Field label={t("riskLdlLabel")}>
              {(inputId) => (
                <input
                  id={inputId}
                  inputMode="decimal"
                  onChange={(event) => setLdlCText(event.target.value)}
                  placeholder={t("riskLdlPlaceholder")}
                  type="text"
                  value={ldlCText}
                />
              )}
            </Field>
            {ldlCValid ? null : <p className="notice">{t("riskLdlInvalid")}</p>}
            {needsLdlC ? <p className="notice">{t("riskNeedLdl")}</p> : null}
            <p className="hint">{t("riskLdlWhy")}</p>

            {answered.length === 0 ? null : (
              <div className="ask-answered-list">
                {answered.map(({ kind, id, value }) => (
                  <div className="ask-answered" key={`${kind}:${id}`}>
                    <span>
                      {answeredLabel(kind, id)}{" "}
                      <b>{t(value ? "riskAnsweredYes" : "riskAnsweredNo")}</b>
                    </span>
                    <button onClick={() => forget(kind, id)} type="button">
                      {t("riskEdit")}
                    </button>
                  </div>
                ))}
              </div>
            )}

            {group === null ? null : (
              <RiskQuestionCard
                group={group}
                key={group.questions.map((question) => question.id).join(",")}
                onAnswer={(values) => record(questionKind, values)}
              />
            )}

            {answered.length === 0 && ldlCText === "" ? null : (
              <>
                <hr className="divider" />
                <Chip
                  onClick={() => {
                    setAnswers(EMPTY_RISK_ANSWERS);
                    setLdlCText("");
                  }}
                  selected={false}
                  small
                >
                  {t("riskReset")}
                </Chip>
              </>
            )}
          </div>
        </section>
      </div>

      <div className="results">
        {/*
          Answering a question re-renders the whole result column, and a tier can
          appear after any one of them. Announcing the outcome is the only way a
          screen-reader user learns that the last answer settled it.
        */}
        <p aria-live="polite" className="visually-hidden" role="status">
          {answered.length === 0 && ldlC === null
            ? ""
            : assessment.status === "determined"
              ? t("riskAnnouncementDetermined", { tier: assessment.tier.labelZh })
              : t("riskAnnouncementUndetermined", {
                  count: String(assessment.missing.length)
                })}
        </p>

        {answered.length === 0 && ldlC === null ? (
          <section className="card">
            <div className="card-head">
              <h2>{t("riskEmptyTitle")}</h2>
            </div>
            <div className="card-body">
              <p className="hint">{t("riskEmptyBody")}</p>
            </div>
          </section>
        ) : (
          <RiskTierResult assessment={assessment} itemsAsOfDate={todayIso()} ldlC={ldlC} />
        )}
        <p className="hint">{t("riskNoDrugAdvice")}</p>
      </div>
    </div>
  );
}

export default function App(): React.JSX.Element {
  const [themePreference, setThemePreference] = useState(() =>
    loadThemePreference(preferenceStorage)
  );
  const [language, setLanguage] = useState<InterfaceLanguage>(() =>
    loadInterfaceLanguage(preferenceStorage)
  );
  const [mode, setMode] = useState<Mode>("drug");
  const tabRefs = useRef<Record<Mode, HTMLButtonElement | null>>({ drug: null, risk: null });

  /*
   * The tabs pattern moves between tabs with the arrow keys, not Tab: only the
   * selected tab is in the tab order, so a keyboard user reaches the panel in one
   * press instead of stepping through every tab first. Focus and selection move
   * together, which is the recommended behaviour when switching panels is cheap.
   */
  function moveTab(event: React.KeyboardEvent<HTMLDivElement>): void {
    const index = MODES.indexOf(mode);
    const next =
      event.key === "ArrowRight"
        ? MODES[(index + 1) % MODES.length]
        : event.key === "ArrowLeft"
          ? MODES[(index - 1 + MODES.length) % MODES.length]
          : event.key === "Home"
            ? MODES[0]
            : event.key === "End"
              ? MODES[MODES.length - 1]
              : undefined;
    if (next === undefined) return;
    event.preventDefault();
    setMode(next);
    tabRefs.current[next]?.focus();
  }

  const systemDark =
    typeof globalThis.matchMedia === "function" &&
    globalThis.matchMedia("(prefers-color-scheme: dark)").matches;
  const theme = resolveThemePreference(themePreference, systemDark ? "dark" : "light");

  const t = useMemo<Translator>(
    () => (key, replacements) =>
      translateMessage(UI_COPY, language, key, UI_COPY.zh[key], replacements),
    [language]
  );
  const uiContextValue = useMemo<UiContextValue>(() => ({ language, t }), [language, t]);

  function toggleTheme(): void {
    const nextTheme: ThemeName = theme === "light" ? "dark" : "light";
    setThemePreference(nextTheme);
    saveThemePreference(preferenceStorage, nextTheme);
  }

  function selectLanguage(next: InterfaceLanguage): void {
    setLanguage(next);
    saveInterfaceLanguage(preferenceStorage, next);
  }

  /*
   * The document's own language and title are outside this tree, so switching
   * the interface language has to reach out and set them. Left alone, a screen
   * reader keeps reading English content with a Chinese voice, and the browser
   * tab keeps a Chinese title next to an English page.
   */
  useEffect(() => {
    document.documentElement.lang = t("htmlLang");
    document.title = t("documentTitle");
  }, [t]);

  return (
    <UiContext.Provider value={uiContextValue}>
      <div className="app" data-theme={theme}>
        {/*
          First thing in the tab order and invisible until it has focus. Without
          it a keyboard user steps through the theme, language and tab controls
          on every visit before reaching the search box.
        */}
        <a className="skip-link" href="#main-content">
          {t("skipToContent")}
        </a>
        <header className="hero">
          <div className="shell">
            <div className="hero-bar">
              <button
                className="ghost-button"
                onClick={toggleTheme}
                type="button"
              >
                {t(theme === "light" ? "themeLightButton" : "themeDarkButton")}
              </button>
              <span aria-label={t("languageControlLabel")} className="lang-group" role="group">
                <button
                  aria-pressed={language === "zh"}
                  className="ghost-button"
                  onClick={() => selectLanguage("zh")}
                  type="button"
                >
                  {t("languageChinese")}
                </button>
                <button
                  aria-pressed={language === "en"}
                  className="ghost-button"
                  onClick={() => selectLanguage("en")}
                  type="button"
                >
                  {t("languageEnglish")}
                </button>
              </span>
            </div>
            <p className="hero-eyebrow">{t("appEyebrow")}</p>
            <h1>{t("appTitle")}</h1>
            <p className="hero-tagline">{t("appTagline")}</p>
            <span className="hero-pill">{t("versionPill")}</span>
          </div>
        </header>

        <main className="shell" id="main-content">
          {/* One disclaimer for the whole screen, not one per result card. */}
          <p className="disclaimer">{t("disclaimer")}</p>

          <div
            aria-label={t("tabGroupLabel")}
            className="tabs"
            onKeyDown={moveTab}
            role="tablist"
          >
            {MODES.map((name) => (
              <button
                aria-controls={`panel-${name}`}
                aria-selected={mode === name}
                className="tab"
                id={`tab-${name}`}
                key={name}
                onClick={() => setMode(name)}
                ref={(node) => {
                  tabRefs.current[name] = node;
                }}
                role="tab"
                tabIndex={mode === name ? 0 : -1}
                type="button"
              >
                {t(MODE_LABEL_KEYS[name])}
              </button>
            ))}
          </div>

          {/*
            Asymmetric on purpose. The drug lookup stays mounted so a search
            survives a look at the other tab. The risk tab does not: unmounting
            drops the clinical values the moment you leave it, which is earlier
            than the "gone on reload" the disclaimer promises, not later.
          */}
          <div
            aria-labelledby="tab-drug"
            hidden={mode !== "drug"}
            id="panel-drug"
            role="tabpanel"
          >
            <DrugLookupMode />
          </div>
          {mode === "risk" ? (
            <div aria-labelledby="tab-risk" id="panel-risk" role="tabpanel">
              <RiskTierMode />
            </div>
          ) : null}

          <footer className="footer">
            <p>{t("privacyText")}</p>
            <p>{t("footerPrivacy")}</p>
            <p>{t("footerAttribution")}</p>
            {/* Who built it, set apart from the data-source and privacy notices. */}
            <p className="footer-credit">{t("footerCredit")}</p>
          </footer>
        </main>
      </div>
    </UiContext.Provider>
  );
}
