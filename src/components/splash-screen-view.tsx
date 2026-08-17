import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import Animated, {
  Easing,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { AppText } from "@/components/ui/typography";
import { colors } from "@/constants/design";

const iconBlue = require("../../assets/images/FixLens-icon-blue.png");
const logoGlow = require("../../assets/images/logo-glow.png");

interface SplashScreenViewProps {
  statusText?: string;
  isReady?: boolean;
  onFinish?: () => void;
  minimumDurationMs?: number;
}

export function SplashScreenView({
  statusText = "Initializing FixLens AI…",
  isReady = false,
  onFinish,
  minimumDurationMs = 900,
}: SplashScreenViewProps) {
  // Animation shared values
  const entranceProgress = useSharedValue(0);
  const pulseLoop = useSharedValue(0);
  const shimmerPosition = useSharedValue(0);
  const exitProgress = useSharedValue(0);

  useEffect(() => {
    // 1. Initial entrance spring
    entranceProgress.value = withSpring(1, {
      damping: 14,
      stiffness: 100,
      mass: 0.9,
    });

    // 2. Continuous subtle optical focus pulse
    pulseLoop.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      true,
    );

    // 3. Shimmer micro-loader loop
    shimmerPosition.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.cubic) }),
        withTiming(0, { duration: 0 }),
      ),
      -1,
      false,
    );
  }, [entranceProgress, pulseLoop, shimmerPosition]);

  // Handle exit transition once isReady is true and minimum time elapsed
  useEffect(() => {
    if (!isReady) return;

    const timer = setTimeout(() => {
      exitProgress.value = withTiming(
        1,
        {
          duration: 380,
          easing: Easing.out(Easing.cubic),
        },
        (finished) => {
          if (finished && onFinish) {
            runOnJS(onFinish)();
          }
        },
      );
    }, minimumDurationMs);

    return () => clearTimeout(timer);
  }, [isReady, minimumDurationMs, onFinish, exitProgress]);

  // Animated styles
  const rootAnimatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(exitProgress.value, [0, 1], [1, 0]);
    const scale = interpolate(exitProgress.value, [0, 1], [1, 1.04]);
    return {
      opacity,
      transform: [{ scale }],
    };
  });

  const logoAnimatedStyle = useAnimatedStyle(() => {
    const scale = interpolate(entranceProgress.value, [0, 1], [0.82, 1]);
    const opacity = interpolate(entranceProgress.value, [0, 1], [0, 1]);
    return {
      opacity,
      transform: [{ scale }],
    };
  });

  const pulseRing1Style = useAnimatedStyle(() => {
    const scale = interpolate(pulseLoop.value, [0, 1], [1, 1.15]);
    const opacity = interpolate(pulseLoop.value, [0, 1], [0.35, 0.08]);
    return {
      transform: [{ scale }],
      opacity,
    };
  });

  const pulseRing2Style = useAnimatedStyle(() => {
    const scale = interpolate(pulseLoop.value, [0, 1], [1.08, 1.28]);
    const opacity = interpolate(pulseLoop.value, [0, 1], [0.22, 0.03]);
    return {
      transform: [{ scale }],
      opacity,
    };
  });

  const shimmerBarStyle = useAnimatedStyle(() => {
    const translateX = interpolate(shimmerPosition.value, [0, 1], [-80, 140]);
    return {
      transform: [{ translateX }],
    };
  });

  return (
    <Animated.View
      accessibilityRole="progressbar"
      accessibilityLabel={`FixLens AI Splash Screen. ${statusText}`}
      style={[styles.container, rootAnimatedStyle]}
    >
      {/* Background Decorative Optical Rings */}
      <View style={styles.centerAnchor} pointerEvents="none">
        {/* Glow backdrop */}
        <Image
          source={logoGlow}
          style={styles.glowImage}
          contentFit="contain"
          transition={200}
        />

        {/* Outer Scanner Reticle Corners */}
        <View style={styles.reticleBox}>
          <View style={[styles.reticleCorner, styles.cornerTL]} />
          <View style={[styles.reticleCorner, styles.cornerTR]} />
          <View style={[styles.reticleCorner, styles.cornerBL]} />
          <View style={[styles.reticleCorner, styles.cornerBR]} />
        </View>

        {/* Dynamic Pulse Rings */}
        <Animated.View style={[styles.pulseRing, pulseRing2Style]} />
        <Animated.View style={[styles.pulseRing, pulseRing1Style]} />
      </View>

      {/* Center Brand Area */}
      <Animated.View style={[styles.brandContainer, logoAnimatedStyle]}>
        {/* Optical 3D Icon */}
        <View style={styles.iconWrapper}>
          <Image
            source={iconBlue}
            style={styles.brandIcon}
            contentFit="contain"
            accessibilityLabel="FixLens AI Optical Lens Icon"
          />
        </View>

        {/* Brand Name & AI Pill */}
        <View style={styles.titleRow}>
          <AppText style={styles.brandTitle}>FixLens</AppText>
          <View style={styles.aiBadge}>
            <AppText style={styles.aiBadgeText}>AI</AppText>
          </View>
        </View>

        {/* Tagline */}
        <AppText style={styles.tagline}>
          SCAN IT. UNDERSTAND IT. FIX IT.
        </AppText>
      </Animated.View>

      {/* Bottom Loading / Status Indicator */}
      <View style={styles.footerContainer}>
        {/* Shimmer Progress Track */}
        <View style={styles.shimmerTrack}>
          <Animated.View style={[styles.shimmerIndicator, shimmerBarStyle]} />
        </View>

        {/* Dynamic Status Text */}
        <AppText style={styles.statusText} numberOfLines={1}>
          {statusText}
        </AppText>

        {/* Subtle AI Engine Monogram */}
        <AppText style={styles.bottomSubtext}>
          Diagnostic Vision Engine
        </AppText>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 99999,
  },
  centerAnchor: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  glowImage: {
    position: "absolute",
    width: 380,
    height: 380,
    opacity: 0.65,
  },
  reticleBox: {
    position: "absolute",
    width: 220,
    height: 220,
  },
  reticleCorner: {
    position: "absolute",
    width: 18,
    height: 18,
    borderColor: "rgba(255, 255, 255, 0.28)",
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderTopLeftRadius: 6,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 2,
    borderRightWidth: 2,
    borderTopRightRadius: 6,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 2,
    borderLeftWidth: 2,
    borderBottomLeftRadius: 6,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 2,
    borderRightWidth: 2,
    borderBottomRightRadius: 6,
  },
  pulseRing: {
    position: "absolute",
    width: 170,
    height: 170,
    borderRadius: 85,
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.4)",
  },
  brandContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrapper: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.28,
    shadowRadius: 18,
    elevation: 12,
  },
  brandIcon: {
    width: 96,
    height: 96,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 22,
    gap: 8,
  },
  brandTitle: {
    fontSize: 32,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: -0.8,
  },
  aiBadge: {
    backgroundColor: "rgba(255, 255, 255, 0.22)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.35)",
  },
  aiBadgeText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  tagline: {
    fontSize: 11,
    fontWeight: "700",
    color: "rgba(255, 255, 255, 0.8)",
    letterSpacing: 1.8,
    marginTop: 8,
    textAlign: "center",
  },
  footerContainer: {
    position: "absolute",
    bottom: 52,
    alignItems: "center",
    width: "100%",
    paddingHorizontal: 32,
  },
  shimmerTrack: {
    width: 130,
    height: 3.5,
    backgroundColor: "rgba(255, 255, 255, 0.18)",
    borderRadius: 999,
    overflow: "hidden",
    marginBottom: 14,
  },
  shimmerIndicator: {
    width: 50,
    height: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 999,
    shadowColor: "#FFFFFF",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  statusText: {
    fontSize: 13,
    fontWeight: "500",
    color: "rgba(255, 255, 255, 0.9)",
    letterSpacing: 0.2,
    textAlign: "center",
  },
  bottomSubtext: {
    fontSize: 10,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.45)",
    letterSpacing: 0.8,
    marginTop: 8,
    textTransform: "uppercase",
  },
});
