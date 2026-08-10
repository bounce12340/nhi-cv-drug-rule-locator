// react-native-web ships no TypeScript types, so declare the nine primitives this app uses.
// Vite aliases "react-native" to react-native-web at build time; this only supplies the types.
declare module "react-native" {
  import type { ReactNode } from "react";

  /** RN style objects are not CSS: numeric lengths, no units, RN-only keys such as gap on View. */
  export type Style = Record<string, unknown>;
  export type StyleProp = Style | false | null | undefined | readonly StyleProp[];

  interface AccessibilityProps {
    accessibilityElementsHidden?: boolean;
    accessibilityHint?: string;
    accessibilityLabel?: string;
    accessibilityRole?: string;
    accessibilityState?: { readonly [key: string]: boolean | undefined };
    accessible?: boolean;
    importantForAccessibility?: string;
    nativeID?: string;
    testID?: string;
  }

  interface BaseProps extends AccessibilityProps {
    children?: ReactNode;
    style?: StyleProp;
  }

  export const View: (props: BaseProps & { pointerEvents?: string }) => JSX.Element;

  export const Text: (
    props: BaseProps & { numberOfLines?: number; selectable?: boolean }
  ) => JSX.Element;

  export const SafeAreaView: (props: BaseProps) => JSX.Element;

  export const ScrollView: (
    props: BaseProps & {
      contentContainerStyle?: StyleProp;
      horizontal?: boolean;
      keyboardShouldPersistTaps?: "always" | "handled" | "never";
      showsVerticalScrollIndicator?: boolean;
    }
  ) => JSX.Element;

  export const Pressable: (
    props: Omit<BaseProps, "style"> & {
      disabled?: boolean;
      onPress?: () => void;
      style?: StyleProp | ((state: { pressed: boolean }) => StyleProp);
    }
  ) => JSX.Element;

  export const TextInput: (
    props: BaseProps & {
      autoCapitalize?: "characters" | "none" | "sentences" | "words";
      autoCorrect?: boolean;
      autoFocus?: boolean;
      inputMode?: string;
      onChangeText?: (text: string) => void;
      onSubmitEditing?: () => void;
      placeholder?: string;
      placeholderTextColor?: string;
      returnKeyType?: string;
      value?: string;
    }
  ) => JSX.Element;

  export const StyleSheet: {
    create<T extends Record<string, Style>>(styles: T): T;
    flatten(style?: StyleProp): Style;
    readonly absoluteFillObject: Style;
    readonly hairlineWidth: number;
  };

  export function useColorScheme(): "dark" | "light" | null | undefined;
  export function useWindowDimensions(): { fontScale: number; height: number; scale: number; width: number };
}
