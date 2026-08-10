import { describe, expect, it } from "vitest";
import { PRIOR_RULE_SECTIONS } from "./generated/rules-prior";
import {
  COMPARABLE_RULE_SECTIONS,
  PRIOR_RULE_DATASET_VERSION,
  compareRuleSectionVersions
} from "./rule-comparison";

describe("prior/current rule comparison", () => {
  it("covers exactly the three transcribed sections", () => {
    expect(COMPARABLE_RULE_SECTIONS).toEqual(["2.6.1", "2.6.2", "2.6.3"]);
    expect(PRIOR_RULE_DATASET_VERSION).toBe("nhi-lipid-rules-prior-2026-09-01-r1");
  });

  it("returns undefined for a section with no prior record, never a nearest match", () => {
    expect(compareRuleSectionVersions("2.6.4")).toBeUndefined();
    expect(compareRuleSectionVersions("2.6")).toBeUndefined();
    expect(compareRuleSectionVersions("")).toBeUndefined();
    expect(compareRuleSectionVersions("2.6.1 ")).toBeUndefined();
  });

  it("keeps every prior verbatim text byte-identical to the governed dataset", () => {
    for (const record of PRIOR_RULE_SECTIONS) {
      const comparison = compareRuleSectionVersions(record.section);
      expect(comparison?.prior.verbatimText).toBe(record.verbatimText);
    }
  });

  it("carries the source PDF hash through to the comparison", () => {
    const comparison = compareRuleSectionVersions("2.6.1");
    expect(comparison?.prior.sourcePdfSha256).toBe(
      "bd7e96e5b8551c39718f80b3d5fa394581457e34f2dea1f8628a8982201bc79a"
    );
    expect(comparison?.prior.sourcePdfBytes).toBe(83240);
  });

  it("labels each version with its own dataset identity, never merging them", () => {
    const comparison = compareRuleSectionVersions("2.6.1");
    expect(comparison?.priorDatasetVersion).toBe("nhi-lipid-rules-prior-2026-09-01-r1");
    expect(comparison?.currentDatasetVersion).toBe("nhi-lipid-rules-structured-2026-09-01-r1");
    expect(comparison?.priorEffectiveTo).toBe("2026-08-31");
    expect(comparison?.currentEffectiveFrom).toBe("2026-09-01");
    expect(comparison?.currentUnitCount).toBe(43);
  });

  it("folds whitespace and dash variants so the same value is not reported as a change", () => {
    // The PDF column layout breaks "6-8週" across lines; the current dataset writes "6~8 週".
    // Both sections state the same interval, so it must appear as added-in-current exactly once
    // and never as a prior-only removal.
    for (const section of ["2.6.2", "2.6.3"]) {
      const comparison = compareRuleSectionVersions(section);
      const added = comparison!.termsOnlyInCurrent.map((term) =>
        term.text.normalize("NFKC").replace(/\s+/g, "").replace(/[~–—]/g, "-")
      );
      expect(added).toContain("6-8週");
      expect(comparison!.termsOnlyInPrior).toHaveLength(0);
    }
  });

  it("reports 3個月 as retained in 2.6.2 and 2.6.3 rather than removed", () => {
    for (const section of ["2.6.2", "2.6.3"]) {
      const comparison = compareRuleSectionVersions(section);
      const both = comparison!.termsInBoth.map((term) =>
        term.text.normalize("NFKC").replace(/\s+/g, "")
      );
      expect(both).toContain("3個月");
    }
  });

  it("finds the 2.6.1 threshold rewrite", () => {
    const comparison = compareRuleSectionVersions("2.6.1");
    const removed = comparison!.termsOnlyInPrior.filter((term) => term.kind === "lipidThreshold");
    const added = comparison!.termsOnlyInCurrent.filter((term) => term.kind === "lipidThreshold");
    expect(removed.length).toBeGreaterThan(added.length);
    expect(removed.map((term) => term.text.replace(/\s+/g, ""))).toContain("TC≧240mg/dL");
  });

  it("returns terms exactly as written, never reformatted", () => {
    const comparison = compareRuleSectionVersions("2.6.1");
    const all = [
      ...comparison!.termsOnlyInPrior,
      ...comparison!.termsOnlyInCurrent,
      ...comparison!.termsInBoth
    ];
    expect(all.length).toBeGreaterThan(0);
    const priorText = comparison!.prior.verbatimText;
    const source = `${priorText}\n${JSON.stringify(comparison!.currentUnitCount)}`;
    for (const term of comparison!.termsOnlyInPrior) {
      expect(source).toContain(term.text);
    }
  });

  it("freezes the result so a caller cannot mutate governed content", () => {
    const comparison = compareRuleSectionVersions("2.6.3");
    expect(Object.isFrozen(comparison)).toBe(true);
    expect(Object.isFrozen(comparison?.termsOnlyInCurrent)).toBe(true);
  });
});
