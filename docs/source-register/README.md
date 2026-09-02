# Source register

> **中文說明在下半部。**

One record per source file the project took in. This directory holds **metadata only** —
where a file came from, its SHA-256, and how it was verified. It never holds the source
payload itself.

This is what backs the project's central claim: **every price and every rule sentence comes
from the NHIA's published data, and can be traced back to a file whose hash is written
down**. If a dataset changes, the record here changes with it, or the codegen fails closed.

The chain for each dataset runs: source file (hash pinned here) → codegen script (which
re-checks that hash) → frozen TypeScript in `packages/domain/src/generated/` → the bundle.
Nothing enters the app by any other route.

| Entry | What it is |
| --- | --- |
| [`nhi-drug-item-master-20260806`](nhi-drug-item-master-20260806.md) | The NHIA item master (健保用藥品項查詢項目檔), Taiwan open-data platform dataset 23715. 607 items, 4,048 price periods |
| [`attachment-1-price-change-detail`](attachment-1-price-change-detail.md) | The 2026-09-01 announcement's attachment 1 (PDF): the price-change detail table |
| [`attachment-2-rule-revision-table`](attachment-2-rule-revision-table.md) | The 2026-09-01 announcement's attachment 2 (PDF): the coverage-rule revision table, and the source of the whole risk dataset |
| [`announcement-webpage-capture`](announcement-webpage-capture.md) | The announcement's own web page, captured |
| [`price_change_seed_20260901`](price_change_seed_20260901.md) | The 57 items the announcement repriced, with before and after prices |
| [`statin_table2_only_list`](statin_table2_only_list.md) | The 116 items the announcement names for classification reasons, without a price change |
| [`ezetimibe_3month_exception`](ezetimibe_3month_exception.md) | The 4 ezetimibe items rule 2.6.2's own table singles out |
| [`ezetimibe_statin_combo_3month_exception`](ezetimibe_statin_combo_3month_exception.md) | The 10 combination items rule 2.6.3's own table singles out |
| [`nhi-lipid-risk-2026-09-01-r1`](nhi-lipid-risk-2026-09-01-r1.md) | The risk dataset transcribed from attachment 2 — derived from a governed source, not a separate intake |
| [`master-project-prompt-v3.2`](master-project-prompt-v3.2.md) | The project's own authoritative specification document |
| [`companion-spec-readme`](companion-spec-readme.md) | A companion specification document written by the project |

The 14 codes in the two ezetimibe exception entries are transcribed twice, independently:
once as those CSVs, and again out of the PDF's own 健保代碼 tables by
`scripts/risk-transcribe.mjs`. `packages/domain/src/coverage-rule.test.ts` compares the two
on every CI run, so a mis-transcription on either side fails the build.

---

# 來源登錄

每一個收件檔案一筆登錄紀錄。本目錄**只存 metadata** —— 出處、SHA-256、複驗結果 —— 永不存放
收件檔案本身。

這是整個專案核心主張的憑據:**每一個價格、每一句條文都來自健保署公開資料,而且都能追回一份
雜湊值有記錄在案的檔案**。資料集若有變動,這裡的紀錄要跟著改,否則 codegen 會 fail closed。

每個資料集的鏈是:來源檔(雜湊寫死在這裡)→ codegen 腳本(重新核對該雜湊)→
`packages/domain/src/generated/` 的凍結 TypeScript → bundle。沒有別的路徑可以把資料放進 app。

登錄清單見上方英文表格。兩份 ezetimibe 例外清單中的 14 個健保代碼是**獨立轉錄兩次**的:一次
是那兩個 CSV,另一次由 `scripts/risk-transcribe.mjs` 從 PDF 自己的健保代碼表讀出。
`packages/domain/src/coverage-rule.test.ts` 每次 CI 都重跑這個比對,任一邊轉錯就會讓建置失敗。
