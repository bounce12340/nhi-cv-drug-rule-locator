import {
  DRUG_ITEM_MASTER_WARNING,
  DRUG_ITEM_MASTER_RECORDS,
  ITEM_RECORDS,
  ITEM_WARNING,
  RULE_TEXT_WARNING,
  lookupRuleText
} from "@nhi-cv/domain";
import { describe, expect, it } from "vitest";
import {
  LANGUAGE_STORAGE_KEY,
  THEME_STORAGE_KEY,
  THEME_TOKENS,
  contrastRatio,
  createSafePreferenceStorage,
  loadInterfaceLanguage,
  loadThemePreference,
  preserveProtectedText,
  resolveThemePreference,
  saveInterfaceLanguage,
  saveThemePreference,
  translateMessage,
  type PreferenceStorage
} from "./ui-preferences";

function byteView(value: string): Buffer {
  return Buffer.from(value, "utf8");
}

describe("clinician theme and language preferences", () => {
  it("defaults to system theme and Chinese, then persists explicit selections", () => {
    const values = new Map<string, string>();
    const storage: PreferenceStorage = {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value)
    };

    expect(loadThemePreference(storage)).toBe("system");
    expect(loadInterfaceLanguage(storage)).toBe("zh");

    saveThemePreference(storage, "dark");
    saveInterfaceLanguage(storage, "en");
    expect(values.get(THEME_STORAGE_KEY)).toBe("dark");
    expect(values.get(LANGUAGE_STORAGE_KEY)).toBe("en");
    expect(loadThemePreference(storage)).toBe("dark");
    expect(loadInterfaceLanguage(storage)).toBe("en");
  });

  it("fails closed to defaults for invalid persisted values", () => {
    const storage: PreferenceStorage = {
      getItem: (key) => (key === THEME_STORAGE_KEY ? "sepia" : "fr"),
      setItem: () => undefined
    };
    expect(loadThemePreference(storage)).toBe("system");
    expect(loadInterfaceLanguage(storage)).toBe("zh");
  });

  it("follows the system until a light or dark preference is selected", () => {
    expect(resolveThemePreference("system", "dark")).toBe("dark");
    expect(resolveThemePreference("system", "light")).toBe("light");
    expect(resolveThemePreference("system", null)).toBe("light");
    expect(resolveThemePreference("light", "dark")).toBe("light");
    expect(resolveThemePreference("dark", "light")).toBe("dark");
  });

  it("retains preferences in memory when native or restricted storage throws", () => {
    const unavailableStorage: PreferenceStorage = {
      getItem: () => {
        throw new Error("unavailable");
      },
      setItem: () => {
        throw new Error("unavailable");
      }
    };
    const safeStorage = createSafePreferenceStorage(unavailableStorage);
    safeStorage.setItem(THEME_STORAGE_KEY, "dark");
    safeStorage.setItem(LANGUAGE_STORAGE_KEY, "en");
    expect(safeStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
    expect(safeStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe("en");
  });
});

describe("clinician localization guardrails", () => {
  it("falls back to Chinese for a missing English entry and never shows a key or blank", () => {
    const dictionary = {
      zh: { present: "中文備援" },
      en: {}
    } as const;
    expect(translateMessage(dictionary, "en", "present", "另一中文備援")).toBe("中文備援");
    expect(translateMessage(dictionary, "en", "missing-key", "缺鍵中文備援")).toBe(
      "缺鍵中文備援"
    );
    expect(translateMessage({ zh: { empty: "" }, en: { empty: "" } }, "en", "empty", "中文")).toBe(
      "中文"
    );
  });

  it("keeps official wording, RA warnings, and source data byte-identical in both languages", () => {
    const ruleResult = lookupRuleText({ query: "2.6.1", as_of_date: "2026-09-01" });
    const sourceItem = ITEM_RECORDS[0]!;
    const masterItem = DRUG_ITEM_MASTER_RECORDS[0]!;
    const protectedValues = [
      ruleResult.units[0]!.verbatimText,
      RULE_TEXT_WARNING,
      ITEM_WARNING,
      DRUG_ITEM_MASTER_WARNING,
      masterItem.drugNameZh,
      sourceItem.drugNameEn,
      masterItem.vendor,
      sourceItem.nhiCode,
      sourceItem.priceAfter ?? ""
    ];

    for (const value of protectedValues) {
      expect(byteView(preserveProtectedText("zh", value))).toEqual(byteView(value));
      expect(byteView(preserveProtectedText("en", value))).toEqual(byteView(value));
    }
  });
});

describe("clinician theme contrast tokens", () => {
  it("meets WCAG AA text contrast for warnings, no-patient-data, and footer duties", () => {
    for (const theme of Object.values(THEME_TOKENS)) {
      const pairs = [
        [theme.color.warningText, theme.color.ruleWarningSurface],
        [theme.color.warningText, theme.color.masterWarningSurface],
        [theme.color.announcementText, theme.color.announcementSurface],
        [theme.color.privacyText, theme.color.privacySurface],
        [theme.color.textMuted, theme.color.background]
      ] as const;

      for (const [foreground, background] of pairs) {
        expect(contrastRatio(foreground, background)).toBeGreaterThanOrEqual(4.5);
      }
    }
  });
});
