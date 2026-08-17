import { Image } from "expo-image";
import { Bell, Camera, ChevronDown, ChevronRight, Clock3, House, Wrench } from "lucide-react-native";
import { useRouter } from "expo-router";
import { Pressable, View } from "react-native";

import { BrandMark } from "@/components/brand-mark";
import { AppScreen } from "@/components/ui/app-screen";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AppText } from "@/components/ui/typography";
import { colors, useThemeColors } from "@/constants/design";
import { useHome } from "@/features/home/home-context";
import { useRepair } from "@/features/repairs/repair-context";
import { UsageSummaryCard } from "@/components/usage-summary-card";
import { serviceReadiness } from "@/config/env";

const washer = require("../../../assets/images/fixlens/washer-hero.png");

export default function HomeScreen() {
  const router = useRouter();
  const theme = useThemeColors();
  const { appliances, tasks } = useHome();
  const { repairs } = useRepair();

  return (
    <AppScreen contentClassName="pb-8 pt-3">
      <View className="flex-row items-start justify-between">
        <BrandMark compact />
        <Pressable accessibilityLabel="Notifications" className="h-11 w-11 items-center justify-center rounded-full" onPress={() => router.push("/settings/notifications")}>
          <Bell color={theme.ink} size={22} />
          <View className="absolute right-2 top-2 h-2 w-2 rounded-full bg-brand" />
        </Pressable>
      </View>

      <View className="mt-7 flex-row items-center justify-between">
        <AppText variant="heading">Good morning</AppText>
        <Pressable className="flex-row items-center gap-2 rounded-xl border border-line dark:border-dark-line bg-surface dark:bg-dark-surface px-3 py-2" onPress={() => router.push("/tabs/my-home")}>
          <AppText variant="caption" color={theme.ink}>Appliances</AppText>
          <ChevronDown color={theme.ink} size={14} />
        </Pressable>
      </View>

      <Card className="mt-[18px] items-center py-[22px]">
        <AppText variant="title" align="center">What needs fixing?</AppText>
        <View className="my-5 h-16 w-16 items-center justify-center rounded-2xl bg-brand-soft dark:bg-dark-brand-soft">
          <View className="h-11 w-11 items-center justify-center rounded-xl bg-brand"><Camera color={colors.white} size={25} /></View>
        </View>
        <View className="w-full"><Button label="Scan a problem" onPress={() => router.push("/scan/camera")} /></View>
        <AppText variant="caption" className="mt-2">Take a photo and let FixLens analyze it.</AppText>
        <Pressable className="min-h-11 items-center justify-center" onPress={() => router.push("/scan/describe")}><AppText variant="label" color={colors.brand}>Describe instead</AppText></Pressable>
      </Card>
      {serviceReadiness.authentication&&serviceReadiness.backend?<UsageSummaryCard/>:null}

      <Card className="mt-3 flex-row p-0">
        {[
          { value: String(appliances.length), label: appliances.length === 1 ? "Appliance" : "Appliances", icon: House, color: theme.ink },
          { value: String(repairs.length), label: "Repairs", icon: Wrench, color: theme.ink },
          { value: String(tasks.filter((item) => !item.completed).length), label: "Due", icon: Clock3, color: colors.caution },
        ].map(({ value, label, icon: Icon, color }, index) => (
          <View key={label} className={index ? "min-h-[72px] flex-1 items-center justify-center border-l border-line px-2 dark:border-dark-line" : "min-h-[72px] flex-1 items-center justify-center px-2"}>
            <View className="flex-row items-center gap-2"><Icon color={color} size={18} /><AppText variant="heading" color={color}>{value}</AppText></View>
            <AppText variant="caption">{label}</AppText>
          </View>
        ))}
      </Card>

      <View className="mt-7 flex-row items-center justify-between">
        <AppText variant="heading">Recent Repairs</AppText>
        <Pressable onPress={() => router.push("/tabs/repairs")}><AppText variant="label" color={colors.brand}>View all</AppText></Pressable>
      </View>
      {repairs[0] ? <Pressable onPress={() => router.push({ pathname: "/repairs/[repairId]", params: { repairId: repairs[0].id } })} className="mt-3 flex-row items-center rounded-card border border-line dark:border-dark-line bg-surface dark:bg-dark-surface p-3">
        <Image source={washer} contentFit="cover" style={{ width: 68, height: 68, borderRadius: 12 }} className="h-[68px] w-[68px] rounded-xl" />
        <View className="ml-3 flex-1">
          <AppText variant="label">{repairs[0].appliance}</AppText>
          <AppText variant="caption">{repairs[0].issue}</AppText>
          <View className={repairs[0].status === "fixed" ? "mt-1 self-start rounded-full bg-safe-soft dark:bg-dark-safe-soft px-2 py-1" : "mt-1 self-start rounded-full bg-caution-soft dark:bg-dark-caution-soft px-2 py-1"}><AppText variant="caption" color={repairs[0].status === "fixed" ? colors.safe : colors.caution}>{repairs[0].status}</AppText></View>
        </View>
        <ChevronRight color={theme.muted} size={20} />
      </Pressable> : <View className="mt-3 rounded-card border border-line dark:border-dark-line bg-surface dark:bg-dark-surface p-5"><AppText variant="body" align="center" color={theme.muted}>Your saved repairs will appear here.</AppText></View>}
    </AppScreen>
  );
}
