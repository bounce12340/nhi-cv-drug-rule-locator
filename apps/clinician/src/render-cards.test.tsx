import {
  DRUG_ITEM_MASTER_WARNING,
  getDrugItemDoses,
  lookupDrugItemMaster
} from "@nhi-cv/domain";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DrugItemCard, OfficialSourcesDisclosure, UiProvider } from "../App";

/**
 * Renders each block against real dataset records and asserts on the markup the
 * clinician gets. These replace source greps: a restyle should not break them, and
 * a change that actually alters what the screen claims should.
 */
function render(node: React.ReactNode, language: "zh" | "en" = "zh"): string {
  return renderToStaticMarkup(<UiProvider language={language}>{node}</UiProvider>);
}

const repricedCode = "AC47928100";
const repricedMatch = lookupDrugItemMaster({
  query: repricedCode,
  as_of_date: "2026-09-01"
}).matches[0]!;

describe("drug item card", () => {
  const markup = render(
    <DrugItemCard lookupAsOfDate="2026-09-01" match={repricedMatch} />
  );

  it("shows the code, both names and the applicable price", () => {
    expect(markup).toContain(repricedCode);
    expect(markup).toContain(repricedMatch.item.drugNameEn);
    expect(markup).toContain(repricedMatch.applicablePricePeriod.paymentPriceRaw);
  });

  it("shows the announcement before/after prices, not the master price twice", () => {
    // The master snapshot predates the announcement, so its applicable price is the
    // announcement's priceBefore. Rendering that as the new price would be a lie.
    expect(markup).toContain("原支付價");
    expect(markup).toContain("初核價格");
  });

  it("carries no per-card copy of the whole-screen disclaimer", () => {
    expect(markup).not.toContain("不可作為申報依據");
  });

  it("labels every dose the master states for the item", () => {
    const doses = getDrugItemDoses(repricedMatch.item);
    expect(doses.length).toBeGreaterThan(0);
    for (const dose of doses) expect(markup).toContain(dose.label);
  });

  it("keeps the complete price history behind a disclosure, not inline", () => {
    expect(markup).toContain("<details");
    expect(markup).toContain("價格沿革");
    for (const period of repricedMatch.item.priceHistory) {
      expect(markup).toContain(period.paymentPriceRaw);
    }
  });
});

describe("official warnings", () => {
  it("renders each dataset's transcription warning unaltered, once", () => {
    const markup = render(
      <OfficialSourcesDisclosure
        entries={[
          {
            labelKey: "sourceMasterLabel",
            version: "nhi-drug-items-2026-08-07-r2",
            warning: DRUG_ITEM_MASTER_WARNING
          }
        ]}
      />
    );
    expect(markup).toContain(DRUG_ITEM_MASTER_WARNING);
    expect(markup.split(DRUG_ITEM_MASTER_WARNING).length - 1).toBe(1);
  });
});
