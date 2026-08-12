import { describe, expect, it } from "vitest";
import { resolveDrugReviewPresentation } from "./drug-review-presentation";
import { THEME_TOKENS, contrastRatio } from "./ui-preferences";


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

});
