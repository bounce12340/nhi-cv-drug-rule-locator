// GENERATED — DO NOT EDIT
// Source dataset: nhi-lipid-rules-structured-2026-09-01-r1
// Dataset digest (SHA-256): dcb6bd916fc802a18e50e02ec760928e819ef2fa2ef881155b88bca6c8e67c28
// Unit count: 67
// Authorization: RDL-016
// Generator: scripts/rules-codegen.mjs

export interface RuleTextSourceAnchor {
  readonly page: number;
  readonly lineStart: number;
  readonly lineEnd: number;
}

export interface RuleTextUnit {
  readonly unitId: string;
  readonly section: string;
  readonly tableLabel: string;
  readonly clausePath: readonly string[];
  readonly unitType: string;
  readonly verbatimText: string;
  readonly sourceAnchor: RuleTextSourceAnchor;
  readonly unitSha256: string;
  readonly rowIndex?: number;
  readonly columnLabels?: readonly string[];
}

export const RULE_TEXT_DATASET_VERSION = "nhi-lipid-rules-structured-2026-09-01-r1" as const;
export const RULE_TEXT_EFFECTIVE_FROM = "2026-09-01" as const;

const generatedRuleTextUnits: RuleTextUnit[] = [
  {
    "unitId": "2.6.1-001",
    "section": "2.6.1",
    "tableLabel": "無",
    "clausePath": [],
    "unitType": "條文",
    "verbatimText": "2.6.1.全民健康保險降血脂藥物給付規定\n表(86/1/1、87/4/1、87/7/1、91/9/1、\n93/9/1、97/7/1、102/8/1、108/2/1、\n115/9/1)\n降膽固醇藥物,適用全民健康保險降膽固\n醇藥物給付規定表一。但下表所列項目不\n適用表一,僅適用全民健康保險降膽固醇\n藥物給付規定表二。(115/9/1)\n成分名稱\n健保代碼\n藥品名稱\nsimvastatin\nSimvatin film coating\nAC46402100\ntablets 20mg\nVatatin F.C. tablets\nAB47348100\n20mg \"STANDARD\"\nSimvahexal film-\nBC24339100\ncoated tablets 40mg\nSimatin F.C. tablets\nAC49672100\n20mg\nSimpotin F.C. tablets\nAC49841100\n20 mg \"Weidar\"\nZostatin F.C. tablets 20\nAC47924100\nmg \"S.C.\"\nSimvahexal film-\nBC23970100\ncoated tablets 20mg\nBezostatin F.C. tablets\nAC49360100\n40 mg \"S.C.\"\nSimvatenin F.C. tablets\nAC48813100\n20mg (simvastatin)\nSimvastatin F.C.\nAC56804100\ntablets 20mg \"CYH\"\nSimatin F.C. tablets\nAC49699100\n10mg\nSinty F.C. tablets\nAC47907100\n20mg\nSimva F.C. tablets 20\nAC48926100\nmg\nSivasin film coated\nAC49190100\ntablets 40mg\nSimvatin film coating\nAC58207100\ntablets 40mg\nSimva F.C. tablets\nAC48608100\n20mg \"Union\"\nSimatin F.C. tablets 40\nAC49997100\nmg\nSimva F.C. tablets\nA055967100\n40mg \"Union\"\nSinty F.C. tablets\nAC56806100\n40mg\nlovastatin\nLozutin tablets 20mg\nAC39403100\n(lovastatin)\nDelipic tablets 20mg\nAC39307100\n\"Standard\" (lovastatin)\nLovatin tablets 20mg\nA042389100\n\"PANBIOTIC\"\npravastatin\nMevalotin protect\nBC23596100\n40mg tablets\nJoinlo tablets 40mg\nAC52581100\n“EVEREST”\nPratin tablets 40 mg\nAB49454100\n(pravastatin sodium)\nPavatin protect tablets\nAB48586100\n20mg \"Standard\"\n(pravastatin sodium)\nU-Chu Pavadin tablets\nAB48681100\n20 mg\nPratin tablets 10mg\nAB46029100\n(pravastatin sodium)\nMechol tablets 20mg\nAB48644100\n\"Yung Shin\"\nAB49021100\nPratin tablets 20 mg\nMevalotin protect\nBC23597100\n20mg tablets\nPavatin protect tablets\nAC57126100\n40mg \"Standard\"\n(pravastatin sodium)\nMechol tablets 10mg\nAC48469100\n\"Yung Shin\"\nJoinlo tablet 20mg\nAC57741100\nEVEREST\nfluvastatin\nLescol XL film-coated\nBC23556100\ntablets 80mg\nFluvastatin XL film-\nBC26147100\ncoated tablets 80mg\nLecitol XL film-coated\nAC56629100\nTablets 80mg\natorvastatin\nAtorva film-coated\ntablets 10mg\nAC55272100\n\"Standard\"\n(atorvastatin)\nTulip 20mg film\nBA25337100\ncoated tablets\nTulip 10mg film\nBA25200100\ncoated tablets\nAnxolipo F.C. tablet\nAC48879100\n10 mg\nAtotin F.C. tablets\nAC57267100\n10mg\nAtoty F.C. tablets 10\nAC51598100\nmg\nAtotin F.C. tablets\nAC58211100\n20mg\nAnxolightor F.C.\nAC49226100\ntablets 20 mg\nAtoroty F.C. tablets\nAC58517100\n20mg\nAtorva F.C. tab. 20mg\nAC57805100 \"Standard\"\n(atorvastatin)\nAtorin F.C. tablet\nAA49543100\n10mg\nTulip 40mg film\nBA25201100\ncoated tablets\nAtover F.C. Tab. 10mg\nAA57774100\nP.L.\nAtorin F.C. tablets\nAC52530100\n20mg\nAtorcal F.C. tablets\nAC55583100\n20mg \"S.C.\"\nAtorcal F.C. tablets\nAC55895100\n10mg \"S.C.\"\nAtover F.C. tablets\nAA57950100\n20mg P.L.\nAtorva film-coated\ntablets 40mg\nAC55268100\n\"Standard\"(atorvastati\nn)\nAtoty F.C. tablets 20\nAC55952100\nmg\nAnxolipo F.C. tablets\nAA56739100\n20mg\nLipiminus F.C. tablets\nAC55956100\n20mg\nAtover F.C. tablets 40\nAB54967100\nmg \"P.L.\"\nAnxolipo F.C. tablets\nAA49288100\n40mg\nLipiminus F.C.tablets\nAC56319100\n10mg\nAtotin F.C. tablets\nAC57133100\n40mg\nLipiminus F.C tablets\nAC52301100\n40mg\nAtova F.C. tablets\nAC57930100\n10mg \"Yu Sheng\"\nAtoroty F.C. tablets\nAC56682100\n10mg\nAtorcal F.C. tablets 40\nAC50086100\nmg \"S.C.\"\nAtorstin film coated\nAB57967100\ntablets 10mg\nAtoty F.C. tablets\nAC58041100\n40mg\nAtorstin film coated\nAB57772100\ntablets 40mg\nAtorstin film coated\nAB58049100\ntablets 20mg\nAtorin F.C. tablets\nAB51732100\n40mg\nAtoroty F.C. tablets\nAC58262100\n40mg\nrosuvastatin AA57802100 Roty F.C. tablets 10mg\nAA57843100 Roty F.C. tablets 5mg\nBC24597100\nCrestor 5mg film-\ncoated tablets\nAC57803100\nRoty F.C. tablets 20mg\nCrestor 20mg film-\nBC24129100\ncoated tablets\nRosulator F.C. tablets\nAB57940100\n10mg \"S.C.\"\nAlvostat film coated\nBC26543100\ntablets 10mg\nRostatin F.C. tablets\nAC59266100\n5mg \"Standard\"\nRostatin F.C. tablets\nAC58282100\n10mg \"Standard\"\nRosu F.C. tablets\nAC58384100\n10mg\nRotlip film-coated\nAC57130100\ntablets 10mg\nRosulator F.C. tablets\nAC59652100\n5mg \"S.C.\"\nRolipostatin 10mg F.C.\nAC57809100\ntablets \"Macro\"\nZyrova 20\nBC26900100\n(rosuvastatin tablets\n20mg)\nZyrova 5 (rosuvastatin\nBC27782100\ntablets 5mg)\nAladdin F.C. tablets\nAC58969100\n10mg\nZyrova 10\nBC27781100\n(rosuvastatin tablets\n10mg)\nRosutor film-coated\nAC58067100\ntablets 10mg\nAlvostat film coated\nBC26544100\ntablets 20mg\nRosutor film-coated\nAC60114100\ntablets 5mg\nRosulip F.C. tablets\nAC59649100\n5mg C.H.\nCrosuty F.C. tablets\nAC58270100\n10mg\nRotlip film-coated\nAC58622100\ntablets 5mg\nAC58098100\nCrosuty F.C. tablets\n5mg\nRosutor film-coated\nAC60197100\ntablets 20mg\npitavastatin\nBC25350100 Livalo tablets 2mg\nPitarty F.C. tablets\nAA58648100\n2mg\nBC27002100 Livalo OD tablets 2mg\nPitastatin F.C. tablets\nAC58526100\n2mg\nPitarty F.C. tablets\nAC58633100\n4mg\nPitastatin F.C. tablets\nAC58525100\n4mg\nAC59398100\nPivas F.C. tablets 2mg\nPitanxo F.C. tablets\nAC59192100\n4mg\n\"EVEREST\" Huiton\nAC60561100\nF.C. tablets 2mg\nPistatin F.C. tablets\nAC61795100\n2mg\nPitavol F.C.tablets\nAC58078100\n2mg\nPitavastatin F.C.\nAC60174100\ntablets 2mg \"CYH\"\nPitanxo F.C. tablets\nAC59193100\n2mg\nLavitol film coated\nAC60290100\ntablets 4mg\npravastatin\nPravafen 40mg/160mg\nhard capsules\n及\nBC26169100\nfenofibrate\n複方\natorvastatin\nCaduet 5mg/20mg\nBC24392100\ntablet\n及\namlodipine\nCaduet 5mg/10mg\nBC24391100\ntablet\n複方\nDualpress F.C. tablets\nAC59887100\n5mg/10mg\nDualpress F.C. tablets\nAC60836100\n5mg/20mg",
    "sourceAnchor": {
      "page": 1,
      "lineStart": 1,
      "lineEnd": 370
    },
    "unitSha256": "49c94f3169e5b0b0e23b9c2d9810f2603c1c6f34c8dd0573d1d93b884f7b6bed"
  },
  {
    "unitId": "2.6.1-002",
    "section": "2.6.1",
    "tableLabel": "表一",
    "clausePath": [],
    "unitType": "表題",
    "verbatimText": "全民健康保險降膽固醇藥物給付規定表一:(115/9/1)\n起始藥物\nASCVD 風\n非藥物\n主要/(次要)血\n處方規定\n治療血脂",
    "sourceAnchor": {
      "page": 7,
      "lineStart": 371,
      "lineEnd": 377
    },
    "unitSha256": "1e19c9b06683ace26d7f0adebe0563cd43b4d0b41f504247175721c7294586c5"
  },
  {
    "unitId": "2.6.1-003",
    "section": "2.6.1",
    "tableLabel": "表一",
    "clausePath": [],
    "unitType": "資料列",
    "verbatimText": "險等級\n治療\n脂目標值\n值\nLDL-C≧\nLDL-\n極高風險\n處置各\n極高、非常高風險:\n55mg/dL\nC<55mg/dL(non-\n項可改\n一、起始治療:依據基\nHDL-C<85mg/dL)\n善心血\n線血脂值、用藥史",
    "sourceAnchor": {
      "page": 7,
      "lineStart": 378,
      "lineEnd": 393
    },
    "unitSha256": "744702b692828ec20a41f1c215856b8ea0fdc2fde31b61da0453c2e3df7af3a8",
    "rowIndex": 1,
    "columnLabels": [
      "起始藥物",
      "ASCVD 風",
      "非藥物",
      "主要/(次要)血",
      "處方規定",
      "治療血脂"
    ]
  },
  {
    "unitId": "2.6.1-004",
    "section": "2.6.1",
    "tableLabel": "表一",
    "clausePath": [],
    "unitType": "資料列",
    "verbatimText": "LDL-C≧\nLDL-\n非常高風險 管風險\n和臨床狀況,給予\n中至高強度 statin 或\n70mg/dL\nC<70mg/dL(non-\n因子與\n合併 ezetimibe。\nHDL-\n藥物治\n二、經起始治療 6~8 週\nC<100mg/dL)\n療並行\n後,檢測血脂指\n標,如治療達標,\n則維持治療,並應\n每 6 個月追蹤血脂\n指標;如血脂值未\n達標,檢視服藥狀\n況,並考慮調整至\n高強度 statin 或最大\n耐受 statin 劑量,同\n時考慮合併 non-\nstatin 治療,包含:\nezetimibe、PCSK9\n單株抗體、\nsiRNA、ATP citrate\nlyase 抑制劑。\n三、更動治療 1~3 個月\n內需追蹤血脂值是\n否達標,如治療達\n標,則維持治療,\n並應每 6 個月追蹤\n血脂指標;如血脂\n值未達標,檢視服\n藥狀況,並考慮調\n整藥物組合。",
    "sourceAnchor": {
      "page": 7,
      "lineStart": 394,
      "lineEnd": 431
    },
    "unitSha256": "8c3a270bbc138a65c0aa058d713c6fb920df6a7f567e06ba3b8289e46cc0f723",
    "rowIndex": 2,
    "columnLabels": [
      "起始藥物",
      "ASCVD 風",
      "非藥物",
      "主要/(次要)血",
      "處方規定",
      "治療血脂"
    ]
  },
  {
    "unitId": "2.6.1-005",
    "section": "2.6.1",
    "tableLabel": "表一",
    "clausePath": [],
    "unitType": "資料列",
    "verbatimText": "LDL-C≧\nLDL-\n高風險\n生活型\n高風險:\n100mg/dL\nC<100mg/dL(non- 一、起始治療:依據基\n態改變\nHDL-\n與藥物\n線血脂值與臨床狀\nC<130mg/dL)\n治療並\n況,給予中至高強\n度 statin 或合併\n行\nezetimibe;同時進",
    "sourceAnchor": {
      "page": 8,
      "lineStart": 432,
      "lineEnd": 448
    },
    "unitSha256": "4dead5161b81bf412e5ef34454dfe24280ab99d82ef3bbe62478bc34a8f6db62",
    "rowIndex": 3,
    "columnLabels": [
      "起始藥物",
      "ASCVD 風",
      "非藥物",
      "主要/(次要)血",
      "處方規定",
      "治療血脂"
    ]
  },
  {
    "unitId": "2.6.1-006",
    "section": "2.6.1",
    "tableLabel": "表一",
    "clausePath": [],
    "unitType": "資料列",
    "verbatimText": "LDL-C≧\nLDL-\n中風險\n給藥前\n應有 3-\n115mg/dL\nC<115mg/dL(non-\n行生活型態改變。\n二、經起始治療 6~8 週\n6 個月\nHDL-\nC<145mg/dL)\n後,檢測血脂指\n生活型\n標,如治療達標,",
    "sourceAnchor": {
      "page": 8,
      "lineStart": 449,
      "lineEnd": 463
    },
    "unitSha256": "09dbda137784ec5a4f2fe0915ff9bacad1b3c60ea8c6351fc7449e602af7dcb6",
    "rowIndex": 4,
    "columnLabels": [
      "起始藥物",
      "ASCVD 風",
      "非藥物",
      "主要/(次要)血",
      "處方規定",
      "治療血脂"
    ]
  },
  {
    "unitId": "2.6.1-007",
    "section": "2.6.1",
    "tableLabel": "表一",
    "clausePath": [],
    "unitType": "資料列",
    "verbatimText": "LDL-C≧\nLDL-\n態改\n低風險\n則維持治療,並應\n130mg/dL\nC<130mg/dL(non-\n變,並\n每 6 個月追蹤血脂\nHDL-\n處置心\n指標;如血脂值未\nC<160mg/dL)\n血管風\n達標,檢視服藥狀\n險因子\n0 項心血管",
    "sourceAnchor": {
      "page": 8,
      "lineStart": 464,
      "lineEnd": 480
    },
    "unitSha256": "e2ea1868d13376cb73db3cd373f8fcd555b6e184f10349c47a1af38804e03590",
    "rowIndex": 5,
    "columnLabels": [
      "起始藥物",
      "ASCVD 風",
      "非藥物",
      "主要/(次要)血",
      "處方規定",
      "治療血脂"
    ]
  },
  {
    "unitId": "2.6.1-008",
    "section": "2.6.1",
    "tableLabel": "表一",
    "clausePath": [],
    "unitType": "資料列",
    "verbatimText": "LDL-C≧\nLDL-C<160mg/dL\n況,並考慮使用高\n160mg/dL\n風險因子\n強度 statin 或最大耐\n受 statin 劑量或同時\n合併 non-statin 治\n療,包含:\nezetimibe、PCSK9\n單株抗體、\nsiRNA、ATP citrate\nlyase 抑制劑。\n三、更動治療 1~3 個月\n內需追蹤血脂值是\n否達標,如治療達\n標,則維持治療,\n並應每 6 個月追蹤\n血脂指標;如血脂\n值未達標,檢視服\n藥狀況,並考慮調\n整藥物組合。\n中、低風險:\n一、起始治療:進行生\n活型態改變,並處\n置心血管風險因\n子。\n二、經起始治療 3~6 個\n月後,檢測血脂指\n標,如治療達標,\n則維持治療,並應\n每 6-12 個月追蹤血\n脂指標;如血脂值\n未達標,給予中強\n度 statin。\n三、中強度 statin 治療\n6~8 週後追蹤血脂\n值是否達標,如治\n療達標,則維持治\n療,並應每 6-12 個\n月追蹤血脂指標;\n如血脂值未達標,\n檢視服藥狀況,並\n可給予高強度 statin\n或最大耐受 statin 劑\n量或合併 non-statin\n治療。",
    "sourceAnchor": {
      "page": 8,
      "lineStart": 481,
      "lineEnd": 527
    },
    "unitSha256": "ac1fa76326667e06a816b43bd64916350ded2b3c885e9d8f577ad5ed1e217e6b",
    "rowIndex": 6,
    "columnLabels": [
      "起始藥物",
      "ASCVD 風",
      "非藥物",
      "主要/(次要)血",
      "處方規定",
      "治療血脂"
    ]
  },
  {
    "unitId": "2.6.1-009",
    "section": "2.6.1",
    "tableLabel": "無",
    "clausePath": [],
    "unitType": "定義項",
    "verbatimText": "●ASCVD 風險等級定義:\n一、極高風險:",
    "sourceAnchor": {
      "page": 9,
      "lineStart": 528,
      "lineEnd": 529
    },
    "unitSha256": "a92f5726073ad7f56c0320a9100d41b4f37bba01fddf266642b8a4a948498e85"
  },
  {
    "unitId": "2.6.1-010",
    "section": "2.6.1",
    "tableLabel": "無",
    "clausePath": [
      "(一)"
    ],
    "unitType": "定義項",
    "verbatimText": "(一)冠狀動脈疾病合併下列任一臨床狀況:",
    "sourceAnchor": {
      "page": 9,
      "lineStart": 530,
      "lineEnd": 530
    },
    "unitSha256": "82248c6cb61b07441bc32d6f532f68fcca7abc26d4f7b238c94ac5b8d4886d89"
  },
  {
    "unitId": "2.6.1-011",
    "section": "2.6.1",
    "tableLabel": "無",
    "clausePath": [
      "(一)",
      "1."
    ],
    "unitType": "定義項",
    "verbatimText": "1.一年內曾經歷心肌梗塞。",
    "sourceAnchor": {
      "page": 10,
      "lineStart": 531,
      "lineEnd": 531
    },
    "unitSha256": "761619aefa5483cf269bb9e65626b9a0cc365525ca1bbec0ea73c2d4b05902ab"
  },
  {
    "unitId": "2.6.1-012",
    "section": "2.6.1",
    "tableLabel": "無",
    "clausePath": [
      "(一)",
      "2."
    ],
    "unitType": "定義項",
    "verbatimText": "2.≧兩次心肌梗塞病史。",
    "sourceAnchor": {
      "page": 10,
      "lineStart": 532,
      "lineEnd": 532
    },
    "unitSha256": "112c0fccf46a0e3ea3cbecfc3b069971dae7187eea51945a4f5c993c9af40474"
  },
  {
    "unitId": "2.6.1-013",
    "section": "2.6.1",
    "tableLabel": "無",
    "clausePath": [
      "(一)",
      "3."
    ],
    "unitType": "定義項",
    "verbatimText": "3.多支冠狀動脈阻塞。",
    "sourceAnchor": {
      "page": 10,
      "lineStart": 533,
      "lineEnd": 533
    },
    "unitSha256": "b5c83e2c597a69a194799b00d1ce3370ae535d902d62d50f23368c21aae49fb8"
  },
  {
    "unitId": "2.6.1-014",
    "section": "2.6.1",
    "tableLabel": "無",
    "clausePath": [
      "(一)",
      "4."
    ],
    "unitType": "定義項",
    "verbatimText": "4.急性冠心症合併糖尿病。",
    "sourceAnchor": {
      "page": 10,
      "lineStart": 534,
      "lineEnd": 534
    },
    "unitSha256": "637af7793a57e675f308b1b767453f18ea1541230c3b924363fabe28990ab1ef"
  },
  {
    "unitId": "2.6.1-015",
    "section": "2.6.1",
    "tableLabel": "無",
    "clausePath": [
      "(一)",
      "5."
    ],
    "unitType": "定義項",
    "verbatimText": "5.周邊動脈疾病或頸動脈狹窄。",
    "sourceAnchor": {
      "page": 10,
      "lineStart": 535,
      "lineEnd": 535
    },
    "unitSha256": "b38eae44c377c29a960a46d6e76fd0bf12f8f650adc677b2224d2db4b2505618"
  },
  {
    "unitId": "2.6.1-016",
    "section": "2.6.1",
    "tableLabel": "無",
    "clausePath": [
      "(二)"
    ],
    "unitType": "定義項",
    "verbatimText": "(二)周邊動脈疾病合併下列任一臨床狀況:",
    "sourceAnchor": {
      "page": 10,
      "lineStart": 536,
      "lineEnd": 536
    },
    "unitSha256": "59f3b79aa93f3d08dae3c8370cd014355093b2c3d3c0c08349327259b09f3204"
  },
  {
    "unitId": "2.6.1-017",
    "section": "2.6.1",
    "tableLabel": "無",
    "clausePath": [
      "(二)",
      "1."
    ],
    "unitType": "定義項",
    "verbatimText": "1.冠狀動脈疾病。",
    "sourceAnchor": {
      "page": 10,
      "lineStart": 537,
      "lineEnd": 537
    },
    "unitSha256": "e8890cfc4591c5cbd1999ba3b54e74ae54ddd8dbbb1c08d2a60279f94bc23809"
  },
  {
    "unitId": "2.6.1-018",
    "section": "2.6.1",
    "tableLabel": "無",
    "clausePath": [
      "(二)",
      "2."
    ],
    "unitType": "定義項",
    "verbatimText": "2.頸動脈狹窄。\n二、非常高風險:",
    "sourceAnchor": {
      "page": 10,
      "lineStart": 538,
      "lineEnd": 539
    },
    "unitSha256": "fd608eb489610895c50cb88b0896b61c90ceed9db4cf9c3f8ac78d0c2ec8e479"
  },
  {
    "unitId": "2.6.1-019",
    "section": "2.6.1",
    "tableLabel": "無",
    "clausePath": [
      "(一)"
    ],
    "unitType": "定義項",
    "verbatimText": "(一)經臨床檢查確診為動脈硬化心血管疾病,包含:",
    "sourceAnchor": {
      "page": 10,
      "lineStart": 540,
      "lineEnd": 540
    },
    "unitSha256": "bf08b4fc6e331d3175fa6a4fa2d676bb18d66403154c065d4a09c7e15a76d9d7"
  },
  {
    "unitId": "2.6.1-020",
    "section": "2.6.1",
    "tableLabel": "無",
    "clausePath": [
      "(一)",
      "1."
    ],
    "unitType": "定義項",
    "verbatimText": "1.急性冠心症病史。",
    "sourceAnchor": {
      "page": 10,
      "lineStart": 541,
      "lineEnd": 541
    },
    "unitSha256": "f96952718635af61ed1040bcc1ee96e6b57ad64d645c16c9c6d4c0c78e767521"
  },
  {
    "unitId": "2.6.1-021",
    "section": "2.6.1",
    "tableLabel": "無",
    "clausePath": [
      "(一)",
      "2."
    ],
    "unitType": "定義項",
    "verbatimText": "2.接受血管再通術(心導管介入治療或外科冠狀動脈繞道手術)。",
    "sourceAnchor": {
      "page": 10,
      "lineStart": 542,
      "lineEnd": 542
    },
    "unitSha256": "d94f9e5848fcd20bc8127baaa27971b6a001e60838f7e7c0616702c13967d88e"
  },
  {
    "unitId": "2.6.1-022",
    "section": "2.6.1",
    "tableLabel": "無",
    "clausePath": [
      "(一)",
      "3."
    ],
    "unitType": "定義項",
    "verbatimText": "3.缺血性中風/短暫性腦缺血發作合併動脈硬化相關疾病或病史。",
    "sourceAnchor": {
      "page": 10,
      "lineStart": 543,
      "lineEnd": 543
    },
    "unitSha256": "b47af40f85cb47405863672d3ca4f5db273004962158cb958ea07ba3d09ef224"
  },
  {
    "unitId": "2.6.1-023",
    "section": "2.6.1",
    "tableLabel": "無",
    "clausePath": [
      "(一)",
      "4."
    ],
    "unitType": "定義項",
    "verbatimText": "4.周邊動脈疾病(曾接受血管再通術、有肢體缺血相關症狀或截肢)。",
    "sourceAnchor": {
      "page": 10,
      "lineStart": 544,
      "lineEnd": 544
    },
    "unitSha256": "6c56a39a436d394f86b192e93d148bd4dcae22fb146299769579d037ba1aa15b"
  },
  {
    "unitId": "2.6.1-024",
    "section": "2.6.1",
    "tableLabel": "無",
    "clausePath": [
      "(二)"
    ],
    "unitType": "定義項",
    "verbatimText": "(二)經影像檢查確認有顯著斑塊負擔,定義為≧50%直徑狹窄率,包含:",
    "sourceAnchor": {
      "page": 10,
      "lineStart": 545,
      "lineEnd": 545
    },
    "unitSha256": "d98f190a045703f8a0e1b403bfe95689189174d5e95c75db48f377339d917690"
  },
  {
    "unitId": "2.6.1-025",
    "section": "2.6.1",
    "tableLabel": "無",
    "clausePath": [
      "(二)",
      "1."
    ],
    "unitType": "定義項",
    "verbatimText": "1.冠狀動脈血管攝影。",
    "sourceAnchor": {
      "page": 10,
      "lineStart": 546,
      "lineEnd": 546
    },
    "unitSha256": "217a0ac2ab6535a6808c9e0af9f86e8ebf22f0ec4f96c6743d92db5f7bb647db"
  },
  {
    "unitId": "2.6.1-026",
    "section": "2.6.1",
    "tableLabel": "無",
    "clausePath": [
      "(二)",
      "2."
    ],
    "unitType": "定義項",
    "verbatimText": "2.冠狀動脈或周邊血管電腦斷層攝影。",
    "sourceAnchor": {
      "page": 10,
      "lineStart": 547,
      "lineEnd": 547
    },
    "unitSha256": "98807346bf56b8a1af4336355f5c4aa3bdfd88b7b7ef5889b793121069b64b87"
  },
  {
    "unitId": "2.6.1-027",
    "section": "2.6.1",
    "tableLabel": "無",
    "clausePath": [
      "(二)",
      "3."
    ],
    "unitType": "定義項",
    "verbatimText": "3.頸動脈或周邊血管超音波。\n三、高風險:",
    "sourceAnchor": {
      "page": 10,
      "lineStart": 548,
      "lineEnd": 549
    },
    "unitSha256": "eddf78a1e790158ae2e8aa37dd06d419905a3be90a9b35c9e91c496bcbd3df43"
  },
  {
    "unitId": "2.6.1-028",
    "section": "2.6.1",
    "tableLabel": "無",
    "clausePath": [
      "(一)"
    ],
    "unitType": "定義項",
    "verbatimText": "(一)糖尿病。",
    "sourceAnchor": {
      "page": 10,
      "lineStart": 550,
      "lineEnd": 550
    },
    "unitSha256": "ab2074b5d3d726e5a8eda95d931a0f01b4fb750754e0c3061e2b19f8320f7eb3"
  },
  {
    "unitId": "2.6.1-029",
    "section": "2.6.1",
    "tableLabel": "無",
    "clausePath": [
      "(二)"
    ],
    "unitType": "定義項",
    "verbatimText": "(二)慢性腎臟病(進入透析治療前的慢性腎臟病,包括 UACR≧30mg/g or\n2\neGFR<60mL/min/1.73m 至少持續3個月)。",
    "sourceAnchor": {
      "page": 10,
      "lineStart": 551,
      "lineEnd": 553
    },
    "unitSha256": "ee2b1a4a6c45baae2c20769c3a7be883f7fcfc90e53ee8fd50796f0cbc617cd6"
  },
  {
    "unitId": "2.6.1-030",
    "section": "2.6.1",
    "tableLabel": "無",
    "clausePath": [
      "(三)"
    ],
    "unitType": "定義項",
    "verbatimText": "(三)LDL-C≧190mg/dL。",
    "sourceAnchor": {
      "page": 10,
      "lineStart": 554,
      "lineEnd": 554
    },
    "unitSha256": "76fcccac8c8e0f6fe42bb8681161a839c4d8843a79f7ff67df24cc188f8944c8"
  },
  {
    "unitId": "2.6.1-031",
    "section": "2.6.1",
    "tableLabel": "無",
    "clausePath": [
      "(四)"
    ],
    "unitType": "定義項",
    "verbatimText": "(四)冠狀動脈鈣化分數(CAC)≧400。\n四、中風險:2項(含)以上心血管風險因子。\n五、低風險:1項心血管風險因子。",
    "sourceAnchor": {
      "page": 10,
      "lineStart": 555,
      "lineEnd": 557
    },
    "unitSha256": "c1e4377af79ec0dfe2a429f6b9e76394adc35d250132c22a84d16d5c154b6aed"
  },
  {
    "unitId": "2.6.1-032",
    "section": "2.6.1",
    "tableLabel": "無",
    "clausePath": [],
    "unitType": "定義項",
    "verbatimText": "●心血管風險因子定義:\n一、高血壓。\n二、男性≧45歲,女性≧55歲。\n三、早發性冠心病家族史(男性≦55歲,女性≦65歲)。\n四、HDL-C:男性<40mg/dL,女性<50mg/dL。\n五、抽菸。\n六、代謝性症候群(符合以下至少三項):",
    "sourceAnchor": {
      "page": 10,
      "lineStart": 558,
      "lineEnd": 564
    },
    "unitSha256": "ead4c46989fcc78dafaa6a3ed34c61d0e39070dcfa06c44592006699b86e8cea"
  },
  {
    "unitId": "2.6.1-033",
    "section": "2.6.1",
    "tableLabel": "無",
    "clausePath": [
      "(一)"
    ],
    "unitType": "定義項",
    "verbatimText": "(一)腹部肥胖(男性≧90cm,女性≧80cm)。",
    "sourceAnchor": {
      "page": 11,
      "lineStart": 565,
      "lineEnd": 565
    },
    "unitSha256": "2ec3c807e7c22dc086d20a73eff118d6d4e4c2f43752a717ce91d3654b3a6e92"
  },
  {
    "unitId": "2.6.1-034",
    "section": "2.6.1",
    "tableLabel": "無",
    "clausePath": [
      "(二)"
    ],
    "unitType": "定義項",
    "verbatimText": "(二)血壓偏高(≧130/85mmHg 或使用高血壓藥物)。",
    "sourceAnchor": {
      "page": 11,
      "lineStart": 566,
      "lineEnd": 566
    },
    "unitSha256": "6a0757b5197d711f557013324428a9be38e47f7b1040155f8c5aa5aa6d044911"
  },
  {
    "unitId": "2.6.1-035",
    "section": "2.6.1",
    "tableLabel": "無",
    "clausePath": [
      "(三)"
    ],
    "unitType": "定義項",
    "verbatimText": "(三)空腹血糖偏高(≧100mg/dL 或使用糖尿病藥物)。",
    "sourceAnchor": {
      "page": 11,
      "lineStart": 567,
      "lineEnd": 567
    },
    "unitSha256": "01b39429ba075b840ebeda7e5c15928f9ee79df510f55801e83b4e79aa428110"
  },
  {
    "unitId": "2.6.1-036",
    "section": "2.6.1",
    "tableLabel": "無",
    "clausePath": [
      "(四)"
    ],
    "unitType": "定義項",
    "verbatimText": "(四)空腹 TG 偏高(≧150mg/dL 或使用治療 TG 血脂藥物)。",
    "sourceAnchor": {
      "page": 11,
      "lineStart": 568,
      "lineEnd": 568
    },
    "unitSha256": "e6e8db7c88ef08e81bc69b1962cf113ddf16cc2a352a2d3f0e6527b506d80ab6"
  },
  {
    "unitId": "2.6.1-037",
    "section": "2.6.1",
    "tableLabel": "無",
    "clausePath": [
      "(五)"
    ],
    "unitType": "定義項",
    "verbatimText": "(五)HDL-C 偏低(男性<40mg/dL,女性<50mg/dL)。\n●各風險等級評估建議:\n一、極高風險、非常高風險:",
    "sourceAnchor": {
      "page": 11,
      "lineStart": 569,
      "lineEnd": 571
    },
    "unitSha256": "11faf6f94d6af1c1ee6400583322fdce57f14dc3af78548c4b09c81c5c0d2c4f"
  },
  {
    "unitId": "2.6.1-038",
    "section": "2.6.1",
    "tableLabel": "無",
    "clausePath": [
      "(一)"
    ],
    "unitType": "定義項",
    "verbatimText": "(一)初始評估應檢測完整血脂指標,並應於急性病人入院後24小時內完成血脂\n檢驗。",
    "sourceAnchor": {
      "page": 11,
      "lineStart": 572,
      "lineEnd": 573
    },
    "unitSha256": "da742b3c71344fec61254c3819e57bf9c2e0de1ad2bb4627c3a73b3168c5e94a"
  },
  {
    "unitId": "2.6.1-039",
    "section": "2.6.1",
    "tableLabel": "無",
    "clausePath": [
      "(二)"
    ],
    "unitType": "定義項",
    "verbatimText": "(二)處置各項可改善心血管風險因子,包含:血壓、HbA1c、肥胖、抽菸、酒精\n攝取、生活型態。\n二、高風險、中風險、低風險:",
    "sourceAnchor": {
      "page": 11,
      "lineStart": 574,
      "lineEnd": 576
    },
    "unitSha256": "a5d6967efc771000741e0a34cec3e73736fedb876dfe2f8109efdd8721361a00"
  },
  {
    "unitId": "2.6.1-040",
    "section": "2.6.1",
    "tableLabel": "無",
    "clausePath": [
      "(一)"
    ],
    "unitType": "定義項",
    "verbatimText": "(一)給予完整血脂指標檢測,辨識各項可改善心血管風險因子,包含:血壓、\nHbA1c、肥胖、抽菸、酒精攝取、生活型態。",
    "sourceAnchor": {
      "page": 11,
      "lineStart": 577,
      "lineEnd": 578
    },
    "unitSha256": "919767386f19ef322860603a663bf0d594ae3443b95726851cafbad454dc23ad"
  },
  {
    "unitId": "2.6.1-041",
    "section": "2.6.1",
    "tableLabel": "無",
    "clausePath": [
      "(二)"
    ],
    "unitType": "定義項",
    "verbatimText": "(二)ASCVD 風險分級為高風險,當有嚴重高膽固醇血症、肌腱黃色瘤、早發心\n血管疾病或家族病史時,應依照台灣家族性高膽固醇血症診斷標準進行家\n族性膽固醇血症篩檢。",
    "sourceAnchor": {
      "page": 11,
      "lineStart": 579,
      "lineEnd": 581
    },
    "unitSha256": "3c3d2d245c2dbaba80eb164482da65c952b4262ca54726e9164e63eb7f794244"
  },
  {
    "unitId": "2.6.1-042",
    "section": "2.6.1",
    "tableLabel": "無",
    "clausePath": [
      "(三)"
    ],
    "unitType": "定義項",
    "verbatimText": "(三)若未符合上述高風險條件,應以列在低至中風險欄位的心血管風險因子數\n量作為風險評估。\n●當 LDL-C 達到理想治療目標後,非高密度脂蛋白-膽固醇(non-HDL-C)可作為血\n脂治療次要標的,其計算方式為總膽固醇數值減掉 HDL-C 數值,尤其適用於合\n併有高三酸甘油脂、糖尿病、或肥胖的病人以做進一步的心血管風險評估。",
    "sourceAnchor": {
      "page": 11,
      "lineStart": 582,
      "lineEnd": 586
    },
    "unitSha256": "f83372a9b34bc9d17c4fb8d61b04cef915439599d5cc67e0d1d8481bf1f7a3fb"
  },
  {
    "unitId": "2.6.1-043",
    "section": "2.6.1",
    "tableLabel": "表二",
    "clausePath": [],
    "unitType": "表題",
    "verbatimText": "全民健康保險降膽固醇藥物給付規定表二:\n(86/1/1、\n87/4/1、87/7/1、91/9/1、93/9/1、97/7/1、102/8/1、\n108/2/1、115/9/1)\n(以下略)",
    "sourceAnchor": {
      "page": 11,
      "lineStart": 587,
      "lineEnd": 591
    },
    "unitSha256": "4b9b8e55e2f372bd8da0bf110fd0ed23bc1ef812433bda083592fb4347b6450c"
  },
  {
    "unitId": "2.6.2-001",
    "section": "2.6.2",
    "tableLabel": "無",
    "clausePath": [],
    "unitType": "條文",
    "verbatimText": "2.6.2.Ezetimibe:(94/6/1、\n115/9/1)\n限用於原發性高膽固醇血症、同型接\n合子家族性高膽固醇血症、同型接合\n子性麥脂醇血症(植物脂醇血症)患\n者,並符合下列條件之一者:",
    "sourceAnchor": {
      "page": 12,
      "lineStart": 1,
      "lineEnd": 6
    },
    "unitSha256": "8d4334fac6b62e787f0ba30ac1da18fdee2838912ffb3881deafa34390ec5da9"
  },
  {
    "unitId": "2.6.2-002",
    "section": "2.6.2",
    "tableLabel": "無",
    "clausePath": [
      "1."
    ],
    "unitType": "條文",
    "verbatimText": "1.對 statins 類藥品發生無法耐受藥\n物不良反應(如 Severe\nmyalgia、Myositis)者。\n(94/6/1、115/9/1)",
    "sourceAnchor": {
      "page": 12,
      "lineStart": 7,
      "lineEnd": 10
    },
    "unitSha256": "5663d19e621b152efada7bfa78af29b7ecdefde863bd2498157a9a102bde99c8"
  },
  {
    "unitId": "2.6.2-003",
    "section": "2.6.2",
    "tableLabel": "無",
    "clausePath": [
      "2."
    ],
    "unitType": "條文",
    "verbatimText": "2.經使用 statins 類藥品單一治療6-\n8週未達治療目標者,得合併使用\n本類藥品與 statins 類藥品。但下\n表所列項目,需經使用 statins 類\n藥品單一治療3個月未達治療目標\n者,始得與 statins 類藥品併用。",
    "sourceAnchor": {
      "page": 12,
      "lineStart": 11,
      "lineEnd": 16
    },
    "unitSha256": "23160e6b68355227753ffd673e1ad09ba43428fbff142ba358e0cfc75183187e"
  },
  {
    "unitId": "2.6.2-004",
    "section": "2.6.2",
    "tableLabel": "無",
    "clausePath": [
      "2."
    ],
    "unitType": "表題",
    "verbatimText": "(115/9/1)\n健保代碼\n藥品名稱",
    "sourceAnchor": {
      "page": 12,
      "lineStart": 17,
      "lineEnd": 19
    },
    "unitSha256": "cf700dbf772762fd39b7f50fe0a2d60a6902fcf6b75ac42b2d5f4db462c93529"
  },
  {
    "unitId": "2.6.2-005",
    "section": "2.6.2",
    "tableLabel": "無",
    "clausePath": [
      "2."
    ],
    "unitType": "資料列",
    "verbatimText": "AC60610100\nEzetity tablets 10mg\nEzzicad (ezetimibe) 10mg",
    "sourceAnchor": {
      "page": 12,
      "lineStart": 20,
      "lineEnd": 22
    },
    "unitSha256": "82b71f4f7bafa3d9ef2dc5a599d085a6b23637c8a0330fdd7e54ed3368c1e37b",
    "rowIndex": 1,
    "columnLabels": [
      "健保代碼",
      "藥品名稱"
    ]
  },
  {
    "unitId": "2.6.2-006",
    "section": "2.6.2",
    "tableLabel": "無",
    "clausePath": [
      "2."
    ],
    "unitType": "資料列",
    "verbatimText": "BC27311100\nTablets\nEzta 10 (ezetimibe Tablets",
    "sourceAnchor": {
      "page": 12,
      "lineStart": 23,
      "lineEnd": 25
    },
    "unitSha256": "4ca5f48b3e489417530a9878ea42a122e692ecee97a84e5815322d9924e8a782",
    "rowIndex": 2,
    "columnLabels": [
      "健保代碼",
      "藥品名稱"
    ]
  },
  {
    "unitId": "2.6.2-007",
    "section": "2.6.2",
    "tableLabel": "無",
    "clausePath": [
      "2."
    ],
    "unitType": "資料列",
    "verbatimText": "BC28252100\n10mg)\nEzetimibe Sandoz 10mg",
    "sourceAnchor": {
      "page": 12,
      "lineStart": 26,
      "lineEnd": 28
    },
    "unitSha256": "fe51b30db0988cfe30247235484991eb8f334848302fca1298e6a7f5b4853239",
    "rowIndex": 3,
    "columnLabels": [
      "健保代碼",
      "藥品名稱"
    ]
  },
  {
    "unitId": "2.6.2-008",
    "section": "2.6.2",
    "tableLabel": "無",
    "clausePath": [
      "2."
    ],
    "unitType": "資料列",
    "verbatimText": "BC26552100\ntablets",
    "sourceAnchor": {
      "page": 12,
      "lineStart": 29,
      "lineEnd": 30
    },
    "unitSha256": "2e082becae6f1fe00ba253c5442525a4d0feaefcadb68a15612a35b80ebd1365",
    "rowIndex": 4,
    "columnLabels": [
      "健保代碼",
      "藥品名稱"
    ]
  },
  {
    "unitId": "2.6.3-001",
    "section": "2.6.3",
    "tableLabel": "無",
    "clausePath": [],
    "unitType": "條文",
    "verbatimText": "2.6.3.含 ezetimibe 及 statin 類之複\n方製劑:(95/12/1、106/8/1、\n111/11/1、112/12/1、115/9/1):",
    "sourceAnchor": {
      "page": 12,
      "lineStart": 1,
      "lineEnd": 3
    },
    "unitSha256": "9f43865d3dbfca140a8783b46a490f8a746f12504075fd68e6b8fc299f0728b8"
  },
  {
    "unitId": "2.6.3-002",
    "section": "2.6.3",
    "tableLabel": "無",
    "clausePath": [
      "1."
    ],
    "unitType": "條文",
    "verbatimText": "1.限用於原發性高膽固醇血症、同型\n接合子家族性高膽固醇血症(HOFH)\n病患。(106/8/1、115/9/1)",
    "sourceAnchor": {
      "page": 12,
      "lineStart": 4,
      "lineEnd": 6
    },
    "unitSha256": "e23fdfd78cd64bb177f460d33a28222365cf2791671be651a26e9ab282cb979d"
  },
  {
    "unitId": "2.6.3-003",
    "section": "2.6.3",
    "tableLabel": "無",
    "clausePath": [
      "2."
    ],
    "unitType": "條文",
    "verbatimText": "2.經使用 statin 類藥品單一治療6-8\n週未達治療目標者,得使用本類藥\n品。但下表所列項目,需經使用\nstatin 類藥品單一治療3個月未達\n治療目標者,始得使用。",
    "sourceAnchor": {
      "page": 13,
      "lineStart": 7,
      "lineEnd": 11
    },
    "unitSha256": "4ac0b5b9a34cfd1b7cbfb0fa6bf99da9301da192a1fe8324a79cfac503d287c4"
  },
  {
    "unitId": "2.6.3-004",
    "section": "2.6.3",
    "tableLabel": "無",
    "clausePath": [
      "2."
    ],
    "unitType": "表題",
    "verbatimText": "(115/9/1)\n健保代碼\n藥品名稱",
    "sourceAnchor": {
      "page": 13,
      "lineStart": 12,
      "lineEnd": 14
    },
    "unitSha256": "cf700dbf772762fd39b7f50fe0a2d60a6902fcf6b75ac42b2d5f4db462c93529"
  },
  {
    "unitId": "2.6.3-005",
    "section": "2.6.3",
    "tableLabel": "無",
    "clausePath": [
      "2."
    ],
    "unitType": "資料列",
    "verbatimText": "AC59251100\nAgitin tablets 10/20mg",
    "sourceAnchor": {
      "page": 13,
      "lineStart": 15,
      "lineEnd": 16
    },
    "unitSha256": "ccf9e29b4290a6b4d7ce1a18205400858fe91d507dfc93d3f2c0dc71d0614c7a",
    "rowIndex": 1,
    "columnLabels": [
      "健保代碼",
      "藥品名稱"
    ]
  },
  {
    "unitId": "2.6.3-006",
    "section": "2.6.3",
    "tableLabel": "無",
    "clausePath": [
      "2."
    ],
    "unitType": "資料列",
    "verbatimText": "AC60402100\nSacure tablets 10/20mg\nEzta-SM 10+20 (ezetimibe",
    "sourceAnchor": {
      "page": 13,
      "lineStart": 17,
      "lineEnd": 19
    },
    "unitSha256": "a67468fcfeccb54cdfef48054eefcd930692dfb4359a0ac493330808c894546a",
    "rowIndex": 2,
    "columnLabels": [
      "健保代碼",
      "藥品名稱"
    ]
  },
  {
    "unitId": "2.6.3-007",
    "section": "2.6.3",
    "tableLabel": "無",
    "clausePath": [
      "2."
    ],
    "unitType": "資料列",
    "verbatimText": "BC28502100\nand simvastatin tablets\n10mg/20mg)",
    "sourceAnchor": {
      "page": 13,
      "lineStart": 20,
      "lineEnd": 22
    },
    "unitSha256": "49bee6adaa5a4b199cb1ed8ad6c1940a15a22654852e5f669023f54d1237f4f5",
    "rowIndex": 3,
    "columnLabels": [
      "健保代碼",
      "藥品名稱"
    ]
  },
  {
    "unitId": "2.6.3-008",
    "section": "2.6.3",
    "tableLabel": "無",
    "clausePath": [
      "2."
    ],
    "unitType": "資料列",
    "verbatimText": "AC62052100\nZoliton tablets 10/20mg",
    "sourceAnchor": {
      "page": 13,
      "lineStart": 23,
      "lineEnd": 24
    },
    "unitSha256": "c18e569bf4c0b3e8cfd8d4cd2d2aadf72f16f265cdc43088129adabd96d3593a",
    "rowIndex": 4,
    "columnLabels": [
      "健保代碼",
      "藥品名稱"
    ]
  },
  {
    "unitId": "2.6.3-009",
    "section": "2.6.3",
    "tableLabel": "無",
    "clausePath": [
      "2."
    ],
    "unitType": "資料列",
    "verbatimText": "AC62053100\nZoliton tablets 10/10mg",
    "sourceAnchor": {
      "page": 13,
      "lineStart": 25,
      "lineEnd": 26
    },
    "unitSha256": "7dcaed20d8cb10414b9774f28623c61180ff3d8049103d7cf19d39d1d5cad4a7",
    "rowIndex": 5,
    "columnLabels": [
      "健保代碼",
      "藥品名稱"
    ]
  },
  {
    "unitId": "2.6.3-010",
    "section": "2.6.3",
    "tableLabel": "無",
    "clausePath": [
      "2."
    ],
    "unitType": "資料列",
    "verbatimText": "AC62140100\nZovastin tablets 10/10mg",
    "sourceAnchor": {
      "page": 13,
      "lineStart": 27,
      "lineEnd": 28
    },
    "unitSha256": "81b01c006ed2058566faa54e4074f6ac4ca194b5f8b9ff958e6c35b3d401fd5b",
    "rowIndex": 6,
    "columnLabels": [
      "健保代碼",
      "藥品名稱"
    ]
  },
  {
    "unitId": "2.6.3-011",
    "section": "2.6.3",
    "tableLabel": "無",
    "clausePath": [
      "2."
    ],
    "unitType": "資料列",
    "verbatimText": "AC62139100\nZovastin tablets 10/20mg",
    "sourceAnchor": {
      "page": 13,
      "lineStart": 29,
      "lineEnd": 30
    },
    "unitSha256": "c5b9bdbb4e1742c1f7eba1b2f3b006a84593122e8a182cab5f98042053e348c0",
    "rowIndex": 7,
    "columnLabels": [
      "健保代碼",
      "藥品名稱"
    ]
  },
  {
    "unitId": "2.6.3-012",
    "section": "2.6.3",
    "tableLabel": "無",
    "clausePath": [
      "2."
    ],
    "unitType": "資料列",
    "verbatimText": "BC28181100\nCretrol Tab. 10/10 mg",
    "sourceAnchor": {
      "page": 13,
      "lineStart": 31,
      "lineEnd": 32
    },
    "unitSha256": "1d96808190e734d969f6cbbf1697f1fe9088cd364e02a031dfa56818bddd2c5e",
    "rowIndex": 8,
    "columnLabels": [
      "健保代碼",
      "藥品名稱"
    ]
  },
  {
    "unitId": "2.6.3-013",
    "section": "2.6.3",
    "tableLabel": "無",
    "clausePath": [
      "2."
    ],
    "unitType": "資料列",
    "verbatimText": "BC28182100\nCretrol Tab. 10/20 mg\nLivazebe combination tablets",
    "sourceAnchor": {
      "page": 13,
      "lineStart": 33,
      "lineEnd": 35
    },
    "unitSha256": "4f7cc2222d03760b68a0c365383770c13ffa5c0ee12a6b349ec7418b065c4fb1",
    "rowIndex": 9,
    "columnLabels": [
      "健保代碼",
      "藥品名稱"
    ]
  },
  {
    "unitId": "2.6.3-014",
    "section": "2.6.3",
    "tableLabel": "無",
    "clausePath": [
      "2."
    ],
    "unitType": "資料列",
    "verbatimText": "BC28884100\nHD (for 4mg)",
    "sourceAnchor": {
      "page": 13,
      "lineStart": 36,
      "lineEnd": 37
    },
    "unitSha256": "262cbf1007d6a0b4d2e15e36f21c8afbe164b7c58b73b5e599db2b47c8578ca4",
    "rowIndex": 10,
    "columnLabels": [
      "健保代碼",
      "藥品名稱"
    ]
  },
  {
    "unitId": "2.6.3-015",
    "section": "2.6.3",
    "tableLabel": "無",
    "clausePath": [
      "3."
    ],
    "unitType": "條文",
    "verbatimText": "3.本品不得與 gemfibrozil 併用。\n(106/8/1)",
    "sourceAnchor": {
      "page": 13,
      "lineStart": 38,
      "lineEnd": 39
    },
    "unitSha256": "035879fa62bdac2137d75204075d09e27c9e4ff5ac65449b890dd6f342c9024c"
  },
  {
    "unitId": "2.6.3-016",
    "section": "2.6.3",
    "tableLabel": "無",
    "clausePath": [
      "3."
    ],
    "unitType": "註",
    "verbatimText": "備註:劃線部分為新修訂規定",
    "sourceAnchor": {
      "page": 13,
      "lineStart": 40,
      "lineEnd": 40
    },
    "unitSha256": "0e050b27f1f290f825b66cbc002a45e73f20020182413ada574b9c1390386dfd"
  }
];

function deepFreeze<T>(value: T): T {
  if (typeof value === "object" && value !== null && !Object.isFrozen(value)) {
    for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

export const RULE_TEXT_UNITS: readonly RuleTextUnit[] = deepFreeze(generatedRuleTextUnits);
