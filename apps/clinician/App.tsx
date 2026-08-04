import { useMemo, useState } from "react";
import {
  DEMO_WARNING,
  lookupMedication,
  lookupRuleText,
  type LookupResult,
  type MedicationRecord,
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

type LookupMode = "demo" | "rules";

const ruleTextDataset = lookupRuleText({ query: "", as_of_date: "" });

function ResultCard({ record }: { record: MedicationRecord }): React.JSX.Element {
  return (
    <View style={styles.card} accessibilityRole="summary">
      <Text style={styles.code}>{record.nhiCode}</Text>
      <Text style={styles.productName}>{record.brandName}</Text>
      <Text style={styles.detail}>{record.genericName}</Text>
      <Text style={styles.detail}>{record.ingredients.join("；")}</Text>
      <Text style={styles.detail}>
        {record.strength} · {record.dosageForm}
      </Text>
      <Text style={styles.price}>示範支付價：NT$ {record.demoPaymentPriceNtd.toFixed(2)}</Text>
      <Text style={styles.meta}>版本 {record.datasetVersion} · 資料日期 {record.priceAsOfDate}</Text>
    </View>
  );
}

function DemoLookupMode(): React.JSX.Element {
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState<string | null>(null);
  const result = useMemo<LookupResult | null>(
    () => (submittedQuery === null ? null : lookupMedication({ query: submittedQuery })),
    [submittedQuery]
  );

  function performLookup(): void {
    setSubmittedQuery(query);
  }

  return (
    <View style={styles.modeContent}>
      <View style={styles.warning} accessibilityRole="alert">
        <Text style={styles.warningTitle}>DEMO_DATA_ONLY</Text>
        <Text style={styles.warningText}>{DEMO_WARNING}</Text>
      </View>

      <Text style={styles.title}>心血管／降血脂藥品查詢</Text>
      <Text style={styles.subtitle}>以藥碼、商品名、學名或成分搜尋示範藥品資料。</Text>

      <TextInput
        autoFocus
        accessibilityLabel="藥品搜尋"
        autoCapitalize="characters"
        autoCorrect={false}
        onChangeText={setQuery}
        onSubmitEditing={performLookup}
        placeholder="輸入藥碼、商品名、學名或成分"
        returnKeyType="search"
        style={styles.input}
        value={query}
      />
      <Pressable accessibilityRole="button" onPress={performLookup} style={styles.button}>
        <Text style={styles.buttonText}>查詢示範資料</Text>
      </Pressable>

      <PrivacyNotice />

      {result ? (
        <View style={styles.results}>
          <Text style={styles.resultTitle}>查詢結果：{result.status}</Text>
          <Text style={styles.resultText}>查詢日期：{result.asOfDate} · 資料狀態：{result.priceDataStatus}</Text>
          {result.manualReviewRequired ? (
            <Text style={styles.review}>此結果需要人工確認；系統不會自動選擇候選藥品，也不判定給付資格。</Text>
          ) : null}
          {result.candidates.map((record) => (
            <ResultCard key={record.nhiCode} record={record} />
          ))}
          {result.candidates.length === 0 ? (
            <Text style={styles.empty}>未在此可追溯的示範資料集找到可用結果。</Text>
          ) : null}
          <Text style={styles.resultWarning}>{result.warning}</Text>
        </View>
      ) : null}
    </View>
  );
}

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

function RuleLookupMode(): React.JSX.Element {
  const [query, setQuery] = useState("");
  const [asOfDate, setAsOfDate] = useState<string>(ruleTextDataset.effectiveFrom);
  const [datasetVersion, setDatasetVersion] = useState<string>(ruleTextDataset.datasetVersion);
  const [result, setResult] = useState<RuleTextLookupResult | null>(null);

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
  const [mode, setMode] = useState<LookupMode>("demo");

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View accessibilityRole="tablist" style={styles.modeTabs}>
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: mode === "demo" }}
            onPress={() => setMode("demo")}
            style={[styles.modeTab, mode === "demo" ? styles.modeTabSelected : null]}
          >
            <Text style={[styles.modeTabText, mode === "demo" ? styles.modeTabTextSelected : null]}>
              示範藥品
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

        {mode === "demo" ? <DemoLookupMode /> : <RuleLookupMode />}
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
  warning: { backgroundColor: "#7c2d12", borderRadius: 10, padding: 14 },
  warningTitle: { color: "#fff7ed", fontWeight: "800", marginBottom: 4 },
  warningText: { color: "#fff7ed", fontSize: 15, lineHeight: 22 },
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
  button: { alignItems: "center", backgroundColor: "#0f609b", borderRadius: 10, minHeight: 50, justifyContent: "center" },
  ruleButton: {
    alignItems: "center",
    backgroundColor: "#334e68",
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
  card: { backgroundColor: "#ffffff", borderColor: "#d9e2ec", borderRadius: 10, borderWidth: 1, gap: 4, padding: 14 },
  code: { color: "#0f609b", fontFamily: "monospace", fontWeight: "800" },
  productName: { color: "#102a43", fontSize: 17, fontWeight: "800" },
  detail: { color: "#334e68", lineHeight: 20 },
  price: { color: "#0f609b", fontSize: 16, fontWeight: "700", marginTop: 4 },
  meta: { color: "#627d98", fontSize: 12, marginTop: 2 },
  empty: { color: "#486581", fontStyle: "italic", lineHeight: 21 },
  resultWarning: { color: "#9c2c0c", fontWeight: "700", lineHeight: 21 },
  officialWarning: { backgroundColor: "#3f3a68", borderRadius: 10, padding: 14 },
  officialWarningTitle: { color: "#f5f3ff", fontWeight: "800", marginBottom: 4 },
  officialWarningText: { color: "#f5f3ff", fontSize: 15, lineHeight: 22 },
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
