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
  visibleCandidateCount
}: Readonly<{
  lookupStatus: DrugReviewLookupStatus | undefined;
  manualReviewRequired: boolean;
  visibleCandidateCount: number;
}>): DrugReviewPresentation | undefined {
  if (lookupStatus === "MULTIPLE_MATCHES" && manualReviewRequired) {
    return Object.freeze({
      kind: "multipleCandidates",
      visibleCandidateCount
    });
  }

  return manualReviewRequired
    ? Object.freeze({ kind: "unavailable" })
    : undefined;
}
