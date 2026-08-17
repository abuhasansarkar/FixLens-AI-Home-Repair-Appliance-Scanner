import { ShieldCheck } from "lucide-react-native";
import { View } from "react-native";

import { FeatureScreen } from "@/components/onboarding/feature-screen";
import { Card } from "@/components/ui/card";
import { AppText } from "@/components/ui/typography";
import { colors } from "@/constants/design";

const steps = [
  ["Turn off the water supply", "Close both the hot and cold water valves."],
  ["Check the inlet hose", "Look for kinks, damage, or loose connections."],
  ["Inspect the filter", "Remove and clean the inlet filter if it’s clogged."],
];

export default function RepairFeatureScreen() {
  return (
    <FeatureScreen
      step={3}
      title="Fix it step by step."
      body="Follow clear repair steps with tools, safety tips, and troubleshooting."
      next="/onboarding/safety"
      illustration={
        <Card className="w-full p-[18px]">
          {steps.map(([title, body], index) => (
            <View key={title} className="flex-row gap-4 pb-5">
              <View className="items-center">
                <View className="h-8 w-8 items-center justify-center rounded-full bg-brand">
                  <AppText variant="label" color={colors.white}>{index + 1}</AppText>
                </View>
                {index < steps.length - 1 ? <View className="mt-1 h-14 w-px bg-brand/35" /> : null}
              </View>
              <View className="flex-1 pt-1">
                <AppText variant="label">Step {index + 1}</AppText>
                <AppText variant="heading" className="mt-0.5">{title}</AppText>
                <AppText variant="caption" className="mt-[3px]">{body}</AppText>
              </View>
            </View>
          ))}
          <View className="flex-row gap-3 rounded-control border border-[#C7DBFF] bg-brand-soft dark:bg-dark-brand-soft p-4">
            <ShieldCheck color={colors.brand} size={22} />
            <View className="flex-1">
              <AppText variant="label">Safety first</AppText>
              <AppText variant="caption">Always unplug the appliance and turn off the water supply first.</AppText>
            </View>
          </View>
        </Card>
      }
    />
  );
}
