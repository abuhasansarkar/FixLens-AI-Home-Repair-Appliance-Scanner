import AsyncStorage from "@react-native-async-storage/async-storage";
import { useMutation, useQuery } from "convex/react";
import { useColorScheme } from "nativewind";
import { useState } from "react";
import { Alert, Appearance, Pressable, Switch, View } from "react-native";

import { AppScreen } from "@/components/ui/app-screen";
import { Header } from "@/components/ui/header";
import { AppText } from "@/components/ui/typography";
import { serviceReadiness } from "@/config/env";
import { colors } from "@/constants/design";
import { APPEARANCE_KEY, type AppearancePreference } from "@/providers/theme-runtime";
import { convexApi } from "@/services/convex-references";

type Settings = { appearance: AppearancePreference; metric: boolean; reducedMotion: boolean; detail: "beginner"|"comfortable"|"experienced" };

function SettingsContent({ initial, persistServer }: { initial: Settings; persistServer?: (settings: Settings) => Promise<void> }) {
  const { setColorScheme } = useColorScheme();
  const [settings, setSettings] = useState(initial);
  const save = async (next: Settings) => {
    setSettings(next); setColorScheme(next.appearance); Appearance.setColorScheme(next.appearance==="system"?"unspecified":next.appearance);
    await Promise.all([AsyncStorage.setItem(APPEARANCE_KEY, next.appearance), AsyncStorage.setItem("fixlens.setting.reducedMotion", String(next.reducedMotion)), AsyncStorage.setItem("fixlens.setting.metric", String(next.metric))]);
    try { await persistServer?.(next); } catch { Alert.alert("Settings not synced", "Your choices are saved on this device and will sync when the service is available."); }
  };
  return <AppScreen><Header title="App Settings" /><AppText variant="heading" className="mt-6">Appearance</AppText><View className="mt-3 flex-row gap-2">{(["system", "light", "dark"] as AppearancePreference[]).map((value) => <Pressable accessibilityRole="radio" accessibilityState={{ selected: settings.appearance === value }} key={value} className={settings.appearance === value ? "min-h-[50px] flex-1 items-center justify-center rounded-control bg-brand" : "min-h-[50px] flex-1 items-center justify-center rounded-control border border-line bg-surface dark:border-dark-line dark:bg-dark-surface"} onPress={() => { void save({ ...settings, appearance: value }); }}><AppText variant="label" color={settings.appearance === value ? colors.white : undefined}>{value[0].toUpperCase() + value.slice(1)}</AppText></Pressable>)}</View><AppText variant="heading" className="mt-7">AI explanation detail</AppText><AppText variant="caption" className="mt-1">Changes wording detail only. Safety limits never change.</AppText><View className="mt-3 gap-2">{(["beginner","comfortable","experienced"] as const).map((value)=><Pressable accessibilityRole="radio" accessibilityState={{selected:settings.detail===value}} key={value} className={settings.detail===value?"min-h-[50px] justify-center rounded-control border-2 border-brand bg-brand-soft px-4 dark:bg-dark-brand-soft":"min-h-[50px] justify-center rounded-control border border-line bg-surface px-4 dark:border-dark-line dark:bg-dark-surface"} onPress={()=>{void save({...settings,detail:value});}}><AppText variant="label">{value[0].toUpperCase()+value.slice(1)}</AppText></Pressable>)}</View><AppText variant="heading" className="mt-7">Accessibility & units</AppText><View className="mt-3 overflow-hidden rounded-card border border-line bg-surface dark:border-dark-line dark:bg-dark-surface"><View className="min-h-[64px] flex-row items-center px-4"><View className="flex-1"><AppText variant="label">Reduce motion</AppText><AppText variant="caption">Use static status changes where supported.</AppText></View><Switch value={settings.reducedMotion} onValueChange={(value) => { void save({ ...settings, reducedMotion: value }); }} trackColor={{ false: colors.line, true: colors.brand }} /></View><View className="min-h-[64px] flex-row items-center border-t border-line px-4 dark:border-dark-line"><View className="flex-1"><AppText variant="label">Metric units</AppText><AppText variant="caption">Show measurements in metric units.</AppText></View><Switch value={settings.metric} onValueChange={(value) => { void save({ ...settings, metric: value }); }} trackColor={{ false: colors.line, true: colors.brand }} /></View></View><AppText variant="heading" className="mt-7">Language</AppText><View className="mt-3 min-h-[58px] flex-row items-center justify-between rounded-card border border-line bg-surface px-4 dark:border-dark-line dark:bg-dark-surface"><AppText variant="body">English</AppText><AppText variant="caption">Launch language</AppText></View><AppText variant="caption" className="mt-4">Additional languages will appear after repair, safety, and legal review.</AppText></AppScreen>;
}

function ConnectedSettings() {
  const user = useQuery(convexApi.users.current, {});
  const update = useMutation(convexApi.users.updateSettings);
  if (user === undefined) return <AppScreen><Header title="App Settings" /><AppText variant="body" align="center" className="mt-16">Loading settings…</AppText></AppScreen>;
  const appearance = user?.appearance === "light" || user?.appearance === "dark" ? user.appearance : "system";
  const detail=user?.diyLevel==="comfortable"||user?.diyLevel==="experienced"?user.diyLevel:"beginner";
  return <SettingsContent key={`${appearance}-${String(user?.units)}-${String(user?.reducedMotion)}-${detail}`} initial={{ appearance, metric: user?.units === "metric", reducedMotion: Boolean(user?.reducedMotion),detail }} persistServer={async (next) => { await update({ appearance: next.appearance, units: next.metric ? "metric" : "imperial", reducedMotion: next.reducedMotion,diyLevel:next.detail }); }} />;
}

export default function SettingsScreen() {
  return serviceReadiness.authentication && serviceReadiness.backend ? <ConnectedSettings /> : <SettingsContent initial={{ appearance: "system", metric: false, reducedMotion: false,detail:"beginner" }} />;
}
