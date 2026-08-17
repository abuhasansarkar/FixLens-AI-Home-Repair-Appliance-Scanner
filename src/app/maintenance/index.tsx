import { useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { CalendarCheck, ChevronRight, Crown } from "lucide-react-native";
import { useState } from "react";
import { Pressable, View } from "react-native";

import { AppScreen } from "@/components/ui/app-screen";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Header } from "@/components/ui/header";
import { AppText } from "@/components/ui/typography";
import { serviceReadiness } from "@/config/env";
import { colors } from "@/constants/design";
import { useHome } from "@/features/home/home-context";
import { convexApi } from "@/services/convex-references";

function MaintenanceContent() {
  const router = useRouter(); const { tasks, appliances,history } = useHome(); const [openedAt] = useState(Date.now); const active = tasks.filter((item) => !item.completed);
  return <AppScreen><Header title="Maintenance" /><Card className="mt-4 flex-row items-center gap-4"><View className="h-16 w-16 items-center justify-center rounded-full bg-brand-soft dark:bg-dark-brand-soft"><CalendarCheck color={colors.brand} size={32} /></View><View className="flex-1"><AppText variant="title">{active.length} tasks due soon</AppText><AppText variant="caption">Stay on top of maintenance to keep appliances running well.</AppText></View></Card><AppText variant="heading" className="mt-7">Upcoming</AppText><View className="mt-3 gap-3">{active.map((task) => { const appliance = appliances.find((item) => item.id === task.applianceId); const days = Math.max(0, Math.ceil((task.dueAt - openedAt) / 86_400_000)); return <Pressable accessibilityRole="button" key={task.id} className="flex-row items-center rounded-card border border-line bg-surface p-4 dark:border-dark-line dark:bg-dark-surface" onPress={() => router.push({ pathname: "/maintenance/[taskId]", params: { taskId: task.id } })}><View className="h-14 w-14 items-center justify-center rounded-control bg-brand-soft dark:bg-dark-brand-soft"><CalendarCheck color={colors.brand} size={27} /></View><View className="ml-3 flex-1"><AppText variant="label">{appliance?.name ?? "Appliance"}</AppText><AppText variant="body">{task.title}</AppText><View className="mt-1 self-start rounded-full bg-caution-soft px-2 py-1 dark:bg-dark-caution-soft"><AppText variant="caption" color={colors.caution}>{days} days</AppText></View></View><ChevronRight color={colors.muted} size={20} /></Pressable>; })}{!active.length ? <View className="items-center py-10"><CalendarCheck color={colors.safe} size={48} /><AppText variant="heading" className="mt-3">You’re all caught up</AppText><AppText variant="caption" className="mt-1">New tasks appear when eligible appliances are added.</AppText></View> : null}</View><AppText variant="heading" className="mt-7">Recent completions</AppText><View className="mt-3 gap-2">{history.map((record)=><View key={record.id} className="rounded-control border border-line bg-surface p-4 dark:border-dark-line dark:bg-dark-surface"><AppText variant="label">{record.title}</AppText><AppText variant="caption">Completed {new Date(record.completedAt).toLocaleDateString()}</AppText></View>)}{!history.length?<AppText variant="body" color={colors.muted} align="center" className="py-6">Completed maintenance will appear here.</AppText>:null}</View></AppScreen>;
}

function ConnectedMaintenance() {
  const router = useRouter();
  const subscription = useQuery(convexApi.subscriptions.current, {});
  if (subscription === undefined) return <AppScreen><Header title="Maintenance" /><AppText variant="body" align="center" className="mt-16">Checking your plan…</AppText></AppScreen>;
  if (!subscription?.active || subscription.entitlement !== "pro") return <AppScreen footer={<Button label="View FixLens Pro" onPress={() => router.push("/subscription/paywall")} />}><Header title="Maintenance" /><View className="items-center py-16"><View className="h-20 w-20 items-center justify-center rounded-3xl bg-brand-soft dark:bg-dark-brand-soft"><Crown color={colors.brand} size={40} /></View><AppText variant="title" align="center" className="mt-6">Maintenance is included with Pro</AppText><AppText variant="body" align="center" color={colors.muted} className="mt-2">Create recurring appliance tasks and receive reminders before they’re due.</AppText></View></AppScreen>;
  return <MaintenanceContent />;
}

export default function MaintenanceScreen() {
  return serviceReadiness.authentication && serviceReadiness.backend ? <ConnectedMaintenance /> : <MaintenanceContent />;
}
