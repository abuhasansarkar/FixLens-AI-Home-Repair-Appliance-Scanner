import type { ConfigContext, ExpoConfig } from "expo/config";

export default ({ config: base }: ConfigContext): ExpoConfig => {
  const resolved = base as ExpoConfig;
  const projectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID?.trim();
  const googleConfig = {
    EXPO_PUBLIC_CLERK_GOOGLE_WEB_CLIENT_ID: process.env.EXPO_PUBLIC_CLERK_GOOGLE_WEB_CLIENT_ID?.trim(),
    EXPO_PUBLIC_CLERK_GOOGLE_IOS_CLIENT_ID: process.env.EXPO_PUBLIC_CLERK_GOOGLE_IOS_CLIENT_ID?.trim(),
    EXPO_PUBLIC_CLERK_GOOGLE_ANDROID_CLIENT_ID: process.env.EXPO_PUBLIC_CLERK_GOOGLE_ANDROID_CLIENT_ID?.trim(),
    EXPO_PUBLIC_CLERK_GOOGLE_IOS_URL_SCHEME: process.env.EXPO_PUBLIC_CLERK_GOOGLE_IOS_URL_SCHEME?.trim(),
  };

  const sentryOrg = process.env.SENTRY_ORG?.trim() || "fixlens";
  const sentryProject = process.env.SENTRY_PROJECT?.trim() || "fixlens-mobile";

  const plugins = (resolved.plugins ?? []).map((plugin) => {
    if (plugin === "@sentry/react-native" || (Array.isArray(plugin) && plugin[0] === "@sentry/react-native")) {
      return [
        "@sentry/react-native/expo",
        {
          organization: sentryOrg,
          project: sentryProject,
        },
      ] as [string, any];
    }
    return plugin;
  });

  return {
    ...resolved,
    plugins,
    extra: {
      ...resolved.extra,
      ...googleConfig,
      ...(projectId ? {
          eas: {
            ...((resolved.extra?.eas as Record<string, unknown> | undefined) ?? {}),
            projectId,
          },
        } : {}),
    },
  };
};
