import type { PropsWithChildren, ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  View,
  type ScrollViewProps,
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useNetworkStatus } from "@/providers/network-status";

type AppScreenProps = PropsWithChildren<{
  scroll?: boolean;
  footer?: ReactNode;
  contentStyle?: ViewStyle;
  contentClassName?: string;
  keyboard?: boolean;
  scrollProps?: ScrollViewProps;
}>;

export function AppScreen({
  children,
  scroll = true,
  footer,
  contentStyle,
  contentClassName,
  keyboard = false,
  scrollProps,
}: AppScreenProps) {
  const { offline, known } = useNetworkStatus();
  const content = scroll ? (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      className="bg-canvas dark:bg-dark-canvas"
      contentContainerClassName={`flex-grow px-6 py-4 ${contentClassName ?? ""}`}
      contentContainerStyle={contentStyle}
      {...scrollProps}
    >
      {children}
    </ScrollView>
  ) : (
    <View className={`flex-1 bg-canvas px-6 py-4 dark:bg-dark-canvas ${contentClassName ?? ""}`} style={contentStyle}>{children}</View>
  );

  const body = (
    <SafeAreaView edges={["top", "bottom"]} className="flex-1 bg-canvas dark:bg-dark-canvas">
      {known && offline ? (
        <View
          accessibilityLiveRegion="polite"
          accessibilityRole="alert"
          className="bg-caution px-4 py-2"
        >
          <Text className="text-center text-sm font-semibold text-white">
            You’re offline. Saved content is available; online actions will retry when connected.
          </Text>
        </View>
      ) : null}
      {content}
      {footer ? <View className="bg-canvas px-6 pb-1 pt-3 dark:bg-dark-canvas">{footer}</View> : null}
    </SafeAreaView>
  );

  if (!keyboard) return body;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      className="flex-1"
    >
      {body}
    </KeyboardAvoidingView>
  );
}
