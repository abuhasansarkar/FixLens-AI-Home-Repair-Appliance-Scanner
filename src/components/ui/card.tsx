import type { PropsWithChildren } from "react";
import { Pressable, View, type ViewStyle } from "react-native";

import { cn } from "@/utils/cn";

export function Card({ children, style, className }: PropsWithChildren<{ style?: ViewStyle; className?: string }>) {
  return <View className={cn("rounded-card border border-line bg-surface p-4 shadow-sm shadow-black/5 dark:border-dark-line dark:bg-dark-surface dark:shadow-none", className)} style={style}>{children}</View>;
}

export function SelectableCard({
  children,
  selected,
  onPress,
  style,
  className,
}: PropsWithChildren<{ selected: boolean; onPress: () => void; style?: ViewStyle; className?: string }>) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      className={cn(
        "rounded-card border border-line bg-surface p-4 shadow-sm shadow-black/5 dark:border-dark-line dark:bg-dark-surface dark:shadow-none",
        selected && "border-2 border-brand bg-[#FCFDFF] dark:bg-dark-brand-soft",
        className,
      )}
      style={({ pressed }) => [style, { opacity: pressed ? 0.8 : 1 }]}
    >
      {children}
    </Pressable>
  );
}
