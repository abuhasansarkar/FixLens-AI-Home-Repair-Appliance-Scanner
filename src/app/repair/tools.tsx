import { useRouter } from "expo-router";
import { Check, PackageCheck, Wrench } from "lucide-react-native";
import { View } from "react-native";

import { AppScreen } from "@/components/ui/app-screen";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Header } from "@/components/ui/header";
import { AppText } from "@/components/ui/typography";
import { colors } from "@/constants/design";
import { useRepair } from "@/features/repairs/repair-context";

import { safeGoBack } from "@/utils/navigation";

export default function ToolsScreen() {
  const router = useRouter(); const { active } = useRepair(); const tools = active.tools ?? []; const parts = active.parts ?? [];
  return <AppScreen footer={<Button label="Back to Repair" onPress={() => safeGoBack(router, "/tabs/repairs")} />}><Header title="Tools & Parts" fallbackHref="/tabs/repairs" /><AppText variant="caption" align="center">{active.appliance} · {active.issue}</AppText><AppText variant="heading" className="mt-7">Required Tools</AppText><View className="mt-3 flex-row flex-wrap justify-between gap-y-3">{tools.map((name) => <Card key={name} className="h-[130px] w-[48%] items-center justify-center border-[#BBD3FF]"><View className="absolute right-2 top-2 h-6 w-6 items-center justify-center rounded-full bg-brand"><Check color={colors.white} size={15} /></View><Wrench color={colors.ink} size={40} /><AppText variant="label" align="center" className="mt-3">{name}</AppText></Card>)}{!tools.length ? <AppText variant="body" color={colors.muted}>No tools were specified by the validated guide.</AppText> : null}</View><AppText variant="heading" className="mt-7">Possible Replacement Parts</AppText><View className="mt-3 gap-3">{parts.map((part) => <Card key={part.name} className="flex-row items-center gap-4"><PackageCheck color={colors.brand} size={45} /><View className="flex-1"><AppText variant="label">{part.name}</AppText><AppText variant="caption" className="mt-1">{part.compatibilityNote}</AppText><View className="mt-2 rounded-control bg-caution-soft dark:bg-dark-caution-soft p-2"><AppText variant="caption" color={colors.caution}>Verify the exact model with the manufacturer or seller before purchasing.</AppText></View></View></Card>)}{!parts.length ? <AppText variant="body" color={colors.muted}>No replacement part is recommended from the available evidence.</AppText> : null}</View></AppScreen>;
}
