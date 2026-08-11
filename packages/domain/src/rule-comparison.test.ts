import { describe, expect, it } from "vitest";
import { PRIOR_RULE_SECTIONS } from "./generated/rules-prior";
import { RULE_TEXT_UNITS } from "./generated/rules-2026-09-01";
import {
  COMPARABLE_RULE_SECTIONS,
  PRIOR_RULE_DATASET_VERSION,
  compareRuleSectionVersions
} from "./rule-comparison";
import { diffRuleSectionText } from "./rule-diff";
import { extractNhiCodesFromVerbatimTexts } from "./rule-drug-identification";

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

describe("the drug listing 2.6.1 gained, held out of the comparison", () => {
  const fullSectionText = (section: string): string =>
    RULE_TEXT_UNITS.filter((unit) => unit.section === section)
      .map((unit) => unit.verbatimText)
      .join("\n");

  it("is reported, with the unit that holds it and how much was held back", () => {
    const excluded = compareRuleSectionVersions("2.6.1")!.excludedDrugListings;
    expect(excluded).toHaveLength(1);
    expect(excluded[0]!.unitId).toBe("2.6.1-001");
    expect(excluded[0]!.characterCount).toBe(5097);
    expect(excluded[0]!.nhiCodeCount).toBe(116);
  });

  it("touches no other section", () => {
    for (const section of ["2.6.2", "2.6.3"]) {
      expect(compareRuleSectionVersions(section)!.excludedDrugListings).toEqual([]);
    }
  });

  it("leaves the unit's own verbatim text untouched", () => {
    // The comparison trims its input. The official text a clinician reads is not edited.
    const unit = RULE_TEXT_UNITS.find((candidate) => candidate.unitId === "2.6.1-001")!;
    expect(unit.verbatimText).toContain("成分名稱\n健保代碼\n藥品名稱");
    expect(unit.verbatimText).toContain("AC46402100");
    expect(unit.verbatimText).toHaveLength(5266);
  });

  it("changes no alignment decision — only the size of one cell", () => {
    // Measured before and after. If a future change to rule-diff makes the exclusion
    // start moving rows around, that is a different claim than the one made on screen.
    const prior = PRIOR_RULE_SECTIONS.find((record) => record.section === "2.6.1")!;
    const withListing = diffRuleSectionText(prior.verbatimText, fullSectionText("2.6.1"));
    const asCompared = compareRuleSectionVersions("2.6.1")!.diff;

    expect(withListing.rows).toHaveLength(14);
    expect(asCompared.rows).toHaveLength(14);
    expect(asCompared.rows.map((row) => row.kind)).toEqual(withListing.rows.map((row) => row.kind));

    const widest = (rows: readonly { current: string }[]): number =>
      Math.max(...rows.map((row) => row.current.length));
    expect(widest(withListing.rows)).toBe(5080);
    expect(widest(asCompared.rows)).toBe(709);
  });

  it("hides no quantitative term, because the listing states none", () => {
    // The screen claims the comparison is complete for coverage conditions. That only
    // holds if the excluded region carries no duration or lipid threshold.
    const prior = PRIOR_RULE_SECTIONS.find((record) => record.section === "2.6.1")!;
    const asCompared = compareRuleSectionVersions("2.6.1")!;
    const untrimmed = diffRuleSectionText(prior.verbatimText, fullSectionText("2.6.1"));
    expect(untrimmed.rows.length).toBe(asCompared.diff.rows.length);

    const listing = RULE_TEXT_UNITS.find((unit) => unit.unitId === "2.6.1-001")!.verbatimText.slice(
      169
    );
    expect(listing).not.toMatch(/(?:每\s*)?\d+\s*(?:[~\-–至]\s*\d+\s*)?(?:個月|週|月)/);
    expect(listing).not.toMatch(/(?:non-HDL-C|LDL-C|HDL-C|TC|TG)\s*[≧≥<＜>＞≦≤]\s*\d+\s*mg\/dL/);
  });

  it("holds back only codes the master identification block already lists", () => {
    // Nothing leaves the screen: every code in the excluded region is resolved against
    // the master and shown above the comparison, with names read from the master.
    const excluded = compareRuleSectionVersions("2.6.1")!.excludedDrugListings[0]!;
    const sectionCodes = extractNhiCodesFromVerbatimTexts(
      RULE_TEXT_UNITS.filter((unit) => unit.section === "2.6.1").map((unit) => unit.verbatimText)
    );
    expect(sectionCodes).toHaveLength(116);
    expect(excluded.nhiCodeCount).toBe(sectionCodes.length);
  });

  it("keeps the prose that precedes the listing in the comparison", () => {
    // The sentence introducing 表二 is a real 115/9/1 amendment and must still be compared.
    const asCompared = compareRuleSectionVersions("2.6.1")!;
    const currentSide = asCompared.diff.rows.map((row) => row.current).join("");
    expect(currentSide).toContain("僅適用");
    expect(currentSide).toContain("115/9/1");
    expect(currentSide).not.toContain("AC46402100");
  });
});
