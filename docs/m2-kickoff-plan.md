# M2 起手規劃:帳號與隱私(P1–P3;實作鎖 Phase 2 閘門)

> RA 2026-08-05 指示「M3及M2接續」之 M2 側。M2 進入條件=法律/個資【待核】項核定(docs/milestones-and-issues.md);ADR-006 已定需求基線(實作於 Phase 2/4)。本起手=把「可先做的文件與設計」做完,把「需外部輸入的」明確標定,**不含任何帳號實作建置**。

## 1. 現況與缺口

- 已有:ADR-006(需求基線 ACCEPTED)、privacy-data-inventory、processor-register 草稿、data-retention-schedule 草稿、db-schema 結構草稿、store-compliance-matrix(法律定性【待核 P0】)
- 缺:隱私告知全文、DSR 流程文件、同意文本、ADR-006【待人工確認】細部(套件選型/Passkey 方案/token 參數)、SaMD 法律定性

## 2. P1:隱私文件草案(Fable 撰寫,PROJECT_AUTHORED)

- 隱私告知全文草案(依 privacy-data-inventory+ADR-004/006 邊界:蒐集項、目的、保存、處理者、當事人權利)
- DSR 流程文件(查詢/更正/刪除/停用之受理、時限、驗證身分方式,對齊 ADR-006 §8 帳號刪除)
- 同意文本(個資+條款;證書字號蒐集之特別說明)
- 全部標註 **DRAFT — 未經法律審閱不得上線**;供 RA 先審+未來法律意見定稿

## 3. P2:ADR-006 細部定案設計文件(Fable 撰寫)

- 【待人工確認】逐項提案:auth 套件選型、Passkey 方案、token/效期/速率參數表——設計層提案,供 Phase 2 派工單直接引用;不寫程式

## 4. P3:D1 schema 細化(Fable 撰寫)

- 依 ADR-006 欄位邊界細化 users/sessions/consents/audit(db-schema 草稿升版);維持 structure-only

## 5. SaMD 法律定性(決定點)

store-compliance-matrix 初評「非屬」醫療器材軟體(僅檢索既定法規資訊、不解讀病人資料),但**以法律/主管機關認定為準**。此項屬 v3.2 §32 專業簽核領域,RA 裁定不能替代正式法律意見。

## 6. RA 決定點

- **H4** SaMD 工作假設:以初評「非屬」為**工作假設**續行 M2 文件與設計,送審/production 前取得正式法律意見(建議);或先取法律意見再動 M2
- **H5** P1–P3 照案起手(Fable 直寫,分批 PR 供 PASS)
- **H6**(與 M3 共用)派工切分:M2 全文件側=Fable 直寫;實作建置=Phase 2 屆時另立 TC+閘門

## 7. 不解鎖清單

帳號實作(後端/D1/前端)、任何個資蒐集上線、production——均鎖 Phase 2 進入條件+v3.2 §32 簽核;本起手純文件與設計。
