import { describe, expect, it } from "vitest";
import { getAssessmentAdvice, getSecondaryTargetNote } from "./assessment-advice";
import { ASSESSMENT_ADVICE, RISK_TIERS } from "./generated/risk-2026-09-01";

/**
 * The advice is transcribed text handed to a tier by name. What these guard is
 * that it reaches the tier the announcement addressed and no other — the failure
 * that matters is 0 項心血管風險因子 being shown advice written for 高風險.
 */

describe("assessment advice", () => {
  it("gives 極高風險 and 非常高風險 the same two items the announcement groups them under", () => {
    const extreme = getAssessmentAdvice("extreme");
    const veryHigh = getAssessmentAdvice("very-high");
    expect(extreme).not.toBeNull();
    expect(extreme!.items).toHaveLength(2);
    expect(extreme!.groupId).toBe("advice-1");
    // One group in the source is one group on screen, for both tiers under it.
    expect(veryHigh).toEqual(extreme);
  });

  it("gives 高風險, 中風險 and 低風險 the three items of the other group", () => {
    for (const tierId of ["high", "moderate", "low"]) {
      const group = getAssessmentAdvice(tierId);
      expect(group, tierId).not.toBeNull();
      expect(group!.groupId, tierId).toBe("advice-2");
      expect(group!.items, tierId).toHaveLength(3);
    }
  });

  it("hands the 0-factor row nothing, because the announcement wrote it nothing", () => {
    // The two headings name five tiers between them. The sixth row is not one of
    // them, and borrowing 低風險's advice for it would be the tool advising.
    expect(RISK_TIERS.map((tier) => tier.tierId)).toContain("no-factors");
    expect(getAssessmentAdvice("no-factors")).toBeNull();
  });

  it("returns null for a tier that does not exist rather than the nearest one", () => {
    expect(getAssessmentAdvice("very-very-high")).toBeNull();
    expect(getAssessmentAdvice("")).toBeNull();
  });

  it("carries the 24-hour requirement verbatim, for the two tiers it was written for", () => {
    const extreme = getAssessmentAdvice("extreme")!;
    expect(extreme.items[0]!.textRaw).toBe(
      "初始評估應檢測完整血脂指標，並應於急性病人入院後24小時內完成血脂檢驗。"
    );
    // 高風險 is told to test the lipids too, but the announcement sets it no clock.
    expect(getAssessmentAdvice("high")!.items.map((item) => item.textRaw).join("")).not.toContain(
      "24小時"
    );
  });

  it("keeps the non-HDL-C note out of every tier's group", () => {
    const note = getSecondaryTargetNote();
    expect(note).not.toBeNull();
    expect(note!.appliesToTierIds).toBeNull();
    expect(note!.textRaw).toContain("尤其適用於合併有高三酸甘油脂、糖尿病、或肥胖的病人");
    for (const tier of RISK_TIERS) {
      const group = getAssessmentAdvice(tier.tierId);
      if (group === null) continue;
      expect(group.items.map((item) => item.adviceId)).not.toContain(note!.adviceId);
    }
  });

  it("accounts for every record: five tier-scoped items and the one note", () => {
    const scoped = ASSESSMENT_ADVICE.filter((item) => item.appliesToTierIds !== null);
    expect(scoped).toHaveLength(5);
    expect(ASSESSMENT_ADVICE).toHaveLength(6);
  });
});
