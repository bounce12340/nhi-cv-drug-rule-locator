import {
  ASSESSMENT_ADVICE,
  type AssessmentAdviceRecord
} from "./generated/risk-2026-09-01";

/**
 * The notes the announcement prints beneath 表一, addressed to a tier.
 *
 * These are the steps the tier table itself does not carry: when to draw the
 * blood, which modifiable risk factors to deal with, when to screen for familial
 * hypercholesterolaemia. They reach no conclusion and name no drug — the tool
 * repeats what the announcement says to the tier it already determined.
 */

export interface AssessmentAdviceGroup {
  readonly groupId: string;
  readonly groupHeadingRaw: string;
  readonly items: readonly AssessmentAdviceRecord[];
}

/** The note that names no tier is not advice for any one of them. */
const TIER_SCOPED = ASSESSMENT_ADVICE.filter((item) => item.appliesToTierIds !== null);

/**
 * The advice the announcement gives one tier, in the source's own order.
 *
 * Returns null — not an empty group — for a tier neither heading names. 0 項心血管
 * 風險因子 is such a tier, and an empty list would read on screen as "this tier has
 * no advice" when what is true is that the announcement wrote none for it. It is
 * the same distinction the tier's own null prescription rule already makes.
 */
export function getAssessmentAdvice(tierId: string): AssessmentAdviceGroup | null {
  const items = TIER_SCOPED.filter((item) => item.appliesToTierIds?.includes(tierId) === true);
  if (items.length === 0) return null;
  const [first] = items;
  if (first.groupId === null || first.groupHeadingRaw === null) return null;
  return Object.freeze({
    groupId: first.groupId,
    groupHeadingRaw: first.groupHeadingRaw,
    items: Object.freeze(items)
  });
}

/**
 * The standalone non-HDL-C note.
 *
 * It carries its own scope in its wording — 當 LDL-C 達到理想治療目標後 … 尤其適用於
 * 合併有高三酸甘油脂、糖尿病、或肥胖的病人 — so it is shown verbatim beside the
 * secondary target rather than being filtered to tiers or paraphrased into a
 * condition the tool would then be asserting.
 */
export function getSecondaryTargetNote(): AssessmentAdviceRecord | null {
  return ASSESSMENT_ADVICE.find((item) => item.appliesToTierIds === null) ?? null;
}
