import { createContext, useContext, useMemo, useState } from "react";
import {
  DRUG_DOSE_UNSPECIFIED_KEY,
  DRUG_ITEMS_DATASET_EFFECTIVE_FROM,
  DRUG_ITEMS_DATASET_EFFECTIVE_TO,
  DRUG_ITEM_MASTER_WARNING,
  ITEM_DATASET_EFFECTIVE_FROM,
  ITEM_DATASET_VERSION,
  ITEM_WARNING,
  NAVIGABLE_DRUG_ITEM_RULE_SECTIONS,
  PRIOR_RULE_WARNING,
  collectDrugDoseFacets,
  compareRuleSectionVersions,
  getDrugItemAnnouncementMembership,
  getDrugItemDoses,
  getNavigableDrugItemRuleSections,
  identifyRuleDrugMasterRecords,
  listDrugItemMasterRecordsByRuleSection,
  lookupDrugItemMaster,
  lookupRuleText,
  matchesDrugDoseFilter,
  matchesDrugItemAnnouncementFilter,
  type DrugDoseFacet,
  type DrugItemAnnouncementFilter,
  type DrugItemMasterLookupResult,
  type DrugItemMasterMatch,
  type DrugItemMasterRecord,
  type NavigableDrugItemRuleSection,
  type RuleDiffRow,
  type RuleDrugMasterIdentification,
  type RuleSectionComparison,
  type RuleTextLookupResult,
  type RuleTextUnit
} from "@nhi-cv/domain";
import "./src/app.css";
import { UI_COPY, type Translator, type UiMessageKey } from "./src/copy";
import { resolveAsOfDatePresets, todayIso } from "./src/as-of-date";
import {
  DRUG_ITEM_MASTER_SNAPSHOT_DATE,
  resolveAnnouncementItemSource,
  resolveAnnouncementPriceComparison,
  shouldShowMasterSnapshotNotice,
  type AnnouncementPriceComparison
} from "./src/drug-item-ui";
import { resolveDrugReviewPresentation } from "./src/drug-review-presentation";
import { getRuleUnitStructuralMetadata, groupRuleTextUnitsBySection } from "./src/rule-text-tree";
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

type LookupMode = "drugItems" | "rules";

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

const ruleTextDataset = lookupRuleText({ query: "", as_of_date: "" });
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
} satisfies Readonly<Record<RuleTextLookupResult["status"], UiMessageKey>>);

const ruleDiffKindKeys = Object.freeze({
  unchanged: "ruleDiffKindUnchanged",
  removed: "ruleDiffKindRemoved",
  added: "ruleDiffKindAdded",
  replaced: "ruleDiffKindReplaced"
} as const satisfies Readonly<Record<RuleDiffRow["kind"], UiMessageKey>>);

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

function Field({
  label,
  children
}: {
  label: string;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <div className="field">
      <label>{label}</label>
      {children}
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
      <input
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
    </Field>
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
  lookupAsOfDate,
  onOpenRuleText
}: {
  match: DrugItemMasterMatch;
  lookupAsOfDate: string;
  onOpenRuleText: (coverageRule: string) => void;
}): React.JSX.Element {
  const { language, t } = useUi();
  const { item, applicablePricePeriod } = match;
  const missing = t("missingField");
  const value = (raw: string): string => protectedText(language, raw || missing);
  const membership = getDrugItemAnnouncementMembership(item.nhiCode);
  const comparison = resolveAnnouncementPriceComparison(item.nhiCode);
  const doses = getDrugItemDoses(item);
  const sections = getNavigableDrugItemRuleSections(item.coverageRuleSection);

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

      {sections.map((section) => (
        <button
          className="link-button"
          key={section}
          onClick={() => onOpenRuleText(section)}
          type="button"
        >
          {t("openRuleLink", { section: protectedText(language, section) })}
        </button>
      ))}
    </article>
  );
}

/* --------------------------------------------------------- drug lookup ---- */

function DrugLookupMode({
  sectionFilter,
  onClearSectionFilter,
  onOpenRuleText
}: {
  sectionFilter: NavigableDrugItemRuleSection | undefined;
  onClearSectionFilter: () => void;
  onOpenRuleText: (coverageRule: string) => void;
}): React.JSX.Element {
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

  const sectionMatches = useMemo<readonly DrugItemMasterMatch[]>(() => {
    if (sectionFilter === undefined) return Object.freeze([]);
    return Object.freeze(
      listDrugItemMasterRecordsByRuleSection(sectionFilter).flatMap(
        (item) =>
          lookupDrugItemMaster({
            query: item.nhiCode,
            as_of_date: asOfDate,
            dataset_version: datasetVersion
          }).matches
      )
    );
  }, [asOfDate, datasetVersion, sectionFilter]);

  const unfilteredMatches = sectionFilter === undefined ? (result?.matches ?? []) : sectionMatches;
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
  const hasResult = result !== null || sectionFilter !== undefined;

  const changedCount = unfilteredMatches.filter(
    (match) => getDrugItemAnnouncementMembership(match.item.nhiCode).priceChanged
  ).length;
  const reviewPresentation = resolveDrugReviewPresentation({
    lookupStatus: result?.status,
    manualReviewRequired: result?.manualReviewRequired ?? false,
    sectionCandidateCount: sectionFilter === undefined ? 0 : unfilteredMatches.length,
    visibleCandidateCount: visibleMatches.length
  });

  function performLookup(): void {
    onClearSectionFilter();
    // A strength selected for the previous drug usually does not exist for the next
    // one. Carrying it over would show an empty screen that looks like "no such drug".
    setDoseFilter(undefined);
    setResult(
      lookupDrugItemMaster({
        query,
        as_of_date: asOfDate,
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
              <input
                autoFocus
                autoCapitalize="characters"
                autoCorrect="off"
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") performLookup();
                }}
                placeholder={t("drugSearchPlaceholder")}
                type="text"
                value={query}
              />
            </Field>

            <AsOfDateField label={t("drugDateLabel")} onChange={setAsOfDate} value={asOfDate} />

            <button className="primary-button" onClick={performLookup} type="button">
              {t("drugSearchButton")}
            </button>

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
                <input
                  autoCapitalize="none"
                  autoCorrect="off"
                  onChange={(event) => setDatasetVersion(event.target.value)}
                  placeholder={t("datasetPlaceholder")}
                  type="text"
                  value={datasetVersion}
                />
              </Field>
            </Disclosure>
          </div>
        </section>
      </div>

      <div className="results">
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

            {sectionFilter !== undefined ? (
              <p className="notice">
                <span className="notice-strong">
                  {t("sectionFilter", { section: protectedText(language, sectionFilter) })}
                </span>{" "}
                <button className="link-button" onClick={onClearSectionFilter} type="button">
                  {t("clearSectionFilter")}
                </button>
              </p>
            ) : (
              <p className="notice">
                {t("resultTitle", {
                  status: t(lookupStatusKeys[result?.status ?? "NOT_IN_VALIDATED_DATASET"])
                })}
              </p>
            )}

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

            {visibleMatches.map((match) => (
              <DrugItemCard
                key={match.item.nhiCode}
                lookupAsOfDate={sectionFilter === undefined ? (result?.asOfDate ?? asOfDate) : asOfDate}
                match={match}
                onOpenRuleText={onOpenRuleText}
              />
            ))}

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

/* ------------------------------------------------------------- rule tree -- */

export function RuleUnitNode({ unit }: { unit: RuleTextUnit }): React.JSX.Element {
  const { language, t } = useUi();
  const metadata = getRuleUnitStructuralMetadata(unit);
  return (
    <details className="unit">
      <summary>
        <span className="unit-id">{protectedText(language, metadata.unitId)}</span>
        <span className="unit-meta">
          {t("ruleUnitType", { value: protectedText(language, metadata.unitType) })}
          {metadata.tableLabel.length > 0
            ? ` · ${t("ruleUnitTableLabel", { value: protectedText(language, metadata.tableLabel) })}`
            : ""}
        </span>
      </summary>
      <div className="details-body">
        {/* Verbatim: never reflowed, summarized, corrected or excerpted. */}
        <p className="verbatim">{unit.verbatimText}</p>
      </div>
    </details>
  );
}

export function RuleSectionNode({
  section,
  units
}: {
  section: string;
  units: readonly RuleTextUnit[];
}): React.JSX.Element {
  const { language, t } = useUi();
  return (
    <Disclosure
      className="tree-section"
      summary={t("ruleTextSectionTitle", {
        section: protectedText(language, section),
        count: String(units.length)
      })}
    >
      {units.map((unit) => (
        <RuleUnitNode key={unit.unitId} unit={unit} />
      ))}
    </Disclosure>
  );
}

/* ------------------------------------------------------ master identification */

function RuleDrugMasterCard({
  identification
}: {
  identification: RuleDrugMasterIdentification;
}): React.JSX.Element {
  const { language, t } = useUi();
  const { masterItem, nhiCode } = identification;
  const missing = t("missingField");
  const value = (raw: string): string => protectedText(language, raw || missing);

  if (masterItem === undefined) {
    return (
      <article className="item">
        <div className="item-head">
          <span className="code-badge">{protectedText(language, nhiCode)}</span>
        </div>
        <p className="notice">{t("ruleDrugMasterMissing")}</p>
      </article>
    );
  }

  return (
    <article className="item">
      <div className="item-head">
        <h3 className="item-name">
          {value(masterItem.drugNameZh)}
          <span className="item-name-en">{value(masterItem.drugNameEn)}</span>
        </h3>
        <span className="code-badge">{protectedText(language, nhiCode)}</span>
      </div>
      <div className="field-grid">
        <div>
          {t("fieldMasterIngredient", { value: "" })}
          <b>{value(masterItem.ingredient)}</b>
        </div>
        <div>
          {t("fieldMasterDosageForm", { value: "" })}
          <b>{value(masterItem.dosageForm)}</b>
        </div>
      </div>
    </article>
  );
}

/**
 * Carries `{ nhiCode, masterItem }` only. Names are read from the master, never
 * paired with a code by position in the rule text — that pairing was measured at
 * 100/108 correct, and the 8 failures included one drug's name absorbing another
 * drug's code.
 */
export function RuleDrugMasterBlock({ units }: { units: readonly RuleTextUnit[] }): React.JSX.Element {
  const { language, t } = useUi();
  const identifications = useMemo(
    () => identifyRuleDrugMasterRecords(units.map((unit) => unit.verbatimText)),
    [units]
  );

  if (identifications.length === 0) {
    return <p className="notice">{t("ruleDrugMasterNoCodes")}</p>;
  }

  return (
    <Disclosure
      summary={t("ruleDrugMasterTitle", { count: String(identifications.length) })}
    >
      <p className="hint">
        {t("ruleDrugMasterDatasetVersion", {
          version: protectedText(language, drugItemsDataset.datasetVersion)
        })}
      </p>
      {identifications.map((identification) => (
        <RuleDrugMasterCard identification={identification} key={identification.nhiCode} />
      ))}
    </Disclosure>
  );
}

/* ------------------------------------------------------------------ diff -- */

/**
 * Display-only rewrap. Both sources' own line breaks were dropped before comparison
 * because they are layout artifacts, so a wholesale replacement would otherwise
 * arrive as one unbroken paragraph.
 */
function rewrapForReading(text: string): string {
  return text.replace(/([。；])/g, "$1\n").trimEnd();
}

export function RuleDiffTable({ comparison }: { comparison: RuleSectionComparison }): React.JSX.Element {
  const { language, t } = useUi();
  const { diff } = comparison;
  const cellClass: Readonly<Record<RuleDiffRow["kind"], [string, string]>> = {
    unchanged: ["diff-cell diff-same", "diff-cell diff-same"],
    removed: ["diff-cell diff-removed", "diff-cell"],
    added: ["diff-cell", "diff-cell diff-added"],
    replaced: ["diff-cell diff-removed", "diff-cell diff-added"]
  };

  return (
    <div>
      <p className="hint">
        {t("ruleDiffStats", {
          priorTokens: String(diff.priorTokens),
          unchanged: String(diff.unchangedTokens),
          added: String(diff.addedTokens)
        })}
      </p>

      {comparison.excludedDrugListings.map((listing) => (
        <p className="notice" key={listing.unitId}>
          {t("ruleDiffExcludedListing", {
            unitId: protectedText(language, listing.unitId),
            characters: String(listing.characterCount),
            codes: String(listing.nhiCodeCount)
          })}
        </p>
      ))}

      <div className="diff-head">
        <span>
          {t("ruleDiffPriorColumn", {
            effectiveTo: protectedText(language, comparison.priorEffectiveTo)
          })}
        </span>
        <span>
          {t("ruleDiffCurrentColumn", {
            effectiveFrom: protectedText(language, comparison.currentEffectiveFrom)
          })}
        </span>
      </div>

      {diff.rows.map((row, index) => (
        <div className="diff-group" key={`${row.kind}:${String(index)}`}>
          <span className="diff-kind">{t(ruleDiffKindKeys[row.kind])}</span>
          <div className="diff-row">
            <span className={cellClass[row.kind][0]}>{rewrapForReading(row.prior)}</span>
            <span className={cellClass[row.kind][1]}>{rewrapForReading(row.current)}</span>
          </div>
        </div>
      ))}

      <p className="hint">{t("ruleDiffMethod")}</p>
    </div>
  );
}

function ComparedTermList({
  labelKey,
  terms
}: {
  labelKey: UiMessageKey;
  terms: RuleSectionComparison["termsOnlyInPrior"];
}): React.JSX.Element | null {
  const { language, t } = useUi();
  if (terms.length === 0) return null;
  return (
    <div className="filter-group">
      <h3>{t(labelKey, { count: String(terms.length) })}</h3>
      <ul className="term-list">
        {terms.map((term) => (
          <li key={`${term.kind}:${term.text}`}>{protectedText(language, term.text)}</li>
        ))}
      </ul>
    </div>
  );
}

export function RuleComparisonBlock({ section }: { section: string }): React.JSX.Element | null {
  const { language, t } = useUi();
  const comparison = useMemo(() => compareRuleSectionVersions(section), [section]);
  if (comparison === undefined) return null;

  return (
    <Disclosure
      summary={t("ruleComparisonTitle", { section: protectedText(language, section) })}
    >
      <p className="hint">
        {t("ruleComparisonPriorMeta", {
          revision: protectedText(language, comparison.prior.lastRevisionEffectiveFrom),
          history: protectedText(language, comparison.prior.revisionDates.join("、"))
        })}
      </p>
      <p className="hint mono">
        {t("ruleComparisonSourcePdf", {
          name: protectedText(language, comparison.prior.sourcePdfDeclaredName),
          bytes: String(comparison.prior.sourcePdfBytes),
          hash: protectedText(language, comparison.prior.sourcePdfSha256)
        })}
      </p>

      <RuleDiffTable comparison={comparison} />

      <h3 className="diff-kind">{t("ruleComparisonTermsTitle")}</h3>
      <p className="hint">{t("ruleComparisonMethod")}</p>
      <ComparedTermList labelKey="ruleComparisonRemoved" terms={comparison.termsOnlyInPrior} />
      <ComparedTermList labelKey="ruleComparisonAdded" terms={comparison.termsOnlyInCurrent} />
      <ComparedTermList labelKey="ruleComparisonRetained" terms={comparison.termsInBoth} />

      <Disclosure summary={t("ruleComparisonPriorTextTitle")}>
        {/* Verbatim prior text, exactly as extracted from the official PDF. */}
        <p className="verbatim">{comparison.prior.verbatimText}</p>
      </Disclosure>
    </Disclosure>
  );
}

/* -------------------------------------------------------- rule lookup ----- */

function RuleLookupMode({
  initialQuery,
  onOpenDrugItemsForSection
}: {
  initialQuery: string;
  onOpenDrugItemsForSection: (section: NavigableDrugItemRuleSection) => void;
}): React.JSX.Element {
  const { language, t } = useUi();
  const [query, setQuery] = useState(initialQuery);
  const [asOfDate, setAsOfDate] = useState<string>(ruleTextDataset.effectiveFrom);
  const [datasetVersion, setDatasetVersion] = useState<string>(ruleTextDataset.datasetVersion);
  const [result, setResult] = useState<RuleTextLookupResult | null>(
    initialQuery.length > 0
      ? lookupRuleText({ query: initialQuery, as_of_date: ruleTextDataset.effectiveFrom })
      : null
  );

  const sections = result === null ? [] : groupRuleTextUnitsBySection(result.units);
  const resultSections =
    result === null
      ? []
      : NAVIGABLE_DRUG_ITEM_RULE_SECTIONS.filter((section) =>
          result.units.some((unit) => unit.section === section)
        );
  const codeCount =
    result === null
      ? 0
      : identifyRuleDrugMasterRecords(result.units.map((unit) => unit.verbatimText)).length;

  function performLookup(): void {
    setResult(
      lookupRuleText({
        query,
        as_of_date: asOfDate,
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
            <Field label={t("ruleSearchLabel")}>
              <input
                autoCorrect="off"
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") performLookup();
                }}
                placeholder={t("ruleSearchPlaceholder")}
                type="text"
                value={query}
              />
            </Field>

            <Field label={t("ruleDateLabel")}>
              <input
                onChange={(event) => setAsOfDate(event.target.value)}
                placeholder={t("datePlaceholder")}
                type="date"
                value={asOfDate}
              />
            </Field>

            <button className="primary-button" onClick={performLookup} type="button">
              {t("ruleSearchButton")}
            </button>

            <Disclosure className="flush" summary={t("advancedTitle")}>
              <Field label={t("ruleDatasetLabel")}>
                <input
                  autoCapitalize="none"
                  autoCorrect="off"
                  onChange={(event) => setDatasetVersion(event.target.value)}
                  placeholder={t("datasetPlaceholder")}
                  type="text"
                  value={datasetVersion}
                />
              </Field>
            </Disclosure>
          </div>
        </section>
      </div>

      <div className="results">
        {result === null ? (
          <section className="card">
            <div className="placeholder">
              <h2>{t("ruleResultsEmptyTitle")}</h2>
              <p>{t("ruleResultsEmptyBody")}</p>
            </div>
          </section>
        ) : (
          <>
            <dl className="stat-row">
              <Stat label={t("statRuleUnits")} value={String(result.units.length)} />
              <Stat label={t("statRuleCodes")} value={String(codeCount)} />
              <Stat label={t("statRuleSections")} value={String(sections.length)} />
              <Stat
                label={t("statAsOfDate")}
                text
                value={protectedText(language, result.effectiveFrom)}
              />
            </dl>

            <p className="notice">
              {t("resultTitle", { status: t(lookupStatusKeys[result.status]) })}
            </p>
            {result.manualReviewRequired ? (
              <p className="notice">{t("manualReviewRule")}</p>
            ) : null}

            {resultSections.map((section) => (
              <button
                className="link-button"
                key={section}
                onClick={() => onOpenDrugItemsForSection(section)}
                type="button"
              >
                {t("viewSectionItems", { section: protectedText(language, section) })}
              </button>
            ))}

            {result.units.length > 0 ? <RuleDrugMasterBlock units={result.units} /> : null}

            {sections.map(({ section }) => (
              <RuleComparisonBlock key={`comparison:${section}`} section={section} />
            ))}

            <section className="card">
              <div className="card-head">
                <span className="step-badge">2</span>
                <h2>{t("officialRuleTextTitle")}</h2>
              </div>
              <div className="card-body">
                <div className="tree">
                  {sections.map(({ section, units }) => (
                    <RuleSectionNode key={section} section={section} units={units} />
                  ))}
                  {result.units.length === 0 ? (
                    <p className="notice">{t("noRuleUnits")}</p>
                  ) : null}
                </div>
              </div>
            </section>

            <OfficialSourcesDisclosure
              entries={[
                {
                  labelKey: "sourceRulesLabel",
                  version: result.datasetVersion,
                  warning: result.warning
                },
                {
                  labelKey: "sourceRulesPriorLabel",
                  version: "nhi-lipid-rules-prior-2026-09-01-r1",
                  warning: PRIOR_RULE_WARNING
                }
              ]}
            />
          </>
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------- app -- */

export default function App(): React.JSX.Element {
  const [mode, setMode] = useState<LookupMode>("drugItems");
  const [ruleQuerySeed, setRuleQuerySeed] = useState("");
  const [sectionFilter, setSectionFilter] = useState<NavigableDrugItemRuleSection>();
  const [themePreference, setThemePreference] = useState(() =>
    loadThemePreference(preferenceStorage)
  );
  const [language, setLanguage] = useState<InterfaceLanguage>(() =>
    loadInterfaceLanguage(preferenceStorage)
  );

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

  return (
    <UiContext.Provider value={uiContextValue}>
      <div className="app" data-theme={theme}>
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

        <div className="shell">
          {/* One disclaimer for the whole screen, not one per result card. */}
          <p className="disclaimer">{t("disclaimer")}</p>

          <div className="tabs" role="tablist">
            <button
              aria-selected={mode === "drugItems"}
              className="tab"
              onClick={() => setMode("drugItems")}
              role="tab"
              type="button"
            >
              {t("drugLookupTab")}
            </button>
            <button
              aria-selected={mode === "rules"}
              className="tab"
              onClick={() => setMode("rules")}
              role="tab"
              type="button"
            >
              {t("ruleLookupTab")}
            </button>
          </div>

          {mode === "drugItems" ? (
            <DrugLookupMode
              onClearSectionFilter={() => setSectionFilter(undefined)}
              onOpenRuleText={(coverageRule) => {
                setRuleQuerySeed(coverageRule);
                setMode("rules");
              }}
              sectionFilter={sectionFilter}
            />
          ) : (
            <RuleLookupMode
              initialQuery={ruleQuerySeed}
              onOpenDrugItemsForSection={(section) => {
                setSectionFilter(section);
                setMode("drugItems");
              }}
            />
          )}

          <footer className="footer">
            <p>{t("privacyText")}</p>
            <p>{t("footerPrivacy")}</p>
            <p>{t("footerAttribution")}</p>
          </footer>
        </div>
      </div>
    </UiContext.Provider>
  );
}
