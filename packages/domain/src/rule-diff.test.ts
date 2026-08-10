import { describe, expect, it } from "vitest";
import { compareRuleSectionVersions } from "./rule-comparison";
import { diffRuleSectionText } from "./rule-diff";

describe("rule version diff", () => {
  it("reports an identical text as entirely unchanged", () => {
    const text = "限用於原發性高膽固醇血症,並符合下列條件之一者:";
    const diff = diffRuleSectionText(text, text);
    expect(diff.rows).toHaveLength(1);
    expect(diff.rows[0]!.kind).toBe("unchanged");
    expect(diff.removedTokens).toBe(0);
    expect(diff.addedTokens).toBe(0);
  });

  it("marks a pure addition and a pure removal distinctly from a replacement", () => {
    const shared = "經使用statin類藥品單一治療未達治療目標者";
    expect(diffRuleSectionText(shared, `${shared},得使用本類藥品。`).rows.at(-1)!.kind).toBe(
      "added"
    );
    expect(diffRuleSectionText(`${shared},得使用本類藥品。`, shared).rows.at(-1)!.kind).toBe(
      "removed"
    );
    const replaced = diffRuleSectionText(`${shared}3個月者。`, `${shared}6~8週者。`);
    expect(replaced.rows.some((row) => row.kind === "replaced")).toBe(true);
  });

  it("keeps a Latin run as one token instead of splitting it mid-word", () => {
    const diff = diffRuleSectionText("對Statins類藥品", "對statins類藥品");
    // Case-only difference folds for matching, so the whole text stays unchanged
    // rather than shattering into "S"/"s" plus a shared "tatins".
    expect(diff.rows).toHaveLength(1);
    expect(diff.rows[0]!.kind).toBe("unchanged");
  });

  it("suppresses a coincidental short match between unrelated sentences", () => {
    // 「藥」 appears in both but the sentences are otherwise unrelated; reporting it
    // as unchanged would read as a claim that something survived the revision.
    const diff = diffRuleSectionText("非藥物治療起始血脂值", "得合併使用本類藥品與其他治療");
    for (const row of diff.rows) {
      if (row.kind === "unchanged") expect(row.prior.length).toBeGreaterThanOrEqual(6);
    }
  });

  it("drops line breaks, which are layout artifacts in both sources", () => {
    const diff = diffRuleSectionText("單一治療6-\n8週未達", "單一治療6~8 週未達");
    expect(diff.rows).toHaveLength(1);
    expect(diff.rows[0]!.kind).toBe("unchanged");
  });

  it("shows every row's text as written, never re-punctuated", () => {
    const diff = diffRuleSectionText("患者（含）：", "患者(含):");
    // Folded for matching, so this is one unchanged row — and the prior column
    // must still carry the full-width characters the PDF actually used.
    expect(diff.rows).toHaveLength(1);
    expect(diff.rows[0]!.prior).toBe("患者（含）：");
    expect(diff.rows[0]!.current).toBe("患者(含):");
  });

  it("isolates the 2.6.2 interval change into one row: 3個月 → 6-8週", () => {
    const diff = compareRuleSectionVersions("2.6.2")!.diff;
    expect(
      diff.rows.some(
        (row) => row.kind === "replaced" && row.prior === "3個月" && row.current === "6-8週"
      )
    ).toBe(true);
    // 限用於 is absent from the prior PDF and added by the revision.
    expect(diff.rows.some((row) => row.current.includes("限用於"))).toBe(true);
    expect(diff.rows.every((row) => !row.prior.includes("限用於"))).toBe(true);
    // The revision keeps a 3個月 route for a listed subset, so the term survives
    // in the current text even though the headline interval moved.
    expect(diff.rows.some((row) => row.kind === "added" && row.current.includes("3個月"))).toBe(
      true
    );
  });

  it("treats case and punctuation width as unchanged, since they carry no rule meaning", () => {
    const diff = compareRuleSectionVersions("2.6.2")!.diff;
    const folded = diff.rows.find(
      (row) => row.kind === "unchanged" && row.prior.includes("Statins")
    );
    expect(folded).toBeDefined();
    // Both columns are rendered, so the reader can see the difference the fold hid.
    expect(folded!.current).toContain("statins");
    expect(folded!.prior).not.toBe(folded!.current);
  });

  it("finds the 2.6.1 risk-factor rewrite the term list alone could not show", () => {
    const diff = compareRuleSectionVersions("2.6.1")!.diff;
    const currentText = diff.rows.map((row) => row.current).join("");
    const priorText = diff.rows.map((row) => row.prior).join("");
    // HDL-C becomes sex-specific and 代謝性症候群 is added as a risk factor.
    expect(currentText).toContain("代謝性症候群");
    expect(priorText).toContain("HDL-C<40mg/dL");
    expect(currentText).toContain("女性<50mg/dL");
  });

  it("collapses each real section to a readable number of rows", () => {
    for (const [section, maxRows] of [
      ["2.6.1", 40],
      ["2.6.2", 20],
      ["2.6.3", 20]
    ] as const) {
      const diff = compareRuleSectionVersions(section)!.diff;
      expect(diff.rows.length).toBeGreaterThan(1);
      expect(diff.rows.length).toBeLessThanOrEqual(maxRows);
    }
  });

  it("accounts for every token: unchanged + removed equals the prior length", () => {
    for (const section of ["2.6.1", "2.6.2", "2.6.3"]) {
      const diff = compareRuleSectionVersions(section)!.diff;
      expect(diff.unchangedTokens + diff.removedTokens).toBe(diff.priorTokens);
      expect(diff.unchangedTokens + diff.addedTokens).toBe(diff.currentTokens);
    }
  });

  it("stays fast enough to run on expand for the largest section", () => {
    const started = performance.now();
    compareRuleSectionVersions("2.6.1");
    expect(performance.now() - started).toBeLessThan(2000);
  });
});
