import { useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { Crown, RefreshCcw } from "lucide-react-native";
import { Alert, View } from "react-native";

import { AppScreen } from "@/components/ui/app-screen";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Header } from "@/components/ui/header";
import { AppText } from "@/components/ui/typography";
import { serviceReadiness } from "@/config/env";
import { colors } from "@/constants/design";
import { convexApi } from "@/services/convex-references";
import { manageSubscription, restoreSubscriptions } from "@/services/purchases";

function ConnectedSubscription() {
  const state = useQuery(convexApi.subscriptions.current, {});
  const router = useRouter();
  const restore = async () => {
    try { const info = await restoreSubscriptions(); Alert.alert(info.entitlements.active.pro ? "Pro restored" : "No active purchase", info.entitlements.active.pro ? "Your purchase is restored. Server access will update shortly." : "No active Pro entitlement was found for this store account."); }
    catch { Alert.alert("Restore failed", "Check your connection and store account, then try again."); }
  };
  if (state === undefined) return <AppScreen><Header title="Plan & Billing" /><AppText variant="body" align="center" className="mt-16">Loading verified subscription…</AppText></AppScreen>;
  const pro = Boolean(state?.active && state.entitlement === "pro");
  return <AppScreen><Header title="Plan & Billing" /><Card className="mt-5 items-center py-8"><View className="h-16 w-16 items-center justify-center rounded-2xl bg-brand-soft dark:bg-dark-brand-soft"><Crown color={colors.brand} size={34} /></View><AppText variant="title" className="mt-4">{pro ? "FixLens Pro" : "FixLens Free"}</AppText><AppText variant="body" color={colors.muted} className="mt-1">{pro ? "15 diagnoses each UTC calendar month" : "3 lifetime diagnoses and 1 appliance"}</AppText>{state?.expiresAt ? <AppText variant="caption" className="mt-3">{state.willRenew ? "Renews" : "Access ends"} {new Date(state.expiresAt).toLocaleDateString()}</AppText> : null}{state ? <AppText variant="caption" className="mt-1">Verified {new Date(state.verifiedAt).toLocaleString()}</AppText> : null}</Card><View className="mt-6 gap-3">{pro ? <Button label="Manage in Store" onPress={() => { void manageSubscription().catch(() => Alert.alert("Store settings unavailable", "Open subscriptions in the App Store or Google Play.")); }} /> : <Button label="View Pro Plans" onPress={() => router.push("/subscription/paywall")} />}<Button label="Restore Purchases" variant="secondary" icon={<RefreshCcw color={colors.brand} size={18} />} onPress={() => { void restore(); }} /><Button label="View AI Usage" variant="ghost" onPress={() => router.push("/subscription/usage")} /></View><AppText variant="caption" align="center" className="mt-6">Billing changes and cancellations are handled by your device’s store. Store updates may take a short time to reach FixLens.</AppText></AppScreen>;
}

export default function SubscriptionScreen() {
  if (serviceReadiness.authentication && serviceReadiness.backend && serviceReadiness.purchases) return <ConnectedSubscription />;
  return <AppScreen><Header title="Plan & Billing" /><AppText variant="heading" align="center" className="mt-16">Subscription services unavailable</AppText><AppText variant="body" align="center" color={colors.muted} className="mt-2">Configure Clerk, Convex, and RevenueCat to load verified billing status.</AppText></AppScreen>;
}
