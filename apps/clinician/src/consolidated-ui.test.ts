import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const appPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../App.tsx");
const source = readFileSync(appPath, "utf8");

describe("consolidated clinician lookup UI", () => {
  it("has exactly the two authorized lookup modes with the drug lookup as default", () => {
    expect(source).toContain('type LookupMode = "rules" | "drugItems"');
    expect(source).toContain('useState<LookupMode>("drugItems")');
    expect(source).toContain("藥品查詢");
    expect(source).toContain("規則逐字查詢");
    expect(source).not.toContain("藥品品項查詢");
  });

  it("shows the factual tags and all four result filters", () => {
    for (const label of ["全部", "本次公告異動", "三個月試用清單", "表二品項"]) {
      expect(source).toContain(label);
    }
  });

  it("provides chapter navigation and uses the exact-token domain helpers", () => {
    expect(source).toContain("查看本章節品項");
    expect(source).toContain("listDrugItemMasterRecordsByRuleSection(sectionFilter)");
    expect(source).toContain("getNavigableDrugItemRuleSections(item.coverageRuleSection)");
    expect(source).not.toContain("item.coverageRuleSection.includes(");
  });

  it("keeps the announcement values in a separate source block", () => {
    expect(source).toContain("另一資料來源：2026-09-01 公告異動明細");
    expect(source).toContain("resolveAnnouncementItemSource(nhiCode)");
    expect(source).toContain("表二歸屬：");
    expect(source).toContain("三個月試用期註記：");
  });

  it("renders both footer duties and preserves the existing no-patient-data text", () => {
    expect(source).toContain(
      "資料來源:衛生福利部中央健康保險署『健保用藥品項查詢項目檔』(政府資料開放平臺),依政府資料開放授權條款第1版利用"
    );
    expect(source).toContain("本站不設帳號、不蒐集任何個人資料;查詢內容不記錄、不儲存。");
    expect(source).toContain("請勿輸入姓名、病歷號、檢驗值、診斷或任何可識別病人資訊。");
  });

  it("uses window dimensions and the pure layout decision for responsive rendering", () => {
    expect(source).toContain("useWindowDimensions()");
    expect(source).toContain('getClinicianLayoutMode(width) === "desktop"');
    expect(source).toContain("masterDetailCellDesktop");
    expect(source).toContain("priceHistoryRowDesktop");
  });

  it("contains no authored decision sentence or price evaluation language", () => {
    const prohibited = [
      /符合.{0,8}規定/u,
      /不符合.{0,8}規定/u,
      /漲跌幅/u,
      /百分比/u,
      /趨勢/u,
      /便宜/u,
      /昂貴/u,
      /推薦/u,
      /最佳/u
    ];
    for (const pattern of prohibited) expect(source).not.toMatch(pattern);
  });
});
