type DrugReviewLookupStatus =
  | "EXACT_MATCH"
  | "MULTIPLE_MATCHES"
  | "NOT_IN_VALIDATED_DATASET";

type DrugReviewPresentation =
  | Readonly<{
      kind: "multipleCandidates";
      visibleCandidateCount: number;
    }>
  | Readonly<{
      kind: "unavailable";
    }>;

export function resolveDrugReviewPresentation({
  lookupStatus,
  manualReviewRequired,
  sectionCandidateCount,
  visibleCandidateCount
}: Readonly<{
  lookupStatus: DrugReviewLookupStatus | undefined;
  manualReviewRequired: boolean;
  sectionCandidateCount: number;
  visibleCandidateCount: number;
}>): DrugReviewPresentation | undefined {
  const isMultipleLookup =
    lookupStatus === "MULTIPLE_MATCHES" && manualReviewRequired;
  const isMultipleSectionView =
    lookupStatus === undefined && sectionCandidateCount > 1;

  if (isMultipleLookup || isMultipleSectionView) {
    return Object.freeze({
      kind: "multipleCandidates",
      visibleCandidateCount
    });
  }

  return manualReviewRequired
    ? Object.freeze({ kind: "unavailable" })
    : undefined;
}
