import { Platform } from "react-native";

function optional(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export const env = {
  appEnv: optional(process.env.EXPO_PUBLIC_APP_ENV) ?? "development",
  clerkPublishableKey: optional(process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY),
  clerkGoogleIosUrlScheme: optional(
    process.env.EXPO_PUBLIC_CLERK_GOOGLE_IOS_URL_SCHEME,
  ),
  clerkGoogleWebClientId: optional(process.env.EXPO_PUBLIC_CLERK_GOOGLE_WEB_CLIENT_ID),
  clerkGoogleIosClientId: optional(process.env.EXPO_PUBLIC_CLERK_GOOGLE_IOS_CLIENT_ID),
  clerkGoogleAndroidClientId: optional(process.env.EXPO_PUBLIC_CLERK_GOOGLE_ANDROID_CLIENT_ID),
  convexUrl: optional(process.env.EXPO_PUBLIC_CONVEX_URL),
  convexSiteUrl: optional(process.env.EXPO_PUBLIC_CONVEX_SITE_URL),
  revenueCatKey: optional(
    Platform.select({
      ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY,
      android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY,
    }),
  ),
  sentryDsn: optional(process.env.EXPO_PUBLIC_SENTRY_DSN),
  easProjectId: optional(process.env.EXPO_PUBLIC_EAS_PROJECT_ID),
  maxImageLongEdge: Number(process.env.EXPO_PUBLIC_MAX_IMAGE_LONG_EDGE ?? 2048),
  privacyUrl: optional(process.env.EXPO_PUBLIC_PRIVACY_URL),
  termsUrl: optional(process.env.EXPO_PUBLIC_TERMS_URL),
} as const;

export const serviceReadiness = {
  authentication: Boolean(env.clerkPublishableKey),
  backend: Boolean(env.convexUrl),
  purchases: Boolean(env.revenueCatKey),
  monitoring: Boolean(env.sentryDsn),
  googleSignIn: Boolean(
    env.clerkGoogleWebClientId
      && (Platform.OS === "ios" ? env.clerkGoogleIosClientId : env.clerkGoogleAndroidClientId),
  ),
} as const;
