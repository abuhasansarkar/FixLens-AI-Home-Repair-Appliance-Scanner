import type { ReactNode } from "react";
import { Pressable, View } from "react-native";
import { ArrowLeft, X } from "lucide-react-native";
import { useRouter } from "expo-router";

import { useThemeColors } from "@/constants/design";
import { AppText } from "./typography";

import { safeGoBack } from "@/utils/navigation";

export function Header({
  title,
  center,
  close = false,
  right,
  onBack,
  fallbackHref,
}: {
  title?: string;
  center?: ReactNode;
  close?: boolean;
  right?: ReactNode;
  onBack?: () => void;
  fallbackHref?: string;
}) {
  const router = useRouter();
  const theme = useThemeColors();
  const Icon = close ? X : ArrowLeft;

  return (
    <View className="h-12 w-full flex-row items-center">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={close ? "Close" : "Go back"}
        onPress={onBack ?? (() => safeGoBack(router, fallbackHref))}
        className="h-11 w-11 items-center justify-center"
      >
        <Icon color={theme.ink} size={23} strokeWidth={2} />
      </Pressable>
      <View className="flex-1 items-center">{center ?? (title ? <AppText variant="label">{title}</AppText> : null)}</View>
      <View className="h-11 w-11 items-center justify-center">{right}</View>
    </View>
  );
}
