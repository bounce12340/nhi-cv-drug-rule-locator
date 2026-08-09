# B2:隱私文件與個資合規審閱——法律/個資審閱包

> 交付對象:個資法專業律師/個資保護顧問。目的:對 Phase 2 上線前之全部個資文件取得**書面核定或修訂意見**。完成前:三草案不得上線、ADR-002 不轉 Accepted、Phase 2 帳號功能不實作。

## 1. 受審文件與逐份問題

| 文件 | 請確認 |
| --- | --- |
| docs/privacy/privacy-notice-draft.md | 個資法第 8 條告知事項完備性;利用地區揭露(含境外處理)與 ADR-002 一致性;蒐集項目=ADR-006 最小集之表述 |
| docs/privacy/dsr-process-draft.md | 各權利回應時限之法定/建議值(草案標【待核】);身分驗證強度是否過當/不足;刪除例外之法定保留依據 |
| docs/privacy/consent-text-draft.md | 個資同意與服務條款分離勾選之效力;版本化存證方式;不徵求行銷同意之表述 |
| docs/data-retention-schedule-draft.md | 八類期限值之適法性(RA 側已照案,A3/RDL-017;法律側為本次標的);「帳號存續+5 年」舉證需要之妥適性 |
| docs/adr/ADR-002-data-residency.md | 「不宣稱資料僅存台灣」紅線之表述;告知文字揭露境外處理之充分性;Data Localization 需求有無 |
| docs/processor-register-draft.md | 各服務商法律角色分類(受託處理/共同利用/獨立控制);Cloudflare DPA 審查;待選型服務商(Email/監控)之選任審查基準 |
| docs/privacy-data-inventory.md | 資料盤點完備性(對照 ADR-006 欄位與 m2-account-schema-detail) |

## 2. 特別聲明(審閱前提)

- 本系統**任何階段皆不處理病人個資**——僅醫師帳號個資(Phase 2 起);威脅面與告知範圍以此為界。
- 醫師證書字號屬敏感性較高之職業資料:採 HMAC lookup+加密雙欄設計(docs/m2-account-schema-detail.md §1),請確認蒐集必要性論理與保護措施表述。
- 目前已上線之 web-only、無帳號範圍不蒐集任何個人資料,查詢內容不記錄且不儲存;本組文件於 Phase 2 帳號功能上線時方生效。

## 3. 交付物

1. 逐文件:核定(可上線)或具體修訂意見(逐條)。
2. Cloudflare DPA:締約/審查結論(含子處理者條款、跨境傳輸機制)。
3. 一頁結論:Phase 2 帳號功能上線之個資合規前提是否齊備。

## 4. 回登

依 [README.md](README.md) §2:意見入台帳→三草案去除 DRAFT 標示(或依修訂意見改稿後再審)→ADR-002 轉 Accepted→processor-register 審查狀態欄翻轉→Phase 2 進入條件於 phase-plan 重評(尚需 B3)。
