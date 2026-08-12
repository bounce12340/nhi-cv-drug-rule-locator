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

  it("opens on the drug tab with both tabs present", () => {
    expect(markup).toContain(UI_COPY.zh.drugLookupTab);
    expect(markup).toContain(UI_COPY.zh.ruleLookupTab);
    expect(occurrences(markup, 'role="tab"')).toBe(2);
    // aria-selected="true" appears once, on the drug tab.
    expect(occurrences(markup, 'aria-selected="true"')).toBe(1);
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
