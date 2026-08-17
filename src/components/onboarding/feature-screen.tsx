import type { ReactNode } from "react";
import { useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { Pressable, View } from "react-native";

import { colors } from "@/constants/design";
import { ProgressDots } from "@/components/progress-dots";
import { AppScreen } from "@/components/ui/app-screen";
import { Button } from "@/components/ui/button";
import { AppText } from "@/components/ui/typography";

import { safeGoBack } from "@/utils/navigation";

export function FeatureScreen({
  step,
  title,
  body,
  illustration,
  next,
}: {
  step: 1 | 2 | 3;
  title: string;
  body: string;
  illustration: ReactNode;
  next: "/onboarding/understand" | "/onboarding/repair" | "/onboarding/safety";
}) {
  const router = useRouter();

  const handleBack = () => {
    if (step === 2) {
      router.replace("/onboarding/scan");
    } else if (step === 3) {
      router.replace("/onboarding/understand");
    } else {
      safeGoBack(router, "/welcome");
    }
  };

  return (
    <AppScreen
      footer={
        <View className="gap-3">
          <Button label="Continue" onPress={() => router.push(next)} />
          <AppText variant="caption" align="center">{step} of 3</AppText>
        </View>
      }
    >
      <View className="flex-row items-center">
        <Pressable
          accessibilityLabel="Go back"
          accessibilityRole="button"
          className="h-11 w-11 items-center justify-center rounded-full border border-line bg-surface dark:border-dark-line dark:bg-dark-surface"
          onPress={handleBack}
        >
          <ArrowLeft color={colors.ink} size={23} />
        </Pressable>
        <View className="flex-1 items-center pr-11"><ProgressDots total={3} current={step} connected /></View>
      </View>

      <View className="mt-7 items-center px-3">
        <AppText variant="title" align="center">{title}</AppText>
        <AppText variant="body" align="center" color={colors.muted} className="mt-2.5">
          {body}
        </AppText>
      </View>

      <View className="flex-1 items-center justify-center py-6">{illustration}</View>
    </AppScreen>
  );
}
