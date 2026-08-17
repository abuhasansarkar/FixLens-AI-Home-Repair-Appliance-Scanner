import AsyncStorage from "@react-native-async-storage/async-storage";
import { useColorScheme } from "nativewind";
import type { PropsWithChildren } from "react";
import { useEffect } from "react";
import { Appearance } from "react-native";

export const APPEARANCE_KEY = "fixlens.setting.appearance";
export type AppearancePreference = "system" | "light" | "dark";

export function ThemeRuntime({ children, serverAppearance }: PropsWithChildren<{ serverAppearance?: string }>) {
  const { setColorScheme } = useColorScheme();
  useEffect(() => {
    if (serverAppearance === "light" || serverAppearance === "dark" || serverAppearance === "system") {
      setColorScheme(serverAppearance); Appearance.setColorScheme(serverAppearance === "system" ? "unspecified" : serverAppearance); void AsyncStorage.setItem(APPEARANCE_KEY, serverAppearance); return;
    }
    AsyncStorage.getItem(APPEARANCE_KEY).then((value) => { const preference = value === "light" || value === "dark" ? value : "system"; setColorScheme(preference); Appearance.setColorScheme(preference === "system" ? "unspecified" : preference); });
  }, [serverAppearance, setColorScheme]);
  return children;
}
