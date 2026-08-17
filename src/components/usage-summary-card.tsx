import { useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { ChevronRight, Crown } from "lucide-react-native";
import { Pressable, View } from "react-native";

import { AppText } from "@/components/ui/typography";
import { colors } from "@/constants/design";
import { convexApi } from "@/services/convex-references";

export function UsageSummaryCard() {
  const usage = useQuery(convexApi.usage.summary, {});
  const router = useRouter();
  if (!usage) return <View className="mt-4 h-20 rounded-card bg-line/30 dark:bg-dark-line/40" accessibilityLabel="Loading diagnosis usage"/>;
  const reserved=usage.reserved??0;const remaining=Math.max(0,usage.limit-usage.used-reserved);
  return <Pressable accessibilityRole="button" accessibilityLabel={`View AI usage, ${remaining} diagnoses remaining`} className="mt-4 flex-row items-center rounded-card border border-line bg-surface p-4 dark:border-dark-line dark:bg-dark-surface" onPress={()=>router.push("/subscription/usage")}><View className="h-11 w-11 items-center justify-center rounded-xl bg-brand-soft dark:bg-dark-brand-soft"><Crown color={colors.brand} size={22}/></View><View className="ml-3 flex-1"><AppText variant="label">{usage.entitlement==="pro"?"FixLens Pro":"FixLens Free"}</AppText><AppText variant="caption">{remaining} of {usage.limit} diagnoses remaining{reserved?` · ${reserved} processing`:""}</AppText></View><ChevronRight color={colors.muted} size={19}/></Pressable>;
}
