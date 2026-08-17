import { Image } from "expo-image";
import { View } from "react-native";

import { AppText } from "@/components/ui/typography";
import { colors } from "@/constants/design";

const washer = require("../../../assets/images/fixlens/washer-hero.png");

export function RepairSummary({ appliance = "Appliance", model, confidence }: { appliance?: string; model?: string; confidence?: number }) {
  const confidenceLabel = confidence === undefined ? undefined : confidence >= 0.8 ? "High confidence" : confidence >= 0.55 ? "Moderate confidence" : "Low confidence";
  return <View className="flex-row items-center gap-4"><Image source={washer} contentFit="cover" style={{ width: 82, height: 82, borderRadius: 18 }} className="h-[82px] w-[82px] rounded-card" /><View className="flex-1"><AppText variant="heading">{appliance}</AppText>{model ? <AppText variant="caption">{model}</AppText> : null}{confidenceLabel ? <AppText variant="label" color={confidence && confidence >= 0.8 ? colors.safe : colors.caution} className="mt-1">{confidenceLabel}</AppText> : null}</View></View>;
}
