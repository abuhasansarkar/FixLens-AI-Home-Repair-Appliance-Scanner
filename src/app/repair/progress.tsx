import { useRouter } from "expo-router";
import { Check } from "lucide-react-native";
import { Pressable, View } from "react-native";

import { BrandMark } from "@/components/brand-mark";
import { AppScreen } from "@/components/ui/app-screen";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/ui/header";
import { AppText } from "@/components/ui/typography";
import { colors } from "@/constants/design";
import { useRepair } from "@/features/repairs/repair-context";

export default function RepairProgressScreen() {
  const router = useRouter();
  const { active, setStep, save } = useRepair();
  const steps = active.steps ?? [];
  return <AppScreen footer={<View className="gap-2"><Button label="Continue Repair" disabled={!steps.length} onPress={() => router.push("/repair/step")} /><Button label="Save & Exit" variant="ghost" onPress={() => { void save().then(() => router.replace("/tabs/repairs")); }} /></View>}>
    <Header center={<BrandMark compact />} />
    <AppText variant="title" className="mt-5">Repair Progress</AppText><AppText variant="caption">{active.appliance} · {active.issue}</AppText>
    <View className="mt-7">{steps.map((item, index) => { const number = index + 1; const done = active.completedSteps.includes(number); const current = active.currentStep === number; const locked = number > active.currentStep && !done; return <Pressable accessibilityRole="button" accessibilityState={{ disabled: locked }} disabled={locked} key={`${number}-${item.title}`} className={current ? "mb-3 min-h-[104px] flex-row gap-4 rounded-card border border-[#BBD3FF] bg-brand-soft p-4 dark:bg-dark-brand-soft" : locked ? "mb-3 min-h-[76px] flex-row gap-4 px-4 py-3 opacity-45" : "mb-3 min-h-[76px] flex-row gap-4 px-4 py-3"} onPress={() => { setStep(number); router.push("/repair/step"); }}><View className={done ? "h-9 w-9 items-center justify-center rounded-full bg-brand" : current ? "h-9 w-9 items-center justify-center rounded-full border-2 border-brand bg-surface dark:bg-dark-surface" : "h-9 w-9 items-center justify-center rounded-full border border-line bg-surface dark:border-dark-line dark:bg-dark-surface"}>{done ? <Check color={colors.white} size={20} /> : <AppText variant="label" color={current ? colors.brand : colors.muted}>{number}</AppText>}</View><View className="flex-1"><AppText variant="label">{item.title}</AppText><AppText variant="caption" color={done ? colors.safe : current ? colors.brand : colors.muted}>{done ? "Completed" : current ? "In progress" : "Pending"}</AppText>{current ? <AppText variant="caption" className="mt-2">{item.body}</AppText> : null}</View></Pressable>; })}</View>
  </AppScreen>;
}
