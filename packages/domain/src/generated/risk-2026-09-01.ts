// Generated file. Do not edit.
//
// Source dataset: nhi-lipid-risk-2026-09-01-r1
// Transcribed from: attachment-2-rule-revision-table.pdf (6389a5f654e0cb755d006f04ed47eca6ada9f867873f43c5088f79db6bb6c1c2)
// Dataset digest (SHA-256): a60ee155a9e631d2a4933c06f36297465a613c30de19fa4514877da708cf4082
// Records: 6 tiers, 18 criteria, 11 factors
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
