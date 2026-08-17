import { CircleHelp, Droplets, Gauge, MoveRight } from "lucide-react-native";
import { View } from "react-native";

import { FeatureScreen } from "@/components/onboarding/feature-screen";
import { Card } from "@/components/ui/card";
import { AppText } from "@/components/ui/typography";
import { colors } from "@/constants/design";

const rows = [
  { icon: Gauge, label: "Likely cause", value: "Kinked inlet hose" },
  { icon: Droplets, label: "Confidence", value: "High" },
  { icon: CircleHelp, label: "What it means", value: "Water flow may be restricted" },
  { icon: MoveRight, label: "Check next", value: "Inspect the inlet hose" },
];

export default function UnderstandFeatureScreen() {
  return (
    <FeatureScreen
      step={2}
      title="Understand what’s wrong."
      body="FixLens explains possible causes in plain language."
      next="/onboarding/repair"
      illustration={
        <Card className="w-full p-[18px]">
          <View className="mb-5 flex-row items-center gap-3">
            <View className="h-12 w-12 items-center justify-center rounded-full bg-brand-soft dark:bg-dark-brand-soft">
              <Droplets color={colors.brand} size={23} />
            </View>
            <View className="flex-1">
              <AppText variant="heading">Water Supply Issue</AppText>
              <AppText variant="caption">The appliance may not be getting enough water.</AppText>
            </View>
            <View className="rounded-full bg-caution-soft dark:bg-dark-caution-soft px-3 py-1">
              <AppText variant="caption" color={colors.caution}>Moderate</AppText>
            </View>
          </View>
          <View className="overflow-hidden rounded-control border border-line dark:border-dark-line">
            {rows.map(({ icon: Icon, label, value }, index) => (
              <View key={label} className={index ? "flex-row items-center gap-3 border-t border-line dark:border-dark-line px-4 py-4" : "flex-row items-center gap-3 px-4 py-4"}>
                <Icon color={colors.muted} size={18} />
                <AppText variant="caption" className="w-[88px]">{label}</AppText>
                <AppText variant="caption" color={label === "Confidence" ? colors.safe : colors.ink} className="flex-1">{value}</AppText>
              </View>
            ))}
          </View>
        </Card>
      }
    />
  );
}
