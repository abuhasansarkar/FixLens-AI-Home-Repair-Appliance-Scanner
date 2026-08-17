import { useQuery } from "convex/react";
import { Sparkles } from "lucide-react-native";
import { View } from "react-native";

import { AppScreen } from "@/components/ui/app-screen";
import { Card } from "@/components/ui/card";
import { Header } from "@/components/ui/header";
import { AppText } from "@/components/ui/typography";
import { serviceReadiness } from "@/config/env";
import { colors } from "@/constants/design";
import { convexApi } from "@/services/convex-references";
import type { UsageSummary } from "@/types/contracts";

function UsageContent({ summary, loading = false }: { summary?: UsageSummary; loading?: boolean }) {
  const used = summary?.used ?? 0;
  const total = summary?.limit ?? 3;
  const remaining = Math.max(0, total - used);
  const pro = summary?.entitlement === "pro";

  return <AppScreen>
    <Header title="AI Diagnoses" />
    <Card className="mt-5 items-center py-9">
      <AppText variant="body">Your AI Diagnoses</AppText>
      <View className="mt-2 flex-row items-end"><AppText variant="display">{loading ? "—" : remaining}</AppText><AppText variant="heading"> remaining</AppText></View>
      <AppText variant="body">of {total} {pro ? "this UTC month" : "lifetime Free diagnoses"}</AppText>
      <View className="mt-7 h-3 w-full overflow-hidden rounded-full bg-line"><View className="h-full rounded-full bg-brand" style={{ width: `${Math.min(100, used / total * 100)}%` }} /></View>
      <View className="mt-3 w-full flex-row justify-between"><AppText variant="caption">{used} used</AppText><AppText variant="caption">{total} total</AppText></View>
      {summary?.reserved ? <AppText variant="caption" color={colors.caution} className="mt-3">{summary.reserved} diagnosis currently processing</AppText> : null}
      {pro && summary?.resetsAt ? <AppText variant="caption" className="mt-2">Resets at 00:00 UTC on {new Date(summary.resetsAt).toLocaleDateString()}</AppText> : null}
    </Card>
    {!serviceReadiness.backend ? <AppText variant="caption" color={colors.caution} className="mt-3">Development preview: configure Clerk and Convex to load authoritative usage.</AppText> : null}
    <Card className="mt-7 flex-row gap-4 border-[#BBD3FF]"><Sparkles color={colors.brand} size={28} /><View className="flex-1"><AppText variant="heading">Photos in one session share one diagnosis</AppText><AppText variant="body" color={colors.muted} className="mt-2">Additional evidence and clarification for the same active problem do not consume another diagnosis.</AppText></View></Card>
  </AppScreen>;
}

function ConnectedUsage() {
  const summary = useQuery(convexApi.usage.summary, {});
  return <UsageContent summary={summary} loading={summary === undefined} />;
}

export default function UsageScreen() {
  return serviceReadiness.authentication && serviceReadiness.backend ? <ConnectedUsage /> : <UsageContent />;
}
