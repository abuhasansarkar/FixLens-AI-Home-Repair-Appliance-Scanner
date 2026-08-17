import type { BottomTabBarProps } from "expo-router/build/react-navigation/bottom-tabs";
import { useRouter } from "expo-router";
import { Camera, Home, LayoutGrid, UserRound, Wrench } from "lucide-react-native";
import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText } from "@/components/ui/typography";
import { colors } from "@/constants/design";

const items = {
  home: { label: "Home", icon: Home },
  repairs: { label: "Repairs", icon: Wrench },
  scan: { label: "Scan", icon: Camera },
  "my-home": { label: "Appliances", icon: LayoutGrid },
  profile: { label: "Profile", icon: UserRound },
} as const;

export function FixLensTabBar({ state, navigation }: BottomTabBarProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View
      className="flex-row border-t border-line dark:border-dark-line bg-surface dark:bg-dark-surface px-2 pt-2"
      style={{ paddingBottom: Math.max(insets.bottom, 8) }}
    >
      {state.routes.map((route, index) => {
        const item = items[route.name as keyof typeof items];
        if (!item) return null;
        const selected = state.index === index;
        const Icon = item.icon;
        const isScan = route.name === "scan";

        return (
          <Pressable
            key={route.key}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={item.label}
            className="min-h-[54px] flex-1 items-center justify-end"
            onPress={() => {
              if (isScan) {
                router.push("/scan/camera");
                return;
              }
              navigation.navigate(route.name, route.params);
            }}
          >
            <View className={isScan ? "absolute -top-7 h-14 w-14 items-center justify-center rounded-full border-4 border-white bg-brand" : "h-7 items-center justify-center"}>
              <Icon color={isScan ? colors.white : selected ? colors.brand : colors.muted} size={isScan ? 25 : 22} strokeWidth={selected ? 2.5 : 2} />
            </View>
            <AppText variant="caption" color={selected || isScan ? colors.brand : colors.muted}>{item.label}</AppText>
          </Pressable>
        );
      })}
    </View>
  );
}
