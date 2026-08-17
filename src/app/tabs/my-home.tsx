import { useRouter } from "expo-router";
import { ChevronRight, Plus, Settings2 } from "lucide-react-native";
import { Pressable, View } from "react-native";

import { BrandMark } from "@/components/brand-mark";
import { AppScreen } from "@/components/ui/app-screen";
import { Button } from "@/components/ui/button";
import { AppText } from "@/components/ui/typography";
import { colors, useThemeColors } from "@/constants/design";
import { useHome } from "@/features/home/home-context";
import { useRepair } from "@/features/repairs/repair-context";

export default function MyHomeScreen() {
  const router = useRouter();
  const theme = useThemeColors();
  const { appliances, tasks, canAddAppliance } = useHome();
  const { repairs } = useRepair();
  const rooms = [...new Set(appliances.map((item) => item.room))];

  return (
    <AppScreen>
      <BrandMark compact />
      <View className="mt-6 flex-row items-center">
        <AppText variant="title" className="flex-1">Appliances</AppText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Manage home and rooms"
          className="h-11 w-11 items-center justify-center rounded-full border border-line dark:border-dark-line"
          onPress={() => router.push("/home/manage")}
        >
          <Settings2 color={theme.ink} size={20} />
        </Pressable>
      </View>
      <AppText variant="body" color={theme.muted}>
        Keep your appliances, repairs, and maintenance in one place.
      </AppText>

      <View className="mt-5 flex-row rounded-card border border-line bg-surface py-5 dark:border-dark-line dark:bg-dark-surface">
        {[
          [appliances.length, "Appliances"],
          [repairs.length, "Repairs"],
          [tasks.filter((item) => !item.completed).length, "Due"],
        ].map(([value, label], index) => (
          <View
            key={String(label)}
            className={index ? "flex-1 items-center border-l border-line dark:border-dark-line" : "flex-1 items-center"}
          >
            <AppText variant="title" color={label === "Due" ? colors.danger : theme.ink}>
              {String(value)}
            </AppText>
            <AppText variant="caption">{String(label)}</AppText>
          </View>
        ))}
      </View>

      <View className="mt-3">
        <Button
          label={canAddAppliance ? "Add Appliance" : "Unlock Unlimited Appliances"}
          icon={<Plus color={colors.white} size={20} />}
          onPress={() => router.push(canAddAppliance ? "/appliance/add" : "/subscription/paywall")}
        />
      </View>

      {rooms.map((room) => (
        <View key={room} className="mt-6">
          <View className="mb-2 flex-row justify-between">
            <AppText variant="heading">{room}</AppText>
            <AppText variant="caption">
              {appliances.filter((item) => item.room === room).length} appliances
            </AppText>
          </View>
          <View className="overflow-hidden rounded-card border border-line bg-surface dark:border-dark-line dark:bg-dark-surface">
            {appliances
              .filter((item) => item.room === room)
              .map((item, index) => (
                <Pressable
                  key={item.id}
                  className={index ? "min-h-[68px] flex-row items-center gap-3 border-t border-line px-4 dark:border-dark-line" : "min-h-[68px] flex-row items-center gap-3 px-4"}
                  onPress={() => router.push({ pathname: "/appliance/[applianceId]", params: { applianceId: item.id } })}
                >
                  <View className="h-12 w-12 items-center justify-center rounded-control bg-brand-soft dark:bg-dark-brand-soft">
                    <AppText variant="heading" color={colors.brand}>{item.name[0]}</AppText>
                  </View>
                  <View className="flex-1">
                    <AppText variant="label">{item.name}</AppText>
                    <AppText variant="caption">{item.brand} · {item.model}</AppText>
                  </View>
                  <ChevronRight color={theme.muted} size={19} />
                </Pressable>
              ))}
          </View>
        </View>
      ))}

      {!appliances.length ? (
        <View className="items-center py-16">
          <AppText variant="heading">No appliances yet</AppText>
          <AppText variant="body" align="center" color={theme.muted} className="mt-2">
            Add your first appliance to track repairs and maintenance.
          </AppText>
        </View>
      ) : null}
    </AppScreen>
  );
}
