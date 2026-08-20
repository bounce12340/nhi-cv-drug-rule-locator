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

/**
 * Works out which ASCVD risk tier the announcement's own criteria put a patient
 * in, from answers a clinician gives one question at a time.
 *
 * The whole file turns on one rule: **an unanswered question is unknown, not no.**
 * Treating it as no would quietly under-rate the patient and hand back a tier
 * with a higher payment threshold than they qualify for. So every predicate is
 * three-valued, and the result is either a tier with the criterion it matched or
 * an explicit "cannot tell yet, these are the answers still missing" — the same
 * stance as the drug lookup, which says it found nothing rather than guessing.
 */

export type Truth = "yes" | "no" | "unknown";

/** Absent means unanswered, which is not the same as answered "no". */
export interface RiskAnswers {
  /** Keyed by criterion group id, e.g. "extreme-1" — the 冠狀動脈疾病 of 極高風險 (一). */
  readonly prerequisites?: Readonly<Record<string, boolean>>;
  readonly criteria?: Readonly<Record<string, boolean>>;
  readonly factors?: Readonly<Record<string, boolean>>;
  /** mg/dL. Feeds 高風險's LDL-C≧190mg/dL criterion, so it changes the tier. */
  readonly ldlC?: number | null;
}

export type RiskQuestion =
  | {
      readonly kind: "prerequisite";
      readonly id: string;
      readonly tierId: string;
      readonly labelZh: string;
      readonly headingRaw: string;
    }
  | {
      readonly kind: "criterion";
      readonly id: string;
      readonly tierId: string;
      readonly labelZh: string;
      readonly headingRaw: string | null;
    }
  | {
      readonly kind: "factor";
      readonly id: string;
      readonly tierId: null;
      readonly labelZh: string;
      readonly headingRaw: string | null;
    };

export type RiskReason =
  | {
      readonly kind: "criterion";
      readonly criterion: TierCriterionRecord;
      /** Present only for the two-level tiers, where the criterion needed it. */
      readonly prerequisiteLabelZh: string | null;
    }
  | {
      readonly kind: "factor-count";
      readonly count: number;
      readonly factors: readonly RiskFactorRecord[];
      readonly ruleRaw: string | null;
    };

export type RiskAssessment =
  | { readonly status: "determined"; readonly tier: RiskTierRecord; readonly reason: RiskReason }
  | {
      readonly status: "undetermined";
      /** Every tier still in play, in the announcement's own order. */
      readonly possibleTiers: readonly RiskTierRecord[];
      /** What still has to be answered before the tier can be named. */
      readonly missing: readonly RiskQuestion[];
    };

const LDL_C_HIGH_RISK_CRITERION_ID = "high-3";
const LDL_C_HIGH_RISK_THRESHOLD = 190;

/** Tiers decided by clinical criteria, in the announcement's own precedence. */
const CRITERION_TIER_IDS = ["extreme", "very-high", "high"] as const;

function truthOf(answers: Readonly<Record<string, boolean>> | undefined, id: string): Truth {
  const answer = answers?.[id];
  if (answer === undefined) return "unknown";
  return answer ? "yes" : "no";
}

/**
 * The announcement states 冠狀動脈疾病 twice: as the prerequisite of 極高風險 (一),
 * and again as an alternative under (二). They are one clinical fact, so asking it
 * twice both wastes a question and lets the two answers disagree — and a patient
 * marked as not having it could still reach 極高風險 by ticking it the second time.
 *
 * The pairing is exact string equality once the source's trailing 。 is dropped, not
 * a similarity judgement: nothing is linked that the announcement does not word
 * identically. Anything less certain is left as two separate questions.
 */
function buildPrerequisiteAliases(): ReadonlyMap<string, string> {
  const prerequisiteByLabel = new Map<string, string>();
  for (const criterion of TIER_CRITERIA) {
    if (criterion.groupId === null || criterion.prerequisiteLabelZh === null) continue;
    prerequisiteByLabel.set(criterion.prerequisiteLabelZh, criterion.groupId);
  }
  const aliases = new Map<string, string>();
  for (const criterion of TIER_CRITERIA) {
    const groupId = prerequisiteByLabel.get(criterion.textRaw.replace(/。$/u, ""));
    // A group's own prerequisite is not an alias of itself.
    if (groupId === undefined || groupId === criterion.groupId) continue;
    aliases.set(criterion.criterionId, groupId);
  }
  return aliases;
}

/** criterionId → the group whose prerequisite states the same fact. */
const PREREQUISITE_ALIASES = buildPrerequisiteAliases();

/**
 * Reads one fact from both places it can be answered.
 *
 * Answering either side answers both, so the screen never asks twice. If a caller
 * supplies both and they disagree, the fact is unknown rather than one side winning:
 * the tool cannot tell which answer to believe, and saying so is the same stance it
 * takes everywhere else.
 */
function aliasedTruth(criterion: TierCriterionRecord, answers: RiskAnswers): Truth {
  const own = truthOf(answers.criteria, criterion.criterionId);
  const groupId = PREREQUISITE_ALIASES.get(criterion.criterionId);
  if (groupId === undefined) return own;
  const shared = truthOf(answers.prerequisites, groupId);
  if (own === "unknown") return shared;
  if (shared === "unknown" || shared === own) return own;
  return "unknown";
}

/** The same, read from the prerequisite side. */
function prerequisiteTruth(groupId: string, answers: RiskAnswers): Truth {
  const own = truthOf(answers.prerequisites, groupId);
  const twin = [...PREREQUISITE_ALIASES].find(([, target]) => target === groupId)?.[0];
  if (twin === undefined) return own;
  const shared = truthOf(answers.criteria, twin);
  if (own === "unknown") return shared;
  if (shared === "unknown" || shared === own) return own;
  return "unknown";
}

/** Kleene OR: one yes settles it; otherwise an unknown keeps it open. */
function anyOf(values: readonly Truth[]): Truth {
  if (values.includes("yes")) return "yes";
  return values.includes("unknown") ? "unknown" : "no";
}

/** Kleene AND: one no settles it; otherwise an unknown keeps it open. */
function allOf(values: readonly Truth[]): Truth {
  if (values.includes("no")) return "no";
  return values.includes("unknown") ? "unknown" : "yes";
}

function criteriaOfTier(tierId: string): readonly TierCriterionRecord[] {
  return TIER_CRITERIA.filter((criterion) => criterion.tierId === tierId);
}

/**
 * 高風險's LDL-C≧190mg/dL is read off the entered value rather than asked as a
 * yes/no, so the number the clinician already typed cannot disagree with a box
 * they ticked. An unentered value leaves the criterion unknown.
 */
function criterionTruth(criterion: TierCriterionRecord, answers: RiskAnswers): Truth {
  if (criterion.criterionId === LDL_C_HIGH_RISK_CRITERION_ID) {
    const { ldlC } = answers;
    if (typeof ldlC !== "number" || !Number.isFinite(ldlC)) return "unknown";
    return ldlC >= LDL_C_HIGH_RISK_THRESHOLD ? "yes" : "no";
  }
  return aliasedTruth(criterion, answers);
}

/**
 * 代謝性症候群 counts its own sub-criteria: three of five. Unknown sub-answers
 * keep it open only while they could still carry it over the line.
 */
function factorTruth(factor: RiskFactorRecord, answers: RiskAnswers): Truth {
  if (factor.requiredSubCount === null) return truthOf(answers.factors, factor.factorId);

  const children = RISK_FACTORS.filter((row) => row.parentFactorId === factor.factorId);
  const values = children.map((child) => truthOf(answers.factors, child.factorId));
  const yes = values.filter((value) => value === "yes").length;
  if (yes >= factor.requiredSubCount) return "yes";
  const undecided = values.filter((value) => value === "unknown").length;
  return yes + undecided >= factor.requiredSubCount ? "unknown" : "no";
}

interface TierVerdict {
  readonly truth: Truth;
  readonly reason: RiskReason | null;
  readonly missing: readonly RiskQuestion[];
}

/**
 * A two-level tier is "prerequisite AND one of the alternatives", per group. The
 * prerequisite is not decoration: 一年內曾經歷心肌梗塞 on its own does not make
 * someone 極高風險 — the announcement asks for 冠狀動脈疾病 as well.
 */
function evaluateCriterionTier(tier: RiskTierRecord, answers: RiskAnswers): TierVerdict {
  const criteria = criteriaOfTier(tier.tierId);
  const groups = new Map<string | null, TierCriterionRecord[]>();
  for (const criterion of criteria) {
    const group = groups.get(criterion.groupId) ?? [];
    group.push(criterion);
    groups.set(criterion.groupId, group);
  }

  const groupTruths: Truth[] = [];
  const missing: RiskQuestion[] = [];
  let reason: RiskReason | null = null;

  for (const [groupId, members] of groups) {
    const flat = groupId === null;
    const prerequisite: Truth = flat ? "yes" : prerequisiteTruth(groupId, answers);
    const memberTruths = members.map((criterion) => criterionTruth(criterion, answers));
    const truth = allOf([prerequisite, anyOf(memberTruths)]);
    groupTruths.push(truth);

    if (truth === "yes" && reason === null) {
      const matched = members[memberTruths.indexOf("yes")]!;
      reason = {
        kind: "criterion",
        criterion: matched,
        prerequisiteLabelZh: matched.prerequisiteLabelZh
      };
    }
    if (truth !== "unknown") continue;

    // Only ask what could still decide this group.
    if (!flat && prerequisite === "unknown") {
      const first = members[0]!;
      missing.push({
        kind: "prerequisite",
        id: groupId,
        tierId: tier.tierId,
        labelZh: first.prerequisiteLabelZh ?? first.textRaw,
        headingRaw: first.groupHeadingRaw ?? ""
      });
    }
    if (prerequisite === "no") continue;
    for (const [index, criterion] of members.entries()) {
      if (memberTruths[index] !== "unknown") continue;
      missing.push({
        kind: "criterion",
        id: criterion.criterionId,
        tierId: tier.tierId,
        labelZh: criterion.textRaw,
        headingRaw: criterion.groupHeadingRaw
      });
    }
  }

  return { truth: anyOf(groupTruths), reason, missing };
}

function tierById(tierId: string): RiskTierRecord {
  const tier = RISK_TIERS.find((row) => row.tierId === tierId);
  if (tier === undefined) throw new Error(`unknown risk tier ${tierId}`);
  return tier;
}

/** 2+ factors → 中風險, 1 → 低風險, 0 → the table's 0-factor row. */
function tierIdForFactorCount(count: number): string {
  if (count >= 2) return "moderate";
  return count === 1 ? "low" : "no-factors";
}

function factorQuestion(factor: RiskFactorRecord, parent: RiskFactorRecord | null): RiskQuestion {
  return {
    kind: "factor",
    id: factor.factorId,
    tierId: null,
    labelZh: factor.textRaw,
    headingRaw: parent?.textRaw ?? null
  };
}

function freeze<T>(value: T): T {
  return Object.freeze(value);
}

/**
 * Reads the answers so far into a tier, or into the list of answers still needed.
 *
 * Tiers are tried in the announcement's own order (極高 → 非常高 → 高 → factor
 * count), and the first one that holds wins. A tier only settles the question
 * once every tier above it has been ruled out: someone who meets 高風險 while
 * 極高風險 is still unanswered is not yet 高風險, they are undetermined between
 * the two — which is why unanswered has to stay distinct from answered "no".
 */
export function stratifyRisk(answers: RiskAnswers = {}): RiskAssessment {
  const verdicts = CRITERION_TIER_IDS.map((tierId) => ({
    tier: tierById(tierId),
    verdict: evaluateCriterionTier(tierById(tierId), answers)
  }));

  const openAbove: RiskQuestion[] = [];
  const possibleAbove: RiskTierRecord[] = [];

  for (const { tier, verdict } of verdicts) {
    if (verdict.truth === "yes") {
      if (openAbove.length === 0) {
        return freeze({ status: "determined", tier, reason: verdict.reason! });
      }
      return freeze({
        status: "undetermined",
        possibleTiers: freeze([...possibleAbove, tier]),
        missing: freeze(openAbove)
      });
    }
    if (verdict.truth === "unknown") {
      openAbove.push(...verdict.missing);
      possibleAbove.push(tier);
    }
  }

  // No clinical criterion holds, so the tier comes from how many risk factors do.
  const topLevel = RISK_FACTORS.filter((factor) => factor.parentFactorId === null);
  const truths = topLevel.map((factor) => factorTruth(factor, answers));
  const confirmed = topLevel.filter((_, index) => truths[index] === "yes");
  const undecided = truths.filter((truth) => truth === "unknown").length;

  const lowest = tierIdForFactorCount(confirmed.length);
  const highest = tierIdForFactorCount(confirmed.length + undecided);

  if (openAbove.length === 0 && lowest === highest) {
    const tier = tierById(lowest);
    return freeze({
      status: "determined",
      tier,
      reason: freeze({
        kind: "factor-count",
        count: confirmed.length,
        factors: freeze(confirmed),
        ruleRaw: tier.factorCountRuleRaw
      })
    });
  }

  const missing = [...openAbove];
  for (const [index, factor] of topLevel.entries()) {
    if (truths[index] !== "unknown") continue;
    if (factor.requiredSubCount === null) {
      missing.push(factorQuestion(factor, null));
      continue;
    }
    for (const child of RISK_FACTORS.filter((row) => row.parentFactorId === factor.factorId)) {
      if (truthOf(answers.factors, child.factorId) !== "unknown") continue;
      missing.push(factorQuestion(child, factor));
    }
  }

  const reachable = new Set([
    ...possibleAbove.map((tier) => tier.tierId),
    ...RISK_TIERS.filter(
      (tier) =>
        tier.order >= tierById(highest).order && tier.order <= tierById(lowest).order
    ).map((tier) => tier.tierId)
  ]);

  return freeze({
    status: "undetermined",
    possibleTiers: freeze(RISK_TIERS.filter((tier) => reachable.has(tier.tierId))),
    missing: freeze(missing)
  });
}

/** The next question to put on screen, or null once the tier is settled. */
export function nextRiskQuestion(answers: RiskAnswers = {}): RiskQuestion | null {
  const assessment = stratifyRisk(answers);
  return assessment.status === "undetermined" ? (assessment.missing[0] ?? null) : null;
}

export {
  RISK_DATASET_EFFECTIVE_FROM,
  RISK_DATASET_VERSION,
  RISK_FACTORS,
  RISK_TIERS,
  TIER_CRITERIA
};
export type { RiskFactorRecord, RiskTierRecord, TierCriterionRecord };
