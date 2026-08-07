# TC-20260807-23 建置者自我檢查報告

日期：2026-08-07（UTC）

## 1. 前置閱讀、角色與禁止事項

| 項目 | 結果 |
| --- | --- |
| 角色 | 建置者（builder）；派發方兼驗收方不變 |
| 前置閱讀 | 已先完整讀取 `CLAUDE.md`、`CONTRIBUTING.md`，再完整讀取 `docs/task-contracts/TC-20260807-23.md`；另核對 `docs/spec-source-status.md`、`docs/regulatory-decision-log.md`、`docs/phase-plan.md` 與實際 TC-22 測試 |
| git 指令 | **未執行任何 git 指令** |
| secret | 未列印、記錄或寫入任何 secret 值、長度、前後綴或可推導特徵；本報告只記載契約名稱 |
| 禁改範圍 | 未修改 `data/governed/**`、`packages/domain/src/generated/**`、`scripts/**`、`apps/api/src/**` 或 `apps/clinician/**` 應用程式碼 |
| 既有測試 | 零修改、零新增、零刪除；27 個 TypeScript 測試檔的修改前後樹摘要皆為 `94a21cd53868c9c83efdc908b29e7a5770b8942f77950eb8d5f4886ffb9fee54`，另 5 個 `scripts/__tests__/*.test.mjs` 未列入任何寫入操作 |
| runtime dependencies | 零新增；本輪只把根 manifest 的錯誤 `ws` override 改為 `undici` override，未新增 dependency 或 devDependency |
| 本輪寫入順序 | 先修正 package、由 pnpm 產生 lockfile並完成驗證，再依 §7.3 更正既有報告；首輪已通過之 workflow 與兩份文件未重寫 |

`pnpm export:web` 刷新 gitignored 的 `apps/clinician/dist/` 驗證輸出，結果 bytes 與修改前完全一致；Wrangler dry-run 產物與 log 均導向 `/tmp`。這些不是交付來源檔。

## 2. 交付檔案

| 檔案 | 變更 | 收尾 SHA-256 |
| --- | --- | --- |
| `package.json` | 依 §7 移除 `ws` override，改以受影響範圍 selector `undici@>=7.0.0 <7.29.0` 覆寫至相容範圍 `^7.29.0` | `34b596c3fd17e0be35110374ef8e572085a398ca804bb09497409439f79562a2` |
| `pnpm-lock.yaml` | 僅由 `pnpm install` 更新；`ws` 恢復基準三版本，`undici` 唯一解析為 `7.29.0` | `d46f7322027d4f49c48345b5dbbc2d6a5b2141a8b56a28274f50058feedf181c` |
| `.github/workflows/deploy.yml` | 僅強化 `Require deploy secrets`；區分雙空、各自單空與逐項 whitespace，全部 fail closed | `ebfb17388155a32150028ace6b3585895f97fb5006b466093732b214f1c0e96a` |
| `docs/test-matrix.md` | 補登 TC-22 的偏好／fail-closed、token／對比、字典／黑名單、三類不翻譯位元組守護列 | `ef68612b1fb780e18a8bd792dd5ef0836d1771e10fe4e7c2a00b3a38a1130027` |
| `docs/launch-runbook.md` | 新增自動部署 secret 契約、既有 Cloudflare 權限、實測失敗模式、PR #49 ENOENT 與輪替提醒 | `63e7b52b954183ba47f78764d0cc29c8ccf2586aff5f07cc52dccff706cd9998` |
| `docs/TC-20260807-23-self-check.md` | 本報告；所有產物與驗證完成後最後新增 | 本列不自我雜湊 |

本輪未連線 registry。第一次離線解析因移除全域 `ws` override 後需要基準版本 metadata 而停止；本機 store 已有 `ws@7.5.13`、`8.21.0`、`8.21.1` 與 `undici@7.29.0` 的完整內容，故以這些既有 manifest 與 lockfile canonical integrity 驗證 store index 後補入 disposable pnpm metadata cache，再由 `pnpm install --offline` 正常產生 lockfile。未手改 lockfile；收尾 `pnpm install --frozen-lockfile --offline` PASS，確認 manifest 與 lockfile 一致。

## 3. 依賴衛生與 audit

### 3.1 首輪事實更正與 `ws` override 移除

首輪因沙箱無法解析 registry DNS（`EAI_AGAIN`），未取得本樹 advisory 回應，卻引用了不適用於本樹的 `ws` advisory；該認定錯誤。本節以派發方在可連線環境實跑並寫入契約 §7.1 的結果為本輪唯一權威依據：本樹 advisory 清單完全沒有 `ws`。

移除 `ws` override 的理由如下：

1. 本樹沒有任何 `ws` advisory，覆寫沒有安全效益。
2. `@react-native/dev-middleware@0.86.2` 精確固定 `ws@7.5.13`；強制升至 8.x 是跨 major 的 API 破壞性變更。
3. 該套件位於 React Native dev-server／inspector proxy 的 websocket 中介路徑，五項檢查不涵蓋此執行路徑，本環境無法驗證。依 §1「不可驗證者不動」的判準，首輪 `ws` override 本身違反契約，故已移除。

`pnpm -r why ws --depth 20` 現回報 **Found 3 versions of ws**：`7.5.13`、`8.21.0`、`8.21.1`；其中 `@react-native/dev-middleware@0.86.2` 已恢復使用精確的 `7.5.13`，符合 §7.4 基準狀態。

### 3.2 更正後標的：`undici`

| 項目 | 依 §7.1 更正後之事實／本地證據 |
| --- | --- |
| 唯一 high | `undici >=7.0.0 <7.29.0`；修補門檻 `>=7.29.0` |
| advisory 計數 | `undici` 占 1 high + 4 moderate；數字由派發方在可連線環境實跑 `pnpm audit` 後提供，不是建置者自行連線取得 |
| 完整路徑 | `@nhi-cv/api (devDependencies) → wrangler@4.118.0 → miniflare → undici@7.28.0` |
| 覆寫方式 | 僅選取受影響範圍 `undici@>=7.0.0 <7.29.0`，replacement 為相容範圍 `^7.29.0`；不改動已在安全範圍的其他解析，也不容許無謂跨至 8.x |
| 修改後解析 | `pnpm -r why undici --depth 20` 回報 **Found 1 version of undici**，唯一版本 `7.29.0` |
| 可驗證性 | 完全位於 devDependencies 建置鏈；五項檢查全綠，Web 與 Worker executable 產物皆與首輪基準 byte-identical |

### 3.3 audit 計數、來源與限制

| 時點／證據層級 | High | Moderate | Critical | Low | 說明 |
| --- | ---: | ---: | ---: | ---: | --- |
| 修改前正式 audit | 1 | 5 | 0 | 0 | 派發方提供之 §7.1 唯一權威計數：`undici` 1 high + 4 moderate，`uuid` 1 moderate |
| 修改後 lockfile 與 §7.1 affected range 對照 | **0** | **1** | 0 | 0 | 本地推導：唯一 `undici@7.29.0` 已離開五項受影響範圍，只剩 §3.4 的 `uuid@7.0.3` moderate |
| 修改後 registry audit 回應 | — | — | — | — | 本輪依 §7 明令未嘗試連線；沒有把未取得的遠端回應偽報為 audit PASS |

首輪「不得把無回應偽報為 audit PASS」的自律原則正確，本輪完整保留。上表第二列是依派發方 authoritative advisory 清單與本地解析版本所作的 affected-range 對照，不冒充建置者完成了連線 audit；正式 after 計數仍由驗收方在可連線環境覆核。

### 3.4 具名殘留項：不做原生鏈 major override

| 項目 | 說明 |
| --- | --- |
| 套件／advisory | `uuid@7.0.3`；moderate；依派發方 §7.1，受影響範圍 `<11.1.1`、修補線 `>=11.1.1` |
| 完整路徑 | `uuid@7.0.3 → xcode@3.0.1 → @expo/config-plugins@57.0.6 → @expo/cli@57.0.11 → expo@57.0.9 → @nhi-cv/clinician` |
| 為何不動 | `xcode@3.0.1` 明定 `uuid: ^7.0.3`；跨至 `uuid@11.1.1` 是超出上游宣告的 major override，影響 Xcode project 生成鏈。此環境無 Xcode、iOS simulator、adb 或 Android native build，無法完成契約要求的原生驗證，故依 §1 明令保留，不以 web-only 綠燈取代 native 證據 |
| 實際使用風險 | `xcode@3.0.1/lib/pbxProject.js` 實際呼叫 `uuid.v4()`；該 advisory 指向有 caller-provided buffer 的 v3／v5／v6 路徑，不含 v4。仍不把此觀察等同修補，套件版本維持 audit 可見的 moderate 殘留 |
| Web 產物掃描 | 對 `apps/clinician/dist/` 掃描 `uuid@7.0.3`、`node_modules/uuid`、`xcode@3.0.1`、`node_modules/xcode`：**0 個檔案命中** |
| Worker 產物掃描 | 對 dry-run `index.js`、`index.js.map` 與 metadata 掃描相同 package markers：**0 個檔案命中**；source map module path 掃描亦為 **0** |

Worker 原始碼使用平台 `crypto.randomUUID()`，它不是 `uuid` npm 套件；因此未把單純的字面 `uuid` 命中誤報為殘留套件進入 bundle。

## 4. 部署守門與 secret 紅線

從 workflow 實際擷取 `Require deploy secrets` shell 後，以不具秘密性的 placeholder 在隔離環境執行：

| 探針 | 預期／實際 exit | 可區分診斷 | 結果 |
| --- | ---: | --- | --- |
| 兩者皆空 | 1／1 | 同時指出兩個名稱皆 empty or unavailable，並指向 repository Actions secrets、Environment／Dependabot 範圍與精確大小寫 | PASS |
| 僅 API token 空 | 1／1 | 只指出 `CLOUDFLARE_API_TOKEN` | PASS |
| 僅 account ID 空 | 1／1 | 只指出 `CLOUDFLARE_ACCOUNT_ID` | PASS |
| API token 含換行 | 1／1 | 只指出該名稱含 whitespace，要求無首尾空格／換行重新複製 | PASS |
| account ID 含空格 | 1／1 | 只指出該名稱含 whitespace，要求無首尾空格／換行重新複製 | PASS |
| 兩者皆為無空白 placeholder | 0／0 | 無錯誤訊息 | PASS |

全檔靜態掃描結果：

- `echo`／`printf` 後引用任一 secret 變數的路徑：**0**。
- `GITHUB_ENV`、`GITHUB_OUTPUT`、shell output redirection、upload-artifact sink：**0**。
- placeholder 未出現在任何 probe output；程式不計算或輸出 secret 長度、前後綴或衍生特徵。
- checkout 起至檔尾的修改前後 SHA-256 都是 `1a57f7986ec18b4e5ab5cf9787facacbc3850a83b1ba32dd7a6a3b0052b40344`；檔首至 guard 名稱的 SHA-256 都是 `2868f992760732fab5944daecabd185f6d704e7ec01cd09e3cca57a7a0b54532`。證明其餘 checkout／setup／install／export／deploy／smoke 步驟 byte-identical。

## 5. 生產路徑與產物對照

### Web export

| 指標 | 修改前 | 修改後 | 結果 |
| --- | ---: | ---: | --- |
| 單一 AppEntry bundle bytes | 827,431 | 827,431 | 不變 |
| AppEntry SHA-256 | `f921d6aa2ac6dd521041802a0fded00c648e53f98d20bdb3d201992db0915385` | 同左 | byte-identical |
| 完整 dist 3 檔／828,695 bytes manifest SHA-256 | `6cd5eae44b79dc7932e340ab9af1f23c645046b3be8e3696745767320c1d1420` | 同左 | byte-identical |
| residual package markers | 0 | 0 | 不進入 web 產物 |

`pnpm export:web` exit 0；生成檔名仍為 `AppEntry-00f7ffa4082a88b656b3dde452d27da0.js`。

### Worker dry-run

| 指標 | 修改前 | 修改後 | 結果 |
| --- | ---: | ---: | --- |
| Total Upload | 503.64 KiB | 503.64 KiB | 不變 |
| gzip | 66.22 KiB | 66.22 KiB | 不變 |
| executable `index.js` bytes | 515,730 | 515,730 | 不變 |
| executable `index.js` SHA-256 | `6ad9ab5a3217c5a77d8e247c4848f91593e87ef232e7d43f7985a784964c6c0f` | 同左 | byte-identical |
| bindings | 單一既有 `DATASET_MODE` environment binding | 同左 | 不變 |
| residual package markers／source-map modules | 0／0 | 0／0 | 不進入 Worker 產物 |

兩次 outdir 的 source map 只因 `sourceRoot` 分別指向 `/tmp/tc23-worker-before` 與 `/tmp/tc23-worker-after` 而差 1 byte；README 只差生成時間。可執行 bundle 本身逐位元相同，故沒有把 outdir metadata 差異誤列為生產行為變更。

## 6. 測試數與五項檢查

| 項目 | 修改前基準 | 修改後 | 差額 |
| --- | ---: | ---: | ---: |
| Vitest files | 32 | 32 passed | 0 |
| Tests | 292 | 292 passed | 0 |

| 檢查 | 結果 |
| --- | --- |
| `pnpm typecheck` | PASS；7 個 workspace typecheck 全部完成 |
| `pnpm test` | PASS；**32 files／292 tests**，零增減 |
| `pnpm export:web` | PASS；單一 bundle 827,431 bytes，與修改前 byte-identical |
| `pnpm worker:types` | PASS；`worker-configuration.d.ts` up to date |
| `pnpm worker:dry-run` | PASS；503.64 KiB／gzip 66.22 KiB，bindings 不變，正常 `--dry-run` 退出且未部署 |

另行執行 `pnpm install --frozen-lockfile --offline` PASS；這不是五項 CI 的替代，而是 lockfile 未手改且可重現的附加證據。

## 7. 契約 §5 驗收結論

| 驗收項 | 結果 |
| --- | --- |
| 五項檢查、292／32、既有測試零修改 | **PASS** |
| 高風險歸零、殘留具名理由與產物掃描 | **本地 affected-range 證據 PASS；遠端 after 計數待驗收方覆核**。`undici` 唯一解析為 `7.29.0`；`ws` 恢復三版本基準且不屬本樹 advisory；殘留 `uuid` 已依原生驗證紅線不動並實掃兩類產物 |
| deploy 三類成因與 secret 全檔紅線 | **PASS**；另細分兩個單一缺值與兩個 whitespace 名稱，所有不合格狀態 exit 1 |
| 生產路徑零行為變更 | **PASS**；web 與 Worker executable byte-identical，Worker upload／gzip／bindings 不變 |
| 自我檢查報告 | **PASS**；檔案、audit 基準與限制、殘留理由、測試數、五項檢查均已列明 |

本報告為建置者自我檢查，不取代派發方／驗收方的獨立覆核。唯一未能在本沙箱閉合的項目是 registry 回傳的正式 `pnpm audit` after 計數；本輪依 §7 未再嘗試連線，並保留「不可將無回應視為漏洞檢查成功」的原則。
