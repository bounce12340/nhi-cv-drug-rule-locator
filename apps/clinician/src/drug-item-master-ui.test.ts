import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const appPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../App.tsx");
const source = readFileSync(appPath, "utf8");

describe("clinician drug-item master display", () => {
  it("adds the fourth Chinese-name tab and makes it the default without removing existing tabs", () => {
    expect(source).toContain('useState<LookupMode>("drugItems")');
    expect(source).not.toContain("示範藥品");
    for (const label of ["規則逐字查詢", "藥品品項查詢", "藥品查詢(中文品名)"]) {
      expect(source).toContain(label);
    }
  });

  it("renders the requested item fields, applicable interval, and complete price history", () => {
    for (const label of [
      "英文品名：",
      "健保代碼：",
      "成分及含量：",
      "規格：",
      "劑型：",
      "藥商：",
      "製造廠：",
      "ATC：",
      "藥品分類：",
      "該查詢日期適用之支付價",
      "有效期間：",
      "價格沿革",
      "給付規定章節"
    ]) {
      expect(source).toContain(label);
    }
    expect(source).toContain("item.priceHistory.map((period)");
  });

  it("keeps the announcement detail in a separately labelled source block", () => {
    expect(source).toContain("function AnnouncementItemSourceBlock");
    expect(source).toContain("另一資料來源：2026-09-01 公告異動明細");
    expect(source).toContain("資料集版本：{result.datasetVersion}");
    expect(source).toContain("{result.warning}");
    expect(source).toContain("原支付價：");
    expect(source).toContain("初核價格：");
    expect(source).toContain("生效日：");
  });

  it("contains no price evaluation or trend language", () => {
    for (const prohibited of ["漲跌幅", "百分比", "趨勢", "便宜", "昂貴", "推薦", "最佳"]) {
      expect(source).not.toContain(prohibited);
    }
  });
});
