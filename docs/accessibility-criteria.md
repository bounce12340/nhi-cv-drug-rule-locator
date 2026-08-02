# 無障礙驗收標準(§30 #26;依 v3.2 §20.4 與 §21.10)

目標:**WCAG 2.2 AA**(Web)+ 平台原生無障礙(iOS/Android)。本清單為驗收用 checklist;每 Phase Acceptance 逐項標注 PASS/FAIL/N-A 附證據。

## 1. Web(WCAG 2.2 AA 重點)

- [ ] Focus Visible:焦點永遠可見,且不被 sticky 元件遮住
- [ ] Accessible Authentication:登入不依賴認知測驗;支援貼上與密碼管理器
- [ ] Redundant Entry:流程內不強迫重複輸入已提供資訊
- [ ] Target Size:觸控目標符合 AA 最低值;主要操作按鈕優先 ≈44×44 CSS px
- [ ] Keyboard Navigation:全功能可鍵盤操作,無焦點陷阱
- [ ] Screen Reader:表單控制有 label;錯誤以 Error Summary 呈現並可導航
- [ ] 狀態不得只用顏色表達(badge 附文字/圖示)
- [ ] 文字放大與 reflow:320px 寬無水平溢出;軟體鍵盤開啟不遮主要操作
- [ ] 對比:文字與重要圖形符合 AA 對比比率
- [ ] 橫直旋轉、Safe Area、iOS Safari/Android Chrome/桌面雙瀏覽器實測

## 2. Native(iOS/Android)

- [ ] VoiceOver/TalkBack:核心查詢流程可完整走通,元件有語意標籤
- [ ] Dynamic Type/字級縮放:放大後版面不破、不截斷關鍵資訊
- [ ] 平台返回行為(iOS 手勢/Android 系統返回)符合慣例
- [ ] 觸控目標與單手操作(v3.2 §20.9):主要操作可單手完成,不依賴精細手勢
- [ ] 中斷耐受:背景返回保留非敏感查詢狀態;背景快照不暴露個資

## 3. 內容層

- [ ] 重要例外與警示不得被折疊區隱藏(v3.2 §20.7)
- [ ] 比較畫面不用需水平捲動的大表格(v3.2 §20.8)
- [ ] 錯誤訊息可理解、可行動,不只顯示錯誤碼

## 4. 驗收方式

- 每 Phase:自動化掃描(如 axe 類工具)+ 人工鍵盤/讀屏走查核心任務(v3.2 §22 任務式案例)
- 實機 a11y smoke test 屬 Phase Acceptance 必要項(本開發環境無實機時如實標 BLOCKED,不得推定通過)
- 現況註記:Phase 0 demo 畫面已具備 accessibilityRole/label 基礎;正式驗收自客戶端實作 Phase 起執行

【待人工確認】自動化掃描工具選型與納入 CI 的時點(Phase 4 前決定)。
