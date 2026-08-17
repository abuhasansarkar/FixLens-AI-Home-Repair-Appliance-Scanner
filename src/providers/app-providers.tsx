import type { PropsWithChildren } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ClerkProvider, useAuth, useClerk, useUser } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexReactClient, useConvexAuth, useMutation, useQuery } from "convex/react";
import { ActivityIndicator, View } from "react-native";

import { BrandMark } from "@/components/brand-mark";
import { Button } from "@/components/ui/button";
import { AppText } from "@/components/ui/typography";
import { env } from "@/config/env";
import { colors } from "@/constants/design";
import { OnboardingProvider } from "@/features/onboarding/onboarding-context";
import { ScanProvider } from "@/features/diagnosis/scan-context";
import { RepairProvider } from "@/features/repairs/repair-context";
import { HomeProvider } from "@/features/home/home-context";
import { BackendSync } from "@/providers/backend-sync";
import { PurchaseSync } from "@/providers/purchase-sync";
import { NotificationRuntime } from "@/providers/notification-runtime";
import { PushTokenSync } from "@/providers/push-token-sync";
import { ThemeRuntime } from "@/providers/theme-runtime";
import { NetworkStatusProvider } from "@/providers/network-status";
import { convexApi } from "@/services/convex-references";

function ConvexBridge({ children }: PropsWithChildren) {
  const client = useMemo(
    () => (env.convexUrl ? new ConvexReactClient(env.convexUrl) : null),
    [],
  );

  if (!client) return children;

  return (
    <ConvexProviderWithClerk client={client} useAuth={useAuth}>
      {children}
    </ConvexProviderWithClerk>
  );
}

function ProductProviders({ children, storageScope, connected, serverState, serverLoading = false }: PropsWithChildren<{ storageScope: string; connected: boolean; serverState?: { onboardingComplete?: boolean; interests?: string[]; diyLevel?: string; appearance?: string } | null; serverLoading?: boolean }>) {
  const product = (
    <ScanProvider storageScope={storageScope}>
      <RepairProvider>
        <HomeProvider connected={connected}>{children}</HomeProvider>
      </RepairProvider>
    </ScanProvider>
  );

  return (
    <ThemeRuntime serverAppearance={serverState?.appearance}>
      <NetworkStatusProvider>
        <NotificationRuntime>
          <OnboardingProvider key={storageScope} storageScope={storageScope} serverState={serverState} serverLoading={serverLoading}>
            {connected ? <BackendSync><PushTokenSync>{product}</PushTokenSync></BackendSync> : product}
          </OnboardingProvider>
        </NotificationRuntime>
      </NetworkStatusProvider>
    </ThemeRuntime>
  );
}

function ConvexAuthenticationGate({ loading, message }: { loading: boolean; message?: string }) {
  const { signOut } = useClerk();

  return (
    <View className="flex-1 items-center justify-center bg-canvas px-8 dark:bg-dark-canvas">
      <BrandMark compact />
      {loading ? <ActivityIndicator className="mt-7" color={colors.brand} size="large" /> : null}
      <AppText variant="heading" align="center" className="mt-6">
        {loading ? "Securing your session…" : "Backend sign-in needs attention"}
      </AppText>
      <AppText variant="body" align="center" color={colors.muted} className="mt-2">
        {loading
          ? "FixLens is validating your account before loading private data."
          : message ?? "FixLens could not validate this Clerk session with Convex. Check the Clerk–Convex integration and try signing in again."}
      </AppText>
      {!loading ? <View className="mt-6 w-full"><Button label="Sign out and try again" onPress={() => { void signOut({ redirectUrl: "/welcome" }); }} /></View> : null}
    </View>
  );
}

function ConnectedProductProviders({ children, storageScope, clerkLoaded, clerkSignedIn }: PropsWithChildren<{ storageScope: string; clerkLoaded: boolean; clerkSignedIn: boolean }>) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { user } = useUser();
  const ensureCurrent = useMutation(convexApi.users.ensureCurrent);
  const [bootstrapError, setBootstrapError] = useState<string>();
  const bootstrapUserId = useRef<string | undefined>(undefined);
  const canAccessPrivateData = clerkLoaded && clerkSignedIn && isAuthenticated;
  const serverState = useQuery(convexApi.users.current, canAccessPrivateData ? {} : "skip");
  const userEmail = user?.primaryEmailAddress?.emailAddress ?? user?.emailAddresses[0]?.emailAddress;
  const missingEmailError = canAccessPrivateData && user && !userEmail
    ? "Your identity provider did not return an email address. Add an email to your account and sign in again."
    : undefined;

  useEffect(() => {
    if (!canAccessPrivateData || serverState !== null || !user || !userEmail || bootstrapUserId.current === user.id) return;

    bootstrapUserId.current = user.id;
    void ensureCurrent({
      email: userEmail,
      name: user.fullName ?? undefined,
      avatarUrl: user.imageUrl || undefined,
    }).catch((error: unknown) => {
      bootstrapUserId.current = undefined;
      setBootstrapError(error instanceof Error ? error.message : "Your FixLens account could not be initialized.");
    });
  }, [canAccessPrivateData, ensureCurrent, serverState, user, userEmail]);

  if (clerkLoaded && clerkSignedIn && !isAuthenticated) return <ConvexAuthenticationGate loading={isLoading} />;
  if (canAccessPrivateData && (serverState === undefined || serverState === null)) {
    const error = missingEmailError ?? bootstrapError;
    return <ConvexAuthenticationGate loading={!error} message={error} />;
  }

  return <ProductProviders storageScope={storageScope} connected={canAccessPrivateData} serverState={serverState}>{children}</ProductProviders>;
}

function ClerkProductRoot({ children }: PropsWithChildren) {
  const { user, isLoaded } = useUser();
  const previousUserId = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!isLoaded) return;
    const previous = previousUserId.current;
    if (previous && !user) void AsyncStorage.multiRemove([`fixlens.scan.v1.${previous}`, `fixlens.onboarding.v1.${previous}`]);
    previousUserId.current = user?.id;
  }, [isLoaded, user]);
  const storageScope = isLoaded ? (user?.id ?? "signed-out") : "loading";
  return (
    <ConvexBridge>
      {env.convexUrl
        ? <ConnectedProductProviders key={storageScope} storageScope={storageScope} clerkLoaded={isLoaded} clerkSignedIn={Boolean(user)}>{children}</ConnectedProductProviders>
        : <ProductProviders key={storageScope} storageScope={storageScope} connected={false}>{children}</ProductProviders>}
    </ConvexBridge>
  );
}

export function AppProviders({ children }: PropsWithChildren) {
  if (!env.clerkPublishableKey) {
    return <ProductProviders storageScope="developer" connected={false}>{children}</ProductProviders>;
  }

  return (
    <ClerkProvider publishableKey={env.clerkPublishableKey} tokenCache={tokenCache}>
      <PurchaseSync><ClerkProductRoot>{children}</ClerkProductRoot></PurchaseSync>
    </ClerkProvider>
  );
}
