import { View } from "react-native";
import { useRouter } from "expo-router";

import { BrandMark } from "@/components/brand-mark";
import { AppScreen } from "@/components/ui/app-screen";
import { Button } from "@/components/ui/button";
import { AppText } from "@/components/ui/typography";
import { colors } from "@/constants/design";

export function ComingNext({ title, body }: { title: string; body: string }) {
  const router = useRouter();
  return (
    <AppScreen scroll={false}>
      <BrandMark compact />
      <View className="flex-1 items-center justify-center px-6">
        <AppText variant="title" align="center">{title}</AppText>
        <AppText variant="body" color={colors.muted} align="center" className="mb-6 mt-2.5">{body}</AppText>
        <View className="w-full"><Button label="Scan a problem" onPress={() => router.push("/scan/camera")} /></View>
      </View>
    </AppScreen>
  );
}
