# TC-20260809-26 自我檢查報告

- 日期:2026-08-09
- 建置者:Codex GPT-5.6 Sol
- 性質:純治理文件事實校正;本報告不作法律分析、定性結論或合規判斷

## 1. 稽核方法與範圍

已完整閱讀 `CLAUDE.md`、`CONTRIBUTING.md`、`docs/task-contracts/TC-20260809-26.md` 與 B1–B5 五份委任包,並逐句核對委任包中的產品現況陳述。事實來源依任務契約限定為:

- `docs/regulatory-decision-log.md`(重點 RDL-018–RDL-023)
- `CHANGELOG.md`
- `docs/launch-runbook.md`
- `docs/source-register/drug-item-master.registry.json`
- `apps/clinician/App.tsx`

本次產物編修限於 `docs/b-track/B1-samd-legal-brief.md`、`docs/b-track/B2-privacy-legal-review-brief.md`、`docs/b-track/B4-adr008-poc-runbook.md`、`docs/b-track/README.md` 與本報告。未編修 B3、B5、程式碼、測試、governed 資料、部署設定、scripts 或 `.github/**`;未執行任何 git 指令。

## 2. B1 稽核

### 已改

- 將「demo 階段、未上線」校正為 2026-08-06 依 RDL-018 上線之 production web 服務,補充對外主機名 `https://nhi.uic-ai.com`、公開可用、無帳號、不蒐集個人資料、查詢內容不記錄/儲存及不處理病人資料。依據:RDL-018;`CHANGELOG.md` 「Production 首次部署」、「自訂網域完成」與 2026-08-07 重新部署條目;`docs/launch-runbook.md` §2.1;`apps/clinician/App.tsx` 頁尾與病人資料提示。
- 補入現行兩個分頁:藥品查詢(預設)+規則逐字查詢,以及公告資料在藥品主檔卡片中另立來源區塊的現況。依據:`CHANGELOG.md` 「UI 大改版」與「production UI 移除示範分頁」;`apps/clinician/App.tsx` 的 `LookupMode`、分頁文案、預設 mode 與 `AnnouncementItemSourceBlock`。
- 補入現行三個引擎使用之 governed 資料集版本:`nhi-lipid-2026-09-01-r1`、`nhi-lipid-rules-structured-2026-09-01-r1`、`nhi-drug-items-2026-08-07-r2`,並寫明雜湊/保真驗證與 RA 固定語式核准入庫事實。依據:RDL-012、RDL-015、RDL-016、RDL-019、RDL-022、RDL-023;`CHANGELOG.md` 對應入庫/引擎消費條目;`docs/source-register/drug-item-master.registry.json` 之 `current.datasetVersion`。
- 將「價格僅虛構示範資料」校正為官方入庫資料的實際呈現:公告來源的原支付價與初核價格,以及項目主檔的查詢日適用支付價與價格沿革;並寫明來源分區、數值不合併/不互推、as-of-date 區間比對與無最近期回退。依據:RDL-019、RDL-021、RDL-022;`CHANGELOG.md` TC-24 呈現層改版與「中文品名查詢上線」;`apps/clinician/App.tsx` 價格對照、查詢日適用價與價格沿革區塊。
- 補入強制警語的性質與現行未發生事項(商店送審、原生 App 發行、帳號功能)。依據:RDL-018、RDL-019、RDL-021;`CHANGELOG.md` 2026-08-07 線上實證;`apps/clinician/App.tsx` 兩類官方警語區塊、頁尾與病人資料提示。
- 依契約明載 RDL-018 偏離事實:本次 production 發布未取得 v3.2 §32 之法律、個資、資安專業簽核,RA/專案負責人明示承擔風險;該紀錄為誠實偏離登記,非合規宣告。本文僅重述 RDL-018 的治理事實,未自行解釋。
- 在 §2 新增第 5 題,請受任專業回答如定性為醫療器材軟體,已營運系統的立即義務、風險與處置順序。原第 1–4 題未改動。

### 經核對仍正確

- 產品是供醫療專業人員查詢藥品/規則資訊的工具,查詢可以代碼或名稱進行,結果有資料版本、日期與警語。依據:`apps/clinician/App.tsx` 兩查詢模式、輸入欄與結果 metadata/警語區塊;`CHANGELOG.md` UI 大改版與中文品名查詢條目。
- 永久排除診斷、治療建議、劑量計算、病人資格判定與任何病人資料處理。依據:RDL-002、RDL-018;`apps/clinician/App.tsx` 之 `PrivacyNotice` 與頁尾聲明。
- exact match、日期/版本無法驗證時 fail closed、非單筆精確結果要求人工覆核仍正確。依據:RDL-003、RDL-004、RDL-021;`CHANGELOG.md` 中文品名查詢與線上煙霧實證條目。
- 尚無 SaMD 正式法律意見,且 RA 裁定不能替代專業簽核的委任前提仍正確。依據:RDL-017、RDL-018;`docs/b-track/README.md` 簽核台帳仍為「尚無收件」。
- §3 參考文件與 §4 回登/後續治理路徑未因本次事實校正而變更。依據:RDL-018 之 B 軌門效力不消滅記錄;`docs/b-track/README.md` §1–§3。

## 3. B2 稽核

### 已改

- 將「目前 Phase 0/1 零個資蒐集」的過時階段敘述校正為現行已上線 web-only、無帳號範圍不蒐集任何個人資料,且查詢內容不記錄/儲存;同時保留 Phase 2 帳號文件方生效的原意。依據:RDL-018;`CHANGELOG.md` 上線與 UI 大改版條目;`apps/clinician/App.tsx` 頁尾聲明。

### 經核對仍正確

- B2 仍是 Phase 2 帳號功能前的法律/個資審閱門,三份草案、ADR-002、保存期限與處理者文件的審閱範圍未變。依據:RDL-017(A3/A4)、RDL-018(Phase 2 仍受 B2+B3 門阻擋);`CHANGELOG.md` M2 P1 與 P2+P3 條目。
- 任何階段皆不處理病人個資,未來 Phase 2 僅規劃處理醫師帳號資料的邊界未變。依據:RDL-002、RDL-018;`CHANGELOG.md` M2 P1/P2+P3;`apps/clinician/App.tsx` 無病人資料提示。
- 醫師證書字號之 HMAC lookup+加密雙欄為待審的 Phase 2 設計,並非現行上線功能;此審閱前提仍正確。依據:RDL-017(A2);`CHANGELOG.md` M2 P2+P3 與裁示批次 A1–A8。
- 交付物與回登程序未變;簽核台帳無收件。依據:`docs/b-track/README.md` §2–§3。

## 4. B3 稽核

### 已改

- 無。B3 審查範圍依契約完整保留為 `auth/帳號資料面`,未擴充至現行線上系統。

### 經核對仍正確

- Phase 2 實作前需正式 STRIDE review 的進入門仍有效。依據:RDL-017;RDL-018 之 Phase 2 仍受 B2+B3 門阻擋記錄;`CHANGELOG.md` 威脅模型擴充與 B 軌推進包條目。
- 認證、session、帳號資料模型、API、基礎架構與威脅模型六面是待審之 Phase 2 設計,不是已上線帳號功能。依據:RDL-017(A1/A2/A4);RDL-018 之無帳號上線範圍;`CHANGELOG.md` M2 P2+P3 條目。
- 無病人資料的邊界仍正確;現行公開範圍另明記查詢內容不落日誌。依據:RDL-002、RDL-018;`apps/clinician/App.tsx` 頁尾與病人資料提示。B3 仍將「查詢內容不落資料庫」列為請資安審查者從攻擊者視角驗證之邊界,未將其擴寫成本次結論。
- STRIDE 交付物與 Phase 2 回登流程未變;簽核台帳仍無收件。依據:`docs/b-track/README.md` §2–§3。

## 5. B4 稽核

### 已改

- 將 W1 的「demo+官方逐字查詢畫面」校正為現行兩個分頁:藥品查詢(官方項目主檔與公告資料分區呈現)+官方規則逐字查詢。依據:`CHANGELOG.md` UI 大改版與 production UI 移除示範分頁條目;`apps/clinician/App.tsx` 分頁結構、預設 mode 與公告來源區塊。

### 經核對仍正確

- ADR-008 仍需 macOS/Xcode 與 Android SDK/adb 環境的實機 PoC;本雲端環境不能宣稱原生 runtime 驗證。依據:RDL-017(A5);`CLAUDE.md` 原生機模擬器/裝置限制。
- 現行實作仍是 React Native+Expo SDK 57,索引中 ADR-008 尚未鎖定的狀態正確。依據:`apps/clinician/App.tsx` 之 React Native 實作;`CLAUDE.md` 之 Expo SDK 版本;RDL-017(A5)。
- W1 效能/無障礙指標、W2 的 Phase 2 前置與證據格式均未因 UI 變更而失效。依據:RDL-017(A5);RDL-018 之 Phase 2 仍未解鎖事實;`apps/clinician/App.tsx` 之搜尋欄、本機查詢結果與長條文滾動承載畫面。
- W1/W2 全項齊備後才能轉換 ADR-008 狀態的回登規則未變;簽核台帳仍無收件。依據:RDL-017(A5);`docs/b-track/README.md` §1–§3。

## 6. B5 稽核

### 已改

- 無。

### 經核對仍正確

- B5 仍為商店送審前委任,其 SaMD 問題依賴 B1;現行尚未進行商店送審。依據:RDL-018 之商店送審仍受 B1/B5 門阻擋記錄;`docs/b-track/README.md` §1 依賴關係。
- Google Play Health apps 政策、對外聲明、App Privacy/Data safety、加密出口申報與目標客群均仍以受任專業書面回答為交付物;B5 未預先寫入定性結論。依據:RDL-018 之 B1/B5 門;`docs/b-track/README.md` 簽核台帳無收件。
- B2 核定版隱私文件仍為 App Privacy/Data safety 的未來事實來源,而現行上線範圍仍無帳號且不蒐集個人資料。依據:RDL-018;`apps/clinician/App.tsx` 頁尾聲明。
- 交付物、回登與 Phase 4 送審文件路徑未變。依據:RDL-018;`docs/b-track/README.md` §1–§3。

## 7. README 委任前檢查與紅線核對

- 已新增 `docs/b-track/README.md` §4「委任前產品事實時效檢查」,列入任務契約指定的五個權威來源,並要求來源衝突或無法佐證時停止交付、回報 RA、不得臆測。
- B3 審查範圍未改;B3 檔案仍為 28 行,§1 仍是 `auth/帳號資料面`六面設計文件表。
- §32 簽核台帳仍只有「(尚無收件)」空白列,未填入任何意見、結論、出具者或雜湊。
- 本次未寫入法律分析、SaMD 定性結論或合規判斷;B1 新增內容僅為產品/治理事實與交由受任專業回答的問題。
- 本次自撰內容未寫入憑證值、真實藥品代號、個人識別資訊或契約所禁止的給付判定文案。

## 8. 來源時序差異與無法佐證項目

- `docs/launch-runbook.md` §§1、3、5 仍保留 2026-08-06 RDL-018 首次部署時的雙分頁名稱與價格狀態;這些敘述早於其後的 RDL-019–RDL-023、`CHANGELOG.md` UI/價格上線紀錄與現行 `apps/clinician/App.tsx`。B1/B2/B4 本次依後發治理裁示、後發上線紀錄與現行實作校正;未越出本單去修改 launch runbook。
- **無法從權威來源佐證而停止之項目:無。**本次寫入委任包的每項新事實均有上述指定來源直接依據;未以臆測補入任何事實。

## 9. 檢查結果

| 檢查 | 結果 |
| --- | --- |
| `pnpm typecheck` | PASS |
| `pnpm test` | PASS:33 files / **302 tests** |
| `pnpm export:web` | PASS |
| `pnpm worker:types` | PASS:`worker-configuration.d.ts` up to date |
| `pnpm worker:dry-run` | PASS:`--dry-run: exiting now` |
| `bash scripts/governance-scan.sh origin/main` | **未執行**:該腳本內部會執行 git,與本單禁止任何 git 指令衝突;依契約交由驗收方補跑 |

Wrangler 兩項首次執行時因預設日誌路徑 `/root/.config` 在沙箱內為唯讀而出現非致命寫入訊息,命令整體仍為退出碼 0;後續以 `XDG_CONFIG_HOME=/tmp/tc26-wrangler-config` 重跑,worker types 與 dry-run 均以退出碼 0 乾淨完成。
