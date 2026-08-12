import {
  DRUG_ITEM_MASTER_WARNING,
  compareRuleSectionVersions,
  identifyRuleDrugMasterRecords,
  getDrugItemDoses,
  lookupDrugItemMaster,
  lookupRuleText
} from "@nhi-cv/domain";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  DrugItemCard,
  OfficialSourcesDisclosure,
  RuleComparisonBlock,
  RuleDrugMasterBlock,
  RuleSectionNode,
  RuleUnitNode,
  UiProvider
} from "../App";
import { groupRuleTextUnitsBySection } from "./rule-text-tree";

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
    <DrugItemCard lookupAsOfDate="2026-09-01" match={repricedMatch} onOpenRuleText={() => undefined} />
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

describe("rule verbatim text", () => {
  const unit = lookupRuleText({ query: "2.6.1-001", as_of_date: "2026-09-01" }).units[0]!;

  it("renders the unit's text byte-identically, with nothing trimmed", () => {
    const markup = render(<RuleUnitNode unit={unit} />);
    // HTML-escape the few characters React escapes, then require the whole string.
    const escaped = unit.verbatimText
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
    expect(markup).toContain(escaped);
    expect(unit.verbatimText).toHaveLength(5266);
  });

  it("keeps the unit collapsed by default so the tree stays readable", () => {
    const markup = render(<RuleUnitNode unit={unit} />);
    expect(markup).toContain("<details");
    expect(markup).not.toContain("<details open");
  });

  it("shows only structural metadata in the collapsed heading", () => {
    const markup = render(<RuleUnitNode unit={unit} />);
    const summary = markup.slice(markup.indexOf("<summary"), markup.indexOf("</summary>"));
    expect(summary).toContain("2.6.1-001");
    expect(summary).not.toContain("AC46402100");
  });

  it("groups a section's units without reordering them", () => {
    const groups = groupRuleTextUnitsBySection(
      lookupRuleText({ query: "2.6.2", as_of_date: "2026-09-01" }).units
    );
    const markup = render(
      <RuleSectionNode section={groups[0]!.section} units={groups[0]!.units} />
    );
    const positions = groups[0]!.units.map((each) => markup.indexOf(each.unitId));
    expect(positions.every((position) => position >= 0)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
  });
});

describe("rule drug master identification", () => {
  const units = lookupRuleText({ query: "2.6.1", as_of_date: "2026-09-01" }).units;

  it("resolves all 116 codes and renders a card for each", () => {
    const identifications = identifyRuleDrugMasterRecords(units.map((unit) => unit.verbatimText));
    expect(identifications).toHaveLength(116);
    expect(identifications.every(({ masterItem }) => masterItem !== undefined)).toBe(true);

    const markup = render(<RuleDrugMasterBlock units={units} />);
    for (const { nhiCode } of identifications) expect(markup).toContain(nhiCode);
  });

  it("reads names from the master, never from the rule text's own name column", () => {
    const markup = render(<RuleDrugMasterBlock units={units} />);
    const first = identifyRuleDrugMasterRecords(units.map((unit) => unit.verbatimText))[0]!;
    expect(markup).toContain(first.masterItem!.drugNameEn);
  });

  it("stays collapsed so the 116 records do not bury the rest of the screen", () => {
    const markup = render(<RuleDrugMasterBlock units={units} />);
    expect(markup).toContain("<details");
    expect(markup).not.toContain("<details open");
  });
});

describe("rule version comparison", () => {
  const markup = render(<RuleComparisonBlock section="2.6.1" />);
  const comparison = compareRuleSectionVersions("2.6.1")!;

  it("names the excluded drug listing, its size and its code count", () => {
    expect(markup).toContain("2.6.1-001");
    expect(markup).toContain("5097");
    expect(markup).toContain("116");
  });

  it("keeps every drug code out of the comparison itself", () => {
    const rows = comparison.diff.rows.map((row) => `${row.prior}${row.current}`).join("");
    expect(rows).not.toContain("AC46402100");
    expect(rows).not.toContain("AC60836100");
  });

  it("shows the prior source PDF hash so it can be checked against the register", () => {
    expect(markup).toContain(comparison.prior.sourcePdfSha256);
  });

  it("renders the prior text verbatim", () => {
    expect(markup).toContain(comparison.prior.verbatimText.slice(0, 40));
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
