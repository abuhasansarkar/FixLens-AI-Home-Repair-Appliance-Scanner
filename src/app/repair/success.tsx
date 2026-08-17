import { useRouter } from "expo-router";
import { Check, CircleDollarSign, Clock3, Footprints } from "lucide-react-native";
import { View } from "react-native";

import { AppScreen } from "@/components/ui/app-screen";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AppText } from "@/components/ui/typography";
import { colors } from "@/constants/design";
import { useRepair } from "@/features/repairs/repair-context";

export default function RepairSuccessScreen() {
  const router = useRouter();
  const { active, save } = useRepair();
  const metrics = [
    {
      label: "Time",
      value: active.actualMinutes !== undefined ? `${active.actualMinutes} min` : "—",
      icon: Clock3,
    },
    {
      label: "Cost",
      value: active.actualCost !== undefined ? active.actualCost.toLocaleString() : "—",
      icon: CircleDollarSign,
    },
    { label: "Steps", value: String(active.completedSteps.length), icon: Footprints },
  ];

  return (
    <AppScreen contentClassName="justify-center py-8">
      <View className="items-center">
        <View className="h-24 w-24 items-center justify-center rounded-3xl bg-brand">
          <Check color={colors.white} size={50} />
        </View>
        <AppText variant="title" className="mt-7">Nice work.</AppText>
        <AppText variant="body">You marked this repair as fixed.</AppText>

        <Card className="mt-8 w-full p-0">
          <View className="p-4">
            <AppText variant="heading">{active.appliance}</AppText>
            <AppText variant="body">{active.issue}</AppText>
            <View className="mt-3 self-start rounded-full bg-safe-soft px-3 py-1 dark:bg-dark-safe-soft">
              <AppText variant="caption" color={colors.safe}>Fixed · Today</AppText>
            </View>
          </View>
          <View className="flex-row border-t border-line dark:border-dark-line">
            {metrics.map(({ label, value, icon: Icon }, index) => (
              <View
                key={label}
                className={index
                  ? "min-h-[92px] flex-1 items-center justify-center border-l border-line px-2 dark:border-dark-line"
                  : "min-h-[92px] flex-1 items-center justify-center px-2"}
              >
                <Icon color={colors.ink} size={20} />
                <AppText variant="label" className="mt-1">{value}</AppText>
                <AppText variant="caption">{label}</AppText>
              </View>
            ))}
          </View>
        </Card>

        <View className="mt-7 w-full gap-3">
          <Button
            label="Save Repair"
            onPress={() => {
              void save().then(() => router.replace("/tabs/repairs"));
            }}
          />
          <Button label="Back Home" variant="secondary" onPress={() => router.replace("/tabs/home")} />
        </View>
      </View>
    </AppScreen>
  );
}
