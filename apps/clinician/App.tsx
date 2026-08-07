import { useMemo, useState } from "react";
import {
  ITEM_DATASET_VERSION,
  ITEM_WARNING,
  NAVIGABLE_DRUG_ITEM_RULE_SECTIONS,
  getDrugItemAnnouncementMembership,
  getNavigableDrugItemRuleSections,
  listDrugItemMasterRecordsByRuleSection,
  lookupDrugItemMaster,
  lookupRuleText,
  matchesDrugItemAnnouncementFilter,
  type DrugItemAnnouncementFilter,
  type DrugItemMasterLookupResult,
  type DrugItemMasterMatch,
  type NavigableDrugItemRuleSection,
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
  useWindowDimensions
} from "react-native";
import {
  getClinicianLayoutMode,
  resolveAnnouncementItemSource
} from "./src/drug-item-ui";

type LookupMode = "rules" | "drugItems";

const ruleTextDataset = lookupRuleText({ query: "", as_of_date: "" });
const drugItemsDataset = lookupDrugItemMaster({ query: "", as_of_date: "" });
const announcementFilters: readonly {
  readonly value: DrugItemAnnouncementFilter;
  readonly label: string;
}[] = Object.freeze([
  { value: "all", label: "全部" },
  { value: "changed", label: "本次公告異動" },
  { value: "trial", label: "三個月試用清單" },
  { value: "tableTwo", label: "表二品項" }
]);

function RuleUnitCard({ unit }: { unit: RuleTextUnit }): React.JSX.Element {
  return (
    <View style={styles.ruleCard} accessibilityRole="summary">
      <Text style={styles.ruleUnitId}>{unit.unitId}</Text>
      <Text style={styles.rulePath}>
        clausePath：{unit.clausePath.length > 0 ? unit.clausePath.join(" › ") : "（根層）"}
      </Text>
      <Text style={styles.verbatimText}>{unit.verbatimText}</Text>
    </View>
  );
}

function RuleLookupMode({
  initialQuery = "",
  onOpenDrugItemsForSection
}: {
  initialQuery?: string;
  onOpenDrugItemsForSection: (section: NavigableDrugItemRuleSection) => void;
}): React.JSX.Element {
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
      <Text style={styles.title}>官方規則逐字查詢</Text>
      <Text style={styles.subtitle}>以章節、單元編號或表名查找已驗證的逐字單元。</Text>

      <TextInput
        autoFocus
        accessibilityLabel="規則搜尋"
        autoCapitalize="none"
        autoCorrect={false}
        onChangeText={setQuery}
        onSubmitEditing={performLookup}
        placeholder="例如 2.6.1、2.6.1-002 或表一"
        returnKeyType="search"
        style={styles.input}
        value={query}
      />
      <TextInput
        accessibilityLabel="規則查詢日期"
        autoCapitalize="none"
        autoCorrect={false}
        onChangeText={setAsOfDate}
        placeholder="查詢日期 YYYY-MM-DD"
        style={styles.input}
        value={asOfDate}
      />
      <TextInput
        accessibilityLabel="規則資料集版本"
        autoCapitalize="none"
        autoCorrect={false}
        onChangeText={setDatasetVersion}
        placeholder="資料集版本"
        style={styles.input}
        value={datasetVersion}
      />
      <Pressable accessibilityRole="button" onPress={performLookup} style={styles.ruleButton}>
        <Text style={styles.buttonText}>查詢規則原文</Text>
      </Pressable>

      {result ? (
        <RuleLookupResult
          result={result}
          onOpenDrugItemsForSection={onOpenDrugItemsForSection}
        />
      ) : null}
    </View>
  );
}

function AnnouncementTags({ nhiCode }: { nhiCode: string }): React.JSX.Element | null {
  const membership = getDrugItemAnnouncementMembership(nhiCode);
  const tags = [
    membership.changed ? "本次公告異動" : undefined,
    membership.trial ? "三個月試用清單" : undefined,
    membership.tableTwo ? "表二品項" : undefined
  ].filter((label): label is string => label !== undefined);
  if (tags.length === 0) return null;

  return (
    <View style={styles.tagRow}>
      {tags.map((label) => (
        <View key={label} style={styles.factTag}>
          <Text style={styles.factTagText}>{label}</Text>
        </View>
      ))}
    </View>
  );
}

function AnnouncementItemSourceBlock({ nhiCode }: { nhiCode: string }): React.JSX.Element {
  const source = resolveAnnouncementItemSource(nhiCode);
  const result = {
    datasetVersion: ITEM_DATASET_VERSION,
    warning: ITEM_WARNING
  } as const;
  const missingPrice = "本次公告未列異動";

  return (
    <View style={styles.announcementSourceBlock}>
      <Text style={styles.sourceBlockTitle}>另一資料來源：2026-09-01 公告異動明細</Text>
      <Text style={styles.sourceBlockMeta}>資料集版本：{result.datasetVersion}</Text>
      <Text style={styles.sourceBlockWarning}>{result.warning}</Text>
      {source.status === "NOT_FOUND" ? (
        <Text style={styles.detail}>{source.message}</Text>
      ) : (
        <>
          {source.membership.changed ? (
            <View style={styles.announcementFactBlock}>
              <Text style={styles.announcementFactTitle}>本次公告異動</Text>
              <Text style={styles.detail}>
                原支付價：{source.item.priceBefore ?? missingPrice}
              </Text>
              <Text style={styles.detail}>
                初核價格：{source.item.priceAfter ?? missingPrice}
              </Text>
              <Text style={styles.detail}>
                生效日：{source.item.effectiveDate ?? "本資料列未提供"}
              </Text>
            </View>
          ) : null}
          {source.membership.tableTwo ? (
            <Text style={styles.detail}>
              表二歸屬：{source.item.tableClassification ?? "本資料列未提供"}
            </Text>
          ) : null}
          {source.membership.trial ? (
            <Text style={styles.detail}>
              三個月試用期註記：{source.item.exceptionNote ?? "本資料列未提供"}
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
  return (
    <View style={[styles.masterDetailCell, isDesktop ? styles.masterDetailCellDesktop : null]}>
      {children}
    </View>
  );
}

function DrugItemMasterCard({
  match,
  onOpenRuleText,
  isDesktop
}: {
  match: DrugItemMasterMatch;
  onOpenRuleText: (coverageRule: string) => void;
  isDesktop: boolean;
}): React.JSX.Element {
  const { item, applicablePricePeriod } = match;
  const missingField = "本資料列未提供";
  const specification = [item.specificationAmount, item.specificationUnit]
    .filter((value) => value.length > 0)
    .join(" ");
  const linkedRuleSections = getNavigableDrugItemRuleSections(item.coverageRuleSection);

  return (
    <View style={styles.masterItemCard} accessibilityRole="summary">
      <Text style={styles.masterProductName}>{item.drugNameZh}</Text>
      <AnnouncementTags nhiCode={item.nhiCode} />

      <View style={styles.masterDetailsGrid}>
        <MasterDetailCell isDesktop={isDesktop}>
          <Text style={styles.detail}>英文品名：{item.drugNameEn}</Text>
        </MasterDetailCell>
        <MasterDetailCell isDesktop={isDesktop}>
          <Text style={styles.code}>健保代碼：{item.nhiCode}</Text>
        </MasterDetailCell>
        <MasterDetailCell isDesktop={isDesktop}>
          <Text style={styles.detail}>成分及含量：{item.ingredient || missingField}</Text>
        </MasterDetailCell>
        <MasterDetailCell isDesktop={isDesktop}>
          <Text style={styles.detail}>規格：{specification || missingField}</Text>
        </MasterDetailCell>
        <MasterDetailCell isDesktop={isDesktop}>
          <Text style={styles.detail}>劑型：{item.dosageForm || missingField}</Text>
        </MasterDetailCell>
        <MasterDetailCell isDesktop={isDesktop}>
          <Text style={styles.detail}>藥商：{item.vendor || missingField}</Text>
        </MasterDetailCell>
        <MasterDetailCell isDesktop={isDesktop}>
          <Text style={styles.detail}>製造廠：{item.manufacturer || missingField}</Text>
        </MasterDetailCell>
        <MasterDetailCell isDesktop={isDesktop}>
          <Text style={styles.detail}>ATC：{item.atcCode || missingField}</Text>
        </MasterDetailCell>
        <MasterDetailCell isDesktop={isDesktop}>
          <Text style={styles.detail}>藥品分類：{item.drugCategory || missingField}</Text>
        </MasterDetailCell>
        <MasterDetailCell isDesktop={isDesktop}>
          <Text style={styles.detail}>
            分類分組名稱：{item.classificationGroupName || missingField}
          </Text>
        </MasterDetailCell>
        <MasterDetailCell isDesktop={isDesktop}>
          <Text style={styles.detail}>單複方：{item.singleOrCompound || missingField}</Text>
        </MasterDetailCell>
      </View>

      <View style={styles.applicablePriceBlock}>
        <Text style={styles.sourceBlockTitle}>該查詢日期適用之支付價</Text>
        <Text style={styles.masterPrice}>{applicablePricePeriod.paymentPriceRaw}</Text>
        <Text style={styles.sourceBlockMeta}>
          有效期間：{applicablePricePeriod.startDateIso} 至 {applicablePricePeriod.endDateIso}
        </Text>
      </View>

      <View style={styles.priceHistoryBlock}>
        <Text style={styles.sourceBlockTitle}>價格沿革</Text>
        <View style={[styles.priceHistoryHeader, isDesktop ? styles.priceHistoryRowDesktop : null]}>
          <Text style={[styles.sourceBlockMeta, isDesktop ? styles.pricePeriodDesktop : null]}>
            有效期間
          </Text>
          <Text style={[styles.sourceBlockMeta, isDesktop ? styles.priceValueDesktop : null]}>
            支付價
          </Text>
        </View>
        {item.priceHistory.map((period) => (
          <View
            key={`${period.effectiveStartRaw}-${period.effectiveEndRaw}`}
            style={[styles.priceHistoryRow, isDesktop ? styles.priceHistoryRowDesktop : null]}
          >
            <Text style={[styles.detail, isDesktop ? styles.pricePeriodDesktop : null]}>
              {period.startDateIso} 至 {period.endDateIso}
            </Text>
            <Text style={[styles.detail, isDesktop ? styles.priceValueDesktop : null]}>
              支付價：{period.paymentPriceRaw}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.coverageSectionBlock}>
        <Text style={styles.sourceBlockTitle}>給付規定章節</Text>
        <Text style={styles.detail}>{item.coverageRuleSection || missingField}</Text>
        {linkedRuleSections.map((section) => (
          <Pressable
            accessibilityLabel={`開啟規則 ${section} 的逐字條文`}
            accessibilityRole="button"
            key={section}
            onPress={() => onOpenRuleText(section)}
          >
            <Text style={styles.coverageLink}>{section}（開啟逐字條文）</Text>
          </Pressable>
        ))}
      </View>

      <AnnouncementItemSourceBlock nhiCode={item.nhiCode} />
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
      <Text style={styles.title}>藥品查詢</Text>
      <Text style={styles.subtitle}>以健保代碼、中文品名、英文品名或成分查找品項主檔。</Text>

      <TextInput
        autoFocus
        accessibilityLabel="藥品主檔搜尋"
        autoCapitalize="characters"
        autoCorrect={false}
        onChangeText={setQuery}
        onSubmitEditing={performLookup}
        placeholder="輸入中文品名、健保代碼、英文品名或成分"
        returnKeyType="search"
        style={styles.input}
        value={query}
      />
      <TextInput
        accessibilityLabel="藥品主檔查詢日期"
        autoCapitalize="none"
        autoCorrect={false}
        onChangeText={setAsOfDate}
        placeholder="查詢日期 YYYY-MM-DD"
        style={styles.input}
        value={asOfDate}
      />
      <TextInput
        accessibilityLabel="藥品主檔資料集版本"
        autoCapitalize="none"
        autoCorrect={false}
        onChangeText={setDatasetVersion}
        placeholder="資料集版本"
        style={styles.input}
        value={datasetVersion}
      />
      <Pressable accessibilityRole="button" onPress={performLookup} style={styles.masterItemButton}>
        <Text style={styles.buttonText}>查詢藥品主檔</Text>
      </Pressable>

      {sectionFilter === undefined ? null : (
        <View style={styles.sectionFilterNotice}>
          <Text style={styles.sectionFilterText}>章節篩選：{sectionFilter}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={onClearSectionFilter}
            style={styles.clearSectionButton}
          >
            <Text style={styles.clearSectionButtonText}>清除章節篩選</Text>
          </Pressable>
        </View>
      )}

      <View style={styles.filterBlock}>
        <Text style={styles.filterTitle}>結果篩選</Text>
        <View style={styles.filterRow}>
          {announcementFilters.map((filter) => (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: announcementFilter === filter.value }}
              key={filter.value}
              onPress={() => setAnnouncementFilter(filter.value)}
              style={[
                styles.filterButton,
                announcementFilter === filter.value ? styles.filterButtonSelected : null
              ]}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  announcementFilter === filter.value ? styles.filterButtonTextSelected : null
                ]}
              >
                {filter.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {hasResult ? (
        <View style={styles.results}>
          <View style={styles.masterItemWarning} accessibilityRole="alert">
            <Text style={styles.officialWarningTitle}>官方轉錄警語</Text>
            <Text style={styles.officialWarningText}>{drugItemsDataset.warning}</Text>
          </View>
          <Text style={styles.resultTitle}>
            {sectionFilter === undefined
              ? `查詢結果：${result?.status ?? "NOT_IN_VALIDATED_DATASET"}`
              : `章節品項：${sectionFilter}`}
          </Text>
          <Text style={styles.resultText}>
            資料集版本：{drugItemsDataset.datasetVersion} · 查詢日期：{asOfDate}
          </Text>
          {sectionFilter === undefined && result?.manualReviewRequired ? (
            <Text style={styles.review}>此結果需要人工確認；系統不會自動選取品項或替代期別。</Text>
          ) : null}
          {visibleMatches.map((match) => (
            <DrugItemMasterCard
              isDesktop={isDesktop}
              key={match.item.nhiCode}
              match={match}
              onOpenRuleText={onOpenRuleText}
            />
          ))}
          {unfilteredMatches.length === 0 ? (
            <Text style={styles.empty}>該查詢日期沒有已驗證資料所涵蓋的品項期別。</Text>
          ) : visibleMatches.length === 0 ? (
            <Text style={styles.empty}>此結果篩選目前沒有品項。</Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function RuleLookupResult({
  result,
  onOpenDrugItemsForSection
}: {
  result: RuleTextLookupResult;
  onOpenDrugItemsForSection: (section: NavigableDrugItemRuleSection) => void;
}): React.JSX.Element {
  const resultSections = NAVIGABLE_DRUG_ITEM_RULE_SECTIONS.filter((section) =>
    result.units.some((unit) => unit.section === section)
  );

  return (
    <View style={styles.results}>
      <View style={styles.officialWarning} accessibilityRole="alert">
        <Text style={styles.officialWarningTitle}>官方轉錄警語</Text>
        <Text style={styles.officialWarningText}>{result.warning}</Text>
      </View>
      <Text style={styles.resultTitle}>查詢結果：{result.status}</Text>
      <Text style={styles.resultText}>
        資料集版本：{result.datasetVersion} · 生效日：{result.effectiveFrom}
      </Text>
      {result.manualReviewRequired ? (
        <Text style={styles.review}>此結果需要人工確認；請比對健保署公告原文。</Text>
      ) : null}
      {resultSections.map((section) => (
        <Pressable
          accessibilityRole="button"
          key={section}
          onPress={() => onOpenDrugItemsForSection(section)}
          style={styles.sectionItemsButton}
        >
          <Text style={styles.sectionItemsButtonText}>查看本章節品項（{section}）</Text>
        </Pressable>
      ))}
      {result.units.map((unit) => (
        <RuleUnitCard key={unit.unitId} unit={unit} />
      ))}
      {result.units.length === 0 ? (
        <Text style={styles.empty}>此查詢未取得已驗證的逐字單元。</Text>
      ) : null}
    </View>
  );
}

function PrivacyNotice(): React.JSX.Element {
  return (
    <View style={styles.privacyNotice}>
      <Text style={styles.privacyNoticeTitle}>此工具不接受病人資料</Text>
      <Text style={styles.privacyNoticeText}>請勿輸入姓名、病歷號、檢驗值、診斷或任何可識別病人資訊。</Text>
    </View>
  );
}

function Footer(): React.JSX.Element {
  return (
    <View style={styles.footer}>
      <Text style={styles.footerText}>
        資料來源:衛生福利部中央健康保險署『健保用藥品項查詢項目檔』(政府資料開放平臺),依政府資料開放授權條款第1版利用
      </Text>
      <Text style={styles.footerText}>本站不設帳號、不蒐集任何個人資料;查詢內容不記錄、不儲存。</Text>
      <PrivacyNotice />
    </View>
  );
}

export default function App(): React.JSX.Element {
  const { width } = useWindowDimensions();
  const isDesktop = getClinicianLayoutMode(width) === "desktop";
  const [mode, setMode] = useState<LookupMode>("drugItems");
  const [ruleQuerySeed, setRuleQuerySeed] = useState("");
  const [masterSectionFilter, setMasterSectionFilter] =
    useState<NavigableDrugItemRuleSection>();

  function openRuleText(coverageRule: string): void {
    setRuleQuerySeed(coverageRule);
    setMode("rules");
  }

  function openDrugItemsForSection(section: NavigableDrugItemRuleSection): void {
    setMasterSectionFilter(section);
    setMode("drugItems");
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={[
          styles.container,
          isDesktop ? styles.containerDesktop : styles.containerMobile
        ]}
        keyboardShouldPersistTaps="handled"
      >
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
              藥品查詢
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: mode === "rules" }}
            onPress={() => setMode("rules")}
            style={[styles.modeTab, mode === "rules" ? styles.modeTabSelected : null]}
          >
            <Text style={[styles.modeTabText, mode === "rules" ? styles.modeTabTextSelected : null]}>
              規則逐字查詢
            </Text>
          </Pressable>
        </View>

        {mode === "rules" ? (
          <RuleLookupMode
            initialQuery={ruleQuerySeed}
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
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f7f9fc" },
  container: { width: "100%", alignSelf: "center" },
  containerDesktop: { maxWidth: 960, padding: 24, gap: 20 },
  containerMobile: { maxWidth: 767, padding: 16, gap: 16 },
  modeTabs: {
    backgroundColor: "#e8eef5",
    borderRadius: 12,
    flexDirection: "row",
    gap: 4,
    padding: 4
  },
  modeTab: { alignItems: "center", borderRadius: 9, flex: 1, minHeight: 48, justifyContent: "center" },
  modeTabSelected: { backgroundColor: "#ffffff" },
  modeTabText: { color: "#486581", fontSize: 16, fontWeight: "700" },
  modeTabTextSelected: { color: "#102a43" },
  modeContent: { gap: 14 },
  title: { color: "#102a43", fontSize: 26, fontWeight: "800", marginTop: 6 },
  subtitle: { color: "#486581", fontSize: 16, lineHeight: 23 },
  input: {
    backgroundColor: "#ffffff",
    borderColor: "#829ab1",
    borderRadius: 10,
    borderWidth: 1,
    color: "#102a43",
    fontSize: 18,
    minHeight: 52,
    paddingHorizontal: 14
  },
  ruleButton: {
    alignItems: "center",
    backgroundColor: "#334e68",
    borderRadius: 10,
    minHeight: 50,
    justifyContent: "center"
  },
  masterItemButton: {
    alignItems: "center",
    backgroundColor: "#5b3a29",
    borderRadius: 10,
    minHeight: 50,
    justifyContent: "center"
  },
  buttonText: { color: "#ffffff", fontSize: 17, fontWeight: "700" },
  privacyNotice: {
    backgroundColor: "#e6f6ff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#9fb3c8",
    padding: 14
  },
  privacyNoticeTitle: { color: "#102a43", fontWeight: "800", marginBottom: 4 },
  privacyNoticeText: { color: "#334e68", lineHeight: 21 },
  footer: { borderTopColor: "#bcccdc", borderTopWidth: 1, gap: 10, marginTop: 12, paddingTop: 18 },
  footerText: { color: "#486581", fontSize: 13, lineHeight: 20 },
  results: { gap: 10, marginTop: 8 },
  resultTitle: { color: "#102a43", fontSize: 18, fontWeight: "800" },
  resultText: { color: "#486581" },
  review: { backgroundColor: "#fff3c4", borderRadius: 8, color: "#5f370e", lineHeight: 21, padding: 12 },
  code: { color: "#0f609b", fontFamily: "monospace", fontWeight: "800" },
  detail: { color: "#334e68", lineHeight: 20 },
  empty: { color: "#486581", fontStyle: "italic", lineHeight: 21 },
  officialWarning: { backgroundColor: "#3f3a68", borderRadius: 10, padding: 14 },
  officialWarningTitle: { color: "#f5f3ff", fontWeight: "800", marginBottom: 4 },
  officialWarningText: { color: "#f5f3ff", fontSize: 15, lineHeight: 22 },
  masterItemWarning: { backgroundColor: "#5b3a29", borderRadius: 10, padding: 14 },
  masterItemCard: {
    backgroundColor: "#ffffff",
    borderColor: "#d6c4b8",
    borderRadius: 10,
    borderWidth: 1,
    gap: 9,
    padding: 14
  },
  masterProductName: { color: "#102a43", fontSize: 20, fontWeight: "800" },
  masterDetailsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  masterDetailCell: { width: "100%" },
  masterDetailCellDesktop: { width: "49%" },
  masterPrice: { color: "#7c2d12", fontSize: 20, fontWeight: "800" },
  applicablePriceBlock: { backgroundColor: "#fff7ed", borderRadius: 8, gap: 4, padding: 12 },
  priceHistoryBlock: { borderTopColor: "#d9e2ec", borderTopWidth: 1, gap: 5, paddingTop: 10 },
  priceHistoryHeader: { gap: 4, paddingBottom: 3 },
  priceHistoryRow: { borderBottomColor: "#edf2f7", borderBottomWidth: 1, gap: 3, paddingVertical: 6 },
  priceHistoryRowDesktop: { alignItems: "center", flexDirection: "row" },
  pricePeriodDesktop: { flex: 3 },
  priceValueDesktop: { flex: 1 },
  coverageSectionBlock: { borderTopColor: "#d9e2ec", borderTopWidth: 1, gap: 5, paddingTop: 10 },
  announcementSourceBlock: {
    backgroundColor: "#eef8f4",
    borderColor: "#9bc4b6",
    borderRadius: 8,
    borderWidth: 1,
    gap: 7,
    marginTop: 6,
    padding: 12
  },
  announcementFactBlock: { gap: 4 },
  announcementFactTitle: { color: "#285943", fontWeight: "800" },
  sourceBlockTitle: { color: "#102a43", fontWeight: "800" },
  sourceBlockMeta: { color: "#627d98", fontSize: 13 },
  sourceBlockWarning: { color: "#285943", fontSize: 13, lineHeight: 19 },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  factTag: { backgroundColor: "#d9eee7", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  factTagText: { color: "#285943", fontSize: 13, fontWeight: "700" },
  filterBlock: { gap: 8 },
  filterTitle: { color: "#334e68", fontWeight: "800" },
  filterRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  filterButton: {
    borderColor: "#829ab1",
    borderRadius: 999,
    borderWidth: 1,
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: 14
  },
  filterButtonSelected: { backgroundColor: "#334e68", borderColor: "#334e68" },
  filterButtonText: { color: "#334e68", fontWeight: "700" },
  filterButtonTextSelected: { color: "#ffffff" },
  sectionFilterNotice: {
    alignItems: "center",
    backgroundColor: "#e8eef5",
    borderRadius: 9,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "space-between",
    padding: 10
  },
  sectionFilterText: { color: "#102a43", fontWeight: "800" },
  clearSectionButton: { minHeight: 44, justifyContent: "center", paddingHorizontal: 8 },
  clearSectionButtonText: { color: "#0f609b", fontWeight: "700" },
  sectionItemsButton: {
    alignItems: "center",
    backgroundColor: "#e8eef5",
    borderRadius: 9,
    minHeight: 46,
    justifyContent: "center",
    paddingHorizontal: 12
  },
  sectionItemsButtonText: { color: "#0f609b", fontWeight: "800" },
  coverageLink: { color: "#0f609b", fontWeight: "700", textDecorationLine: "underline" },
  ruleCard: {
    backgroundColor: "#ffffff",
    borderColor: "#bcccdc",
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
    padding: 14
  },
  ruleUnitId: { color: "#334e68", fontFamily: "monospace", fontWeight: "800" },
  rulePath: { color: "#627d98", fontSize: 13 },
  verbatimText: { color: "#102a43", fontFamily: "monospace", lineHeight: 22 }
});
