import { useRouter } from "expo-router";
import { BookOpenCheck, Check, ShieldCheck, Wrench } from "lucide-react-native";
import { useState } from "react";
import { Pressable, View } from "react-native";

import { AppScreen } from "@/components/ui/app-screen";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Header } from "@/components/ui/header";
import { AppText } from "@/components/ui/typography";
import { colors } from "@/constants/design";
import { useRepair } from "@/features/repairs/repair-context";

export default function RepairOverviewScreen() {
  const router = useRouter(); const { active } = useRepair(); const available = Boolean(active.steps?.length); const [confirmed, setConfirmed] = useState<number[]>([]);
  const checks = ["I read the appliance manual for model-specific warnings", "Children and pets are away from the work area", "I will use only the tools called for by each step", "I will stop for water, gas, smoke, heat, sparks, or damaged wiring"];
  const ready = available && confirmed.length === checks.length;
  const metrics = [
    { label: "Difficulty", value: active.difficulty ?? "Not estimated" },
    { label: "Estimated time", value: active.estimatedMinutes ? `${active.estimatedMinutes.minimum}–${active.estimatedMinutes.maximum} min` : "Not estimated" },
    { label: "Estimated cost", value: active.estimatedCost ? `${active.estimatedCost.currency} ${active.estimatedCost.minimum}–${active.estimatedCost.maximum}` : "Not estimated" },
  ];
  return <AppScreen footer={<View className="gap-3"><Button label="I’m Ready" disabled={!ready} onPress={() => router.push("/repair/step")} /><Button label="View Tools & Parts" variant="secondary" onPress={() => router.push("/repair/tools")} /></View>}><Header title="Repair Overview" /><View className="mt-4 flex-row items-center gap-4"><View className="h-24 w-24 items-center justify-center rounded-card bg-brand-soft dark:bg-dark-brand-soft"><Wrench color={colors.brand} size={42} /></View><View className="flex-1"><AppText variant="heading">{active.issue}</AppText><AppText variant="body" color={colors.muted} className="mt-1">{active.appliance} · {active.steps?.length ?? 0} tailored steps</AppText></View></View><Card className="mt-4 flex-row p-0">{metrics.map((metric,index)=><View key={metric.label} className={index?"min-h-[82px] flex-1 items-center justify-center border-l border-line px-2 dark:border-dark-line":"min-h-[82px] flex-1 items-center justify-center px-2"}><AppText variant="caption" align="center">{metric.label}</AppText><AppText variant="label" align="center" color={index===0?colors.safe:colors.ink} className="mt-1">{metric.value}</AppText></View>)}</Card><AppText variant="heading" className="mt-6">Confirm before you start</AppText><Card className="mt-3 p-0">{checks.map((label, index) => { const checked = confirmed.includes(index); return <Pressable accessibilityRole="checkbox" accessibilityState={{ checked }} key={label} className={index ? "min-h-[70px] flex-row items-center gap-3 border-t border-line px-4 dark:border-dark-line" : "min-h-[70px] flex-row items-center gap-3 px-4"} onPress={() => setConfirmed((current) => checked ? current.filter((item) => item !== index) : [...current, index])}>{index === 0 ? <BookOpenCheck color={colors.muted} size={20} /> : <ShieldCheck color={colors.muted} size={20} />}<AppText variant="body" className="flex-1">{label}</AppText><View className={checked ? "h-7 w-7 items-center justify-center rounded-full bg-safe" : "h-7 w-7 rounded-full border border-line dark:border-dark-line"}>{checked ? <Check color={colors.white} size={18} /> : null}</View></Pressable>; })}</Card>{!available ? <Card className="mt-5 border-danger bg-danger-soft dark:bg-dark-danger-soft"><AppText variant="label" color={colors.danger}>No diagnosis-specific guide is available. Generic repair steps are intentionally withheld.</AppText></Card> : null}</AppScreen>;
}
