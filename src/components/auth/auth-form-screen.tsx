import type { PropsWithChildren, ReactNode } from "react";
import { View } from "react-native";

import { AppScreen } from "@/components/ui/app-screen";
import { Header } from "@/components/ui/header";
import { AppText } from "@/components/ui/typography";
import { colors } from "@/constants/design";

export function AuthFormScreen({ title, body, children, footer }: PropsWithChildren<{ title: string; body: string; footer?: ReactNode }>) {
  return (
    <AppScreen keyboard footer={footer}>
      <Header />
      <View className="mb-8 mt-5">
        <AppText variant="title">{title}</AppText>
        <AppText variant="body" color={colors.muted} className="mt-2">{body}</AppText>
      </View>
      {children}
    </AppScreen>
  );
}
