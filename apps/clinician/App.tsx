import { createContext, useContext, useMemo, useState } from "react";
import {
  DRUG_ITEMS_DATASET_VERSION,
  DRUG_ITEM_MASTER_WARNING,
  ITEM_DATASET_VERSION,
  ITEM_WARNING,
  NAVIGABLE_DRUG_ITEM_RULE_SECTIONS,
  PRIOR_RULE_WARNING,
  compareRuleSectionVersions,
  getDrugItemAnnouncementMembership,
  getNavigableDrugItemRuleSections,
  identifyRuleDrugMasterRecords,
  listDrugItemMasterRecordsByRuleSection,
  lookupDrugItemMaster,
  lookupRuleText,
  matchesDrugItemAnnouncementFilter,
  type DrugItemAnnouncementFilter,
  type DrugItemMasterLookupResult,
  type DrugItemMasterMatch,
  type NavigableDrugItemRuleSection,
  type RuleSectionComparison,
  type RuleDrugMasterIdentification,
  type RuleTextLookupResult,
  type RuleTextUnit
} from "@nhi-cv/domain";
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
  useWindowDimensions
} from "react-native";
import {
  DRUG_ITEM_MASTER_SNAPSHOT_DATE,
  getClinicianLayoutMode,
  resolveAnnouncementItemSource,
  resolveAnnouncementPriceComparison,
  shouldShowMasterSnapshotNotice,
  type AnnouncementPriceComparison
} from "./src/drug-item-ui";
import {
  THEME_TOKENS,
  loadInterfaceLanguage,
  loadThemePreference,
  preferenceStorage,
  preserveProtectedText,
  resolveThemePreference,
  saveInterfaceLanguage,
  saveThemePreference,
  translateMessage,
  type InterfaceLanguage,
  type ThemeName,
  type ThemeTokens
} from "./src/ui-preferences";
import { resolveDrugReviewPresentation } from "./src/drug-review-presentation";
import {
  getRuleUnitStructuralMetadata,
  groupRuleTextUnitsBySection
} from "./src/rule-text-tree";

type LookupMode = "rules" | "drugItems";

const UI_COPY = Object.freeze({
  zh: Object.freeze({
    themeLightButton: "主題：明亮（切換至暗黑）",
    themeDarkButton: "主題：暗黑（切換至明亮）",
    languageControlLabel: "介面語言",
    languageChinese: "中文",
    languageEnglish: "English",
    drugLookupTab: "藥品查詢",
    ruleLookupTab: "規則逐字查詢",
    ruleTitle: "官方規則逐字查詢",
    ruleSubtitle: "以章節、單元編號或表名查找已驗證的逐字單元。",
    ruleSearchLabel: "規則搜尋",
    ruleSearchPlaceholder: "例如 2.6.1、2.6.1-002 或表一",
    ruleDateLabel: "規則查詢日期",
    datePlaceholder: "查詢日期 YYYY-MM-DD",
    ruleDatasetLabel: "規則資料集版本",
    datasetPlaceholder: "資料集版本",
    ruleSearchButton: "查詢規則原文",
    clausePath: "clausePath：{value}",
    rootClause: "（根層）",
    filterAll: "全部",
    filterChanged: "本次公告異動",
    filterTrial: "三個月試用清單",
    filterTableTwo: "表二品項",
    announcementSourceTitle: "另一資料來源：2026-09-01 公告異動明細",
    announcementDatasetVersion: "資料集版本：{result.datasetVersion}",
    announcementNotFound: "此主檔代碼未列於 2026-09-01 公告資料集。",
    announcementChangedTitle: "2026-09-01 公告價格對照",
    priceComparison: "原支付價 {priceBefore} → 初核價格 {priceAfter}",
    priceBefore: "原支付價：{value}",
    priceAfter: "初核價格：{value}",
    effectiveDate: "生效日：{value}",
    announcementRuleSection: "給付規定章節：{value}",
    tableTwoMembership: "表二歸屬：{value}",
    trialNote: "三個月試用期註記：{value}",
    missingField: "本資料列未提供",
    fieldEnglishName: "英文品名：{value}",
    fieldNhiCode: "健保代碼：{value}",
    fieldIngredient: "成分及含量：{value}",
    fieldSpecification: "規格：{value}",
    fieldDosageForm: "劑型：{value}",
    fieldVendor: "藥商：{value}",
    fieldManufacturer: "製造廠：{value}",
    fieldAtc: "ATC：{value}",
    fieldCategory: "藥品分類：{value}",
    fieldClassificationGroup: "分類分組名稱：{value}",
    fieldSingleCompound: "單複方：{value}",
    applicablePriceTitle: "該查詢日期適用之支付價",
    validPeriod: "有效期間：{start} 至 {end}",
    masterSnapshotNotice:
      "主檔資料集版本 {version} 為 {snapshotDate} 時點快照；主檔最新價格期間為 {start} 至 {end}。上方公告價格對照另載該快照日之後、生效日 {effectiveDate} 的異動。",
    priceHistoryTitle: "價格沿革",
    expandPriceHistory: "展開價格沿革（{count} 筆，目前已收合）",
    collapsePriceHistory: "收合價格沿革（{count} 筆，目前已展開）",
    validPeriodHeader: "有效期間",
    paymentPriceHeader: "支付價",
    dateRange: "{start} 至 {end}",
    paymentPriceValue: "支付價：{value}",
    ruleSectionTitle: "給付規定章節",
    openRuleLabel: "開啟規則 {section} 的逐字條文",
    openRuleLink: "{section}（開啟逐字條文）",
    drugTitle: "藥品查詢",
    drugSubtitle: "以健保代碼、中文品名、英文品名或成分查找品項主檔。",
    drugSearchLabel: "藥品主檔搜尋",
    drugSearchPlaceholder: "輸入中文品名、健保代碼、英文品名或成分",
    drugDateLabel: "藥品主檔查詢日期",
    drugDatasetLabel: "藥品主檔資料集版本",
    drugSearchButton: "查詢藥品主檔",
    sectionFilter: "章節篩選：{section}",
    clearSectionFilter: "清除章節篩選",
    resultFilter: "結果篩選",
    officialWarningTitle: "官方轉錄警語",
    originalLanguageNote:
      "Official warnings and rule text appear in their original Chinese wording.",
    resultTitle: "查詢結果：{status}",
    sectionItemsTitle: "章節品項：{section}",
    resultMetadata: "資料集版本：{version} · 查詢日期：{date}",
    multipleReviewDrug:
      "目前畫面列出全部 {count} 筆符合目前條件的候選；工具不會代為選取任何品項或期別。",
    manualReviewDrug: "此結果需要人工確認；系統不會自動選取品項或替代期別。",
    noValidatedItems: "該查詢日期沒有已驗證資料所涵蓋的品項期別。",
    noFilteredItems: "此結果篩選目前沒有品項。",
    ruleResultMetadata: "資料集版本：{version} · 生效日：{date}",
    ruleSourceTag: "來源標記：{value}",
    manualReviewRule: "此結果需要人工確認；請比對健保署公告原文。",
    viewSectionItems: "查看本章節品項（{section}）",
    noRuleUnits: "此查詢未取得已驗證的逐字單元。",
    officialRuleTextTitle: "官方條文",
    ruleTextSectionTitle: "章節 {section}（{count} 個單元）",
    expandRuleTextSection: "展開章節 {section}（目前已收合）",
    collapseRuleTextSection: "收合章節 {section}（目前已展開）",
    expandAllRuleUnits: "展開章節 {section} 的全部 {count} 個單元",
    collapseAllRuleUnits: "收合章節 {section} 的全部 {count} 個單元",
    ruleUnitType: "類型：{value}",
    ruleUnitTableLabel: "表別：{value}",
    expandRuleUnit: "展開單元 {unitId}（目前已收合）",
    collapseRuleUnit: "收合單元 {unitId}（目前已展開）",
    ruleComparisonTitle: "新舊制對照（{section}）",
    expandRuleComparison: "展開新舊制對照（{section}，目前已收合）",
    collapseRuleComparison: "收合新舊制對照（{section}，目前已展開）",
    ruleComparisonPriorMeta: "舊制：最後修訂 {revision}；修訂沿革 {history}",
    ruleComparisonPriorDataset: "舊制資料集：{version}（適用至 {effectiveTo}）",
    ruleComparisonCurrentDataset: "新制資料集：{version}（{effectiveFrom} 生效，{count} 個單元）",
    ruleComparisonSourcePdf: "舊制來源 PDF：{name}（{bytes} bytes，SHA-256 {hash}）",
    ruleComparisonMethod:
      "以下比對僅就機械擷取之量化條件（療程與追蹤期間、血脂數值門檻）列出兩制差異，未做逐句比對；文字敘述之增刪不在此列，仍須自行閱讀兩制全文。",
    ruleComparisonRemoved: "僅見於舊制（{count}）",
    ruleComparisonAdded: "僅見於新制（{count}）",
    ruleComparisonRetained: "兩制皆有（{count}）",
    ruleComparisonNone: "本節未擷取到可比對之量化條件。",
    ruleComparisonPriorTextTitle: "舊制條文全文",
    expandPriorRuleText: "展開舊制條文全文（目前已收合）",
    collapsePriorRuleText: "收合舊制條文全文（目前已展開）",
    ruleDrugMasterTitle: "條文中出現之代碼在藥品主檔的記錄（{count} 筆）",
    ruleDrugMasterNoCodes: "本次結果之條文中未出現符合代碼格式之字串。",
    expandRuleDrugMaster: "展開主檔辨識記錄（{count} 筆，目前已收合）",
    collapseRuleDrugMaster: "收合主檔辨識記錄（{count} 筆，目前已展開）",
    ruleDrugMasterDatasetVersion: "藥品主檔資料集版本：{version}",
    ruleDrugMasterMissing: "主檔查無此代碼；未以條文文字填補。",
    fieldMasterChineseName: "主檔中文品名：{value}",
    fieldMasterEnglishName: "主檔英文品名：{value}",
    fieldMasterIngredient: "主檔成分：{value}",
    fieldMasterSpecification: "主檔規格量與單位：{value}",
    fieldMasterDosageForm: "主檔劑型：{value}",
    statusExact: "單筆精確命中",
    statusMultiple: "多筆命中",
    statusUnavailable: "未在已驗證資料集取得結果",
    privacyTitle: "此工具不接受病人資料",
    privacyText: "請勿輸入姓名、病歷號、檢驗值、診斷或任何可識別病人資訊。",
    footerAttribution:
      "資料來源:衛生福利部中央健康保險署『健保用藥品項查詢項目檔』(政府資料開放平臺),依政府資料開放授權條款第1版利用",
    footerPrivacy: "本站不設帳號、不蒐集任何個人資料;查詢內容不記錄、不儲存。"
  }),
  en: Object.freeze({
    themeLightButton: "Theme: Light (switch to Dark)",
    themeDarkButton: "Theme: Dark (switch to Light)",
    languageControlLabel: "Interface language",
    languageChinese: "中文",
    languageEnglish: "English",
    drugLookupTab: "Drug lookup",
    ruleLookupTab: "Verbatim rule lookup",
    ruleTitle: "Official verbatim rule lookup",
    ruleSubtitle: "Find verified verbatim units by section, unit number, or table name.",
    ruleSearchLabel: "Rule search",
    ruleSearchPlaceholder: "For example, 2.6.1, 2.6.1-002, or 表一",
    ruleDateLabel: "Rule lookup date",
    datePlaceholder: "Lookup date YYYY-MM-DD",
    ruleDatasetLabel: "Rule dataset version",
    datasetPlaceholder: "Dataset version",
    ruleSearchButton: "Search rule text",
    clausePath: "Clause path: {value}",
    rootClause: "(root)",
    filterAll: "All",
    filterChanged: "Changed in this announcement",
    filterTrial: "3-month trial list",
    filterTableTwo: "Table 2 items",
    announcementSourceTitle: "Separate source: 2026-09-01 announcement change details",
    announcementDatasetVersion: "Dataset version: {result.datasetVersion}",
    announcementNotFound: "This master code is not listed in the 2026-09-01 announcement dataset.",
    announcementChangedTitle: "2026-09-01 announcement price comparison",
    priceComparison:
      "Previous payment price {priceBefore} → Initial review price {priceAfter}",
    priceBefore: "Previous payment price: {value}",
    priceAfter: "Initial review price: {value}",
    effectiveDate: "Effective date: {value}",
    announcementRuleSection: "Rule section: {value}",
    tableTwoMembership: "Table 2 classification: {value}",
    trialNote: "3-month trial note: {value}",
    missingField: "Not provided in this source row",
    fieldEnglishName: "English product name: {value}",
    fieldNhiCode: "NHI code: {value}",
    fieldIngredient: "Ingredient and strength: {value}",
    fieldSpecification: "Specification: {value}",
    fieldDosageForm: "Dosage form: {value}",
    fieldVendor: "Vendor: {value}",
    fieldManufacturer: "Manufacturer: {value}",
    fieldAtc: "ATC: {value}",
    fieldCategory: "Drug category: {value}",
    fieldClassificationGroup: "Classification group: {value}",
    fieldSingleCompound: "Single or combination product: {value}",
    applicablePriceTitle: "Payment price for the lookup date",
    validPeriod: "Effective period: {start} to {end}",
    masterSnapshotNotice:
      "Master dataset version {version} is a snapshot dated {snapshotDate}. Its latest price period runs from {start} to {end}. The announcement price comparison above separately records a change after that snapshot date, effective {effectiveDate}.",
    priceHistoryTitle: "Price history",
    expandPriceHistory: "Expand price history ({count} entries, currently collapsed)",
    collapsePriceHistory: "Collapse price history ({count} entries, currently expanded)",
    validPeriodHeader: "Effective period",
    paymentPriceHeader: "Payment price",
    dateRange: "{start} to {end}",
    paymentPriceValue: "Payment price: {value}",
    ruleSectionTitle: "Rule section",
    openRuleLabel: "Open the verbatim text for rule {section}",
    openRuleLink: "{section} (open verbatim rule text)",
    drugTitle: "Drug lookup",
    drugSubtitle: "Find master items by NHI code, Chinese name, English name, or ingredient.",
    drugSearchLabel: "Drug master search",
    drugSearchPlaceholder: "Enter a Chinese name, NHI code, English name, or ingredient",
    drugDateLabel: "Drug master lookup date",
    drugDatasetLabel: "Drug master dataset version",
    drugSearchButton: "Search drug master",
    sectionFilter: "Section filter: {section}",
    clearSectionFilter: "Clear section filter",
    resultFilter: "Result filters",
    officialWarningTitle: "Official transcription warning",
    originalLanguageNote:
      "Official warnings and rule text appear in their original Chinese wording.",
    resultTitle: "Lookup result: {status}",
    sectionItemsTitle: "Section items: {section}",
    resultMetadata: "Dataset version: {version} · Lookup date: {date}",
    multipleReviewDrug:
      "The current view lists all {count} candidates matching the current filters; the tool does not select any item or price period for you.",
    manualReviewDrug: "This result requires manual review; no item or price period is selected automatically.",
    noValidatedItems: "No item period was found in the verified data for this lookup date.",
    noFilteredItems: "No items match the current factual filter.",
    ruleResultMetadata: "Dataset version: {version} · Effective date: {date}",
    ruleSourceTag: "Source tag: {value}",
    manualReviewRule: "This result requires manual review; compare it with the original NHI announcement.",
    viewSectionItems: "View items in this section ({section})",
    noRuleUnits: "No verified verbatim unit was found for this query.",
    officialRuleTextTitle: "Official rule text",
    ruleTextSectionTitle: "Section {section} ({count} units)",
    expandRuleTextSection: "Expand section {section} (currently collapsed)",
    collapseRuleTextSection: "Collapse section {section} (currently expanded)",
    expandAllRuleUnits: "Expand all {count} units in section {section}",
    collapseAllRuleUnits: "Collapse all {count} units in section {section}",
    ruleUnitType: "Type: {value}",
    ruleUnitTableLabel: "Table label: {value}",
    expandRuleUnit: "Expand unit {unitId} (currently collapsed)",
    collapseRuleUnit: "Collapse unit {unitId} (currently expanded)",
    ruleComparisonTitle: "Prior version compared with current ({section})",
    expandRuleComparison: "Expand prior/current comparison ({section}, currently collapsed)",
    collapseRuleComparison: "Collapse prior/current comparison ({section}, currently expanded)",
    ruleComparisonPriorMeta: "Prior version: last revised {revision}; revision history {history}",
    ruleComparisonPriorDataset: "Prior dataset: {version} (in force until {effectiveTo})",
    ruleComparisonCurrentDataset:
      "Current dataset: {version} (effective {effectiveFrom}, {count} units)",
    ruleComparisonSourcePdf: "Prior source PDF: {name} ({bytes} bytes, SHA-256 {hash})",
    ruleComparisonMethod:
      "This comparison lists only mechanically extracted quantitative terms (treatment and follow-up intervals, lipid value thresholds) that differ between the two versions. Sentences are not aligned and wording changes are not listed, so both full texts still need to be read.",
    ruleComparisonRemoved: "Only in the prior version ({count})",
    ruleComparisonAdded: "Only in the current version ({count})",
    ruleComparisonRetained: "In both versions ({count})",
    ruleComparisonNone: "No comparable quantitative term was extracted for this section.",
    ruleComparisonPriorTextTitle: "Prior version, full text",
    expandPriorRuleText: "Expand prior version full text (currently collapsed)",
    collapsePriorRuleText: "Collapse prior version full text (currently expanded)",
    ruleDrugMasterTitle: "Drug-master records for codes appearing in the rule text ({count} entries)",
    ruleDrugMasterNoCodes:
      "No strings matching the code format appear in the rule text for this result.",
    expandRuleDrugMaster:
      "Expand drug-master identification records ({count} entries, currently collapsed)",
    collapseRuleDrugMaster:
      "Collapse drug-master identification records ({count} entries, currently expanded)",
    ruleDrugMasterDatasetVersion: "Drug master dataset version: {version}",
    ruleDrugMasterMissing:
      "No record was found for this code in the drug master; rule text was not used to fill it.",
    fieldMasterChineseName: "Master Chinese product name: {value}",
    fieldMasterEnglishName: "Master English product name: {value}",
    fieldMasterIngredient: "Master ingredient: {value}",
    fieldMasterSpecification: "Master specification amount and unit: {value}",
    fieldMasterDosageForm: "Master dosage form: {value}",
    statusExact: "One exact record match",
    statusMultiple: "Multiple record matches",
    statusUnavailable: "No result in the verified dataset",
    privacyTitle: "This tool does not accept patient data",
    privacyText:
      "Do not enter names, medical record numbers, test results, diagnoses, or any identifiable patient information.",
    footerAttribution:
      "Source: National Health Insurance Administration, Ministry of Health and Welfare, NHI Drug Item Query File (data.gov.tw), used under the Open Government Data License, Version 1.0.",
    footerPrivacy:
      "This site has no accounts and collects no personal data; lookup content is neither logged nor stored."
  })
});

type UiMessageKey = keyof (typeof UI_COPY)["zh"];
type UiReplacements = Readonly<Record<string, string>>;
type Translator = (key: UiMessageKey, replacements?: UiReplacements) => string;

type AppStyles = ReturnType<typeof createStyles>;

type UiContextValue = Readonly<{
  language: InterfaceLanguage;
  styles: AppStyles;
  theme: ThemeName;
  tokens: ThemeTokens;
  t: Translator;
}>;

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
  "changed",
  "trial",
  "tableTwo"
]);

const announcementFilterKeys: Readonly<Record<DrugItemAnnouncementFilter, UiMessageKey>> =
  Object.freeze({
    all: "filterAll",
    changed: "filterChanged",
    trial: "filterTrial",
    tableTwo: "filterTableTwo"
  });

const lookupStatusKeys = Object.freeze({
  EXACT_MATCH: "statusExact",
  MULTIPLE_MATCHES: "statusMultiple",
  NOT_IN_VALIDATED_DATASET: "statusUnavailable"
} satisfies Readonly<Record<RuleTextLookupResult["status"], UiMessageKey>>);

function protectedText(language: InterfaceLanguage, value: string): string {
  return preserveProtectedText(language, value);
}

function OfficialOriginalLanguageNote({
  announcement = false
}: {
  announcement?: boolean;
}): React.JSX.Element | null {
  const { language, styles, t } = useUi();
  if (language !== "en") return null;
  return (
    <Text
      style={announcement ? styles.announcementOriginalLanguageNote : styles.originalLanguageNote}
    >
      {t("originalLanguageNote")}
    </Text>
  );
}

function RuleUnitCard({
  unit,
  expanded,
  onToggle
}: {
  unit: RuleTextUnit;
  expanded: boolean;
  onToggle: () => void;
}): React.JSX.Element {
  const { language, styles, t } = useUi();
  const metadata = getRuleUnitStructuralMetadata(unit);
  const unitId = protectedText(language, metadata.unitId);
  const controlKey = expanded ? "collapseRuleUnit" : "expandRuleUnit";

  return (
    <View style={styles.ruleCard}>
      <Pressable
        accessibilityLabel={t(controlKey, { unitId })}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        onPress={onToggle}
        style={styles.ruleUnitToggle}
      >
        <View style={styles.ruleUnitMetadata}>
          <Text style={styles.ruleUnitId}>{unitId}</Text>
          <Text style={styles.rulePath}>
            {t("ruleUnitType", { value: protectedText(language, metadata.unitType) })}
          </Text>
          <Text style={styles.rulePath}>
            {t("ruleUnitTableLabel", {
              value: protectedText(language, metadata.tableLabel)
            })}
          </Text>
          {metadata.clausePath.length > 0 ? (
            <Text style={styles.rulePath}>
              {t("clausePath", {
                value: protectedText(language, metadata.clausePath.join(" › "))
              })}
            </Text>
          ) : null}
        </View>
        <Text style={styles.ruleUnitToggleText}>{t(controlKey, { unitId })}</Text>
      </Pressable>
      {expanded ? (
        <Text style={styles.verbatimText}>{unit.verbatimText}</Text>
      ) : null}
    </View>
  );
}

function RuleTextSectionNode({
  section,
  units
}: {
  section: string;
  units: readonly RuleTextUnit[];
}): React.JSX.Element {
  const { language, styles, t } = useUi();
  const [expanded, setExpanded] = useState(false);
  const [expandedUnitIds, setExpandedUnitIds] = useState<ReadonlySet<string>>(
    () => new Set()
  );
  const sectionLabel = protectedText(language, section);
  const count = String(units.length);
  const sectionControlKey = expanded ? "collapseRuleTextSection" : "expandRuleTextSection";

  function toggleUnit(unitId: string): void {
    setExpandedUnitIds((current) => {
      const next = new Set(current);
      if (next.has(unitId)) next.delete(unitId);
      else next.add(unitId);
      return next;
    });
  }

  function expandAllUnits(): void {
    setExpanded(true);
    setExpandedUnitIds(new Set(units.map((unit) => unit.unitId)));
  }

  function collapseAllUnits(): void {
    setExpandedUnitIds(new Set());
  }

  return (
    <View style={styles.ruleSectionNode}>
      <Pressable
        accessibilityLabel={t(sectionControlKey, { section: sectionLabel })}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        onPress={() => setExpanded((current) => !current)}
        style={styles.ruleSectionToggle}
      >
        <Text accessibilityRole="header" style={styles.ruleSectionTitle}>
          {t("ruleTextSectionTitle", { section: sectionLabel, count })}
        </Text>
        <Text style={styles.ruleSectionToggleText}>
          {t(sectionControlKey, { section: sectionLabel })}
        </Text>
      </Pressable>
      <View style={styles.ruleSectionBulkControls}>
        <Pressable
          accessibilityLabel={t("expandAllRuleUnits", { section: sectionLabel, count })}
          accessibilityRole="button"
          onPress={expandAllUnits}
          style={styles.ruleSectionBulkButton}
        >
          <Text style={styles.ruleSectionBulkButtonText}>
            {t("expandAllRuleUnits", { section: sectionLabel, count })}
          </Text>
        </Pressable>
        <Pressable
          accessibilityLabel={t("collapseAllRuleUnits", { section: sectionLabel, count })}
          accessibilityRole="button"
          onPress={collapseAllUnits}
          style={styles.ruleSectionBulkButton}
        >
          <Text style={styles.ruleSectionBulkButtonText}>
            {t("collapseAllRuleUnits", { section: sectionLabel, count })}
          </Text>
        </Pressable>
      </View>
      {expanded ? (
        <View style={styles.ruleSectionUnits}>
          {units.map((unit) => (
            <RuleUnitCard
              expanded={expandedUnitIds.has(unit.unitId)}
              key={unit.unitId}
              onToggle={() => toggleUnit(unit.unitId)}
              unit={unit}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

function RuleLookupMode({
  initialQuery = "",
  onOpenDrugItemsForSection,
  isDesktop
}: {
  initialQuery?: string;
  onOpenDrugItemsForSection: (section: NavigableDrugItemRuleSection) => void;
  isDesktop: boolean;
}): React.JSX.Element {
  const { styles, t, tokens } = useUi();
  const [query, setQuery] = useState(initialQuery);
  const [asOfDate, setAsOfDate] = useState<string>(ruleTextDataset.effectiveFrom);
  const [datasetVersion, setDatasetVersion] = useState<string>(ruleTextDataset.datasetVersion);
  const [result, setResult] = useState<RuleTextLookupResult | null>(() =>
    initialQuery.length === 0
      ? null
      : lookupRuleText({
          query: initialQuery,
          as_of_date: ruleTextDataset.effectiveFrom,
          dataset_version: ruleTextDataset.datasetVersion
        })
  );

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
    <View style={styles.modeContent}>
      <Text style={styles.title}>{t("ruleTitle")}</Text>
      <Text style={styles.subtitle}>{t("ruleSubtitle")}</Text>

      <TextInput
        autoFocus
        accessibilityLabel={t("ruleSearchLabel")}
        autoCapitalize="none"
        autoCorrect={false}
        onChangeText={setQuery}
        onSubmitEditing={performLookup}
        placeholder={t("ruleSearchPlaceholder")}
        placeholderTextColor={tokens.color.textMuted}
        returnKeyType="search"
        style={styles.input}
        value={query}
      />
      <TextInput
        accessibilityLabel={t("ruleDateLabel")}
        autoCapitalize="none"
        autoCorrect={false}
        onChangeText={setAsOfDate}
        placeholder={t("datePlaceholder")}
        placeholderTextColor={tokens.color.textMuted}
        style={styles.input}
        value={asOfDate}
      />
      <TextInput
        accessibilityLabel={t("ruleDatasetLabel")}
        autoCapitalize="none"
        autoCorrect={false}
        onChangeText={setDatasetVersion}
        placeholder={t("datasetPlaceholder")}
        placeholderTextColor={tokens.color.textMuted}
        style={styles.input}
        value={datasetVersion}
      />
      <Pressable accessibilityRole="button" onPress={performLookup} style={styles.ruleButton}>
        <Text style={styles.buttonText}>{t("ruleSearchButton")}</Text>
      </Pressable>

      {result ? (
        <RuleLookupResult
          isDesktop={isDesktop}
          result={result}
          onOpenDrugItemsForSection={onOpenDrugItemsForSection}
        />
      ) : null}
    </View>
  );
}

function AnnouncementTags({ nhiCode }: { nhiCode: string }): React.JSX.Element | null {
  const { styles, t } = useUi();
  const membership = getDrugItemAnnouncementMembership(nhiCode);
  const tags: readonly UiMessageKey[] = [
    membership.changed ? "filterChanged" : undefined,
    membership.trial ? "filterTrial" : undefined,
    membership.tableTwo ? "filterTableTwo" : undefined
  ].filter((key): key is UiMessageKey => key !== undefined);
  if (tags.length === 0) return null;

  return (
    <View style={styles.tagRow}>
      {tags.map((key) => (
        <View key={key} style={styles.factTag}>
          <Text style={styles.factTagText}>{t(key)}</Text>
        </View>
      ))}
    </View>
  );
}

function AnnouncementItemSourceBlock({
  comparison,
  nhiCode
}: {
  comparison: AnnouncementPriceComparison | undefined;
  nhiCode: string;
}): React.JSX.Element {
  const { language, styles, t } = useUi();
  const source = resolveAnnouncementItemSource(nhiCode);
  const result = {
    datasetVersion: ITEM_DATASET_VERSION,
    warning: ITEM_WARNING
  } as const;
  const missingField = t("missingField");

  return (
    <View style={styles.announcementSourceBlock}>
      <Text style={styles.sourceBlockTitle}>{t("announcementSourceTitle")}</Text>
      <Text style={styles.sourceBlockMeta}>
        {t("announcementDatasetVersion", {
          "result.datasetVersion": protectedText(language, result.datasetVersion)
        })}
      </Text>
      <Text style={styles.sourceBlockWarning}>{result.warning}</Text>
      <OfficialOriginalLanguageNote announcement />
      {source.status === "NOT_FOUND" ? (
        <Text style={styles.detail}>{t("announcementNotFound")}</Text>
      ) : (
        <>
          {comparison !== undefined ? (
            <View style={styles.announcementFactBlock}>
              <Text style={styles.announcementFactTitle}>{t("announcementChangedTitle")}</Text>
              <Text
                accessibilityLabel={`${t("priceBefore", {
                  value: protectedText(language, comparison.priceBefore)
                })} ${t("priceAfter", {
                  value: protectedText(language, comparison.priceAfter)
                })}`}
                style={styles.announcementPriceComparison}
              >
                {t("priceComparison", {
                  priceBefore: protectedText(language, comparison.priceBefore),
                  priceAfter: protectedText(language, comparison.priceAfter)
                })}
              </Text>
              <Text style={styles.detail}>
                {t("effectiveDate", {
                  value: protectedText(language, comparison.effectiveDate)
                })}
              </Text>
              <Text style={styles.detail}>
                {t("announcementRuleSection", {
                  value: protectedText(language, comparison.coverageRule)
                })}
              </Text>
            </View>
          ) : null}
          {source.membership.tableTwo ? (
            <Text style={styles.detail}>
              {t("tableTwoMembership", {
                value: protectedText(language, source.item.tableClassification ?? missingField)
              })}
            </Text>
          ) : null}
          {source.membership.trial ? (
            <Text style={styles.detail}>
              {t("trialNote", {
                value: protectedText(language, source.item.exceptionNote ?? missingField)
              })}
            </Text>
          ) : null}
        </>
      )}
    </View>
  );
}

function MasterDetailCell({
  children,
  isDesktop
}: {
  children: React.ReactNode;
  isDesktop: boolean;
}): React.JSX.Element {
  const { styles } = useUi();
  return (
    <View style={[styles.masterDetailCell, isDesktop ? styles.masterDetailCellDesktop : null]}>
      {children}
    </View>
  );
}

function DrugItemMasterCard({
  match,
  lookupAsOfDate,
  onOpenRuleText,
  isDesktop
}: {
  match: DrugItemMasterMatch;
  lookupAsOfDate: string;
  onOpenRuleText: (coverageRule: string) => void;
  isDesktop: boolean;
}): React.JSX.Element {
  const { language, styles, t } = useUi();
  const [priceHistoryExpanded, setPriceHistoryExpanded] = useState(false);
  const { item, applicablePricePeriod } = match;
  const missingField = t("missingField");
  const specification = [item.specificationAmount, item.specificationUnit]
    .filter((value) => value.length > 0)
    .join(" ");
  const linkedRuleSections = getNavigableDrugItemRuleSections(item.coverageRuleSection);
  const sourceValue = (value: string): string => protectedText(language, value || missingField);
  const announcementComparison = resolveAnnouncementPriceComparison(item.nhiCode);
  const latestPricePeriod = item.priceHistory[item.priceHistory.length - 1];
  const showMasterSnapshotNotice = shouldShowMasterSnapshotNotice(
    lookupAsOfDate,
    item.nhiCode
  );
  const priceHistoryControlKey = priceHistoryExpanded
    ? "collapsePriceHistory"
    : "expandPriceHistory";
  const priceHistoryCount = String(item.priceHistory.length);

  return (
    <View style={styles.masterItemCard} accessibilityRole="summary">
      <Text style={styles.masterProductName}>{protectedText(language, item.drugNameZh)}</Text>
      <AnnouncementTags nhiCode={item.nhiCode} />
      <AnnouncementItemSourceBlock
        comparison={announcementComparison}
        nhiCode={item.nhiCode}
      />

      <View style={styles.masterDetailsGrid}>
        <MasterDetailCell isDesktop={isDesktop}>
          <Text style={styles.detail}>{t("fieldEnglishName", { value: sourceValue(item.drugNameEn) })}</Text>
        </MasterDetailCell>
        <MasterDetailCell isDesktop={isDesktop}>
          <Text style={styles.code}>{t("fieldNhiCode", { value: sourceValue(item.nhiCode) })}</Text>
        </MasterDetailCell>
        <MasterDetailCell isDesktop={isDesktop}>
          <Text style={styles.detail}>{t("fieldIngredient", { value: sourceValue(item.ingredient) })}</Text>
        </MasterDetailCell>
        <MasterDetailCell isDesktop={isDesktop}>
          <Text style={styles.detail}>{t("fieldSpecification", { value: sourceValue(specification) })}</Text>
        </MasterDetailCell>
        <MasterDetailCell isDesktop={isDesktop}>
          <Text style={styles.detail}>{t("fieldDosageForm", { value: sourceValue(item.dosageForm) })}</Text>
        </MasterDetailCell>
        <MasterDetailCell isDesktop={isDesktop}>
          <Text style={styles.detail}>{t("fieldVendor", { value: sourceValue(item.vendor) })}</Text>
        </MasterDetailCell>
        <MasterDetailCell isDesktop={isDesktop}>
          <Text style={styles.detail}>{t("fieldManufacturer", { value: sourceValue(item.manufacturer) })}</Text>
        </MasterDetailCell>
        <MasterDetailCell isDesktop={isDesktop}>
          <Text style={styles.detail}>{t("fieldAtc", { value: sourceValue(item.atcCode) })}</Text>
        </MasterDetailCell>
        <MasterDetailCell isDesktop={isDesktop}>
          <Text style={styles.detail}>{t("fieldCategory", { value: sourceValue(item.drugCategory) })}</Text>
        </MasterDetailCell>
        <MasterDetailCell isDesktop={isDesktop}>
          <Text style={styles.detail}>
            {t("fieldClassificationGroup", { value: sourceValue(item.classificationGroupName) })}
          </Text>
        </MasterDetailCell>
        <MasterDetailCell isDesktop={isDesktop}>
          <Text style={styles.detail}>{t("fieldSingleCompound", { value: sourceValue(item.singleOrCompound) })}</Text>
        </MasterDetailCell>
      </View>

      <View style={styles.applicablePriceBlock}>
        <Text style={styles.sourceBlockTitle}>{t("applicablePriceTitle")}</Text>
        <Text style={styles.masterPrice}>
          {protectedText(language, applicablePricePeriod.paymentPriceRaw)}
        </Text>
        <Text style={styles.sourceBlockMeta}>
          {t("validPeriod", {
            start: protectedText(language, applicablePricePeriod.startDateIso),
            end: protectedText(language, applicablePricePeriod.endDateIso)
          })}
        </Text>
      </View>

      {showMasterSnapshotNotice &&
      announcementComparison !== undefined &&
      latestPricePeriod !== undefined ? (
        <Text style={styles.masterSnapshotNotice}>
          {t("masterSnapshotNotice", {
            version: protectedText(language, drugItemsDataset.datasetVersion),
            snapshotDate: DRUG_ITEM_MASTER_SNAPSHOT_DATE,
            start: protectedText(language, latestPricePeriod.startDateIso),
            end: protectedText(language, latestPricePeriod.endDateIso),
            effectiveDate: protectedText(language, announcementComparison.effectiveDate)
          })}
        </Text>
      ) : null}

      <View style={styles.priceHistoryBlock}>
        <Pressable
          accessibilityLabel={t(priceHistoryControlKey, { count: priceHistoryCount })}
          accessibilityRole="button"
          accessibilityState={{ expanded: priceHistoryExpanded }}
          onPress={() => setPriceHistoryExpanded((expanded) => !expanded)}
          style={styles.priceHistoryToggle}
        >
          <Text style={styles.sourceBlockTitle}>{t("priceHistoryTitle")}</Text>
          <Text style={styles.priceHistoryToggleText}>
            {t(priceHistoryControlKey, { count: priceHistoryCount })}
          </Text>
        </Pressable>
        {priceHistoryExpanded ? (
          <>
            <View
              style={[
                styles.priceHistoryHeader,
                isDesktop ? styles.priceHistoryRowDesktop : null
              ]}
            >
              <Text style={[styles.sourceBlockMeta, isDesktop ? styles.pricePeriodDesktop : null]}>
                {t("validPeriodHeader")}
              </Text>
              <Text style={[styles.sourceBlockMeta, isDesktop ? styles.priceValueDesktop : null]}>
                {t("paymentPriceHeader")}
              </Text>
            </View>
            {item.priceHistory.map((period) => (
              <View
                key={`${period.effectiveStartRaw}-${period.effectiveEndRaw}`}
                style={[styles.priceHistoryRow, isDesktop ? styles.priceHistoryRowDesktop : null]}
              >
                <Text style={[styles.detail, isDesktop ? styles.pricePeriodDesktop : null]}>
                  {t("dateRange", {
                    start: protectedText(language, period.startDateIso),
                    end: protectedText(language, period.endDateIso)
                  })}
                </Text>
                <Text style={[styles.detail, isDesktop ? styles.priceValueDesktop : null]}>
                  {t("paymentPriceValue", {
                    value: protectedText(language, period.paymentPriceRaw)
                  })}
                </Text>
              </View>
            ))}
          </>
        ) : null}
      </View>

      <View style={styles.coverageSectionBlock}>
        <Text style={styles.sourceBlockTitle}>{t("ruleSectionTitle")}</Text>
        <Text style={styles.detail}>{sourceValue(item.coverageRuleSection)}</Text>
        {linkedRuleSections.map((section) => (
          <Pressable
            accessibilityLabel={t("openRuleLabel", {
              section: protectedText(language, section)
            })}
            accessibilityRole="button"
            key={section}
            onPress={() => onOpenRuleText(section)}
          >
            <Text style={styles.coverageLink}>
              {t("openRuleLink", { section: protectedText(language, section) })}
            </Text>
          </Pressable>
        ))}
      </View>

    </View>
  );
}

function DrugItemMasterLookupMode({
  onOpenRuleText,
  sectionFilter,
  onClearSectionFilter,
  isDesktop
}: {
  onOpenRuleText: (coverageRule: string) => void;
  sectionFilter: NavigableDrugItemRuleSection | undefined;
  onClearSectionFilter: () => void;
  isDesktop: boolean;
}): React.JSX.Element {
  const { language, styles, t, tokens } = useUi();
  const [query, setQuery] = useState("");
  const [asOfDate, setAsOfDate] = useState<string>(drugItemsDataset.effectiveFrom);
  const [datasetVersion, setDatasetVersion] = useState<string>(drugItemsDataset.datasetVersion);
  const [result, setResult] = useState<DrugItemMasterLookupResult | null>(null);
  const [announcementFilter, setAnnouncementFilter] =
    useState<DrugItemAnnouncementFilter>("all");

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
  const visibleMatches = unfilteredMatches.filter((match) =>
    matchesDrugItemAnnouncementFilter(match.item.nhiCode, announcementFilter)
  );
  const hasResult = result !== null || sectionFilter !== undefined;
  const renderedLookupAsOfDate =
    sectionFilter === undefined ? (result?.asOfDate ?? asOfDate) : asOfDate;
  const reviewPresentation = resolveDrugReviewPresentation({
    lookupStatus: result?.status,
    manualReviewRequired: result?.manualReviewRequired ?? false,
    sectionCandidateCount: sectionFilter === undefined ? 0 : unfilteredMatches.length,
    visibleCandidateCount: visibleMatches.length
  });

  function performLookup(): void {
    onClearSectionFilter();
    setResult(
      lookupDrugItemMaster({
        query,
        as_of_date: asOfDate,
        ...(datasetVersion.trim().length > 0 ? { dataset_version: datasetVersion } : {})
      })
    );
  }

  return (
    <View style={styles.modeContent}>
      <Text style={styles.title}>{t("drugTitle")}</Text>
      <Text style={styles.subtitle}>{t("drugSubtitle")}</Text>

      <TextInput
        autoFocus
        accessibilityLabel={t("drugSearchLabel")}
        autoCapitalize="characters"
        autoCorrect={false}
        onChangeText={setQuery}
        onSubmitEditing={performLookup}
        placeholder={t("drugSearchPlaceholder")}
        placeholderTextColor={tokens.color.textMuted}
        returnKeyType="search"
        style={styles.input}
        value={query}
      />
      <TextInput
        accessibilityLabel={t("drugDateLabel")}
        autoCapitalize="none"
        autoCorrect={false}
        onChangeText={setAsOfDate}
        placeholder={t("datePlaceholder")}
        placeholderTextColor={tokens.color.textMuted}
        style={styles.input}
        value={asOfDate}
      />
      <TextInput
        accessibilityLabel={t("drugDatasetLabel")}
        autoCapitalize="none"
        autoCorrect={false}
        onChangeText={setDatasetVersion}
        placeholder={t("datasetPlaceholder")}
        placeholderTextColor={tokens.color.textMuted}
        style={styles.input}
        value={datasetVersion}
      />
      <Pressable accessibilityRole="button" onPress={performLookup} style={styles.masterItemButton}>
        <Text style={styles.buttonText}>{t("drugSearchButton")}</Text>
      </Pressable>

      {sectionFilter === undefined ? null : (
        <View style={styles.sectionFilterNotice}>
          <Text style={styles.sectionFilterText}>
            {t("sectionFilter", { section: protectedText(language, sectionFilter) })}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={onClearSectionFilter}
            style={styles.clearSectionButton}
          >
            <Text style={styles.clearSectionButtonText}>{t("clearSectionFilter")}</Text>
          </Pressable>
        </View>
      )}

      <View style={styles.filterBlock}>
        <Text style={styles.filterTitle}>{t("resultFilter")}</Text>
        <View style={styles.filterRow}>
          {announcementFilters.map((filter) => (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: announcementFilter === filter }}
              key={filter}
              onPress={() => setAnnouncementFilter(filter)}
              style={[
                styles.filterButton,
                announcementFilter === filter ? styles.filterButtonSelected : null
              ]}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  announcementFilter === filter ? styles.filterButtonTextSelected : null
                ]}
              >
                {t(announcementFilterKeys[filter])}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {hasResult ? (
        <View style={styles.results}>
          <View style={styles.masterItemWarning} accessibilityRole="alert">
            <Text style={styles.officialWarningTitle}>{t("officialWarningTitle")}</Text>
            <Text style={styles.officialWarningText}>{drugItemsDataset.warning}</Text>
            <OfficialOriginalLanguageNote />
          </View>
          <Text style={styles.resultTitle}>
            {sectionFilter === undefined
              ? t("resultTitle", {
                  status: t(lookupStatusKeys[result?.status ?? "NOT_IN_VALIDATED_DATASET"])
                })
              : t("sectionItemsTitle", {
                  section: protectedText(language, sectionFilter)
                })}
          </Text>
          <Text style={styles.resultText}>
            {t("resultMetadata", {
              version: protectedText(language, drugItemsDataset.datasetVersion),
              date: protectedText(language, asOfDate)
            })}
          </Text>
          {reviewPresentation?.kind === "multipleCandidates" ? (
            <Text style={styles.multipleReview}>
              {t("multipleReviewDrug", {
                count: String(reviewPresentation.visibleCandidateCount)
              })}
            </Text>
          ) : reviewPresentation?.kind === "unavailable" ? (
            <Text style={styles.review}>{t("manualReviewDrug")}</Text>
          ) : null}
          {visibleMatches.map((match) => (
            <DrugItemMasterCard
              isDesktop={isDesktop}
              key={match.item.nhiCode}
              lookupAsOfDate={renderedLookupAsOfDate}
              match={match}
              onOpenRuleText={onOpenRuleText}
            />
          ))}
          {unfilteredMatches.length === 0 ? (
            <Text style={styles.empty}>{t("noValidatedItems")}</Text>
          ) : visibleMatches.length === 0 ? (
            <Text style={styles.empty}>{t("noFilteredItems")}</Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function RuleLookupResult({
  result,
  onOpenDrugItemsForSection,
  isDesktop
}: {
  result: RuleTextLookupResult;
  onOpenDrugItemsForSection: (section: NavigableDrugItemRuleSection) => void;
  isDesktop: boolean;
}): React.JSX.Element {
  const { language, styles, t } = useUi();
  const resultSections = NAVIGABLE_DRUG_ITEM_RULE_SECTIONS.filter((section) =>
    result.units.some((unit) => unit.section === section)
  );
  const ruleTextSections = groupRuleTextUnitsBySection(result.units);

  return (
    <View style={styles.results}>
      <View style={styles.officialWarning} accessibilityRole="alert">
        <Text style={styles.officialWarningTitle}>{t("officialWarningTitle")}</Text>
        <Text style={styles.officialWarningText}>{result.warning}</Text>
        <OfficialOriginalLanguageNote />
      </View>
      <Text style={styles.resultTitle}>
        {t("resultTitle", { status: t(lookupStatusKeys[result.status]) })}
      </Text>
      <Text style={styles.resultText}>
        {t("ruleResultMetadata", {
          version: protectedText(language, result.datasetVersion),
          date: protectedText(language, result.effectiveFrom)
        })}
      </Text>
      <Text style={styles.resultText}>
        {t("ruleSourceTag", { value: protectedText(language, result.sourceTag) })}
      </Text>
      {result.manualReviewRequired ? (
        <Text style={styles.review}>{t("manualReviewRule")}</Text>
      ) : null}
      {resultSections.map((section) => (
        <Pressable
          accessibilityRole="button"
          key={section}
          onPress={() => onOpenDrugItemsForSection(section)}
          style={styles.sectionItemsButton}
        >
          <Text style={styles.sectionItemsButtonText}>
            {t("viewSectionItems", { section: protectedText(language, section) })}
          </Text>
        </Pressable>
      ))}
      {result.units.length > 0 ? (
        <RuleDrugMasterIdentificationBlock isDesktop={isDesktop} units={result.units} />
      ) : null}
      {ruleTextSections.map(({ section }) => (
        <RuleVersionComparisonBlock key={`comparison:${section}`} section={section} />
      ))}
      <View style={styles.ruleTextTree}>
        <Text accessibilityRole="header" style={styles.officialRuleTextTitle}>
          {t("officialRuleTextTitle")}
        </Text>
        {ruleTextSections.map(({ section, units }) => (
          <RuleTextSectionNode
            key={`${section}:${units.map((unit) => unit.unitId).join(",")}`}
            section={section}
            units={units}
          />
        ))}
        {result.units.length === 0 ? <Text style={styles.empty}>{t("noRuleUnits")}</Text> : null}
      </View>
    </View>
  );
}

function ComparedTermList({
  labelKey,
  terms
}: {
  labelKey: UiMessageKey;
  terms: RuleSectionComparison["termsOnlyInPrior"];
}): React.JSX.Element | null {
  const { language, styles, t } = useUi();
  if (terms.length === 0) return null;
  return (
    <View style={styles.comparisonTermGroup}>
      <Text style={styles.comparisonTermGroupTitle}>
        {t(labelKey, { count: String(terms.length) })}
      </Text>
      <View style={styles.comparisonTermRow}>
        {terms.map((term) => (
          <Text key={`${term.kind}:${term.text}`} style={styles.comparisonTerm}>
            {/* Chip display only: the PDF's column layout breaks terms across lines, so
                inner whitespace is collapsed to keep "6-\n8週" from reading as a typo. The
                authoritative text is the unmodified full text below, and the domain layer
                returns the term exactly as written. */}
            {protectedText(language, term.text.replace(/\s+/g, ""))}
          </Text>
        ))}
      </View>
    </View>
  );
}

function PriorRuleTextDisclosure({
  comparison
}: {
  comparison: RuleSectionComparison;
}): React.JSX.Element {
  const { styles, t } = useUi();
  const [expanded, setExpanded] = useState(false);
  const controlKey = expanded ? "collapsePriorRuleText" : "expandPriorRuleText";

  return (
    <View style={styles.priorRuleTextBlock}>
      <Pressable
        accessibilityLabel={t(controlKey)}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        onPress={() => setExpanded((current) => !current)}
        style={styles.ruleSectionToggle}
      >
        <Text style={styles.comparisonTermGroupTitle}>{t("ruleComparisonPriorTextTitle")}</Text>
        <Text style={styles.ruleSectionToggleText}>{t(controlKey)}</Text>
      </Pressable>
      {expanded ? (
        <Text style={styles.verbatimText}>{comparison.prior.verbatimText}</Text>
      ) : null}
    </View>
  );
}

function RuleVersionComparisonBlock({ section }: { section: string }): React.JSX.Element | null {
  const { language, styles, t } = useUi();
  const [expanded, setExpanded] = useState(false);
  const comparison = useMemo(() => compareRuleSectionVersions(section), [section]);
  if (comparison === undefined) return null;

  const controlKey = expanded ? "collapseRuleComparison" : "expandRuleComparison";
  const sectionLabel = protectedText(language, section);
  const hasTerms =
    comparison.termsOnlyInPrior.length +
      comparison.termsOnlyInCurrent.length +
      comparison.termsInBoth.length >
    0;

  return (
    <View style={styles.comparisonBlock}>
      <Pressable
        accessibilityLabel={t(controlKey, { section: sectionLabel })}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        onPress={() => setExpanded((current) => !current)}
        style={styles.ruleSectionToggle}
      >
        <Text style={styles.comparisonTitle}>
          {t("ruleComparisonTitle", { section: sectionLabel })}
        </Text>
        <Text style={styles.ruleSectionToggleText}>
          {t(controlKey, { section: sectionLabel })}
        </Text>
      </Pressable>
      {expanded ? (
        <View style={styles.comparisonContent}>
          <View style={styles.masterItemWarning} accessibilityRole="alert">
            <Text style={styles.officialWarningTitle}>{t("officialWarningTitle")}</Text>
            <Text style={styles.officialWarningText}>{PRIOR_RULE_WARNING}</Text>
            <OfficialOriginalLanguageNote />
          </View>
          <Text style={styles.sourceBlockMeta}>
            {t("ruleComparisonPriorMeta", {
              revision: protectedText(language, comparison.prior.lastRevisionEffectiveFrom),
              history: protectedText(language, comparison.prior.revisionDates.join("、"))
            })}
          </Text>
          <Text style={styles.sourceBlockMeta}>
            {t("ruleComparisonPriorDataset", {
              version: protectedText(language, comparison.priorDatasetVersion),
              effectiveTo: protectedText(language, comparison.priorEffectiveTo)
            })}
          </Text>
          <Text style={styles.sourceBlockMeta}>
            {t("ruleComparisonCurrentDataset", {
              version: protectedText(language, comparison.currentDatasetVersion),
              effectiveFrom: protectedText(language, comparison.currentEffectiveFrom),
              count: String(comparison.currentUnitCount)
            })}
          </Text>
          <Text style={styles.sourceBlockMeta}>
            {t("ruleComparisonSourcePdf", {
              name: protectedText(language, comparison.prior.sourcePdfDeclaredName),
              bytes: protectedText(language, String(comparison.prior.sourcePdfBytes)),
              hash: protectedText(language, comparison.prior.sourcePdfSha256)
            })}
          </Text>
          <Text style={styles.comparisonMethod}>{t("ruleComparisonMethod")}</Text>
          {hasTerms ? (
            <>
              <ComparedTermList labelKey="ruleComparisonRemoved" terms={comparison.termsOnlyInPrior} />
              <ComparedTermList labelKey="ruleComparisonAdded" terms={comparison.termsOnlyInCurrent} />
              <ComparedTermList labelKey="ruleComparisonRetained" terms={comparison.termsInBoth} />
            </>
          ) : (
            <Text style={styles.empty}>{t("ruleComparisonNone")}</Text>
          )}
          <PriorRuleTextDisclosure comparison={comparison} />
        </View>
      ) : null}
    </View>
  );
}

function RuleDrugMasterIdentificationCard({
  identification,
  isDesktop
}: {
  identification: RuleDrugMasterIdentification;
  isDesktop: boolean;
}): React.JSX.Element {
  const { language, styles, t } = useUi();
  const { masterItem, nhiCode } = identification;
  const missingField = t("missingField");
  const sourceValue = (value: string): string => protectedText(language, value || missingField);

  if (masterItem === undefined) {
    return (
      <View style={styles.ruleDrugIdentificationCard} accessibilityRole="summary">
        <Text style={styles.code}>{t("fieldNhiCode", { value: protectedText(language, nhiCode) })}</Text>
        <Text style={styles.empty}>{t("ruleDrugMasterMissing")}</Text>
      </View>
    );
  }

  const specification = [masterItem.specificationAmount, masterItem.specificationUnit]
    .filter((value) => value.length > 0)
    .join(" ");

  return (
    <View style={styles.ruleDrugIdentificationCard} accessibilityRole="summary">
      <Text style={styles.code}>
        {t("fieldNhiCode", { value: protectedText(language, nhiCode) })}
      </Text>
      <View style={styles.ruleDrugIdentificationDetails}>
        <MasterDetailCell isDesktop={isDesktop}>
          <Text style={styles.detail}>
            {t("fieldMasterChineseName", { value: sourceValue(masterItem.drugNameZh) })}
          </Text>
        </MasterDetailCell>
        <MasterDetailCell isDesktop={isDesktop}>
          <Text style={styles.detail}>
            {t("fieldMasterEnglishName", { value: sourceValue(masterItem.drugNameEn) })}
          </Text>
        </MasterDetailCell>
        <MasterDetailCell isDesktop={isDesktop}>
          <Text style={styles.detail}>
            {t("fieldMasterIngredient", { value: sourceValue(masterItem.ingredient) })}
          </Text>
        </MasterDetailCell>
        <MasterDetailCell isDesktop={isDesktop}>
          <Text style={styles.detail}>
            {t("fieldMasterSpecification", { value: sourceValue(specification) })}
          </Text>
        </MasterDetailCell>
        <MasterDetailCell isDesktop={isDesktop}>
          <Text style={styles.detail}>
            {t("fieldMasterDosageForm", { value: sourceValue(masterItem.dosageForm) })}
          </Text>
        </MasterDetailCell>
      </View>
    </View>
  );
}

function RuleDrugMasterIdentificationBlock({
  units,
  isDesktop
}: {
  units: readonly RuleTextUnit[];
  isDesktop: boolean;
}): React.JSX.Element {
  const { language, styles, t } = useUi();
  const [expanded, setExpanded] = useState(false);
  const identifications = useMemo(
    () => identifyRuleDrugMasterRecords(units.map((unit) => unit.verbatimText)),
    [units]
  );
  const count = String(identifications.length);
  const controlKey = expanded ? "collapseRuleDrugMaster" : "expandRuleDrugMaster";

  if (identifications.length === 0) {
    return (
      <View style={styles.ruleDrugIdentificationBlock}>
        <Text style={styles.ruleDrugIdentificationTitle}>
          {t("ruleDrugMasterTitle", { count })}
        </Text>
        <View style={styles.ruleDrugIdentificationContent}>
          <Text style={styles.empty}>{t("ruleDrugMasterNoCodes")}</Text>
          <Text style={styles.sourceBlockMeta}>
            {t("ruleDrugMasterDatasetVersion", {
              version: protectedText(language, DRUG_ITEMS_DATASET_VERSION)
            })}
          </Text>
          <View style={styles.masterItemWarning} accessibilityRole="alert">
            <Text style={styles.officialWarningTitle}>{t("officialWarningTitle")}</Text>
            <Text style={styles.officialWarningText}>{DRUG_ITEM_MASTER_WARNING}</Text>
            <OfficialOriginalLanguageNote />
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.ruleDrugIdentificationBlock}>
      <Pressable
        accessibilityLabel={t(controlKey, { count })}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        onPress={() => setExpanded((current) => !current)}
        style={styles.ruleDrugIdentificationToggle}
      >
        <Text style={styles.ruleDrugIdentificationTitle}>
          {t("ruleDrugMasterTitle", { count })}
        </Text>
        <Text style={styles.ruleDrugIdentificationToggleText}>
          {t(controlKey, { count })}
        </Text>
      </Pressable>
      {expanded ? (
        <View style={styles.ruleDrugIdentificationContent}>
          <Text style={styles.sourceBlockMeta}>
            {t("ruleDrugMasterDatasetVersion", {
              version: protectedText(language, DRUG_ITEMS_DATASET_VERSION)
            })}
          </Text>
          <View style={styles.masterItemWarning} accessibilityRole="alert">
            <Text style={styles.officialWarningTitle}>{t("officialWarningTitle")}</Text>
            <Text style={styles.officialWarningText}>{DRUG_ITEM_MASTER_WARNING}</Text>
            <OfficialOriginalLanguageNote />
          </View>
          {identifications.map((identification) => (
            <RuleDrugMasterIdentificationCard
              identification={identification}
              isDesktop={isDesktop}
              key={identification.nhiCode}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

function PrivacyNotice(): React.JSX.Element {
  const { styles, t } = useUi();
  return (
    <View style={styles.privacyNotice}>
      <Text style={styles.privacyNoticeTitle}>{t("privacyTitle")}</Text>
      <Text style={styles.privacyNoticeText}>{t("privacyText")}</Text>
    </View>
  );
}

function Footer(): React.JSX.Element {
  const { styles, t } = useUi();
  return (
    <View style={styles.footer}>
      <Text style={styles.footerText}>{t("footerAttribution")}</Text>
      <Text style={styles.footerText}>{t("footerPrivacy")}</Text>
      <PrivacyNotice />
    </View>
  );
}

export default function App(): React.JSX.Element {
  const { width } = useWindowDimensions();
  const systemTheme = useColorScheme();
  const isDesktop = getClinicianLayoutMode(width) === "desktop";
  const [mode, setMode] = useState<LookupMode>("drugItems");
  const [ruleQuerySeed, setRuleQuerySeed] = useState("");
  const [masterSectionFilter, setMasterSectionFilter] =
    useState<NavigableDrugItemRuleSection>();
  const [themePreference, setThemePreference] = useState(() =>
    loadThemePreference(preferenceStorage)
  );
  const [language, setLanguage] = useState<InterfaceLanguage>(() =>
    loadInterfaceLanguage(preferenceStorage)
  );
  const theme = resolveThemePreference(themePreference, systemTheme === "dark" ? "dark" : "light");
  const tokens = THEME_TOKENS[theme];
  const styles = useMemo(() => createStyles(tokens), [tokens]);
  const t = useMemo<Translator>(
    () => (key, replacements) =>
      translateMessage(UI_COPY, language, key, UI_COPY.zh[key], replacements),
    [language]
  );
  const uiContextValue = useMemo<UiContextValue>(
    () => ({ language, styles, t, theme, tokens }),
    [language, styles, t, theme, tokens]
  );

  function openRuleText(coverageRule: string): void {
    setRuleQuerySeed(coverageRule);
    setMode("rules");
  }

  function openDrugItemsForSection(section: NavigableDrugItemRuleSection): void {
    setMasterSectionFilter(section);
    setMode("drugItems");
  }

  function toggleTheme(): void {
    const nextTheme: ThemeName = theme === "light" ? "dark" : "light";
    setThemePreference(nextTheme);
    saveThemePreference(preferenceStorage, nextTheme);
  }

  function selectLanguage(nextLanguage: InterfaceLanguage): void {
    setLanguage(nextLanguage);
    saveInterfaceLanguage(preferenceStorage, nextLanguage);
  }

  return (
    <UiContext.Provider value={uiContextValue}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={[
            styles.container,
            isDesktop ? styles.containerDesktop : styles.containerMobile
          ]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.settingsRow}>
            <Pressable
              accessibilityLabel={t(theme === "light" ? "themeLightButton" : "themeDarkButton")}
              accessibilityRole="button"
              onPress={toggleTheme}
              style={styles.themeButton}
            >
              <Text style={styles.themeButtonText}>
                {t(theme === "light" ? "themeLightButton" : "themeDarkButton")}
              </Text>
            </Pressable>
            <View accessibilityLabel={t("languageControlLabel")} style={styles.languageControls}>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: language === "zh" }}
                onPress={() => selectLanguage("zh")}
                style={[
                  styles.languageButton,
                  language === "zh" ? styles.languageButtonSelected : null
                ]}
              >
                <Text
                  style={[
                    styles.languageButtonText,
                    language === "zh" ? styles.languageButtonTextSelected : null
                  ]}
                >
                  {t("languageChinese")}
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: language === "en" }}
                onPress={() => selectLanguage("en")}
                style={[
                  styles.languageButton,
                  language === "en" ? styles.languageButtonSelected : null
                ]}
              >
                <Text
                  style={[
                    styles.languageButtonText,
                    language === "en" ? styles.languageButtonTextSelected : null
                  ]}
                >
                  {t("languageEnglish")}
                </Text>
              </Pressable>
            </View>
          </View>

          <View accessibilityRole="tablist" style={styles.modeTabs}>
            <Pressable
              accessibilityRole="tab"
              accessibilityState={{ selected: mode === "drugItems" }}
              onPress={() => setMode("drugItems")}
              style={[styles.modeTab, mode === "drugItems" ? styles.modeTabSelected : null]}
            >
              <Text
                style={[
                  styles.modeTabText,
                  mode === "drugItems" ? styles.modeTabTextSelected : null
                ]}
              >
                {t("drugLookupTab")}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="tab"
              accessibilityState={{ selected: mode === "rules" }}
              onPress={() => setMode("rules")}
              style={[styles.modeTab, mode === "rules" ? styles.modeTabSelected : null]}
            >
              <Text
                style={[styles.modeTabText, mode === "rules" ? styles.modeTabTextSelected : null]}
              >
                {t("ruleLookupTab")}
              </Text>
            </Pressable>
          </View>

          {mode === "rules" ? (
            <RuleLookupMode
              initialQuery={ruleQuerySeed}
              isDesktop={isDesktop}
              onOpenDrugItemsForSection={openDrugItemsForSection}
            />
          ) : (
            <DrugItemMasterLookupMode
              isDesktop={isDesktop}
              onClearSectionFilter={() => setMasterSectionFilter(undefined)}
              onOpenRuleText={openRuleText}
              sectionFilter={masterSectionFilter}
            />
          )}

          <Footer />
        </ScrollView>
      </SafeAreaView>
    </UiContext.Provider>
  );
}

function createStyles(theme: ThemeTokens) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: theme.color.background },
    container: { width: "100%", alignSelf: "center" },
    containerDesktop: { maxWidth: 960, padding: 24, gap: 20 },
    containerMobile: { maxWidth: 767, padding: 16, gap: 16 },
    settingsRow: {
      alignItems: "center",
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
      justifyContent: "space-between"
    },
    themeButton: {
      alignItems: "center",
      backgroundColor: theme.color.ruleAction,
      borderRadius: 10,
      justifyContent: "center",
      minHeight: 48,
      paddingHorizontal: 14
    },
    themeButtonText: { color: theme.color.actionText, fontWeight: "800" },
    languageControls: {
      backgroundColor: theme.color.tabSurface,
      borderRadius: 10,
      flexDirection: "row",
      gap: 4,
      padding: 4
    },
    languageButton: {
      alignItems: "center",
      borderRadius: 7,
      justifyContent: "center",
      minHeight: 44,
      minWidth: 82,
      paddingHorizontal: 12
    },
    languageButtonSelected: { backgroundColor: theme.color.controlSelectedSurface },
    languageButtonText: { color: theme.color.textMuted, fontWeight: "700" },
    languageButtonTextSelected: { color: theme.color.actionText },
    modeTabs: {
      backgroundColor: theme.color.tabSurface,
      borderRadius: 12,
      flexDirection: "row",
      gap: 4,
      padding: 4
    },
    modeTab: {
      alignItems: "center",
      borderRadius: 9,
      flex: 1,
      minHeight: 48,
      justifyContent: "center"
    },
    modeTabSelected: { backgroundColor: theme.color.surface },
    modeTabText: { color: theme.color.textMuted, fontSize: 16, fontWeight: "700" },
    modeTabTextSelected: { color: theme.color.textStrong },
    modeContent: { gap: 14 },
    title: { color: theme.color.textStrong, fontSize: 26, fontWeight: "800", marginTop: 6 },
    subtitle: { color: theme.color.textMuted, fontSize: 16, lineHeight: 23 },
    input: {
      backgroundColor: theme.color.surface,
      borderColor: theme.color.inputBorder,
      borderRadius: 10,
      borderWidth: 1,
      color: theme.color.textStrong,
      fontSize: 18,
      minHeight: 52,
      paddingHorizontal: 14
    },
    ruleButton: {
      alignItems: "center",
      backgroundColor: theme.color.ruleAction,
      borderRadius: 10,
      minHeight: 50,
      justifyContent: "center"
    },
    masterItemButton: {
      alignItems: "center",
      backgroundColor: theme.color.masterAction,
      borderRadius: 10,
      minHeight: 50,
      justifyContent: "center"
    },
    buttonText: { color: theme.color.actionText, fontSize: 17, fontWeight: "700" },
    privacyNotice: {
      backgroundColor: theme.color.privacySurface,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.color.privacyBorder,
      padding: 14
    },
    privacyNoticeTitle: {
      color: theme.color.privacyText,
      fontWeight: "800",
      marginBottom: 4
    },
    privacyNoticeText: { color: theme.color.privacyText, lineHeight: 21 },
    footer: {
      borderTopColor: theme.color.divider,
      borderTopWidth: 1,
      gap: 10,
      marginTop: 12,
      paddingTop: 18
    },
    footerText: { color: theme.color.textMuted, fontSize: 13, lineHeight: 20 },
    results: { gap: 10, marginTop: 8 },
    resultTitle: { color: theme.color.textStrong, fontSize: 18, fontWeight: "800" },
    resultText: { color: theme.color.textMuted },
    multipleReview: { color: theme.color.textMuted, fontSize: 14, lineHeight: 20 },
    review: {
      backgroundColor: theme.color.reviewSurface,
      borderRadius: 8,
      color: theme.color.reviewText,
      lineHeight: 21,
      padding: 12
    },
    code: { color: theme.color.codeText, fontFamily: "monospace", fontWeight: "800" },
    detail: { color: theme.color.detailText, lineHeight: 20 },
    empty: { color: theme.color.textMuted, fontStyle: "italic", lineHeight: 21 },
    officialWarning: {
      backgroundColor: theme.color.ruleWarningSurface,
      borderRadius: 10,
      padding: 14
    },
    officialWarningTitle: { color: theme.color.warningText, fontWeight: "800", marginBottom: 4 },
    officialWarningText: { color: theme.color.warningText, fontSize: 15, lineHeight: 22 },
    originalLanguageNote: {
      color: theme.color.warningText,
      fontSize: 13,
      fontStyle: "italic",
      lineHeight: 19,
      marginTop: 6
    },
    masterItemWarning: {
      backgroundColor: theme.color.masterWarningSurface,
      borderRadius: 10,
      padding: 14
    },
    masterItemCard: {
      backgroundColor: theme.color.surface,
      borderColor: theme.color.cardBorder,
      borderRadius: 10,
      borderWidth: 1,
      gap: 9,
      padding: 14
    },
    masterProductName: { color: theme.color.textStrong, fontSize: 20, fontWeight: "800" },
    masterDetailsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    masterDetailCell: { width: "100%" },
    masterDetailCellDesktop: { width: "49%" },
    masterPrice: { color: theme.color.priceText, fontSize: 20, fontWeight: "800" },
    applicablePriceBlock: {
      backgroundColor: theme.color.priceSurface,
      borderRadius: 8,
      gap: 4,
      padding: 12
    },
    masterSnapshotNotice: {
      backgroundColor: theme.color.masterWarningSurface,
      borderRadius: 8,
      color: theme.color.warningText,
      lineHeight: 21,
      padding: 12
    },
    priceHistoryBlock: {
      borderTopColor: theme.color.subtleDivider,
      borderTopWidth: 1,
      gap: 5,
      paddingTop: 10
    },
    priceHistoryToggle: {
      alignItems: "center",
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      justifyContent: "space-between",
      minHeight: 44
    },
    priceHistoryToggleText: {
      color: theme.color.linkText,
      flexShrink: 1,
      fontWeight: "700",
      lineHeight: 20
    },
    priceHistoryHeader: { gap: 4, paddingBottom: 3 },
    priceHistoryRow: {
      borderBottomColor: theme.color.rowDivider,
      borderBottomWidth: 1,
      gap: 3,
      paddingVertical: 6
    },
    priceHistoryRowDesktop: { alignItems: "center", flexDirection: "row" },
    pricePeriodDesktop: { flex: 3 },
    priceValueDesktop: { flex: 1 },
    coverageSectionBlock: {
      borderTopColor: theme.color.subtleDivider,
      borderTopWidth: 1,
      gap: 5,
      paddingTop: 10
    },
    announcementSourceBlock: {
      backgroundColor: theme.color.announcementSurface,
      borderColor: theme.color.announcementBorder,
      borderRadius: 8,
      borderWidth: 1,
      gap: 7,
      marginTop: 6,
      padding: 12
    },
    announcementFactBlock: { gap: 6 },
    announcementFactTitle: {
      color: theme.color.announcementText,
      fontSize: 16,
      fontWeight: "800"
    },
    announcementPriceComparison: {
      color: theme.color.announcementText,
      flexShrink: 1,
      fontSize: 21,
      fontWeight: "900",
      lineHeight: 30
    },
    sourceBlockTitle: { color: theme.color.textStrong, fontWeight: "800" },
    sourceBlockMeta: { color: theme.color.textMuted, fontSize: 13 },
    sourceBlockWarning: { color: theme.color.announcementText, fontSize: 13, lineHeight: 19 },
    announcementOriginalLanguageNote: {
      color: theme.color.announcementText,
      fontSize: 13,
      fontStyle: "italic",
      lineHeight: 19
    },
    tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
    factTag: {
      backgroundColor: theme.color.tagSurface,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 5
    },
    factTagText: { color: theme.color.announcementText, fontSize: 13, fontWeight: "700" },
    filterBlock: { gap: 8 },
    filterTitle: { color: theme.color.detailText, fontWeight: "800" },
    filterRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    filterButton: {
      borderColor: theme.color.controlBorder,
      borderRadius: 999,
      borderWidth: 1,
      minHeight: 44,
      justifyContent: "center",
      paddingHorizontal: 14
    },
    filterButtonSelected: {
      backgroundColor: theme.color.controlSelectedSurface,
      borderColor: theme.color.controlSelectedSurface
    },
    filterButtonText: { color: theme.color.detailText, fontWeight: "700" },
    filterButtonTextSelected: { color: theme.color.actionText },
    sectionFilterNotice: {
      alignItems: "center",
      backgroundColor: theme.color.sectionFilterSurface,
      borderRadius: 9,
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
      justifyContent: "space-between",
      padding: 10
    },
    sectionFilterText: { color: theme.color.textStrong, fontWeight: "800" },
    clearSectionButton: { minHeight: 44, justifyContent: "center", paddingHorizontal: 8 },
    clearSectionButtonText: { color: theme.color.linkText, fontWeight: "700" },
    sectionItemsButton: {
      alignItems: "center",
      backgroundColor: theme.color.sectionFilterSurface,
      borderRadius: 9,
      minHeight: 46,
      justifyContent: "center",
      paddingHorizontal: 12
    },
    sectionItemsButtonText: { color: theme.color.linkText, fontWeight: "800" },
    coverageLink: {
      color: theme.color.linkText,
      fontWeight: "700",
      textDecorationLine: "underline"
    },
    ruleTextTree: { gap: 10, marginTop: 4 },
    officialRuleTextTitle: {
      color: theme.color.textStrong,
      fontSize: 18,
      fontWeight: "800",
      lineHeight: 25
    },
    ruleSectionNode: {
      backgroundColor: theme.color.surface,
      borderColor: theme.color.cardBorder,
      borderRadius: 10,
      borderWidth: 1,
      gap: 8,
      padding: 12
    },
    ruleSectionToggle: {
      alignItems: "center",
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      justifyContent: "space-between",
      minHeight: 44
    },
    ruleSectionTitle: {
      color: theme.color.textStrong,
      flexShrink: 1,
      fontSize: 17,
      fontWeight: "800",
      lineHeight: 24
    },
    ruleSectionToggleText: {
      color: theme.color.linkText,
      flexShrink: 1,
      fontWeight: "700",
      lineHeight: 20
    },
    ruleSectionBulkControls: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    ruleSectionBulkButton: {
      borderColor: theme.color.controlBorder,
      borderRadius: 8,
      borderWidth: 1,
      justifyContent: "center",
      minHeight: 44,
      paddingHorizontal: 12
    },
    ruleSectionBulkButtonText: { color: theme.color.linkText, fontWeight: "700", lineHeight: 20 },
    ruleSectionUnits: { gap: 8 },
    ruleCard: {
      backgroundColor: theme.color.surface,
      borderColor: theme.color.divider,
      borderRadius: 10,
      borderWidth: 1,
      gap: 8,
      padding: 14
    },
    ruleUnitToggle: {
      alignItems: "center",
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      justifyContent: "space-between",
      minHeight: 44
    },
    ruleUnitMetadata: { flexShrink: 1, gap: 3 },
    ruleUnitId: { color: theme.color.detailText, fontFamily: "monospace", fontWeight: "800" },
    rulePath: { color: theme.color.textMuted, fontSize: 13 },
    ruleUnitToggleText: {
      color: theme.color.linkText,
      flexShrink: 1,
      fontWeight: "700",
      lineHeight: 20
    },
    verbatimText: {
      color: theme.color.textStrong,
      fontFamily: "monospace",
      lineHeight: 22
    },
    comparisonBlock: {
      backgroundColor: theme.color.surface,
      borderColor: theme.color.cardBorder,
      borderRadius: 10,
      borderWidth: 1,
      gap: 8,
      marginTop: 4,
      padding: 14
    },
    comparisonTitle: {
      color: theme.color.textStrong,
      flexShrink: 1,
      fontSize: 17,
      fontWeight: "800",
      lineHeight: 24
    },
    comparisonContent: { gap: 9 },
    comparisonMethod: {
      color: theme.color.textMuted,
      fontSize: 14,
      lineHeight: 20
    },
    comparisonTermGroup: { gap: 6 },
    comparisonTermGroupTitle: {
      color: theme.color.textStrong,
      flexShrink: 1,
      fontWeight: "700",
      lineHeight: 22
    },
    comparisonTermRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 6
    },
    comparisonTerm: {
      backgroundColor: theme.color.tagSurface,
      borderColor: theme.color.subtleDivider,
      borderRadius: 6,
      borderWidth: 1,
      color: theme.color.textStrong,
      fontFamily: "monospace",
      lineHeight: 20,
      paddingHorizontal: 8,
      paddingVertical: 3
    },
    priorRuleTextBlock: {
      borderColor: theme.color.subtleDivider,
      borderRadius: 8,
      borderWidth: 1,
      gap: 8,
      padding: 12
    },
    ruleDrugIdentificationBlock: {
      backgroundColor: theme.color.surface,
      borderColor: theme.color.cardBorder,
      borderRadius: 10,
      borderWidth: 1,
      gap: 8,
      marginTop: 4,
      padding: 14
    },
    ruleDrugIdentificationToggle: {
      alignItems: "center",
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      justifyContent: "space-between",
      minHeight: 44
    },
    ruleDrugIdentificationTitle: {
      color: theme.color.textStrong,
      flexShrink: 1,
      fontSize: 17,
      fontWeight: "800",
      lineHeight: 24
    },
    ruleDrugIdentificationToggleText: {
      color: theme.color.linkText,
      flexShrink: 1,
      fontWeight: "700",
      lineHeight: 20
    },
    ruleDrugIdentificationContent: { gap: 9 },
    ruleDrugIdentificationCard: {
      borderColor: theme.color.subtleDivider,
      borderRadius: 8,
      borderWidth: 1,
      gap: 8,
      padding: 12
    },
    ruleDrugIdentificationDetails: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8
    }
  });
}
