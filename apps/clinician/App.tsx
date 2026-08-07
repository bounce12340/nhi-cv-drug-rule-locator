import { useState } from "react";
import {
  lookupDrugItem,
  lookupDrugItemMaster,
  lookupRuleText,
  type DrugItemMasterLookupResult,
  type DrugItemMasterMatch,
  type DrugItemLookupResult,
  type DrugItemRecord,
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
  View
} from "react-native";

type LookupMode = "rules" | "items" | "drugItems";

const ruleTextDataset = lookupRuleText({ query: "", as_of_date: "" });
const itemDataset = lookupDrugItem({ query: "", as_of_date: "" });
const drugItemsDataset = lookupDrugItemMaster({ query: "", as_of_date: "" });

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

function RuleLookupMode({ initialQuery = "" }: { initialQuery?: string }): React.JSX.Element {
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

      <PrivacyNotice />

      {result ? <RuleLookupResult result={result} /> : null}
    </View>
  );
}

function DrugItemCard({
  record,
  onOpenRuleText
}: {
  record: DrugItemRecord;
  onOpenRuleText: (coverageRule: string) => void;
}): React.JSX.Element {
  const missingField = "本資料列未提供";
  const missingPrice = "本次公告未列異動";
  const priceComparison =
    record.priceBefore === undefined && record.priceAfter === undefined
      ? missingPrice
      : `${record.priceBefore ?? missingPrice} → ${record.priceAfter ?? missingPrice}`;

  return (
    <View style={styles.itemCard} accessibilityRole="summary">
      <Text style={styles.code}>{record.nhiCode}</Text>
      <Text style={styles.productName}>{record.drugNameEn}</Text>
      <Text style={styles.detail}>成分及含量：{record.ingredient ?? missingField}</Text>
      <Text style={styles.detail}>成分類別：{record.ingredientCategory ?? missingField}</Text>
      <Text style={styles.detail}>藥商：{record.manufacturer ?? missingField}</Text>
      <Text style={styles.itemPrice}>原支付價 → 初核價格：{priceComparison}</Text>
      <Text style={styles.detail}>生效日期：{record.effectiveDate ?? missingField}</Text>
      <View style={styles.itemFieldRow}>
        <Text style={styles.detail}>公告所載給付規定條號：</Text>
        {record.coverageRule === undefined ? (
          <Text style={styles.detail}>{missingField}</Text>
        ) : (
          <Pressable
            accessibilityLabel={`開啟規則 ${record.coverageRule} 的逐字條文`}
            accessibilityRole="button"
            onPress={() => onOpenRuleText(record.coverageRule!)}
          >
            <Text style={styles.coverageLink}>{record.coverageRule}（開啟逐字條文）</Text>
          </Pressable>
        )}
      </View>
      <Text style={styles.detail}>表別分類：{record.tableClassification ?? missingField}</Text>
      <Text style={styles.detail}>例外註記：{record.exceptionNote ?? missingField}</Text>
    </View>
  );
}

function DrugItemLookupMode({
  onOpenRuleText
}: {
  onOpenRuleText: (coverageRule: string) => void;
}): React.JSX.Element {
  const [query, setQuery] = useState("");
  const [asOfDate, setAsOfDate] = useState<string>(itemDataset.effectiveFrom);
  const [datasetVersion, setDatasetVersion] = useState<string>(itemDataset.datasetVersion);
  const [result, setResult] = useState<DrugItemLookupResult | null>(null);

  function performLookup(): void {
    setResult(
      lookupDrugItem({
        query,
        as_of_date: asOfDate,
        ...(datasetVersion.trim().length > 0 ? { dataset_version: datasetVersion } : {})
      })
    );
  }

  return (
    <View style={styles.modeContent}>
      <Text style={styles.title}>藥品品項查詢</Text>
      <Text style={styles.subtitle}>以健保代碼、英文品名或成分查找公告所載品項。</Text>

      <TextInput
        autoFocus
        accessibilityLabel="藥品品項搜尋"
        autoCapitalize="characters"
        autoCorrect={false}
        onChangeText={setQuery}
        onSubmitEditing={performLookup}
        placeholder="輸入健保代碼、英文品名或成分"
        returnKeyType="search"
        style={styles.input}
        value={query}
      />
      <TextInput
        accessibilityLabel="品項查詢日期"
        autoCapitalize="none"
        autoCorrect={false}
        onChangeText={setAsOfDate}
        placeholder="查詢日期 YYYY-MM-DD"
        style={styles.input}
        value={asOfDate}
      />
      <TextInput
        accessibilityLabel="品項資料集版本"
        autoCapitalize="none"
        autoCorrect={false}
        onChangeText={setDatasetVersion}
        placeholder="資料集版本"
        style={styles.input}
        value={datasetVersion}
      />
      <Pressable accessibilityRole="button" onPress={performLookup} style={styles.itemButton}>
        <Text style={styles.buttonText}>查詢藥品品項</Text>
      </Pressable>

      <PrivacyNotice />

      {result ? (
        <View style={styles.results}>
          <View style={styles.officialItemWarning} accessibilityRole="alert">
            <Text style={styles.officialWarningTitle}>官方轉錄警語</Text>
            <Text style={styles.officialWarningText}>{result.warning}</Text>
          </View>
          <Text style={styles.resultTitle}>查詢結果：{result.status}</Text>
          <Text style={styles.resultText}>
            資料集版本：{result.datasetVersion} · 生效日：{result.effectiveFrom}
          </Text>
          {result.manualReviewRequired ? (
            <Text style={styles.review}>此結果需要人工確認；系統不會自動選取品項。</Text>
          ) : null}
          {result.items.map((record) => (
            <DrugItemCard key={record.nhiCode} record={record} onOpenRuleText={onOpenRuleText} />
          ))}
          {result.items.length === 0 ? (
            <Text style={styles.empty}>此查詢未取得已驗證的品項資料。</Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function AnnouncementItemSourceBlock({ nhiCode }: { nhiCode: string }): React.JSX.Element | null {
  const result = lookupDrugItem({
    query: nhiCode,
    as_of_date: itemDataset.effectiveFrom,
    dataset_version: itemDataset.datasetVersion
  });
  const announcementItem = result.items[0];
  if (result.status !== "EXACT_MATCH" || announcementItem === undefined) return null;

  const missingPrice = "本次公告未列異動";
  return (
    <View style={styles.announcementSourceBlock}>
      <Text style={styles.sourceBlockTitle}>另一資料來源：2026-09-01 公告異動明細</Text>
      <Text style={styles.sourceBlockMeta}>資料集版本：{result.datasetVersion}</Text>
      <Text style={styles.sourceBlockWarning}>{result.warning}</Text>
      <Text style={styles.detail}>
        原支付價：{announcementItem.priceBefore ?? missingPrice}
      </Text>
      <Text style={styles.detail}>
        初核價格：{announcementItem.priceAfter ?? missingPrice}
      </Text>
      <Text style={styles.detail}>
        生效日：{announcementItem.effectiveDate ?? "本資料列未提供"}
      </Text>
    </View>
  );
}

function DrugItemMasterCard({
  match,
  onOpenRuleText
}: {
  match: DrugItemMasterMatch;
  onOpenRuleText: (coverageRule: string) => void;
}): React.JSX.Element {
  const { item, applicablePricePeriod } = match;
  const missingField = "本資料列未提供";
  const specification = [item.specificationAmount, item.specificationUnit]
    .filter((value) => value.length > 0)
    .join(" ");
  const linkedRuleSections = ["2.6.1", "2.6.2", "2.6.3"].filter((section) =>
    item.coverageRuleSection.includes(section)
  );

  return (
    <View style={styles.masterItemCard} accessibilityRole="summary">
      <Text style={styles.masterProductName}>{item.drugNameZh}</Text>
      <Text style={styles.detail}>英文品名：{item.drugNameEn}</Text>
      <Text style={styles.code}>健保代碼：{item.nhiCode}</Text>
      <Text style={styles.detail}>成分及含量：{item.ingredient || missingField}</Text>
      <Text style={styles.detail}>規格：{specification || missingField}</Text>
      <Text style={styles.detail}>劑型：{item.dosageForm || missingField}</Text>
      <Text style={styles.detail}>藥商：{item.vendor || missingField}</Text>
      <Text style={styles.detail}>製造廠：{item.manufacturer || missingField}</Text>
      <Text style={styles.detail}>ATC：{item.atcCode || missingField}</Text>
      <Text style={styles.detail}>藥品分類：{item.drugCategory || missingField}</Text>
      <Text style={styles.detail}>
        分類分組名稱：{item.classificationGroupName || missingField}
      </Text>
      <Text style={styles.detail}>單複方：{item.singleOrCompound || missingField}</Text>

      <View style={styles.applicablePriceBlock}>
        <Text style={styles.sourceBlockTitle}>該查詢日期適用之支付價</Text>
        <Text style={styles.masterPrice}>{applicablePricePeriod.paymentPriceRaw}</Text>
        <Text style={styles.sourceBlockMeta}>
          有效期間：{applicablePricePeriod.startDateIso} 至 {applicablePricePeriod.endDateIso}
        </Text>
      </View>

      <View style={styles.priceHistoryBlock}>
        <Text style={styles.sourceBlockTitle}>價格沿革</Text>
        <Text style={styles.sourceBlockMeta}>有效期間 → 支付價</Text>
        {item.priceHistory.map((period) => (
          <View
            key={`${period.effectiveStartRaw}-${period.effectiveEndRaw}`}
            style={styles.priceHistoryRow}
          >
            <Text style={styles.detail}>
              {period.startDateIso} 至 {period.endDateIso} → {period.paymentPriceRaw}
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
  onOpenRuleText
}: {
  onOpenRuleText: (coverageRule: string) => void;
}): React.JSX.Element {
  const [query, setQuery] = useState("");
  const [asOfDate, setAsOfDate] = useState<string>(drugItemsDataset.effectiveFrom);
  const [datasetVersion, setDatasetVersion] = useState<string>(drugItemsDataset.datasetVersion);
  const [result, setResult] = useState<DrugItemMasterLookupResult | null>(null);

  function performLookup(): void {
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
      <Text style={styles.title}>藥品查詢（中文品名與價格沿革）</Text>
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

      <PrivacyNotice />

      {result ? (
        <View style={styles.results}>
          <View style={styles.masterItemWarning} accessibilityRole="alert">
            <Text style={styles.officialWarningTitle}>官方轉錄警語</Text>
            <Text style={styles.officialWarningText}>{result.warning}</Text>
          </View>
          <Text style={styles.resultTitle}>查詢結果：{result.status}</Text>
          <Text style={styles.resultText}>
            資料集版本：{result.datasetVersion} · 查詢日期：{result.asOfDate}
          </Text>
          {result.manualReviewRequired ? (
            <Text style={styles.review}>此結果需要人工確認；系統不會自動選取品項或替代期別。</Text>
          ) : null}
          {result.matches.map((match) => (
            <DrugItemMasterCard
              key={match.item.nhiCode}
              match={match}
              onOpenRuleText={onOpenRuleText}
            />
          ))}
          {result.matches.length === 0 ? (
            <Text style={styles.empty}>該查詢日期沒有已驗證資料所涵蓋的品項期別。</Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function RuleLookupResult({ result }: { result: RuleTextLookupResult }): React.JSX.Element {
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

export default function App(): React.JSX.Element {
  const [mode, setMode] = useState<LookupMode>("drugItems");
  const [ruleQuerySeed, setRuleQuerySeed] = useState("");

  function openRuleText(coverageRule: string): void {
    setRuleQuerySeed(coverageRule);
    setMode("rules");
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View accessibilityRole="tablist" style={styles.modeTabs}>
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
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: mode === "items" }}
            onPress={() => setMode("items")}
            style={[styles.modeTab, mode === "items" ? styles.modeTabSelected : null]}
          >
            <Text style={[styles.modeTabText, mode === "items" ? styles.modeTabTextSelected : null]}>
              藥品品項查詢
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: mode === "drugItems" }}
            onPress={() => setMode("drugItems")}
            style={[styles.modeTab, mode === "drugItems" ? styles.modeTabSelected : null]}
          >
            <Text
              style={[styles.modeTabText, mode === "drugItems" ? styles.modeTabTextSelected : null]}
            >
              藥品查詢(中文品名)
            </Text>
          </Pressable>
        </View>

        {mode === "rules" ? (
          <RuleLookupMode initialQuery={ruleQuerySeed} />
        ) : mode === "items" ? (
          <DrugItemLookupMode onOpenRuleText={openRuleText} />
        ) : (
          <DrugItemMasterLookupMode onOpenRuleText={openRuleText} />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f7f9fc" },
  container: { width: "100%", maxWidth: 720, alignSelf: "center", padding: 20, gap: 16 },
  modeTabs: {
    backgroundColor: "#e8eef5",
    borderRadius: 12,
    flexDirection: "row",
    gap: 4,
    padding: 4
  },
  modeTab: { alignItems: "center", borderRadius: 9, flex: 1, minHeight: 46, justifyContent: "center" },
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
  itemButton: {
    alignItems: "center",
    backgroundColor: "#146356",
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
  privacyNotice: { backgroundColor: "#e6f6ff", borderRadius: 10, borderWidth: 1, borderColor: "#9fb3c8", padding: 14 },
  privacyNoticeTitle: { color: "#102a43", fontWeight: "800", marginBottom: 4 },
  privacyNoticeText: { color: "#334e68", lineHeight: 21 },
  results: { gap: 10, marginTop: 8 },
  resultTitle: { color: "#102a43", fontSize: 18, fontWeight: "800" },
  resultText: { color: "#486581" },
  review: { backgroundColor: "#fff3c4", borderRadius: 8, color: "#5f370e", lineHeight: 21, padding: 12 },
  code: { color: "#0f609b", fontFamily: "monospace", fontWeight: "800" },
  productName: { color: "#102a43", fontSize: 17, fontWeight: "800" },
  detail: { color: "#334e68", lineHeight: 20 },
  empty: { color: "#486581", fontStyle: "italic", lineHeight: 21 },
  officialWarning: { backgroundColor: "#3f3a68", borderRadius: 10, padding: 14 },
  officialWarningTitle: { color: "#f5f3ff", fontWeight: "800", marginBottom: 4 },
  officialWarningText: { color: "#f5f3ff", fontSize: 15, lineHeight: 22 },
  officialItemWarning: { backgroundColor: "#285943", borderRadius: 10, padding: 14 },
  masterItemWarning: { backgroundColor: "#5b3a29", borderRadius: 10, padding: 14 },
  itemCard: {
    backgroundColor: "#ffffff",
    borderColor: "#b8d8cf",
    borderRadius: 10,
    borderWidth: 1,
    gap: 6,
    padding: 14
  },
  itemPrice: { color: "#146356", fontSize: 16, fontWeight: "700", marginTop: 4 },
  itemFieldRow: { alignItems: "baseline", flexDirection: "row", flexWrap: "wrap" },
  masterItemCard: {
    backgroundColor: "#ffffff",
    borderColor: "#d6c4b8",
    borderRadius: 10,
    borderWidth: 1,
    gap: 7,
    padding: 14
  },
  masterProductName: { color: "#102a43", fontSize: 20, fontWeight: "800" },
  masterPrice: { color: "#7c2d12", fontSize: 20, fontWeight: "800" },
  applicablePriceBlock: { backgroundColor: "#fff7ed", borderRadius: 8, gap: 4, padding: 12 },
  priceHistoryBlock: { borderTopColor: "#d9e2ec", borderTopWidth: 1, gap: 5, paddingTop: 10 },
  priceHistoryRow: { borderBottomColor: "#edf2f7", borderBottomWidth: 1, paddingVertical: 4 },
  coverageSectionBlock: { borderTopColor: "#d9e2ec", borderTopWidth: 1, gap: 5, paddingTop: 10 },
  announcementSourceBlock: {
    backgroundColor: "#eef8f4",
    borderColor: "#9bc4b6",
    borderRadius: 8,
    borderWidth: 1,
    gap: 5,
    marginTop: 6,
    padding: 12
  },
  sourceBlockTitle: { color: "#102a43", fontWeight: "800" },
  sourceBlockMeta: { color: "#627d98", fontSize: 13 },
  sourceBlockWarning: { color: "#285943", fontSize: 13, lineHeight: 19 },
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
