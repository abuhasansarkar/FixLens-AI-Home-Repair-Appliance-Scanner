import { Image } from "expo-image";
import { View } from "react-native";

import { AppText } from "./ui/typography";

const logo = require("../../assets/images/FixLens-logo.png");
const iconBlue = require("../../assets/images/FixLens-icon-blue.png");
const iconWhite = require("../../assets/images/FixLens_Icon_white.png");

export function BrandMark({
  compact = false,
  variant = "default",
  white = false,
  size,
}: {
  compact?: boolean;
  variant?: "default" | "logo" | "icon" | "splash";
  white?: boolean;
  size?: number;
}) {
  if (variant === "logo") {
    const width = size ? size * 3.54 : compact ? 130 : 170;
    const height = size ?? (compact ? 36 : 48);
    return (
      <View className="items-center justify-center">
        <Image
          source={logo}
          contentFit="contain"
          style={{ width, height }}
          accessibilityLabel="FixLens AI Logo"
        />
      </View>
    );
  }

  if (variant === "splash") {
    const splashSize = size ?? 96;
    return (
      <Image
        source={iconBlue}
        contentFit="contain"
        style={{ width: splashSize, height: splashSize }}
        accessibilityLabel="FixLens AI Brand Mark"
      />
    );
  }

  if (variant === "icon") {
    const iconSize = size ?? (compact ? 32 : 44);
    return (
      <Image
        source={white ? iconWhite : iconBlue}
        contentFit="contain"
        style={{ width: iconSize, height: iconSize }}
        accessibilityLabel="FixLens AI Icon"
      />
    );
  }

  return (
    <View className="flex-row items-center gap-[10px]">
      <Image
        source={white ? iconWhite : iconBlue}
        contentFit="contain"
        style={{ width: size ?? (compact ? 32 : 40), height: size ?? (compact ? 32 : 40) }}
        accessibilityLabel="FixLens AI Icon"
      />
      <View>
        <AppText variant={compact ? "label" : "heading"}>FixLens AI</AppText>
        {compact ? <AppText variant="caption">Scan it. Understand it. Fix it.</AppText> : null}
      </View>
    </View>
  );
}
