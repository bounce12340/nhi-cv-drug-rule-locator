import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
// @ts-expect-error The zero-dependency Node ESM generator intentionally has no declaration sidecar.
import { checkStructure, renderModule } from "../../../scripts/risk-codegen.mjs";
import {
  RISK_DATASET_EFFECTIVE_FROM,
  RISK_DATASET_VERSION,
  RISK_FACTORS,
  RISK_TIERS,
  TIER_CRITERIA,
  type RiskFactorRecord,
  type RiskTierRecord,
  type TierCriterionRecord
} from "./generated/risk-2026-09-01";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const governedDirectory = path.join(
  repositoryRoot,
  "data",
  "governed",
  "nhi-lipid-risk-2026-09-01-r1"
);
const generatedPath = path.join(
  repositoryRoot,
  "packages",
  "domain",
  "src",
  "generated",
  "risk-2026-09-01.ts"
);

interface RiskStorageManifest {
  readonly datasetVersion: string;
  readonly derivedFrom: { readonly declaredName: string; readonly sha256: string };
  readonly files: readonly {
    readonly declaredName: string;
    readonly sha256: string;
    readonly bytes: number;
    readonly recordCount: number;
  }[];
}

const manifest = JSON.parse(
  readFileSync(path.join(governedDirectory, "storage-manifest.json"), "utf8")
) as RiskStorageManifest;

function sha256(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

/** Structurally valid stand-ins, so a negative test fails for the reason it names. */
function tiersFixture(): RiskTierRecord[] {
  return RISK_TIERS.map((tier) => ({ ...tier }));
}
function criteriaFixture(): TierCriterionRecord[] {
  return TIER_CRITERIA.map((criterion) => ({ ...criterion }));
}
function factorsFixture(): RiskFactorRecord[] {
  return RISK_FACTORS.map((factor) => ({ ...factor }));
}
function check(overrides: {
  tiers?: RiskTierRecord[];
  criteria?: TierCriterionRecord[];
  factors?: RiskFactorRecord[];
}): void {
  checkStructure({
    tiers: overrides.tiers ?? tiersFixture(),
    criteria: overrides.criteria ?? criteriaFixture(),
    factors: overrides.factors ?? factorsFixture()
  });
}

describe("the generated risk module tracks its governed input", () => {
  it("has not drifted from what the codegen produces today", () => {
    expect(readFileSync(generatedPath, "utf8")).toBe(renderModule());
  });

  it("matches the SHA-256 and record count the manifest declares for each file", () => {
    expect(manifest.files).toHaveLength(3);
    for (const declared of manifest.files) {
      const bytes = readFileSync(path.join(governedDirectory, declared.declaredName));
      expect(sha256(bytes)).toBe(declared.sha256);
      expect(bytes.length).toBe(declared.bytes);
      expect(bytes.toString("utf8").trimEnd().split("\n")).toHaveLength(declared.recordCount);
    }
  });

  it("names the announcement PDF it was transcribed from", () => {
    expect(manifest.derivedFrom.declaredName).toBe("attachment-2-rule-revision-table.pdf");
    expect(manifest.derivedFrom.sha256).toBe(
      "6389a5f654e0cb755d006f04ed47eca6ada9f867873f43c5088f79db6bb6c1c2"
    );
    expect(RISK_DATASET_VERSION).toBe("nhi-lipid-risk-2026-09-01-r1");
    expect(RISK_DATASET_EFFECTIVE_FROM).toBe("2026-09-01");
  });

  it("is frozen all the way down", () => {
    expect(Object.isFrozen(RISK_TIERS)).toBe(true);
    expect(Object.isFrozen(RISK_TIERS[0])).toBe(true);
    expect(Object.isFrozen(RISK_TIERS[0]!.prescriptionRuleLines)).toBe(true);
    expect(Object.isFrozen(TIER_CRITERIA[0])).toBe(true);
    expect(Object.isFrozen(RISK_FACTORS[0])).toBe(true);
  });
});

describe("what the announcement actually says", () => {
  it("carries the six tiers in the source's own order", () => {
    expect(RISK_TIERS.map((tier) => tier.labelZh)).toEqual([
      "極高風險",
      "非常高風險",
      "高風險",
      "中風險",
      "低風險",
      "0 項心血管風險因子"
    ]);
    expect(RISK_TIERS.map((tier) => tier.order)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("states every threshold and target cell by cell", () => {
    expect(
      RISK_TIERS.map((tier) => [
        tier.initiationThresholdRaw,
        tier.primaryTargetRaw,
        tier.secondaryTargetRaw
      ])
    ).toEqual([
      ["LDL-C≧55mg/dL", "LDL-C<55mg/dL", "non-HDL-C<85mg/dL"],
      ["LDL-C≧70mg/dL", "LDL-C<70mg/dL", "non-HDL-C<100mg/dL"],
      ["LDL-C≧100mg/dL", "LDL-C<100mg/dL", "non-HDL-C<130mg/dL"],
      ["LDL-C≧115mg/dL", "LDL-C<115mg/dL", "non-HDL-C<145mg/dL"],
      ["LDL-C≧130mg/dL", "LDL-C<130mg/dL", "non-HDL-C<160mg/dL"],
      ["LDL-C≧160mg/dL", "LDL-C<160mg/dL", null]
    ]);
  });

  it("leaves the 0-factor row's missing cells empty rather than borrowing the row above", () => {
    const noFactors = RISK_TIERS.at(-1)!;
    expect(noFactors.tierId).toBe("no-factors");
    expect(noFactors.secondaryTargetRaw).toBeNull();
    expect(noFactors.prescriptionHeadingRaw).toBeNull();
    expect(noFactors.prescriptionRuleText).toBeNull();
  });

  it("pairs each prescription rule to the heading the source text carries", () => {
    expect(RISK_TIERS.map((tier) => tier.prescriptionHeadingRaw)).toEqual([
      "極高、非常高風險：",
      "極高、非常高風險：",
      "高風險：",
      "中、低風險：",
      "中、低風險：",
      null
    ]);
    // Tiers under one heading quote one block, so the text must be identical.
    expect(RISK_TIERS[0]!.prescriptionRuleText).toBe(RISK_TIERS[1]!.prescriptionRuleText);
    expect(RISK_TIERS[3]!.prescriptionRuleText).toBe(RISK_TIERS[4]!.prescriptionRuleText);
    expect(RISK_TIERS[2]!.prescriptionRuleText).not.toBe(RISK_TIERS[0]!.prescriptionRuleText);
  });

  it("counts risk factors the way the source words it", () => {
    expect(RISK_TIERS[3]!.factorCountRuleRaw).toBe("2項(含)以上心血管風險因子。");
    expect(RISK_TIERS[4]!.factorCountRuleRaw).toBe("1項心血管風險因子。");
  });
});

describe("criteria stay two-level", () => {
  it("holds 18 criteria: seven, seven and four", () => {
    expect(TIER_CRITERIA).toHaveLength(18);
    const byTier = new Map<string, number>();
    for (const criterion of TIER_CRITERIA) {
      byTier.set(criterion.tierId, (byTier.get(criterion.tierId) ?? 0) + 1);
    }
    expect(byTier.get("extreme")).toBe(7);
    expect(byTier.get("very-high")).toBe(7);
    expect(byTier.get("high")).toBe(4);
    // 中風險 and 低風險 are counts of risk factors, not clinical criteria.
    expect(byTier.has("moderate")).toBe(false);
    expect(byTier.has("low")).toBe(false);
  });

  it("keeps every 極高/非常高 criterion under a prerequisite", () => {
    for (const criterion of TIER_CRITERIA) {
      if (criterion.tierId === "high") continue;
      expect(criterion.groupId).not.toBeNull();
      expect(criterion.prerequisiteLabelZh).not.toBeNull();
      expect(criterion.groupHeadingRaw).toContain(criterion.prerequisiteLabelZh!);
    }
    const prerequisites = [
      ...new Set(TIER_CRITERIA.map((criterion) => criterion.prerequisiteLabelZh))
    ];
    expect(prerequisites).toContain("冠狀動脈疾病");
    expect(prerequisites).toContain("周邊動脈疾病");
  });

  it("leaves 高風險's four entries flat, because the source lists no prerequisite", () => {
    const high = TIER_CRITERIA.filter((criterion) => criterion.tierId === "high");
    expect(high.map((criterion) => criterion.groupId)).toEqual([null, null, null, null]);
    expect(high.map((criterion) => criterion.textRaw)).toEqual([
      "糖尿病。",
      "慢性腎臟病(進入透析治療前的慢性腎臟病，包括 UACR≧30mg/g or eGFR<60mL/min/1.73m² 至少持續3個月)。",
      "LDL-C≧190mg/dL。",
      "冠狀動脈鈣化分數(CAC)≧400。"
    ]);
  });

  it("names all six risk factors and metabolic syndrome's five sub-criteria", () => {
    const top = RISK_FACTORS.filter((factor) => factor.parentFactorId === null);
    expect(top).toHaveLength(6);
    const metabolic = RISK_FACTORS.find((factor) => factor.requiredSubCount !== null)!;
    expect(metabolic.textRaw).toBe("代謝性症候群(符合以下至少三項)：");
    expect(metabolic.requiredSubCount).toBe(3);
    expect(
      RISK_FACTORS.filter((factor) => factor.parentFactorId === metabolic.factorId)
    ).toHaveLength(5);
  });
});

describe("transcription fidelity", () => {
  it("restores the space the hard wrap ate, without gluing terms together", () => {
    const quoted = RISK_TIERS.map((tier) => tier.prescriptionRuleText ?? "").join("\n");
    expect(quoted).toContain("ATP citrate lyase 抑制劑");
    expect(quoted).toContain("PCSK9 單株抗體");
    expect(quoted).toContain("non-statin");
    expect(quoted).toContain("包含：ezetimibe");
    // The strings a naive join would have produced.
    expect(quoted).not.toContain("citratelyase");
    expect(quoted).not.toContain("PCSK9單株");
    expect(quoted).not.toContain("non- statin");
    expect(quoted).not.toContain("包含： ezetimibe");
  });

  it("keeps the joined paragraph character-identical to its source lines", () => {
    for (const tier of RISK_TIERS) {
      if (tier.prescriptionRuleText === null) continue;
      const stripped = (value: string): string => value.replace(/\s+/gu, "");
      expect(stripped(tier.prescriptionRuleText)).toBe(
        stripped(tier.prescriptionRuleLines!.join(""))
      );
    }
  });

  it("keeps the superscript in eGFR<60mL/min/1.73m²", () => {
    const ckd = TIER_CRITERIA.find((criterion) => criterion.textRaw.startsWith("慢性腎臟病"))!;
    expect(ckd.textRaw).toContain("1.73m²");
    expect(ckd.textRaw).not.toContain("1.73m 至少");
  });

  it("carries no page-header text from the PDF", () => {
    const everything = [
      ...RISK_TIERS.map((tier) => tier.prescriptionRuleText ?? ""),
      ...TIER_CRITERIA.map((criterion) => criterion.textRaw),
      ...RISK_FACTORS.map((factor) => factor.textRaw)
    ].join("\n");
    expect(everything).not.toContain("原給付規定");
    expect(everything).not.toContain("建議修訂後給付規定");
  });
});

describe("the codegen fails closed", () => {
  it("accepts the governed records as they stand", () => {
    expect(() => check({})).not.toThrow();
  });

  it("rejects a grouped criterion whose prerequisite was dropped", () => {
    const criteria = criteriaFixture();
    const grouped = criteria.find((criterion) => criterion.groupId !== null)!;
    Object.assign(grouped, { prerequisiteLabelZh: null });
    expect(() => check({ criteria })).toThrow(/states no prerequisite/u);
  });

  it("rejects prescription text that no longer matches its source lines", () => {
    const tiers = tiersFixture();
    Object.assign(tiers[0]!, { prescriptionRuleText: `${tiers[0]!.prescriptionRuleText}(補充)` });
    expect(() => check({ tiers })).toThrow(/differs from its source lines/u);
  });

  it("rejects two tiers quoting one heading with different text", () => {
    // Swap in another block wholesale, lines included, so this trips the shared-
    // heading check rather than the earlier text-versus-its-own-lines one.
    const tiers = tiersFixture();
    Object.assign(tiers[1]!, {
      prescriptionRuleText: tiers[2]!.prescriptionRuleText,
      prescriptionRuleLines: tiers[2]!.prescriptionRuleLines
    });
    expect(() => check({ tiers })).toThrow(/carry different rule text/u);
  });

  it("rejects a tier reordered out of the source's own numbering", () => {
    const tiers = tiersFixture();
    [tiers[0], tiers[1]] = [tiers[1]!, tiers[0]!];
    expect(() => check({ tiers })).toThrow(/out of the source's own order/u);
  });

  it("rejects a criterion pointing at a tier that does not exist", () => {
    const criteria = criteriaFixture();
    Object.assign(criteria[0]!, { tierId: "extremely-high" });
    expect(() => check({ criteria })).toThrow(/unknown tier/u);
  });

  it("rejects metabolic syndrome needing more sub-criteria than the source lists", () => {
    const factors = factorsFixture();
    const metabolic = factors.find((factor) => factor.requiredSubCount !== null)!;
    Object.assign(metabolic, { requiredSubCount: 6 });
    expect(() => check({ factors })).toThrow(/needs 6 of 5 sub-criteria/u);
  });

  it("rejects a record that grew or lost a field", () => {
    const factors = factorsFixture();
    Object.assign(factors[0]!, { severity: "high" });
    expect(() => check({ factors })).toThrow(/does not carry exactly/u);
  });
});
