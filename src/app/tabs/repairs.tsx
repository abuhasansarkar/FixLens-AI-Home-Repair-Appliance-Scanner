import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { ChevronRight, Search } from "lucide-react-native";
import { useMemo, useState } from "react";
import { Pressable, TextInput, View } from "react-native";

import { BrandMark } from "@/components/brand-mark";
import { AppScreen } from "@/components/ui/app-screen";
import { Button } from "@/components/ui/button";
import { AppText } from "@/components/ui/typography";
import { colors, useThemeColors } from "@/constants/design";
import { type RepairStatus, useRepair } from "@/features/repairs/repair-context";

const washer = require("../../../assets/images/fixlens/washer-hero.png");

type Filter = "all" | RepairStatus;

export default function RepairsScreen() {
  const router = useRouter();
  const theme = useThemeColors();
  const { repairs, activate, canLoadMore, loadMore } = useRepair();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const visible = useMemo(
    () => repairs.filter((item) =>
      (filter === "all" || item.status === filter)
      && `${item.appliance} ${item.issue}`.toLowerCase().includes(query.toLowerCase())),
    [repairs, query, filter],
  );

  return (
    <AppScreen>
      <BrandMark compact />
      <AppText variant="title" className="mt-6">Repairs</AppText>
      <View className="mt-4 flex-row items-center rounded-control border border-line bg-surface px-3 dark:border-dark-line dark:bg-dark-surface">
        <Search color={theme.muted} size={20} />
        <TextInput
          accessibilityLabel="Search repairs"
          className="min-h-[52px] flex-1 px-3 text-base text-ink dark:text-dark-ink"
          placeholder="Search loaded repairs"
          placeholderTextColor={theme.subtle}
          value={query}
          onChangeText={setQuery}
        />
      </View>
      <View className="mt-3 flex-row gap-2">
        {(["all", "active", "fixed", "saved"] as Filter[]).map((item) => (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: filter === item }}
            key={item}
            className={filter === item
              ? "min-h-12 flex-1 items-center justify-center rounded-control bg-brand px-1"
              : "min-h-12 flex-1 items-center justify-center rounded-control border border-line bg-surface px-1 dark:border-dark-line dark:bg-dark-surface"}
            onPress={() => setFilter(item)}
          >
            <AppText variant="label" align="center" color={filter === item ? colors.white : colors.ink}>
              {item[0].toUpperCase() + item.slice(1)}
            </AppText>
          </Pressable>
        ))}
      </View>

      <View className="mt-5 gap-3">
        {visible.map((repair) => {
          const hasWasherArtwork = /washer|washing|laundry/i.test(repair.appliance);
          return (
            <Pressable
              accessibilityRole="button"
              key={repair.id}
              className="flex-row items-center rounded-card border border-line bg-surface p-3 shadow-sm shadow-black/5 dark:border-dark-line dark:bg-dark-surface dark:shadow-none"
              onPress={() => {
                activate(repair.id);
                router.push({ pathname: "/repairs/[repairId]", params: { repairId: repair.id } });
              }}
            >
              {hasWasherArtwork ? (
                <Image
                  source={washer}
                  contentFit="cover"
                  accessibilityLabel={`${repair.appliance} repair thumbnail`}
                  style={{ width: 72, height: 72, borderRadius: 14 }}
                  className="h-[72px] w-[72px] rounded-control"
                />
              ) : (
                <View className="h-[72px] w-[72px] items-center justify-center rounded-control bg-brand-soft dark:bg-dark-brand-soft">
                  <AppText variant="title" color={colors.brand}>{repair.appliance.charAt(0).toUpperCase()}</AppText>
                </View>
              )}
              <View className="ml-3 flex-1">
                <AppText variant="heading">{repair.appliance}</AppText>
                <AppText variant="body">{repair.issue}</AppText>
                <View className={repair.status === "fixed"
                  ? "mt-2 self-start rounded-full bg-safe-soft px-2 py-1 dark:bg-dark-safe-soft"
                  : "mt-2 self-start rounded-full bg-caution-soft px-2 py-1 dark:bg-dark-caution-soft"}
                >
                  <AppText variant="caption" color={repair.status === "fixed" ? colors.safe : colors.caution}>
                    {repair.status}
                  </AppText>
                </View>
              </View>
              <ChevronRight color={theme.muted} size={20} />
            </Pressable>
          );
        })}
        {!visible.length ? (
          <View className="items-center py-16">
            <AppText variant="heading">No matching repairs</AppText>
            <AppText variant="caption" className="mt-2">Completed and saved repairs appear here.</AppText>
          </View>
        ) : null}
        {canLoadMore ? <Button label="Load more repairs" variant="secondary" onPress={loadMore} /> : null}
      </View>
    </AppScreen>
  );
}
