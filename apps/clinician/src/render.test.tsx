import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import App from "../App";
import { UI_COPY } from "./copy";

/**
 * These assert on what the screen actually renders, not on App.tsx's source text.
 *
 * The previous app tests grepped the source for strings like `type="date"`, which
 * meant a purely visual change failed 40 assertions while a real regression — the
 * same disclaimer paragraph printed once per result card, 55 times on one screen —
 * passed every one of them. `renderToStaticMarkup` needs no jsdom and no testing
 * library, so this costs no new dependency.
 *
 * It renders the initial state only; interaction is verified against the built
 * bundle in a browser.
 */
const markup = renderToStaticMarkup(<App />);

function occurrences(haystack: string, needle: string): number {
  return haystack.split(needle).length - 1;
}

describe("the rendered page", () => {
  it("renders without throwing and shows the product name", () => {
    expect(markup).toContain(UI_COPY.zh.appTitle);
    expect(markup.length).toBeGreaterThan(2000);
  });

  it("states the disclaimer exactly once, not once per result", () => {
    // The regression this exists for: the official transcription warning used to be
    // rendered inside every drug card. A search for atorvastatin printed the same
    // paragraph 55 times and pushed 59 warning lines onto one screen.
    expect(occurrences(markup, UI_COPY.zh.disclaimer)).toBe(1);
  });

  it("says the tool takes no patient data", () => {
    expect(markup).toContain(UI_COPY.zh.privacyText);
  });

  it("offers exactly two modes, with the drug lookup selected first", () => {
    expect(occurrences(markup, 'role="tab"')).toBe(2);
    expect(markup).toContain(UI_COPY.zh.tabDrugLookup);
    expect(markup).toContain(UI_COPY.zh.tabRiskTier);
    // The risk questionnaire is behind its tab, not stacked onto the first screen.
    expect(markup).not.toContain(UI_COPY.zh.riskPanelTitle);
  });

  it("shows a placeholder rather than results before a query is run", () => {
    expect(markup).toContain(UI_COPY.zh.resultsEmptyTitle);
    expect(markup).not.toContain(UI_COPY.zh.statMatched);
  });

  it("offers a real date input bounded by the dataset", () => {
    expect(markup).toContain('type="date"');
    expect(markup).toContain('min="2026-08-07"');
    expect(markup).toContain('max="9999-12-31"');
  });

  it("offers exactly the three announcement filters", () => {
    for (const label of [
      UI_COPY.zh.filterAll,
      UI_COPY.zh.filterPriceChanged,
      UI_COPY.zh.filterPriceUnchanged
    ]) {
      expect(occurrences(markup, `>${label}<`)).toBe(1);
    }
  });

  it("leaves no untranslated placeholder in the initial screen", () => {
    // A message rendered with the wrong replacement key leaves `{name}` on screen.
    expect(markup).not.toMatch(/\{[a-zA-Z]+\}/);
  });

  it("carries a theme attribute so the palette can resolve", () => {
    expect(markup).toMatch(/data-theme="(light|dark)"/);
  });
});

describe("copy", () => {
  it("keeps the Chinese and English key sets identical", () => {
    expect(Object.keys(UI_COPY.en).sort()).toEqual(Object.keys(UI_COPY.zh).sort());
  });

  it("has no empty string in either language", () => {
    for (const locale of ["zh", "en"] as const) {
      for (const [key, value] of Object.entries(UI_COPY[locale])) {
        expect(value, `${locale}.${key}`).not.toBe("");
      }
    }
  });

  it("uses the same placeholder names in both languages", () => {
    const placeholders = (value: string): string[] =>
      [...value.matchAll(/\{([a-zA-Z]+)\}/g)].map((match) => match[1]!).sort();
    for (const key of Object.keys(UI_COPY.zh) as (keyof typeof UI_COPY.zh)[]) {
      expect(placeholders(UI_COPY.en[key]), key).toEqual(placeholders(UI_COPY.zh[key]));
    }
  });
});

describe("authorship", () => {
  it("credits who planned, developed and produced the system, once, in the footer", () => {
    expect(occurrences(markup, UI_COPY.zh.footerCredit)).toBe(1);
    expect(markup).toContain("Josh Tsai");
    expect(markup).toContain("天義企業");
    // Below the data-source line, not competing with it.
    expect(markup.indexOf(UI_COPY.zh.footerCredit)).toBeGreaterThan(
      markup.indexOf(UI_COPY.zh.footerAttribution)
    );
  });

  it("keeps the credit out of the header, where the disclaimer belongs", () => {
    const header = markup.slice(0, markup.indexOf('class="disclaimer"'));
    expect(header).not.toContain("Josh Tsai");
  });

  it("uses the registered company name in English, not a romanisation of the Chinese", () => {
    expect(UI_COPY.en.footerCredit).toContain("Universal Integrated Corp.");
    expect(UI_COPY.en.footerCredit).not.toContain("天義企業");
    expect(UI_COPY.zh.footerCredit).toContain("天義企業");
  });
});

describe("the tab list", () => {
  it("links each tab to the panel it controls, both ways", () => {
    for (const name of ["drug", "risk"]) {
      expect(markup).toContain(`id="tab-${name}"`);
      expect(markup).toContain(`aria-controls="panel-${name}"`);
    }
    // Only the selected panel is mounted or shown, so only it is in the markup
    // as a live region; the risk panel appears once its tab is chosen.
    expect(markup).toContain('id="panel-drug"');
    expect(markup).toContain('aria-labelledby="tab-drug"');
    expect(markup).toContain('role="tabpanel"');
  });

  it("keeps only the selected tab in the tab order", () => {
    // Roving tabindex: a keyboard user reaches the panel in one press instead of
    // stepping through every tab first, and moves between tabs with the arrows.
    expect(markup).toContain('tabindex="0"');
    expect(markup).toContain('tabindex="-1"');
    const selected = markup.match(/<button[^>]*aria-selected="true"[^>]*>/u)?.[0] ?? "";
    expect(selected).toContain('tabindex="0"');
    const unselected = markup.match(/<button[^>]*aria-selected="false"[^>]*>/u)?.[0] ?? "";
    expect(unselected).toContain('tabindex="-1"');
  });
});

describe("what a screen reader gets", () => {
  const markup = renderToStaticMarkup(<App />);

  it("binds every input to its visible label instead of leaving it unnamed", () => {
    const inputIds = [...markup.matchAll(/<input[^>]*\bid="([^"]+)"/gu)].map((m) => m[1]!);
    const labelFor = new Set(
      [...markup.matchAll(/<label[^>]*\bfor="([^"]+)"/gu)].map((m) => m[1]!)
    );
    expect(inputIds.length).toBeGreaterThan(0);
    for (const id of inputIds) expect(labelFor.has(id), id).toBe(true);
    // And no input is left without an id to be bound by.
    const inputs = markup.match(/<input\b/gu) ?? [];
    expect(inputs).toHaveLength(inputIds.length);
  });

  it("carries a main landmark and a skip link ahead of the header", () => {
    expect(markup).toContain('id="main-content"');
    expect(markup).toContain("<main");
    expect(markup.indexOf("skip-link")).toBeLessThan(markup.indexOf("<header"));
    expect(markup).toContain(UI_COPY.zh.skipToContent);
  });

  it("holds a polite status region in each results column", () => {
    // Silence after pressing the search button is the failure this prevents.
    expect(occurrences(markup, 'aria-live="polite"')).toBeGreaterThanOrEqual(1);
    expect(markup).toContain('role="status"');
  });

  it("keeps the document language and title in the dictionary, in both languages", () => {
    expect(UI_COPY.zh.htmlLang).toBe("zh-Hant");
    expect(UI_COPY.en.htmlLang).toBe("en");
    expect(UI_COPY.zh.documentTitle).not.toBe(UI_COPY.en.documentTitle);
  });
});
