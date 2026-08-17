import { useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { Sparkles, X } from "lucide-react-native";
import { Pressable, View } from "react-native";

import { AppScreen } from "@/components/ui/app-screen";
import { Button } from "@/components/ui/button";
import { AppText } from "@/components/ui/typography";
import { serviceReadiness } from "@/config/env";
import { colors } from "@/constants/design";
import { convexApi } from "@/services/convex-references";
import type { UsageSummary } from "@/types/contracts";

import { safeGoBack } from "@/utils/navigation";

function LimitContent({ summary }: { summary?: UsageSummary }) {
  const router = useRouter(); const pro = summary?.entitlement === "pro"; const used = summary?.used ?? 3; const limit = summary?.limit ?? 3;
  return <AppScreen scroll={false}><View className="flex-row justify-end"><Pressable accessibilityLabel="Close" className="h-11 w-11 items-center justify-center" onPress={() => safeGoBack(router, "/tabs/home")}><X color={colors.ink} size={22}/></Pressable></View><View className="flex-1 items-center justify-center"><Sparkles color={colors.brand} size={64}/><AppText variant="title" align="center" className="mt-7">{pro ? "This month’s diagnoses are used." : "You’ve used your free diagnoses."}</AppText><AppText variant="body" align="center" color={colors.muted} className="mt-3">{pro && summary?.resetsAt ? `Your allowance resets at 00:00 UTC on ${new Date(summary.resetsAt).toLocaleDateString()}.` : "Upgrade for 15 AI diagnoses each UTC calendar month."}</AppText><View className="mt-8 w-full rounded-card border border-line bg-surface p-4 dark:border-dark-line dark:bg-dark-surface"><View className="flex-row justify-between"><AppText variant="body">Diagnoses used</AppText><AppText variant="label" color={colors.brand}>{used} of {limit}</AppText></View>{summary?.reserved ? <AppText variant="caption" color={colors.caution} className="mt-2">{summary.reserved} diagnosis currently processing</AppText> : null}</View><View className="mt-8 w-full gap-3">{pro ? <Button label="View AI Usage" onPress={() => router.replace("/subscription/usage")} /> : <Button label="See FixLens Pro" onPress={() => router.replace("/subscription/paywall")} />}<Button label="Not Now" variant="secondary" onPress={() => safeGoBack(router, "/tabs/home")}/></View></View></AppScreen>;
}
function ConnectedLimit() { const summary = useQuery(convexApi.usage.summary, {}); return <LimitContent summary={summary} />; }
export default function LimitScreen() { return serviceReadiness.authentication && serviceReadiness.backend ? <ConnectedLimit /> : <LimitContent />; }
