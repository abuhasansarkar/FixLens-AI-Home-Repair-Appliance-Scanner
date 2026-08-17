import "../global.css";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/expo";
import { Redirect, Stack, usePathname } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useQuery } from "convex/react";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { useColorScheme } from "react-native";

import { SplashScreenView } from "@/components/splash-screen-view";
import { env, serviceReadiness } from "@/config/env";
import { colors, darkColors } from "@/constants/design";
import { useOnboarding } from "@/features/onboarding/onboarding-context";
import { AppProviders } from "@/providers/app-providers";
import { initializeMonitoring, Sentry } from "@/services/monitoring";
import { convexApi } from "@/services/convex-references";

void SplashScreen.preventAutoHideAsync().catch(() => {});

initializeMonitoring();

function Screens({
  enforceProtection = false,
  authenticated = false,
  onboardingComplete = false,
}: {
  enforceProtection?: boolean;
  authenticated?: boolean;
  onboardingComplete?: boolean;
}) {
  const isDark = useColorScheme() === "dark";

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: isDark ? darkColors.canvas : colors.canvas },
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Protected guard={!enforceProtection || !authenticated}>
        <Stack.Screen name="welcome" />
        <Stack.Screen name="auth/sign-in" />
        <Stack.Screen name="auth/sign-up" />
        <Stack.Screen name="auth/verify-email" />
        <Stack.Screen name="auth/forgot-password" />
      </Stack.Protected>
      <Stack.Screen name="legal/terms" />
      <Stack.Screen name="legal/privacy" />
      <Stack.Screen name="legal/ai-safety" />
      <Stack.Protected guard={!enforceProtection || (authenticated && !onboardingComplete)}>
        <Stack.Screen name="onboarding/scan" />
        <Stack.Screen name="onboarding/understand" />
        <Stack.Screen name="onboarding/repair" />
        <Stack.Screen name="onboarding/safety" />
        <Stack.Screen name="onboarding/interests" />
        <Stack.Screen name="onboarding/experience" />
      </Stack.Protected>
      <Stack.Protected guard={!enforceProtection || (authenticated && onboardingComplete)}>
        <Stack.Screen name="tabs" />
        <Stack.Screen name="scan/camera" options={{ animation: "fade", presentation: "fullScreenModal" }} />
        <Stack.Screen name="scan/review" options={{ presentation: "fullScreenModal" }} />
        <Stack.Screen name="scan/analyzing" options={{ presentation: "fullScreenModal" }} />
        <Stack.Screen name="scan/more-info" />
        <Stack.Screen name="scan/clarify" />
        <Stack.Screen name="scan/describe" />
        <Stack.Screen name="diagnosis/result" />
        <Stack.Screen name="diagnosis/unsupported" />
        <Stack.Screen name="repair/overview" />
        <Stack.Screen name="repair/step" />
        <Stack.Screen name="repair/progress" />
        <Stack.Screen name="repair/assistant" />
        <Stack.Screen name="repair/tools" />
        <Stack.Screen name="repair/complete" />
        <Stack.Screen name="repair/success" />
        <Stack.Screen name="repairs/[repairId]" />
        <Stack.Screen name="appliance/add" />
        <Stack.Screen name="appliance/scanner" options={{ presentation: "fullScreenModal" }} />
        <Stack.Screen name="appliance/analyzing" options={{ presentation: "fullScreenModal" }} />
        <Stack.Screen name="appliance/detected" />
        <Stack.Screen name="appliance/[applianceId]" />
        <Stack.Screen name="appliance/edit" />
        <Stack.Screen name="appliance/documents" />
        <Stack.Screen name="appliance/repair-vs-replace" />
        <Stack.Screen name="home/manage" />
        <Stack.Screen name="maintenance/index" />
        <Stack.Screen name="maintenance/[taskId]" />
        <Stack.Screen name="subscription/paywall" options={{ presentation: "modal" }} />
        <Stack.Screen name="subscription/index" />
        <Stack.Screen name="subscription/usage" />
        <Stack.Screen name="subscription/limit" options={{ presentation: "modal" }} />
        <Stack.Screen name="settings/index" />
        <Stack.Screen name="settings/notifications" />
        <Stack.Screen name="settings/delete-account" />
        <Stack.Screen name="support/help" />
      </Stack.Protected>
    </Stack>
  );
}

function AuthenticatedScreens() {
  const { isLoaded, isSignedIn } = useAuth();
  const { hydrated, completed } = useOnboarding();
  const [splashExited, setSplashExited] = useState(false);

  const isReady = Boolean(isLoaded && hydrated);

  return (
    <>
      {serviceReadiness.backend && isSignedIn ? <DeletionRecoveryRedirect /> : null}
      <Screens enforceProtection authenticated={isSignedIn} onboardingComplete={completed} />
      {!splashExited ? (
        <SplashScreenView
          isReady={isReady}
          onFinish={() => setSplashExited(true)}
          statusText={
            !isLoaded
              ? "Securing FixLens session…"
              : !hydrated
                ? "Restoring preferences…"
                : "Ready to scan"
          }
        />
      ) : null}
    </>
  );
}

function DevScreens() {
  const { hydrated, completed } = useOnboarding();
  const [splashExited, setSplashExited] = useState(false);

  return (
    <>
      <Screens onboardingComplete={completed} />
      {!splashExited ? (
        <SplashScreenView
          isReady={hydrated}
          onFinish={() => setSplashExited(true)}
          statusText="Initializing FixLens…"
        />
      ) : null}
    </>
  );
}

function DeletionRecoveryRedirect(){const pending=useQuery(convexApi.deletion.current,{});const pathname=usePathname();if(pending&&pathname!=="/settings/delete-account")return <Redirect href="/settings/delete-account"/>;return null;}

function RootLayout() {
  useEffect(() => {
    void SplashScreen.hideAsync().catch(() => {});
  }, []);

  return (
    <GestureHandlerRootView className="flex-1">
      <SafeAreaProvider>
        <AppProviders>
          <StatusBar style="auto" />
          {env.clerkPublishableKey ? <AuthenticatedScreens /> : <DevScreens />}
        </AppProviders>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default Sentry.wrap(RootLayout);
