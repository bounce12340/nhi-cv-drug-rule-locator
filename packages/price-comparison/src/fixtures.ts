import type { PriceComparisonCandidate } from "./index";

const directlyComparableKey = {
  ingredientComposition: ["DEMO_INGREDIENT_ALPHA"],
  strength: "DEMO_STRENGTH_20",
  dosageForm: "DEMO_TABLET_FORM",
  route: "DEMO_ORAL_ROUTE",
  releaseForm: "DEMO_IMMEDIATE_RELEASE",
  combinationRatio: "DEMO_SINGLE_INGREDIENT",
  paymentUnit: "DEMO_UNIT_ONE_TABLET",
  packageQuantity: 30
} as const;

export const DEMO_PRICE_CANDIDATES = deepFreeze([
  {
    candidateId: "DEMO-PRICE-CANDIDATE-ALPHA",
    displayName: "CardioDemo Price Alpha",
    sourceTag: "DEMO_DATA_ONLY",
    comparabilityKey: directlyComparableKey,
    prices: [
      {
        amountNtd: 11.11,
        effectiveFrom: "2099-01-01",
        effectiveTo: "2099-06-30"
      },
      {
        amountNtd: 12.12,
        effectiveFrom: "2099-07-01",
        effectiveTo: "2099-12-31"
      }
    ]
  },
  {
    candidateId: "DEMO-PRICE-CANDIDATE-BETA",
    displayName: "CardioDemo Price Beta",
    sourceTag: "DEMO_DATA_ONLY",
    comparabilityKey: directlyComparableKey,
    prices: [
      {
        amountNtd: 22.22,
        effectiveFrom: "2099-01-01",
        effectiveTo: "2099-12-31"
      }
    ]
  },
  {
    candidateId: "DEMO-PRICE-CANDIDATE-PACK",
    displayName: "CardioDemo Context Pack",
    sourceTag: "DEMO_DATA_ONLY",
    comparabilityKey: {
      ...directlyComparableKey,
      packageQuantity: 60
    },
    prices: [
      {
        amountNtd: 33.33,
        effectiveFrom: "2099-01-01",
        effectiveTo: "2099-12-31"
      }
    ]
  },
  {
    candidateId: "DEMO-PRICE-CANDIDATE-ROUTE",
    displayName: "CardioDemo Different Route",
    sourceTag: "DEMO_DATA_ONLY",
    comparabilityKey: {
      ...directlyComparableKey,
      route: "DEMO_NON_ORAL_ROUTE"
    },
    prices: [
      {
        amountNtd: 44.44,
        effectiveFrom: "2099-01-01",
        effectiveTo: "2099-12-31"
      }
    ]
  },
  {
    candidateId: "DEMO-PRICE-CANDIDATE-INCOMPLETE",
    displayName: "CardioDemo Incomplete Attribute",
    sourceTag: "DEMO_DATA_ONLY",
    comparabilityKey: {
      ...directlyComparableKey,
      releaseForm: null
    },
    prices: [
      {
        amountNtd: 55.55,
        effectiveFrom: "2099-01-01",
        effectiveTo: "2099-12-31"
      }
    ]
  },
  {
    candidateId: "DEMO-PRICE-CANDIDATE-FUTURE",
    displayName: "CardioDemo Future Effective",
    sourceTag: "DEMO_DATA_ONLY",
    comparabilityKey: directlyComparableKey,
    prices: [
      {
        amountNtd: 66.66,
        effectiveFrom: "2099-07-01",
        effectiveTo: "2099-12-31"
      }
    ]
  },
  {
    candidateId: "DEMO-PRICE-CANDIDATE-MISSING",
    displayName: "CardioDemo Missing Amount",
    sourceTag: "DEMO_DATA_ONLY",
    comparabilityKey: directlyComparableKey,
    prices: []
  },
  {
    candidateId: "DEMO-PRICE-CANDIDATE-STALE",
    displayName: "CardioDemo Expired Entry",
    sourceTag: "DEMO_DATA_ONLY",
    comparabilityKey: directlyComparableKey,
    prices: [
      {
        amountNtd: 77.77,
        effectiveFrom: "2099-01-01",
        effectiveTo: "2099-05-31"
      }
    ]
  },
  {
    candidateId: "DEMO-PRICE-CANDIDATE-CONFLICT",
    displayName: "CardioDemo Overlap Entry",
    sourceTag: "DEMO_DATA_ONLY",
    comparabilityKey: directlyComparableKey,
    prices: [
      {
        amountNtd: 88.88,
        effectiveFrom: "2099-01-01",
        effectiveTo: "2099-08-31"
      },
      {
        amountNtd: 99.99,
        effectiveFrom: "2099-06-01",
        effectiveTo: "2099-12-31"
      }
    ]
  }
] satisfies readonly PriceComparisonCandidate[]);

function deepFreeze<T>(value: T): Readonly<T> {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}
