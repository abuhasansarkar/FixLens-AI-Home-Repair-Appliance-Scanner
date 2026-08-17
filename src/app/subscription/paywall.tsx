import type { PurchasesPackage } from "react-native-purchases";
import { useRouter } from "expo-router";
import { Check, Crown, X } from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, View } from "react-native";

import { AppScreen } from "@/components/ui/app-screen";
import { Button } from "@/components/ui/button";
import { SelectableCard } from "@/components/ui/card";
import { AppText } from "@/components/ui/typography";
import { serviceReadiness } from "@/config/env";
import { colors } from "@/constants/design";
import { loadSubscriptionPackages, manageSubscription, purchaseSubscription, restoreSubscriptions } from "@/services/purchases";
import { safeGoBack } from "@/utils/navigation";

type BillingPeriod = "monthly" | "annual";

export default function PaywallScreen() {
  const router = useRouter();
  const [selected, setSelected] = useState<BillingPeriod>("annual");
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!serviceReadiness.purchases) return;
    loadSubscriptionPackages().then(setPackages).catch(() => {
      Alert.alert("Plans unavailable", "Store plans could not be loaded. Please try again later.");
    });
  }, []);

  const packageByPeriod = useMemo(() => ({
    annual: packages.find((item) => item.packageType === "ANNUAL"),
    monthly: packages.find((item) => item.packageType === "MONTHLY"),
  }), [packages]);

  const buy = async () => {
    const chosen = packageByPeriod[selected];
    if (!serviceReadiness.purchases || !chosen) {
      Alert.alert("Purchases aren’t configured", "Add the RevenueCat public key and store products, then restart the development build.");
      return;
    }
    setLoading(true);
    try {
      const { customerInfo } = await purchaseSubscription(chosen);
      if (customerInfo.entitlements.active.pro) safeGoBack(router, "/tabs/home");
    } catch (error) {
      const cancelled = typeof error === "object" && error !== null && "userCancelled" in error && error.userCancelled;
      if (!cancelled) Alert.alert("Purchase not completed", "No charge was made. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const restore = async () => {
    if (!serviceReadiness.purchases) {
      Alert.alert("Purchases aren’t configured", "Add a RevenueCat public key before restoring purchases.");
      return;
    }
    setLoading(true);
    try {
      const info = await restoreSubscriptions();
      Alert.alert(info.entitlements.active.pro ? "Pro restored" : "No purchase found", info.entitlements.active.pro ? "Your Pro access is active." : "We couldn’t find an active Pro subscription for this store account.");
    } catch {
      Alert.alert("Restore failed", "Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  const annualPrice = packageByPeriod.annual?.product.priceString ?? "Unavailable";
  const monthlyPrice = packageByPeriod.monthly?.product.priceString ?? "Unavailable";

  return (
    <AppScreen footer={<Button label={packages.length ? "Start FixLens Pro" : "Plans unavailable"} disabled={!packages.length} loading={loading} onPress={buy} />}>
      <View className="flex-row justify-end">
        <Pressable accessibilityLabel="Close" className="h-11 w-11 items-center justify-center rounded-full bg-surface-muted dark:bg-dark-surface" onPress={() => safeGoBack(router, "/tabs/home")}><X color={colors.ink} size={22} /></Pressable>
      </View>
      <View className="items-center">
        <View className="h-20 w-20 items-center justify-center rounded-3xl bg-brand"><Crown color={colors.white} size={42} /></View>
        <AppText variant="display" align="center" className="mt-[18px]">Fix more with FixLens Pro</AppText>
        <AppText variant="body" align="center" color={colors.muted} className="mt-2">Fix more. Maintain smarter. Get expert AI guidance.</AppText>
      </View>

      <View className="mt-7 gap-4">
        {[
          "15 AI diagnoses every month",
          "Multi-photo AI diagnosis",
          "Advanced troubleshooting guidance",
          "Unlimited appliance profiles",
          "Full repair history",
          "Maintenance reminders",
          "5 assistant replies per diagnosis",
        ].map((text) => (
          <View key={text} className="flex-row items-center gap-3">
            <View className="h-7 w-7 items-center justify-center rounded-full bg-brand-soft dark:bg-dark-brand-soft"><Check color={colors.brand} size={17} /></View>
            <AppText variant="label" className="flex-1">{text}</AppText>
          </View>
        ))}
      </View>

      <View className="mt-7 gap-3">
        <SelectableCard selected={selected === "annual"} onPress={() => setSelected("annual")} className="min-h-[88px] flex-row items-center">
          <View className="absolute -top-3 right-3 rounded-full bg-safe px-3 py-1"><AppText variant="caption" color={colors.white}>BEST VALUE</AppText></View>
          <View className={selected === "annual" ? "mr-3 h-6 w-6 items-center justify-center rounded-full border-2 border-brand" : "mr-3 h-6 w-6 rounded-full border-2 border-line dark:border-dark-line"}>
            {selected === "annual" ? <View className="h-3 w-3 rounded-full bg-brand" /> : null}
          </View>
          <View className="flex-1"><AppText variant="heading">Yearly</AppText><AppText variant="caption">Save over monthly</AppText></View>
          <View className="items-end"><AppText variant="heading">{annualPrice}</AppText><AppText variant="caption">per year</AppText></View>
        </SelectableCard>
        <SelectableCard selected={selected === "monthly"} onPress={() => setSelected("monthly")} className="min-h-[82px] flex-row items-center">
          <View className={selected === "monthly" ? "mr-3 h-6 w-6 items-center justify-center rounded-full border-2 border-brand" : "mr-3 h-6 w-6 rounded-full border-2 border-line dark:border-dark-line"}>
            {selected === "monthly" ? <View className="h-3 w-3 rounded-full bg-brand" /> : null}
          </View>
          <View className="flex-1"><AppText variant="heading">Monthly</AppText><AppText variant="caption">Flexible billing</AppText></View>
          <View className="items-end"><AppText variant="heading">{monthlyPrice}</AppText><AppText variant="caption">per month</AppText></View>
        </SelectableCard>
      </View>

      <Pressable className="min-h-12 items-center justify-center" onPress={restore}><AppText variant="label" color={colors.brand}>Restore purchases</AppText></Pressable>
      <Pressable className="min-h-12 items-center justify-center" onPress={() => { void manageSubscription().catch(() => Alert.alert("Subscription settings unavailable", "Open your App Store or Google Play subscription settings.")); }}><AppText variant="label" color={colors.brand}>Manage subscription</AppText></Pressable>
      <AppText variant="caption" align="center">Prices shown by the store. Subscription renews automatically until canceled.</AppText>
      <View className="mt-2 flex-row items-center justify-center gap-5">
        <Pressable className="min-h-11 justify-center" onPress={() => router.push("/legal/terms")}><AppText variant="caption" color={colors.brand}>Terms</AppText></Pressable>
        <Pressable className="min-h-11 justify-center" onPress={() => router.push("/legal/privacy")}><AppText variant="caption" color={colors.brand}>Privacy</AppText></Pressable>
      </View>
    </AppScreen>
  );
}
