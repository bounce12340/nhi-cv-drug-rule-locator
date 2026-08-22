// Generated file. Do not edit.
//
// Source dataset: nhi-lipid-risk-2026-09-01-r1
// Transcribed from: attachment-2-rule-revision-table.pdf (6389a5f654e0cb755d006f04ed47eca6ada9f867873f43c5088f79db6bb6c1c2)
// Dataset digest (SHA-256): 3b17cf467900dcf4dde8c049ff4091f092dada8cbd482bda6ef6731e2614dfcf
// Records: 6 tiers, 18 criteria, 11 factors,
//          6 assessment notes, 2 coverage rules (5 conditions)
// Generator: scripts/risk-codegen.mjs

export interface RiskTierRecord {
  readonly tierId: string;
  readonly order: number;
  readonly labelZh: string;
  readonly definitionHeadingRaw: string | null;
  readonly initiationThresholdRaw: string;
  readonly primaryTargetRaw: string;
  readonly secondaryTargetRaw: string | null;
  readonly factorCountRuleRaw: string | null;
  readonly prescriptionHeadingRaw: string | null;
  readonly prescriptionRuleLines: readonly string[] | null;
  readonly prescriptionRuleText: string | null;
}

export interface TierCriterionRecord {
  readonly criterionId: string;
  readonly tierId: string;
  readonly groupId: string | null;
  readonly groupHeadingRaw: string | null;
  readonly prerequisiteLabelZh: string | null;
  readonly ordinal: string | null;
  readonly textRaw: string;
}

export interface RiskFactorRecord {
  readonly factorId: string;
  readonly ordinal: string | null;
  readonly textRaw: string;
  readonly parentFactorId: string | null;
  readonly requiredSubCount: number | null;
}

/**
 * A note the announcement prints beneath the tier table. `appliesToTierIds` is
 * null for the non-HDL-C note, which names no tier at all.
 */
export interface AssessmentAdviceRecord {
  readonly adviceId: string;
  readonly groupId: string | null;
  readonly groupHeadingRaw: string | null;
  readonly appliesToTierIds: readonly string[] | null;
  readonly ordinal: string;
  readonly textRaw: string;
  readonly sourceLines: readonly string[];
}

/**
 * 2.6.2 (ezetimibe on its own) and 2.6.3 (the ezetimibe + statin combinations),
 * as revised on 2026-09-01. `restrictionRaw` is null for 2.6.3, which numbers its
 * requirements without asking for any one of them.
 */
export interface CoverageRuleRecord {
  readonly ruleId: string;
  readonly headingRaw: string;
  readonly headingLines: readonly string[];
  readonly restrictionRaw: string | null;
  readonly restrictionLines: readonly string[] | null;
  readonly exceptionNhiCodes: readonly string[];
}

export interface CoverageRuleConditionRecord {
  readonly conditionId: string;
  readonly ruleId: string;
  readonly ordinal: string;
  readonly textRaw: string;
  readonly sourceLines: readonly string[];
}

export const RISK_DATASET_VERSION = "nhi-lipid-risk-2026-09-01-r1" as const;
export const RISK_DATASET_EFFECTIVE_FROM = "2026-09-01" as const;

const generatedRiskTiers: RiskTierRecord[] = [
  {
    tierId: "extreme",
    order: 1,
    labelZh: "極高風險",
    definitionHeadingRaw: "一、極高風險：",
    initiationThresholdRaw: "LDL-C≧55mg/dL",
    primaryTargetRaw: "LDL-C<55mg/dL",
    secondaryTargetRaw: "non-HDL-C<85mg/dL",
    factorCountRuleRaw: null,
    prescriptionHeadingRaw: "極高、非常高風險：",
    prescriptionRuleLines: ["一、起始治療：依據基","線血脂值、用藥史","和臨床狀況，給予","中至高強度 statin 或","合併 ezetimibe。","二、經起始治療 6~8 週","後，檢測血脂指","標，如治療達標，","則維持治療，並應","每 6 個月追蹤血脂","指標；如血脂值未","達標，檢視服藥狀","況，並考慮調整至","高強度 statin 或最大","耐受 statin 劑量，同","時考慮合併 non-","statin 治療，包含：","ezetimibe、PCSK9","單株抗體、","siRNA、ATP citrate","lyase 抑制劑。","三、更動治療 1~3 個月","內需追蹤血脂值是","否達標，如治療達","標，則維持治療，","並應每 6 個月追蹤","血脂指標；如血脂","值未達標，檢視服","藥狀況，並考慮調","整藥物組合。"],
    prescriptionRuleText: "一、起始治療：依據基線血脂值、用藥史和臨床狀況，給予中至高強度 statin 或合併 ezetimibe。二、經起始治療 6~8 週後，檢測血脂指標，如治療達標，則維持治療，並應每 6 個月追蹤血脂指標；如血脂值未達標，檢視服藥狀況，並考慮調整至高強度 statin 或最大耐受 statin 劑量，同時考慮合併 non-statin 治療，包含：ezetimibe、PCSK9 單株抗體、siRNA、ATP citrate lyase 抑制劑。三、更動治療 1~3 個月內需追蹤血脂值是否達標，如治療達標，則維持治療，並應每 6 個月追蹤血脂指標；如血脂值未達標，檢視服藥狀況，並考慮調整藥物組合。"
  },
  {
    tierId: "very-high",
    order: 2,
    labelZh: "非常高風險",
    definitionHeadingRaw: "二、非常高風險：",
    initiationThresholdRaw: "LDL-C≧70mg/dL",
    primaryTargetRaw: "LDL-C<70mg/dL",
    secondaryTargetRaw: "non-HDL-C<100mg/dL",
    factorCountRuleRaw: null,
    prescriptionHeadingRaw: "極高、非常高風險：",
    prescriptionRuleLines: ["一、起始治療：依據基","線血脂值、用藥史","和臨床狀況，給予","中至高強度 statin 或","合併 ezetimibe。","二、經起始治療 6~8 週","後，檢測血脂指","標，如治療達標，","則維持治療，並應","每 6 個月追蹤血脂","指標；如血脂值未","達標，檢視服藥狀","況，並考慮調整至","高強度 statin 或最大","耐受 statin 劑量，同","時考慮合併 non-","statin 治療，包含：","ezetimibe、PCSK9","單株抗體、","siRNA、ATP citrate","lyase 抑制劑。","三、更動治療 1~3 個月","內需追蹤血脂值是","否達標，如治療達","標，則維持治療，","並應每 6 個月追蹤","血脂指標；如血脂","值未達標，檢視服","藥狀況，並考慮調","整藥物組合。"],
    prescriptionRuleText: "一、起始治療：依據基線血脂值、用藥史和臨床狀況，給予中至高強度 statin 或合併 ezetimibe。二、經起始治療 6~8 週後，檢測血脂指標，如治療達標，則維持治療，並應每 6 個月追蹤血脂指標；如血脂值未達標，檢視服藥狀況，並考慮調整至高強度 statin 或最大耐受 statin 劑量，同時考慮合併 non-statin 治療，包含：ezetimibe、PCSK9 單株抗體、siRNA、ATP citrate lyase 抑制劑。三、更動治療 1~3 個月內需追蹤血脂值是否達標，如治療達標，則維持治療，並應每 6 個月追蹤血脂指標；如血脂值未達標，檢視服藥狀況，並考慮調整藥物組合。"
  },
  {
    tierId: "high",
    order: 3,
    labelZh: "高風險",
    definitionHeadingRaw: "三、高風險：",
    initiationThresholdRaw: "LDL-C≧100mg/dL",
    primaryTargetRaw: "LDL-C<100mg/dL",
    secondaryTargetRaw: "non-HDL-C<130mg/dL",
    factorCountRuleRaw: null,
    prescriptionHeadingRaw: "高風險：",
    prescriptionRuleLines: ["一、起始治療：依據基","線血脂值與臨床狀","況，給予中至高強","度 statin 或合併","ezetimibe；同時進","行生活型態改變。","二、經起始治療 6~8 週","後，檢測血脂指","標，如治療達標，","則維持治療，並應","每 6 個月追蹤血脂","指標；如血脂值未","達標，檢視服藥狀","況，並考慮使用高","強度 statin 或最大耐","受 statin 劑量或同時","合併 non-statin 治","療，包含：","ezetimibe、PCSK9","單株抗體、","siRNA、ATP citrate","lyase 抑制劑。","三、更動治療 1~3 個月","內需追蹤血脂值是","否達標，如治療達","標，則維持治療，","並應每 6 個月追蹤","血脂指標；如血脂","值未達標，檢視服","藥狀況，並考慮調","整藥物組合。"],
    prescriptionRuleText: "一、起始治療：依據基線血脂值與臨床狀況，給予中至高強度 statin 或合併 ezetimibe；同時進行生活型態改變。二、經起始治療 6~8 週後，檢測血脂指標，如治療達標，則維持治療，並應每 6 個月追蹤血脂指標；如血脂值未達標，檢視服藥狀況，並考慮使用高強度 statin 或最大耐受 statin 劑量或同時合併 non-statin 治療，包含：ezetimibe、PCSK9 單株抗體、siRNA、ATP citrate lyase 抑制劑。三、更動治療 1~3 個月內需追蹤血脂值是否達標，如治療達標，則維持治療，並應每 6 個月追蹤血脂指標；如血脂值未達標，檢視服藥狀況，並考慮調整藥物組合。"
  },
  {
    tierId: "moderate",
    order: 4,
    labelZh: "中風險",
    definitionHeadingRaw: "四、中風險：",
    initiationThresholdRaw: "LDL-C≧115mg/dL",
    primaryTargetRaw: "LDL-C<115mg/dL",
    secondaryTargetRaw: "non-HDL-C<145mg/dL",
    factorCountRuleRaw: "2項(含)以上心血管風險因子。",
    prescriptionHeadingRaw: "中、低風險：",
    prescriptionRuleLines: ["一、起始治療：進行生","活型態改變，並處","置心血管風險因","子。","二、經起始治療 3~6 個","月後，檢測血脂指","標，如治療達標，","則維持治療，並應","每 6-12 個月追蹤血","脂指標；如血脂值","未達標，給予中強","度 statin。","三、中強度 statin 治療","6~8 週後追蹤血脂","值是否達標，如治","療達標，則維持治","療，並應每 6-12 個","月追蹤血脂指標；","如血脂值未達標，","檢視服藥狀況，並","可給予高強度 statin","或最大耐受 statin 劑","量或合併 non-statin","治療。"],
    prescriptionRuleText: "一、起始治療：進行生活型態改變，並處置心血管風險因子。二、經起始治療 3~6 個月後，檢測血脂指標，如治療達標，則維持治療，並應每 6-12 個月追蹤血脂指標；如血脂值未達標，給予中強度 statin。三、中強度 statin 治療 6~8 週後追蹤血脂值是否達標，如治療達標，則維持治療，並應每 6-12 個月追蹤血脂指標；如血脂值未達標，檢視服藥狀況，並可給予高強度 statin 或最大耐受 statin 劑量或合併 non-statin 治療。"
  },
  {
    tierId: "low",
    order: 5,
    labelZh: "低風險",
    definitionHeadingRaw: "五、低風險：",
    initiationThresholdRaw: "LDL-C≧130mg/dL",
    primaryTargetRaw: "LDL-C<130mg/dL",
    secondaryTargetRaw: "non-HDL-C<160mg/dL",
    factorCountRuleRaw: "1項心血管風險因子。",
    prescriptionHeadingRaw: "中、低風險：",
    prescriptionRuleLines: ["一、起始治療：進行生","活型態改變，並處","置心血管風險因","子。","二、經起始治療 3~6 個","月後，檢測血脂指","標，如治療達標，","則維持治療，並應","每 6-12 個月追蹤血","脂指標；如血脂值","未達標，給予中強","度 statin。","三、中強度 statin 治療","6~8 週後追蹤血脂","值是否達標，如治","療達標，則維持治","療，並應每 6-12 個","月追蹤血脂指標；","如血脂值未達標，","檢視服藥狀況，並","可給予高強度 statin","或最大耐受 statin 劑","量或合併 non-statin","治療。"],
    prescriptionRuleText: "一、起始治療：進行生活型態改變，並處置心血管風險因子。二、經起始治療 3~6 個月後，檢測血脂指標，如治療達標，則維持治療，並應每 6-12 個月追蹤血脂指標；如血脂值未達標，給予中強度 statin。三、中強度 statin 治療 6~8 週後追蹤血脂值是否達標，如治療達標，則維持治療，並應每 6-12 個月追蹤血脂指標；如血脂值未達標，檢視服藥狀況，並可給予高強度 statin 或最大耐受 statin 劑量或合併 non-statin 治療。"
  },
  {
    tierId: "no-factors",
    order: 6,
    labelZh: "0 項心血管風險因子",
    definitionHeadingRaw: null,
    initiationThresholdRaw: "LDL-C≧160mg/dL",
    primaryTargetRaw: "LDL-C<160mg/dL",
    secondaryTargetRaw: null,
    factorCountRuleRaw: null,
    prescriptionHeadingRaw: null,
    prescriptionRuleLines: null,
    prescriptionRuleText: null
  }
];

const generatedTierCriteria: TierCriterionRecord[] = [
  {
    criterionId: "extreme-1-1",
    tierId: "extreme",
    groupId: "extreme-1",
    groupHeadingRaw: "(一)冠狀動脈疾病合併下列任一臨床狀況：",
    prerequisiteLabelZh: "冠狀動脈疾病",
    ordinal: "1.",
    textRaw: "一年內曾經歷心肌梗塞。"
  },
  {
    criterionId: "extreme-1-2",
    tierId: "extreme",
    groupId: "extreme-1",
    groupHeadingRaw: "(一)冠狀動脈疾病合併下列任一臨床狀況：",
    prerequisiteLabelZh: "冠狀動脈疾病",
    ordinal: "2.",
    textRaw: "≧兩次心肌梗塞病史。"
  },
  {
    criterionId: "extreme-1-3",
    tierId: "extreme",
    groupId: "extreme-1",
    groupHeadingRaw: "(一)冠狀動脈疾病合併下列任一臨床狀況：",
    prerequisiteLabelZh: "冠狀動脈疾病",
    ordinal: "3.",
    textRaw: "多支冠狀動脈阻塞。"
  },
  {
    criterionId: "extreme-1-4",
    tierId: "extreme",
    groupId: "extreme-1",
    groupHeadingRaw: "(一)冠狀動脈疾病合併下列任一臨床狀況：",
    prerequisiteLabelZh: "冠狀動脈疾病",
    ordinal: "4.",
    textRaw: "急性冠心症合併糖尿病。"
  },
  {
    criterionId: "extreme-1-5",
    tierId: "extreme",
    groupId: "extreme-1",
    groupHeadingRaw: "(一)冠狀動脈疾病合併下列任一臨床狀況：",
    prerequisiteLabelZh: "冠狀動脈疾病",
    ordinal: "5.",
    textRaw: "周邊動脈疾病或頸動脈狹窄。"
  },
  {
    criterionId: "extreme-2-1",
    tierId: "extreme",
    groupId: "extreme-2",
    groupHeadingRaw: "(二)周邊動脈疾病合併下列任一臨床狀況：",
    prerequisiteLabelZh: "周邊動脈疾病",
    ordinal: "1.",
    textRaw: "冠狀動脈疾病。"
  },
  {
    criterionId: "extreme-2-2",
    tierId: "extreme",
    groupId: "extreme-2",
    groupHeadingRaw: "(二)周邊動脈疾病合併下列任一臨床狀況：",
    prerequisiteLabelZh: "周邊動脈疾病",
    ordinal: "2.",
    textRaw: "頸動脈狹窄。"
  },
  {
    criterionId: "very-high-1-1",
    tierId: "very-high",
    groupId: "very-high-1",
    groupHeadingRaw: "(一)經臨床檢查確診為動脈硬化心血管疾病，包含：",
    prerequisiteLabelZh: "經臨床檢查確診為動脈硬化心血管疾病",
    ordinal: "1.",
    textRaw: "急性冠心症病史。"
  },
  {
    criterionId: "very-high-1-2",
    tierId: "very-high",
    groupId: "very-high-1",
    groupHeadingRaw: "(一)經臨床檢查確診為動脈硬化心血管疾病，包含：",
    prerequisiteLabelZh: "經臨床檢查確診為動脈硬化心血管疾病",
    ordinal: "2.",
    textRaw: "接受血管再通術(心導管介入治療或外科冠狀動脈繞道手術)。"
  },
  {
    criterionId: "very-high-1-3",
    tierId: "very-high",
    groupId: "very-high-1",
    groupHeadingRaw: "(一)經臨床檢查確診為動脈硬化心血管疾病，包含：",
    prerequisiteLabelZh: "經臨床檢查確診為動脈硬化心血管疾病",
    ordinal: "3.",
    textRaw: "缺血性中風/短暫性腦缺血發作合併動脈硬化相關疾病或病史。"
  },
  {
    criterionId: "very-high-1-4",
    tierId: "very-high",
    groupId: "very-high-1",
    groupHeadingRaw: "(一)經臨床檢查確診為動脈硬化心血管疾病，包含：",
    prerequisiteLabelZh: "經臨床檢查確診為動脈硬化心血管疾病",
    ordinal: "4.",
    textRaw: "周邊動脈疾病(曾接受血管再通術、有肢體缺血相關症狀或截肢)。"
  },
  {
    criterionId: "very-high-2-1",
    tierId: "very-high",
    groupId: "very-high-2",
    groupHeadingRaw: "(二)經影像檢查確認有顯著斑塊負擔，定義為≧50%直徑狹窄率，包含：",
    prerequisiteLabelZh: "經影像檢查確認有顯著斑塊負擔，定義為≧50%直徑狹窄率",
    ordinal: "1.",
    textRaw: "冠狀動脈血管攝影。"
  },
  {
    criterionId: "very-high-2-2",
    tierId: "very-high",
    groupId: "very-high-2",
    groupHeadingRaw: "(二)經影像檢查確認有顯著斑塊負擔，定義為≧50%直徑狹窄率，包含：",
    prerequisiteLabelZh: "經影像檢查確認有顯著斑塊負擔，定義為≧50%直徑狹窄率",
    ordinal: "2.",
    textRaw: "冠狀動脈或周邊血管電腦斷層攝影。"
  },
  {
    criterionId: "very-high-2-3",
    tierId: "very-high",
    groupId: "very-high-2",
    groupHeadingRaw: "(二)經影像檢查確認有顯著斑塊負擔，定義為≧50%直徑狹窄率，包含：",
    prerequisiteLabelZh: "經影像檢查確認有顯著斑塊負擔，定義為≧50%直徑狹窄率",
    ordinal: "3.",
    textRaw: "頸動脈或周邊血管超音波。"
  },
  {
    criterionId: "high-1",
    tierId: "high",
    groupId: null,
    groupHeadingRaw: null,
    prerequisiteLabelZh: null,
    ordinal: "(一)",
    textRaw: "糖尿病。"
  },
  {
    criterionId: "high-2",
    tierId: "high",
    groupId: null,
    groupHeadingRaw: null,
    prerequisiteLabelZh: null,
    ordinal: "(二)",
    textRaw: "慢性腎臟病(進入透析治療前的慢性腎臟病，包括 UACR≧30mg/g or eGFR<60mL/min/1.73m² 至少持續3個月)。"
  },
  {
    criterionId: "high-3",
    tierId: "high",
    groupId: null,
    groupHeadingRaw: null,
    prerequisiteLabelZh: null,
    ordinal: "(三)",
    textRaw: "LDL-C≧190mg/dL。"
  },
  {
    criterionId: "high-4",
    tierId: "high",
    groupId: null,
    groupHeadingRaw: null,
    prerequisiteLabelZh: null,
    ordinal: "(四)",
    textRaw: "冠狀動脈鈣化分數(CAC)≧400。"
  }
];

const generatedRiskFactors: RiskFactorRecord[] = [
  {
    factorId: "factor-1",
    ordinal: "一、",
    textRaw: "高血壓。",
    parentFactorId: null,
    requiredSubCount: null
  },
  {
    factorId: "factor-2",
    ordinal: "二、",
    textRaw: "男性≧45歲，女性≧55歲。",
    parentFactorId: null,
    requiredSubCount: null
  },
  {
    factorId: "factor-3",
    ordinal: "三、",
    textRaw: "早發性冠心病家族史(男性≦55歲，女性≦65歲)。",
    parentFactorId: null,
    requiredSubCount: null
  },
  {
    factorId: "factor-4",
    ordinal: "四、",
    textRaw: "HDL-C：男性<40mg/dL，女性<50mg/dL。",
    parentFactorId: null,
    requiredSubCount: null
  },
  {
    factorId: "factor-5",
    ordinal: "五、",
    textRaw: "抽菸。",
    parentFactorId: null,
    requiredSubCount: null
  },
  {
    factorId: "factor-6",
    ordinal: "六、",
    textRaw: "代謝性症候群(符合以下至少三項)：",
    parentFactorId: null,
    requiredSubCount: 3
  },
  {
    factorId: "factor-6-1",
    ordinal: "(一)",
    textRaw: "腹部肥胖(男性≧90cm，女性≧80cm)。",
    parentFactorId: "factor-6",
    requiredSubCount: null
  },
  {
    factorId: "factor-6-2",
    ordinal: "(二)",
    textRaw: "血壓偏高(≧130/85mmHg 或使用高血壓藥物)。",
    parentFactorId: "factor-6",
    requiredSubCount: null
  },
  {
    factorId: "factor-6-3",
    ordinal: "(三)",
    textRaw: "空腹血糖偏高(≧100mg/dL 或使用糖尿病藥物)。",
    parentFactorId: "factor-6",
    requiredSubCount: null
  },
  {
    factorId: "factor-6-4",
    ordinal: "(四)",
    textRaw: "空腹 TG 偏高(≧150mg/dL 或使用治療 TG 血脂藥物)。",
    parentFactorId: "factor-6",
    requiredSubCount: null
  },
  {
    factorId: "factor-6-5",
    ordinal: "(五)",
    textRaw: "HDL-C 偏低(男性<40mg/dL，女性<50mg/dL)。",
    parentFactorId: "factor-6",
    requiredSubCount: null
  }
];

const generatedAssessmentAdvice: AssessmentAdviceRecord[] = [
  {
    adviceId: "advice-1-1",
    groupId: "advice-1",
    groupHeadingRaw: "極高風險、非常高風險：",
    appliesToTierIds: ["extreme","very-high"],
    ordinal: "(一)",
    textRaw: "初始評估應檢測完整血脂指標，並應於急性病人入院後24小時內完成血脂檢驗。",
    sourceLines: ["(一)初始評估應檢測完整血脂指標，並應於急性病人入院後24小時內完成血脂","檢驗。"]
  },
  {
    adviceId: "advice-1-2",
    groupId: "advice-1",
    groupHeadingRaw: "極高風險、非常高風險：",
    appliesToTierIds: ["extreme","very-high"],
    ordinal: "(二)",
    textRaw: "處置各項可改善心血管風險因子，包含：血壓、HbA1c、肥胖、抽菸、酒精攝取、生活型態。",
    sourceLines: ["(二)處置各項可改善心血管風險因子，包含：血壓、HbA1c、肥胖、抽菸、酒精","攝取、生活型態。"]
  },
  {
    adviceId: "advice-2-1",
    groupId: "advice-2",
    groupHeadingRaw: "高風險、中風險、低風險：",
    appliesToTierIds: ["high","moderate","low"],
    ordinal: "(一)",
    textRaw: "給予完整血脂指標檢測，辨識各項可改善心血管風險因子，包含：血壓、HbA1c、肥胖、抽菸、酒精攝取、生活型態。",
    sourceLines: ["(一)給予完整血脂指標檢測，辨識各項可改善心血管風險因子，包含：血壓、","HbA1c、肥胖、抽菸、酒精攝取、生活型態。"]
  },
  {
    adviceId: "advice-2-2",
    groupId: "advice-2",
    groupHeadingRaw: "高風險、中風險、低風險：",
    appliesToTierIds: ["high","moderate","low"],
    ordinal: "(二)",
    textRaw: "ASCVD 風險分級為高風險，當有嚴重高膽固醇血症、肌腱黃色瘤、早發心血管疾病或家族病史時，應依照台灣家族性高膽固醇血症診斷標準進行家族性膽固醇血症篩檢。",
    sourceLines: ["(二)ASCVD 風險分級為高風險，當有嚴重高膽固醇血症、肌腱黃色瘤、早發心","血管疾病或家族病史時，應依照台灣家族性高膽固醇血症診斷標準進行家","族性膽固醇血症篩檢。"]
  },
  {
    adviceId: "advice-2-3",
    groupId: "advice-2",
    groupHeadingRaw: "高風險、中風險、低風險：",
    appliesToTierIds: ["high","moderate","low"],
    ordinal: "(三)",
    textRaw: "若未符合上述高風險條件，應以列在低至中風險欄位的心血管風險因子數量作為風險評估。",
    sourceLines: ["(三)若未符合上述高風險條件，應以列在低至中風險欄位的心血管風險因子數","量作為風險評估。"]
  },
  {
    adviceId: "advice-secondary-target",
    groupId: null,
    groupHeadingRaw: null,
    appliesToTierIds: null,
    ordinal: "●",
    textRaw: "當 LDL-C 達到理想治療目標後，非高密度脂蛋白-膽固醇(non-HDL-C)可作為血脂治療次要標的，其計算方式為總膽固醇數值減掉 HDL-C 數值，尤其適用於合併有高三酸甘油脂、糖尿病、或肥胖的病人以做進一步的心血管風險評估。",
    sourceLines: ["●當 LDL-C 達到理想治療目標後，非高密度脂蛋白-膽固醇(non-HDL-C)可作為血","脂治療次要標的，其計算方式為總膽固醇數值減掉 HDL-C 數值，尤其適用於合","併有高三酸甘油脂、糖尿病、或肥胖的病人以做進一步的心血管風險評估。"]
  }
];

const generatedCoverageRules: CoverageRuleRecord[] = [
  {
    ruleId: "2.6.2",
    headingRaw: "2.6.2.Ezetimibe：(94/6/1、115/9/1)",
    headingLines: ["2.6.2.Ezetimibe：(94/6/1、","115/9/1)"],
    restrictionRaw: "限用於原發性高膽固醇血症、同型接合子家族性高膽固醇血症、同型接合子性麥脂醇血症(植物脂醇血症)患者，並符合下列條件之一者：",
    restrictionLines: ["限用於原發性高膽固醇血症、同型接","合子家族性高膽固醇血症、同型接合","子性麥脂醇血症(植物脂醇血症)患","者，並符合下列條件之一者："],
    exceptionNhiCodes: ["AC60610100","BC27311100","BC28252100","BC26552100"]
  },
  {
    ruleId: "2.6.3",
    headingRaw: "2.6.3.含 ezetimibe 及 statin 類之複方製劑：(95/12/1、106/8/1、111/11/1、112/12/1、115/9/1)：",
    headingLines: ["2.6.3.含 ezetimibe 及 statin 類之複","方製劑：(95/12/1、106/8/1、","111/11/1、112/12/1、115/9/1)："],
    restrictionRaw: null,
    restrictionLines: null,
    exceptionNhiCodes: ["AC59251100","AC60402100","BC28502100","AC62052100","AC62053100","AC62140100","AC62139100","BC28181100","BC28182100","BC28884100"]
  }
];

const generatedCoverageRuleConditions: CoverageRuleConditionRecord[] = [
  {
    conditionId: "2.6.2-1",
    ruleId: "2.6.2",
    ordinal: "1.",
    textRaw: "對 statins 類藥品發生無法耐受藥物不良反應（如 Severe myalgia、Myositis）者。(94/6/1、115/9/1)",
    sourceLines: ["1.對 statins 類藥品發生無法耐受藥","物不良反應（如 Severe","myalgia、Myositis）者。","(94/6/1、115/9/1)"]
  },
  {
    conditionId: "2.6.2-2",
    ruleId: "2.6.2",
    ordinal: "2.",
    textRaw: "經使用 statins 類藥品單一治療6-8週未達治療目標者，得合併使用本類藥品與 statins 類藥品。但下表所列項目，需經使用 statins 類藥品單一治療3個月未達治療目標者，始得與 statins 類藥品併用。(115/9/1)",
    sourceLines: ["2.經使用 statins 類藥品單一治療6-","8週未達治療目標者，得合併使用","本類藥品與 statins 類藥品。但下","表所列項目，需經使用 statins 類","藥品單一治療3個月未達治療目標","者，始得與 statins 類藥品併用。","(115/9/1)"]
  },
  {
    conditionId: "2.6.3-1",
    ruleId: "2.6.3",
    ordinal: "1.",
    textRaw: "限用於原發性高膽固醇血症、同型接合子家族性高膽固醇血症(HOFH)病患。(106/8/1、115/9/1)",
    sourceLines: ["1.限用於原發性高膽固醇血症、同型","接合子家族性高膽固醇血症(HOFH)","病患。(106/8/1、115/9/1)"]
  },
  {
    conditionId: "2.6.3-2",
    ruleId: "2.6.3",
    ordinal: "2.",
    textRaw: "經使用 statin 類藥品單一治療6-8週未達治療目標者，得使用本類藥品。但下表所列項目，需經使用 statin 類藥品單一治療3個月未達治療目標者，始得使用。(115/9/1)",
    sourceLines: ["2.經使用 statin 類藥品單一治療6-8","週未達治療目標者，得使用本類藥","品。但下表所列項目，需經使用","statin 類藥品單一治療3個月未達","治療目標者，始得使用。","(115/9/1)"]
  },
  {
    conditionId: "2.6.3-3",
    ruleId: "2.6.3",
    ordinal: "3.",
    textRaw: "本品不得與 gemfibrozil 併用。(106/8/1)",
    sourceLines: ["3.本品不得與 gemfibrozil 併用。","(106/8/1)"]
  }
];

function deepFreeze<T>(value: T): T {
  if (typeof value === "object" && value !== null && !Object.isFrozen(value)) {
    for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

export const RISK_TIERS: readonly RiskTierRecord[] = deepFreeze(generatedRiskTiers);
export const TIER_CRITERIA: readonly TierCriterionRecord[] = deepFreeze(generatedTierCriteria);
export const RISK_FACTORS: readonly RiskFactorRecord[] = deepFreeze(generatedRiskFactors);
export const ASSESSMENT_ADVICE: readonly AssessmentAdviceRecord[] =
  deepFreeze(generatedAssessmentAdvice);
export const COVERAGE_RULES: readonly CoverageRuleRecord[] = deepFreeze(generatedCoverageRules);
export const COVERAGE_RULE_CONDITIONS: readonly CoverageRuleConditionRecord[] = deepFreeze(
  generatedCoverageRuleConditions
);
