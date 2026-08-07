import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as ts from "typescript";
import { describe, expect, it } from "vitest";

const sourceDirectory = path.dirname(fileURLToPath(import.meta.url));
const appPath = path.resolve(sourceDirectory, "../App.tsx");
const appSource = readFileSync(appPath, "utf8");

function unwrapObjectLiteral(expression: ts.Expression): ts.ObjectLiteralExpression {
  if (ts.isObjectLiteralExpression(expression)) return expression;
  if (
    ts.isAsExpression(expression) ||
    ts.isSatisfiesExpression(expression) ||
    ts.isParenthesizedExpression(expression)
  ) {
    return unwrapObjectLiteral(expression.expression);
  }
  if (ts.isCallExpression(expression) && expression.arguments[0] !== undefined) {
    return unwrapObjectLiteral(expression.arguments[0]);
  }
  throw new Error(`Expected object literal, received ${ts.SyntaxKind[expression.kind]}`);
}

function propertyName(property: ts.ObjectLiteralElementLike): string | undefined {
  if (!ts.isPropertyAssignment(property)) return undefined;
  if (ts.isIdentifier(property.name) || ts.isStringLiteral(property.name)) return property.name.text;
  return undefined;
}

function dictionaryKeys(locale: "zh" | "en"): string[] {
  const sourceFile = ts.createSourceFile(appPath, appSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let dictionary: ts.ObjectLiteralExpression | undefined;
  sourceFile.forEachChild((node) => {
    if (!ts.isVariableStatement(node)) return;
    for (const declaration of node.declarationList.declarations) {
      if (ts.isIdentifier(declaration.name) && declaration.name.text === "UI_COPY" && declaration.initializer) {
        dictionary = unwrapObjectLiteral(declaration.initializer);
      }
    }
  });
  if (dictionary === undefined) throw new Error("UI_COPY dictionary was not found");

  const localeProperty = dictionary.properties.find((property) => propertyName(property) === locale);
  if (!localeProperty || !ts.isPropertyAssignment(localeProperty)) {
    throw new Error(`${locale} dictionary was not found`);
  }
  return unwrapObjectLiteral(localeProperty.initializer).properties
    .map(propertyName)
    .filter((key): key is string => key !== undefined)
    .sort();
}

function sha256(relativePath: string): string {
  const bytes = readFileSync(path.resolve(sourceDirectory, relativePath));
  return createHash("sha256").update(bytes).digest("hex");
}

describe("clinician theme and localization UI integration", () => {
  it("keeps the centralized Chinese and English dictionary key sets identical", () => {
    const chineseKeys = dictionaryKeys("zh");
    const englishKeys = dictionaryKeys("en");
    expect(chineseKeys.length).toBeGreaterThan(0);
    expect(englishKeys).toEqual(chineseKeys);
  });

  it("has system-aware persisted theme and persisted Chinese/English controls", () => {
    expect(appSource).toContain("useColorScheme()");
    expect(appSource).toContain("loadThemePreference(preferenceStorage)");
    expect(appSource).toContain("saveThemePreference(preferenceStorage, nextTheme)");
    expect(appSource).toContain("loadInterfaceLanguage(preferenceStorage)");
    expect(appSource).toContain("saveInterfaceLanguage(preferenceStorage, nextLanguage)");
    expect(appSource).toContain("主題：明亮（切換至暗黑）");
    expect(appSource).toContain("主題：暗黑（切換至明亮）");
    expect(appSource).toContain("中文");
    expect(appSource).toContain("English");
  });

  it("derives App styles from theme tokens without a scattered authored color", () => {
    expect(appSource).not.toMatch(/#[\da-f]{3,8}\b/iu);
    expect(appSource).not.toMatch(/\b(?:rgb|hsl)a?\s*\(/iu);
    expect(appSource).toContain("function createStyles(theme: ThemeTokens)");
    expect(appSource).toContain("THEME_TOKENS[theme]");
  });

  it("renders protected official wording and warnings without translating their values", () => {
    expect(appSource).toContain(">{unit.verbatimText}</Text>");
    expect(appSource).toContain(">{result.warning}</Text>");
    expect(appSource).toContain(">{drugItemsDataset.warning}</Text>");
    expect(appSource).toContain("preserveProtectedText(language, value)");
    expect(appSource).toContain(
      "Official warnings and rule text appear in their original Chinese wording."
    );
  });

  it("contains none of the English payment-decision blacklist words", () => {
    for (const word of ["eligible", "covered", "reimbursable", "qualifies"]) {
      expect(appSource.toLocaleLowerCase("en-US")).not.toContain(word);
    }
  });

  it("keeps every pre-existing clinician UI test byte-identical", () => {
    expect(sha256("./consolidated-ui.test.ts")).toBe(
      "f88069b11fc4385dfe356e9b35cf5e9b2de6a4328626bd425e3e8836146e3572"
    );
    expect(sha256("./drug-item-master-ui.test.ts")).toBe(
      "450204d6bc309da0d9216a2275f6e56b886a81afd65b8d90b987c2a3734af540"
    );
    expect(sha256("./drug-item-ui-integration.test.ts")).toBe(
      "32af2f26d03f801b8d12dd66f168a66686592c3ad6c951b67b3afa183090d1c2"
    );
  });
});
