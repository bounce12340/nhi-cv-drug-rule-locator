import { describe, expect, it } from "vitest";
import {
  nextRiskQuestion,
  RISK_FACTORS,
  stratifyRisk,
  type RiskAnswers
} from "./risk-stratification";

/** Rules out both two-level tiers, so a test can get down to 高風險 and below. */
const NO_CLINICAL_DISEASE: RiskAnswers["prerequisites"] = {
  "extreme-1": false,
  "extreme-2": false,
  "very-high-1": false,
  "very-high-2": false
};

/** 高風險's other three criteria; LDL-C≧190 is settled by the value, not a box. */
const NO_HIGH_RISK_CONDITIONS = { "high-1": false, "high-2": false, "high-4": false };

const METABOLIC_SUB_IDS = RISK_FACTORS.filter(
  (factor) => factor.parentFactorId === "factor-6"
).map((factor) => factor.factorId);

function factorsAnswered(values: Readonly<Record<string, boolean>>): Record<string, boolean> {
  return { ...values };
}

/** Every top-level factor answered false, metabolic syndrome via its sub-criteria. */
function noRiskFactors(): Record<string, boolean> {
  const answers: Record<string, boolean> = {
    "factor-1": false,
    "factor-2": false,
    "factor-3": false,
    "factor-4": false,
    "factor-5": false
  };
  for (const id of METABOLIC_SUB_IDS) answers[id] = false;
  return answers;
}

describe("every tier the announcement defines is reachable", () => {
  it("reaches 極高風險 on a prerequisite plus one of its alternatives", () => {
    const assessment = stratifyRisk({
      prerequisites: { "extreme-1": true },
      criteria: { "extreme-1-1": true }
    });
    expect(assessment.status).toBe("determined");
    if (assessment.status !== "determined") return;
    expect(assessment.tier.tierId).toBe("extreme");
    expect(assessment.reason.kind).toBe("criterion");
    if (assessment.reason.kind !== "criterion") return;
    expect(assessment.reason.criterion.textRaw).toBe("一年內曾經歷心肌梗塞。");
    expect(assessment.reason.prerequisiteLabelZh).toBe("冠狀動脈疾病");
  });

  it("reaches 非常高風險 once 極高風險 is ruled out", () => {
    const assessment = stratifyRisk({
      prerequisites: { "extreme-1": false, "extreme-2": false, "very-high-1": true },
      criteria: { "very-high-1-1": true }
    });
    expect(assessment.status).toBe("determined");
    if (assessment.status !== "determined") return;
    expect(assessment.tier.tierId).toBe("very-high");
    expect(assessment.tier.initiationThresholdRaw).toBe("LDL-C≧70mg/dL");
  });

  it("reaches 高風險 on 糖尿病", () => {
    const assessment = stratifyRisk({
      prerequisites: NO_CLINICAL_DISEASE,
      criteria: { "high-1": true }
    });
    expect(assessment.status).toBe("determined");
    if (assessment.status !== "determined") return;
    expect(assessment.tier.tierId).toBe("high");
  });

  it("reaches 中風險 on two risk factors", () => {
    const assessment = stratifyRisk({
      prerequisites: NO_CLINICAL_DISEASE,
      criteria: NO_HIGH_RISK_CONDITIONS,
      ldlC: 120,
      factors: { ...noRiskFactors(), "factor-1": true, "factor-5": true }
    });
    expect(assessment.status).toBe("determined");
    if (assessment.status !== "determined") return;
    expect(assessment.tier.tierId).toBe("moderate");
    expect(assessment.reason.kind).toBe("factor-count");
    if (assessment.reason.kind !== "factor-count") return;
    expect(assessment.reason.count).toBe(2);
    expect(assessment.reason.ruleRaw).toBe("2項(含)以上心血管風險因子。");
  });

  it("reaches 低風險 on exactly one", () => {
    const assessment = stratifyRisk({
      prerequisites: NO_CLINICAL_DISEASE,
      criteria: NO_HIGH_RISK_CONDITIONS,
      ldlC: 120,
      factors: { ...noRiskFactors(), "factor-5": true }
    });
    expect(assessment.status).toBe("determined");
    if (assessment.status !== "determined") return;
    expect(assessment.tier.tierId).toBe("low");
  });

  it("reaches the 0-factor row on none", () => {
    const assessment = stratifyRisk({
      prerequisites: NO_CLINICAL_DISEASE,
      criteria: NO_HIGH_RISK_CONDITIONS,
      ldlC: 120,
      factors: noRiskFactors()
    });
    expect(assessment.status).toBe("determined");
    if (assessment.status !== "determined") return;
    expect(assessment.tier.tierId).toBe("no-factors");
    expect(assessment.tier.secondaryTargetRaw).toBeNull();
  });
});

describe("a prerequisite is not decoration", () => {
  it("does not reach 極高風險 from an alternative alone", () => {
    // 一年內曾經歷心肌梗塞 without 冠狀動脈疾病 confirmed. The announcement asks
    // for both; treating the box on its own as enough would over-rate the patient.
    const assessment = stratifyRisk({ criteria: { "extreme-1-1": true } });
    expect(assessment.status).toBe("undetermined");
    if (assessment.status !== "undetermined") return;
    expect(assessment.possibleTiers.map((tier) => tier.tierId)).toContain("extreme");
    expect(assessment.missing[0]).toMatchObject({
      kind: "prerequisite",
      id: "extreme-1",
      labelZh: "冠狀動脈疾病"
    });
  });

  it("rules the whole group out when the prerequisite is answered no", () => {
    const assessment = stratifyRisk({
      prerequisites: { "extreme-1": false, "extreme-2": false, "very-high-1": false, "very-high-2": false },
      criteria: { "extreme-1-1": true, "extreme-1-2": true, "high-1": true }
    });
    expect(assessment.status).toBe("determined");
    if (assessment.status !== "determined") return;
    expect(assessment.tier.tierId).toBe("high");
  });

  it("stops asking a group's alternatives once its prerequisite is no", () => {
    const assessment = stratifyRisk({ prerequisites: { "extreme-1": false } });
    expect(assessment.status).toBe("undetermined");
    if (assessment.status !== "undetermined") return;
    const asked = assessment.missing.map((question) => question.id);
    expect(asked).not.toContain("extreme-1-1");
    expect(asked).not.toContain("extreme-1-5");
  });
});

describe("precedence follows the announcement's own numbering", () => {
  it("keeps a patient at 極高風險 even with no risk factors at all", () => {
    const assessment = stratifyRisk({
      prerequisites: { "extreme-1": true },
      criteria: { "extreme-1-1": true },
      factors: noRiskFactors(),
      ldlC: 60
    });
    expect(assessment.status).toBe("determined");
    if (assessment.status !== "determined") return;
    expect(assessment.tier.tierId).toBe("extreme");
  });

  it("will not settle on a lower tier while a higher one is unanswered", () => {
    // 糖尿病 holds, but nothing rules out 極高風險 or 非常高風險 yet.
    const assessment = stratifyRisk({ criteria: { "high-1": true } });
    expect(assessment.status).toBe("undetermined");
    if (assessment.status !== "undetermined") return;
    expect(assessment.possibleTiers.map((tier) => tier.tierId)).toEqual([
      "extreme",
      "very-high",
      "high"
    ]);
  });

  it("takes LDL-C≧190 as a 高風險 criterion, not just a payment threshold", () => {
    const assessment = stratifyRisk({
      prerequisites: NO_CLINICAL_DISEASE,
      criteria: { "high-1": false, "high-2": false, "high-4": false },
      ldlC: 190,
      factors: noRiskFactors()
    });
    expect(assessment.status).toBe("determined");
    if (assessment.status !== "determined") return;
    expect(assessment.tier.tierId).toBe("high");
    if (assessment.reason.kind !== "criterion") return;
    expect(assessment.reason.criterion.textRaw).toBe("LDL-C≧190mg/dL。");
  });

  it("does not read 189 as meeting the 190 criterion", () => {
    const assessment = stratifyRisk({
      prerequisites: NO_CLINICAL_DISEASE,
      criteria: NO_HIGH_RISK_CONDITIONS,
      ldlC: 189,
      factors: noRiskFactors()
    });
    expect(assessment.status).toBe("determined");
    if (assessment.status !== "determined") return;
    expect(assessment.tier.tierId).toBe("no-factors");
  });
});

describe("unknown is never read as no", () => {
  it("stays undetermined between 低風險 and 中風險 while a factor is unanswered", () => {
    // One factor confirmed, one left blank. Counting the blank as absent would
    // hand back 低風險; it could just as well be 中風險.
    const factors = factorsAnswered({
      "factor-1": true,
      "factor-2": false,
      "factor-3": false,
      "factor-5": false
    });
    for (const id of METABOLIC_SUB_IDS) factors[id] = false;
    const assessment = stratifyRisk({
      prerequisites: NO_CLINICAL_DISEASE,
      criteria: NO_HIGH_RISK_CONDITIONS,
      ldlC: 120,
      factors
    });
    expect(assessment.status).toBe("undetermined");
    if (assessment.status !== "undetermined") return;
    expect(assessment.possibleTiers.map((tier) => tier.tierId)).toEqual(["moderate", "low"]);
    expect(assessment.missing.map((question) => question.id)).toEqual(["factor-4"]);
  });

  it("cannot rule out 高風險 while LDL-C is blank, because of the 190 criterion", () => {
    const assessment = stratifyRisk({
      prerequisites: NO_CLINICAL_DISEASE,
      criteria: NO_HIGH_RISK_CONDITIONS,
      factors: noRiskFactors()
    });
    expect(assessment.status).toBe("undetermined");
    if (assessment.status !== "undetermined") return;
    expect(assessment.possibleTiers.map((tier) => tier.tierId)).toContain("high");
    expect(assessment.missing.map((question) => question.id)).toContain("high-3");
  });

  it("treats a non-finite LDL-C as unanswered rather than as zero", () => {
    for (const ldlC of [Number.NaN, null, undefined]) {
      const assessment = stratifyRisk({
        prerequisites: NO_CLINICAL_DISEASE,
        criteria: NO_HIGH_RISK_CONDITIONS,
        ldlC,
        factors: noRiskFactors()
      });
      expect(assessment.status).toBe("undetermined");
    }
  });

  it("names nothing at all when nothing has been answered", () => {
    const assessment = stratifyRisk();
    expect(assessment.status).toBe("undetermined");
    if (assessment.status !== "undetermined") return;
    expect(assessment.missing.length).toBeGreaterThan(0);
  });
});

describe("代謝性症候群 counts three of five", () => {
  it("does not hold on two", () => {
    const factors = noRiskFactors();
    factors[METABOLIC_SUB_IDS[0]!] = true;
    factors[METABOLIC_SUB_IDS[1]!] = true;
    const assessment = stratifyRisk({
      prerequisites: NO_CLINICAL_DISEASE,
      criteria: NO_HIGH_RISK_CONDITIONS,
      ldlC: 120,
      factors
    });
    expect(assessment.status).toBe("determined");
    if (assessment.status !== "determined") return;
    expect(assessment.tier.tierId).toBe("no-factors");
  });

  it("holds on three, and counts as one factor rather than three", () => {
    const factors = noRiskFactors();
    for (const id of METABOLIC_SUB_IDS.slice(0, 3)) factors[id] = true;
    const assessment = stratifyRisk({
      prerequisites: NO_CLINICAL_DISEASE,
      criteria: NO_HIGH_RISK_CONDITIONS,
      ldlC: 120,
      factors
    });
    expect(assessment.status).toBe("determined");
    if (assessment.status !== "determined") return;
    expect(assessment.tier.tierId).toBe("low");
    if (assessment.reason.kind !== "factor-count") return;
    expect(assessment.reason.count).toBe(1);
  });

  it("stays open while two are confirmed and one is still blank", () => {
    const factors = noRiskFactors();
    factors[METABOLIC_SUB_IDS[0]!] = true;
    factors[METABOLIC_SUB_IDS[1]!] = true;
    delete factors[METABOLIC_SUB_IDS[2]!];
    const assessment = stratifyRisk({
      prerequisites: NO_CLINICAL_DISEASE,
      criteria: NO_HIGH_RISK_CONDITIONS,
      ldlC: 120,
      factors
    });
    expect(assessment.status).toBe("undetermined");
    if (assessment.status !== "undetermined") return;
    expect(assessment.missing.map((question) => question.id)).toEqual([METABOLIC_SUB_IDS[2]]);
  });
});

describe("the next question", () => {
  it("is the first thing still missing, and nothing once the tier is settled", () => {
    expect(nextRiskQuestion()).not.toBeNull();
    expect(
      nextRiskQuestion({
        prerequisites: { "extreme-1": true },
        criteria: { "extreme-1-1": true }
      })
    ).toBeNull();
  });

  it("quotes the announcement's wording verbatim, so the screen has nothing to write", () => {
    const question = nextRiskQuestion({ prerequisites: { "extreme-1": true } });
    expect(question).toMatchObject({ kind: "criterion", labelZh: "一年內曾經歷心肌梗塞。" });
    expect(question?.headingRaw).toBe("(一)冠狀動脈疾病合併下列任一臨床狀況：");
  });
});

describe("results are frozen", () => {
  it("hands back values a caller cannot mutate", () => {
    const assessment = stratifyRisk({
      prerequisites: { "extreme-1": true },
      criteria: { "extreme-1-1": true }
    });
    expect(Object.isFrozen(assessment)).toBe(true);
  });
});

describe("one clinical fact is one question", () => {
  /*
   * 冠狀動脈疾病 appears twice in the announcement: as the prerequisite of 極高風險
   * (一), and again as an alternative under (二). Asking it twice let the two
   * answers disagree — and a patient marked as not having it could still be handed
   * 極高風險 by ticking it the second time.
   */
  it("does not ask again for something already answered as a prerequisite", () => {
    const assessment = stratifyRisk({
      prerequisites: { "extreme-1": false, "extreme-2": true }
    });
    expect(assessment.status).toBe("undetermined");
    if (assessment.status !== "undetermined") return;
    expect(assessment.missing.map((question) => question.id)).not.toContain("extreme-2-1");
    expect(nextRiskQuestion({ prerequisites: { "extreme-1": false, "extreme-2": true } })?.id).toBe(
      "extreme-2-2"
    );
  });

  it("carries a prerequisite answer over to the criterion that repeats it", () => {
    // 周邊動脈疾病 plus 冠狀動脈疾病 is 極高風險 (二). The second is answered only
    // once, as (一)'s prerequisite, and must still satisfy (二)'s alternative.
    const assessment = stratifyRisk({
      prerequisites: { "extreme-1": true, "extreme-2": true }
    });
    expect(assessment.status).toBe("determined");
    if (assessment.status !== "determined") return;
    expect(assessment.tier.tierId).toBe("extreme");
  });

  it("refuses to name a tier when the two answers for one fact disagree", () => {
    const assessment = stratifyRisk({
      prerequisites: { "extreme-1": false, "extreme-2": true },
      criteria: { "extreme-2-1": true }
    });
    expect(assessment.status).toBe("undetermined");
  });

  it("accepts the pair when they agree, from either side", () => {
    const bothWays: readonly RiskAnswers[] = [
      { prerequisites: { "extreme-1": true, "extreme-2": true }, criteria: { "extreme-2-1": true } },
      { prerequisites: { "extreme-2": true }, criteria: { "extreme-2-1": true } }
    ];
    for (const answers of bothWays) {
      const assessment = stratifyRisk(answers);
      expect(assessment.status).toBe("determined");
      if (assessment.status !== "determined") return;
      expect(assessment.tier.tierId).toBe("extreme");
    }
  });

  it("links only wording the announcement repeats exactly, nothing merely similar", () => {
    // 一年內曾經歷心肌梗塞 is not a prerequisite anywhere, so it stays its own
    // question; 周邊動脈疾病或頸動脈狹窄 is a compound and must not fold into
    // 周邊動脈疾病.
    const assessment = stratifyRisk({ prerequisites: { "extreme-2": false } });
    expect(assessment.status).toBe("undetermined");
    if (assessment.status !== "undetermined") return;
    const asked = assessment.missing.map((question) => question.id);
    expect(asked).toContain("extreme-1-1");
    expect(asked).toContain("extreme-1-5");
  });
});
