import { Tabs, useRouter } from "expo-router";
import { Camera, Home, LayoutGrid, UserRound, Wrench } from "lucide-react-native";
import { Platform, Pressable, useColorScheme, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, darkColors } from "@/constants/design";

export default function TabsLayout() {
  const router = useRouter();
  const isDark = useColorScheme() === "dark";
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, Platform.OS === "ios" ? 24 : 14);
  const tabHeight = 58 + bottomPadding;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: isDark ? darkColors.muted : colors.muted,
        tabBarStyle: {
          backgroundColor: isDark ? darkColors.surface : colors.surface,
          borderTopColor: isDark ? darkColors.line : colors.line,
          height: tabHeight,
          paddingTop: 8,
          paddingBottom: bottomPadding,
        },
        tabBarItemStyle: {
          paddingVertical: 2,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ color, focused }) => (
            <Home color={color} size={23} strokeWidth={focused ? 2.5 : 2} />
          ),
        }}
      />
      <Tabs.Screen
        name="repairs"
        options={{
          title: "Repairs",
          tabBarIcon: ({ color, focused }) => (
            <Wrench color={color} size={23} strokeWidth={focused ? 2.5 : 2} />
          ),
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          title: "Scan",
          tabBarButton: () => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Scan a problem"
              className="flex-1 items-center justify-center -top-3.5"
              onPress={() => router.push("/scan/camera")}
            >
              <View className="h-14 w-14 items-center justify-center rounded-full bg-brand shadow-lg shadow-brand/35 border-[3.5px] border-surface dark:border-dark-surface">
                <Camera color={colors.white} size={26} strokeWidth={2.2} />
              </View>
            </Pressable>
          ),
        }}
      />
      <Tabs.Screen
        name="my-home"
        options={{
          title: "Appliances",
          tabBarIcon: ({ color, focused }) => (
            <LayoutGrid color={color} size={23} strokeWidth={focused ? 2.5 : 2} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, focused }) => (
            <UserRound color={color} size={23} strokeWidth={focused ? 2.5 : 2} />
          ),
        }}
      />
    </Tabs>
  );
}
