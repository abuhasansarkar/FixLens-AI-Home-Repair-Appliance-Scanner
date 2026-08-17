import { Image } from "expo-image";
import { Camera, Images, Zap } from "lucide-react-native";
import { View } from "react-native";

import { FeatureScreen } from "@/components/onboarding/feature-screen";
import { colors } from "@/constants/design";

const washer = require("../../../assets/images/fixlens/washer-hero.png");

export default function ScanFeatureScreen() {
  return (
    <FeatureScreen
      step={1}
      title="Snap the problem."
      body="Take a clear photo or choose one from your library."
      next="/onboarding/understand"
      illustration={
        <View className="w-full overflow-hidden rounded-hero bg-[#191919]">
          <View className="h-11 flex-row items-center justify-between px-5">
            <Camera color={colors.white} size={20} />
            <Zap color={colors.white} size={19} />
            <Images color={colors.white} size={19} />
          </View>
          <Image
            source={washer}
            contentFit="cover"
            accessibilityLabel="Washer centered in a camera frame"
            style={{ width: "100%", height: 295 }}
            className="h-[295px] w-full"
          />
          <View className="h-20 flex-row items-center justify-around px-7">
            <View className="h-11 w-11 rounded-lg border border-white/60 bg-white/10" />
            <View className="h-16 w-16 rounded-full border-4 border-white bg-white/20" />
            <View className="h-11 w-11 rounded-full bg-white/10" />
          </View>
        </View>
      }
    />
  );
}
