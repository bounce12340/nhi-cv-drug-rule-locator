import { RISK_TIERS, stratifyRisk } from "@nhi-cv/domain";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import App, { RiskTierResult, UiProvider } from "../App";
import { UI_COPY } from "./copy";

/**
 * Renders the risk-tier result against real assessments and asserts on the markup
 * a clinician gets. The point of each test is a claim the screen must not make:
 * no tier without the criterion behind it, no invented prescribing step, and no
 * tier at all while the answers are still short.
 */
function render(node: React.ReactNode, language: "zh" | "en" = "zh"): string {
  return renderToStaticMarkup(<UiProvider language={language}>{node}</UiProvider>);
}

function occurrences(haystack: string, needle: string): number {
  return haystack.split(needle).length - 1;
}

const extreme = stratifyRisk({
  prerequisites: { "extreme-1": true },
  criteria: { "extreme-1-1": true }
});

const undetermined = stratifyRisk({ criteria: { "high-1": true } });

describe("the tier result", () => {
  const markup = render(<RiskTierResult assessment={extreme} ldlC={145} />);

  it("never names a tier without the criterion it came from", () => {
    expect(markup).toContain("極高風險");
    expect(markup).toContain("一年內曾經歷心肌梗塞");
    // The prerequisite is part of the reason, not a detail dropped from it.
    expect(markup).toContain("冠狀動脈疾病");
  });

  it("shows the threshold and both targets the announcement states for that tier", () => {
    expect(markup).toContain("LDL-C≧55mg/dL");
    expect(markup).toContain("LDL-C&lt;55mg/dL");
    expect(markup).toContain("non-HDL-C&lt;85mg/dL");
    expect(markup).toContain("145");
  });

  it("says the LDL-C box is empty rather than showing it as zero", () => {
    const blank = render(<RiskTierResult assessment={extreme} ldlC={null} />);
    expect(blank).toContain(UI_COPY.zh.riskStatBlank);
    expect(blank).not.toMatch(/<dd[^>]*>0<\/dd>/u);
  });

  it("splits the prescribing rule on the announcement's own numbering, adding nothing", () => {
    const tier = RISK_TIERS[0]!;
    const steps = markup.split('class="step-card"').length - 1;
    expect(steps).toBe(3);
    // Every character of every step has to come back to the source paragraph.
    const rendered = [...markup.matchAll(/<li class="step-card">([\s\S]*?)<\/li>/gu)].map(
      (match) => match[1]!.replace(/&lt;/gu, "<").replace(/&gt;/gu, ">").replace(/&amp;/gu, "&")
    );
    expect(rendered.join("")).toBe(tier.prescriptionRuleText);
  });

  it("keeps the whole unsplit paragraph behind a disclosure", () => {
    expect(markup).toContain("<details");
    expect(markup).toContain(UI_COPY.zh.riskPrescriptionVerbatim);
  });

  it("names the announcement and dataset it is quoting", () => {
    expect(markup).toContain("nhi-lipid-risk-2026-09-01-r1");
  });
});

describe("the 0-factor row", () => {
  const noFactors = RISK_TIERS.find((tier) => tier.tierId === "no-factors")!;

  it("does not borrow a prescribing rule the announcement never gave it", () => {
    const assessment = stratifyRisk({
      prerequisites: {
        "extreme-1": false,
        "extreme-2": false,
        "very-high-1": false,
        "very-high-2": false
      },
      criteria: { "high-1": false, "high-2": false, "high-4": false },
      ldlC: 120,
      factors: {
        "factor-1": false,
        "factor-2": false,
        "factor-3": false,
        "factor-4": false,
        "factor-5": false,
        "factor-6-1": false,
        "factor-6-2": false,
        "factor-6-3": false,
        "factor-6-4": false,
        "factor-6-5": false
      }
    });
    const markup = render(<RiskTierResult assessment={assessment} ldlC={120} />);
    expect(noFactors.prescriptionRuleText).toBeNull();
    expect(markup).toContain(UI_COPY.zh.riskPrescriptionNone);
    expect(markup).toContain(UI_COPY.zh.riskStatNone);
    expect(markup).not.toContain('class="step-card"');
  });
});

describe("before the answers reach a tier", () => {
  const markup = render(<RiskTierResult assessment={undetermined} ldlC={null} />);

  it("names no tier at all", () => {
    expect(markup).toContain(UI_COPY.zh.riskUndeterminedTitle);
    expect(markup).not.toContain('class="tier-name"');
  });

  it("lists what is still in play instead of picking one", () => {
    expect(markup).toContain("極高風險");
    expect(markup).toContain("非常高風險");
    expect(markup).toContain("高風險");
  });

  it("says plainly that a blank is not a no", () => {
    expect(markup).toContain(UI_COPY.zh.riskUndeterminedWhy);
  });
});

describe("the whole screen", () => {
  it("still states the disclaimer once, with the risk tab present", () => {
    const markup = renderToStaticMarkup(<App />);
    expect(occurrences(markup, UI_COPY.zh.disclaimer)).toBe(1);
    expect(markup).toContain(UI_COPY.zh.tabRiskTier);
  });
});
