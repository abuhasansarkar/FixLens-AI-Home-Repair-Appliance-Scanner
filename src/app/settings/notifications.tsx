import AsyncStorage from "@react-native-async-storage/async-storage";
import { useMutation, useQuery } from "convex/react";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { useEffect, useState } from "react";
import { Alert, Platform, Switch, View } from "react-native";

import { AppScreen } from "@/components/ui/app-screen";
import { Header } from "@/components/ui/header";
import { AppText } from "@/components/ui/typography";
import { env, serviceReadiness } from "@/config/env";
import { colors } from "@/constants/design";
import { convexApi } from "@/services/convex-references";

type Preferences = { maintenance: boolean; warranty: boolean; followUps: boolean };
const defaults: Preferences = { maintenance: true, warranty: true, followUps: true };

function PreferencesScreen({ persistServer, initial = defaults, initialPermission = "undetermined", loadLocal = true }: { persistServer?: (preferences: Preferences, permission: string) => Promise<void>; initial?: Preferences; initialPermission?: string; loadLocal?: boolean }) {
  const [prefs, setPrefs] = useState(initial);
  const [permission, setPermission] = useState(initialPermission);
  useEffect(() => { if (loadLocal) Promise.all([Notifications.getPermissionsAsync(), AsyncStorage.getItem("fixlens.notifications.v1")]).then(([status, stored]) => { setPermission(status.status); if (stored) { try { setPrefs({...defaults,...JSON.parse(stored)}); } catch { void AsyncStorage.removeItem("fixlens.notifications.v1"); } } }); else Notifications.getPermissionsAsync().then((status) => setPermission(status.status)); }, [loadLocal]);

  const update = async (key: keyof Preferences, value: boolean) => {
    let nextPermission = permission;
    if (value && permission !== "granted") {
      const result = await Notifications.requestPermissionsAsync();
      nextPermission = result.status; setPermission(result.status);
      if (result.status !== "granted") { Alert.alert("Notifications are off", "Enable notifications in system Settings to receive reminders."); return; }
    }
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    await AsyncStorage.setItem("fixlens.notifications.v1", JSON.stringify(next));
    try { await persistServer?.(next, nextPermission); } catch { Alert.alert("Couldn’t sync preferences", "Your choice is saved on this device and will sync when the service is available."); }
  };

  return <AppScreen><Header title="Notifications" /><AppText variant="body" color={colors.muted} className="mt-4">Choose which transactional reminders FixLens may send. Promotional notifications are off in V1.</AppText><View className="mt-6 overflow-hidden rounded-card border border-line dark:border-dark-line bg-surface dark:bg-dark-surface">{([{ key: "maintenance", label: "Maintenance reminders", body: "Tasks due soon and overdue." }, { key: "warranty", label: "Warranty reminders", body: "Upcoming warranty expiration dates." }, { key: "followUps", label: "Repair follow-ups", body: "Check whether a repair resolved the issue." }] as const).map((item, index) => <View key={item.key} className={index ? "min-h-[74px] flex-row items-center border-t border-line dark:border-dark-line px-4" : "min-h-[74px] flex-row items-center px-4"}><View className="flex-1"><AppText variant="label">{item.label}</AppText><AppText variant="caption">{item.body}</AppText></View><Switch value={prefs[item.key]} onValueChange={(value) => { void update(item.key, value); }} trackColor={{ false: colors.line, true: colors.brand }} /></View>)}{[{label:"Product updates",body:"Not sent in V1."},{label:"Promotions",body:"Off by default and unavailable in V1."}].map((item)=><View key={item.label} className="min-h-[74px] flex-row items-center border-t border-line px-4 opacity-60 dark:border-dark-line"><View className="flex-1"><AppText variant="label">{item.label}</AppText><AppText variant="caption">{item.body}</AppText></View><Switch value={false} disabled trackColor={{false:colors.line,true:colors.brand}}/></View>)}</View><AppText variant="caption" className="mt-4">System permission: {permission}</AppText></AppScreen>;
}

function ConnectedPreferences() {
  const save = useMutation(convexApi.notifications.savePreferences);
  const register = useMutation(convexApi.notifications.registerPushToken);
  const current = useQuery(convexApi.notifications.currentPreferences, {});
  const persist = async (preferences: Preferences, permission: string) => {
    await save({ maintenance: preferences.maintenance, warranty: preferences.warranty, repairFollowUps: preferences.followUps, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC", permissionStatus: permission });
    if (permission === "granted" && Device.isDevice && env.easProjectId && (Platform.OS === "ios" || Platform.OS === "android")) {
      const token = await Notifications.getExpoPushTokenAsync({ projectId: env.easProjectId });
      await register({ token: token.data, platform: Platform.OS, deviceId: Device.osInternalBuildId ?? undefined, environment: env.appEnv });
    }
  };
  if (current === undefined) return <AppScreen><Header title="Notifications" /><AppText variant="body" align="center" className="mt-16">Loading preferences…</AppText></AppScreen>;
  return <PreferencesScreen key={current ? `${String(current.maintenance)}-${String(current.warranty)}-${String(current.repairFollowUps)}-${current.permissionStatus}` : "defaults"} initial={current ? { maintenance: current.maintenance, warranty: current.warranty, followUps: current.repairFollowUps } : defaults} initialPermission={current?.permissionStatus ?? "undetermined"} loadLocal={false} persistServer={persist} />;
}

export default function NotificationSettingsScreen() {
  return serviceReadiness.authentication && serviceReadiness.backend ? <ConnectedPreferences /> : <PreferencesScreen />;
}
