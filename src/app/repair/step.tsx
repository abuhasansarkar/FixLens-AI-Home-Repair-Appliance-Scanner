import { useRouter } from "expo-router";
import { Check, CheckSquare, MessageCircle, Wrench } from "lucide-react-native";
import { useState } from "react";
import { Pressable, View } from "react-native";

import { AppScreen } from "@/components/ui/app-screen";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/ui/header";
import { AppText } from "@/components/ui/typography";
import { colors } from "@/constants/design";
import { useRepair } from "@/features/repairs/repair-context";

import { safeGoBack } from "@/utils/navigation";

export default function RepairStepScreen() {
  const router = useRouter();
  const { active, completeStep } = useRepair();
  const [confirmed, setConfirmed] = useState(false);
  const total = active.steps?.length ?? 0;
  const step = Math.min(active.currentStep, Math.max(1, total));
  const content = active.steps?.[step - 1];

  if (!content) return <AppScreen footer={<Button label="Back to Diagnosis" onPress={() => safeGoBack(router, "/tabs/home")} />}><Header title="Repair Step" fallbackHref="/tabs/home" /><AppText variant="heading" align="center" className="mt-12">No repair guide is available</AppText><AppText variant="body" align="center" color={colors.muted} className="mt-2">For safety, FixLens will not substitute generic steps for a missing diagnosis guide.</AppText></AppScreen>;

  const next = async () => { await completeStep(step); setConfirmed(false); router.replace(step >= total ? "/repair/complete" : "/repair/progress"); };
  return <AppScreen footer={<View className="gap-3"><Button label={step >= total ? "Finish Repair" : "Next Step"} disabled={!confirmed} onPress={next} /><Button label="Ask FixLens about this step" variant="secondary" icon={<MessageCircle color={colors.brand} size={19} />} onPress={() => router.push("/repair/assistant")} /></View>}>
    <Header title="Repair Step" />
    <AppText variant="body" className="mt-4">Step {step} of {total}</AppText>
    <View className="mt-3 h-1.5 overflow-hidden rounded-full bg-line"><View className="h-full rounded-full bg-brand" style={{ width: `${step / total * 100}%` }} /></View>
    <AppText variant="title" className="mt-7">{content.title}</AppText>
    <AppText variant="body" color={colors.muted} className="mt-3">{content.body}</AppText>
    <View className="mt-6 h-[250px] items-center justify-center rounded-hero bg-brand-soft dark:bg-dark-brand-soft"><Wrench color={colors.brand} size={82} /><AppText variant="caption" className="mt-3">Follow the manufacturer manual when locations differ.</AppText></View>
    {content.safety ? <View className="mt-4 flex-row gap-3 rounded-control border border-[#B9E4C7] bg-safe-soft dark:bg-dark-safe-soft p-4"><CheckSquare color={colors.safe} size={22} /><View className="flex-1"><AppText variant="label" color={colors.safe}>Safety tip</AppText><AppText variant="caption">{content.safety}</AppText></View></View> : null}
    <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: confirmed }} className="mt-4 min-h-[58px] flex-row items-center gap-3 rounded-control border border-line bg-surface px-4 dark:border-dark-line dark:bg-dark-surface" onPress={() => setConfirmed((value) => !value)}><View className={confirmed ? "h-6 w-6 items-center justify-center rounded-md bg-brand" : "h-6 w-6 rounded-md border border-line dark:border-dark-line"}>{confirmed ? <Check color={colors.white} size={16} /> : null}</View><AppText variant="body" className="flex-1">I have completed this step</AppText></Pressable>
  </AppScreen>;
}
