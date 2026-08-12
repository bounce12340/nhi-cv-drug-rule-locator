import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { UI_COPY } from "./copy";

/**
 * The tool states facts and never renders a judgement: it does not say whether a
 * patient qualifies, whether a price is high or low, or which product to pick. Those
 * sentences would have to be authored, so this checks the place authored text lives —
 * the copy dictionary — rather than the layout file, which now holds no prose.
 */
const authored = [
  ...Object.values(UI_COPY.zh),
  ...Object.values(UI_COPY.en)
].join("\n");

const appSource = readFileSync(
  path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../App.tsx"),
  "utf8"
);

describe("authored copy", () => {
  it("makes no coverage determination and no price judgement", () => {
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
    for (const pattern of prohibited) expect(authored).not.toMatch(pattern);
  });

  it("uses none of the English payment-decision words", () => {
    for (const word of ["eligible", "reimbursable", "qualifies", "recommend"]) {
      expect(authored.toLocaleLowerCase("en-US")).not.toContain(word);
    }
  });

  it("says on screen that the tool takes no patient data", () => {
    expect(UI_COPY.zh.privacyText).toContain("請勿輸入");
    expect(UI_COPY.zh.disclaimer).toContain("不接受病人資料");
  });

  it("keeps the source-attribution and no-logging statements", () => {
    expect(UI_COPY.zh.footerAttribution).toContain("衛生福利部中央健康保險署");
    expect(UI_COPY.zh.footerPrivacy).toContain("不記錄");
  });
});

describe("the layout file", () => {
  it("holds no authored prose of its own — every string comes from the dictionary", () => {
    // A Chinese string literal in the layout file is copy that escaped the checks above.
    const chineseLiterals = appSource.match(/"[^"\n]*[\u4e00-\u9fff][^"\n]*"/g) ?? [];
    expect(chineseLiterals).toEqual([]);
  });

  it("no longer references the removed verbatim-rule surface", () => {
    for (const gone of ["lookupRuleText", "compareRuleSectionVersions", "RuleTextUnit", "rule-text-tree"]) {
      expect(appSource).not.toContain(gone);
    }
  });
});
