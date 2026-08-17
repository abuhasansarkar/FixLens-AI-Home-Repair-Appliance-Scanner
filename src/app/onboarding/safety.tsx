import { BriefcaseBusiness, Check, ShieldCheck, TriangleAlert, Wrench } from "lucide-react-native";
import { useRouter } from "expo-router";
import { Pressable, View } from "react-native";

import { ProgressDots } from "@/components/progress-dots";
import { AppScreen } from "@/components/ui/app-screen";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Header } from "@/components/ui/header";
import { AppText } from "@/components/ui/typography";
import { colors } from "@/constants/design";
import { useOnboarding } from "@/features/onboarding/onboarding-context";

const levels = [
  { icon: Check, title: "Safe DIY", body: "Low risk, go ahead with confidence.", color: colors.safe, backgroundClass: "bg-safe-soft dark:bg-dark-safe-soft" },
  { icon: TriangleAlert, title: "DIY with caution", body: "Take precautions and go slowly.", color: colors.caution, backgroundClass: "bg-caution-soft dark:bg-dark-caution-soft" },
  { icon: Wrench, title: "Advanced repair", body: "Complex steps and specialized tools.", color: colors.advanced, backgroundClass: "bg-advanced-soft dark:bg-dark-caution-soft" },
  { icon: BriefcaseBusiness, title: "Professional required", body: "Best left to a qualified professional.", color: colors.danger, backgroundClass: "bg-danger-soft dark:bg-dark-danger-soft" },
];

export default function SafetyOnboardingScreen() {
  const router = useRouter();
  const { safetyAccepted, acceptSafety } = useOnboarding();

  return (
    <AppScreen footer={<Button label="Continue" disabled={!safetyAccepted} onPress={() => router.push("/onboarding/interests")} />}>
      <Header />
      <View className="mt-4 items-center">
        <View className="mb-5 h-28 w-28 items-center justify-center rounded-full bg-brand-soft dark:bg-dark-brand-soft">
          <ShieldCheck color={colors.brand} size={60} strokeWidth={1.7} />
        </View>
        <AppText variant="title" align="center">Know when to stop.</AppText>
        <AppText variant="body" align="center" color={colors.muted} className="mt-2.5">
          FixLens helps you identify risks and know when professional help is recommended.
        </AppText>
      </View>
      <View className="mt-7 flex-row flex-wrap justify-between gap-y-3">
        {levels.map(({ icon: Icon, title, body, color, backgroundClass }) => (
          <Card key={title} className="min-h-[155px] w-[48%] items-center">
            <View className={`mb-3 h-12 w-12 items-center justify-center rounded-full ${backgroundClass}`}>
              <Icon color={color} size={27} />
            </View>
            <AppText variant="label" align="center">{title}</AppText>
            <AppText variant="caption" align="center" className="mt-1">{body}</AppText>
          </Card>
        ))}
      </View>
      <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: safetyAccepted }} className="mt-5 min-h-[62px] flex-row items-center gap-3 rounded-control border border-line bg-surface px-4 dark:border-dark-line dark:bg-dark-surface" onPress={acceptSafety}><View className={safetyAccepted ? "h-7 w-7 items-center justify-center rounded-md bg-brand" : "h-7 w-7 rounded-md border border-line dark:border-dark-line"}>{safetyAccepted ? <Check color={colors.white} size={18} /> : null}</View><AppText variant="body" className="flex-1">I understand that AI can be wrong and I must stop when conditions are unsafe or different.</AppText></Pressable>
      <View className="mt-6"><ProgressDots total={4} current={4} /></View>
    </AppScreen>
  );
}
