import { useMemo, useState } from "react";
import {
  DEMO_WARNING,
  lookupMedication,
  type LookupResult,
  type MedicationRecord
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

export default function App(): React.JSX.Element {
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
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
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

        <View style={styles.privacyNotice}>
          <Text style={styles.privacyNoticeTitle}>此工具不接受病人資料</Text>
          <Text style={styles.privacyNoticeText}>請勿輸入姓名、病歷號、檢驗值、診斷或任何可識別病人資訊。</Text>
        </View>

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
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f7f9fc" },
  container: { width: "100%", maxWidth: 640, alignSelf: "center", padding: 20, gap: 14 },
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
  resultWarning: { color: "#9c2c0c", fontWeight: "700", lineHeight: 21 }
});
