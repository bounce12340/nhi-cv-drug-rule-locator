export type InterfaceLanguage = "zh" | "en";
export type ThemeName = "light" | "dark";
export type ThemePreference = ThemeName | "system";

export const THEME_STORAGE_KEY = "nhi-clinician-theme";
export const LANGUAGE_STORAGE_KEY = "nhi-clinician-language";

export interface PreferenceStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export type LocaleDictionary = Readonly<{
  zh: Readonly<Record<string, string>>;
  en: Readonly<Record<string, string>>;
}>;

const THEME_PREFERENCES = new Set<ThemePreference>(["system", "light", "dark"]);
const INTERFACE_LANGUAGES = new Set<InterfaceLanguage>(["zh", "en"]);

function browserStorageCandidate(): PreferenceStorage | undefined {
  try {
    const candidate = (globalThis as { localStorage?: PreferenceStorage }).localStorage;
    return candidate &&
      typeof candidate.getItem === "function" &&
      typeof candidate.setItem === "function"
      ? candidate
      : undefined;
  } catch {
    return undefined;
  }
}

/** Uses localStorage on web and a process-local map when storage is absent or throws. */
export function createSafePreferenceStorage(
  persistentStorage: PreferenceStorage | undefined = browserStorageCandidate()
): PreferenceStorage {
  const memory = new Map<string, string>();

  return Object.freeze({
    getItem(key: string): string | null {
      try {
        const storedValue = persistentStorage?.getItem(key);
        if (storedValue !== null && storedValue !== undefined) {
          memory.set(key, storedValue);
          return storedValue;
        }
      } catch {
        // Native and privacy-restricted web environments use the in-memory value below.
      }
      return memory.get(key) ?? null;
    },
    setItem(key: string, value: string): void {
      memory.set(key, value);
      try {
        persistentStorage?.setItem(key, value);
      } catch {
        // The memory value remains available for this application lifetime.
      }
    }
  });
}

export const preferenceStorage = createSafePreferenceStorage();

export function loadThemePreference(storage: PreferenceStorage): ThemePreference {
  const storedValue = storage.getItem(THEME_STORAGE_KEY);
  return THEME_PREFERENCES.has(storedValue as ThemePreference)
    ? (storedValue as ThemePreference)
    : "system";
}

export function saveThemePreference(
  storage: PreferenceStorage,
  preference: ThemePreference
): void {
  storage.setItem(THEME_STORAGE_KEY, preference);
}

export function loadInterfaceLanguage(storage: PreferenceStorage): InterfaceLanguage {
  const storedValue = storage.getItem(LANGUAGE_STORAGE_KEY);
  return INTERFACE_LANGUAGES.has(storedValue as InterfaceLanguage)
    ? (storedValue as InterfaceLanguage)
    : "zh";
}

export function saveInterfaceLanguage(
  storage: PreferenceStorage,
  language: InterfaceLanguage
): void {
  storage.setItem(LANGUAGE_STORAGE_KEY, language);
}

export function resolveThemePreference(
  preference: ThemePreference,
  systemTheme: ThemeName | null | undefined
): ThemeName {
  if (preference !== "system") return preference;
  return systemTheme === "dark" ? "dark" : "light";
}

export function translateMessage(
  dictionary: LocaleDictionary,
  language: InterfaceLanguage,
  key: string,
  fallbackZh: string,
  replacements: Readonly<Record<string, string>> = {}
): string {
  const languageMessages = dictionary[language];
  const template = languageMessages[key] ?? dictionary.zh[key] ?? fallbackZh;
  if (template.length === 0) return fallbackZh;

  return Object.entries(replacements).reduce(
    (message, [name, value]) => message.split(`{${name}}`).join(value),
    template
  );
}

/** Explicit identity boundary for governed wording and source data values. */
export function preserveProtectedText(
  language: InterfaceLanguage,
  sourceText: string
): string {
  void language;
  return sourceText;
}

export const THEME_TOKENS = Object.freeze({
  light: Object.freeze({
    color: Object.freeze({
      background: "#F4F7FB",
      surface: "#FFFFFF",
      tabSurface: "#E6EDF5",
      textStrong: "#101828",
      textMuted: "#40566D",
      inputBorder: "#6B8299",
      ruleAction: "#304C67",
      masterAction: "#653B2C",
      actionText: "#FFFFFF",
      privacySurface: "#E5F4FA",
      privacyBorder: "#7895A5",
      privacyText: "#173B4D",
      divider: "#AAB8C6",
      reviewSurface: "#FFF0B8",
      reviewText: "#4A2B00",
      codeText: "#075985",
      detailText: "#34465A",
      ruleWarningSurface: "#352F58",
      masterWarningSurface: "#57251D",
      warningText: "#FFFFFF",
      cardBorder: "#C9B7AA",
      priceText: "#7A271A",
      priceSurface: "#FFF2E7",
      subtleDivider: "#C7D2DE",
      rowDivider: "#DDE5ED",
      announcementSurface: "#E7F4EE",
      announcementBorder: "#75A58F",
      announcementText: "#174D38",
      tagSurface: "#D4EADF",
      controlSelectedSurface: "#304C67",
      sectionFilterSurface: "#E6EDF5",
      linkText: "#075985",
      controlBorder: "#6B8299"
    })
  }),
  dark: Object.freeze({
    color: Object.freeze({
      background: "#0B1220",
      surface: "#151F2E",
      tabSurface: "#202D3E",
      textStrong: "#F8FAFC",
      textMuted: "#CBD5E1",
      inputBorder: "#8295AA",
      ruleAction: "#AFCCE4",
      masterAction: "#E4B8A6",
      actionText: "#111827",
      privacySurface: "#123348",
      privacyBorder: "#6795AA",
      privacyText: "#E0F2FE",
      divider: "#526276",
      reviewSurface: "#4A3707",
      reviewText: "#FEF3C7",
      codeText: "#7DD3FC",
      detailText: "#D7E0EA",
      ruleWarningSurface: "#D8D0F0",
      masterWarningSurface: "#F1CFC5",
      warningText: "#211A2C",
      cardBorder: "#755F54",
      priceText: "#FDBA9B",
      priceSurface: "#3C251E",
      subtleDivider: "#526276",
      rowDivider: "#344356",
      announcementSurface: "#163B30",
      announcementBorder: "#5B9D82",
      announcementText: "#D1FAE5",
      tagSurface: "#285846",
      controlSelectedSurface: "#AFCCE4",
      sectionFilterSurface: "#202D3E",
      linkText: "#7DD3FC",
      controlBorder: "#8295AA"
    })
  })
});

export type ThemeTokens = (typeof THEME_TOKENS)[ThemeName];

function relativeLuminance(hexColor: string): number {
  const channels = hexColor
    .slice(1)
    .match(/.{2}/gu)
    ?.map((channel) => Number.parseInt(channel, 16) / 255);
  if (channels === undefined || channels.length !== 3) {
    throw new Error(`Expected a six-digit hexadecimal color token, received ${hexColor}`);
  }

  const [red, green, blue] = channels.map((channel) =>
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  );
  return 0.2126 * red! + 0.7152 * green! + 0.0722 * blue!;
}

export function contrastRatio(foreground: string, background: string): number {
  const lighter = Math.max(relativeLuminance(foreground), relativeLuminance(background));
  const darker = Math.min(relativeLuminance(foreground), relativeLuminance(background));
  return (lighter + 0.05) / (darker + 0.05);
}
