# B 軌總索引:專業簽核與實機作業(v3.2 §32 領域)

> RA 2026-08-05 指示「B軌全推進」之產物。B 軌=**只有 RA/外部專業能執行的動作**(法律意見、個資審閱、資安審查、實機 PoC);本目錄把每一項備妥到「拿了就能交辦」——委任摘要、審閱問題清單、執行手冊、回登格式。**紅線不變**:RA 裁定不能替代 §32 專業簽核(RDL-017 註記);任何一份專業意見取得前,對應閘門維持關閉。

## 1. 項目索引

| 項 | 內容 | 專業別 | 委任文件 | 完成定義 | 建議時點 |
| --- | --- | --- | --- | --- | --- |
| B1 | SaMD 法律定性正式意見 | 法律(醫療器材法規) | [B1-samd-legal-brief.md](B1-samd-legal-brief.md) | 書面意見:是否屬醫療器材軟體;若是,分類分級與義務 | 越早越好;**送審/production 前必須** |
| B2 | 隱私文件與個資合規審閱(含 DPA) | 法律/個資 | [B2-privacy-legal-review-brief.md](B2-privacy-legal-review-brief.md) | 三草案+保存期限表+ADR-002+處理者名冊之書面核定或修訂意見 | **Phase 2 實作前必須** |
| B3 | 正式 STRIDE 資安審閱 | 資安 | [B3-security-stride-brief.md](B3-security-stride-brief.md) | 對 auth/帳號資料面之 STRIDE 報告+風險處置表 | **Phase 2 進入閘門**(threat-model.md 明文) |
| B4 | ADR-008 實機 PoC | 工程(具 Xcode/adb 環境) | [B4-adr008-poc-runbook.md](B4-adr008-poc-runbook.md) | 兩波量測證據齊備;ADR-008 轉 ACCEPTED 或回評估表 | W1 隨時可測;W2 隨 Phase 2 功能 |
| B5 | 商店合規法律定性 | 法律 | [B5-store-compliance-legal-brief.md](B5-store-compliance-legal-brief.md) | 矩陣內各【待核】法律項之書面核定 | Phase 4 送審前;B1 相依項先行 |

相依:B5 之核心前置=B1;B2 完成前隱私文件不得上線(P1 三草案標示);B3 完成前不進 Phase 2 實作;B4 完成前 ADR-008 不鎖定(v3.2 §17.8)。

> **2026-08-06 註(RDL-018)**:web-only 無帳號 display-only 上線依 §32 誠實偏離紀錄先行,B1–B3 未取得即發布(RA 承擔風險;L4 並裁 SaMD 意見此時不委任)。本表各件之閘門效力**不因此消滅**:Phase 2 仍需 B2+B3,商店送審仍需 B1/B5,ADR-008 鎖定仍需 B4。

## 2. 回登程序(統一)

1. **收件**:專業意見/報告以檔案交付 RA;RA 上傳本 session 並宣告出處(出具者、日期、涵蓋文件版本)。
2. **登錄**:派發方計算 SHA-256,登記於下方簽核台帳(hash-only 慣例,RDL-007 同式;意見書本文是否入 repo 由 RA 逐案決定)。
3. **狀態翻轉**:對應文件狀態更新(如 DRAFT→法律核定、ADR-002→Accepted、ADR-008→ACCEPTED),一律引用台帳列。
4. **閘門重評**:受該簽核阻擋的閘門(Phase 2 進入、送審、production)於 RDL/phase-plan 重評,逐案裁示。

## 3. 簽核台帳(§32 ledger)

| # | 項 | 出具者(角色) | 日期 | 涵蓋文件與版本 | 結論 | 檔案 SHA-256 | 狀態翻轉紀錄 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| (尚無收件) | | | | | | | |

> 台帳規則:append-only;出具者記角色與身分(法律事務所/個資顧問/資安審查者/工程執行者);「結論」僅記 PASS/條件通過/不通過+一句話,全文以檔案為準。

## 4. 委任前產品事實時效檢查

每次將 B1–B5 任一委任包交付外部專業前,必須重新確認其所載產品事實為最新現況。逐句核對下列權威來源:

- `docs/regulatory-decision-log.md`(特別是 RDL-018 至 RDL-023)
- `CHANGELOG.md`
- `docs/launch-runbook.md`
- `docs/source-register/drug-item-master.registry.json`
- `apps/clinician/App.tsx`

若產品狀態、介面、資料集、呈現內容或上線範圍已變更,先校正委任包再交付;若來源之間衝突或無法佐證,停止交付並回報 RA,不得臆測填補。
