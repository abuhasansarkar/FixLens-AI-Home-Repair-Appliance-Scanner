import type { PropsWithChildren } from "react";
import { Text, useColorScheme, type ColorValue, type TextProps, type TextStyle } from "react-native";

import { colors, darkColors } from "@/constants/design";
import { cn } from "@/utils/cn";

type Variant = "display" | "title" | "heading" | "body" | "caption" | "label";

type AppTextProps = PropsWithChildren<
  TextProps & { variant?: Variant; color?: ColorValue; align?: TextStyle["textAlign"] }
>;

export function AppText({
  variant = "body",
  color,
  align,
  style,
  className,
  children,
  ...props
}: AppTextProps) {
  const isDark = useColorScheme() === "dark";

  let resolvedColor = color;
  if (isDark && color) {
    if (color === colors.ink) resolvedColor = darkColors.ink;
    else if (color === colors.muted) resolvedColor = darkColors.muted;
    else if (color === colors.subtle) resolvedColor = darkColors.subtle;
    else if (color === colors.canvas) resolvedColor = darkColors.canvas;
    else if (color === colors.surface) resolvedColor = darkColors.surface;
    else if (color === colors.line) resolvedColor = darkColors.line;
  }

  return (
    <Text
      {...props}
      className={cn(
        "text-ink dark:text-dark-ink",
        variant === "display" && "text-[34px] font-extrabold leading-[39px] tracking-[-1.1px]",
        variant === "title" && "text-[28px] font-extrabold leading-[33px] tracking-[-0.7px]",
        variant === "heading" && "text-xl font-bold leading-[25px] tracking-[-0.25px]",
        variant === "body" && "text-base font-normal leading-[23px]",
        variant === "caption" && "text-[13px] leading-[18px] text-muted dark:text-dark-muted",
        variant === "label" && "text-[15px] font-semibold leading-5",
        className,
      )}
      style={[resolvedColor ? { color: resolvedColor } : null, align ? { textAlign: align } : null, style]}
    >
      {children}
    </Text>
  );
}
