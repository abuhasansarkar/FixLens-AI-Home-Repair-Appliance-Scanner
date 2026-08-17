import { useColorScheme } from "react-native";

export const colors = {
  canvas: "#FBFAF8",
  surface: "#FFFFFF",
  surfaceMuted: "#F5F6F8",
  ink: "#111318",
  muted: "#657083",
  subtle: "#9099A8",
  line: "#E3E6EA",
  brand: "#075FFF",
  brandPressed: "#004BD6",
  brandSoft: "#EAF2FF",
  safe: "#159447",
  safeSoft: "#EAF8EF",
  caution: "#F4A51C",
  cautionSoft: "#FFF4DF",
  advanced: "#E87816",
  advancedSoft: "#FFF3E8",
  danger: "#E93434",
  dangerSoft: "#FFF0F0",
  camera: "#151515",
  white: "#FFFFFF",
} as const;

export const darkColors = {
  canvas: "#111419",
  surface: "#1C2027",
  surfaceMuted: "#171A20",
  ink: "#F4F6F8",
  muted: "#A9B2C0",
  subtle: "#7E8899",
  line: "#343A45",
  brand: "#075FFF",
  brandPressed: "#004BD6",
  brandSoft: "#172B4D",
  safe: "#22C55E",
  safeSoft: "#143322",
  caution: "#F59E0B",
  cautionSoft: "#3B2B12",
  advanced: "#F97316",
  advancedSoft: "#3B1F0E",
  danger: "#EF4444",
  dangerSoft: "#3B191B",
  camera: "#151515",
  white: "#FFFFFF",
} as const;

export function useThemeColors() {
  const isDark = useColorScheme() === "dark";
  return isDark ? darkColors : colors;
}

export const radii = {
  small: 10,
  control: 14,
  card: 18,
  hero: 28,
  pill: 999,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  huge: 32,
} as const;
