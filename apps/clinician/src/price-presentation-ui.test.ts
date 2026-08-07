import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  ITEM_RECORDS,
  getDrugItemAnnouncementMembership,
  lookupDrugItemMaster
} from "@nhi-cv/domain";
import { describe, expect, it } from "vitest";
import {
  DRUG_ITEM_MASTER_SNAPSHOT_DATE,
  getClinicianLayoutMode,
  resolveAnnouncementPriceComparison,
  shouldShowMasterSnapshotNotice
} from "./drug-item-ui";

const sourceDirectory = path.dirname(fileURLToPath(import.meta.url));
const appSource = readFileSync(path.resolve(sourceDirectory, "../App.tsx"), "utf8");
const helperSource = readFileSync(path.resolve(sourceDirectory, "./drug-item-ui.ts"), "utf8");
const changedAnnouncementItem = ITEM_RECORDS.find(
  (item) =>
    getDrugItemAnnouncementMembership(item.nhiCode).changed &&
    item.priceBefore !== undefined &&
    item.priceBefore.length > 0 &&
    item.priceAfter !== undefined &&
    item.priceAfter.length > 0
)!;
const changedCode = changedAnnouncementItem.nhiCode;
const unchangedAnnouncementItem = ITEM_RECORDS.find(
  (item) => !getDrugItemAnnouncementMembership(item.nhiCode).changed
)!;

describe("announcement-only price comparison presentation", () => {
  it("copies all four comparison values from each changed announcement row", () => {
    const changedItems = ITEM_RECORDS.filter(
      (item) => getDrugItemAnnouncementMembership(item.nhiCode).changed
    );
    expect(changedItems).toHaveLength(57);

    for (const item of changedItems) {
      const comparison = resolveAnnouncementPriceComparison(item.nhiCode);
      expect(comparison).toEqual({
        priceBefore: item.priceBefore,
        priceAfter: item.priceAfter,
        effectiveDate: item.effectiveDate,
        coverageRule: item.coverageRule
      });
      expect(Object.isFrozen(comparison)).toBe(true);
    }
  });

  it("does not create a comparison for a code outside the announcement change set", () => {
    expect(getDrugItemAnnouncementMembership(unchangedAnnouncementItem.nhiCode).changed).toBe(
      false
    );
    expect(resolveAnnouncementPriceComparison(unchangedAnnouncementItem.nhiCode)).toBeUndefined();
    expect(appSource).toContain("{comparison !== undefined ? (");
  });

  it("never pairs a master applicable price with the announcement priceAfter", () => {
    const masterResult = lookupDrugItemMaster({
      query: changedCode,
      as_of_date: "2026-09-02"
    });
    const masterMatch = masterResult.matches[0]!;
    expect(masterMatch.applicablePricePeriod.paymentPriceRaw).toBe("2.93");
    expect(changedAnnouncementItem.priceBefore).toBe("2.93");
    const masterOnlySentinel = "MASTER-PRICE-MUST-NOT-ENTER-COMPARISON";
    const forgedMasterMatch = Object.freeze({
      ...masterMatch,
      applicablePricePeriod: Object.freeze({
        ...masterMatch.applicablePricePeriod,
        paymentPriceRaw: masterOnlySentinel
      })
    });
    const comparison = resolveAnnouncementPriceComparison(forgedMasterMatch.item.nhiCode)!;

    expect(comparison.priceBefore).toBe(changedAnnouncementItem.priceBefore);
    expect(comparison.priceAfter).toBe(changedAnnouncementItem.priceAfter);
    expect(Object.values(comparison)).not.toContain(masterOnlySentinel);
    expect(Object.keys(comparison)).not.toContain("paymentPriceRaw");
    expect(helperSource).not.toContain("paymentPriceRaw");
  });

  it("renders a prominent, separately versioned announcement block before master details", () => {
    const cardStart = appSource.indexOf("function DrugItemMasterCard");
    const cardEnd = appSource.indexOf("function DrugItemMasterLookupMode");
    const cardSource = appSource.slice(cardStart, cardEnd);
    expect(cardSource.indexOf("<AnnouncementItemSourceBlock")).toBeLessThan(
      cardSource.indexOf('<View style={styles.masterDetailsGrid}>')
    );
    expect(appSource).toContain("原支付價 {priceBefore} → 初核價格 {priceAfter}");
    expect(appSource).toContain("給付規定章節：{value}");
    expect(appSource).toContain("{result.warning}");
  });
});

describe("master snapshot notice", () => {
  it("implements the complete date-by-membership condition matrix", () => {
    expect(shouldShowMasterSnapshotNotice("2026-09-01", changedCode)).toBe(true);
    expect(shouldShowMasterSnapshotNotice("2026-08-31", changedCode)).toBe(false);
    expect(
      shouldShowMasterSnapshotNotice("2026-09-01", unchangedAnnouncementItem.nhiCode)
    ).toBe(false);
    expect(
      shouldShowMasterSnapshotNotice("2026-08-31", unchangedAnnouncementItem.nhiCode)
    ).toBe(false);
  });

  it("states the snapshot facts and latest period without changing the applicable price", () => {
    const masterResult = lookupDrugItemMaster({
      query: changedCode,
      as_of_date: "2026-09-02"
    });
    const match = masterResult.matches[0]!;
    const latestPeriod = match.item.priceHistory[match.item.priceHistory.length - 1]!;

    expect(DRUG_ITEM_MASTER_SNAPSHOT_DATE).toBe("2026-08-06");
    expect(match.applicablePricePeriod.paymentPriceRaw).toBe("2.93");
    expect(latestPeriod.startDateIso).toBe("2024-04-01");
    expect(latestPeriod.endDateIso).toBe("9999-12-31");
    expect(appSource).toContain("latestPricePeriod.startDateIso");
    expect(appSource).toContain("latestPricePeriod.endDateIso");
    expect(appSource).toContain(
      "protectedText(language, applicablePricePeriod.paymentPriceRaw)"
    );
  });

  it("keeps the authored notice copy factual and clear of the bilingual blacklist", () => {
    const noticeCopies = [...appSource.matchAll(/masterSnapshotNotice:\s*\n\s*"([^"]+)"/gu)].map(
      (match) => match[1]!
    );
    expect(noticeCopies).toHaveLength(2);
    expect(noticeCopies[0]).toContain("{version}");
    expect(noticeCopies[0]).toContain("{snapshotDate}");
    expect(noticeCopies[0]).toContain("{start}");
    expect(noticeCopies[0]).toContain("{end}");
    expect(noticeCopies[0]).toContain("{effectiveDate}");

    const authoredNoticeCopy = noticeCopies.join("\n").toLocaleLowerCase("en-US");
    for (const prohibited of [
      "\u6b63\u78ba",
      "\u73fe\u884c",
      "\u61c9\u9069\u7528",
      "\u7b26\u5408\u7d66\u4ed8",
      "\u4e0d\u7b26\u5408\u7d66\u4ed8",
      "\u53ef\u7533\u5831",
      "\u51c6\u4e88\u7d66\u4ed8",
      "\u4e0d\u4e88\u7d66\u4ed8",
      "eligible",
      "covered",
      "reimbursable",
      "qualifies",
      "correct",
      "current",
      "should apply"
    ]) {
      expect(authoredNoticeCopy).not.toContain(prohibited);
    }
  });
});

describe("independent collapsed price histories", () => {
  it("defaults each card to collapsed and exposes an accessible bilingual count control", () => {
    const cardStart = appSource.indexOf("function DrugItemMasterCard");
    const cardEnd = appSource.indexOf("function DrugItemMasterLookupMode");
    const cardSource = appSource.slice(cardStart, cardEnd);

    expect(cardSource).toContain(
      "const [priceHistoryExpanded, setPriceHistoryExpanded] = useState(false)"
    );
    expect(cardSource).toContain('accessibilityRole="button"');
    expect(cardSource).toContain(
      "accessibilityState={{ expanded: priceHistoryExpanded }}"
    );
    expect(cardSource).toContain("String(item.priceHistory.length)");
    expect(cardSource).not.toContain("preferenceStorage");
    expect(cardSource).not.toContain("localStorage");
    expect(appSource).toContain("展開價格沿革（{count} 筆，目前已收合）");
    expect(appSource).toContain("收合價格沿革（{count} 筆，目前已展開）");
    expect(appSource).toContain("Expand price history ({count} entries, currently collapsed)");
    expect(appSource).toContain("Collapse price history ({count} entries, currently expanded)");
  });

  it("reveals the unchanged source rows while leaving the applicable price always visible", () => {
    const cardStart = appSource.indexOf("function DrugItemMasterCard");
    const cardEnd = appSource.indexOf("function DrugItemMasterLookupMode");
    const cardSource = appSource.slice(cardStart, cardEnd);
    const conditionalStart = cardSource.indexOf("{priceHistoryExpanded ? (");

    expect(conditionalStart).toBeGreaterThan(0);
    expect(cardSource.indexOf("applicablePricePeriod.paymentPriceRaw")).toBeLessThan(
      conditionalStart
    );
    expect(cardSource.slice(conditionalStart)).toContain("item.priceHistory.map((period)");
    expect(cardSource.slice(conditionalStart)).toContain("period.startDateIso");
    expect(cardSource.slice(conditionalStart)).toContain("period.endDateIso");
    expect(cardSource.slice(conditionalStart)).toContain("period.paymentPriceRaw");
  });

  it("keeps multi-result cards on the existing mobile breakpoint and preserves raw zero prices", () => {
    const result = lookupDrugItemMaster({
      query: "SIMVASTATIN 20 MG",
      as_of_date: "2026-09-02"
    });
    expect(result.status).toBe("MULTIPLE_MATCHES");
    expect(result.matches).toHaveLength(42);
    expect(getClinicianLayoutMode(767)).toBe("mobile");
    expect(appSource).toContain('flexWrap: "wrap"');

    const zeroPeriod = result.matches
      .flatMap((match) => match.item.priceHistory)
      .find((period) => period.paymentPriceRaw === "0.00");
    expect(zeroPeriod?.paymentPriceRaw).toBe("0.00");
    expect(appSource).toContain("protectedText(language, period.paymentPriceRaw)");
  });
});
