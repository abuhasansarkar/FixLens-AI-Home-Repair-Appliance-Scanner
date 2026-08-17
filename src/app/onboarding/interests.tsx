import { AirVent, Armchair, Bolt, Check, Grid2X2, Hammer, PanelsTopLeft, SquareStack, Waves } from "lucide-react-native";
import { useRouter } from "expo-router";
import { View } from "react-native";

import { AppScreen } from "@/components/ui/app-screen";
import { Button } from "@/components/ui/button";
import { SelectableCard } from "@/components/ui/card";
import { Header } from "@/components/ui/header";
import { AppText } from "@/components/ui/typography";
import { colors } from "@/constants/design";
import { useOnboarding } from "@/features/onboarding/onboarding-context";

const interests = [
  { id: "appliances", title: "Appliances", icon: SquareStack },
  { id: "plumbing", title: "Plumbing", icon: Waves },
  { id: "doors-windows", title: "Doors & Windows", icon: PanelsTopLeft },
  { id: "walls-floors", title: "Walls & Floors", icon: Grid2X2 },
  { id: "furniture", title: "Furniture", icon: Armchair },
  { id: "hvac", title: "HVAC", icon: AirVent },
  { id: "electrical", title: "Electrical Awareness", icon: Bolt },
  { id: "maintenance", title: "Home Maintenance", icon: Hammer },
];

export default function InterestsScreen() {
  const router = useRouter();
  const { interests: selected, toggleInterest } = useOnboarding();

  return (
    <AppScreen footer={<Button label="Continue" disabled={!selected.length} onPress={() => router.push("/onboarding/experience")} />}>
      <Header />
      <View className="items-center px-4 pt-4">
        <AppText variant="title" align="center">What can we help{"\n"}you with?</AppText>
        <AppText variant="body" color={colors.muted} className="mt-2">Select everything that applies.</AppText>
      </View>
      <View className="mt-7 flex-row flex-wrap justify-between gap-y-3">
        {interests.map(({ id, title, icon: Icon }) => {
          const isSelected = selected.includes(id) || selected.includes("everything");
          return (
            <SelectableCard key={id} selected={isSelected} onPress={() => toggleInterest(id)} className="h-[108px] w-[48%] items-center justify-center">
              <Icon color={isSelected ? colors.brand : colors.muted} size={30} />
              <AppText variant="caption" align="center" color={colors.ink} className="mt-2">{title}</AppText>
              {isSelected ? <View className="absolute right-2 top-2 h-5 w-5 items-center justify-center rounded-full bg-brand"><Check color={colors.white} size={13} /></View> : null}
            </SelectableCard>
          );
        })}
      </View>
      <View className="mt-3">
        <SelectableCard selected={selected.includes("everything")} onPress={() => toggleInterest("everything")} className="flex-row items-center justify-center gap-3">
          <Grid2X2 color={colors.muted} size={22} />
          <AppText variant="label">Everything</AppText>
        </SelectableCard>
      </View>
    </AppScreen>
  );
}
