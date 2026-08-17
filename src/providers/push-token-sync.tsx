import { useUser } from "@clerk/expo";
import { useMutation } from "convex/react";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import type { PropsWithChildren } from "react";
import { useEffect } from "react";
import { Platform } from "react-native";

import { env } from "@/config/env";
import { convexApi } from "@/services/convex-references";

export function PushTokenSync({ children }: PropsWithChildren) {
  const { user } = useUser(); const register = useMutation(convexApi.notifications.registerPushToken);
  useEffect(() => {
    if (!user || !Device.isDevice || !env.easProjectId || (Platform.OS !== "ios" && Platform.OS !== "android")) return;
    const platform = Platform.OS as "ios" | "android";
    const sync = async () => { const permission = await Notifications.getPermissionsAsync(); if (permission.status !== "granted") return; const token = await Notifications.getExpoPushTokenAsync({ projectId: env.easProjectId }); await register({ token: token.data, platform, deviceId: Device.osInternalBuildId ?? undefined, environment: env.appEnv }); };
    void sync();
    const subscription = Notifications.addPushTokenListener(() => { void sync(); });
    return () => subscription.remove();
  }, [register, user]);
  return children;
}
