# Security policy

## Scope

Phase 0 的安全邊界是零病人資料與不部署。服務只接受藥品查詢字串、選用的 `as_of_date`、選用的 `dataset_version`；未知欄位會被拒絕。

## Report a concern

不要在 issue 中貼病人資料、真實帳密、未公開弱點細節或官方資料檔。請透過組織既有的私密安全通報管道通知維護者；若該管道尚未指定，先建立內部保密管道後再公開貢獻。

## Required safeguards

- secrets 只可在部署平台的 secret store 設定，永不寫入此 repo；目前無需 secret。
- API 回應採結構化錯誤，記錄 request ID 與事件類型，不記錄查詢值。
- 不可繞過資料版本、日期或人工覆核要求。
