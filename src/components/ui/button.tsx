import type { ReactNode } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";

import { colors } from "@/constants/design";
import { cn } from "@/utils/cn";
import { AppText } from "./typography";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  icon?: ReactNode;
  disabled?: boolean;
  loading?: boolean;
  compact?: boolean;
  accessibilityHint?: string;
};

export function Button({
  label,
  onPress,
  variant = "primary",
  icon,
  disabled,
  loading,
  compact,
  accessibilityHint,
}: ButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      disabled={disabled || loading}
      onPress={onPress}
      className={cn(
        "min-h-[54px] items-center justify-center rounded-control px-[18px]",
        compact && "min-h-[46px]",
        variant === "primary" && "bg-brand",
        variant === "secondary" && "border border-brand bg-surface dark:bg-dark-surface",
        variant === "ghost" && "bg-transparent",
        variant === "danger" && "bg-danger",
        (disabled || loading) && "opacity-[0.45]",
      )}
      style={({ pressed }) => ({ opacity: pressed && !disabled ? 0.78 : undefined })}
    >
      {loading ? (
        <ActivityIndicator color={variant === "primary" || variant === "danger" ? colors.white : colors.brand} />
      ) : (
        <View className="flex-row items-center justify-center gap-2">
          {icon}
          <AppText
            variant="label"
            color={variant === "primary" || variant === "danger" ? colors.white : colors.brand}
          >
            {label}
          </AppText>
        </View>
      )}
    </Pressable>
  );
}
