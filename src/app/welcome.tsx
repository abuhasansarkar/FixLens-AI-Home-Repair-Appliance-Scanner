import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { ScanLine } from "lucide-react-native";
import { View } from "react-native";

import { BrandMark } from "@/components/brand-mark";
import { AppScreen } from "@/components/ui/app-screen";
import { Button } from "@/components/ui/button";
import { AppText } from "@/components/ui/typography";
import { colors } from "@/constants/design";

const washer = require("../../assets/images/fixlens/washer-hero.png");

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <AppScreen
      contentClassName="pt-9"
      footer={
        <View className="gap-1">
          <Button label="Get Started" onPress={() => router.push("/auth/sign-in")} />
          <Button label="I already have an account" variant="ghost" onPress={() => router.push("/auth/sign-in")} />
        </View>
      }
    >
      <View className="mb-6 items-center">
        <BrandMark variant="logo" />
      </View>

      <View className="mb-7 overflow-hidden rounded-hero border border-[#DCE8FF] bg-brand-soft dark:bg-dark-brand-soft">
        <Image
          source={washer}
          contentFit="cover"
          transition={250}
          accessibilityLabel="A front-load washing machine ready to scan"
          style={{ width: "100%", height: 315 }}
          className="h-[315px] w-full"
        />
        <View className="absolute bottom-4 right-4 h-16 w-16 items-center justify-center rounded-2xl border border-white/70 bg-brand/90">
          <ScanLine color={colors.white} size={34} />
        </View>
      </View>

      <View className="items-center px-3">
        <AppText variant="display" align="center">Fix anything{"\n"}with a photo.</AppText>
        <AppText variant="body" align="center" color={colors.muted} className="mt-3.5">
          Take a photo of an appliance or home problem and get AI-powered diagnosis and repair guidance.
        </AppText>
      </View>
    </AppScreen>
  );
}
