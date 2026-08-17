import { Check, Drill, Flower2, Wrench } from "lucide-react-native";
import { useRouter } from "expo-router";
import { View } from "react-native";

import { AppScreen } from "@/components/ui/app-screen";
import { Button } from "@/components/ui/button";
import { SelectableCard } from "@/components/ui/card";
import { Header } from "@/components/ui/header";
import { AppText } from "@/components/ui/typography";
import { colors } from "@/constants/design";
import { type DiyLevel, useOnboarding } from "@/features/onboarding/onboarding-context";

const levels: { id: DiyLevel; title: string; body: string; icon: typeof Flower2; color: string }[] = [
  { id: "beginner", title: "Beginner", body: "I’m new to DIY and prefer step-by-step guidance.", icon: Flower2, color: colors.safe },
  { id: "comfortable", title: "Comfortable", body: "I’ve done some repairs and feel pretty comfortable.", icon: Wrench, color: colors.caution },
  { id: "experienced", title: "Experienced", body: "I’m confident with tools and taking on complex repairs.", icon: Drill, color: colors.brand },
];

export default function ExperienceScreen() {
  const router = useRouter();
  const { diyLevel, setDiyLevel, complete, safetyAccepted } = useOnboarding();

  const finish = async () => {
    if (!safetyAccepted) { router.replace("/onboarding/safety"); return; }
    await complete();
    router.replace("/tabs/home");
  };

  return (
    <AppScreen footer={<Button label="Continue" onPress={finish} />}>
      <Header />
      <View className="items-center px-2 pt-4">
        <AppText variant="title" align="center">How comfortable are{"\n"}you with repairs?</AppText>
        <AppText variant="body" color={colors.muted} className="mt-2">This helps us tailor guidance to you.</AppText>
      </View>
      <View className="mt-8 gap-4">
        {levels.map(({ id, title, body, icon: Icon, color }) => (
          <SelectableCard key={id} selected={diyLevel === id} onPress={() => setDiyLevel(id)} className="min-h-[130px] flex-row items-center gap-4">
            <View className="h-16 w-16 items-center justify-center rounded-2xl bg-surface-muted dark:bg-dark-surface">
              <Icon color={color} size={36} />
            </View>
            <View className="flex-1">
              <AppText variant="heading">{title}</AppText>
              <AppText variant="caption" className="mt-1.5">{body}</AppText>
            </View>
            {diyLevel === id ? <View className="absolute right-3 top-3 h-6 w-6 items-center justify-center rounded-full bg-brand"><Check color={colors.white} size={15} /></View> : null}
          </SelectableCard>
        ))}
      </View>
    </AppScreen>
  );
}
