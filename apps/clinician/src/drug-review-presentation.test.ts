import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { resolveDrugReviewPresentation } from "./drug-review-presentation";
import { THEME_TOKENS, contrastRatio } from "./ui-preferences";

const sourceDirectory = path.dirname(fileURLToPath(import.meta.url));
const appSource = readFileSync(path.resolve(sourceDirectory, "../App.tsx"), "utf8");

describe("drug manual-review presentation", () => {
  it("does not show a review prompt for an exact match", () => {
    expect(
      resolveDrugReviewPresentation({
        lookupStatus: "EXACT_MATCH",
        manualReviewRequired: false,
        sectionCandidateCount: 0,
        visibleCandidateCount: 1
      })
    ).toBeUndefined();
  });

  it("shows the lightweight all-candidates statement with the visible multiple-match count", () => {
    expect(
      resolveDrugReviewPresentation({
        lookupStatus: "MULTIPLE_MATCHES",
        manualReviewRequired: true,
        sectionCandidateCount: 0,
        visibleCandidateCount: 42
      })
    ).toEqual({ kind: "multipleCandidates", visibleCandidateCount: 42 });
    expect(appSource).toContain(
      "目前畫面列出全部 {count} 筆符合目前條件的候選；工具不會代為選取任何品項或期別。"
    );
    expect(appSource).toContain(
      "The current view lists all {count} candidates matching the current filters; the tool does not select any item or price period for you."
    );
    expect(appSource).toContain("visibleCandidateCount: visibleMatches.length");
  });

  it("uses the post-filter visible count while retaining the multiple-match statement", () => {
    expect(
      resolveDrugReviewPresentation({
        lookupStatus: "MULTIPLE_MATCHES",
        manualReviewRequired: true,
        sectionCandidateCount: 0,
        visibleCandidateCount: 7
      })
    ).toEqual({ kind: "multipleCandidates", visibleCandidateCount: 7 });
  });

  it("keeps the lightweight statement after section navigation and uses that view's count", () => {
    expect(
      resolveDrugReviewPresentation({
        lookupStatus: undefined,
        manualReviewRequired: false,
        sectionCandidateCount: 42,
        visibleCandidateCount: 5
      })
    ).toEqual({ kind: "multipleCandidates", visibleCandidateCount: 5 });

    const lightweightStyle =
      "multipleReview: { color: theme.color.textMuted, fontSize: 14, lineHeight: 20 }";
    expect(appSource).toContain(lightweightStyle);
    expect(lightweightStyle).not.toContain("backgroundColor");
    for (const theme of Object.values(THEME_TOKENS)) {
      expect(contrastRatio(theme.color.textMuted, theme.color.background)).toBeGreaterThanOrEqual(
        4.5
      );
    }
  });

  it("keeps the unavailable-result warning and rule-review warning unchanged", () => {
    expect(
      resolveDrugReviewPresentation({
        lookupStatus: "NOT_IN_VALIDATED_DATASET",
        manualReviewRequired: true,
        sectionCandidateCount: 0,
        visibleCandidateCount: 0
      })
    ).toEqual({ kind: "unavailable" });
    expect(appSource).toContain(
      'manualReviewDrug: "此結果需要人工確認；系統不會自動選取品項或替代期別。"'
    );
    expect(appSource).toContain(
      'manualReviewRule: "此結果需要人工確認；請比對健保署公告原文。"'
    );
    expect(appSource).toContain(
      'manualReviewRule: "This result requires manual review; compare it with the original NHI announcement."'
    );
    expect(appSource).toContain('<Text style={styles.review}>{t("manualReviewDrug")}</Text>');
    expect(appSource).toContain('<Text style={styles.review}>{t("manualReviewRule")}</Text>');
    expect(appSource).toContain(`    review: {
      backgroundColor: theme.color.reviewSurface,
      borderRadius: 8,
      color: theme.color.reviewText,
      lineHeight: 21,
      padding: 12
    },`);
  });
});
