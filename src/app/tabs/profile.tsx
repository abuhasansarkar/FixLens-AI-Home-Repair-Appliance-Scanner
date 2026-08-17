import { useClerk, useUser } from "@clerk/expo";
import { useMutation } from "convex/react";
import { useRouter } from "expo-router";
import { Bell, ChevronRight, CircleHelp, Crown, FileText, LayoutGrid, LogOut, Settings, ShieldCheck, Trash2, Wrench } from "lucide-react-native";
import { Pressable, View } from "react-native";

import { AppScreen } from "@/components/ui/app-screen";
import { AppText } from "@/components/ui/typography";
import { UsageSummaryCard } from "@/components/usage-summary-card";
import { env, serviceReadiness } from "@/config/env";
import { colors, useThemeColors } from "@/constants/design";
import { convexApi } from "@/services/convex-references";

const groups = [

  { title: "SUBSCRIPTION", rows: [{ label: "Plan & Billing", icon: Crown, route: "/subscription" }, { label: "AI Usage", icon: ShieldCheck, route: "/subscription/usage" }] },
  { title: "PREFERENCES", rows: [{ label: "Notifications", icon: Bell, route: "/settings/notifications" }, { label: "App Settings", icon: Settings, route: "/settings" }] },
  { title: "SUPPORT & LEGAL", rows: [{ label: "Help Center", icon: CircleHelp, route: "/support/help" }, { label: "Terms of Service", icon: FileText, route: "/legal/terms" }, { label: "Privacy Policy", icon: ShieldCheck, route: "/legal/privacy" }, { label: "AI & Safety", icon: ShieldCheck, route: "/legal/ai-safety" }] },
  { title: "ACCOUNT", rows: [{ label: "Appliances", icon: LayoutGrid, route: "/tabs/my-home" }, { label: "Repairs", icon: Wrench, route: "/tabs/repairs" }, { label: "Delete Account", icon: Trash2, route: "/settings/delete-account" }] },
] as const;

function ProfileContent({ name, email, onSignOut, navigate, showUsage = false }: { name: string; email: string; onSignOut: () => void; navigate: (route: string) => void; showUsage?: boolean }) {
  const theme = useThemeColors();
  return <AppScreen>
    <AppText variant="title">Profile</AppText>
    <View className="mt-5 flex-row items-center gap-4 rounded-card border border-line bg-surface p-4 dark:border-dark-line dark:bg-dark-surface"><View className="h-16 w-16 items-center justify-center rounded-full bg-brand-soft dark:bg-dark-brand-soft"><AppText variant="title" color={colors.brand}>{name[0]?.toUpperCase()}</AppText></View><View className="flex-1"><AppText variant="heading">{name}</AppText><AppText variant="caption">{email}</AppText></View></View>
    {showUsage ? <UsageSummaryCard /> : null}
    {groups.map((group) => <View key={group.title} className="mt-6"><AppText variant="caption">{group.title}</AppText><View className="mt-2 overflow-hidden rounded-card border border-line bg-surface dark:border-dark-line dark:bg-dark-surface">{group.rows.map(({ label, icon: Icon, route }, index) => <Pressable accessibilityRole="button" key={label} className={index ? "min-h-[56px] flex-row items-center gap-3 border-t border-line px-4 dark:border-dark-line" : "min-h-[56px] flex-row items-center gap-3 px-4"} onPress={() => navigate(route)}><Icon color={label === "Delete Account" ? colors.danger : theme.ink} size={20} /><AppText variant="body" className="flex-1" color={label === "Delete Account" ? colors.danger : theme.ink}>{label}</AppText><ChevronRight color={theme.muted} size={18} /></Pressable>)}</View></View>)}
    <Pressable accessibilityRole="button" className="mt-6 min-h-[54px] flex-row items-center justify-center gap-2 rounded-control border border-danger" onPress={onSignOut}><LogOut color={colors.danger} size={20} /><AppText variant="label" color={colors.danger}>Sign Out</AppText></Pressable>
  </AppScreen>;
}

function ConfiguredProfile() {
  const router = useRouter();
  const { user } = useUser();
  const { signOut } = useClerk();
  return <ProfileContent name={user?.fullName || "FixLens User"} email={user?.primaryEmailAddress?.emailAddress || ""} onSignOut={() => { void signOut({ redirectUrl: "/welcome" }); }} navigate={(route) => router.push(route as never)} />;
}

function FullyConnectedProfile() {
  const router = useRouter(); const { user } = useUser(); const { signOut } = useClerk(); const unregisterPushTokens = useMutation(convexApi.notifications.unregisterPushTokens);
  return <ProfileContent name={user?.fullName || "FixLens User"} email={user?.primaryEmailAddress?.emailAddress || ""} showUsage onSignOut={() => { void unregisterPushTokens({}).catch(() => undefined).finally(() => signOut({ redirectUrl: "/welcome" })); }} navigate={(route) => router.push(route as never)} />;
}

function DevelopmentProfile() {
  const router = useRouter();
  return <ProfileContent name="Development User" email="Configure Clerk to load an account" onSignOut={() => router.replace("/welcome")} navigate={(route) => router.push(route as never)} />;
}

export default function ProfileScreen() {
  if (serviceReadiness.authentication && serviceReadiness.backend) return <FullyConnectedProfile />;
  return env.clerkPublishableKey ? <ConfiguredProfile /> : <DevelopmentProfile />;
}
